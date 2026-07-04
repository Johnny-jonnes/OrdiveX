/**
 * OrdiveX — Rapport des sorties manuelles de stock
 */

async function renderStockExits(container) {
  UI.loading(container, 'Chargement des sorties de stock...');

  // Récupérer les données
  const [movements, products, users] = await Promise.all([
    DB.dbGetAll('movements'),
    DB.dbGetAll('products'),
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
        <h1 class="page-title">Rapport des Sorties de Stock</h1>
        <p class="page-subtitle">Suivi détaillé des ajustements négatifs et pertes de stock</p>
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
        <input type="text" id="exit-search-input" class="form-control" placeholder="Rechercher par médicament, motif, référence..." oninput="filterStockExitsData()">
      </div>
      <div class="form-group" style="margin-bottom:0; flex:1; min-width:150px;">
        <label style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:4px; display:block;">Motif / Sous-type</label>
        <select id="exit-subtype-select" class="form-control" onchange="filterStockExitsData()">
          <option value="">Tous les motifs</option>
          <option value="ADMIN_ADJUSTMENT">Ajustement Administrateur</option>
          <option value="INVENTORY_ADJUSTMENT">Ajustement d'Inventaire</option>
          <option value="LOSS">Pertes / Casses</option>
          <option value="EXPIRED">Périmés</option>
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
          <div class="kpi-label">Nombre de Sorties</div>
        </div>
      </div>
      <div class="kpi-card kpi-orange">
        <div class="kpi-icon"><i data-lucide="hash"></i></div>
        <div class="kpi-content">
          <div class="kpi-value" id="kpi-exit-qty">0</div>
          <div class="kpi-label">Quantité Totale Sortie</div>
        </div>
      </div>
      <div class="kpi-card kpi-red">
        <div class="kpi-icon"><i data-lucide="banknote"></i></div>
        <div class="kpi-content">
          <div class="kpi-value" id="kpi-exit-value">0 GNF</div>
          <div class="kpi-label">Valeur Totale (P. Achat)</div>
        </div>
      </div>
    </div>

    <div id="exits-table-container"></div>
  `;

  // Préparer les dictionnaires pour le rendu
  const productMap = {};
  products.forEach(p => { productMap[p.id] = p; });

  const userMap = {};
  users.forEach(u => { userMap[u.id] = u.name || u.username; });

  // Mettre les données brutes dans le scope global pour le filtrage
  window._exitMovements = movements;
  window._exitProductMap = productMap;
  window._exitUserMap = userMap;

  // Filtrer au chargement
  filterStockExitsData();

  if (window.lucide) lucide.createIcons();
}

function filterStockExitsData() {
  const query = document.getElementById('exit-search-input')?.value.toLowerCase() || '';
  const subTypeFilter = document.getElementById('exit-subtype-select')?.value || '';
  const fromDate = document.getElementById('exit-date-from')?.value;
  const toDate = document.getElementById('exit-date-to')?.value;

  const container = document.getElementById('exits-table-container');
  if (!container) return;

  // 1. Filtrer les mouvements : TYPE === 'EXIT' et SUBTYPE !== 'SALE' (et on ignore les retours d'écriture s'il y a lieu)
  let filtered = (window._exitMovements || []).filter(m => m.type === 'EXIT' && m.subType !== 'SALE');

  // Filtrer par période
  if (fromDate) {
    filtered = filtered.filter(m => m.date && m.date.split('T')[0] >= fromDate);
  }
  if (toDate) {
    filtered = filtered.filter(m => m.date && m.date.split('T')[0] <= toDate);
  }

  // Filtrer par sous-type
  if (subTypeFilter) {
    filtered = filtered.filter(m => m.subType === subTypeFilter);
  }

  // Filtrer par recherche textuelle (médicament, note, référence)
  if (query) {
    filtered = filtered.filter(m => {
      const prod = window._exitProductMap[m.productId];
      const prodName = prod ? prod.name.toLowerCase() : '';
      const note = (m.note || '').toLowerCase();
      const ref = (m.reference || '').toLowerCase();
      return prodName.includes(query) || note.includes(query) || ref.includes(query);
    });
  }

  // Trier par date décroissante
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Conserver pour les exports PDF/CSV
  window._exitsFilteredData = filtered;

  // Calculer les statistiques cumulées
  let totalExitsCount = filtered.length;
  let totalQty = 0;
  let totalValue = 0;

  filtered.forEach(m => {
    // Quantité stockée négative, on l'affiche positivement
    const qty = Math.abs(m.quantity || 0);
    const prod = window._exitProductMap[m.productId];
    const buyPrice = prod ? (parseFloat(prod.purchasePrice) || 0) : 0;

    totalQty += qty;
    totalValue += qty * buyPrice;
  });

  // Mettre à jour les KPIs
  document.getElementById('kpi-exit-count').textContent = totalExitsCount;
  document.getElementById('kpi-exit-qty').textContent = totalQty;
  document.getElementById('kpi-exit-value').textContent = UI.formatCurrency(totalValue);

  // Rendu du tableau
  const columns = [
    { 
      label: 'Date & Heure', 
      render: r => {
        if (!r.date) return '—';
        const d = new Date(r.date);
        return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
      } 
    },
    { 
      label: 'Médicament', 
      render: r => {
        const prod = window._exitProductMap[r.productId];
        return prod ? `<strong>${prod.name}</strong>` : `<span class="text-muted">Inconnu (ID: ${r.productId})</span>`;
      } 
    },
    { 
      label: 'Quantité', 
      render: r => `<strong class="text-danger">${Math.abs(r.quantity)}</strong>` 
    },
    {
      label: 'Valeur (P.A.)',
      render: r => {
        const prod = window._exitProductMap[r.productId];
        const buyPrice = prod ? (parseFloat(prod.purchasePrice) || 0) : 0;
        return UI.formatCurrency(Math.abs(r.quantity) * buyPrice);
      }
    },
    { 
      label: 'Motif', 
      render: r => {
        // Traduire ou formater le motif
        const sub = r.subType || '';
        let motifLabel = sub;
        if (sub === 'ADMIN_ADJUSTMENT') motifLabel = 'Ajustement Admin';
        if (sub === 'INVENTORY_ADJUSTMENT') motifLabel = 'Ajustement Inventaire';
        if (sub === 'LOSS') motifLabel = 'Perte / Casse';
        if (sub === 'EXPIRED') motifLabel = 'Périmé';
        return `<span class="badge badge-warning">${motifLabel}</span>`;
      } 
    },
    { 
      label: 'Utilisateur', 
      render: r => window._exitUserMap[r.userId] || `<span class="text-muted">Inconnu</span>` 
    },
    { 
      label: 'Observation', 
      render: r => {
        const note = r.note || '';
        // Si la note contient " — ", on affiche ce qui est après
        if (note.includes(' — ')) {
          return note.split(' — ')[1];
        }
        return note || '—';
      } 
    }
  ];

  UI.table(container, columns, filtered, {
    emptyMessage: "Aucune sortie manuelle de stock trouvée pour cette sélection.",
    emptyIcon: 'package-x'
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

  let totalQty = 0;
  let totalValue = 0;

  const data = dataList.map(m => {
    const qty = Math.abs(m.quantity || 0);
    const prod = window._exitProductMap[m.productId];
    const buyPrice = prod ? (parseFloat(prod.purchasePrice) || 0) : 0;
    const value = qty * buyPrice;

    totalQty += qty;
    totalValue += value;

    const d = new Date(m.date);
    const dateStr = d.toLocaleDateString('fr-FR');
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let motifLabel = m.subType || '';
    if (m.subType === 'ADMIN_ADJUSTMENT') motifLabel = 'Ajustement Admin';
    if (m.subType === 'INVENTORY_ADJUSTMENT') motifLabel = 'Ajustement Inventaire';
    if (m.subType === 'LOSS') motifLabel = 'Perte / Casse';
    if (m.subType === 'EXPIRED') motifLabel = 'Périmé';

    let observation = m.note || '';
    if (observation.includes(' — ')) {
      observation = observation.split(' — ')[1];
    }

    return [
      dateStr,
      timeStr,
      prod ? prod.name : `Produit ID: ${m.productId}`,
      String(qty),
      motifLabel,
      window._exitUserMap[m.userId] || 'Inconnu',
      observation || '—'
    ];
  });

  const headers = ["Date", "Heure", "Médicament", "Quantité", "Motif", "Utilisateur", "Observation"];
  
  const fromDate = document.getElementById('exit-date-from')?.value;
  const toDate = document.getElementById('exit-date-to')?.value;
  const dateRangeStr = (fromDate && toDate) 
    ? `Période du ${new Date(fromDate).toLocaleDateString('fr-FR')} au ${new Date(toDate).toLocaleDateString('fr-FR')}`
    : '';

  window.PDFExport.generate(
    `Rapport des Sorties de Stock`,
    headers,
    data,
    {
      subHeader: [
        dateRangeStr,
        `Généré le ${new Date().toLocaleDateString('fr-FR')}`
      ],
      summaryBlocks: [
        { label: "Nombre total de sorties", value: `${dataList.length}` },
        { label: "Quantité totale sortie", value: `${totalQty}` },
        { label: "Valeur totale (Prix Achat)", value: `${UI.formatCurrency(totalValue)}` }
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
    ["Date", "Heure", "Medicament", "Quantite", "Valeur (P.A.)", "Motif", "Utilisateur", "Observation"]
  ];

  dataList.forEach(m => {
    const qty = Math.abs(m.quantity || 0);
    const prod = window._exitProductMap[m.productId];
    const buyPrice = prod ? (parseFloat(prod.purchasePrice) || 0) : 0;
    const value = qty * buyPrice;

    const d = new Date(m.date);
    const dateStr = d.toLocaleDateString('fr-FR');
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    let motifLabel = m.subType || '';
    if (m.subType === 'ADMIN_ADJUSTMENT') motifLabel = 'Ajustement Admin';
    if (m.subType === 'INVENTORY_ADJUSTMENT') motifLabel = 'Ajustement Inventaire';
    if (m.subType === 'LOSS') motifLabel = 'Perte / Casse';
    if (m.subType === 'EXPIRED') motifLabel = 'Périmé';

    let observation = m.note || '';
    if (observation.includes(' — ')) {
      observation = observation.split(' — ')[1];
    }

    const userName = window._exitUserMap[m.userId] || 'Inconnu';
    const prodName = prod ? prod.name : `Produit ID: ${m.productId}`;

    csvRows.push([
      `"${dateStr}"`,
      `"${timeStr}"`,
      `"${prodName.replace(/"/g, '""')}"`,
      qty,
      value,
      `"${motifLabel}"`,
      `"${userName.replace(/"/g, '""')}"`,
      `"${observation.replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  
  const fromDate = document.getElementById('exit-date-from')?.value || '';
  const toDate = document.getElementById('exit-date-to')?.value || '';
  const dateSuffix = fromDate ? `_${fromDate}_to_${toDate}` : '';

  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `sorties_stock${dateSuffix}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  UI.toast("Le fichier CSV a été exporté avec succès", "success");
  DB.writeAudit('EXPORT_CSV', 'stock-exits', null, { count: dataList.length });
};

// Enregistrer la route
Router.register('stock-exits', renderStockExits);
