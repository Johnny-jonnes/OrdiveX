/**
 * OrdiveX — Auth & Router
 */

const Auth = {
  async login(username, password) {
    const users = await DB.dbGetAll('users');
    const uInput = String(username || '').trim().toLowerCase();
    const pInput = String(password || '').trim();

    console.log('[Auth] Attempting login for:', uInput);
    console.log('[Auth] Users in database:', users.map(u => ({
      username: u.username,
      pwd_len: String(u.password).length,
      active: u.active
    })));

    const user = users.find(u => {
      const dbUser = String(u.username || '').trim().toLowerCase();
      const dbPass = String(u.password || '').trim();
      return (dbUser === uInput && dbPass === pInput);
    });

    if (!user) {
      console.warn('[Auth] Login failed: Credentials mismatch.');
      return null;
    }
    if (!user.active) {
      console.warn('[Auth] Login failed: Account is inactive.');
      return null;
    }
    const session = { id: 'session_' + Date.now(), userId: user.id, username: user.username, role: user.role, name: user.name, loginTime: Date.now() };
    await DB.dbPut('sessions', session);
    DB.AppState.currentUser = { ...user, sessionId: session.id };
    await DB.writeAudit('LOGIN', 'session', session.id, { username }, user.id);
    // Forcer la mise à jour immédiate du sidebar et topbar avec le BON utilisateur
    setTimeout(() => {
      if (typeof initSidebar === 'function') initSidebar();
      if (typeof updateTopbar === 'function') updateTopbar();
      if (typeof AlertsEngine !== 'undefined') AlertsEngine.start();
      if (typeof updateAlertBadge !== 'undefined') updateAlertBadge();
      if (window.SecurityLock) window.SecurityLock.reloadConfig();
    }, 500);
    return DB.AppState.currentUser;
  },

  async logout() {
    if (DB.AppState.currentUser) {
      await DB.writeAudit('LOGOUT', 'session', null, {}, DB.AppState.currentUser.id);
    }
    if (window.SecurityLock) window.SecurityLock.stop();
    DB.AppState.currentUser = null;
    Router.navigate('login');
  },

  async checkSession() {
    // Simple session check via AppState
    return DB.AppState.currentUser;
  },

  async restoreSession() {
    // Session restoration disabled to force login on every app start as requested
    return null;
  },

  can(action) {
    const user = DB.AppState.currentUser;
    if (!user) return false;
    const perms = {
      admin: ['*'],
      pharmacien: ['view_all', 'sell', 'validate_prescription', 'manage_stock', 'view_reports', 'manage_orders', 'view_finance', 'destroy_medicine'],
      caissier: ['sell', 'view_products', 'view_stock_readonly'],
    };
    const userPerms = perms[user.role] || [];
    return userPerms.includes('*') || userPerms.includes(action);
  }
};

const Router = {
  routes: {},
  currentPage: null,
  _cleanupFns: [],

  // Enregistrer une fonction de cleanup pour la page courante
  // Appelee automatiquement avant de quitter la page
  onLeave(fn) {
    if (typeof fn === 'function') this._cleanupFns.push(fn);
  },

  _runCleanup() {
    var fns = this._cleanupFns.slice();
    this._cleanupFns = [];
    for (var i = 0; i < fns.length; i++) {
      try { fns[i](); } catch(e) { /* silencieux */ }
    }
  },

  register(name, renderFn) {
    this.routes[name] = renderFn;
    if (this.currentPage === name) {
      const main = document.getElementById('app-content');
      if (main && main.innerHTML.includes('Page introuvable')) {
        this.render(name);
      }
    }
  },

  navigate(page, params) {
    params = params || {};
    if (!DB.AppState.currentUser && page !== 'login' && page !== 'onboarding') {
      page = 'login';
    }
    // Cleanup de la page precedente AVANT de changer
    this._runCleanup();
    this.currentPage = page;
    DB.AppState.currentPage = page;
    this.render(page, params);
    this.updateNav(page);
  },

  render(page, params) {
    const main = document.getElementById('app-content');
    if (!main) return;

    // Nettoyage memoire des donnees temporaires de la page precedente
    const tempKeys = ['_stockData', '_salesData', '_saleItemsData', '_ordersData', '_ordersSupplierMap', '_ordersProducts',
      '_reorderSuggestions', '_inventoryItems', '_traceProductMap', '_traceLots', '_traceMovements',
      '_tracePrescriptions', '_tracePatients', '_currentReceiveOrder', '_allProducts'];
    tempKeys.forEach(function(k) { try { delete window[k]; } catch(e) {} });

    const fn = this.routes[page];
    if (fn) {
      main.innerHTML = '';
      try {
        const result = fn(main, params);
        if (result && typeof result.catch === 'function') {
          result.catch(function(err) {
            console.error('[Router] Erreur async dans "' + page + '":', err);
            main.innerHTML = '<div class="empty-state"><div style="font-size:48px;margin-bottom:16px">!</div><h2>Erreur de chargement</h2><p style="color:var(--text-muted);margin:8px 0">' + (err.message || 'Erreur inconnue') + '</p><button class="btn btn-primary" style="margin-top:12px" onclick="Router.navigate(\'' + page + '\')">Reessayer</button><button class="btn btn-secondary" style="margin-top:12px;margin-left:8px" onclick="Router.navigate(\'dashboard\')">Tableau de bord</button></div>';
          });
        }
      } catch (err) {
        console.error('[Router] Erreur dans "' + page + '":', err);
        main.innerHTML = '<div class="empty-state"><div style="font-size:48px;margin-bottom:16px">!</div><h2>Erreur de chargement</h2><p style="color:var(--text-muted);margin:8px 0">' + (err.message || 'Erreur inconnue') + '</p><button class="btn btn-primary" style="margin-top:12px" onclick="Router.navigate(\'' + page + '\')">Reessayer</button><button class="btn btn-secondary" style="margin-top:12px;margin-left:8px" onclick="Router.navigate(\'dashboard\')">Tableau de bord</button></div>';
      }
    } else {
      main.innerHTML = '<div class="empty-state"><h2>Page introuvable : ' + page + '</h2></div>';
    }
  },

  updateNav(page) {
    document.querySelectorAll('.nav-item').forEach(function(el) {
      el.classList.toggle('active', el.dataset.page === page);
    });
  }
};


window.Auth = Auth;
window.Router = Router;
