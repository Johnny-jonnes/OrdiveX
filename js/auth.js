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
    // Charger les permissions dynamiques pour ce rôle
    await Auth.loadPermissions();
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
    // Admin a toutes les permissions
    if (user.role === 'admin') return true;
    const roleKey = String(user.role || '').toLowerCase().replace(/[\s-]+/g, '_');
    // 1. Vérifier les permissions individuelles (overrides par utilisateur)
    //    Stockées dans user.permissions : { perm_key: true|false }
    const userPerms = user.permissions || {};
    if (typeof userPerms[action] === 'boolean') {
      return userPerms[action];
    }
    // 2. Vérifier les permissions du rôle (chargées dynamiquement ou par défaut)
    const rolePerms = (window._rolePermissions || {})[roleKey] || Auth._defaultPerms[roleKey] || [];
    return rolePerms.includes(action);
  },

  // Permissions par défaut pour chaque rôle (modifiables depuis les Paramètres)
  _defaultPerms: {
    responsable:        ['voir_ca','voir_benefices','voir_prix_achat','voir_cout_achat','voir_valeur_stock','voir_marges','voir_rapports_financiers','voir_statistiques','voir_salaires','modifier_prix','annuler_vente','annuler_facture','appliquer_remise','effectuer_inventaire','effectuer_sortie_stock','exporter_donnees','gerer_utilisateurs','gerer_parametres','acceder_sauvegardes','module_stock','module_achats','module_rh','module_rapports','module_caisse'],
    rh:                 ['voir_salaires','gerer_utilisateurs','module_rh'],
    pharmacien:         ['voir_ca','voir_valeur_stock','voir_cout_achat','voir_prix_achat','effectuer_inventaire','effectuer_sortie_stock','exporter_donnees','modifier_prix','appliquer_remise','module_stock','module_achats','module_caisse','module_rapports'],
    caissier:           ['appliquer_remise','module_caisse'],
    receptionniste:     ['module_caisse'],
    gestionnaire_stock: ['voir_valeur_stock','effectuer_inventaire','effectuer_sortie_stock','exporter_donnees','module_stock'],
    comptable:          ['voir_ca','voir_benefices','voir_cout_achat','voir_valeur_stock','voir_marges','voir_rapports_financiers','voir_statistiques','exporter_donnees','module_rapports'],
    assistant:          [],
  },

  // Charger les permissions depuis IndexedDB au login
  async loadPermissions() {
    try {
      const rec = await DB.dbGetByKey('settings', 'role_permissions').catch(() => null);
      if (rec && rec.value) {
        window._rolePermissions = typeof rec.value === 'string' ? JSON.parse(rec.value) : rec.value;
      } else {
        window._rolePermissions = {};
      }
    } catch(e) {
      window._rolePermissions = {};
    }
    // Charger TOUS les paramètres applicatifs dans _appSettings
    try {
      const allSettings = await DB.dbGetAll('settings');
      window._appSettings = {};
      (allSettings || []).forEach(s => {
        if (s.key) window._appSettings[s.key] = s.value;
      });
    } catch(e) {
      window._appSettings = {};
    }
    // Charger les permissions individuelles de l'utilisateur courant
    try {
      const user = DB.AppState.currentUser;
      if (user && user.id) {
        const rec2 = await DB.dbGetByKey('settings', `user_permissions_${user.id}`).catch(() => null);
        if (rec2 && rec2.value) {
          const perms = typeof rec2.value === 'string' ? JSON.parse(rec2.value) : rec2.value;
          DB.AppState.currentUser.permissions = perms;
        }
      }
    } catch(e) { /* silencieux */ }
  },

  // Liste de toutes les permissions disponibles
  ALL_PERMISSIONS: [
    // === Financier ===
    { key: 'voir_ca',                  label: 'Voir le chiffre d\'affaires',   cat: 'financier' },
    { key: 'voir_benefices',           label: 'Voir les bénéfices',            cat: 'financier' },
    { key: 'voir_prix_achat',          label: 'Voir les prix d\'achat',        cat: 'financier' },
    { key: 'voir_cout_achat',          label: 'Voir le coût d\'achat',         cat: 'financier' },
    { key: 'voir_valeur_stock',        label: 'Voir la valeur du stock',       cat: 'financier' },
    { key: 'voir_marges',              label: 'Voir les marges',               cat: 'financier' },
    { key: 'voir_rapports_financiers', label: 'Voir les rapports financiers',  cat: 'financier' },
    { key: 'voir_statistiques',        label: 'Voir les statistiques',         cat: 'financier' },
    { key: 'voir_salaires',            label: 'Voir les salaires RH',          cat: 'financier' },
    // === Actions commerciales ===
    { key: 'modifier_prix',            label: 'Modifier les prix produits',    cat: 'commercial' },
    { key: 'annuler_vente',            label: 'Annuler une vente',             cat: 'commercial' },
    { key: 'supprimer_vente',          label: 'Supprimer une vente',           cat: 'commercial' },
    { key: 'annuler_facture',          label: 'Annuler une facture',           cat: 'commercial' },
    { key: 'appliquer_remise',         label: 'Appliquer une remise',          cat: 'commercial' },
    // === Stock & Inventaire ===
    { key: 'effectuer_inventaire',     label: 'Effectuer un inventaire',       cat: 'stock' },
    { key: 'effectuer_sortie_stock',   label: 'Effectuer une sortie de stock', cat: 'stock' },
    // === Administration ===
    { key: 'exporter_donnees',         label: 'Exporter des données',          cat: 'admin' },
    { key: 'gerer_utilisateurs',       label: 'Gérer les utilisateurs',        cat: 'admin' },
    { key: 'gerer_parametres',         label: 'Gérer les paramètres',          cat: 'admin' },
    { key: 'acceder_sauvegardes',      label: 'Accéder aux sauvegardes',       cat: 'admin' },
    // === Modules ===
    { key: 'module_stock',             label: 'Accéder au module Stock',       cat: 'modules' },
    { key: 'module_achats',            label: 'Accéder au module Achats',      cat: 'modules' },
    { key: 'module_rh',                label: 'Accéder au module RH',          cat: 'modules' },
    { key: 'module_rapports',          label: 'Accéder aux Rapports',          cat: 'modules' },
    { key: 'module_caisse',            label: 'Accéder à la Caisse',           cat: 'modules' },
  ],

  ALL_PERMISSION_CATS: [
    { key: 'financier',  label: '💰 Données Financières' },
    { key: 'commercial', label: '🛒 Actions Commerciales' },
    { key: 'stock',      label: '📦 Stock & Inventaire' },
    { key: 'admin',      label: '⚙️ Administration' },
    { key: 'modules',    label: '🧩 Accès Modules' },
  ],

  ALL_ROLES: [
    { key: 'responsable',        label: 'Responsable' },
    { key: 'rh',                 label: 'RH' },
    { key: 'pharmacien',         label: 'Pharmacien' },
    { key: 'caissier',           label: 'Caissier' },
    { key: 'receptionniste',     label: 'Réceptionniste' },
    { key: 'gestionnaire_stock', label: 'Gestionnaire de stock' },
    { key: 'comptable',          label: 'Comptable' },
    { key: 'assistant',          label: 'Assistant' },
  ],
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
