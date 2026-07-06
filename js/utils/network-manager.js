/**
 * OrdiveX - NetworkManager v1.0
 * Gestionnaire réseau centralisé pour la connectivité et la synchronisation critique.
 */

(function () {
  const NetworkState = {
    OFFLINE: 'OFFLINE',
    CONNECTING: 'CONNECTING',
    ONLINE: 'ONLINE',
    SYNCING: 'SYNCING',
    RETRYING: 'RETRYING'
  };

  class Mutex {
    constructor() {
      this._queue = [];
      this._locked = false;
    }

    async run(job) {
      if (this._locked) {
        return new Promise((resolve, reject) => {
          this._queue.push({ job, resolve, reject });
        });
      }
      this._locked = true;
      try {
        const res = await job();
        return res;
      } finally {
        this._locked = false;
        if (this._queue.length > 0) {
          const next = this._queue.shift();
          setTimeout(() => {
            this.run(next.job).then(next.resolve).catch(next.reject);
          }, 0);
        }
      }
    }
  }

  class NetworkManager {
    constructor() {
      this.state = NetworkState.OFFLINE;
      this.consecutiveFailures = 0;
      this.lastSuccessTime = 0;
      this.lastCommunicationTime = 0;
      this.lastError = '';
      this._retryTimer = null;
      this._reconnectAttempts = 0;
      this._mutex = new Mutex();
      this._syncCoalescePending = false;
      this._pullCoalescePending = false;
      this._lastLogMessages = {};

      // Délais de backoff exponentiel (en ms)
      this._backoffDelays = [2000, 5000, 10000, 20000, 30000, 60000, 120000, 300000];
      
      // Liaison avec les events OS
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());

      console.log('[NM] Central Network Manager initialisé');
    }

    isOnline() {
      return this.state === NetworkState.ONLINE || this.state === NetworkState.SYNCING;
    }

    // Changement d'état atomique
    transition(newState) {
      if (this.state === newState) return;
      const oldState = this.state;
      this.state = newState;
      this._logOnce('log', `[NM] État: ${oldState} ➔ ${newState}`);
      this._updateHealth();

      // Mettre à jour AppState s'il existe
      if (window.DB && window.DB.AppState) {
        window.DB.AppState.isOnline = this.isOnline();
        window.DB.AppState._confirmedOffline = (newState === NetworkState.OFFLINE || newState === NetworkState.RETRYING);
      }

      // Notifier le Service Worker de la connectivité réelle
      this._notifySwState(newState === NetworkState.OFFLINE || newState === NetworkState.RETRYING);

      // Rafraîchir l'UI si disponible
      if (typeof window.updateNetworkStatus === 'function') {
        window.updateNetworkStatus();
      }
    }

    _notifySwState(isOffline) {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'OFFLINE_STATE',
            offline: isOffline
          });
        } catch (e) {}
      }
    }

    _updateHealth() {
      window.NetworkHealth = {
        state: this.state,
        lastSuccessTime: this.lastSuccessTime,
        lastCommunicationTime: this.lastCommunicationTime,
        pendingOpsCount: 0, // Sera peuplé dynamiquement par le getter
        consecutiveFailures: this.consecutiveFailures,
        lastError: this.lastError
      };

      // Si OperationQueue est disponible, peupler le nombre de tâches en attente
      if (window.OperationQueue && typeof window.OperationQueue.countPending === 'function') {
        window.OperationQueue.countPending().then(count => {
          window.NetworkHealth.pendingOpsCount = count;
          window.dispatchEvent(new CustomEvent('network-health-change', { detail: window.NetworkHealth }));
        }).catch(() => {
          window.dispatchEvent(new CustomEvent('network-health-change', { detail: window.NetworkHealth }));
        });
      } else {
        window.dispatchEvent(new CustomEvent('network-health-change', { detail: window.NetworkHealth }));
      }
    }

    // Gestion de l'événement Online de l'OS
    handleOnline() {
      this._logOnce('log', '[NM] Signal réseau OS détecté. Reconnexion immédiate...');
      this.consecutiveFailures = 0;
      this._reconnectAttempts = 0;
      if (this._retryTimer) clearTimeout(this._retryTimer);
      this._retryTimer = null;
      this.transition(NetworkState.CONNECTING);
      this._attemptReconnect();
    }

    // Gestion de l'événement Offline de l'OS
    handleOffline() {
      this._logOnce('log', '[NM] Réseau OS déconnecté.');
      this.consecutiveFailures = 0;
      if (this._retryTimer) clearTimeout(this._retryTimer);
      this._retryTimer = null;
      this.transition(NetworkState.OFFLINE);
      this._abortClientTimers();
    }

    // Signalisation d'un échec d'appel réseau Supabase (circuit breaker)
    handleFetchFailure(error) {
      const errStr = error ? String(error.message || error) : 'Erreur réseau';
      this.lastError = errStr;
      
      // On ignore les codes 503/502 (serveur en maintenance) ou 401 (problème de token, pas de connectivité)
      if (errStr.includes('503') || errStr.includes('502') || errStr.includes('401') || errStr.includes('PGRST301')) {
        this._logOnce('warn', `[NM] Indisponibilité Supabase (ignorable) : ${errStr}`);
        return;
      }

      this.consecutiveFailures++;
      this._logOnce('warn', `[NM] Échec réseau détecté (${this.consecutiveFailures}/3). Erreur: ${errStr}`);

      if (this.consecutiveFailures >= 3) {
        this._logOnce('warn', '[NM] Circuit Breaker ouvert ➔ Suspension temporaire des requêtes.');
        this.transition(NetworkState.RETRYING);
        this._abortClientTimers();
        this._scheduleRetry();
      }
    }

    // Signalisation d'un succès réseau
    handleFetchSuccess() {
      this.lastCommunicationTime = Date.now();
      if (this.consecutiveFailures > 0) {
        this.consecutiveFailures = 0;
        this._reconnectAttempts = 0;
        this._logOnce('log', '[NM] Circuit Breaker refermé ➔ Connectivité restaurée.');
        if (this.state === NetworkState.RETRYING || this.state === NetworkState.OFFLINE) {
          this.transition(NetworkState.ONLINE);
        }
      } else if (this.state === NetworkState.CONNECTING) {
        this.transition(NetworkState.ONLINE);
      }
    }

    // Stoppe les timers du SDK Supabase pour garder le silence console
    _abortClientTimers() {
      if (window.DB && typeof window.DB.resetSupabaseClient === 'function') {
        try { window.DB.resetSupabaseClient(); } catch(e) {}
      }
    }

    // Planifier une tentative de reconnexion (backoff exponentiel)
    _scheduleRetry() {
      if (this._retryTimer) clearTimeout(this._retryTimer);
      
      if (!navigator.onLine) {
        this.transition(NetworkState.OFFLINE);
        return;
      }

      const delay = this._backoffDelays[Math.min(this._reconnectAttempts, this._backoffDelays.length - 1)];
      this._reconnectAttempts++;
      
      this._logOnce('log', `[NM] Prochaine tentative de reconnexion dans ${delay / 1000}s`);

      this._retryTimer = setTimeout(() => {
        this._retryTimer = null;
        if (!navigator.onLine) {
          this._reconnectAttempts--; // Ne pas pénaliser si OS déconnecté
          this.transition(NetworkState.OFFLINE);
          return;
        }
        this.transition(NetworkState.CONNECTING);
        this._attemptReconnect();
      }, delay);
    }

    // Vérification de la connectivité via Health Check Supabase
    async _attemptReconnect() {
      if (!navigator.onLine) {
        this.transition(NetworkState.OFFLINE);
        return;
      }

      this._logOnce('log', '[NM] Health check Supabase...');
      try {
        if (!window.DB || typeof window.DB.getSupabaseClient !== 'function') {
          throw new Error('DB non chargé');
        }

        const sb = await window.DB.getSupabaseClient();
        if (!sb) throw new Error('Client Supabase non initialisé');

        // Test direct sur une ressource Supabase légère
        const _ctrl = new AbortController();
        const _tm = setTimeout(() => _ctrl.abort(), 5000);
        
        const { error, status } = await sb.from('settings').select('key').limit(1).abortSignal(_ctrl.signal);
        clearTimeout(_tm);

        if (error) {
          // Traitement de l'erreur d'autorisation comme succès (le serveur est joignable)
          if (error.message?.includes('401') || error.code === 'PGRST301') {
            // Re-authentification anonyme si possible
            try { await sb.auth.signInAnonymously(); } catch(e) {}
          } else if (status === 503 || status === 502) {
            // Serveur Supabase temporairement indisponible mais réseau fonctionnel
            this.handleFetchSuccess();
            return;
          } else {
            throw error;
          }
        }

        // Succès !
        this.handleFetchSuccess();
        this.lastSuccessTime = Date.now();
        this._updateHealth();

        // Lancement immédiat de la file d'attente et du pull
        this.requestPull();
        this.requestSync();

      } catch (e) {
        this._logOnce('warn', `[NM] Échec du health check Supabase: ${e.message || e}`);
        this.handleFetchFailure(e);
        if (this.state === NetworkState.CONNECTING) {
          this.transition(NetworkState.RETRYING);
          this._scheduleRetry();
        }
      }
    }

    // Notification qu'un ajout/mutation a eu lieu en local (dbAdd/dbPut)
    notifyMutation(storeName) {
      if (storeName === 'syncQueue' || storeName === 'auditLog') return;
      
      // Enregistrer dans la queue persistante si disponible
      if (window.OperationQueue && typeof window.OperationQueue.enqueue === 'function') {
        window.OperationQueue.enqueue('SYNC_STORE', { store: storeName })
          .then(() => {
            this._updateHealth();
            this.requestSync();
          })
          .catch(err => {
            console.error('[NM] Erreur enqueue syncQueue:', err);
            this.requestSync();
          });
      } else {
        this.requestSync();
      }
    }

    // Demande de synchronisation montante (PUSH)
    requestSync() {
      if (this.state === NetworkState.OFFLINE || this.state === NetworkState.RETRYING) return;
      if (this._syncCoalescePending) return;

      this._syncCoalescePending = true;

      // Coalescing de 2 secondes pour regrouper plusieurs mutations successives
      setTimeout(() => {
        this._syncCoalescePending = false;
        if (!this.isOnline()) return;

        this._mutex.run(async () => {
          this.transition(NetworkState.SYNCING);
          try {
            if (window.OperationQueue && typeof window.OperationQueue.process === 'function') {
              await window.OperationQueue.process();
            }
            if (window.DB && typeof window.DB.syncToSupabase === 'function') {
              await window.DB.syncToSupabase();
            }
            this.lastSuccessTime = Date.now();
            this.consecutiveFailures = 0;
            this.transition(NetworkState.ONLINE);
          } catch (err) {
            this._logOnce('warn', `[NM] Erreur pendant le PUSH sync: ${err.message || err}`);
            this.handleFetchFailure(err);
            if (this.state === NetworkState.SYNCING) {
              this.transition(this.consecutiveFailures >= 3 ? NetworkState.RETRYING : NetworkState.ONLINE);
            }
          } finally {
            this._updateHealth();
          }
        });
      }, 2000);
    }

    // Demande de synchronisation descendante (PULL)
    requestPull(isManual = false) {
      if (this.state === NetworkState.OFFLINE || this.state === NetworkState.RETRYING) return;
      if (this._pullCoalescePending && !isManual) return;

      this._pullCoalescePending = true;

      const delay = isManual ? 0 : 1000;
      setTimeout(() => {
        this._pullCoalescePending = false;
        if (!this.isOnline() && !isManual) return;

        this._mutex.run(async () => {
          this.transition(NetworkState.SYNCING);
          try {
            if (window.DB && typeof window.DB.pullFromSupabase === 'function') {
              await window.DB.pullFromSupabase(isManual);
            }
            this.lastSuccessTime = Date.now();
            this.consecutiveFailures = 0;
            this.transition(NetworkState.ONLINE);
          } catch (err) {
            this._logOnce('warn', `[NM] Erreur pendant le PULL sync: ${err.message || err}`);
            this.handleFetchFailure(err);
            if (this.state === NetworkState.SYNCING) {
              this.transition(this.consecutiveFailures >= 3 ? NetworkState.RETRYING : NetworkState.ONLINE);
            }
          } finally {
            this._updateHealth();
          }
        });
      }, delay);
    }

    _logOnce(level, msg) {
      const now = Date.now();
      if (this._lastLogMessages[msg] && (now - this._lastLogMessages[msg]) < 30000) return;
      this._lastLogMessages[msg] = now;
      if (level === 'warn') console.warn(msg);
      else console.log(msg);
    }
  }

  // Instanciation globale
  window.NM = new NetworkManager();
  window.NetworkState = NetworkState;

  // Création initiale de l'état de santé
  window.NetworkHealth = {
    state: NetworkState.OFFLINE,
    lastSuccessTime: 0,
    lastCommunicationTime: 0,
    pendingOpsCount: 0,
    consecutiveFailures: 0,
    lastError: ''
  };
})();
