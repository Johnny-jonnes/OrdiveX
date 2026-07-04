/**
 * OrdiveX — Rapport des sorties de caisse (Dépenses et frais généraux)
 */

async function renderStockExits(container) {
  UI.loading(container, 'Chargement des sorties de caisse...');

  // Récupérer les données de la caisse et des utilisateurs
  const [cashRegister, users] = await Promise.all([
    DB.dbGetAll('cashRegister'),
    DB.dbGetAll('users')
  ]);

  // Date par défaut : Début de ce mois à aujourd'hui
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fromDefault = startOfMonth.toISOString().split('T')[0];
  const toDefault = today.toISOString().split('T')[0];

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Rapport des Sorties de Caisse (Dépenses)</h1>
        <p class="page-subtitle">Suivi détaillé des frais généraux, déjeuners, achats divers et frais de fonctionnement</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="exportStockExitsPDF()"><i data-lucide="printer"></i> PDF</button>
        <button class="btn btn-secondary" onclick="exportStockExitsCSV()"><i data-lucide="download"></i> Exporter CSV</button>
      </div>
    </div>

    <!-- BARRE DE RECHERCHE & FILTRES -->
    <div class="filter-bar" style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; background:var(--surface); padding:16px; border-radius:12px; border:1px solid var(--border); margin-bottom:20px;">
      <div class="form-group" style="margin-bottom:0; flex:2; min-width:200px;">
        <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; display:block;">Recherche</label>
        <input type="text" id="exit-search-input" class="form-control" placeholder="Rechercher par libellé, référence, motif..." oninput="filterStockExitsData()">
      </div>
      <div class="form-group" style="margin-bottom:0; flex:1; min-width:150px;">
        <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; display:block;">Mode de règlement</label>
        <select id="exit-method-select" class="form-control" onchange="filterStockExitsData()">
          <option value="">Tous les modes</option>
          <option value="cash">Espèces (Caisse)</option>
          <option value="orange_money">Orange Money</option>
          <option value="mtn_momo">MTN MoMo</option>
          <option value="transfer">Virement Bancaire</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom:0; width:150px;">
        <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; display:block;">Du</label>
        <input type="date" id="exit-date-from" class="form-control" value="${fromDefault}" onchange="filterStockExitsData()">
      </div>
      <div class="form-group" style="margin-bottom:0; width:150px;">
        <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; display:block;">Au</label>
        <input type="date" id="exit-date-to" class="form-control" value="${toDefault}" onchange="filterStockExitsData()">
      </div>
    </div>

    <!-- BLOCS KPI -->
    <div class="kpi-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:20px;">
      <div class="kpi-card kpi-blue">
        <div class="kpi-icon"><i data-lucide="package-minus"></i></div>
        <div class="kpi-content">
          <div class="kpi-value" id="kpi-exit-count">0</div>
          <div class="kpi-label">Nombre total de Sorties</div>
        </div>
      </div>
      <div class="kpi-card kpi-red">
        <div class="kpi-icon"><i data-lucide="banknote"></i></div>
        <div class="kpi-content">
          <div class="kpi-value" id="kpi-exit-value">0 GNF</div>
          <div class="kpi-label">Montant total sorti</div>
        </div>
      </div>
      <div class="kpi-card kpi-orange">
        <div class="kpi-icon"><i data-lucide="calculator"></i></div>
        <div class="kpi-content">
          <div class="kpi-value" id="kpi-exit-avg">0 GNF</div>
          <div class="kpi-label">Moyenne par sortie</div>
        </div>
      </div>
    </div>

    <div id="exits-table-container"></div>
  `;

  // Préparer le dictionnaire des utilisateurs
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u.name || u.username; });

  // Mettre les données brutes dans le scope global pour le filtrage
  window._exitCashRegister = cashRegister;
  window._exitUserMap = userMap;

  // Filtrer au chargement
  filterStockExitsData();

  if (window.lucide) lucide.createIcons();
}

function filterStockExitsData() {
  const query = (document.getElementById('exit-search-input')?.value || '').toLowerCase();
  const methodFilter = document.getElementById('exit-method-select')?.value || '';
  const fromDate = document.getElementById('exit-date-from')?.value;
  const toDate = document.getElementById('exit-date-to')?.value;

  const container = document.getElementById('exits-table-container');
  if (!container) return;

  // Filtrer les entrées de caisse de type 'manual_out' (sorties manuelles / dépenses)
  let filtered = (window._exitCashRegister || []).filter(c => c.type === 'manual_out');

  // Filtrer par période (on compare les dates au format YYYY-MM-DD)
  if (fromDate) {
    filtered = filtered.filter(c => c.date && c.date >= fromDate);
  }
  if (toDate) {
    filtered = filtered.filter(c => c.date && c.date <= toDate);
  }

  // Filtrer par mode de règlement
  if (methodFilter) {
    filtered = filtered.filter(c => c.paymentMethod === methodFilter);
  }

  // Filtrer par recherche textuelle (libellé/reason ou référence)
  if (query) {
    filtered = filtered.filter(c => {
      const reason = (c.reason || '').toLowerCase();
      const ref = (c.reference || '').toLowerCase();
      return reason.includes(query) || ref.includes(query);
    });
  }

  // Trier par date/timestamp décroissant
  filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  // Conserver les données filtrées
  window._exitsFilteredData = filtered;

  // Calculer les statistiques cumulées
  const count = filtered.length;
  const totalAmount = filtered.reduce((sum, c) => sum + (c.amount || 0), 0);
  const avgAmount = count > 0 ? Math.round(totalAmount / count) : 0;

  // Mettre à jour les KPIs
  document.getElementById('kpi-exit-count').textContent = count;
  document.getElementById('kpi-exit-value').textContent = UI.formatCurrency(totalAmount);
  document.getElementById('kpi-exit-avg').textContent = UI.formatCurrency(avgAmount);

  // Rendu du tableau
  const columns = [
    { 
      label: 'Date', 
      render: r => {
        if (!r.timestamp) return r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—';
        return new Date(r.timestamp).toLocaleDateString('fr-FR');
      } 
    },
    { 
      label: 'Heure', 
      render: r => {
        if (!r.timestamp) return '—';
        return new Date(r.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } 
    },
    { 
      label: 'Libellé / Objet', 
      render: r => `<strong>${r.reason || '—'}</strong>` 
    },
    { 
      label: 'Montant', 
      render: r => `<strong class="text-danger">${UI.formatCurrency(r.amount || 0)}</strong>` 
    },
    { 
      label: 'Mode de règlement', 
      render: r => {
        const m = r.paymentMethod || 'cash';
        let label = m;
        if (m === 'cash') label = 'Espèces';
        if (m === 'orange_money') label = 'Orange Money';
        if (m === 'mtn_momo') label = 'MTN MoMo';
        if (m === 'transfer') label = 'Virement';
        return `<span class="badge badge-neutral">${label}</span>`;
      } 
    },
    { 
      label: 'Utilisateur', 
      render: r => window._exitUserMap[r.userId] || `<span class="text-muted">Inconnu</span>` 
    },
    { 
      label: 'Observation / Réf', 
      render: r => r.reference || '<span class="text-muted">—</span>' 
    }
  ];

  UI.table(container, columns, filtered, {
    emptyMessage: "Aucune dépense / sortie de caisse enregistrée sur cette période.",
    emptyIcon: 'banknote'
  });

  if (window.lucide) lucide.createIcons();
}

window.exportStockExitsPDF = function() {
  const dataList = window._exitsFilteredData || [];
  if (dataList.length === 0) {
    return UI.toast("Aucune donnée à exporter", "warning");
  }
  if (!window.PDFExport) {
    return UI.toast("Module PDF non chargé", "error");
  }

  let totalAmount = 0;

  const data = dataList.map(c => {
    totalAmount += (c.amount || 0);

    const d = c.timestamp ? new Date(c.timestamp) : (c.date ? new Date(c.date) : new Date());
    const dateStr = d.toLocaleDateString('fr-FR');
    const timeStr = c.timestamp ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';

    let methodLabel = c.paymentMethod || 'cash';
    if (methodLabel === 'cash') methodLabel = 'Espèces';
    if (methodLabel === 'orange_money') methodLabel = 'Orange Money';
    if (methodLabel === 'mtn_momo') methodLabel = 'MTN MoMo';
    if (methodLabel === 'transfer') methodLabel = 'Virement';

    return [
      dateStr,
      timeStr,
      c.reason || '—',
      UI.formatCurrency(c.amount || 0),
      methodLabel,
      window._exitUserMap[c.userId] || 'Inconnu',
      c.reference || '—'
    ];
  });

  const headers = ["Date", "Heure", "Libellé / Objet", "Montant", "Mode", "Utilisateur", "Réf / Observation"];
  
  const fromDate = document.getElementById('exit-date-from')?.value;
  const toDate = document.getElementById('exit-date-to')?.value;
  const dateRangeStr = (fromDate && toDate) 
    ? `Période du ${new Date(fromDate).toLocaleDateString('fr-FR')} au ${new Date(toDate).toLocaleDateString('fr-FR')}`
    : '';

  window.PDFExport.generate(
    `Rapport des Sorties de Caisse (Dépenses)`,
    headers,
    data,
    {
      subHeader: [
        dateRangeStr,
        `Généré le ${new Date().toLocaleDateString('fr-FR')}`
      ],
      summaryBlocks: [
        { label: "Nombre total de sorties", value: `${dataList.length}` },
        { label: "Montant total des sorties", value: `${UI.formatCurrency(totalAmount)}` },
        { label: "Moyenne par sortie", value: `${UI.formatCurrency(dataList.length > 0 ? Math.round(totalAmount / dataList.length) : 0)}` }
      ]
    }
  );
};

window.exportStockExitsCSV = function() {
  const dataList = window._exitsFilteredData || [];
  if (dataList.length === 0) {
    return UI.toast("Aucune donnée à exporter", "warning");
  }

  const csvRows = [
    ["Date", "Heure", "Libelle / Objet", "Montant", "Mode de Reglement", "Utilisateur", "Observation / Reference"]
  ];

  dataList.forEach(c => {
    const d = c.timestamp ? new Date(c.timestamp) : (c.date ? new Date(c.date) : new Date());
    const dateStr = d.toLocaleDateString('fr-FR');
    const timeStr = c.timestamp ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';

    let methodLabel = c.paymentMethod || 'cash';
    if (methodLabel === 'cash') methodLabel = 'Especes';
    if (methodLabel === 'orange_money') methodLabel = 'Orange Money';
    if (methodLabel === 'mtn_momo') methodLabel = 'MTN MoMo';
    if (methodLabel === 'transfer') methodLabel = 'Virement';

    const userName = window._exitUserMap[c.userId] || 'Inconnu';

    csvRows.push([
      `"${dateStr}"`,
      `"${timeStr}"`,
      `"${(c.reason || '—').replace(/"/g, '""')}"`,
      c.amount || 0,
      `"${methodLabel}"`,
      `"${userName.replace(/"/g, '""')}"`,
      `"${(c.reference || '—').replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  
  const fromDate = document.getElementById('exit-date-from')?.value || '';
  const toDate = document.getElementById('exit-date-to')?.value || '';
  const dateSuffix = fromDate ? `_${fromDate}_to_${toDate}` : '';

  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sorties_caisse_${dateSuffix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  UI.toast("Le fichier CSV a été exporté avec succès", "success");
  DB.writeAudit('EXPORT_CSV', 'cash-exits', null, { count: dataList.length });
};

// Enregistrer la route
Router.register('stock-exits', renderStockExits);
