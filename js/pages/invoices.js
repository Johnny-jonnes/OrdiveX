/**
 * OrdiveX — Module Gestion des Factures Professionnelles
 * Factures fournisseurs, traçabilité, liaison stock
 */

async function renderInvoices(container) {
  UI.loading(container, 'Chargement des factures...');
  const [invoices, suppliers, products] = await Promise.all([
    DB.dbGetAll('invoices'),
    DB.dbGetAll('suppliers'),
    DB.dbGetAll('products'),
  ]);

  const supplierMap = {};
  suppliers.forEach(s => { supplierMap[s.id] = s; });
  window._invoicesProducts = products;

  const sorted = invoices.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const draft = invoices.filter(i => i.status === 'draft');
  const validated = invoices.filter(i => i.status === 'validated');

  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Factures Professionnelles</h1>
        <p class="page-subtitle">${invoices.length} factures — ${draft.length} en brouillon</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" onclick="exportInvoicesCsv()"><i data-lucide="file-spreadsheet"></i> Exporter CSV</button>
        <button class="btn btn-primary" onclick="showNewInvoiceForm()"><i data-lucide="plus"></i> Nouvelle Facture</button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat-chip stat-orange"><span class="stat-val">${draft.length}</span><span class="stat-label">Brouillons</span></div>
      <div class="stat-chip stat-green"><span class="stat-val">${validated.length}</span><span class="stat-label">Validées</span></div>
      <div class="stat-chip stat-blue"><span class="stat-val">${UI.formatCurrency(validated.reduce((a, i) => a + (i.totalAmount || 0), 0))}</span><span class="stat-label">Total Validé</span></div>
    </div>

    <div class="filter-bar">
      <select id="inv-status" class="filter-select" onchange="filterInvoices()">
        <option value="">Tous statuts</option>
        <option value="draft">Brouillon</option>
        <option value="validated">Validée</option>
      </select>
      <select id="inv-supplier" class="filter-select" onchange="filterInvoices()">
        <option value="">Tous fournisseurs</option>
        ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
    </div>

    <div id="inv-table-container"></div>
  `;

  window._invoicesData = sorted;
  window._invoicesSupplierMap = supplierMap;
  filterInvoices();
}

function filterInvoices() {
  const status = document.getElementById('inv-status')?.value || '';
  const supId = document.getElementById('inv-supplier')?.value;
  let data = window._invoicesData || [];
  if (status) data = data.filter(i => i.status === status);
  if (supId) data = data.filter(i => i.supplierId === parseInt(supId));

  const container = document.getElementById('inv-table-container');
  if (!container) return;

  const statusConfig = {
    draft: { label: 'Brouillon', cls: 'badge-neutral' },
    validated: { label: 'Validée', cls: 'badge-success' },
  };

  UI.table(container, [
    { label: 'N° Facture', render: r => `<code class="code-tag">${r.invoiceNumber || 'F-' + String(r.id).padStart(5, '0')}</code>` },
    { label: 'Date', render: r => UI.formatDate(r.date) },
    {
      label: 'Fournisseur', render: r => {
        const s = window._invoicesSupplierMap?.[r.supplierId];
        return s ? `<strong>${s.name}</strong>` : `<strong>${r.supplierName || '—'}</strong>`;
      }
    },
    { label: 'Articles', render: r => `${(r.items || []).length} référence(s)` },
    { label: 'Montant Total', render: r => `<strong>${UI.formatCurrency(r.totalAmount || 0)}</strong>` },
    {
      label: 'Statut', render: r => {
        const s = statusConfig[r.status] || { label: r.status, cls: 'badge-neutral' };
        return `<span class="badge ${s.cls}">${s.label}</span>`;
      }
    },
    {
      label: 'Actions', render: r => `
      <div class="actions-cell">
        <button class="btn btn-xs btn-primary" onclick="viewInvoice(${r.id})"><i data-lucide="eye"></i> Voir</button>
        ${r.status === 'draft' ? `<button class="btn btn-xs btn-success" onclick="validateInvoice(${r.id})"><i data-lucide="check-circle"></i> Valider & Entrer Stock</button>` : ''}
        <button class="btn btn-xs btn-secondary" onclick="printInvoicePDF(${r.id})"><i data-lucide="printer"></i> PDF</button>
      </div>` },
  ], data, { emptyMessage: 'Aucune facture', emptyIcon: 'file-text', pageSize: 100 });
  if (window.lucide) lucide.createIcons();
}

async function showNewInvoiceForm() {
  const suppliers = await DB.dbGetAll('suppliers');
  
  UI.modal('<i data-lucide="file-text" class="modal-icon-inline"></i> Nouvelle Facture (Entrée de stock)', `
    <form id="invoice-form" class="form-grid">
      <div class="form-row">
        <div class="form-group">
          <label>N° Facture *</label>
          <input type="text" name="invoiceNumber" class="form-control" required placeholder="N° inscrit sur la facture">
        </div>
        <div class="form-group">
          <label>Fournisseur *</label>
          <select name="supplierId" id="inv-supplier-select" class="form-control" required>
            <option value="">Sélectionner...</option>
            ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Date de facturation *</label>
          <input type="date" name="date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label>Mode de paiement</label>
          <select name="paymentMethod" class="form-control">
            <option value="virement">Virement</option>
            <option value="cheque">Chèque</option>
            <option value="especes">Espèces</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="credit">Crédit</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Note additionnelle</label>
        <textarea name="note" class="form-control" rows="2" placeholder="Informations complémentaires..."></textarea>
      </div>
    </form>

    <div class="rx-section" style="margin-top:16px">
      <div class="rx-section-header">
        <h4 class="rx-section-title"><i data-lucide="package"></i> Articles facturés</h4>
        <button type="button" class="btn btn-sm btn-primary" onclick="addInvoiceItem()"><i data-lucide="plus"></i> Ajouter article</button>
      </div>
      <div id="invoice-items-list">
        <div class="rx-empty-items">Ajoutez les produits présents sur la facture</div>
      </div>
      <div class="order-total-bar" id="invoice-total-bar" style="display:none">
        <strong>Total Facture : <span id="invoice-total-display">0 GNF</span></strong>
      </div>
    </div>
  `, {
    size: 'large',
    footer: `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Annuler</button>
      <button class="btn btn-warning" onclick="submitInvoice('draft')"><i data-lucide="save"></i> Enregistrer Brouillon</button>
      <button class="btn btn-success" onclick="submitInvoice('validated')"><i data-lucide="check-circle"></i> Valider (Mettre à jour stocks)</button>
    `
  });
  if (window.lucide) lucide.createIcons();
  window._invoiceItemCounter = 0;
  
  // Ajouter un premier champ vide
  addInvoiceItem();
}

function addInvoiceItem() {
  const listEl = document.getElementById('invoice-items-list');
  if (!listEl) return;
  listEl.querySelector('.rx-empty-items')?.remove();
  document.getElementById('invoice-total-bar')?.style.setProperty('display', 'block');

  const idx = window._invoiceItemCounter++;
  const div = document.createElement('div');
  div.className = 'rx-item-row';
  div.id = `inv-item-${idx}`;
  div.style = 'flex-wrap: wrap; gap: 8px; margin-bottom: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 8px;';
  
  // Ligne 1: Produit, Qté, Prix
  // Ligne 2: N° Lot, Date d'expiration
  div.innerHTML = `
    <div style="display: flex; gap: 8px; width: 100%; margin-bottom: 8px;">
      <div class="form-group flex-grow" style="position:relative; margin-bottom:0;">
        <label style="font-size:11px; margin-bottom:2px;">Produit *</label>
        <input type="text" class="form-control" id="inv-search-${idx}" placeholder="Rechercher..." autocomplete="off" oninput="invoiceProductSearch(${idx})">
        <input type="hidden" id="inv-prod-${idx}">
        <div id="inv-dropdown-${idx}" class="order-product-dropdown" style="display:none"></div>
      </div>
      <div class="form-group" style="width:80px; margin-bottom:0;">
        <label style="font-size:11px; margin-bottom:2px;">Qté *</label>
        <input type="number" class="form-control" id="inv-qty-${idx}" placeholder="Qté" min="1" value="1" oninput="updateInvoiceTotal()">
      </div>
      <div class="form-group" style="width:120px; margin-bottom:0;">
        <label style="font-size:11px; margin-bottom:2px;">Prix d'achat *</label>
        <input type="number" class="form-control" id="inv-price-${idx}" placeholder="Prix unit." min="0" oninput="updateInvoiceTotal()">
      </div>
      <div style="display: flex; align-items: flex-end; padding-bottom: 4px;">
        <button type="button" class="btn btn-xs btn-danger" onclick="removeInvoiceItem(${idx})"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
    <div style="display: flex; gap: 8px; width: 100%;">
      <div class="form-group flex-grow" style="margin-bottom:0;">
        <label style="font-size:11px; margin-bottom:2px;">N° de Lot *</label>
        <input type="text" class="form-control" id="inv-lot-${idx}" placeholder="Ex: L123456" required>
      </div>
      <div class="form-group flex-grow" style="margin-bottom:0;">
        <label style="font-size:11px; margin-bottom:2px;">Date d'expiration *</label>
        <input type="date" class="form-control" id="inv-exp-${idx}" required>
      </div>
    </div>
  `;
  listEl.appendChild(div);
  if (window.lucide) lucide.createIcons();
}

function invoiceProductSearch(idx) {
  const input = document.getElementById(`inv-search-${idx}`);
  const dropdown = document.getElementById(`inv-dropdown-${idx}`);
  if (!input || !dropdown) return;

  const q = input.value.trim().toLowerCase();
  if (q.length < 2) { dropdown.style.display = 'none'; return; }

  const products = window._invoicesProducts || [];
  const matches = products.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.code || '').toLowerCase().includes(q) ||
    (p.dci || '').toLowerCase().includes(q)
  ).slice(0, 15);

  if (!matches.length) {
    dropdown.innerHTML = '<div class="order-dd-empty">Aucun produit trouvé</div>';
    dropdown.style.display = 'block';
    return;
  }

  dropdown.innerHTML = matches.map(p => `
    <div class="order-dd-item" onclick="selectInvoiceProduct(${idx}, ${p.id}, '${(p.name || '').replace(/'/g, "\\'")}', ${p.purchasePrice || 0})">
      <strong>${p.name}</strong> <span style="color:var(--text-muted);font-size:11px">(${p.code})</span>
      ${p.purchasePrice ? `<span style="float:right;color:var(--primary);font-weight:700">${UI.formatCurrency(p.purchasePrice)}</span>` : ''}
    </div>
  `).join('');
  dropdown.style.display = 'block';
}

function selectInvoiceProduct(idx, productId, productName, purchasePrice) {
  const input = document.getElementById(`inv-search-${idx}`);
  const hidden = document.getElementById(`inv-prod-${idx}`);
  const dropdown = document.getElementById(`inv-dropdown-${idx}`);
  const priceInput = document.getElementById(`inv-price-${idx}`);

  if (input) input.value = productName;
  if (hidden) { hidden.value = productId; hidden.dataset.name = productName; }
  if (priceInput && !priceInput.value) priceInput.value = purchasePrice || '';
  if (dropdown) dropdown.style.display = 'none';
  updateInvoiceTotal();
}

function removeInvoiceItem(idx) {
  document.getElementById(`inv-item-${idx}`)?.remove();
  updateInvoiceTotal();
}

function updateInvoiceTotal() {
  let total = 0;
  document.querySelectorAll('.rx-item-row[id^="inv-item-"]').forEach(row => {
    const idx = row.id.replace('inv-item-', '');
    const qty = parseFloat(document.getElementById(`inv-qty-${idx}`)?.value || 0);
    const price = parseFloat(document.getElementById(`inv-price-${idx}`)?.value || 0);
    total += qty * price;
  });
  const el = document.getElementById('invoice-total-display');
  if (el) el.textContent = UI.formatCurrency(total);
  return total;
}

async function submitInvoice(status) {
  const form = document.getElementById('invoice-form');
  if (!form || !form.checkValidity()) {
    if (form) form.reportValidity();
    return;
  }

  const supplierId = parseInt(document.getElementById('inv-supplier-select')?.value);
  if (!supplierId) { UI.toast('Sélectionnez un fournisseur', 'error'); return; }
  
  const supplier = window._invoicesSupplierMap ? window._invoicesSupplierMap[supplierId] : null;

  const items = [];
  let validationError = null;
  
  document.querySelectorAll('.rx-item-row[id^="inv-item-"]').forEach(row => {
    const idx = row.id.replace('inv-item-', '');
    const hidden = document.getElementById(`inv-prod-${idx}`);
    const qty = parseInt(document.getElementById(`inv-qty-${idx}`)?.value || 0);
    const price = parseFloat(document.getElementById(`inv-price-${idx}`)?.value || 0);
    const lotNumber = document.getElementById(`inv-lot-${idx}`)?.value?.trim();
    const expiryDate = document.getElementById(`inv-exp-${idx}`)?.value;

    if (hidden?.value) {
      if (status === 'validated' && (!lotNumber || !expiryDate)) {
        validationError = "Tous les champs (Lot et Expiration) sont requis pour la validation.";
      }
      if (qty > 0) {
        items.push({ 
          productId: parseInt(hidden.value), 
          productName: hidden.dataset?.name || '', 
          quantity: qty, 
          unitPrice: price, 
          lotNumber, 
          expiryDate,
          total: qty * price
        });
      }
    }
  });

  if (validationError && status === 'validated') {
    UI.toast(validationError, 'error');
    return;
  }

  if (!items.length) { UI.toast('Ajoutez au moins un article', 'warning'); return; }

  const formData = Object.fromEntries(new FormData(form));
  const totalAmount = items.reduce((a, i) => a + i.total, 0);
  
  const invoiceData = {
    invoiceNumber: formData.invoiceNumber,
    supplierId,
    supplierName: supplier ? supplier.name : 'Inconnu',
    date: formData.date,
    totalAmount,
    items,
    status, // 'draft' or 'validated'
    paymentMethod: formData.paymentMethod,
    note: formData.note || '',
    createdBy: DB.AppState.currentUser?.id,
  };

  try {
    if (status === 'validated') {
      const confirm = await UI.confirm(`Confirmer la validation de la facture ?\n\nCela va générer les entrées en stock (Lots et Mouvements) de manière définitive.`);
      if (!confirm) return;
      
      const invoiceId = await DB.dbAdd('invoices', invoiceData);
      
      // Process stock entry
      for (const item of items) {
        // Create lot
        const lotData = {
          productId: item.productId,
          lotNumber: item.lotNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          initialQuantity: item.quantity,
          supplierId: supplierId,
          receiptDate: formData.date,
          status: 'active',
          invoiceId: invoiceId,
          invoiceRef: formData.invoiceNumber
        };
        const lotId = await DB.dbAdd('lots', lotData);
        
        // Update global stock
        let stock = null;
        try {
          const stocks = await DB.dbGetAll('stock');
          stock = stocks.find(s => s.productId === item.productId);
        } catch(e) {}
        
        if (stock) {
          stock.quantity += item.quantity;
          stock.lastUpdated = Date.now();
          await DB.dbPut('stock', stock);
        } else {
          await DB.dbAdd('stock', {
            productId: item.productId,
            quantity: item.quantity,
            reservedQuantity: 0,
            lastUpdated: Date.now()
          });
        }
        
        // Create movement
        await DB.dbAdd('movements', {
          productId: item.productId,
          type: 'ENTRY',
          subType: 'PURCHASE',
          quantity: item.quantity,
          lotNumber: item.lotNumber,
          date: formData.date,
          userId: DB.AppState.currentUser?.id,
          note: `Facture N° ${formData.invoiceNumber}`,
          reference: formData.invoiceNumber,
          invoiceRef: formData.invoiceNumber
        });
      }
      
      await DB.writeAudit('VALIDATE_INVOICE', 'invoices', invoiceId, { invoiceNumber: formData.invoiceNumber, totalAmount });
      UI.toast(`Facture validée et stocks mis à jour`, 'success');
      
    } else {
      // Draft
      const invoiceId = await DB.dbAdd('invoices', invoiceData);
      await DB.writeAudit('CREATE_INVOICE_DRAFT', 'invoices', invoiceId, { invoiceNumber: formData.invoiceNumber });
      UI.toast(`Facture enregistrée en brouillon`, 'success');
    }
    
    UI.closeModal();
    renderInvoices(document.getElementById('app-content'));
  } catch (err) {
    UI.toast('Erreur : ' + err.message, 'error');
  }
}

async function validateInvoice(invoiceId) {
  const invoice = await DB.dbGet('invoices', invoiceId);
  if (!invoice || invoice.status === 'validated') return;
  
  // Ensure all items have lot and expiry
  const missingData = invoice.items.find(i => !i.lotNumber || !i.expiryDate);
  if (missingData) {
    UI.toast('Impossible de valider : certains articles n\'ont pas de N° de lot ou de date d\'expiration.', 'error');
    // TODO: Open edit form
    return;
  }
  
  const confirm = await UI.confirm(`Voulez-vous valider la facture ${invoice.invoiceNumber} ?\n\nCela mettra à jour le stock et l'action est irréversible.`);
  if (!confirm) return;
  
  try {
    invoice.status = 'validated';
    await DB.dbPut('invoices', invoice);
    
    // Process stock entry
    for (const item of invoice.items) {
      const lotData = {
        productId: item.productId,
        lotNumber: item.lotNumber,
        expiryDate: item.expiryDate,
        quantity: item.quantity,
        initialQuantity: item.quantity,
        supplierId: invoice.supplierId,
        receiptDate: invoice.date,
        status: 'active',
        invoiceId: invoice.id,
        invoiceRef: invoice.invoiceNumber
      };
      const lotId = await DB.dbAdd('lots', lotData);
      
      let stock = null;
      try {
        const stocks = await DB.dbGetAll('stock');
        stock = stocks.find(s => s.productId === item.productId);
      } catch(e) {}
      
      if (stock) {
        stock.quantity += item.quantity;
        stock.lastUpdated = Date.now();
        await DB.dbPut('stock', stock);
      } else {
        await DB.dbAdd('stock', {
          productId: item.productId,
          quantity: item.quantity,
          reservedQuantity: 0,
          lastUpdated: Date.now()
        });
      }
      
      await DB.dbAdd('movements', {
        productId: item.productId,
        type: 'ENTRY',
        subType: 'PURCHASE',
        quantity: item.quantity,
        lotNumber: item.lotNumber,
        date: invoice.date,
        userId: DB.AppState.currentUser?.id,
        note: `Facture N° ${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        invoiceRef: invoice.invoiceNumber
      });
    }
    
    await DB.writeAudit('VALIDATE_INVOICE', 'invoices', invoice.id, { invoiceNumber: invoice.invoiceNumber });
    UI.toast(`Facture validée et stocks mis à jour`, 'success');
    renderInvoices(document.getElementById('app-content'));
  } catch (err) {
    UI.toast('Erreur lors de la validation : ' + err.message, 'error');
  }
}

async function viewInvoice(invoiceId) {
  const invoice = await DB.dbGet('invoices', invoiceId);
  if (!invoice) return;
  
  UI.modal(`<i data-lucide="file-text" class="modal-icon-inline"></i> Facture ${invoice.invoiceNumber}`, `
    <div class="rx-detail-grid" style="margin-bottom:16px">
      <div class="rx-detail-card">
        <h4>Informations Facture</h4>
        <div class="detail-row"><span>Numéro</span><span><code>${invoice.invoiceNumber}</code></span></div>
        <div class="detail-row"><span>Date</span><span>${UI.formatDate(invoice.date)}</span></div>
        <div class="detail-row"><span>Fournisseur</span><span><strong>${invoice.supplierName || '—'}</strong></span></div>
        <div class="detail-row"><span>Statut</span><span><span class="badge ${invoice.status === 'validated' ? 'badge-success' : 'badge-neutral'}">${invoice.status === 'validated' ? 'Validée' : 'Brouillon'}</span></span></div>
      </div>
      <div class="rx-detail-card">
        <h4>Détails Paiement</h4>
        <div class="detail-row"><span>Méthode</span><span>${invoice.paymentMethod || '—'}</span></div>
        <div class="detail-row"><span>Note</span><span>${invoice.note || '—'}</span></div>
        <div class="detail-row"><span>Montant Total</span><span><strong style="font-size:16px">${UI.formatCurrency(invoice.totalAmount || 0)}</strong></span></div>
      </div>
    </div>
    
    <h4 style="margin-bottom:8px">Lignes de la facture</h4>
    <table class="data-table">
      <thead>
        <tr>
          <th>Produit</th>
          <th>Lot</th>
          <th>Date Exp.</th>
          <th>Qté</th>
          <th>Prix U.</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${(invoice.items || []).map(item => `
          <tr>
            <td><strong>${item.productName}</strong></td>
            <td><code>${item.lotNumber || '—'}</code></td>
            <td>${item.expiryDate ? UI.formatDate(item.expiryDate) : '—'}</td>
            <td>${item.quantity}</td>
            <td>${UI.formatCurrency(item.unitPrice || 0)}</td>
            <td><strong>${UI.formatCurrency(item.total || (item.quantity * item.unitPrice) || 0)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `, {
    size: 'large',
    footer: `
      <button class="btn btn-secondary" onclick="UI.closeModal()">Fermer</button>
      <button class="btn btn-primary" onclick="printInvoicePDF(${invoiceId})"><i data-lucide="printer"></i> Imprimer PDF</button>
      ${invoice.status === 'draft' ? `<button class="btn btn-success" onclick="UI.closeModal(); validateInvoice(${invoiceId})"><i data-lucide="check-circle"></i> Valider</button>` : ''}
    `
  });
  if (window.lucide) lucide.createIcons();
}

function exportInvoicesCsv() {
  const data = window._invoicesData || [];
  if (data.length === 0) { UI.toast('Aucune facture à exporter', 'warning'); return; }
  
  let csv = 'ID,Numero Facture,Fournisseur,Date,Statut,Methode Paiement,Montant Total,Note\n';
  data.forEach(i => {
    csv += `"${i.id}","${i.invoiceNumber}","${(i.supplierName || '').replace(/"/g, '""')}","${i.date}","${i.status}","${i.paymentMethod || ''}","${i.totalAmount || 0}","${(i.note || '').replace(/"/g, '""')}"\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Factures_OrdiveX_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function printInvoicePDF(invoiceId) {
  // Simplification pour l'impression (Ouvrir dans une nouvelle fenêtre stylisée)
  const invoice = window._invoicesData?.find(i => i.id === invoiceId);
  if (!invoice) return;
  
  const printWin = window.open('', '_blank');
  printWin.document.write(`
    <html>
      <head>
        <title>Facture ${invoice.invoiceNumber}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          h1 { color: #2c3e50; margin: 0; font-size: 24px; }
          .invoice-details, .supplier-details { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-success { background: #d4edda; color: #155724; }
          .badge-neutral { background: #e2e3e5; color: #383d41; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>FACTURE FOURNISSEUR</h1>
            <p>OrdiveX - Entrée de Stock</p>
          </div>
          <div style="text-align: right">
            <h2>N° ${invoice.invoiceNumber}</h2>
            <span class="badge ${invoice.status === 'validated' ? 'badge-success' : 'badge-neutral'}">
              ${invoice.status === 'validated' ? 'VALIDÉE' : 'BROUILLON'}
            </span>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between">
          <div class="invoice-details">
            <strong>Détails Facture</strong><br>
            Date: ${new Date(invoice.date).toLocaleDateString('fr-FR')}<br>
            Méthode paiement: ${invoice.paymentMethod || 'Non spécifié'}<br>
            Note: ${invoice.note || 'Aucune'}
          </div>
          <div class="supplier-details">
            <strong>Fournisseur</strong><br>
            Nom: ${invoice.supplierName || '—'}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Lot</th>
              <th>Date Exp.</th>
              <th>Quantité</th>
              <th>Prix U.</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${(invoice.items || []).map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.lotNumber || '—'}</td>
                <td>${item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('fr-FR') : '—'}</td>
                <td>${item.quantity}</td>
                <td>${item.unitPrice ? item.unitPrice.toLocaleString('fr-FR') : '0'} GNF</td>
                <td>${(item.total || (item.quantity * item.unitPrice) || 0).toLocaleString('fr-FR')} GNF</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total">
          TOTAL FACTURE : ${invoice.totalAmount ? invoice.totalAmount.toLocaleString('fr-FR') : '0'} GNF
        </div>
        
        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}

window.renderInvoices = renderInvoices;
window.filterInvoices = filterInvoices;
window.showNewInvoiceForm = showNewInvoiceForm;
window.addInvoiceItem = addInvoiceItem;
window.invoiceProductSearch = invoiceProductSearch;
window.selectInvoiceProduct = selectInvoiceProduct;
window.removeInvoiceItem = removeInvoiceItem;
window.updateInvoiceTotal = updateInvoiceTotal;
window.submitInvoice = submitInvoice;
window.validateInvoice = validateInvoice;
window.viewInvoice = viewInvoice;
window.exportInvoicesCsv = exportInvoicesCsv;
window.printInvoicePDF = printInvoicePDF;

Router.register('invoices', renderInvoices);
