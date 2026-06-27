/**
 * OrdiveX — Gestion des Equipes (Shifts Matin / Soir / Nuit)
 * v9.5.0 — Module complet avec :
 *   - Liste des equipes et affectation des employes
 *   - Planning du jour
 *   - Taches
 *   - Absences / remplacements
 *   - Rapport rapide
 */

// ─── Constantes ────────────────────────────────────────────────────
const SHIFT_TYPES = {
  matin: { label: 'Equipe Matin', icon: 'sunrise', color: '#f59e0b', hours: '07h00 - 14h00', gradient: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
  soir:  { label: 'Equipe Soir',  icon: 'sunset',  color: '#6366f1', hours: '14h00 - 22h00', gradient: 'linear-gradient(135deg,#818cf8,#6366f1)' },
  nuit:  { label: 'Equipe Nuit',  icon: 'moon',    color: '#0ea5e9', hours: '22h00 - 07h00', gradient: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' },
};

let _shiftsState = { tab: 'planning', teamFilter: '' };

// ─── Rendu principal ───────────────────────────────────────────────
async function renderShifts(container) {
  const user = DB.AppState.currentUser;
  const isAdmin = user && ['admin', 'pharmacien'].includes(user.role);

  const [allUsers, allSales, allShifts, settings] = await Promise.all([
    DB.dbGetAll('users'),
    DB.dbGetAll('sales'),
    DB.dbGetAll('shifts').catch(() => []),
    DB.dbGetAll('settings'),
  ]);

  const activeUsers = allUsers.filter(u => u.active !== false);
  const today = new Date().toISOString().split('T')[0];
  const openShift = allShifts.find(s => s.status === 'open');
  const todayShifts = allShifts.filter(s => (s.date || '').startsWith(today));
  const weekAgo = Date.now() - 7 * 86400000;
  const recentShifts = allShifts.filter(s => (s.openedAt || 0) > weekAgo).sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));

  function calcKPIs(shift) {
    if (!shift) return { sales: 0, total: 0, items: 0 };
    const ss = allSales.filter(s => {
      const d = new Date(s.createdAt || s.date || 0).getTime();
      return d >= (shift.openedAt || 0) && d <= (shift.closedAt || Date.now());
    });
    return {
      sales: ss.length,
      total: ss.reduce((a, s) => a + (s.total || 0), 0),
      items: ss.reduce((a, s) => a + (s.items?.length || 0), 0),
    };
  }

  const tabs = [
    { id: 'planning', label: 'Planning du jour', icon: 'calendar-days' },
    { id: 'teams',    label: 'Liste equipes',    icon: 'users-round' },
    { id: 'tasks',    label: 'Taches',           icon: 'list-checks' },
    { id: 'absences', label: 'Absences',         icon: 'user-x' },
    { id: 'report',   label: 'Rapport rapide',   icon: 'bar-chart-3' },
  ];

  container.innerHTML = `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <h1 style="font-size:22px;font-weight:800;color:var(--text);display:flex;align-items:center;gap:10px">
            <i data-lucide="clock-3" style="width:24px;height:24px;color:var(--primary)"></i>
            Gestion des Equipes
          </h1>
          <p style="color:var(--text-muted);font-size:13px;margin-top:4px">
            ${new Date().toLocaleDateString('fr-FR', {weekday:'long', day:'2-digit', month:'long', year:'numeric'})}
          </p>
        </div>
        ${isAdmin ? `
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary" onclick="openShiftDialog()" ${openShift ? 'disabled title="Une equipe est deja ouverte"' : ''} style="display:flex;align-items:center;gap:6px">
            <i data-lucide="play-circle"></i> Ouvrir une session
          </button>
          ${openShift ? `<button class="btn btn-danger" onclick="closeCurrentShift('${openShift.id}')" style="display:flex;align-items:center;gap:6px">
            <i data-lucide="square"></i> Cloturer
          </button>` : ''}
        </div>` : ''}
      </div>
    </div>

    <!-- Session active -->
    ${openShift ? _renderActiveShift(openShift, calcKPIs(openShift)) : `
    <div style="background:var(--surface);border:2px dashed var(--border);border-radius:16px;padding:40px;margin-bottom:24px;text-align:center;color:var(--text-muted)">
      <i data-lucide="clock" style="width:44px;height:44px;margin:0 auto 12px;display:block;opacity:0.25"></i>
      <p style="font-size:15px;font-weight:600">Aucune equipe ouverte</p>
      <p style="font-size:13px;margin-top:4px">Cliquez sur <strong>"Ouvrir une session"</strong> pour demarrer.</p>
    </div>`}

    <!-- Onglets -->
    <div style="display:flex;gap:4px;margin-bottom:20px;overflow-x:auto;padding-bottom:4px" id="shifts-tabs">
      ${tabs.map(t => `
        <button class="btn ${_shiftsState.tab === t.id ? 'btn-primary' : 'btn-ghost'}" onclick="_switchShiftsTab('${t.id}')" style="display:flex;align-items:center;gap:6px;white-space:nowrap;font-size:13px;padding:8px 16px;border-radius:10px">
          <i data-lucide="${t.icon}" style="width:15px;height:15px"></i> ${t.label}
        </button>`).join('')}
    </div>

    <!-- Contenu de l'onglet -->
    <div id="shifts-tab-content"></div>
  `;

  if (window.lucide) lucide.createIcons();

  // Store data globally for tab rendering
  window._shiftsData = { allUsers: activeUsers, allShifts, todayShifts, recentShifts, openShift, allSales, calcKPIs, isAdmin };
  _renderShiftsTab(_shiftsState.tab);
}

function _renderActiveShift(shift, kpi) {
  const t = SHIFT_TYPES[shift.type] || { label: shift.type, color: '#888', icon: 'clock', gradient: 'var(--gradient-primary)' };
  const members = (shift.members || []);
  return `
  <div style="background:${t.gradient};border-radius:16px;padding:20px 24px;margin-bottom:24px;color:#fff;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
    <div style="width:52px;height:52px;background:rgba(255,255,255,0.2);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i data-lucide="${t.icon}" style="width:28px;height:28px"></i>
    </div>
    <div style="flex:1;min-width:160px">
      <div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Session en cours</div>
      <div style="font-size:18px;font-weight:800">${t.label}</div>
      <div style="font-size:13px;opacity:0.85;margin-top:2px">
        <strong>${shift.managerName || 'N/A'}</strong> &middot; ${t.hours} &middot; ${members.length} membre(s)
      </div>
    </div>
    <div style="display:flex;gap:20px;align-items:center">
      <div style="text-align:center"><div style="font-size:24px;font-weight:900">${kpi.sales}</div><div style="font-size:11px;opacity:0.7">Ventes</div></div>
      <div style="text-align:center"><div style="font-size:24px;font-weight:900">${kpi.total.toLocaleString('fr-FR')}</div><div style="font-size:11px;opacity:0.7">CA (GNF)</div></div>
      <div style="text-align:center"><div style="font-size:24px;font-weight:900">${kpi.items}</div><div style="font-size:11px;opacity:0.7">Articles</div></div>
    </div>
  </div>`;
}

// ─── Switching Tabs ───────────────────────────────────────────────
function _switchShiftsTab(tabId) {
  _shiftsState.tab = tabId;
  document.querySelectorAll('#shifts-tabs button').forEach(b => {
    b.classList.toggle('btn-primary', b.textContent.trim().includes(_getTabLabel(tabId)));
    b.classList.toggle('btn-ghost', !b.textContent.trim().includes(_getTabLabel(tabId)));
  });
  _renderShiftsTab(tabId);
}
function _getTabLabel(id) {
  return { planning: 'Planning', teams: 'equipes', tasks: 'Taches', absences: 'Absences', report: 'Rapport' }[id] || '';
}

function _renderShiftsTab(tabId) {
  const ct = document.getElementById('shifts-tab-content');
  if (!ct) return;
  const d = window._shiftsData;
  if (!d) return;

  switch (tabId) {
    case 'planning': ct.innerHTML = _renderPlanningTab(d); break;
    case 'teams':    ct.innerHTML = _renderTeamsTab(d); break;
    case 'tasks':    ct.innerHTML = _renderTasksTab(d); break;
    case 'absences': ct.innerHTML = _renderAbsencesTab(d); break;
    case 'report':   ct.innerHTML = _renderReportTab(d); break;
  }
  if (window.lucide) lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — Planning du jour
// ═══════════════════════════════════════════════════════════════════
function _renderPlanningTab(d) {
  const slots = Object.entries(SHIFT_TYPES);
  return `
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
    ${slots.map(([key, t]) => {
      const todaySlot = d.todayShifts.find(s => s.type === key);
      const kpi = todaySlot ? d.calcKPIs(todaySlot) : null;
      const members = todaySlot?.members || [];
      const statusLabel = todaySlot?.status === 'open' ? 'En cours' : todaySlot ? 'Terminee' : 'Non planifiee';
      const statusCls = todaySlot?.status === 'open' ? 'badge-success' : todaySlot ? 'badge-neutral' : 'badge-warning';
      return `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden">
        <div style="background:${t.gradient};padding:16px 20px;color:#fff;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <i data-lucide="${t.icon}" style="width:22px;height:22px"></i>
            <div>
              <div style="font-weight:800;font-size:15px">${t.label}</div>
              <div style="font-size:12px;opacity:0.8">${t.hours}</div>
            </div>
          </div>
          <span class="badge ${statusCls}" style="font-size:11px">${statusLabel}</span>
        </div>
        <div style="padding:16px 20px">
          ${todaySlot ? `
            <div style="display:flex;justify-content:space-between;margin-bottom:12px">
              <div><span style="font-size:12px;color:var(--text-muted)">Responsable</span><br><strong style="font-size:13px">${todaySlot.managerName || 'N/A'}</strong></div>
              ${kpi ? `<div style="text-align:right"><span style="font-size:12px;color:var(--text-muted)">CA</span><br><strong style="font-size:13px;color:var(--primary)">${kpi.total.toLocaleString('fr-FR')} GNF</strong></div>` : ''}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Membres (${members.length})</div>
            ${members.length > 0 ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${members.map(m => `
              <span style="background:var(--bg);border:1px solid var(--border);padding:4px 10px;border-radius:100px;font-size:12px;font-weight:500">${m}</span>
            `).join('')}</div>` : '<p style="font-size:12px;color:var(--text-light);font-style:italic">Aucun membre affecte</p>'}
          ` : `
            <p style="font-size:13px;color:var(--text-muted);text-align:center;padding:20px 0">
              <i data-lucide="info" style="width:16px;height:16px;vertical-align:-3px;margin-right:4px"></i>
              Pas de session prevue pour ce creneau
            </p>
          `}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — Liste des equipes et affectation
// ═══════════════════════════════════════════════════════════════════
function _renderTeamsTab(d) {
  const roleLabels = { admin: 'Admin', pharmacien: 'Pharmacien', caissier: 'Caissier' };
  return `
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;margin-bottom:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px">
        <i data-lucide="users-round" style="width:18px;height:18px;color:var(--primary)"></i>
        Employes et Affectations
      </h3>
      ${d.isAdmin ? `<button class="btn btn-primary btn-sm" onclick="_showAssignDialog()" style="display:flex;align-items:center;gap:6px">
        <i data-lucide="user-plus" style="width:14px;height:14px"></i> Affecter a une equipe
      </button>` : ''}
    </div>
    <div style="overflow-x:auto">
      <table class="data-table" style="width:100%">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px 14px">Employe</th>
            <th style="text-align:left;padding:10px 14px">Role</th>
            <th style="text-align:center;padding:10px 14px">Equipe affectee</th>
            <th style="text-align:center;padding:10px 14px">Statut</th>
            ${d.isAdmin ? '<th style="text-align:center;padding:10px 14px">Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${d.allUsers.map(u => {
            const teamAffect = u.shift || u.team || null;
            const t = teamAffect ? SHIFT_TYPES[teamAffect] : null;
            return `<tr>
              <td style="padding:10px 14px">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:32px;height:32px;border-radius:50%;background:var(--gradient-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0">
                    ${(u.name || u.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <strong style="font-size:13px">${u.name || u.username}</strong>
                </div>
              </td>
              <td style="padding:10px 14px;font-size:13px">${roleLabels[u.role] || u.role}</td>
              <td style="padding:10px 14px;text-align:center">
                ${t ? `<span style="display:inline-flex;align-items:center;gap:4px;background:${t.color}15;color:${t.color};padding:4px 12px;border-radius:100px;font-size:12px;font-weight:600">
                  <i data-lucide="${t.icon}" style="width:12px;height:12px"></i> ${t.label}
                </span>` : '<span style="color:var(--text-light);font-size:12px">Non affecte</span>'}
              </td>
              <td style="padding:10px 14px;text-align:center">
                <span class="badge ${u.absent ? 'badge-danger' : 'badge-success'}" style="font-size:11px">${u.absent ? 'Absent' : 'Present'}</span>
              </td>
              ${d.isAdmin ? `<td style="padding:10px 14px;text-align:center">
                <select onchange="_assignUserToTeam('${u.id}', this.value)" style="padding:5px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);font-size:12px;cursor:pointer">
                  <option value="" ${!teamAffect ? 'selected' : ''}>-- Choisir --</option>
                  <option value="matin" ${teamAffect === 'matin' ? 'selected' : ''}>Matin</option>
                  <option value="soir" ${teamAffect === 'soir' ? 'selected' : ''}>Soir</option>
                  <option value="nuit" ${teamAffect === 'nuit' ? 'selected' : ''}>Nuit</option>
                </select>
              </td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — Taches
// ═══════════════════════════════════════════════════════════════════
function _renderTasksTab(d) {
  const tasks = JSON.parse(localStorage.getItem('ordivex_shift_tasks') || '[]');
  return `
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px">
        <i data-lucide="list-checks" style="width:18px;height:18px;color:var(--primary)"></i>
        Taches de l'equipe
      </h3>
      <button class="btn btn-primary btn-sm" onclick="_addShiftTask()" style="display:flex;align-items:center;gap:6px">
        <i data-lucide="plus" style="width:14px;height:14px"></i> Ajouter
      </button>
    </div>

    ${tasks.length === 0 ? `
    <div style="text-align:center;padding:32px 0;color:var(--text-muted)">
      <i data-lucide="clipboard-list" style="width:40px;height:40px;margin:0 auto 12px;display:block;opacity:0.25"></i>
      <p style="font-size:14px;font-weight:600">Aucune tache</p>
      <p style="font-size:12px;margin-top:4px">Ajoutez des taches pour l'equipe en cours.</p>
    </div>` : `
    <div style="display:flex;flex-direction:column;gap:8px">
      ${tasks.map((t, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg);border:1px solid var(--border);border-radius:12px;${t.done ? 'opacity:0.5' : ''}">
        <button onclick="_toggleShiftTask(${i})" style="flex-shrink:0;width:22px;height:22px;border-radius:6px;border:2px solid ${t.done ? 'var(--success)' : 'var(--border)'};background:${t.done ? 'var(--success)' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center">
          ${t.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;${t.done ? 'text-decoration:line-through' : ''}">${t.text}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
            ${SHIFT_TYPES[t.shift]?.label || 'General'} &middot; Priorite: <span style="color:${t.priority === 'high' ? 'var(--danger)' : t.priority === 'medium' ? 'var(--warning)' : 'var(--success)'}">${t.priority === 'high' ? 'Haute' : t.priority === 'medium' ? 'Moyenne' : 'Basse'}</span>
          </div>
        </div>
        <button onclick="_removeShiftTask(${i})" style="flex-shrink:0;background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px">
          <i data-lucide="trash-2" style="width:14px;height:14px"></i>
        </button>
      </div>`).join('')}
    </div>`}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// TAB 4 — Absences / Remplacements
// ═══════════════════════════════════════════════════════════════════
function _renderAbsencesTab(d) {
  const absences = JSON.parse(localStorage.getItem('ordivex_absences') || '[]');
  const today = new Date().toISOString().split('T')[0];
  const todayAbs = absences.filter(a => a.date === today);
  return `
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px">
        <i data-lucide="user-x" style="width:18px;height:18px;color:var(--danger)"></i>
        Absences et Remplacements
      </h3>
      ${d.isAdmin ? `<button class="btn btn-primary btn-sm" onclick="_declareAbsence()" style="display:flex;align-items:center;gap:6px">
        <i data-lucide="user-minus" style="width:14px;height:14px"></i> Declarer une absence
      </button>` : ''}
    </div>

    ${todayAbs.length === 0 ? `
    <div style="text-align:center;padding:32px 0;color:var(--text-muted)">
      <i data-lucide="smile" style="width:40px;height:40px;margin:0 auto 12px;display:block;opacity:0.25"></i>
      <p style="font-size:14px;font-weight:600">Aucune absence aujourd'hui</p>
      <p style="font-size:12px;margin-top:4px">Toute l'equipe est au complet.</p>
    </div>` : `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${todayAbs.map((a, i) => `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.15);border-radius:12px">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--danger);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">
          ${(a.name || '?').charAt(0).toUpperCase()}
        </div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px">${a.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${a.reason || 'Motif non precise'}</div>
        </div>
        ${a.replacement ? `<div style="text-align:right">
          <div style="font-size:11px;color:var(--text-muted)">Remplacant</div>
          <div style="font-weight:600;font-size:13px;color:var(--success)">${a.replacement}</div>
        </div>` : `<span class="badge badge-warning" style="font-size:11px">Pas de remplacant</span>`}
        ${d.isAdmin ? `<button onclick="_removeAbsence(${i})" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px">
          <i data-lucide="x" style="width:14px;height:14px"></i>
        </button>` : ''}
      </div>`).join('')}
    </div>`}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// TAB 5 — Rapport rapide
// ═══════════════════════════════════════════════════════════════════
function _renderReportTab(d) {
  const shifts7d = d.recentShifts;
  const totalSessions = shifts7d.length;
  const totalCA = shifts7d.reduce((a, s) => a + d.calcKPIs(s).total, 0);
  const totalVentes = shifts7d.reduce((a, s) => a + d.calcKPIs(s).sales, 0);
  const avgDuration = shifts7d.filter(s => s.closedAt).reduce((a, s) => a + (s.closedAt - s.openedAt), 0) / Math.max(1, shifts7d.filter(s => s.closedAt).length);

  // Stats par type
  const byType = {};
  for (const s of shifts7d) {
    if (!byType[s.type]) byType[s.type] = { sessions: 0, ca: 0, ventes: 0 };
    byType[s.type].sessions++;
    const k = d.calcKPIs(s);
    byType[s.type].ca += k.total;
    byType[s.type].ventes += k.sales;
  }

  return `
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:20px">
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Sessions (7j)</div>
      <div style="font-size:28px;font-weight:900;color:var(--text)">${totalSessions}</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">CA total (7j)</div>
      <div style="font-size:28px;font-weight:900;color:var(--primary)">${totalCA.toLocaleString('fr-FR')}</div>
      <div style="font-size:11px;color:var(--text-muted)">GNF</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Ventes (7j)</div>
      <div style="font-size:28px;font-weight:900;color:var(--success)">${totalVentes}</div>
    </div>
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Duree moy.</div>
      <div style="font-size:28px;font-weight:900;color:var(--warning)">${avgDuration > 0 ? Math.round(avgDuration / 60000) + 'min' : 'N/A'}</div>
    </div>
  </div>

  <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px">
    <h3 style="font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;gap:8px">
      <i data-lucide="pie-chart" style="width:16px;height:16px;color:var(--primary)"></i>
      Performance par equipe (7 derniers jours)
    </h3>
    ${Object.keys(byType).length === 0 ? '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">Aucune donnee pour cette periode.</p>' : `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${Object.entries(byType).map(([key, data]) => {
        const t = SHIFT_TYPES[key] || { label: key, color: '#888', icon: 'clock' };
        const pct = totalCA > 0 ? Math.round(data.ca / totalCA * 100) : 0;
        return `
        <div style="display:flex;align-items:center;gap:14px">
          <div style="width:36px;height:36px;background:${t.color}15;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i data-lucide="${t.icon}" style="width:18px;height:18px;color:${t.color}"></i>
          </div>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-weight:600;font-size:13px">${t.label}</span>
              <span style="font-size:12px;color:var(--text-muted)">${data.sessions} sessions &middot; ${data.ventes} ventes</span>
            </div>
            <div style="background:var(--bg);border-radius:100px;height:8px;overflow:hidden">
              <div style="background:${t.color};height:100%;width:${pct}%;border-radius:100px;transition:width 0.5s ease"></div>
            </div>
          </div>
          <div style="font-weight:800;font-size:14px;min-width:80px;text-align:right;color:${t.color}">${data.ca.toLocaleString('fr-FR')} GNF</div>
        </div>`;
      }).join('')}
    </div>`}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════════════════════════════
function openShiftDialog() {
  DB.dbGetAll('users').then(allUsers => {
    const managers = allUsers.filter(u => u.active !== false && ['admin', 'pharmacien', 'caissier'].includes(u.role));
    UI.modal('Ouvrir une session', `
      <div style="display:flex;flex-direction:column;gap:16px;padding:4px 0">
        <div class="form-group">
          <label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">Type d'equipe</label>
          <select id="shift-type-sel" class="form-control">
            <option value="matin">Equipe Matin (07h00 - 14h00)</option>
            <option value="soir">Equipe Soir (14h00 - 22h00)</option>
            <option value="nuit">Equipe Nuit (22h00 - 07h00)</option>
          </select>
        </div>
        <div class="form-group">
          <label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">Responsable</label>
          <select id="shift-manager-sel" class="form-control">
            ${managers.map(u => `<option value="${u.id}" data-name="${u.name || u.username}">${u.name || u.username} (${u.role})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">Membres de l'equipe</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;max-height:200px;overflow-y:auto;padding:8px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">
            ${managers.map(u => `
            <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--surface);border:1px solid var(--border);border-radius:100px;cursor:pointer;font-size:12px;font-weight:500">
              <input type="checkbox" class="shift-member-cb" value="${u.name || u.username}">
              ${u.name || u.username}
            </label>`).join('')}
          </div>
        </div>
        <div class="form-group">
          <label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">Note (optionnel)</label>
          <input type="text" id="shift-note" class="form-control" placeholder="Ex: Effectif reduit, formation...">
        </div>
      </div>
      </div>
    `, {
      footer: `
        <button class="btn btn-ghost" onclick="UI.closeModal()">Annuler</button>
        <button class="btn btn-primary" onclick="saveOpenShift()">Ouvrir la session</button>
      `
    });
  });
}

async function saveOpenShift() {
  const type = document.getElementById('shift-type-sel')?.value;
  const managerId = document.getElementById('shift-manager-sel')?.value;
  const managerName = document.getElementById('shift-manager-sel')?.selectedOptions[0]?.dataset?.name;
  const note = document.getElementById('shift-note')?.value;
  const members = [...document.querySelectorAll('.shift-member-cb:checked')].map(cb => cb.value);
  if (!type || !managerId) { UI.toast('Selectionnez un type et un responsable', 'warning'); return; }

  const shift = {
    id: 'shift_' + Date.now(),
    type,
    managerName,
    managerId,
    members,
    note: note || '',
    status: 'open',
    openedAt: Date.now(),
    closedAt: null,
    date: new Date().toISOString(),
  };

  try {
    await DB.dbPut('shifts', shift);
    await DB.writeAudit('SHIFT_OPEN', 'shifts', shift.id, { type, managerName, members: members.length }, DB.AppState.currentUser?.id);
    UI.closeModal();
    UI.toast(`${SHIFT_TYPES[type]?.label || type} ouverte avec ${members.length} membre(s). Bonne session !`, 'success', 4000);
    Router.navigate('shifts');
  } catch(e) {
    UI.toast('Erreur : ' + e.message, 'error');
  }
}

async function closeCurrentShift(shiftId) {
  const ok = await UI.confirm('Cloturer cette session ?', 'Les ventes seront comptabilisees dans le rapport. Action irreversible.');
  if (!ok) return;

  try {
    const shift = await DB.dbGet('shifts', shiftId);
    if (!shift) return;
    shift.status = 'closed';
    shift.closedAt = Date.now();
    await DB.dbPut('shifts', shift);
    const dur = Math.round((shift.closedAt - shift.openedAt) / 60000);
    await DB.writeAudit('SHIFT_CLOSE', 'shifts', shiftId, { type: shift.type, managerName: shift.managerName, duration: dur + ' min' }, DB.AppState.currentUser?.id);
    UI.toast('Session cloturee. Duree : ' + dur + ' min.', 'success');
    Router.navigate('shifts');
  } catch(e) {
    UI.toast('Erreur : ' + e.message, 'error');
  }
}

async function _assignUserToTeam(userId, team) {
  try {
    const user = await DB.dbGet('users', userId);
    if (!user) return;
    user.shift = team || null;
    await DB.dbPut('users', user);
    UI.toast(`${user.name || user.username} affecte ${team ? 'a l\'equipe ' + (SHIFT_TYPES[team]?.label || team) : '(retire)'}`, 'success');
  } catch(e) {
    UI.toast('Erreur : ' + e.message, 'error');
  }
}

function _showAssignDialog() {
  UI.toast('Utilisez les menus deroulants dans la colonne "Action" pour affecter chaque employe.', 'info', 5000);
}

// ─── Taches ───────────────────────────────────────────────────────
function _addShiftTask() {
  UI.modal('Ajouter une tache', `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-group">
        <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px">Description</label>
        <input type="text" id="task-text" class="form-control" placeholder="Ex: Verifier les perimes, nettoyer le comptoir..." required>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px">Equipe</label>
          <select id="task-shift" class="form-control">
            <option value="matin">Matin</option><option value="soir">Soir</option><option value="nuit">Nuit</option>
          </select>
        </div>
        <div class="form-group">
          <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px">Priorite</label>
          <select id="task-priority" class="form-control">
            <option value="low">Basse</option><option value="medium" selected>Moyenne</option><option value="high">Haute</option>
          </select>
        </div>
      </div>
    </div>
      </div>
    </div>
  `, {
    footer: `
      <button class="btn btn-ghost" onclick="UI.closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="_confirmAddShiftTask()">Ajouter</button>
    `
  });
}

function _confirmAddShiftTask() {
  const text = document.getElementById('task-text')?.value;
  if (!text) { UI.toast('Description requise', 'warning'); return; }
  const tasks = JSON.parse(localStorage.getItem('ordivex_shift_tasks') || '[]');
  tasks.push({ text, shift: document.getElementById('task-shift')?.value || 'matin', priority: document.getElementById('task-priority')?.value || 'medium', done: false, date: new Date().toISOString() });
  localStorage.setItem('ordivex_shift_tasks', JSON.stringify(tasks));
  UI.closeModal();
  UI.toast('Tache ajoutee', 'success');
  _renderShiftsTab('tasks');
}

function _toggleShiftTask(idx) {
  const tasks = JSON.parse(localStorage.getItem('ordivex_shift_tasks') || '[]');
  if (tasks[idx]) { tasks[idx].done = !tasks[idx].done; }
  localStorage.setItem('ordivex_shift_tasks', JSON.stringify(tasks));
  _renderShiftsTab('tasks');
}

function _removeShiftTask(idx) {
  const tasks = JSON.parse(localStorage.getItem('ordivex_shift_tasks') || '[]');
  tasks.splice(idx, 1);
  localStorage.setItem('ordivex_shift_tasks', JSON.stringify(tasks));
  _renderShiftsTab('tasks');
}

// ─── Absences ─────────────────────────────────────────────────────
function _declareAbsence() {
  const d = window._shiftsData;
  UI.modal('Declarer une absence', `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-group">
        <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px">Employe absent</label>
        <select id="abs-user" class="form-control">
          ${d.allUsers.map(u => `<option value="${u.name || u.username}">${u.name || u.username} (${u.role})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px">Motif</label>
        <input type="text" id="abs-reason" class="form-control" placeholder="Ex: Maladie, conge, formation...">
      </div>
      <div class="form-group">
        <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px">Remplacant (optionnel)</label>
        <select id="abs-replacement" class="form-control">
          <option value="">-- Aucun --</option>
          ${d.allUsers.map(u => `<option value="${u.name || u.username}">${u.name || u.username}</option>`).join('')}
        </select>
      </div>
      </div>
    </div>
  `, {
    footer: `
      <button class="btn btn-ghost" onclick="UI.closeModal()">Annuler</button>
      <button class="btn btn-primary" onclick="_confirmDeclareAbsence()">Confirmer</button>
    `
  });
}

function _confirmDeclareAbsence() {
  const name = document.getElementById('abs-user')?.value;
  const reason = document.getElementById('abs-reason')?.value;
  const replacement = document.getElementById('abs-replacement')?.value;
  if (!name) { UI.toast('Selectionnez un employe', 'warning'); return; }
  const absences = JSON.parse(localStorage.getItem('ordivex_absences') || '[]');
  absences.push({ name, reason, replacement, date: new Date().toISOString().split('T')[0] });
  localStorage.setItem('ordivex_absences', JSON.stringify(absences));
  UI.closeModal();
  UI.toast(`Absence declaree pour ${name}`, 'success');
  _renderShiftsTab('absences');
}

function _removeAbsence(idx) {
  const absences = JSON.parse(localStorage.getItem('ordivex_absences') || '[]');
  absences.splice(idx, 1);
  localStorage.setItem('ordivex_absences', JSON.stringify(absences));
  _renderShiftsTab('absences');
}

// ─── Exports ──────────────────────────────────────────────────────
window.openShiftDialog = openShiftDialog;
window.saveOpenShift = saveOpenShift;
window.closeCurrentShift = closeCurrentShift;
window._switchShiftsTab = _switchShiftsTab;
window._assignUserToTeam = _assignUserToTeam;
window._showAssignDialog = _showAssignDialog;
window._addShiftTask = _addShiftTask;
window._confirmAddShiftTask = _confirmAddShiftTask;
window._toggleShiftTask = _toggleShiftTask;
window._removeShiftTask = _removeShiftTask;
window._declareAbsence = _declareAbsence;
window._confirmDeclareAbsence = _confirmDeclareAbsence;
window._removeAbsence = _removeAbsence;

Router.register('shifts', renderShifts);
