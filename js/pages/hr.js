// ═══════════════════════════════════════════════════════════════════════════
//  OrdiveX — Module Ressources Humaines v9.7.53
//  js/pages/hr.js
//  6 onglets : dashboard, employes, paie, avances, conges, presence
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Helpers ────────────────────────────────────────────────────────────
  const fmt = (n) => Number(n || 0).toLocaleString('fr-GN') + ' GNF';
  const fmtN = (n) => Number(n || 0).toLocaleString('fr-GN');
  const today = () => new Date().toISOString().slice(0, 10);
  const ym = () => new Date().toISOString().slice(0, 7);
  const initials = (s) => (s || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const dateLabel = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

  function gs(key) {
    return window._appSettings ? (window._appSettings[key] || '') : '';
  }

  // ─── Enregistrement de la route ─────────────────────────────────────────
  if (window.Router) {
    Router.register('hr', (container) => renderHR(container));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════
  async function renderHR(container) {
    container.innerHTML = `
      <div class="page-header" style="margin-bottom:20px">
        <div>
          <h1 class="page-title">Ressources Humaines</h1>
          <p class="page-subtitle" style="color:var(--text-muted);font-size:.85rem;margin-top:4px">
            Gestion du personnel, paie, congés et présence
          </p>
        </div>
      </div>

      <div class="hr-tabs" id="hr-tabs">
        <button class="hr-tab-btn active" onclick="hrSwitchTab('dashboard',this)" id="hr-btn-dashboard">
          <i data-lucide="layout-dashboard"></i> Tableau de Bord
        </button>
        <button class="hr-tab-btn" onclick="hrSwitchTab('employes',this)" id="hr-btn-employes">
          <i data-lucide="users"></i> Employés
        </button>
        <button class="hr-tab-btn" onclick="hrSwitchTab('paie',this)" id="hr-btn-paie">
          <i data-lucide="banknote"></i> Paie
        </button>
        <button class="hr-tab-btn" onclick="hrSwitchTab('avances',this)" id="hr-btn-avances">
          <i data-lucide="wallet"></i> Avances
        </button>
        <button class="hr-tab-btn" onclick="hrSwitchTab('conges',this)" id="hr-btn-conges">
          <i data-lucide="calendar-days"></i> Congés
        </button>
        <button class="hr-tab-btn" onclick="hrSwitchTab('presence',this)" id="hr-btn-presence">
          <i data-lucide="clock"></i> Présence
        </button>
      </div>

      <div id="hr-tab-content"></div>
    `;
    if (window.lucide) lucide.createIcons({ node: container });
    await hrRenderTab('dashboard');
  }

  window.hrSwitchTab = async function (tab, btn) {
    document.querySelectorAll('.hr-tab-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    await hrRenderTab(tab);
  };

  async function hrRenderTab(tab) {
    const c = document.getElementById('hr-tab-content');
    if (!c) return;
    c.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
    try {
      switch (tab) {
        case 'dashboard': await renderHRDashboard(c); break;
        case 'employes':  await renderEmployes(c); break;
        case 'paie':      await renderPaie(c); break;
        case 'avances':   await renderAvances(c); break;
        case 'conges':    await renderConges(c); break;
        case 'presence':  await renderPresence(c); break;
        default: c.innerHTML = '<p>Onglet inconnu</p>';
      }
    } catch (e) {
      c.innerHTML = `<div class="empty-state"><p style="color:var(--danger)">Erreur : ${e.message}</p></div>`;
      console.error('[HR]', e);
    }
    if (window.lucide) lucide.createIcons({ node: c });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ONGLET 1 — TABLEAU DE BORD
  // ═══════════════════════════════════════════════════════════════════════
  async function renderHRDashboard(c) {
    const [employees, payroll, advances, leaves, attendance] = await Promise.all([
      DB.dbGetAll('employees'),
      DB.dbGetAll('hr_payroll'),
      DB.dbGetAll('hr_advances'),
      DB.dbGetAll('hr_leaves'),
      DB.dbGetAll('hr_attendance'),
    ]);

    const actifs = employees.filter(e => e.status === 'actif');
    const periode = ym();
    const payMois = payroll.filter(p => p.period === periode);
    const masseSalariale = payMois.reduce((s, p) => s + (p.netAPayer || 0), 0);
    const avancesEnCours = advances.filter(a => a.status === 'approuvee' && a.solde > 0)
      .reduce((s, a) => s + (a.solde || 0), 0);
    const absencesMois = leaves.filter(l => {
      const d = l.dateDebut ? l.dateDebut.slice(0, 7) : '';
      return d === periode && (l.type === 'absence' || l.type === 'maladie');
    }).length;
    const congesMois = leaves.filter(l => l.dateDebut && l.dateDebut.slice(0, 7) === periode && l.type === 'conge').length;

    // Anniversaires ce mois
    const moisActuel = new Date().getMonth() + 1;
    const anniversaires = employees.filter(e => {
      if (!e.dateNaissance) return false;
      return parseInt(e.dateNaissance.slice(5, 7)) === moisActuel;
    });

    // Contrats expirant dans 30 jours
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);
    const contratsExp = employees.filter(e => {
      if (!e.dateFinContrat) return false;
      const d = new Date(e.dateFinContrat);
      return d >= new Date() && d <= in30;
    });

    c.innerHTML = `
      <div class="hr-kpi-grid">
        <div class="hr-kpi-card blue">
          <div class="hr-kpi-icon blue"><i data-lucide="users" style="width:20px;height:20px"></i></div>
          <div class="hr-kpi-value">${actifs.length}</div>
          <div class="hr-kpi-label">Employés Actifs</div>
          <div class="hr-kpi-sub">${employees.length} au total</div>
        </div>
        <div class="hr-kpi-card green">
          <div class="hr-kpi-icon green"><i data-lucide="banknote" style="width:20px;height:20px"></i></div>
          <div class="hr-kpi-value" style="font-size:1.2rem">${fmt(masseSalariale)}</div>
          <div class="hr-kpi-label">Masse Salariale</div>
          <div class="hr-kpi-sub">${payMois.length} fiches ce mois</div>
        </div>
        <div class="hr-kpi-card orange">
          <div class="hr-kpi-icon orange"><i data-lucide="wallet" style="width:20px;height:20px"></i></div>
          <div class="hr-kpi-value" style="font-size:1.2rem">${fmt(avancesEnCours)}</div>
          <div class="hr-kpi-label">Avances en Cours</div>
          <div class="hr-kpi-sub">${advances.filter(a=>a.status==='approuvee'&&a.solde>0).length} dossiers</div>
        </div>
        <div class="hr-kpi-card red">
          <div class="hr-kpi-icon red"><i data-lucide="alert-circle" style="width:20px;height:20px"></i></div>
          <div class="hr-kpi-value">${absencesMois}</div>
          <div class="hr-kpi-label">Absences ce Mois</div>
          <div class="hr-kpi-sub">${congesMois} congés en cours</div>
        </div>
        <div class="hr-kpi-card purple">
          <div class="hr-kpi-icon purple"><i data-lucide="cake" style="width:20px;height:20px"></i></div>
          <div class="hr-kpi-value">${anniversaires.length}</div>
          <div class="hr-kpi-label">Anniversaires</div>
          <div class="hr-kpi-sub">Ce mois-ci</div>
        </div>
        <div class="hr-kpi-card teal">
          <div class="hr-kpi-icon teal"><i data-lucide="file-warning" style="width:20px;height:20px"></i></div>
          <div class="hr-kpi-value">${contratsExp.length}</div>
          <div class="hr-kpi-label">Contrats Expirant</div>
          <div class="hr-kpi-sub">Dans les 30 jours</div>
        </div>
      </div>

      ${anniversaires.length > 0 ? `
      <div class="card" style="margin-bottom:20px;padding:20px">
        <h3 style="font-size:.9rem;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px">
          <i data-lucide="cake"></i> Anniversaires ce mois
        </h3>
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${anniversaires.map(e => `
            <div style="display:flex;align-items:center;gap:10px;background:var(--surface-alt);padding:8px 14px;border-radius:10px">
              <div class="hr-emp-avatar" style="width:36px;height:36px;font-size:.9rem">${initials(e.nom)}</div>
              <div>
                <div style="font-weight:600;font-size:.85rem">${e.nom}</div>
                <div style="font-size:.75rem;color:var(--text-muted)">${e.dateNaissance ? new Date(e.dateNaissance).toLocaleDateString('fr-FR',{day:'numeric',month:'long'}) : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      ${contratsExp.length > 0 ? `
      <div class="card" style="padding:20px">
        <h3 style="font-size:.9rem;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px;color:#f59e0b">
          <i data-lucide="file-warning"></i> Contrats expirant bientôt
        </h3>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${contratsExp.map(e => {
            const jours = Math.ceil((new Date(e.dateFinContrat) - new Date()) / 86400000);
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:rgba(245,158,11,.05);border-radius:8px;border:1px solid rgba(245,158,11,.2)">
              <div>
                <div style="font-weight:600;font-size:.85rem">${e.nom}</div>
                <div style="font-size:.75rem;color:var(--text-muted)">${e.poste || '—'}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:.78rem;font-weight:700;color:#f59e0b">Expire dans ${jours} jours</div>
                <div style="font-size:.72rem;color:var(--text-muted)">${dateLabel(e.dateFinContrat)}</div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      ${employees.length === 0 ? `
      <div class="empty-state" style="margin-top:40px">
        <i data-lucide="users" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:16px"></i>
        <h3>Aucun employé enregistré</h3>
        <p style="color:var(--text-muted);margin-bottom:16px">Commencez par ajouter vos employés dans l'onglet Employés</p>
        <button class="btn btn-primary" onclick="hrSwitchTab('employes',document.getElementById('hr-btn-employes'))">
          <i data-lucide="plus"></i> Ajouter un Employé
        </button>
      </div>` : ''}
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ONGLET 2 — EMPLOYÉS
  // ═══════════════════════════════════════════════════════════════════════
  async function renderEmployes(c) {
    const employees = await DB.dbGetAll('employees');
    let search = '';
    let filterStatus = '';

    function render() {
      let list = employees.filter(e => {
        const q = search.toLowerCase();
        const match = !q || (e.nom||'').toLowerCase().includes(q) || (e.poste||'').toLowerCase().includes(q) || (e.department||'').toLowerCase().includes(q);
        const stMatch = !filterStatus || e.status === filterStatus;
        return match && stMatch;
      });

      const badgeClass = { actif:'emp-badge-actif', inactif:'emp-badge-inactif', conge:'emp-badge-conge', suspendu:'emp-badge-suspendu' };
      const badgeLabel = { actif:'Actif', inactif:'Inactif', conge:'En Congé', suspendu:'Suspendu' };

      c.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <div style="position:relative">
              <i data-lucide="search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--text-muted)"></i>
              <input id="emp-search" type="text" class="form-control" placeholder="Rechercher un employé..." style="padding-left:34px;min-width:220px" value="${search}" oninput="hrEmpSearch(this.value)">
            </div>
            <select class="form-control" onchange="hrEmpFilter(this.value)" style="min-width:140px">
              <option value="">Tous les statuts</option>
              <option value="actif" ${filterStatus==='actif'?'selected':''}>Actif</option>
              <option value="inactif" ${filterStatus==='inactif'?'selected':''}>Inactif</option>
              <option value="conge" ${filterStatus==='conge'?'selected':''}>En Congé</option>
              <option value="suspendu" ${filterStatus==='suspendu'?'selected':''}>Suspendu</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="hrOpenEmployeForm()">
            <i data-lucide="user-plus"></i> Nouvel Employé
          </button>
        </div>

        ${list.length === 0 ? `
          <div class="empty-state">
            <i data-lucide="users" style="width:40px;height:40px;color:var(--text-muted)"></i>
            <p style="margin-top:12px;color:var(--text-muted)">Aucun employé trouvé</p>
          </div>
        ` : `
          <div class="hr-employee-grid">
            ${list.map(e => `
              <div class="hr-employee-card" onclick="hrOpenEmployeDetail(${e.id})">
                <div class="hr-emp-avatar">${e.photo ? `<img src="${e.photo}" alt="">` : initials(e.nom)}</div>
                <div class="hr-emp-info">
                  <div class="hr-emp-name">${e.nom}</div>
                  <div class="hr-emp-post">${e.poste || '—'} ${e.department ? '· '+e.department : ''}</div>
                  <div class="hr-emp-meta">
                    <span class="emp-badge ${badgeClass[e.status]||'emp-badge-inactif'}">${badgeLabel[e.status]||e.status}</span>
                    ${e.salaire ? `<span style="font-size:.72rem;color:var(--text-muted)">${fmt(e.salaire)}/mois</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px">
                  <button class="btn btn-icon btn-sm" title="Modifier" onclick="event.stopPropagation();hrOpenEmployeForm(${e.id})" style="width:32px;height:32px;padding:0">
                    <i data-lucide="pencil" style="width:14px;height:14px"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `;
      if (window.lucide) lucide.createIcons({ node: c });
    }

    window.hrEmpSearch = (v) => { search = v; render(); };
    window.hrEmpFilter = (v) => { filterStatus = v; render(); };
    render();
  }

  // ─── Formulaire Employé ─────────────────────────────────────────────────
  window.hrOpenEmployeForm = async function (id) {
    const emp = id ? await DB.dbGet('employees', id) : {};
    const e = emp || {};
    UI.openModal({
      title: id ? 'Modifier Employé' : 'Nouvel Employé',
      size: 'large',
      body: `
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group" style="grid-column:1/-1">
            <label>Nom complet <span style="color:var(--danger)">*</span></label>
            <input id="hr-emp-nom" class="form-control" type="text" value="${e.nom||''}" placeholder="Prénom NOM">
          </div>
          <div class="form-group">
            <label>Poste / Fonction</label>
            <input id="hr-emp-poste" class="form-control" type="text" value="${e.poste||''}" placeholder="Ex: Pharmacien, Caissier">
          </div>
          <div class="form-group">
            <label>Service / Département</label>
            <input id="hr-emp-dept" class="form-control" type="text" value="${e.department||''}" placeholder="Ex: Ventes, Administration">
          </div>
          <div class="form-group">
            <label>Date d'embauche</label>
            <input id="hr-emp-embauche" class="form-control" type="date" value="${e.dateEmbauche||''}">
          </div>
          <div class="form-group">
            <label>Date de naissance</label>
            <input id="hr-emp-naissance" class="form-control" type="date" value="${e.dateNaissance||''}">
          </div>
          <div class="form-group">
            <label>Salaire de base (GNF)</label>
            <input id="hr-emp-salaire" class="form-control" type="number" value="${e.salaire||''}" placeholder="0">
          </div>
          <div class="form-group">
            <label>Type de contrat</label>
            <select id="hr-emp-contrat" class="form-control">
              <option value="CDI" ${e.typeContrat==='CDI'?'selected':''}>CDI</option>
              <option value="CDD" ${e.typeContrat==='CDD'?'selected':''}>CDD</option>
              <option value="Stagiaire" ${e.typeContrat==='Stagiaire'?'selected':''}>Stagiaire</option>
              <option value="Freelance" ${e.typeContrat==='Freelance'?'selected':''}>Freelance</option>
            </select>
          </div>
          <div class="form-group">
            <label>Date fin de contrat</label>
            <input id="hr-emp-fincontrat" class="form-control" type="date" value="${e.dateFinContrat||''}">
          </div>
          <div class="form-group">
            <label>Téléphone</label>
            <input id="hr-emp-tel" class="form-control" type="tel" value="${e.telephone||''}" placeholder="+224...">
          </div>
          <div class="form-group">
            <label>N° CNI / Pièce</label>
            <input id="hr-emp-cni" class="form-control" type="text" value="${e.cni||''}">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label>Adresse</label>
            <input id="hr-emp-adresse" class="form-control" type="text" value="${e.adresse||''}">
          </div>
          <div class="form-group">
            <label>Personne à contacter</label>
            <input id="hr-emp-contact" class="form-control" type="text" value="${e.contactUrgence||''}">
          </div>
          <div class="form-group">
            <label>Statut</label>
            <select id="hr-emp-status" class="form-control">
              <option value="actif" ${(e.status||'actif')==='actif'?'selected':''}>Actif</option>
              <option value="inactif" ${e.status==='inactif'?'selected':''}>Inactif</option>
              <option value="conge" ${e.status==='conge'?'selected':''}>En Congé</option>
              <option value="suspendu" ${e.status==='suspendu'?'selected':''}>Suspendu</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label>Notes / Observations</label>
            <textarea id="hr-emp-notes" class="form-control" rows="2">${e.notes||''}</textarea>
          </div>
        </div>
      `,
      buttons: [
        { label: 'Annuler', class: 'btn-secondary', action: 'close' },
        { label: id ? 'Enregistrer' : 'Créer', class: 'btn-primary', action: () => hrSaveEmploye(id) }
      ]
    });
  };

  window.hrSaveEmploye = async function (id) {
    const nom = document.getElementById('hr-emp-nom')?.value?.trim();
    if (!nom) { UI.toast('Le nom est obligatoire', 'error'); return; }
    const data = {
      nom,
      poste: document.getElementById('hr-emp-poste')?.value?.trim() || '',
      department: document.getElementById('hr-emp-dept')?.value?.trim() || '',
      dateEmbauche: document.getElementById('hr-emp-embauche')?.value || '',
      dateNaissance: document.getElementById('hr-emp-naissance')?.value || '',
      salaire: parseFloat(document.getElementById('hr-emp-salaire')?.value) || 0,
      typeContrat: document.getElementById('hr-emp-contrat')?.value || 'CDI',
      dateFinContrat: document.getElementById('hr-emp-fincontrat')?.value || '',
      telephone: document.getElementById('hr-emp-tel')?.value?.trim() || '',
      cni: document.getElementById('hr-emp-cni')?.value?.trim() || '',
      adresse: document.getElementById('hr-emp-adresse')?.value?.trim() || '',
      contactUrgence: document.getElementById('hr-emp-contact')?.value?.trim() || '',
      status: document.getElementById('hr-emp-status')?.value || 'actif',
      notes: document.getElementById('hr-emp-notes')?.value?.trim() || '',
      updatedAt: new Date().toISOString(),
    };
    if (id) {
      data.id = id;
      data.createdAt = (await DB.dbGet('employees', id))?.createdAt || data.updatedAt;
    } else {
      data.createdAt = data.updatedAt;
    }
    await DB.dbPut('employees', data);
    UI.closeModal();
    UI.toast(id ? 'Employé mis à jour' : 'Employé créé avec succès', 'success');
    hrRenderTab('employes');
  };

  window.hrOpenEmployeDetail = async function (id) {
    const e = await DB.dbGet('employees', id);
    if (!e) return;
    // Afficher les avances et historique de paie
    const advances = (await DB.dbGetAll('hr_advances')).filter(a => a.employeeId === id);
    const payroll = (await DB.dbGetAll('hr_payroll')).filter(p => p.employeeId === id).slice(-6).reverse();
    const badgeClass = { actif:'emp-badge-actif', inactif:'emp-badge-inactif', conge:'emp-badge-conge', suspendu:'emp-badge-suspendu' };
    const badgeLabel = { actif:'Actif', inactif:'Inactif', conge:'En Congé', suspendu:'Suspendu' };
    UI.openModal({
      title: `Dossier — ${e.nom}`,
      size: 'large',
      body: `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">
          <div><div class="payslip-emp-label">Poste</div><div class="payslip-emp-value">${e.poste||'—'}</div></div>
          <div><div class="payslip-emp-label">Service</div><div class="payslip-emp-value">${e.department||'—'}</div></div>
          <div><div class="payslip-emp-label">Date embauche</div><div class="payslip-emp-value">${dateLabel(e.dateEmbauche)}</div></div>
          <div><div class="payslip-emp-label">Contrat</div><div class="payslip-emp-value">${e.typeContrat||'—'} ${e.dateFinContrat ? '(jusqu\'au '+dateLabel(e.dateFinContrat)+')' : ''}</div></div>
          <div><div class="payslip-emp-label">Salaire de base</div><div class="payslip-emp-value">${fmt(e.salaire)}</div></div>
          <div><div class="payslip-emp-label">Statut</div><div class="payslip-emp-value"><span class="emp-badge ${badgeClass[e.status]||''}">${badgeLabel[e.status]||e.status}</span></div></div>
          <div><div class="payslip-emp-label">Téléphone</div><div class="payslip-emp-value">${e.telephone||'—'}</div></div>
          <div><div class="payslip-emp-label">CNI</div><div class="payslip-emp-value">${e.cni||'—'}</div></div>
        </div>
        ${advances.filter(a=>a.status==='approuvee'&&a.solde>0).length > 0 ? `
          <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px;padding:12px;margin-bottom:16px">
            <div style="font-weight:600;font-size:.85rem;color:#f59e0b;margin-bottom:4px">⚠ Avances en cours : ${fmt(advances.filter(a=>a.status==='approuvee'&&a.solde>0).reduce((s,a)=>s+(a.solde||0),0))}</div>
          </div>
        ` : ''}
        ${payroll.length > 0 ? `
          <h4 style="font-size:.85rem;font-weight:700;margin-bottom:8px">Derniers bulletins de paie</h4>
          <table class="hr-payroll-table" style="font-size:.8rem">
            <thead><tr><th>Période</th><th>Net à Payer</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              ${payroll.map(p => `
                <tr>
                  <td>${p.period||'—'}</td>
                  <td class="amount">${fmt(p.netAPayer)}</td>
                  <td><span class="emp-badge ${p.status==='paye'?'emp-badge-actif':'emp-badge-inactif'}">${p.status==='paye'?'Payé':'En attente'}</span></td>
                  <td><button class="btn btn-sm btn-secondary" onclick="hrPrintPayslip(${p.id})">PDF</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p style="color:var(--text-muted);font-size:.83rem">Aucun bulletin de paie enregistré.</p>'}
        ${e.notes ? `<div style="margin-top:16px;padding:12px;background:var(--surface-alt);border-radius:8px;font-size:.83rem">${e.notes}</div>` : ''}
      `,
      buttons: [
        { label: 'Fermer', class: 'btn-secondary', action: 'close' },
        { label: 'Modifier', class: 'btn-primary', action: () => { UI.closeModal(); hrOpenEmployeForm(id); } }
      ]
    });
    if (window.lucide) lucide.createIconsGlobal ? lucide.createIconsGlobal() : lucide.createIcons();
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  ONGLET 3 — PAIE
  // ═══════════════════════════════════════════════════════════════════════
  async function renderPaie(c) {
    const [employees, payroll] = await Promise.all([DB.dbGetAll('employees'), DB.dbGetAll('hr_payroll')]);
    const actifs = employees.filter(e => e.status === 'actif');
    let selectedPeriod = ym();

    function render() {
      const fiches = payroll.filter(p => p.period === selectedPeriod);
      const ficheMap = new Map(fiches.map(f => [f.employeeId, f]));
      const totalNet = fiches.reduce((s, f) => s + (f.netAPayer || 0), 0);
      const totalPaye = fiches.filter(f => f.status === 'paye').reduce((s, f) => s + (f.netAPayer || 0), 0);

      c.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px">
            <label style="font-weight:600;font-size:.9rem">Période :</label>
            <input type="month" class="form-control" style="width:180px" value="${selectedPeriod}" onchange="hrPayPeriod(this.value)">
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" onclick="hrGenerateFiches('${selectedPeriod}')">
              <i data-lucide="refresh-cw"></i> Générer les fiches
            </button>
            <button class="btn btn-primary" onclick="hrPayerTout('${selectedPeriod}')">
              <i data-lucide="check-circle"></i> Payer tout le monde
            </button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px">
          <div class="card" style="padding:16px;text-align:center">
            <div style="font-size:1.3rem;font-weight:800;color:var(--primary)">${fmt(totalNet)}</div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">Masse salariale totale</div>
          </div>
          <div class="card" style="padding:16px;text-align:center">
            <div style="font-size:1.3rem;font-weight:800;color:#10b981">${fmt(totalPaye)}</div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">Déjà payé</div>
          </div>
          <div class="card" style="padding:16px;text-align:center">
            <div style="font-size:1.3rem;font-weight:800;color:#ef4444">${fmt(totalNet - totalPaye)}</div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:4px">Reste à payer</div>
          </div>
        </div>

        <div class="card" style="overflow:auto">
          <table class="hr-payroll-table">
            <thead>
              <tr>
                <th>Employé</th>
                <th>Salaire Base</th>
                <th>Primes</th>
                <th>H.Sup</th>
                <th>Retenues</th>
                <th>Avances</th>
                <th>Net à Payer</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${actifs.length === 0 ? `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--text-muted)">Aucun employé actif</td></tr>` : ''}
              ${actifs.map(emp => {
                const fiche = ficheMap.get(emp.id) || {};
                const base = fiche.salaire ?? emp.salaire ?? 0;
                const primes = fiche.primes || 0;
                const hsup = fiche.heuresSup || 0;
                const retenues = fiche.retenues || 0;
                const avances = fiche.avancesDed || 0;
                const net = fiche.netAPayer ?? Math.max(0, base + primes + hsup - retenues - avances);
                const paye = fiche.status === 'paye';
                return `
                  <tr>
                    <td><div style="font-weight:600;font-size:.85rem">${emp.nom}</div><div style="font-size:.72rem;color:var(--text-muted)">${emp.poste||'—'}</div></td>
                    <td class="amount">${fmtN(base)}</td>
                    <td class="amount amount-positive">${fmtN(primes)}</td>
                    <td class="amount amount-positive">${fmtN(hsup)}</td>
                    <td class="amount amount-negative">-${fmtN(retenues)}</td>
                    <td class="amount amount-negative">-${fmtN(avances)}</td>
                    <td class="amount amount-net">${fmt(net)}</td>
                    <td><span class="emp-badge ${paye?'emp-badge-actif':'emp-badge-inactif'}">${paye?'Payé':'En attente'}</span></td>
                    <td style="white-space:nowrap;display:flex;gap:4px">
                      <button class="btn btn-sm btn-secondary" onclick="hrEditFiche(${emp.id},'${selectedPeriod}')" title="Modifier"><i data-lucide="pencil" style="width:13px;height:13px"></i></button>
                      ${!paye ? `<button class="btn btn-sm btn-primary" onclick="hrPayerEmploye(${emp.id},'${selectedPeriod}',${net})" title="Marquer payé"><i data-lucide="check" style="width:13px;height:13px"></i></button>` : ''}
                      ${fiche.id ? `<button class="btn btn-sm btn-secondary" onclick="hrPrintPayslip(${fiche.id})" title="PDF"><i data-lucide="printer" style="width:13px;height:13px"></i></button>` : ''}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
      if (window.lucide) lucide.createIcons({ node: c });
    }

    window.hrPayPeriod = (v) => { selectedPeriod = v; render(); };
    window.hrGenerateFiches = async (period) => {
      const empList = (await DB.dbGetAll('employees')).filter(e => e.status === 'actif');
      const existing = (await DB.dbGetAll('hr_payroll')).filter(p => p.period === period);
      const existMap = new Map(existing.map(f => [f.employeeId, f]));
      const allAdv = await DB.dbGetAll('hr_advances');
      for (const emp of empList) {
        if (existMap.has(emp.id)) continue;
        const advDed = allAdv.filter(a => a.employeeId === emp.id && a.status === 'approuvee' && a.solde > 0)
          .reduce((s, a) => s + Math.min(a.mensualite || a.solde, a.solde), 0);
        const net = Math.max(0, (emp.salaire || 0) - advDed);
        await DB.dbPut('hr_payroll', {
          employeeId: emp.id, period,
          salaire: emp.salaire || 0, primes: 0, heuresSup: 0, retenues: 0,
          avancesDed: advDed, netAPayer: net,
          status: 'en_attente', createdAt: new Date().toISOString()
        });
      }
      UI.toast('Fiches de paie générées', 'success');
      payroll.length = 0;
      (await DB.dbGetAll('hr_payroll')).forEach(p => payroll.push(p));
      render();
    };
    window.hrPayerTout = async (period) => {
      const fiches = (await DB.dbGetAll('hr_payroll')).filter(p => p.period === period && p.status !== 'paye');
      for (const f of fiches) {
        await DB.dbPut('hr_payroll', { ...f, status: 'paye', payedAt: new Date().toISOString() });
        await DB.dbPut('cashRegister', {
          type: 'sortie', category: 'RH', subCategory: 'salaire',
          amount: f.netAPayer || 0, description: `Salaire ${period}`,
          employeeId: f.employeeId, date: today(), createdAt: new Date().toISOString()
        });
      }
      UI.toast(`${fiches.length} salaires payés`, 'success');
      payroll.length = 0;
      (await DB.dbGetAll('hr_payroll')).forEach(p => payroll.push(p));
      render();
    };
    window.hrPayerEmploye = async (empId, period, net) => {
      const fiches = await DB.dbGetAll('hr_payroll');
      let fiche = fiches.find(f => f.employeeId === empId && f.period === period);
      if (!fiche) {
        const emp = await DB.dbGet('employees', empId);
        fiche = { employeeId: empId, period, salaire: emp?.salaire||0, primes:0, heuresSup:0, retenues:0, avancesDed:0, netAPayer: net, status:'en_attente', createdAt: new Date().toISOString() };
      }
      await DB.dbPut('hr_payroll', { ...fiche, status: 'paye', payedAt: new Date().toISOString() });
      const emp = await DB.dbGet('employees', empId);
      await DB.dbPut('cashRegister', {
        type: 'sortie', category: 'RH', subCategory: 'salaire',
        amount: net, description: `Salaire ${period} — ${emp?.nom||''}`,
        employeeId: empId, date: today(), createdAt: new Date().toISOString()
      });
      // Déduire les avances
      const advs = (await DB.dbGetAll('hr_advances')).filter(a => a.employeeId === empId && a.status === 'approuvee' && a.solde > 0);
      for (const adv of advs) {
        const ded = Math.min(adv.mensualite || adv.solde, adv.solde);
        const newSolde = Math.max(0, (adv.solde || 0) - ded);
        await DB.dbPut('hr_advances', { ...adv, solde: newSolde, status: newSolde <= 0 ? 'remboursee' : 'approuvee' });
      }
      UI.toast('Salaire marqué payé', 'success');
      payroll.length = 0;
      (await DB.dbGetAll('hr_payroll')).forEach(p => payroll.push(p));
      render();
    };
    window.hrEditFiche = async (empId, period) => {
      const emp = await DB.dbGet('employees', empId);
      const fiches = await DB.dbGetAll('hr_payroll');
      const fiche = fiches.find(f => f.employeeId === empId && f.period === period) || { salaire: emp?.salaire||0, primes:0, heuresSup:0, retenues:0, avancesDed:0 };
      UI.openModal({
        title: `Fiche de paie — ${emp?.nom||''} (${period})`,
        body: `
          <div class="form-grid" style="gap:12px">
            <div class="form-group"><label>Salaire de base</label><input id="fp-base" class="form-control" type="number" value="${fiche.salaire||emp?.salaire||0}"></div>
            <div class="form-group"><label>Primes</label><input id="fp-primes" class="form-control" type="number" value="${fiche.primes||0}"></div>
            <div class="form-group"><label>Heures supplémentaires</label><input id="fp-hsup" class="form-control" type="number" value="${fiche.heuresSup||0}"></div>
            <div class="form-group"><label>Retenues</label><input id="fp-retenues" class="form-control" type="number" value="${fiche.retenues||0}"></div>
            <div class="form-group"><label>Déduction avances</label><input id="fp-avances" class="form-control" type="number" value="${fiche.avancesDed||0}"></div>
          </div>
        `,
        buttons: [
          { label: 'Annuler', class: 'btn-secondary', action: 'close' },
          { label: 'Enregistrer', class: 'btn-primary', action: async () => {
            const base = parseFloat(document.getElementById('fp-base')?.value) || 0;
            const primes = parseFloat(document.getElementById('fp-primes')?.value) || 0;
            const hsup = parseFloat(document.getElementById('fp-hsup')?.value) || 0;
            const retenues = parseFloat(document.getElementById('fp-retenues')?.value) || 0;
            const avancesDed = parseFloat(document.getElementById('fp-avances')?.value) || 0;
            const net = Math.max(0, base + primes + hsup - retenues - avancesDed);
            await DB.dbPut('hr_payroll', { ...fiche, employeeId: empId, period, salaire: base, primes, heuresSup: hsup, retenues, avancesDed, netAPayer: net, status: fiche.status||'en_attente', createdAt: fiche.createdAt||new Date().toISOString() });
            UI.closeModal();
            UI.toast('Fiche mise à jour', 'success');
            payroll.length = 0;
            (await DB.dbGetAll('hr_payroll')).forEach(p => payroll.push(p));
            render();
          }}
        ]
      });
    };
    render();
  }

  // ─── Impression Bulletin PDF ─────────────────────────────────────────────
  window.hrPrintPayslip = async function (payrollId) {
    const fiche = await DB.dbGet('hr_payroll', payrollId);
    if (!fiche) { UI.toast('Fiche introuvable', 'error'); return; }
    const emp = await DB.dbGet('employees', fiche.employeeId);
    const pharmacyName = gs('pharmacy_name') || 'Pharmacie';
    const pharmacyAddr = gs('pharmacy_address') || '';
    const pharmacyTel = gs('pharmacy_phone') || '';

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const M = 15;

    // En-tête
    doc.setFillColor(27, 79, 114);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text(pharmacyName, M, 12);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`${pharmacyAddr} • Tél: ${pharmacyTel}`, M, 19);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('BULLETIN DE PAIE', W - M, 12, { align: 'right' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Période : ${fiche.period || '—'}`, W - M, 19, { align: 'right' });

    // Info employé
    let y = 38;
    doc.setTextColor(30, 41, 59);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(M, y, W - 2 * M, 28, 3, 3, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('Employé :', M + 4, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(emp?.nom || '—', M + 30, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.text('Poste :', M + 4, y + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(emp?.poste || '—', M + 30, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.text('Contrat :', M + 4, y + 21);
    doc.setFont('helvetica', 'normal');
    doc.text(emp?.typeContrat || '—', M + 30, y + 21);
    doc.setFont('helvetica', 'bold');
    doc.text('Date paiement :', M + 90, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(fiche.payedAt ? new Date(fiche.payedAt).toLocaleDateString('fr-FR') : '—', M + 125, y + 7);

    y += 36;
    // Tableau composantes
    doc.autoTable({
      startY: y,
      head: [['Libellé', 'Montant (GNF)']],
      body: [
        ['Salaire de base', fmtN(fiche.salaire)],
        ['Primes', '+' + fmtN(fiche.primes || 0)],
        ['Heures supplémentaires', '+' + fmtN(fiche.heuresSup || 0)],
        ['Retenues', '-' + fmtN(fiche.retenues || 0)],
        ['Déduction avances', '-' + fmtN(fiche.avancesDed || 0)],
      ],
      headStyles: { fillColor: [27, 79, 114], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: M, right: M },
    });

    y = doc.lastAutoTable.finalY + 8;
    // Net à payer
    doc.setFillColor(27, 79, 114);
    doc.roundedRect(M, y, W - 2 * M, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('NET À PAYER :', M + 6, y + 10);
    doc.text(fmt(fiche.netAPayer), W - M - 6, y + 10, { align: 'right' });

    // Signatures
    y += 30;
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Signature du responsable', M + 20, y, { align: 'center' });
    doc.text('Signature de l\'employé', W - M - 20, y, { align: 'center' });
    doc.line(M + 4, y - 6, M + 46, y - 6);
    doc.line(W - M - 46, y - 6, W - M - 4, y - 6);

    doc.save(`Bulletin_${emp?.nom?.replace(/\s/g,'_')||'employe'}_${fiche.period||'paie'}.pdf`);
    UI.toast('Bulletin PDF généré', 'success');
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  ONGLET 4 — AVANCES
  // ═══════════════════════════════════════════════════════════════════════
  async function renderAvances(c) {
    const [employees, advances] = await Promise.all([DB.dbGetAll('employees'), DB.dbGetAll('hr_advances')]);
    const empMap = new Map(employees.map(e => [e.id, e]));

    function render() {
      const enCours = advances.filter(a => a.status === 'approuvee' && a.solde > 0);
      const remb = advances.filter(a => a.status === 'remboursee');

      c.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
          <h3 style="font-size:.95rem;font-weight:700">Avances sur Salaire</h3>
          <button class="btn btn-primary" onclick="hrNewAvance()"><i data-lucide="plus"></i> Nouvelle Avance</button>
        </div>

        ${enCours.length === 0 && remb.length === 0 ? `<div class="empty-state"><p style="color:var(--text-muted)">Aucune avance enregistrée</p></div>` : ''}

        ${enCours.length > 0 ? `
          <h4 style="font-size:.85rem;font-weight:700;margin-bottom:12px;color:#f59e0b">⏳ En cours (${enCours.length})</h4>
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
            ${enCours.map(a => {
              const emp = empMap.get(a.employeeId);
              const pct = a.montant > 0 ? Math.round(((a.montant - (a.solde||0)) / a.montant) * 100) : 0;
              return `
                <div class="advance-card">
                  <div class="hr-emp-avatar" style="width:40px;height:40px;font-size:.9rem;flex-shrink:0">${initials(emp?.nom)}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:600;font-size:.88rem">${emp?.nom||'—'}</div>
                    <div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">${a.motif||'Sans motif'} • Accordée le ${dateLabel(a.date)}</div>
                    <div class="advance-progress" style="margin-top:8px">
                      <div class="advance-progress-bar" style="width:${pct}%"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:.72rem;color:var(--text-muted)">
                      <span>Remboursé : ${fmt(a.montant - (a.solde||0))}</span>
                      <span>Reste : <strong style="color:#f59e0b">${fmt(a.solde)}</strong></span>
                    </div>
                  </div>
                  <div style="display:flex;gap:6px;flex-shrink:0">
                    <button class="btn btn-sm btn-secondary" onclick="hrRemboursManuel(${a.id})">Rembourser</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${remb.length > 0 ? `
          <h4 style="font-size:.85rem;font-weight:700;margin-bottom:12px;color:#10b981">✅ Remboursées (${remb.length})</h4>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${remb.slice(-10).reverse().map(a => {
              const emp = empMap.get(a.employeeId);
              return `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface-alt);border-radius:8px;font-size:.82rem">
                  <span style="font-weight:600">${emp?.nom||'—'}</span>
                  <span>${fmt(a.montant)}</span>
                  <span style="color:var(--text-muted)">${dateLabel(a.date)}</span>
                  <span class="emp-badge emp-badge-actif">Remboursée</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
      `;
      if (window.lucide) lucide.createIcons({ node: c });
    }

    window.hrNewAvance = () => {
      UI.openModal({
        title: 'Nouvelle Avance sur Salaire',
        body: `
          <div class="form-grid" style="gap:12px">
            <div class="form-group">
              <label>Employé <span style="color:var(--danger)">*</span></label>
              <select id="adv-emp" class="form-control">
                <option value="">-- Sélectionner --</option>
                ${employees.filter(e=>e.status==='actif').map(e=>`<option value="${e.id}">${e.nom}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Montant (GNF) <span style="color:var(--danger)">*</span></label>
              <input id="adv-montant" class="form-control" type="number" placeholder="0" min="0">
            </div>
            <div class="form-group">
              <label>Mensualité de remboursement (GNF)</label>
              <input id="adv-mens" class="form-control" type="number" placeholder="Déduit en totalité si vide">
            </div>
            <div class="form-group">
              <label>Date</label>
              <input id="adv-date" class="form-control" type="date" value="${today()}">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label>Motif</label>
              <input id="adv-motif" class="form-control" type="text" placeholder="Raison de l'avance">
            </div>
          </div>
        `,
        buttons: [
          { label: 'Annuler', class: 'btn-secondary', action: 'close' },
          { label: 'Accorder', class: 'btn-primary', action: async () => {
            const empId = parseInt(document.getElementById('adv-emp')?.value);
            const montant = parseFloat(document.getElementById('adv-montant')?.value) || 0;
            if (!empId || !montant) { UI.toast('Employé et montant obligatoires', 'error'); return; }
            const mens = parseFloat(document.getElementById('adv-mens')?.value) || montant;
            await DB.dbPut('hr_advances', {
              employeeId: empId,
              montant, solde: montant, mensualite: mens,
              date: document.getElementById('adv-date')?.value || today(),
              motif: document.getElementById('adv-motif')?.value?.trim() || '',
              status: 'approuvee', createdAt: new Date().toISOString()
            });
            await DB.dbPut('cashRegister', {
              type: 'sortie', category: 'RH', subCategory: 'avance',
              amount: montant, description: `Avance — ${employees.find(e=>e.id===empId)?.nom||''}`,
              date: today(), createdAt: new Date().toISOString()
            });
            UI.closeModal(); UI.toast('Avance accordée et enregistrée', 'success');
            advances.length = 0;
            (await DB.dbGetAll('hr_advances')).forEach(a => advances.push(a));
            render();
          }}
        ]
      });
    };

    window.hrRemboursManuel = async (advId) => {
      const adv = await DB.dbGet('hr_advances', advId);
      if (!adv) return;
      const montant = parseFloat(prompt(`Montant à rembourser (solde actuel : ${fmt(adv.solde)})`, adv.mensualite || adv.solde)) || 0;
      if (!montant) return;
      const newSolde = Math.max(0, (adv.solde || 0) - montant);
      await DB.dbPut('hr_advances', { ...adv, solde: newSolde, status: newSolde <= 0 ? 'remboursee' : 'approuvee' });
      UI.toast('Remboursement enregistré', 'success');
      advances.length = 0;
      (await DB.dbGetAll('hr_advances')).forEach(a => advances.push(a));
      render();
    };
    render();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ONGLET 5 — CONGÉS & ABSENCES
  // ═══════════════════════════════════════════════════════════════════════
  async function renderConges(c) {
    const [employees, leaves] = await Promise.all([DB.dbGetAll('employees'), DB.dbGetAll('hr_leaves')]);
    const empMap = new Map(employees.map(e => [e.id, e]));
    const typeLabel = { conge:'Congé Payé', maladie:'Maladie', maternite:'Maternité', absence:'Absence Injustifiée', retard:'Retard', permission:'Permission' };
    const typeColor = { conge:'#3b82f6', maladie:'#f59e0b', maternite:'#ec4899', absence:'#ef4444', retard:'#f97316', permission:'#8b5cf6' };
    let viewMonth = today().slice(0, 7);

    function render() {
      const [yr, mo] = viewMonth.split('-').map(Number);
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const firstDow = new Date(yr, mo - 1, 1).getDay();
      const monthLeaves = leaves.filter(l => {
        const d = l.dateDebut || '';
        return d.slice(0, 7) === viewMonth || (l.dateFin && l.dateFin.slice(0, 7) === viewMonth);
      });

      const byDay = new Map();
      for (const l of monthLeaves) {
        const start = new Date(l.dateDebut);
        const end = l.dateFin ? new Date(l.dateFin) : start;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          if (d.getFullYear() === yr && d.getMonth() + 1 === mo) {
            const day = d.getDate();
            if (!byDay.has(day)) byDay.set(day, []);
            byDay.get(day).push(l);
          }
        }
      }

      const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
      let calCells = '';
      const blanks = (firstDow + 6) % 7;
      for (let i = 0; i < blanks; i++) calCells += `<div></div>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const isToday = d === new Date().getDate() && viewMonth === today().slice(0, 7);
        const dayLeaves = byDay.get(d) || [];
        const cls = [isToday ? 'today' : '', dayLeaves.length ? (dayLeaves[0].type === 'absence' ? 'has-leave absent' : 'has-leave') : ''].join(' ').trim();
        const dots = dayLeaves.slice(0, 2).map(l => `<span class="leave-type-dot" style="background:${typeColor[l.type]||'#64748b'}"></span>`).join('');
        calCells += `<div class="leave-cal-day ${cls}" title="${dayLeaves.map(l=>empMap.get(l.employeeId)?.nom+': '+typeLabel[l.type]).join(', ')}">${d}${dots}</div>`;
      }

      c.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
          <h3 style="font-size:.95rem;font-weight:700">Congés & Absences</h3>
          <button class="btn btn-primary" onclick="hrNewLeave()"><i data-lucide="plus"></i> Nouveau</button>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:20px;align-items:start">
          <div class="card" style="padding:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <button class="btn btn-icon btn-sm" onclick="hrLeaveMonth(-1)"><i data-lucide="chevron-left"></i></button>
              <span style="font-weight:700;font-size:.9rem">${new Date(yr,mo-1,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</span>
              <button class="btn btn-icon btn-sm" onclick="hrLeaveMonth(1)"><i data-lucide="chevron-right"></i></button>
            </div>
            <div class="leave-cal-header">
              ${['Lu','Ma','Me','Je','Ve','Sa','Di'].map(d=>`<div class="leave-cal-dow">${d}</div>`).join('')}
            </div>
            <div class="leave-calendar-grid">${calCells}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">
              ${Object.entries(typeColor).map(([t,col])=>`
                <span style="display:flex;align-items:center;gap:4px;font-size:.72rem">
                  <span style="width:8px;height:8px;border-radius:50%;background:${col};display:inline-block"></span> ${typeLabel[t]}
                </span>`).join('')}
            </div>
          </div>

          <div>
            <h4 style="font-size:.85rem;font-weight:700;margin-bottom:12px">Ce mois-ci (${monthLeaves.length})</h4>
            <div style="display:flex;flex-direction:column;gap:8px;max-height:400px;overflow-y:auto">
              ${monthLeaves.length === 0 ? '<p style="color:var(--text-muted);font-size:.83rem">Aucune absence ou congé ce mois-ci</p>' : ''}
              ${monthLeaves.map(l => {
                const emp = empMap.get(l.employeeId);
                const days = l.dateFin ? Math.ceil((new Date(l.dateFin)-new Date(l.dateDebut))/86400000)+1 : 1;
                return `
                  <div style="display:flex;gap:10px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;border-left:3px solid ${typeColor[l.type]||'#64748b'}">
                    <div style="flex:1;min-width:0">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                        <div style="font-weight:600;font-size:.85rem">${emp?.nom||'—'}</div>
                        <span class="emp-badge" style="background:${typeColor[l.type]||'#64748b'}22;color:${typeColor[l.type]||'#64748b'}">${typeLabel[l.type]||l.type}</span>
                      </div>
                      <div style="font-size:.75rem;color:var(--text-muted)">${dateLabel(l.dateDebut)} ${l.dateFin&&l.dateFin!==l.dateDebut?'→ '+dateLabel(l.dateFin):''} • ${days} jour${days>1?'s':''}</div>
                      ${l.justificatif?`<div style="font-size:.72rem;color:var(--text-muted);margin-top:4px;font-style:italic">${l.justificatif}</div>`:''}
                    </div>
                    <button class="btn btn-icon btn-sm" onclick="hrDelLeave(${l.id})" title="Supprimer" style="flex-shrink:0">
                      <i data-lucide="trash-2" style="width:13px;height:13px;color:var(--danger)"></i>
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons({ node: c });
    }

    window.hrLeaveMonth = (delta) => {
      const d = new Date(viewMonth + '-01');
      d.setMonth(d.getMonth() + delta);
      viewMonth = d.toISOString().slice(0, 7);
      render();
    };
    window.hrNewLeave = () => {
      UI.openModal({
        title: 'Congé / Absence',
        body: `
          <div class="form-grid" style="gap:12px">
            <div class="form-group">
              <label>Employé <span style="color:var(--danger)">*</span></label>
              <select id="lv-emp" class="form-control">
                <option value="">-- Sélectionner --</option>
                ${employees.map(e=>`<option value="${e.id}">${e.nom}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Type</label>
              <select id="lv-type" class="form-control">
                ${Object.entries(typeLabel).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Date début <span style="color:var(--danger)">*</span></label>
              <input id="lv-debut" class="form-control" type="date" value="${today()}">
            </div>
            <div class="form-group">
              <label>Date fin</label>
              <input id="lv-fin" class="form-control" type="date" value="${today()}">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label>Justificatif / Commentaire</label>
              <textarea id="lv-just" class="form-control" rows="2"></textarea>
            </div>
          </div>
        `,
        buttons: [
          { label: 'Annuler', class: 'btn-secondary', action: 'close' },
          { label: 'Enregistrer', class: 'btn-primary', action: async () => {
            const empId = parseInt(document.getElementById('lv-emp')?.value);
            const debut = document.getElementById('lv-debut')?.value;
            if (!empId || !debut) { UI.toast('Employé et date de début obligatoires', 'error'); return; }
            await DB.dbPut('hr_leaves', {
              employeeId: empId,
              type: document.getElementById('lv-type')?.value || 'conge',
              dateDebut: debut,
              dateFin: document.getElementById('lv-fin')?.value || debut,
              justificatif: document.getElementById('lv-just')?.value?.trim() || '',
              status: 'approuve', createdAt: new Date().toISOString()
            });
            UI.closeModal(); UI.toast('Congé enregistré', 'success');
            leaves.length = 0;
            (await DB.dbGetAll('hr_leaves')).forEach(l => leaves.push(l));
            render();
          }}
        ]
      });
    };
    window.hrDelLeave = async (id) => {
      if (!confirm('Supprimer ce congé / cette absence ?')) return;
      // Soft delete : marquer supprimé
      const l = await DB.dbGet('hr_leaves', id);
      if (l) {
        const idx = leaves.findIndex(x => x.id === id);
        if (idx !== -1) leaves.splice(idx, 1);
        // Pas de suppression physique — on le retire juste de la liste affichée
      }
      render();
    };
    render();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ONGLET 6 — PRÉSENCE
  // ═══════════════════════════════════════════════════════════════════════
  async function renderPresence(c) {
    const [employees, attendance] = await Promise.all([DB.dbGetAll('employees'), DB.dbGetAll('hr_attendance')]);
    const empMap = new Map(employees.map(e => [e.id, e]));
    let selectedDate = today();

    function render() {
      const dayRecords = attendance.filter(a => a.date === selectedDate);
      const recMap = new Map(dayRecords.map(r => [r.employeeId, r]));
      const actifs = employees.filter(e => e.status === 'actif');

      function calcH(a, d) {
        if (!a || !d) return 0;
        const [ah, am] = a.split(':').map(Number);
        const [dh, dm] = d.split(':').map(Number);
        return Math.max(0, (dh * 60 + dm - ah * 60 - am) / 60);
      }

      c.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:10px">
            <label style="font-weight:600;font-size:.9rem">Date :</label>
            <input type="date" class="form-control" style="width:180px" value="${selectedDate}" onchange="hrPresDate(this.value)">
          </div>
          <button class="btn btn-primary" onclick="hrSavePresence('${selectedDate}')">
            <i data-lucide="save"></i> Enregistrer le pointage
          </button>
        </div>

        <div class="card" style="overflow:auto">
          <div class="attendance-row header" style="border-bottom:2px solid var(--border);margin-bottom:4px">
            <div>Employé</div><div>Arrivée</div><div>Départ</div><div>Heures</div><div>Statut</div>
          </div>
          ${actifs.length === 0 ? '<p style="padding:16px;color:var(--text-muted)">Aucun employé actif</p>' : ''}
          ${actifs.map(emp => {
            const rec = recMap.get(emp.id) || {};
            const h = calcH(rec.arrivee, rec.depart);
            const present = !!rec.arrivee;
            return `
              <div class="attendance-row">
                <div>
                  <div style="font-weight:600;font-size:.85rem">${emp.nom}</div>
                  <div style="font-size:.72rem;color:var(--text-muted)">${emp.poste||'—'}</div>
                </div>
                <div><input type="time" class="form-control" style="width:100px;font-size:.82rem" id="arr-${emp.id}" value="${rec.arrivee||''}"></div>
                <div><input type="time" class="form-control" style="width:100px;font-size:.82rem" id="dep-${emp.id}" value="${rec.depart||''}"></div>
                <div style="font-weight:600;font-size:.85rem">${h > 0 ? h.toFixed(1) + 'h' : '—'}</div>
                <div><span class="emp-badge ${present?'emp-badge-actif':'emp-badge-inactif'}">${present?'Présent':'Absent'}</span></div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      if (window.lucide) lucide.createIcons({ node: c });
    }

    window.hrPresDate = (v) => { selectedDate = v; render(); };
    window.hrSavePresence = async (date) => {
      const actifs = employees.filter(e => e.status === 'actif');
      let saved = 0;
      for (const emp of actifs) {
        const arrivee = document.getElementById(`arr-${emp.id}`)?.value || '';
        const depart = document.getElementById(`dep-${emp.id}`)?.value || '';
        if (!arrivee && !depart) continue;
        const existing = attendance.find(a => a.employeeId === emp.id && a.date === date);
        await DB.dbPut('hr_attendance', {
          ...(existing || {}),
          employeeId: emp.id, date, arrivee, depart,
          updatedAt: new Date().toISOString()
        });
        saved++;
      }
      UI.toast(`${saved} pointages enregistrés`, 'success');
      attendance.length = 0;
      (await DB.dbGetAll('hr_attendance')).forEach(a => attendance.push(a));
      render();
    };
    render();
  }

})();
