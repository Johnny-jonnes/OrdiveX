/**
 * OrdiveX — Gestion des Équipes (Shifts Matin / Soir)
 * Permet de définir des sessions de caisse par équipe,
 * d'assigner des employés à une tranche horaire et de
 * générer un rapport de performance par équipe.
 * v9.5.0
 */

// ─── Constantes ────────────────────────────────────────────────────
const SHIFT_TYPES = {
  matin:  { label: 'Équipe Matin',  icon: 'sunrise',  color: '#f59e0b', hours: '07h00 – 14h00' },
  soir:   { label: 'Équipe Soir',   icon: 'sunset',   color: '#6366f1', hours: '14h00 – 22h00' },
  nuit:   { label: 'Équipe Nuit',   icon: 'moon',     color: '#0ea5e9', hours: '22h00 – 07h00' },
};

// ─── Rendu principal ───────────────────────────────────────────────
async function renderShifts(container) {
  const user = DB.AppState.currentUser;
  const isAdmin = user && ['admin', 'pharmacien'].includes(user.role);

  // Charger les données
  const [allUsers, allSales, allShifts, settings] = await Promise.all([
    DB.dbGetAll('users'),
    DB.dbGetAll('sales'),
    DB.dbGetAll('shifts').catch(() => []),
    DB.dbGetAll('settings'),
  ]);

  const gs = k => settings.find(s => s.key === k)?.value;
  const openShift = allShifts.find(s => s.status === 'open');
  const today = new Date().toISOString().split('T')[0];

  // Filtrer les shifts du jour
  const todayShifts = allShifts.filter(s => (s.date || '').startsWith(today));

  // Calculer les KPIs par shift
  function calcShiftKPIs(shift) {
    if (!shift) return { sales: 0, total: 0, items: 0 };
    const shiftSales = allSales.filter(s => {
      const d = new Date(s.createdAt || s.date || 0).getTime();
      return d >= (shift.openedAt || 0) && d <= (shift.closedAt || Date.now());
    });
    return {
      sales: shiftSales.length,
      total: shiftSales.reduce((a, s) => a + (s.total || 0), 0),
      items: shiftSales.reduce((a, s) => a + (s.items?.length || 0), 0),
    };
  }

  // Employés actifs
  const activeUsers = allUsers.filter(u => u.active !== false);

  container.innerHTML = `
    <div class="page-header" style="margin-bottom:24px">
      <div>
        <h1 style="font-size:22px;font-weight:800;color:var(--text)">
          <i data-lucide="clock-3" style="width:24px;height:24px;vertical-align:-5px;margin-right:8px;color:var(--primary)"></i>
          Gestion des Équipes
        </h1>
        <p style="color:var(--text-muted);font-size:14px;margin-top:4px">
          Ouvrez une session d'équipe, assignez vos employés et suivez les performances par tranche horaire.
        </p>
      </div>
      ${isAdmin ? `
      <button class="btn btn-primary" onclick="openShiftDialog()" ${openShift ? 'disabled title="Une équipe est déjà ouverte"' : ''}>
        <i data-lucide="play-circle"></i> Ouvrir une équipe
      </button>` : ''}
    </div>

    <!-- Shift actif -->
    ${openShift ? `
    <div style="background:linear-gradient(135deg,#0f4c81,#1a7bc4);border-radius:16px;padding:20px 24px;margin-bottom:24px;color:#fff;display:flex;align-items:center;gap:20px">
      <div style="width:52px;height:52px;background:rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <i data-lucide="${SHIFT_TYPES[openShift.type]?.icon || 'clock'}" style="width:28px;height:28px"></i>
      </div>
      <div style="flex:1">
        <div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Équipe en cours</div>
        <div style="font-size:18px;font-weight:800">${SHIFT_TYPES[openShift.type]?.label || openShift.type}</div>
        <div style="font-size:13px;opacity:0.8;margin-top:2px">
          Responsable : ${openShift.managerName || '—'} &nbsp;·&nbsp;
          Ouverte à ${new Date(openShift.openedAt).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'})}
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <div style="text-align:center">
          <div id="shift-live-sales" style="font-size:22px;font-weight:900">${calcShiftKPIs(openShift).sales}</div>
          <div style="font-size:11px;opacity:0.7">Ventes</div>
        </div>
        <div style="text-align:center">
          <div id="shift-live-total" style="font-size:22px;font-weight:900">${UI.formatCurrency ? UI.formatCurrency(calcShiftKPIs(openShift).total) : calcShiftKPIs(openShift).total.toLocaleString('fr-FR') + ' GNF'}</div>
          <div style="font-size:11px;opacity:0.7">CA</div>
        </div>
        ${isAdmin ? `
        <button class="btn" onclick="closeCurrentShift('${openShift.id}')" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);padding:10px 18px;font-weight:700">
          <i data-lucide="square"></i> Clôturer
        </button>` : ''}
      </div>
    </div>` : `
    <div style="background:var(--surface);border:1px dashed var(--border);border-radius:16px;padding:32px;margin-bottom:24px;text-align:center;color:var(--text-muted)">
      <i data-lucide="clock" style="width:40px;height:40px;margin-bottom:12px;opacity:0.3;display:block;margin-left:auto;margin-right:auto"></i>
      <p style="font-size:15px;font-weight:600">Aucune équipe ouverte pour le moment</p>
      <p style="font-size:13px;margin-top:4px">Cliquez sur <strong>Ouvrir une équipe</strong> pour démarrer une session.</p>
    </div>`}

    <!-- Historique du jour -->
    <div class="section-card" style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <i data-lucide="calendar-days" style="width:18px;height:18px;color:var(--primary)"></i>
        <h2 style="font-size:16px;font-weight:700">Sessions du ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'long'})}</h2>
      </div>
      ${todayShifts.length === 0 ? `
      <p style="color:var(--text-muted);font-size:13px;padding:16px 0;text-align:center">Aucune session enregistrée aujourd'hui.</p>
      ` : todayShifts.map(shift => {
        const kpi = calcShiftKPIs(shift);
        const t = SHIFT_TYPES[shift.type] || { label: shift.type, color: '#888', icon: 'clock' };
        const duration = shift.closedAt
          ? Math.round((shift.closedAt - shift.openedAt) / 60000) + ' min'
          : 'En cours';
        return `
        <div style="display:flex;align-items:center;gap:16px;padding:14px 0;border-bottom:1px solid var(--border-light,#f1f5f9)">
          <div style="width:40px;height:40px;background:${t.color}22;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i data-lucide="${t.icon}" style="width:20px;height:20px;color:${t.color}"></i>
          </div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:14px">${t.label}</div>
            <div style="font-size:12px;color:var(--text-muted)">${shift.managerName || '—'} &nbsp;·&nbsp; ${duration}</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;font-size:15px;color:var(--primary)">${(kpi.total).toLocaleString('fr-FR')} GNF</div>
            <div style="font-size:12px;color:var(--text-muted)">${kpi.sales} vente(s)</div>
          </div>
          <span class="badge ${shift.status === 'open' ? 'badge-success' : 'badge-neutral'}" style="flex-shrink:0">
            ${shift.status === 'open' ? 'En cours' : 'Clôturée'}
          </span>
        </div>`;
      }).join('')}
    </div>

    <!-- Planning équipes -->
    <div class="section-card" style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <i data-lucide="users" style="width:18px;height:18px;color:var(--primary)"></i>
        <h2 style="font-size:16px;font-weight:700">Équipe disponible</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
        ${activeUsers.map(u => `
        <div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--gradient-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0">
            ${(u.name || u.username || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600;font-size:13px">${u.name || u.username}</div>
            <div style="font-size:11px;color:var(--text-muted)">${{admin:'Admin',pharmacien:'Pharmacien',caissier:'Caissier'}[u.role] || u.role}</div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

// ─── Dialog ouverture d'une session ───────────────────────────────
function openShiftDialog() {
  DB.dbGetAll('users').then(allUsers => {
    const managers = allUsers.filter(u => u.active !== false && ['admin', 'pharmacien', 'caissier'].includes(u.role));
    UI.modal('Ouvrir une session d\'équipe', `
      <div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
        <div class="input-group-elite">
          <label>Type d'équipe</label>
          <select id="shift-type-sel" class="form-control">
            <option value="matin">🌅 Équipe Matin (07h00 – 14h00)</option>
            <option value="soir">🌆 Équipe Soir (14h00 – 22h00)</option>
            <option value="nuit">🌙 Équipe Nuit (22h00 – 07h00)</option>
          </select>
        </div>
        <div class="input-group-elite">
          <label>Responsable de l'équipe</label>
          <select id="shift-manager-sel" class="form-control">
            ${managers.map(u => `<option value="${u.id}" data-name="${u.name || u.username}">${u.name || u.username} (${u.role})</option>`).join('')}
          </select>
        </div>
        <div class="input-group-elite">
          <label>Note (optionnel)</label>
          <input type="text" id="shift-note" class="form-control" placeholder="Ex: Équipe complète, effectif réduit…">
        </div>
      </div>
    `, [
      { label: 'Annuler', class: 'btn-ghost', action: () => UI.closeModal() },
      { label: 'Ouvrir la session', class: 'btn-primary', action: () => saveOpenShift() },
    ]);
  });
}

async function saveOpenShift() {
  const type = document.getElementById('shift-type-sel')?.value;
  const managerId = document.getElementById('shift-manager-sel')?.value;
  const managerName = document.getElementById('shift-manager-sel')?.selectedOptions[0]?.dataset?.name;
  const note = document.getElementById('shift-note')?.value;
  if (!type || !managerId) { UI.toast('Sélectionnez un type et un responsable', 'warning'); return; }

  const shift = {
    id: 'shift_' + Date.now(),
    type,
    managerName,
    managerId,
    note: note || '',
    status: 'open',
    openedAt: Date.now(),
    closedAt: null,
    date: new Date().toISOString(),
  };

  try {
    await DB.dbPut('shifts', shift);
    await DB.writeAudit('SHIFT_OPEN', 'shifts', shift.id, { type, managerName }, DB.AppState.currentUser?.id);
    UI.closeModal();
    UI.toast(`Équipe ${SHIFT_TYPES[type]?.label || type} ouverte — Bonne session, ${managerName} !`, 'success', 4000);
    Router.navigate('shifts');
  } catch(e) {
    UI.toast('Erreur : ' + e.message, 'error');
  }
}

async function closeCurrentShift(shiftId) {
  const ok = await UI.confirm('Clôturer cette session ?', 'Les ventes de l\'équipe seront comptabilisées dans le rapport. Cette action est irréversible.');
  if (!ok) return;

  try {
    const shift = await DB.dbGet('shifts', shiftId);
    if (!shift) return;
    shift.status = 'closed';
    shift.closedAt = Date.now();
    await DB.dbPut('shifts', shift);
    await DB.writeAudit('SHIFT_CLOSE', 'shifts', shiftId, { type: shift.type, managerName: shift.managerName, duration: Math.round((shift.closedAt - shift.openedAt) / 60000) + ' min' }, DB.AppState.currentUser?.id);
    UI.toast('Session clôturée. Rapport généré.', 'success');
    Router.navigate('shifts');
  } catch(e) {
    UI.toast('Erreur : ' + e.message, 'error');
  }
}

window.openShiftDialog = openShiftDialog;
window.saveOpenShift = saveOpenShift;
window.closeCurrentShift = closeCurrentShift;

Router.register('shifts', renderShifts);
