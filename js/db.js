/**
 * OrdiveX — Database Engine
 * IndexedDB offline-first storage layer
 * Handles all local data persistence with sync queue
 */

// ═══════════════════════════════════════════════════════════════════
// PRODUCTION ERROR SILENCER — DOIT ÊTRE TOUT EN HAUT pour intercepter
// les erreurs dès le chargement des scripts (avant supabase.min.js)
// ═══════════════════════════════════════════════════════════════════
(function () {
  var _origError = console.error;
  var _origWarn = console.warn;
  var _patterns = [
    'ERR_INTERNET', 'Failed to fetch', 'NetworkError', 'net::ERR_',
    'refresh_token', 'WebSocket connection', 'AuthRetryable',
    'was not released within', 'Lock "lock:sb-', 'Forcefully acquiring',
    'Failed to load resource', 'FetchEvent', 'Failed to convert',
    'Failed to decode downloaded font', 'AuthSessionMissing',
    'Auth session missing', 'signInAnonymously', 'Unauthorized',
    '401 (Unauthorized)', '400 (Bad Request)', 'Bad Request',
    'CORS', 'AbortError', 'TypeError: Load failed',
    'The user aborted a request', 'CHANNEL_ERROR',
    'AudioContext', 'Realtime send()', 'InvalidStateError',
    'beforeinstallpromptevent', 'IDBRequest'
  ];
  function _isNoise(args) {
    var s = Array.prototype.join.call(args, ' ');
    for (var i = 0; i < _patterns.length; i++) {
      if (s.indexOf(_patterns[i]) !== -1) return true;
    }
    return false;
  }
  console.error = function () { if (!_isNoise(arguments)) _origError.apply(console, arguments); };
  console.warn = function () { if (!_isNoise(arguments)) _origWarn.apply(console, arguments); };

  // ── FILET DE SÉCURITÉ GLOBAL — empêche les Uncaught de crasher l'app ──
  window.addEventListener('error', function (e) {
    var msg = (e.message || '') + ' ' + (e.filename || '');
    if (_isNoise([msg])) { e.preventDefault(); return; }
  });
  window.addEventListener('unhandledrejection', function (e) {
    var msg = String(e.reason?.message || e.reason || '');
    if (_isNoise([msg])) { e.preventDefault(); return; }
  });
})();

// ═══════════════════════════════════════════════════════════════════
// FETCH INTERCEPTOR — Bloque les requêtes Supabase quand offline
// Empêche les "Failed to load resource: net::ERR_INTERNET_DISCONNECTED"
// qui sont des logs Chrome impossibles à supprimer autrement
// ═══════════════════════════════════════════════════════════════════
(function () {
  var _origFetch = window.fetch;
  window.fetch = function (url, opts) {
    // Si offline (OS ou confirmé) ET la requête va vers Supabase → réponse vide silencieuse
    var isOffline = !navigator.onLine || (typeof AppState !== 'undefined' && AppState._confirmedOffline);
    if (isOffline) {
      var urlStr = (typeof url === 'string') ? url : (url && url.url ? url.url : '');
      if (urlStr.indexOf('supabase') !== -1 || urlStr.indexOf('gohfpvvmxsoujpnbmtcl') !== -1) {
        // Vérifier si c'est un appel du probe natif (marqué _bypassOfflineGuard)
        if (!(opts && opts._bypassOfflineGuard)) {
          return Promise.resolve(new Response(JSON.stringify({ data: null, error: { message: 'offline' } }), {
            status: 200, headers: { 'Content-Type': 'application/json' }
          }));
        }
      }
    }
    return _origFetch.apply(this, arguments);
  };
})();

const DB_NAME = 'OrdiveXDB';
const DB_VERSION = 5;

const STORES = {
  products: 'products',
  lots: 'lots',
  stock: 'stock',
  movements: 'movements',
  suppliers: 'suppliers',
  purchaseOrders: 'purchaseOrders',
  sales: 'sales',
  saleItems: 'saleItems',
  prescriptions: 'prescriptions',
  patients: 'patients',
  users: 'users',
  sessions: 'sessions',
  alerts: 'alerts',
  syncQueue: 'syncQueue',
  auditLog: 'auditLog',
  settings: 'settings',
  cashRegister: 'cashRegister',
  returns: 'returns',
  invoices: 'invoices',
  shifts: 'shifts',
  inventories: 'inventories',
  inventoryAdjustments: 'inventoryAdjustments',
};

let db = null;
let _supabaseInstance = null;

// Utilitaire : log unique par session (évite le spam de logs identiques)
const _loggedMessages = new Set();
function _logOnce(level, msg) {
  if (_loggedMessages.has(msg)) return;
  _loggedMessages.add(msg);
  console[level](msg);
}

// App state manager
// Device Identity — ID unique déterministe basé sur l'empreinte du navigateur
// L'ID reste le MÊME pour le même appareil/navigateur, même si localStorage est vidé
function _generateStableDeviceId() {
  var fingerprint = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency || 0
  ].join('|');
  // Simple hash FNV-1a
  var hash = 0x811c9dc5;
  for (var i = 0; i < fingerprint.length; i++) {
    hash ^= fingerprint.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return 'DEV_' + hash.toString(36).toUpperCase();
}

var _stableId = _generateStableDeviceId();
// Forcer la migration vers l'ID stable — supprimer l'ancien aléatoire
var _oldDeviceId = localStorage.getItem('pharma_device_id');
if (_oldDeviceId && _oldDeviceId !== _stableId) {
  // Ancien ID aléatoire détecté — on le remplace et on nettoie
  localStorage.setItem('pharma_device_id', _stableId);
  // Supprimer l'ancienne entrée de Supabase au prochain sync
  localStorage.setItem('pharma_old_device_key', 'device_status_' + _oldDeviceId);
} else if (!_oldDeviceId) {
  localStorage.setItem('pharma_device_id', _stableId);
}
if (!localStorage.getItem('pharma_device_name')) {
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
  localStorage.setItem('pharma_device_name', isMobile ? 'Mobile Pharmacien' : 'PC Principal');
}

const AppState = {
  currentUser: null,
  currentPage: 'dashboard',
  theme: 'light',
  isOnline: navigator.onLine,
  pendingSyncCount: 0,
  deviceId: localStorage.getItem('pharma_device_id'),
  deviceName: localStorage.getItem('pharma_device_name'),
};

let _realtimeSubscription = null;
let _realtimeTimeout = null;
let _broadcastChannel = null;
let _broadcastPullTimer = null;

// ── Connexion Resilience Engine ──
let _connectivityDebounceTimer = null;
let _lastConnState = navigator.onLine;
let _reconnectAttempts = 0;
const _MAX_RECONNECT_DELAY = 60000; // 60s max
let _realtimeCooldown = false;
let _lastLogMessages = {};

// Empêche les logs répétitifs (même message dans les 30 dernières secondes)
function _logOnce(level, msg) {
  const now = Date.now();
  if (_lastLogMessages[msg] && (now - _lastLogMessages[msg]) < 30000) return;
  _lastLogMessages[msg] = now;
  if (level === 'warn') console.warn(msg);
  else console.log(msg);
}

// Calcul du délai de backoff exponentiel
function _getBackoffDelay() {
  const base = 5000; // 5 secondes
  const delay = Math.min(base * Math.pow(2, _reconnectAttempts), _MAX_RECONNECT_DELAY);
  return delay;
}

// ═══════════════════════════════════════════════════════════════════
// LIVE UI REFRESH ENGINE — Synchronisation visuelle temps réel
// Rafraîchit automatiquement la page affichée quand un changement
// arrive d'un autre appareil via Supabase Realtime ou Pull.
// ═══════════════════════════════════════════════════════════════════
let _uiRefreshTimer = null;
let _pendingUIStores = new Set();
const _recentlySyncedIds = new Map();

function _markAsSynced(storeName, id) {
  if (id == null) return;
  _recentlySyncedIds.set(`${storeName}:${id}`, Date.now());
}

function _wasRecentlySynced(storeName, id) {
  if (id == null) return false;
  const key = `${storeName}:${id}`;
  const ts = _recentlySyncedIds.get(key);
  if (!ts) return false;
  if (Date.now() - ts > 10000) { _recentlySyncedIds.delete(key); return false; }
  return true;
}

// Nettoyage périodique du cache anti-écho
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of _recentlySyncedIds) {
    if (now - ts > 15000) _recentlySyncedIds.delete(key);
  }
}, 30000);

const _pageStoreMap = {
  dashboard: ['sales', 'saleItems', 'stock', 'products', 'alerts', 'movements', 'returns'],
  products: ['products'],
  stock: ['stock', 'products', 'lots'],
  sales: ['sales', 'saleItems'],
  patients: ['patients'],
  prescriptions: ['prescriptions'],
  suppliers: ['suppliers'],
  alerts: ['alerts'],
  caisse: ['cashRegister', 'sales'],
  traceability: ['movements', 'lots', 'products'],
  returns: ['returns', 'sales'],
  settings: ['users'],
  metrics: ['sales', 'saleItems', 'products', 'stock'],
};

function _notifyUIChange(storeName) {
  _pendingUIStores.add(storeName);
  if (_uiRefreshTimer) clearTimeout(_uiRefreshTimer);
  _uiRefreshTimer = setTimeout(() => {
    _uiRefreshTimer = null;
    const stores = new Set(_pendingUIStores);
    _pendingUIStores.clear();
    try {
      if (window._invalidateDashCache) window._invalidateDashCache();
      const page = window.Router?.currentPage;
      // Ne jamais rafraîchir les pages sensibles
      if (!page || page === 'login' || page === 'onboarding' || page === 'pos') return;
      const relevantStores = _pageStoreMap[page] || [];
      const hasRelevantChange = relevantStores.some(s => stores.has(s));
      if (hasRelevantChange) {
        _silentRefreshPage(page, [...stores]);
      }
    } catch (e) { /* silencieux */ }
  }, 1500);
}

// Rafraîchissement silencieux : aucun flash visible pour l'utilisateur
function _silentRefreshPage(page, storeNames) {
  try {
    const container = document.getElementById('app-content');
    if (!container || !window.Router?.routes?.[page]) return;
    
    // Si c'est la page stock, on ne rafraîchit que les données et le tableau pour éviter de perdre le focus/scroll
    if (page === 'stock' && typeof window._softRefreshStock === 'function') {
      window._softRefreshStock();
      return;
    }
    
    // Empêcher le scroll reset et le flash pour les autres pages
    const scrollY = container.scrollTop || 0;
    const scrollX = container.scrollLeft || 0;
    // Verrouiller la hauteur du container pendant le render
    container.style.minHeight = container.offsetHeight + 'px';
    // Render dans le DOM existant (Router.render écrase innerHTML)
    window.Router.render(page);
    // Restaurer le scroll
    requestAnimationFrame(() => {
      container.scrollTop = scrollY;
      container.scrollLeft = scrollX;
      container.style.minHeight = '';
    });
  } catch (e) { /* silencieux */ }
}

let _lastSessionCheck = 0;
async function getSupabaseClient() {
  // Guard strict : si hors-ligne, retourner l'instance existante sans détruire ni recréer
  // (détruire = forcer une recréation = Multiple GoTrueClient warnings)
  if (!navigator.onLine || AppState._confirmedOffline) {
    if (_supabaseInstance) {
      // Suspendre le refresh token silencieusement sans détruire l'instance
      try { _supabaseInstance.auth?.stopAutoRefresh?.(); } catch (e) { }
    }
    return null;
  }

  if (_supabaseInstance) {
    // Vérifier la session auth max 1x toutes les 5 min (throttle)
    const now = Date.now();
    if (!_lastSessionCheck || (now - _lastSessionCheck > 300000)) {
      _lastSessionCheck = now;
      try {
        const { data: { session } } = await _supabaseInstance.auth.getSession();
        if (!session && _supabaseInstance.auth.signInAnonymously) {
          await _supabaseInstance.auth.signInAnonymously();
        }
      } catch (e) { /* silencieux */ }
    }
    return _supabaseInstance;
  }

  try {
    const settings = await dbGetAll('settings');
    const url = settings.find(s => s.key === 'supabase_url')?.value;
    const key = settings.find(s => s.key === 'supabase_key')?.value;

    if (url && key && window.supabase) {
      _supabaseInstance = window.supabase.createClient(url.trim(), key.trim(), {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: false,
          persistSession: true,
        },
        realtime: {
          params: { eventsPerSecond: 1 },
          heartbeatIntervalMs: 60000,
          reconnectAfterMs: (tries) => Math.min(tries * 5000, 120000),
          timeout: 20000,
        }
      });

      // Auto-Login Anonyme pour satisfaire RLS
      try {
        const { data: { session } } = await _supabaseInstance.auth.getSession();
        if (!session && _supabaseInstance.auth.signInAnonymously) {
          await _supabaseInstance.auth.signInAnonymously();
        }
      } catch (e) { /* silencieux */ }

      // Lancer le broadcast APRÈS 3s — uniquement si connexion active
      setTimeout(() => {
        if (!navigator.onLine || AppState._confirmedOffline) return;
        try { _setupBroadcast(_supabaseInstance); } catch (e) { /* Broadcast optionnel */ }
      }, 3000);
      return _supabaseInstance;
    }
  } catch (e) { /* silencieux */ }
  return null;
}

function _setupRealtime(sbClient) {
  // Gardes strictes : ne pas reconnecter si déjà connecté, hors-ligne, ou en cooldown
  if (_realtimeSubscription || !navigator.onLine || _realtimeCooldown) return;

  // Cooldown de 30s pour éviter les boucles de reconnexion WebSocket sur réseau instable
  _realtimeCooldown = true;
  setTimeout(() => { _realtimeCooldown = false; }, 30000);

  // Mapping table Supabase → store IndexedDB
  const _tableToStore = { app_users: 'users' };
  const _validStores = new Set([
    'users', 'settings', 'products', 'lots', 'stock', 'movements',
    'suppliers', 'purchaseOrders', 'sales', 'saleItems', 'patients',
    'prescriptions', 'alerts', 'cashRegister', 'auditLog', 'returns', 'invoices', 'shifts'
  ]);

  _realtimeSubscription = sbClient.channel('flash-sync-channel')
    .on('postgres_changes', { event: '*', schema: 'public' }, async (payload) => {
      const tableName = payload.table;
      const storeName = _tableToStore[tableName] || tableName;
      const eventType = payload.eventType;

      if (!_validStores.has(storeName)) return;

      try {
        // Anti-écho : ignorer les changements qu'on a nous-même envoyés
        const _itemId = (payload.new?.id || payload.old?.id || payload.new?.key);
        if (_wasRecentlySynced(storeName, _itemId)) return;

        if (eventType === 'DELETE' && payload.old?.id) {
          await dbDelete(storeName, payload.old.id);
          _notifyUIChange(storeName);
        } else if ((eventType === 'INSERT' || eventType === 'UPDATE') && payload.new) {
          const item = { ...payload.new, _synced: true, _updatedAt: Date.now() };

          const mustBeString = ['username', 'password', 'code', 'lotNumber', 'phone', 'dnpm',
            'pharmacy_phone', 'pharmacy_dnpm', 'pharmacy_name', 'key', 'value'];
          for (const key of Object.keys(item)) {
            if (mustBeString.includes(key) || (storeName === 'settings' && key === 'value')) {
              if (item[key] !== undefined && item[key] !== null) {
                item[key] = String(item[key]);
              }
            }
          }

          if (storeName === 'settings' && item.status === 'DELETED') {
            await dbDelete(storeName, item.id);
          } else {
            await _dbPutRaw(storeName, item);
            _updateCacheInPlace(storeName, [item]);
          }
          _notifyUIChange(storeName);
        }
      } catch (err) {
        // Silencieux — le pull rattrapera
      }
    })
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        _logOnce('log', '[Flash] Connecté au temps réel Supabase');
        _reconnectAttempts = 0; // Reset le backoff sur succès
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        try { sbClient.removeChannel(_realtimeSubscription).catch(() => { }); } catch (e) { }
        _realtimeSubscription = null;
        // Ne PAS retenter immédiatement — le backoff gère ça
      }
    });
}

// ═══════════════════════════════════════════════════════════════════
// BROADCAST CHANNEL — Notification instantanée entre appareils
// Contrairement à postgres_changes (qui requiert la publication Realtime),
// le Broadcast fonctionne SANS configuration Supabase.
// Flux : Appareil A push → broadcast "j'ai pushé" → Appareil B pull immédiat
// ═══════════════════════════════════════════════════════════════════
function _setupBroadcast(sbClient) {
  if (_broadcastChannel || !navigator.onLine) return;

  try {
    _broadcastChannel = sbClient.channel('ordivex-live-sync', {
      config: { broadcast: { self: false } }
    })
      .on('broadcast', { event: 'sync_push' }, (msg) => {
        var payload = msg.payload || {};

        // Guard : ignorer notre propre appareil (double sécurité)
        if (payload.deviceId === AppState.deviceId) return;

        _logOnce('log', '[LiveSync] \u{1F4E1} Signal de ' + (payload.deviceName || 'appareil') + ' (' + (payload.count || '?') + ' éléments) — pull immédiat...');

        // Debounce : si plusieurs broadcasts arrivent en rafale, un seul pull
        if (_broadcastPullTimer) clearTimeout(_broadcastPullTimer);
        _broadcastPullTimer = setTimeout(async () => {
          _broadcastPullTimer = null;
          if (!navigator.onLine) return;
          try {
            await pullFromSupabase(false);
          } catch (e) { /* silencieux */ }
        }, 300);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          _logOnce('log', '[LiveSync] \u2705 Canal broadcast connecté — sync instantanée active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          try { sbClient.removeChannel(_broadcastChannel).catch(() => { }); } catch (e) { }
          _broadcastChannel = null;
        }
      });
  } catch (e) {
    _broadcastChannel = null;
  }
}

async function initDB() {
  // --- Magic Link Auto-Config ---
  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get('reset') === 'true') {
    return new Promise((resolve, reject) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => {
        localStorage.clear();
        window.location.href = window.location.pathname;
      };
      req.onerror = () => {
        console.error("Failed to delete local DB");
        resolve(); // proceed anyway
      };
    });
  }

  const sbUrl = urlParams.get('sb_url');
  const sbKey = urlParams.get('sb_key');

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onsuccess = async () => {
      db = request.result;

      // If URL params are present, update settings automatically
      if (sbUrl && sbKey) {

        try {
          const settings = await dbGetAll('settings');
          const existingUrl = settings.find(s => s.key === 'supabase_url')?.value;

          // Si l'URL Supabase change = nouvelle pharmacie → vider les données locales
          if (existingUrl && existingUrl.trim() !== sbUrl.trim()) {
            console.log('[Flash] Nouvelle pharmacie détectée — nettoyage des données locales...');
            db.close();
            db = null;
            await new Promise((res, rej) => {
              const delReq = indexedDB.deleteDatabase(DB_NAME);
              delReq.onsuccess = () => res();
              delReq.onerror = () => res();
              delReq.onblocked = () => res();
            });
            // Recharger la page pour recréer la DB fraîche avec le nouveau Magic Link
            window.location.reload();
            return;
          }

          const update = async (k, v) => {
            const ex = settings.find(s => s.key === k);
            if (ex) await dbPut('settings', { ...ex, value: v, updatedAt: Date.now() });
            else await dbAdd('settings', { key: k, value: v, updatedAt: Date.now() });
          };
          await update('supabase_url', sbUrl);
          await update('supabase_key', sbKey);

          // Clean URL to hide keys and avoid re-triggering
          window.history.replaceState({}, document.title, window.location.pathname);

          // Forcer un pull complet en supprimant le timestamp du dernier pull
          localStorage.removeItem('pharma_last_pull_ts');

          _supabaseInstance = null; // Force recreation
          await getSupabaseClient();
        } catch (e) {
          console.error('[DB] Magic Link failed:', e);
        }
      }
      resolve(db);
    };

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Products store
      if (!database.objectStoreNames.contains('products')) {
        const ps = database.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        ps.createIndex('code', 'code', { unique: true });
        ps.createIndex('name', 'name');
        ps.createIndex('dci', 'dci');
        ps.createIndex('category', 'category');
        ps.createIndex('requiresPrescription', 'requiresPrescription');
        ps.createIndex('status', 'status');
      }

      // Lots store
      if (!database.objectStoreNames.contains('lots')) {
        const ls = database.createObjectStore('lots', { keyPath: 'id', autoIncrement: true });
        ls.createIndex('productId', 'productId');
        ls.createIndex('lotNumber', 'lotNumber');
        ls.createIndex('expiryDate', 'expiryDate');
        ls.createIndex('status', 'status');
      }

      // Stock store
      if (!database.objectStoreNames.contains('stock')) {
        const ss = database.createObjectStore('stock', { keyPath: 'id', autoIncrement: true });
        ss.createIndex('productId', 'productId', { unique: true });
        ss.createIndex('quantity', 'quantity');
      }

      // Movements store
      if (!database.objectStoreNames.contains('movements')) {
        const ms = database.createObjectStore('movements', { keyPath: 'id', autoIncrement: true });
        ms.createIndex('productId', 'productId');
        ms.createIndex('type', 'type');
        ms.createIndex('date', 'date');
        ms.createIndex('userId', 'userId');
      }

      // Suppliers store
      if (!database.objectStoreNames.contains('suppliers')) {
        const sus = database.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
        sus.createIndex('name', 'name');
        sus.createIndex('status', 'status');
      }

      // Purchase orders
      if (!database.objectStoreNames.contains('purchaseOrders')) {
        const pos = database.createObjectStore('purchaseOrders', { keyPath: 'id', autoIncrement: true });
        pos.createIndex('supplierId', 'supplierId');
        pos.createIndex('status', 'status');
        pos.createIndex('date', 'date');
      }

      // Sales store
      if (!database.objectStoreNames.contains('sales')) {
        const sal = database.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
        sal.createIndex('date', 'date');
        sal.createIndex('patientId', 'patientId');
        sal.createIndex('userId', 'userId');
        sal.createIndex('paymentMethod', 'paymentMethod');
      }

      // Sale items
      if (!database.objectStoreNames.contains('saleItems')) {
        const si = database.createObjectStore('saleItems', { keyPath: 'id', autoIncrement: true });
        si.createIndex('saleId', 'saleId');
        si.createIndex('productId', 'productId');
        si.createIndex('lotId', 'lotId');
      }

      // Prescriptions
      if (!database.objectStoreNames.contains('prescriptions')) {
        const prx = database.createObjectStore('prescriptions', { keyPath: 'id', autoIncrement: true });
        prx.createIndex('patientId', 'patientId');
        prx.createIndex('date', 'date');
        prx.createIndex('status', 'status');
      }

      // Patients
      if (!database.objectStoreNames.contains('patients')) {
        const pat = database.createObjectStore('patients', { keyPath: 'id', autoIncrement: true });
        pat.createIndex('name', 'name');
        pat.createIndex('phone', 'phone');
      }

      // Users
      if (!database.objectStoreNames.contains('users')) {
        const us = database.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        us.createIndex('username', 'username', { unique: true });
        us.createIndex('role', 'role');
      }

      // Sessions
      if (!database.objectStoreNames.contains('sessions')) {
        database.createObjectStore('sessions', { keyPath: 'id' });
      }

      // Alerts
      if (!database.objectStoreNames.contains('alerts')) {
        const als = database.createObjectStore('alerts', { keyPath: 'id', autoIncrement: true });
        als.createIndex('type', 'type');
        als.createIndex('status', 'status');
        als.createIndex('date', 'date');
      }

      // Sync queue — cle string generee par OperationQueue
      if (!database.objectStoreNames.contains('syncQueue')) {
        const sq = database.createObjectStore('syncQueue', { keyPath: 'id' });
        sq.createIndex('status', 'status');
        sq.createIndex('createdAt', 'createdAt');
      }

      // Audit log
      if (!database.objectStoreNames.contains('auditLog')) {
        const al = database.createObjectStore('auditLog', { keyPath: 'id', autoIncrement: true });
        al.createIndex('userId', 'userId');
        al.createIndex('action', 'action');
        al.createIndex('timestamp', 'timestamp');
      }

      // Settings
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      // Cash register
      if (!database.objectStoreNames.contains('cashRegister')) {
        const cr = database.createObjectStore('cashRegister', { keyPath: 'id', autoIncrement: true });
        cr.createIndex('date', 'date');
        cr.createIndex('type', 'type');
      }

      // Returns (retours médicaments) — v2
      if (!database.objectStoreNames.contains('returns')) {
        const ret = database.createObjectStore('returns', { keyPath: 'id', autoIncrement: true });
        ret.createIndex('saleId', 'saleId');
        ret.createIndex('date', 'date');
        ret.createIndex('status', 'status');
        ret.createIndex('userId', 'userId');
        ret.createIndex('patientId', 'patientId');
      }

      // Invoices
      if (!database.objectStoreNames.contains('invoices')) {
        const inv = database.createObjectStore('invoices', { keyPath: 'id', autoIncrement: true });
        inv.createIndex('invoiceNumber', 'invoiceNumber');
        inv.createIndex('supplierId', 'supplierId');
        inv.createIndex('date', 'date');
        inv.createIndex('status', 'status');
      }

      // Shifts — Gestion des équipes Matin/Soir (v9.5.0)
      if (!database.objectStoreNames.contains('shifts')) {
        const sh = database.createObjectStore('shifts', { keyPath: 'id' });
        sh.createIndex('status', 'status');
        sh.createIndex('date', 'date');
        sh.createIndex('managerId', 'managerId');
        sh.createIndex('type', 'type');
      }

      // Inventories — Redesign
      if (!database.objectStoreNames.contains('inventories')) {
        const invStore = database.createObjectStore('inventories', { keyPath: 'id', autoIncrement: true });
        invStore.createIndex('date', 'date');
        invStore.createIndex('userId', 'userId');
      }

      // Inventory Adjustments — Redesign
      if (!database.objectStoreNames.contains('inventoryAdjustments')) {
        const adjStore = database.createObjectStore('inventoryAdjustments', { keyPath: 'id', autoIncrement: true });
        adjStore.createIndex('date', 'date');
        adjStore.createIndex('userId', 'userId');
        adjStore.createIndex('productId', 'productId');
        adjStore.createIndex('inventoryId', 'inventoryId');
      }
    };
  });
}

// Sync debounce & guard
let _syncTimer = null;
let _syncInProgress = false;
let _syncNeededAfter = false;
let _restoreInProgress = false;

function _scheduleSyncToSupabase() {
  if (!navigator.onLine || _restoreInProgress || AppState._confirmedOffline) return;
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => {
    _syncTimer = null;
    if (!navigator.onLine || AppState._confirmedOffline) return;
    if (_syncInProgress) {
      _syncNeededAfter = true;
      return;
    }
    syncToSupabase().catch(() => { });
  }, 2000);
}

// Flush de secours en arrière-plan (surtout pour mobile lors de la fermeture/veille de l'écran)
function _flushSyncOnBackground() {
  if (navigator.onLine && !AppState._confirmedOffline) {
    if (_syncTimer) {
      clearTimeout(_syncTimer);
      _syncTimer = null;
      syncToSupabase().catch(() => {});
    }
  }
}
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    _flushSyncOnBackground();
  }
});
window.addEventListener('pagehide', _flushSyncOnBackground);

// Internal put that does NOT reset _synced and does NOT trigger sync
// Used exclusively by syncToSupabase to mark items as synced
function _dbPutRaw(storeName, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Generic CRUD operations
// ── Cache mémoire pour accélérer dbGetAll sur les gros stores ──
const _dbCache = new Map();
const _dbCacheTime = new Map(); // Timestamp du dernier cache
// Sur mobile : ne PAS cacher les gros stores (products, movements, lots) pour éviter l'OOM
const _mobileNoCacheStores = new Set(['products', 'movements', 'lots', 'auditLog', 'saleItems']);
function _invalidateCache(storeName) { _dbCache.delete(storeName); _dbCacheTime.delete(storeName); if (window._invalidateDashCache) window._invalidateDashCache(); }

// ── Mise à jour chirurgicale du cache mémoire (sans le vider) ──
// Utilisé par le pull incrémental pour fusionner les nouvelles données
// Le dashboard/POS reste instantané car le cache n'est JAMAIS vidé
function _updateCacheInPlace(storeName, newItems) {
  if (!_dbCache.has(storeName) || !newItems || newItems.length === 0) return;
  const cached = _dbCache.get(storeName);
  const keyField = storeName === 'settings' ? 'key' : 'id';
  // Index pour lookup rapide O(1)
  const idxMap = new Map();
  cached.forEach((item, i) => { if (item[keyField] != null) idxMap.set(item[keyField], i); });
  for (const item of newItems) {
    const k = item[keyField];
    if (k != null && idxMap.has(k)) {
      cached[idxMap.get(k)] = item; // Mise à jour en place
    } else {
      cached.push(item); // Nouvel élément
    }
  }
  _dbCacheTime.set(storeName, Date.now()); // Rafraîchir le TTL
  if (window._invalidateDashCache) window._invalidateDashCache();
}

const _isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const _cacheMaxItems = _isMobile ? 50000 : 500000; // Mobile: 50k (petits stores), PC: 500k
const _cacheTTL = _isMobile ? 120000 : 600000; // Mobile: 2 min, PC: 10 min

async function dbAdd(storeName, data) {
  _invalidateCache(storeName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.add({ ...data, _createdAt: Date.now(), _updatedAt: Date.now(), _synced: false });
    req.onsuccess = () => {
      resolve(req.result);
      if (navigator.onLine) _scheduleSyncToSupabase();
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(storeName, data) {
  _invalidateCache(storeName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put({ ...data, _updatedAt: Date.now(), _synced: false });
    req.onsuccess = () => {
      resolve(req.result);
      if (navigator.onLine) _scheduleSyncToSupabase();
    };
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(storeName, id) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => { console.error(`[DB] Erreur get ${storeName}/${id}:`, req.error); resolve(null); };
    } catch (e) {
      console.error(`[DB] Exception dans dbGet(${storeName}, ${id}):`, e);
      resolve(null);
    }
  });
}

async function dbGetAll(storeName, indexName, query) {
  if (!db) { console.warn('[DB] Base non initialisée, tentative de reconnexion...'); await initDB(); }
  // Cache mémoire : retourner immédiatement si dispo et pas expiré
  if (!indexName && query === undefined && _dbCache.has(storeName)) {
    const cacheAge = Date.now() - (_dbCacheTime.get(storeName) || 0);
    if (cacheAge < _cacheTTL) {
      return _dbCache.get(storeName);
    }
    _dbCache.delete(storeName); // Expiré, libérer la RAM
    _dbCacheTime.delete(storeName);
  }
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      let req;
      if (indexName && query !== undefined) {
        const index = store.index(indexName);
        req = index.getAll(query);
      } else {
        req = store.getAll();
      }
      req.onsuccess = () => {
        const result = req.result || [];
        // Cache adaptatif : pas les gros stores sur mobile
        const canCache = !indexName && query === undefined
          && result.length < _cacheMaxItems
          && !(_isMobile && _mobileNoCacheStores.has(storeName));
        if (canCache) {
          _dbCache.set(storeName, result);
          _dbCacheTime.set(storeName, Date.now());
        }
        resolve(result);
      };
      req.onerror = () => { console.error(`[DB] Erreur lecture ${storeName}:`, req.error); resolve([]); };
      tx.onerror = () => { console.error(`[DB] Transaction erreur ${storeName}`); resolve([]); };
    } catch (e) {
      console.error(`[DB] Exception dans dbGetAll(${storeName}):`, e);
      resolve([]); // Ne jamais rejeter pour éviter les cascades d'erreurs
    }
  });
}

/**
 * Chargement paginé par curseur pour les stores très volumineux (audit, mouvements)
 * Retourne les N derniers éléments triés par index décroissant
 */
async function dbGetRecent(storeName, indexName, limit = 200) {
  if (!db) await initDB();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const source = indexName ? store.index(indexName) : store;
      const results = [];
      const cursorReq = source.openCursor(null, 'prev'); // Du plus récent au plus ancien
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      cursorReq.onerror = () => resolve([]);
    } catch (e) {
      console.error(`[DB] Erreur curseur ${storeName}:`, e);
      resolve([]);
    }
  });
}

/**
 * Recherche produits par curseur — ne charge JAMAIS tout en RAM.
 * Parcourt les produits un par un et retourne les max premiers résultats matchant query.
 * Pour mobile POS avec 100k+ produits.
 */
async function dbSearchProducts(query, max = 50) {
  if (!db) await initDB();
  const q = (query || '').toLowerCase().trim();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const results = [];
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor || results.length >= max) { resolve(results); return; }
        const p = cursor.value;
        if (p.status === 'inactive') { cursor.continue(); return; }
        if (!q) {
          results.push(p);
        } else {
          const match = (p.name || '').toLowerCase().includes(q)
            || (p.dci || '').toLowerCase().includes(q)
            || (p.code || '').toLowerCase().includes(q)
            || (p.ean || '').toLowerCase().includes(q)
            || (p.cip || '').toLowerCase().includes(q);
          if (match) results.push(p);
        }
        cursor.continue();
      };
      cursorReq.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}

/**
 * Compte les produits actifs sans les charger en RAM
 */
async function dbCountProducts() {
  if (!db) await initDB();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => resolve(0);
    } catch (e) { resolve(0); }
  });
}

async function dbDelete(storeName, id) {
  _invalidateCache(storeName);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function dbCount(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Calcul de la valeur du stock via curseur — ne charge PAS tous les produits en RAM.
 * Parcourt les produits un par un et cumule la valeur.
 * @param {Object} stockMap - Map { productId: { quantity } } du stock
 * @returns {Promise<{purchaseValue: number, saleValue: number}>}
 */
async function dbStockValue(stockMap) {
  return new Promise((resolve) => {
    let purchaseValue = 0;
    let saleValue = 0;
    try {
      const tx = db.transaction('products', 'readonly');
      const store = tx.objectStore('products');
      const cursor = store.openCursor();
      cursor.onsuccess = (e) => {
        const c = e.target.result;
        if (c) {
          const p = c.value;
          const s = stockMap[p.id];
          if (s && s.quantity > 0) {
            purchaseValue += s.quantity * (p.purchasePrice || 0);
            saleValue += s.quantity * (p.salePrice || 0);
          }
          c.continue();
        } else {
          resolve({ purchaseValue, saleValue });
        }
      };
      cursor.onerror = () => resolve({ purchaseValue: 0, saleValue: 0 });
    } catch (e) {
      resolve({ purchaseValue: 0, saleValue: 0 });
    }
  });
}

/**
 * Bulk Put — Insertion/mise à jour de masse via UNE SEULE transaction IndexedDB.
 * Conçu pour supporter des centaines de milliers d'enregistrements sans geler le navigateur.
 * @param {string} storeName - Nom du store IndexedDB
 * @param {Array} dataArray - Tableau d'objets à insérer/mettre à jour
 * @returns {Promise<number>} - Nombre d'objets traités avec succès
 */
async function dbBulkPut(storeName, dataArray) {
  if (!db) await initDB();
  if (!dataArray || dataArray.length === 0) return 0;
  _invalidateCache(storeName);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    let count = 0;

    for (const item of dataArray) {
      try {
        store.put({ ...item, _updatedAt: item._updatedAt || Date.now(), _synced: item._synced !== undefined ? item._synced : true });
        count++;
      } catch (e) {
        console.warn(`[DB] BulkPut erreur item:`, e);
      }
    }

    tx.oncomplete = () => resolve(count);
    tx.onerror = () => {
      console.error(`[DB] BulkPut transaction erreur:`, tx.error);
      reject(tx.error);
    };
    tx.onabort = () => {
      console.error(`[DB] BulkPut transaction annulée:`, tx.error);
      reject(tx.error);
    };
  });
}

// Audit log writer
async function writeAudit(action, entity, entityId, details, userId) {
  try {
    await dbAdd('auditLog', {
      action,
      entity,
      entityId,
      details,
      userId: userId || AppState.currentUser?.id,
      username: AppState.currentUser?.username,
      timestamp: Date.now(),
      ip: 'local'
    });
  } catch (e) {
    console.warn('Audit write failed:', e);
  }
}

// Initialisation des paramètres de base (aucune donnée de test)
async function seedDemoData() {
  // Vérifier si déjà initialisé
  const settings = await dbGetAll('settings');
  const alreadySeeded = settings.find(s => s.key === 'seeded');
  if (alreadySeeded) return;



  // Settings essentiels uniquement
  await dbPut('settings', { key: 'currency', value: 'GNF' });
  await dbPut('settings', { key: 'seeded', value: true });


}

async function trackInstallation() {
  // Enregistrement facultatif dans une table pharmacies_registry.
  // Si la table n'existe pas dans le Supabase du client, on ignore silencieusement.
  try {
    const sb = await getSupabaseClient();
    if (!sb) return;
    const settings = await dbGetAll('settings');
    const name = settings.find(s => s.key === 'pharmacy_name')?.value || 'Inconnue';
    const address = settings.find(s => s.key === 'pharmacy_address')?.value || 'Inconnue';

    await sb.from('pharmacies_registry').insert([
      { name, address, installed_at: new Date().toISOString() }
    ]);

  } catch (e) {
    // Table might not exist — this is expected and safe to ignore
    console.warn('[DB] Tracking skipped (table may not exist):', e.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// TIMEOUT GUARD — AbortController sur toutes les requetes Supabase
// Empeche un appel reseau suspendu de bloquer l app indefiniment.
// ═══════════════════════════════════════════════════════════════════
const _SUPABASE_TIMEOUT_MS = 15000; // 15s (genereux pour 3G lente)

function _withTimeout(supabaseQuery, ms) {
  ms = ms || _SUPABASE_TIMEOUT_MS;
  return new Promise(function(resolve) {
    var ctrl = new AbortController();
    var timer = setTimeout(function() {
      ctrl.abort();
      resolve({ data: null, error: { message: 'timeout', code: 'TIMEOUT' } });
    }, ms);
    supabaseQuery
      .abortSignal(ctrl.signal)
      .then(function(result) { clearTimeout(timer); resolve(result); })
      .catch(function(err) {
        clearTimeout(timer);
        if (err && err.name === 'AbortError') {
          resolve({ data: null, error: { message: 'timeout', code: 'TIMEOUT' } });
        } else {
          resolve({ data: null, error: err });
        }
      });
  });
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 9 — SYNC FURTIVE INDICATOR
// Petit indicateur visuel discret dans la topbar pendant la sync
// ═══════════════════════════════════════════════════════════════════
function _showSyncIndicator(active) {
  let el = document.getElementById('furtive-sync-indicator');
  if (active) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'furtive-sync-indicator';
      el.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
      el.style.cssText = 'position:fixed;top:12px;right:80px;z-index:9998;color:var(--primary,#2E86C1);opacity:0.7;animation:furtiveSync 1.2s ease-in-out infinite;pointer-events:none;';
      if (!document.getElementById('furtive-sync-style')) {
        const s = document.createElement('style');
        s.id = 'furtive-sync-style';
        s.textContent = '@keyframes furtiveSync{0%,100%{opacity:0.4;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}';
        document.head.appendChild(s);
      }
      document.body.appendChild(el);
    }
    el.style.display = '';
  } else {
    if (el) el.style.display = 'none';
  }
}

async function syncToSupabase() {
  // Garde : empêcher doublons et hors-ligne
  if (_syncInProgress) return;
  if (!navigator.onLine || AppState._confirmedOffline) return;
  _syncInProgress = true;
  // Phase 9 — Indicateur visuel furtif
  _showSyncIndicator(true);

  try {
    const sb = await getSupabaseClient();
    if (!sb) return;
    if (!navigator.onLine) return;

    // Envoi SÉQUENTIEL et par ordre de priorité absolue (ventes d'abord, catalogues ensuite)
    const storesToSync = [
      'sales', 'saleItems', 'cashRegister', 'movements', 'returns', 'invoices',
      'patients', 'prescriptions', 'alerts', 'shifts',
      'stock', 'lots', 'purchaseOrders', 'suppliers',
      'users', 'settings',
      'products' // Très lourd (33k+), toujours en dernier !
    ];

    let totalPendingCount = 0;
    let _hasMorePending = false;

    // Cache des colonnes invalides : éviter les 400 inutiles
    // Colonnes CONNUES comme inexistantes dans Supabase (fallback hardcodé)
    var _knownBadCols = {
      saleItems: ['lotNumber'],
      sales: ['paymentDetails']
    };
    var _colCache = {};
    try { 
      _colCache = JSON.parse(localStorage.getItem('pharma_bad_columns') || '{}'); 
    } catch (e) { }
    // Fusionner le hardcodé avec le cache dynamique
    for (var tbl in _knownBadCols) {
      if (!_colCache[tbl]) _colCache[tbl] = [];
      for (var ci = 0; ci < _knownBadCols[tbl].length; ci++) {
        if (_colCache[tbl].indexOf(_knownBadCols[tbl][ci]) === -1) _colCache[tbl].push(_knownBadCols[tbl][ci]);
      }
    }

    // --- GARDE RÉSEAU CENTRALISÉ (zéro requête inutile) ---
    if (!navigator.onLine) { AppState.isOnline = false; return; }
    // Si le dernier pull a réussi il y a < 30s, on sait qu'on est en ligne
    var _lastPullOk = parseInt(localStorage.getItem('pharma_last_pull_ts') || '0');
    var _pullRecent = (Date.now() - _lastPullOk) < 30000;
    if (!_pullRecent) {
      try {
        var _probeCtrl = new AbortController();
        var _probeTimeout = setTimeout(function() { _probeCtrl.abort(); }, 8000);
        const probeReq = await sb.from('settings').select('key').limit(1).abortSignal(_probeCtrl.signal);
        clearTimeout(_probeTimeout);
        if (probeReq.error) {
          // Si 401 → re-auth et retry
          if (probeReq.error.message?.includes('401') || probeReq.error.code === 'PGRST301') {
            try { await sb.auth.signInAnonymously(); } catch (e) { }
            const retry = await sb.from('settings').select('key').limit(1);
            if (retry.error) throw retry.error;
          } else {
            throw probeReq.error;
          }
        }
        AppState.isOnline = true;
      } catch (err) {
        AppState.isOnline = false;
        return;
      }
    }

    // ⚡ FLASH SEND — Envoi séquentiel pour ne pas étouffer le réseau (surtout avec 30k produits)
    for (const storeName of storesToSync) {
      try {
        const all = await dbGetAll(storeName);
        let pending = all.filter(item => item._synced === false);

        if (pending.length === 0) continue;
        
        // Chunking (Anti-Head-of-Line Blocking) : 
        // Traiter max 500 items par table par passe pour laisser la place aux ventes urgentes
        if (pending.length > 500) {
          pending = pending.slice(0, 500);
          _hasMorePending = true;
        }
        
        totalPendingCount += pending.length;

        const payloads = pending.map(item => {
          const payload = {};
          for (const [key, value] of Object.entries(item)) {
            if (!key.startsWith('_')) {
              const mustBeString = [
                'username', 'password', 'code', 'lotNumber', 'phone', 'dnpm',
                'pharmacy_phone', 'pharmacy_dnpm', 'pharmacy_name', 'key', 'value'
              ];

              if (mustBeString.includes(key)) {
                payload[key] = (value !== null && value !== undefined) ? String(value) : value;
                continue;
              }

              if (key === 'createdAt' || key === 'updatedAt' || key === 'lastUpdated') {
                if (typeof value === 'string' && value.includes('T')) {
                  payload[key] = new Date(value).getTime() || Date.now();
                  continue;
                }
              }

              if (typeof value === 'string') {
                if (value.startsWith('session_')) {
                  payload[key] = parseInt(value.replace('session_', '')) || 1;
                } else if (/^\d+$/.test(value) && !value.startsWith('0')) {
                  payload[key] = parseInt(value);
                } else {
                  payload[key] = value;
                }
              } else {
                payload[key] = value;
              }
            }
          }
          if (item._updatedAt) payload.updatedAt = item._updatedAt;

          const tablesWithUserId = ['sales', 'movements', 'cashRegister', 'auditLog'];
          if (tablesWithUserId.includes(storeName)) {
            if (payload.userId === undefined || payload.userId === null) {
              payload.userId = AppState.currentUser?.id || 1;
            }
          }

          // ── COLONNES LOCAL-ONLY : à supprimer au fur et à mesure qu'elles sont ajoutées à Supabase ──
          // Vides pour la refonte - toutes les colonnes doivent être envoyées
          const _localOnlyColumns = {};
          // Exclure les clés settings qui contiennent du JSON complexe non-compatible Supabase
          if (storeName === 'settings' && payload.key === 'held_carts') {
            return null;
          }
          const localOnly = _localOnlyColumns[storeName];
          if (localOnly) {
            localOnly.forEach(c => delete payload[c]);
          }

          // Filtrer les colonnes invalides DANS le payload (via auto-apprentissage du cache)
          var storeBadCols = _colCache[storeName] || [];
          if (storeBadCols.length > 0) {
            for (var bi = 0; bi < storeBadCols.length; bi++) {
              delete payload[storeBadCols[bi]];
            }
          }

          return payload;
        });

        var currentPayloads = payloads.filter(p => {
          if (!p) return false;
          // Purger les vieux IDs 'virtual_' qui font planter Supabase (invalid type bigint)
          if ((typeof p.id === 'string' && p.id.startsWith('virtual_')) || 
              (typeof p.lotId === 'string' && p.lotId.startsWith('virtual_'))) {
            _dbPutRaw(storeName, { ...p, _synced: true }).catch(()=>{});
            return false;
          }
          return true;
        });

        let retries = 0;
        const maxRetries = 10;
        let lastError = null;
        // Délais backoff exponentiel : 0, 500ms, 1s, 2s, 5s, 10s...
        const _backoffDelays = [0, 500, 1000, 2000, 5000, 10000, 15000, 20000, 30000, 60000];

        // Découper en lots de 500 pour éviter les timeouts Supabase
        const PUSH_BATCH = 500;
        let allSuccess = true;

        while (retries <= maxRetries) {
          // Backoff : attendre avant de réessayer (sauf premier essai)
          if (retries > 0) {
            const delay = _backoffDelays[Math.min(retries, _backoffDelays.length - 1)];
            await new Promise(r => setTimeout(r, delay));
            // Vérifier réseau avant chaque retry
            if (!navigator.onLine) break;
          }

          lastError = null;
          allSuccess = true;

          for (let bi = 0; bi < currentPayloads.length; bi += PUSH_BATCH) {
            const batch = currentPayloads.slice(bi, bi + PUSH_BATCH);
            const { error } = await _withTimeout(
              sb
                .from(storeName === 'users' ? 'app_users' : storeName)
                .upsert(batch, {
                  onConflict: storeName === 'settings' ? 'key' : 'id',
                  ignoreDuplicates: false
                })
            );

            if (error) {
              lastError = error;
              allSuccess = false;
              break;
            }

            // Marquer les items de ce batch comme synchronisés
            const batchPending = pending.slice(bi, bi + PUSH_BATCH);
            for (const item of batchPending) {
              item._synced = true;
              await _dbPutRaw(storeName, item);
              // Anti-écho : marquer pour ignorer l'événement Realtime retour
              _markAsSynced(storeName, item.id || item.key);
            }
          }

          if (allSuccess) {
            lastError = null;
            break;
          }

          const colMatch = (lastError?.message || '').match(/Could not find the '([^']+)' column/);
          if (colMatch && retries < maxRetries) {
            const badCol = colMatch[1];
            // On ne log que si c'est une nouvelle découverte
            if (!_colCache[storeName] || !_colCache[storeName].includes(badCol)) {
              console.log('[Flash] ⚡ ' + storeName + ': apprentissage nouvelle colonne local-only \'' + badCol + '\'');
            }
            currentPayloads = currentPayloads.map(p => {
              const { [badCol]: _, ...rest } = p;
              return rest;
            });
            // Sauvegarder dans le cache
            if (!_colCache[storeName]) _colCache[storeName] = [];
            if (!_colCache[storeName].includes(badCol)) _colCache[storeName].push(badCol);
            localStorage.setItem('pharma_bad_columns', JSON.stringify(_colCache));
            retries++;
          } else {
            break;
          }
        }


        if (lastError && navigator.onLine) {
          // Ignorer les erreurs RLS connues (settings upsert en anon mode)
          if (!lastError.message?.includes('row-level security')) {
            console.error(`[Flash] ❌ ${storeName}:`, lastError.message || lastError);
          }
        }
      } catch (storeError) {
        // Silencieux si hors-ligne
        if (navigator.onLine) console.error(`[Flash] Exception ${storeName}:`, storeError);
      }
    }

    // 📡 Push Device Heartbeat — permet aux autres appareils de voir notre état
    try {
      var currentDeviceName = localStorage.getItem('pharma_device_name') || AppState.deviceName;
      var currentDeviceId = localStorage.getItem('pharma_device_id') || AppState.deviceId;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
      const deviceStatus = {
        name: currentDeviceName,
        last_sync: Date.now(),
        pending: 0,
        online: !AppState._confirmedOffline,
        type: isMobileDevice ? 'mobile' : 'desktop'
      };
      var hbPayload = {
        key: 'device_status_' + currentDeviceId,
        value: JSON.stringify(deviceStatus)
      };
      // Pré-filtrer les colonnes invalides connues pour settings
      var settingsBadCols = _colCache['settings'] || [];
      settingsBadCols.forEach(function (c) { delete hbPayload[c]; });
      // Retry avec suppression de colonnes inconnues (comme le sync principal)
      for (var hbRetry = 0; hbRetry < 3; hbRetry++) {
        var hbRes = await sb.from('settings').upsert(hbPayload, { onConflict: 'key' });
        if (!hbRes.error) break;
        var hbCol = (hbRes.error.message || '').match(/Could not find the '([^']+)' column/);
        if (hbCol) {
          delete hbPayload[hbCol[1]];
        } else {
          break;
        }
      }
    } catch (heartbeatErr) {
      // Silently ignore heartbeat errors
    }

    // 🧹 Nettoyer l'ancien device_id migré (si applicable)
    try {
      var oldKey = localStorage.getItem('pharma_old_device_key');
      if (oldKey) {
        await sb.from('settings').delete().eq('key', oldKey);
        localStorage.removeItem('pharma_old_device_key');
        console.log('[Flash] 🧹 Ancien appareil nettoyé : ' + oldKey);
      }
    } catch (e) { }

    if (totalPendingCount > 0) console.log(`[Flash] ⚡ Sync terminée — ${totalPendingCount} éléments envoyés`);

    // ── BROADCAST : Notifier les autres appareils instantanément ──
    if (totalPendingCount > 0 && _broadcastChannel) {
      try {
        _broadcastChannel.send({
          type: 'broadcast',
          event: 'sync_push',
          payload: {
            deviceId: AppState.deviceId,
            deviceName: AppState.deviceName,
            count: totalPendingCount,
            ts: Date.now()
          }
        });
      } catch (e) { /* silencieux */ }
    }

    // Tracking désactivé — table push_tracking non présente dans Supabase client
    // (supprimé pour éviter les erreurs silencieuses en prod)

  } catch (globalError) {
    // Détecter si c'est une erreur réseau pour basculer en mode offline
    const errStr = String(globalError?.message || globalError || '');
    if (errStr.includes('fetch') || errStr.includes('network') || errStr.includes('ERR_') || errStr.includes('timeout') || errStr.includes('Failed')) {
      AppState._confirmedOffline = true;
      AppState.isOnline = false;
    }
  } finally {
    _syncInProgress = false;
    _showSyncIndicator(false);
    // P5 — Si des items n'ont pas pu être envoyés (chunking 500), relancer un cycle dans 5s
    if (_hasMorePending && navigator.onLine && !AppState._confirmedOffline) {
      setTimeout(function() { syncToSupabase().catch(function(){}); }, 5000);
    } else if (_syncNeededAfter && navigator.onLine && !AppState._confirmedOffline) {
      _syncNeededAfter = false;
      _scheduleSyncToSupabase();
    }
  }
}

/**
 * PULL DEPUIS SUPABASE (Cloud → Local)
 * @param {boolean} isManual - Pull complet si true, incrémental si false
 */
let _isPulling = false;
let _pullBatch = null;
async function pullFromSupabase(isManual = false) {
  if (!navigator.onLine) return;
  if (_isPulling) return;
  _isPulling = true;
  // Sécurité : libérer le lock après 45s max (réseau très lent en Guinée)
  const _pullLockTimeout = setTimeout(() => { _isPulling = false; }, 45000);
  let hasChanges = false;
  let totalItemsPulled = 0;
  try {
    // --- SILENT NATIVE PROBE ---
    // Utilise l'URL de l'app elle-même (GitHub Pages) pour éviter les erreurs DNS Supabase
    if (AppState._confirmedOffline) {
      try {
        var _nativeCtrl = new AbortController();
        var _nativeTimeout = setTimeout(function() { _nativeCtrl.abort(); }, 5000);
        // Probe l'app elle-même — si GitHub Pages répond, le réseau est de retour
        await fetch(location.origin + location.pathname, {
          method: 'HEAD', cache: 'no-store', signal: _nativeCtrl.signal
        });
        clearTimeout(_nativeTimeout);
        // Si on est là, le réseau est de retour !
        AppState._confirmedOffline = false;
        AppState.isOnline = true;
      } catch (e) {
        throw new Error('probe_offline');
      }
    }

    const sb = await getSupabaseClient();
    if (!sb) return;
    if (!navigator.onLine) return;

    const storesToPull = [
      'users', 'settings',
      'products', 'lots', 'stock', 'movements', 'suppliers', 'purchaseOrders',
      'sales', 'saleItems', 'patients', 'prescriptions', 'alerts',
      'cashRegister', 'returns', 'invoices', 'shifts'
    ];

    // --- GARDE RÉSEAU CENTRALISÉ (zéro requête inutile) ---
    if (!navigator.onLine) { AppState.isOnline = false; return; }
    // Si on est en mode hors-ligne confirmé, éviter le probe réseau
    if (AppState._confirmedOffline) { return; }
    try {
      const probeReq = await _withTimeout(sb.from('settings').select('key').limit(1), 8000);
      if (probeReq.error) throw probeReq.error;
      AppState.isOnline = true;
      AppState._confirmedOffline = false;
    } catch (err) {
      AppState.isOnline = false;
      AppState._confirmedOffline = true;
      // Arrêter les timers et WebSockets du SDK pour le silence, mais GARDER l'instance
      // pour éviter le warning "Multiple GoTrueClient instances" à la reconnexion
      if (_supabaseInstance) {
        try { _supabaseInstance.auth?.stopAutoRefresh?.(); } catch(e) {}
        try { _supabaseInstance.realtime?.disconnect?.(); } catch(e) {}
        if (_realtimeSubscription) { try { _supabaseInstance.removeChannel(_realtimeSubscription).catch(()=>{}); } catch(e){} _realtimeSubscription = null; }
        if (_broadcastChannel) { try { _supabaseInstance.removeChannel(_broadcastChannel).catch(()=>{}); } catch(e){} _broadcastChannel = null; }
      }
      throw new Error('probe_offline'); // THROW (pas return) pour que runPull.catch() se déclenche
    }

    // ── PULL INCRÉMENTAL (Delta Sync) ──
    // Auto-pull : ne récupérer que les données modifiées depuis le dernier pull
    // Pull manuel : récupérer TOUT (pour setup initial ou récupération)
    const lastPullKey = 'pharma_last_pull_ts';
    const lastPullTs = isManual ? null : localStorage.getItem(lastPullKey);
    // updatedAt dans Supabase est un BIGINT (millisecondes), PAS une date ISO
    const pullSince = lastPullTs ? parseInt(lastPullTs) : null;

    if (pullSince) {
      _logOnce('log', '[Flash] Pull incrémental (delta depuis ' + new Date(parseInt(lastPullTs)).toLocaleTimeString('fr-FR') + ')...');
    } else {
      _logOnce('log', '[Flash] Pull démarré...');
    }

    const mustBeString = [
      'username', 'password', 'code', 'lotNumber', 'phone', 'dnpm',
      'pharmacy_phone', 'pharmacy_dnpm', 'pharmacy_name', 'key', 'value'
    ];

    // Fonction d'écriture IDB — MERGE avec les données locales existantes
    // pour préserver les champs qui n'existent pas dans Supabase
    // ── HELPER : céder le thread principal pendant les opérations lourdes ──
    const _yieldToUI = () => new Promise(r => setTimeout(r, 0));

    const writeBatchToIDB = async (storeName, items) => {
      const prepared = items.map(item => {
        let localItem = { ...item, _synced: true, _updatedAt: item.updatedAt || Date.now() };
        for (const key of Object.keys(localItem)) {
          if (mustBeString.includes(key) || (storeName === 'settings' && key === 'value')) {
            if (localItem[key] !== undefined && localItem[key] !== null) {
              localItem[key] = String(localItem[key]);
            }
          }
        }
        return localItem;
      }).filter(item => !(storeName === 'settings' && item.status === 'DELETED'));
      if (prepared.length === 0) return 0;

      var keyProp = (storeName === 'settings') ? 'key' : 'id';

      // ── STRATÉGIE ADAPTATIVE ──
      // Petit lot (incrémental) : get ciblés — rapide, aucun lag
      // Gros lot (full pull) : getAll — plus efficace en masse
      if (prepared.length < 100) {
        // ── FAST PATH : get ciblés uniquement les IDs nécessaires ──
        var existingMap = {};
        var keysToFetch = [];
        for (var i = 0; i < prepared.length; i++) {
          var k = prepared[i][keyProp];
          if (k !== undefined && k !== null) keysToFetch.push(k);
        }
        if (keysToFetch.length > 0) {
          try {
            await new Promise(function (resolve) {
              var tx = db.transaction(storeName, 'readonly');
              var store = tx.objectStore(storeName);
              var done = 0;
              for (var j = 0; j < keysToFetch.length; j++) {
                (function (key) {
                  var req = store.get(key);
                  req.onsuccess = function () {
                    if (req.result) existingMap[key] = req.result;
                    if (++done >= keysToFetch.length) resolve();
                  };
                  req.onerror = function () {
                    if (++done >= keysToFetch.length) resolve();
                  };
                })(keysToFetch[j]);
              }
              tx.oncomplete = function () { resolve(); };
              tx.onerror = function () { resolve(); };
            });
          } catch (e) { /* continue sans merge */ }
        }
        // Écriture
        await new Promise(function (resolve, reject) {
          var tx2 = db.transaction(storeName, 'readwrite');
          var store2 = tx2.objectStore(storeName);
          for (var i = 0; i < prepared.length; i++) {
            var item = prepared[i];
            var kv = item[keyProp];
            var ex = (kv !== undefined && kv !== null) ? existingMap[kv] : null;
            // PROTECTION : ne pas écraser les données locales non-poussées
            if (ex && ex._synced === false) continue;
            store2.put(ex ? Object.assign({}, ex, item) : item);
          }
          tx2.oncomplete = function () { resolve(); };
          tx2.onerror = function () { reject(tx2.error); };
          tx2.onabort = function () { reject(tx2.error); };
        });
      } else {
        // ── BULK PATH : getAll + écriture par chunks de 200 ──
        var existingMap = {};
        try {
          await new Promise(function (resolve) {
            var tx1 = db.transaction(storeName, 'readonly');
            var store1 = tx1.objectStore(storeName);
            var req = store1.getAll();
            req.onsuccess = function () {
              var all = req.result || [];
              for (var i = 0; i < all.length; i++) {
                var k = all[i][keyProp];
                if (k !== undefined && k !== null) existingMap[k] = all[i];
              }
              resolve();
            };
            req.onerror = function () { resolve(); };
            tx1.onerror = function () { resolve(); };
          });
        } catch (e) { /* continue */ }

        // Écriture par chunks — évite de bloquer le thread principal
        var CHUNK = 200;
        for (var start = 0; start < prepared.length; start += CHUNK) {
          var chunk = prepared.slice(start, start + CHUNK);
          await new Promise(function (resolve, reject) {
            var tx2 = db.transaction(storeName, 'readwrite');
            var store2 = tx2.objectStore(storeName);
            for (var i = 0; i < chunk.length; i++) {
              var item = chunk[i];
              var kv = item[keyProp];
              var ex = (kv !== undefined && kv !== null) ? existingMap[kv] : null;
              // PROTECTION : ne pas écraser les données locales non-poussées
              if (ex && ex._synced === false) continue;
              store2.put(ex ? Object.assign({}, ex, item) : item);
            }
            tx2.oncomplete = function () { resolve(); };
            tx2.onerror = function () { reject(tx2.error); };
            tx2.onabort = function () { reject(tx2.error); };
          });
          // Yield au navigateur entre chaque chunk
          if (start + CHUNK < prepared.length) await _yieldToUI();
        }
      }
      return prepared.length;
    };

    for (const storeName of storesToPull) {
      if (!navigator.onLine) {
        console.log('[Flash] ⚠️ Pull interrompu: connexion perdue');
        break;
      }
      try {
        const tableName = storeName === 'users' ? 'app_users' : storeName;

        if (pullSince) {
          // ── INCRÉMENTAL PARALLÈLE : groupes de 4 stores ──
          // Accumule 4 requêtes puis les lance en parallèle
          if (!_pullBatch) _pullBatch = [];
          _pullBatch.push({ storeName, tableName });

          if (_pullBatch.length >= 4 || storeName === storesToPull[storesToPull.length - 1]) {
            const batch = _pullBatch;
            _pullBatch = [];

            const results = await Promise.all(batch.map(async ({ storeName: sn, tableName: tn }) => {
              try {
                const { data, error } = await _withTimeout(
                sb.from(tn)
                  .select('*')
                  .gte('updatedAt', pullSince)
                  .order('updatedAt', { ascending: true })
                  .limit(5000)
              );
                if (error) return { sn, data: null, error };
                return { sn, data, error: null };
              } catch (e) { return { sn, data: null, error: e }; }
            }));

            for (const r of results) {
              if (r.error) {
                throw r.error;
              }
              if (r.data && r.data.length > 0) {
                const count = await writeBatchToIDB(r.sn, r.data);
                if (count > 0) {
                  hasChanges = true;
                  totalItemsPulled += count;
                  _updateCacheInPlace(r.sn, r.data);
                }
              }
            }
            // Micro-yield entre batches — POS 100% réactif
            await new Promise(r => setTimeout(r, 5));
          }

        } else {
          // ── PULL COMPLET (manuel ou premier pull) ──
          const countRes = await _withTimeout(sb.from(tableName).select('*', { count: 'exact', head: true }));
          const totalCount = countRes.count || 0;

          if (totalCount > 0) {
            const fetchLimit = 1000;
            let storeItemCount = 0;

            for (let offset = 0; offset < totalCount; offset += fetchLimit * 5) {
              if (!navigator.onLine) break;
              const batch = [];
              for (let j = 0; j < 5 && (offset + j * fetchLimit) < totalCount; j++) {
                const o = offset + j * fetchLimit;
                batch.push(_withTimeout(sb.from(tableName).select('*').range(o, o + fetchLimit - 1)));
              }
              const results = await Promise.all(batch);
              for (const res of results) {
                if (res.error) throw res.error;
                if (res.data && res.data.length > 0) {
                  storeItemCount += await writeBatchToIDB(storeName, res.data);
                }
              }
              await new Promise(r => setTimeout(r, 0));
            }

            if (storeItemCount > 0) {
              hasChanges = true;
              totalItemsPulled += storeItemCount;
              _invalidateCache(storeName); // Full pull : vider le cache pour re-read complet
            }
          }
        }
      } catch (storeErr) {
        const errMsg = storeErr?.message || String(storeErr || '');
        const isNetworkError = errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError') || errMsg.includes('ERR_INTERNET_DISCONNECTED') || errMsg.includes('ERR_QUIC_PROTOCOL_ERROR') || errMsg.includes('ERR_NAME_NOT_RESOLVED') || errMsg.includes('CORS') || errMsg.includes('Access-Control') || errMsg.includes('ERR_CONNECTION_RESET') || errMsg.includes('ERR_CONNECTION_CLOSED') || errMsg.includes('ERR_NETWORK_IO_SUSPENDED') || errMsg.includes('preflight') || errMsg.includes('timeout');
        if (isNetworkError) {
          AppState.isOnline = false;
          AppState._confirmedOffline = true;
          console.log('[Flash] ⚠️ Pull interrompu: erreur réseau détectée');
          break;
        }
        if (errMsg && !errMsg.includes('null')) {
          console.warn(`[Flash] Store error ${storeName}:`, errMsg);
        }
      }
    }

    // Sauvegarder le timestamp du pull réussi
    localStorage.setItem(lastPullKey, String(Date.now()));

    if (hasChanges) console.log(`[Flash] ⚡ Pull terminé — ${totalItemsPulled} éléments mis à jour`);

    // ── LIVE UI REFRESH après pull (silencieux, sans flash) ──
    if (hasChanges) {
      try {
        const page = window.Router?.currentPage;
        if (page && page !== 'login' && page !== 'onboarding' && page !== 'pos' && page !== 'settings') {
          if (window._invalidateDashCache) window._invalidateDashCache();
          _silentRefreshPage(page, []);
        }
      } catch (e) { /* silencieux */ }
    }

    // Tracking désactivé — table pull_tracking non présente dans Supabase client
    // (supprimé pour éviter les erreurs silencieuses en prod)

    // Final refresh of display if settings were updated
    if (window.updatePharmacyDisplay) {
      await window.updatePharmacyDisplay();
    }

    // Si le POS est ouvert ET pull MANUEL uniquement → rafraîchir les données produits
    // JAMAIS en auto-pull : le rechargement perturbe le travail du caissier
    if (isManual && window.location.hash === '#pos' && typeof refreshPOSData === 'function') {
      await refreshPOSData();
    }


  } catch (e) {
    const msg = e.message || '';
    if (!msg.includes('probe_offline')) {
      if (!msg.includes('Failed to fetch') && !msg.includes('NetworkError') && !msg.includes('network error')) {
        console.warn('[Flash] Pull general error:', e);
      }
    }
    throw e; // IMPORTANT: Re-throw l'erreur pour que runPull.catch() la capte
  } finally {
    clearTimeout(_pullLockTimeout);
    _isPulling = false;
  }
}

/**
 * FORCE SYNC: Re-mark everything as pending and push to cloud
 */
async function forceSyncAll() {
  const stores = [
    'products', 'lots', 'stock', 'movements', 'suppliers', 'purchaseOrders',
    'sales', 'saleItems', 'patients', 'prescriptions', 'alerts',
    'cashRegister', 'auditLog', 'users', 'settings', 'returns'
  ];

  let totalMarked = 0;
  console.log('[Flash] 🔄 Force sync: marquage de tous les items...');

  for (const s of stores) {
    const all = await dbGetAll(s);
    if (all.length === 0) continue;

    // Marquer _synced: false par chunks de 10k
    const marked = all.map(item => ({ ...item, _synced: false, _updatedAt: item._updatedAt || Date.now() }));
    const chunkSize = 10000;
    for (let i = 0; i < marked.length; i += chunkSize) {
      await dbBulkPut(s, marked.slice(i, i + chunkSize));
    }
    totalMarked += all.length;
    console.log(`[Flash] ✅ ${s}: ${all.length} items marqués pour sync`);
  }

  console.log(`[Flash] 🚀 ${totalMarked} items au total, lancement du push...`);
  return syncToSupabase();
}

/**
 * AUTO-BACKUP : Sauvegarde automatique locale (localStorage) et périodique
 * - Backup silencieux dans localStorage toutes les 30 minutes
 * - Structure : pharma_backup_<date> = JSON de toutes les données
 */
async function autoBackupToStorage() {
  try {
    const stores = [
      'products', 'lots', 'stock', 'movements', 'suppliers', 'purchaseOrders',
      'sales', 'saleItems', 'patients', 'prescriptions', 'alerts',
      'cashRegister', 'auditLog', 'users', 'settings', 'returns',
      'inventories', 'inventoryAdjustments'
    ];

    const backup = {
      version: window.APP_VERSION || '9.4.1',
      exportedAt: new Date().toISOString(),
      exportedBy: AppState.currentUser?.name || 'Système',
      pharmacy: null,
      data: {}
    };

    for (const s of stores) {
      backup.data[s] = await dbGetAll(s);
    }

    // Récupérer le nom de la pharmacie pour le backup
    const settings = backup.data.settings || [];
    backup.pharmacy = settings.find(s => s.key === 'pharmacy_name')?.value || 'OrdiveX';

    // Stocker dans localStorage (backup silencieux)
    const key = `pharma_auto_backup_${new Date().toISOString().split('T')[0]}`;
    const json = JSON.stringify(backup);
    // Vérifier que la taille ne dépasse pas 4 MB (limite localStorage ~5-10 MB)
    if (json.length > 4 * 1024 * 1024) {
      // Base volumineuse : stockage cloud uniquement si on est en ligne
      localStorage.setItem('pharma_last_backup', new Date().toISOString());
      return backup;
    }
    localStorage.setItem(key, json);
    localStorage.setItem('pharma_last_backup', new Date().toISOString());

    // Nettoyer les vieux backups (garder seulement les 7 derniers jours)
    const keysToDelete = Object.keys(localStorage)
      .filter(k => k.startsWith('pharma_auto_backup_'))
      .sort()
      .reverse()
      .slice(7);
    keysToDelete.forEach(k => localStorage.removeItem(k));

    console.log('[Backup] ✅ Sauvegarde automatique effectuée:', key);
    return backup;
  } catch (e) {
    console.warn('[Backup] Échec backup automatique:', e);
    return null;
  }
}

/**
 * BACKUP MANUEL : Télécharge un fichier JSON complet (déclenché par bouton)
 */
async function doBackup() {
  try {
    const backup = await autoBackupToStorage();
    if (!backup) throw new Error('Échec de la génération du backup');

    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `OrdiveX_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (window.UI) UI.toast('Sauvegarde téléchargée avec succès', 'success');
    writeAudit('BACKUP_DOWNLOADED', 'system', null, { filename: a.download, size: json.length });
    return true;
  } catch (e) {
    console.error('[Backup] Erreur export manuel:', e);
    if (window.UI) UI.toast('Erreur lors de la sauvegarde : ' + e.message, 'error');
    return false;
  }
}

/**
 * DÉMARRAGE AUTO-BACKUP : Lance le backup automatique périodique
 * Appelé une fois au démarrage de l'app
 */
function startAutoBackup() {
  // Helper : exécuter en arrière-plan quand le navigateur est libre
  var _idle = typeof requestIdleCallback === 'function'
    ? function (fn) { requestIdleCallback(fn, { timeout: 5000 }); }
    : function (fn) { setTimeout(fn, 100); };

  // Backup initial au démarrage (après 60s pour laisser le pull finir d'abord)
  setTimeout(function () {
    _idle(function () { autoBackupToStorage(); });
  }, 60000);

  // Backup toutes les 30 minutes — toujours en idle
  setInterval(function () {
    _idle(function () {
      autoBackupToStorage();
      if (AppState.isOnline) {
        syncToSupabase().catch(function () { });
      }
    });
  }, 30 * 60 * 1000);

  // Demarrer la file d attente persistante (OperationQueue)
  if (window.OperationQueue && typeof window.OperationQueue.start === 'function') {
    window.OperationQueue.start();
  } else {
    // Retry apres chargement complet si queue.js pas encore charge
    window.addEventListener('load', function() {
      if (window.OperationQueue) window.OperationQueue.start();
    });
  }

  console.log('[Backup] Auto-backup demarre (toutes les 30 min)');
}

let _autoPullTimer = null;
let _pullFailCount = 0;
/**
 * AUTO-PULL : Synchronisation cloud → local automatique
 * - Utilise des callbacks purs (pas d'async/await) pour éviter
 *   l'accumulation de traces asynchrones dans Chrome DevTools
 * - Après 2 échecs consécutifs → silence total pendant 5 min
 * - Reset instantané dès qu'un pull réussit ou que 'online' se déclenche
 */
function startAutoPull() {
  if (_autoPullTimer) clearTimeout(_autoPullTimer);

  // P3 — Les événements online/offline sont gérés par _handleConnectivityChange (point unique)
  // On expose _triggerAutoPull pour que _handleConnectivityChange puisse déclencher un pull
  window._triggerAutoPull = function() {
    _pullFailCount = 0;
    AppState._confirmedOffline = false;
    if (_autoPullTimer) clearTimeout(_autoPullTimer);
    _autoPullTimer = window.setTimeout(runPull, 3000);
  };
  
  // Réveil sur interaction utilisateur (throttle 2 min pour zéro spam d'erreur HEAD)
  var _lastWakeUp = 0;
  function wakeUpCheck() {
    // Guard absolu : si l'OS dit qu'on est hors-ligne, silence total, zéro requête
    if (!navigator.onLine) return;
    if (AppState._confirmedOffline) {
      // Throttle strict à 5 minutes : navigator.onLine est FAUX POSITIF sur WiFi sans internet
      if (Date.now() - _lastWakeUp < 300000) return;
      _lastWakeUp = Date.now();
      _pullFailCount = 0;
      if (_autoPullTimer) clearTimeout(_autoPullTimer);
      _autoPullTimer = window.setTimeout(runPull, 1000);
    }
  }
  document.addEventListener('visibilitychange', function() { if (document.visibilityState === 'visible') wakeUpCheck(); });
  window.addEventListener('focus', wakeUpCheck);
  window.addEventListener('click', wakeUpCheck, { passive: true, capture: true });
  window.addEventListener('keydown', wakeUpCheck, { passive: true, capture: true });

  // runPull : fonction NON-async — callbacks purs pour briser la trace Chrome
  function runPull() {
    _autoPullTimer = null;

    // Hors-ligne OS → silence total
    if (!navigator.onLine) {
      AppState.isOnline = false;
      AppState._confirmedOffline = true;
      _autoPullTimer = window.setTimeout(runPull, 120000);
      return;
    }

    // Lancer le pull via Promise — pullFromSupabase gère son propre probe réseau
    // NE PAS court-circuiter ici si _confirmedOffline : c'est pullFromSupabase
    // qui contient le probe natif pour détecter le retour du réseau !
    var p;
    try { p = pullFromSupabase(); } catch(e) { p = Promise.reject(e); }
    p.then(function() {
      // Succès — réveil complet
      _pullFailCount = 0;
      const wasOffline = AppState._confirmedOffline;
      AppState._confirmedOffline = false;

      // PUSH des données (garantit que ce qui a été fait hors-ligne part vers Supabase)
      if (typeof syncToSupabase === 'function' && !AppState._confirmedOffline) {
        setTimeout(function() {
          if (AppState._confirmedOffline) return;
          syncToSupabase().catch(function(){});
        }, 1000);
      }

      // Restaurer les WebSockets seulement si on est vraiment en ligne
      if (navigator.onLine && !AppState._confirmedOffline) {
        setTimeout(async function() {
          if (!navigator.onLine || AppState._confirmedOffline) return;
          try {
            var sb = await getSupabaseClient();
            if (sb) {
              if (!_realtimeSubscription) {
                try { _setupRealtime(sb); } catch(e) {}
              }
              if (!_broadcastChannel) {
                try { _setupBroadcast(sb); } catch(e) {}
              }
            }
          } catch(e) {}
        }, 1500);
      }

      _autoPullTimer = window.setTimeout(runPull, 60000);
    }).catch(function() {
      // Échec (probe offline) → SILENCE TOTAL ABSOLU
      _pullFailCount++;
      AppState._confirmedOffline = true;
      AppState.isOnline = false;
      // Tuer le timer interne de Supabase qui fait des POST auth/token en boucle
      if (_supabaseInstance && _supabaseInstance.auth) {
        try { _supabaseInstance.auth.stopAutoRefresh(); } catch(e) {}
      }
      // PAS de timer de retry en boucle ! L'application se met en veille profonde.
      // Elle ne se réveillera que si 'online' se déclenche au niveau OS,
      // ou si l'utilisateur interagit physiquement avec la page (wakeUpCheck).
    });
  }

  // Démarrage initial après 8s
  _autoPullTimer = window.setTimeout(runPull, 8000);
}

/**
 * RESTAURATION SÉCURISÉE "ZERO LOSS"
 * Procédure : Backup de secours auto -> Backup localStorage -> Wipe -> Restore -> Audit
 */
async function restoreFromBackup(backupData) {
  try {
    _restoreInProgress = true;
    // 1. PHASE DE PRÉSERVATION (Auto-download de l'état actuel)
    console.log('[Restore] 🛡️ Phase 1 : Sauvegarde de secours automatique...');
    await doBackup();

    // 2. PHASE D'URGENCE (Copie en localStorage)
    console.log('[Restore] 🛡️ Phase 2 : Copie d\'urgence en localStorage...');
    const emergencyBackup = await autoBackupToStorage();
    if (emergencyBackup) {
      localStorage.setItem('pharma_emergency_restore', JSON.stringify(emergencyBackup));
    }

    // 3. PHASE DE VALIDATION DU FICHIER
    console.log('[Restore] 🛡️ Phase 3 : Validation du fichier...');
    if (!backupData || typeof backupData !== 'object') throw new Error('Données de sauvegarde invalides');

    // Support des deux formats (ancien _exportDate et nouveau exportedAt)
    const isPharmaBackup = backupData.data || backupData.products;
    if (!isPharmaBackup) throw new Error('Ce fichier ne semble pas être une sauvegarde OrdiveX valide.');

    // 4. PHASE DE NETTOYAGE (Wipe)
    console.log('[Restore] 🛡️ Phase 4 : Nettoyage de la base de données locale...');
    const storesToClear = [
      'products', 'lots', 'stock', 'movements', 'suppliers', 'purchaseOrders',
      'sales', 'saleItems', 'patients', 'prescriptions', 'alerts',
      'cashRegister', 'auditLog', 'settings', 'returns',
      'inventories', 'inventoryAdjustments'
    ];

    const db = await initDB();
    for (const storeName of storesToClear) {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // 5. PHASE D'INJECTION
    console.log('[Restore] 🛡️ Phase 5 : Injection des nouvelles données...');
    const dataToImport = backupData.data || backupData; // Gère les deux structures de backup possible

    for (const storeName of storesToClear) {
      const items = dataToImport[storeName];
      if (items && Array.isArray(items) && items.length > 0) {
        // Marquer chaque item comme non-synchronisé pour le push Supabase
        const markedItems = items.map(item => ({
          ...item,
          _synced: false,
          _updatedAt: item._updatedAt || Date.now()
        }));
        // Découpage en lots (chunks) de 10 000 pour éviter de bloquer l'interface
        const chunkSize = 10000;
        for (let i = 0; i < markedItems.length; i += chunkSize) {
          const chunk = markedItems.slice(i, i + chunkSize);
          await dbBulkPut(storeName, chunk);
        }
      }
    }

    // 6. PHASE D'AUDIT ET FINALISATION
    console.log('[Restore] ✅ Restauration terminée avec succès.');
    await writeAudit('RESTORE_ZERO_LOSS', 'system', null, {
      timestamp: Date.now(),
      version: backupData.version || 'unknown'
    });

    _restoreInProgress = false;
    return { success: true };
  } catch (e) {
    _restoreInProgress = false;
    console.error('[Restore] ❌ Erreur critique lors de la restauration:', e);
    throw e;
  }
}

function resetSupabaseClient() {
  if (_supabaseInstance) {
    try { _supabaseInstance.auth?.stopAutoRefresh(); } catch (e) { }
    try { if (_realtimeSubscription) { _supabaseInstance.removeChannel(_realtimeSubscription).catch(() => { }); _realtimeSubscription = null; } } catch (e) { }
    try { if (_broadcastChannel) { _supabaseInstance.removeChannel(_broadcastChannel).catch(() => { }); _broadcastChannel = null; } } catch (e) { }
  }
  _supabaseInstance = null;
}

// (Error silencer déplacé en haut du fichier pour intercepter dès le chargement)

window.addEventListener('error', function (event) {
  var msg = event.message || '';
  if (msg.indexOf('ERR_INTERNET') !== -1 || msg.indexOf('Failed to fetch') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('net::ERR_') !== -1) return;
  // Ne pas afficher de toast pour les erreurs de scripts externes (CDN/Supabase)
  if (event.filename && (event.filename.indexOf('supabase') !== -1 || (!event.filename.includes(location.hostname) && !event.filename.includes('localhost')))) return;
  if (window.UI && UI.toast) {
    UI.toast('Erreur système détectée — L\'application continue de fonctionner', 'warning', 3000);
  }
});

window.addEventListener('unhandledrejection', function (event) {
  var msg = String(event.reason?.message || event.reason || '');
  // Silencer TOUTES les erreurs réseau, auth, et ServiceWorker — comportement normal en PWA offline
  var noisePatterns = [
    'ERR_INTERNET', 'Failed to fetch', 'NetworkError', 'net::ERR_',
    'refresh_token', 'ServiceWorker', 'service worker', 'An unknown error',
    'AuthRetryable', 'Lock', 'AuthSessionMissing', 'Auth session missing',
    'Unauthorized', '401', '400', 'Bad Request', 'CORS', 'AbortError',
    'Load failed', 'The user aborted', 'CHANNEL_ERROR', 'WebSocket',
    'signInAnonymously', 'Failed to decode'
  ];
  for (var i = 0; i < noisePatterns.length; i++) {
    if (msg.indexOf(noisePatterns[i]) !== -1) { event.preventDefault(); return; }
  }
  event.preventDefault();
});

// Protection IndexedDB — reconnexion automatique si la connexion est perdue
if (typeof indexedDB !== 'undefined') {
  const _origTransaction = IDBDatabase.prototype.transaction;
  // On ne surcharge pas pour garder la stabilité, mais on surveille
  window.addEventListener('beforeunload', () => {
    if (db) { try { db.close(); } catch (e) { } }
  });
}

// ═══════════════════════════════════════════════════════════════════
// CONNEXION RESILIENCE ENGINE — Debounce + Backoff Exponentiel
// Empêche les boucles online/offline et les reconnexions en rafale
// ═══════════════════════════════════════════════════════════════════

function _handleConnectivityChange(isOnline) {
  // Ignorer si l'état n'a pas réellement changé
  if (isOnline === _lastConnState) return;
  _lastConnState = isOnline;

  // Debounce : attendre 5 secondes de stabilité avant de réagir
  clearTimeout(_connectivityDebounceTimer);
  _connectivityDebounceTimer = setTimeout(() => {
    // Vérifier à nouveau après le debounce
    const actuallyOnline = navigator.onLine;
    if (actuallyOnline === AppState.isOnline) return; // Pas de changement réel

    if (actuallyOnline) {
      // ── RECONNEXION ──
      AppState.isOnline = true;
      _logOnce('log', '[App] Connexion internet rétablie');

      // Backoff exponentiel : ne pas tout relancer immédiatement
      const delay = _getBackoffDelay();
      _reconnectAttempts++;

      setTimeout(async () => {
        if (!navigator.onLine) return; // Re-vérifier avant d'agir

        // Vérification réelle de la connectivité avec un fetch léger
        try {
          const probe = await fetch(location.href, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined });
          if (!probe.ok) throw new Error('probe failed');
        } catch (e) {
          // Internet pas réellement disponible, on annule
          _logOnce('warn', '[App] Connexion signalée mais internet non disponible, report du sync');
          return;
        }

        // Recréer l'instance Supabase (détruite lors du passage offline)
        const sb = await getSupabaseClient();
        if (!sb) return; // Pas de config ou toujours offline

        // Relancer le auto-refresh du token
        if (sb.auth?.startAutoRefresh) {
          sb.auth.startAutoRefresh();
        }
        // Relancer le realtime + broadcast (avec cooldown intégré)
        try { _setupRealtime(sb); } catch (e) { /* optionnel */ }
        try { _setupBroadcast(sb); } catch (e) { /* optionnel */ }
        
        // Déclencher le auto-pull réseau coordonné
        if (typeof window._triggerAutoPull === 'function') {
          window._triggerAutoPull();
        }

        // Déclencher le traitement de la file d'attente
        if (typeof window._triggerQueueProcess === 'function') {
          window._triggerQueueProcess();
        }

        // Tenter un sync
        syncToSupabase().then(() => {
          _reconnectAttempts = 0; // Reset sur succès
        }).catch(() => { });
      }, delay);

    } else {
      // ── DÉCONNEXION IMMÉDIATE ──
      AppState.isOnline = false;
      // Annuler tout sync/pull en cours
      _syncInProgress = false;
      _isPulling = false;
      if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
      _logOnce('log', '[App] Mode hors-ligne activé');

      // DESTRUCTION TOTALE de l'instance Supabase pour tuer TOUS ses timers internes
      if (_supabaseInstance) {
        try {
          _supabaseInstance.auth?.stopAutoRefresh?.();
          if (_realtimeSubscription) {
            _supabaseInstance.removeChannel(_realtimeSubscription).catch(() => { });
            _realtimeSubscription = null;
          }
          if (_broadcastChannel) {
            _supabaseInstance.removeChannel(_broadcastChannel).catch(() => { });
            _broadcastChannel = null;
          }
          _supabaseInstance.realtime?.disconnect?.();
          _realtimeCooldown = false;
        } catch (e) { }
        _supabaseInstance = null;
      }
    }
  }, isOnline ? 5000 : 500); // Offline: réaction rapide 500ms, Online: debounce 5s
}

window.addEventListener('online', () => _handleConnectivityChange(true));
window.addEventListener('offline', () => _handleConnectivityChange(false));

const _DBExports = { initDB, dbAdd, dbPut, dbBulkPut, dbGet, dbGetAll, dbGetRecent, dbSearchProducts, dbCountProducts, dbDelete, dbCount, dbStockValue, writeAudit, seedDemoData, syncToSupabase, pullFromSupabase, resetSupabaseClient, forceSyncAll, trackInstallation, getSupabaseClient, STORES, AppState, doBackup, startAutoBackup, startAutoPull, autoBackupToStorage, restoreFromBackup };
Object.defineProperty(_DBExports, '_isPulling', { get: () => _isPulling });
window.DB = _DBExports;
