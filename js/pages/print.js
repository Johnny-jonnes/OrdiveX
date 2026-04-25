/**
 * OrdiveX — Module Impressions & Documents
 * Tickets, factures, PV destruction, rapports officiels DNPM
 */

const PrintEngine = {
  pharmacyInfo: {
    name: 'Pharmacie Centrale de Conakry',
    address: 'Avenue de la République, Conakry, Guinée',
    phone: '+224 620 000 000',
    email: 'contact@pharmacie.gn',
    dnpm: 'LIC-DNPM-2024-001',
    responsable: 'Dr. Kouyaté Ahmed',
  },

  async loadSettings() {
    try {
      const settings = await DB.dbGetAll('settings');
      const get = (key) => settings.find(s => s.key === key)?.value;
      this.pharmacyInfo.name = get('pharmacy_name') || this.pharmacyInfo.name;
      this.pharmacyInfo.address = get('pharmacy_address') || this.pharmacyInfo.address;
      this.pharmacyInfo.phone = get('pharmacy_phone') || this.pharmacyInfo.phone;
    } catch (e) { }
  },

  header(title = '') {
    const info = this.pharmacyInfo;
    return `
      <div class="print-header">
        <div class="print-logo">💊</div>
        <div class="print-org">
          <h1>${info.name}</h1>
          <p>${info.address}</p>
          <p>Tél: ${info.phone} ${info.email ? '· ' + info.email : ''}</p>
          <p>Licence DNPM: ${info.dnpm}</p>
        </div>
        <div class="print-doc-ref">
          <div class="print-doc-type">${title}</div>
          <div class="print-date">${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      <div class="print-divider"></div>`;
  },

  footer() {
    const info = this.pharmacyInfo;
    return `
      <div class="print-footer">
        <div class="print-footer-left">
          <div class="print-sig-block">
            <p>Cachet et signature du pharmacien responsable</p>
            <div class="sig-line"></div>
            <p>${info.responsable}</p>
          </div>
        </div>
        <div class="print-footer-center">
          <p class="print-legal">Document généré par OrdiveX v1.0</p>
          <p class="print-legal">Imprimé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
        </div>
        <div class="print-footer-right">
          <div class="print-sig-block">
            <p>Visa DNPM</p>
            <div class="sig-line"></div>
            <p>Inspection pharmaceutique</p>
          </div>
        </div>
      </div>`;
  },

  async printSaleReceipt(saleId) {
    await this.loadSettings();
    const [sale, items] = await Promise.all([
      DB.dbGet('sales', saleId),
      DB.dbGetAll('saleItems', 'saleId', saleId),
    ]);
    if (!sale) return;

    const payLabels = { cash: 'Espèces', orange_money: 'Orange Money', mtn_momo: 'MTN MoMo', credit: 'Crédit', transfer: 'Virement' };

    const win = this._openPrintWindow('Ticket de Caisse');
    win.document.write(`
      ${this._printStyles()}
      <div class="ticket-container">
        <div class="ticket-logo">💊</div>
        <h2 class="ticket-name">${this.pharmacyInfo.name}</h2>
        <p class="ticket-addr">${this.pharmacyInfo.address}</p>
        <p class="ticket-phone">${this.pharmacyInfo.phone}</p>
        <div class="ticket-divider">════════════════════</div>
        <div class="ticket-meta">
          <div class="ticket-row"><span>N° Vente</span><span>#${String(saleId).padStart(6, '0')}</span></div>
          <div class="ticket-row"><span>Date</span><span>${UI.formatDateTime(new Date(sale.date).getTime())}</span></div>
          <div class="ticket-row"><span>Caissier</span><span>${DB.AppState.currentUser?.name || '—'}</span></div>
          <div class="ticket-row"><span>Paiement</span><span>${payLabels[sale.paymentMethod] || sale.paymentMethod}</span></div>
        </div>
        <div class="ticket-divider">════════════════════</div>
        <table class="ticket-items">
          ${items.map(i => `
            <tr>
              <td class="item-name">${i.productName}</td>
              <td class="item-qty">${i.quantity}x</td>
              <td class="item-price">${UI.formatCurrency(i.unitPrice)}</td>
              <td class="item-total">${UI.formatCurrency(i.total)}</td>
            </tr>`).join('')}
        </table>
        <div class="ticket-divider">════════════════════</div>
        ${sale.discount > 0 ? `<div class="ticket-row"><span>Remise</span><span>-${UI.formatCurrency(sale.discount)}</span></div>` : ''}
        <div class="ticket-total"><span>TOTAL</span><span>${UI.formatCurrency(sale.total)}</span></div>
        <div class="ticket-divider">════════════════════</div>
        <p class="ticket-thanks">Merci pour votre confiance</p>
        <p class="ticket-advice">Respectez les prescriptions médicales</p>
        <p class="ticket-legal">Conservez ce ticket comme preuve d'achat</p>
      </div>
    `);
    win.document.close();
    win.onload = () => win.print();
  },

  async printInvoice(saleId) {
    await this.loadSettings();
    const [sale, items] = await Promise.all([
      DB.dbGet('sales', saleId),
      DB.dbGetAll('saleItems', 'saleId', saleId),
    ]);
    if (!sale) return;

    const win = this._openPrintWindow('Facture');
    win.document.write(`
      ${this._printStyles()}
      <div class="invoice-container">
        ${this.header('FACTURE')}
        <div class="invoice-ref">N° FAC-${String(saleId).padStart(8, '0')}</div>
        <table class="invoice-table">
          <thead>
            <tr><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr>
          </thead>
          <tbody>
            ${items.map(i => `<tr>
              <td>${i.productName}</td>
              <td>${i.quantity}</td>
              <td>${UI.formatCurrency(i.unitPrice)}</td>
              <td><strong>${UI.formatCurrency(i.total)}</strong></td>
            </tr>`).join('')}
          </tbody>
          <tfoot>
            ${sale.discount > 0 ? `<tr><td colspan="3">Remise accordée</td><td>-${UI.formatCurrency(sale.discount)}</td></tr>` : ''}
            <tr class="invoice-total-row"><td colspan="3"><strong>TOTAL TTC</strong></td><td><strong>${UI.formatCurrency(sale.total)}</strong></td></tr>
          </tfoot>
        </table>
        ${this.footer()}
      </div>
    `);
    win.document.close();
    win.onload = () => win.print();
  },

  async printStockReport(mode) {
    mode = mode || 'full';
    await this.loadSettings();
    UI.toast('Préparation du rapport...', 'info');

    const [products, stockAll, lots] = await Promise.all([
      DB.dbGetAll('products'),
      DB.dbGetAll('stock'),
      DB.dbGetAll('lots'),
    ]);

    const stockMap = {};
    stockAll.forEach(s => { stockMap[s.productId] = s.quantity; });

    // Pré-calculer la date d'expiration la plus proche par produit
    const expiryMap = {};
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    lots.filter(l => l.status === 'active').forEach(l => {
      if (!expiryMap[l.productId] || new Date(l.expiryDate) < new Date(expiryMap[l.productId])) {
        expiryMap[l.productId] = l.expiryDate;
      }
    });

    // Totaux globaux
    const totalValAchat = products.reduce((a, p) => a + (stockMap[p.id] || 0) * (p.purchasePrice || 0), 0);
    const totalValVente = products.reduce((a, p) => a + (stockMap[p.id] || 0) * (p.salePrice || 0), 0);

    // Filtrer selon le mode
    let filtered = [];
    let reportTitle = '';
    let reportSubtitle = '';
    const LIMIT = 2000;

    if (mode === 'ruptures') {
      filtered = products.filter(p => (stockMap[p.id] || 0) === 0);
      reportTitle = 'RAPPORT DES RUPTURES DE STOCK';
      reportSubtitle = filtered.length + ' produit(s) en rupture totale';
    } else if (mode === 'low') {
      filtered = products.filter(p => { const q = stockMap[p.id] || 0; return q > 0 && q <= (p.minStock || 0); });
      reportTitle = 'RAPPORT DES STOCKS BAS';
      reportSubtitle = filtered.length + ' produit(s) sous le seuil minimum';
    } else if (mode === 'expiring') {
      filtered = products.filter(p => { const e = expiryMap[p.id]; return e && new Date(e) <= in90Days; })
        .sort((a, b) => new Date(expiryMap[a.id]) - new Date(expiryMap[b.id]));
      reportTitle = 'RAPPORT DES EXPIRATIONS PROCHES (90 JOURS)';
      reportSubtitle = filtered.length + ' produit(s) expirant bientôt';
    } else {
      filtered = products;
      reportTitle = 'RAPPORT D\'INVENTAIRE COMPLET';
      if (filtered.length > LIMIT) {
        reportSubtitle = 'Limité aux ' + LIMIT.toLocaleString() + ' premiers produits sur ' + filtered.length.toLocaleString() + '. Utilisez les rapports ciblés.';
        filtered = filtered.slice(0, LIMIT);
      } else {
        reportSubtitle = filtered.length.toLocaleString() + ' produit(s)';
      }
    }

    if (filtered.length === 0) {
      UI.toast('Aucun produit ne correspond à ce filtre.', 'info');
      return;
    }

    // Pagination : 200 lignes par page
    const PAGE_SIZE = 200;
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const filteredValAchat = filtered.reduce((a, p) => a + (stockMap[p.id] || 0) * (p.purchasePrice || 0), 0);
    const filteredValVente = filtered.reduce((a, p) => a + (stockMap[p.id] || 0) * (p.salePrice || 0), 0);

    const win = this._openPrintWindow(reportTitle);
    win.document.write(this._printStyles());
    win.document.write('<style>.row-expiring{background:#fff3e0;}</style>');

    // Page de synthèse
    win.document.write(`
      <div class="report-container" style="page-break-after:always;">
        ${this.header(reportTitle)}
        <h3>${reportSubtitle}</h3>
        <p style="font-size:11px;color:#666;margin-bottom:16px;">${new Date().toLocaleDateString('fr-FR', {weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</p>
        <table class="report-table" style="max-width:500px;">
          <tbody>
            <tr><td><strong>Produits dans ce rapport</strong></td><td><strong>${filtered.length.toLocaleString()}</strong></td></tr>
            <tr><td>Total en base</td><td>${products.length.toLocaleString()}</td></tr>
            <tr><td><strong>Valeur achat (rapport)</strong></td><td><strong>${UI.formatCurrency(filteredValAchat)}</strong></td></tr>
            <tr><td><strong>Valeur vente (rapport)</strong></td><td><strong>${UI.formatCurrency(filteredValVente)}</strong></td></tr>
            <tr><td>Valeur achat globale</td><td>${UI.formatCurrency(totalValAchat)}</td></tr>
            <tr><td>Valeur vente globale</td><td>${UI.formatCurrency(totalValVente)}</td></tr>
          </tbody>
        </table>
        <div class="report-legend" style="margin-top:20px;">
          <span class="legend-item"><span class="legend-box row-zero"></span> Rupture</span>
          <span class="legend-item"><span class="legend-box row-low"></span> Stock bas</span>
          <span class="legend-item"><span class="legend-box row-expiring"></span> Expiration proche</span>
        </div>
      </div>
    `);

    // Pages détaillées
    for (let pg = 0; pg < totalPages; pg++) {
      const s = pg * PAGE_SIZE;
      const e = Math.min(s + PAGE_SIZE, filtered.length);
      const slice = filtered.slice(s, e);
      let rows = '';
      for (let i = 0; i < slice.length; i++) {
        const p = slice[i];
        const qty = stockMap[p.id] || 0;
        const exp = expiryMap[p.id];
        const isExp = exp && new Date(exp) <= in90Days;
        let cls = '';
        if (qty === 0) cls = 'row-zero';
        else if (qty <= (p.minStock || 0)) cls = 'row-low';
        else if (isExp) cls = 'row-expiring';
        rows += '<tr' + (cls ? ' class="' + cls + '"' : '') + '>'
          + '<td>' + (s + i + 1) + '</td>'
          + '<td><strong>' + p.name + '</strong>' + (p.dci ? '<br><small>' + p.dci + '</small>' : '') + '</td>'
          + '<td>' + (p.category || '') + '</td>'
          + '<td class="text-center">' + qty + '</td>'
          + '<td>' + UI.formatCurrency(qty * (p.purchasePrice || 0)) + '</td>'
          + '<td>' + UI.formatCurrency(qty * (p.salePrice || 0)) + '</td>'
          + '<td>' + (exp ? UI.formatDate(exp) : '') + '</td></tr>';
      }
      win.document.write(
        '<div class="report-container"' + (pg < totalPages - 1 ? ' style="page-break-after:always;"' : '') + '>'
        + '<div style="display:flex;justify-content:space-between;border-bottom:2px solid #1B4F72;padding-bottom:6px;margin-bottom:8px;">'
        + '<span style="font-size:11px;font-weight:bold;color:#1B4F72;">' + this.pharmacyInfo.name + '</span>'
        + '<span style="font-size:10px;color:#666;">Page ' + (pg + 2) + '/' + (totalPages + 1) + '</span></div>'
        + '<table class="report-table"><thead><tr><th>#</th><th>Désignation</th><th>Cat.</th><th>Qté</th><th>Achat</th><th>Vente</th><th>Exp.</th></tr></thead>'
        + '<tbody>' + rows + '</tbody></table></div>'
      );
    }

    win.document.write('<div class="report-container">' + this.footer() + '</div>');
    win.document.close();
    win.onload = function() { UI.toast('Rapport prêt', 'success'); win.print(); };
  },

  async printDestructionPV(lotId) {
    await this.loadSettings();
    const lot = await DB.dbGet('lots', lotId);
    if (!lot?.destructionDate) return;
    const products = await DB.dbGetAll('products');
    const prod = products.find(p => p.id === lot.productId);

    const win = this._openPrintWindow('Procès-Verbal de Destruction');
    win.document.write(`
      ${this._printStyles()}
      <div class="report-container">
        ${this.header('PROCÈS-VERBAL DE DESTRUCTION')}
        <h3>Procès-Verbal N° PV-DEST-${String(lotId).padStart(6, '0')}</h3>
        <div class="pv-body">
          <p>Le soussigné, <strong>${lot.destructionBy || this.pharmacyInfo.responsable}</strong>, Pharmacien responsable de l'établissement ${this.pharmacyInfo.name}, certifie avoir procédé à la destruction des médicaments suivants :</p>
          <table class="report-table" style="margin:16px 0">
            <thead><tr><th>Désignation</th><th>N° Lot</th><th>Qté détruite</th><th>Date exp.</th><th>Motif</th></tr></thead>
            <tbody>
              <tr>
                <td><strong>${prod?.name || '—'}</strong><br><small>${prod?.dci || ''} ${prod?.dosage || ''}</small></td>
                <td>${lot.lotNumber}</td>
                <td><strong>${lot.destroyedQty}</strong> unités</td>
                <td>${UI.formatDate(lot.expiryDate)}</td>
                <td>${lot.destructionReason}</td>
              </tr>
            </tbody>
          </table>
          <div class="pv-details">
            <p><strong>Méthode de destruction :</strong> ${lot.destructionMethod || '—'}</p>
            <p><strong>Date de destruction :</strong> ${UI.formatDate(lot.destructionDate)}</p>
            <p><strong>Témoins :</strong> ${lot.destructionWitnesses || 'Néant'}</p>
          </div>
          <p>Ce procès-verbal a été établi pour servir et valoir ce que de droit.</p>
          <p>Fait à Conakry, le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        ${this.footer()}
      </div>
    `);
    win.document.close();
    win.onload = () => win.print();
  },

  async printCaisseReport(date) {
    await this.loadSettings();
    date = date || new Date().toISOString().split('T')[0];
    const [sales, cashRegister] = await Promise.all([
      DB.dbGetAll('sales'),
      DB.dbGetAll('cashRegister'),
    ]);

    const daySales = sales.filter(s => s.date?.startsWith(date) && s.status === 'completed');
    const dayClosure = cashRegister.find(c => c.type === 'closure' && c.date === date);

    const breakdown = {};
    daySales.forEach(s => {
      if (!breakdown[s.paymentMethod]) breakdown[s.paymentMethod] = 0;
      breakdown[s.paymentMethod] += s.total;
    });
    const payLabels = { cash: 'Espèces', orange_money: 'Orange Money', mtn_momo: 'MTN MoMo', credit: 'Crédit', transfer: 'Virement' };
    const total = daySales.reduce((a, s) => a + s.total, 0);
    const totalDiscount = daySales.reduce((a, s) => a + (s.discount || 0), 0);

    const win = this._openPrintWindow('Rapport de Caisse');
    win.document.write(`
      ${this._printStyles()}
      <div class="report-container">
        ${this.header('RAPPORT DE CAISSE JOURNALIÈRE')}
        <h3>Journée du ${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h3>

        <table class="report-table" style="margin-bottom:16px">
          <thead><tr><th>Mode de paiement</th><th>Nombre de ventes</th><th>Montant total</th></tr></thead>
          <tbody>
            ${Object.entries(breakdown).map(([m, t]) => `
              <tr><td>${payLabels[m] || m}</td><td>${daySales.filter(s => s.paymentMethod === m).length}</td><td>${UI.formatCurrency(t)}</td></tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr><td><strong>Remises accordées</strong></td><td></td><td>-${UI.formatCurrency(totalDiscount)}</td></tr>
            <tr class="invoice-total-row"><td colspan="2"><strong>TOTAL ENCAISSÉ</strong></td><td><strong>${UI.formatCurrency(total)}</strong></td></tr>
          </tfoot>
        </table>

        ${dayClosure ? `
          <div class="pv-details">
            <p><strong>Fond d'ouverture :</strong> ${UI.formatCurrency(dayClosure.openingFund || 0)}</p>
            <p><strong>Espèces attendues :</strong> ${UI.formatCurrency(dayClosure.expectedCash || 0)}</p>
            <p><strong>Espèces comptées :</strong> ${UI.formatCurrency(dayClosure.physicalCash || 0)}</p>
            <p><strong>Écart de caisse :</strong> ${UI.formatCurrency((dayClosure.physicalCash || 0) - (dayClosure.expectedCash || 0))}</p>
            <p><strong>Clôturé par :</strong> ${dayClosure.closedBy || '—'}</p>
            ${dayClosure.note ? `<p><strong>Observations :</strong> ${dayClosure.note}</p>` : ''}
          </div>` : '<p class="text-warning"><strong>⚠️ Caisse non clôturée pour cette journée</strong></p>'}

        ${this.footer()}
      </div>
    `);
    win.document.close();
    win.onload = () => win.print();
  },

  async printPrescription(rxId) {
    await this.loadSettings();
    const rx = await DB.dbGet('prescriptions', rxId);
    if (!rx) return;

    const win = this._openPrintWindow(`Ordonnance — Rx-${String(rxId).padStart(5, '0')}`);
    win.document.write(`
      ${this._printStyles()}
      <div class="report-container">
        ${this.header('ORDONNANCE MÉDICALE')}
        
        <div class="rx-header-info" style="display:flex; justify-content:space-between; margin-bottom:24px;">
          <div class="rx-patient-side">
            <p><strong>PATIENT :</strong></p>
            <p style="font-size:14px; font-weight:bold;">${rx.patientName || 'Patient anonyme'}</p>
            ${rx.patientId ? `<p>ID: P-${String(rx.patientId).padStart(4, '0')}</p>` : ''}
          </div>
          <div class="rx-doc-side" style="text-align:right;">
            <p><strong>MÉDECIN / PRESCRIPTEUR :</strong></p>
            <p style="font-size:14px; font-weight:bold;">Dr. ${rx.doctorName || '—'}</p>
            <p>${rx.specialty || ''}</p>
          </div>
        </div>

        <div class="rx-body" style="min-height:300px; border:1px solid #1B4F72; padding:20px; border-radius:4px;">
          <h4 style="border-bottom:2px solid #1B4F72; padding-bottom:8px; margin-bottom:16px; color:#1B4F72;">MÉDICAMENTS PRESCRITS</h4>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="text-align:left; border-bottom:1px solid #ddd;">
                <th style="padding:10px 0;">Désignation</th>
                <th style="padding:10px 0;">Posologie & Durée</th>
                <th style="padding:10px 0; text-align:right;">Qté</th>
              </tr>
            </thead>
            <tbody>
              ${(rx.items || []).map(item => `
                <tr style="border-bottom:1px solid #eee;">
                  <td style="padding:12px 0;">
                    <strong style="font-size:13px;">${item.productName}</strong>
                  </td>
                  <td style="font-style:italic; color:#444;">${item.instruction || 'Selon prescription'}</td>
                  <td style="text-align:right; font-weight:bold;">${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${rx.notes ? `
            <div style="margin-top:24px; padding-top:16px; border-top:1px dashed #ccc;">
              <strong>Notes complémentaires :</strong>
              <p style="margin-top:4px;">${rx.notes}</p>
            </div>` : ''}
        </div>

        <div style="margin-top:20px; font-size:11px; color:#666; font-style:italic;">
          * Cette ordonnance a été numérisée pour archivage et dispensation contrôlée.
        </div>

        ${this.footer()}
      </div>
    `);
    win.document.close();
    win.onload = () => win.print();
  },

  _openPrintWindow(title) {
    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${title} — ${this.pharmacyInfo.name}</title></head><body>`);
    return win;
  },

  _printStyles() {
    return `<style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Arial', sans-serif; font-size: 12px; color: #000; background: white; }

      /* Ticket */
      .ticket-container { width: 80mm; margin: 0 auto; padding: 8px; font-family: monospace; }
      .ticket-logo { font-size: 28px; text-align: center; margin-bottom: 4px; }
      .ticket-name { font-size: 14px; font-weight: bold; text-align: center; }
      .ticket-addr, .ticket-phone { font-size: 10px; text-align: center; color: #666; }
      .ticket-divider { text-align: center; font-size: 11px; margin: 6px 0; color: #999; }
      .ticket-meta { margin: 6px 0; }
      .ticket-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
      .ticket-items { width: 100%; font-size: 11px; }
      .ticket-items td { padding: 2px 2px; }
      .item-name { flex: 1; }
      .item-qty { text-align: center; width: 25px; }
      .item-price { text-align: right; width: 60px; }
      .item-total { text-align: right; font-weight: bold; width: 65px; }
      .ticket-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; padding: 6px 0; border-top: 2px solid #000; margin-top: 4px; }
      .ticket-thanks, .ticket-advice, .ticket-legal { text-align: center; font-size: 10px; margin-top: 4px; color: #666; }

      /* Report & Invoice */
      .report-container, .invoice-container { max-width: 210mm; margin: 0 auto; padding: 20px; }
      .print-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 16px; }
      .print-logo { font-size: 48px; }
      .print-org { flex: 1; }
      .print-org h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
      .print-org p { font-size: 11px; color: #666; line-height: 1.4; }
      .print-doc-ref { text-align: right; }
      .print-doc-type { font-size: 16px; font-weight: bold; color: #1B4F72; }
      .print-date { font-size: 11px; color: #666; margin-top: 4px; }
      .print-divider { border-top: 2px solid #1B4F72; margin: 12px 0; }
      .invoice-ref { font-size: 13px; font-weight: bold; margin-bottom: 12px; color: #1B4F72; }

      .report-table, .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
      .report-table th, .invoice-table th { background: #1B4F72; color: white; padding: 6px 8px; text-align: left; }
      .report-table td, .invoice-table td { padding: 5px 8px; border-bottom: 1px solid #eee; }
      .report-table tfoot td, .invoice-table tfoot td { font-weight: bold; border-top: 2px solid #1B4F72; background: #f5f5f5; padding: 6px 8px; }
      .invoice-total-row td { font-size: 14px; background: #1B4F72 !important; color: white !important; }
      .row-low { background: #fff8e1; }
      .row-zero { background: #ffebee; }
      .text-danger { color: #c0392b; font-weight: bold; }
      .text-warning { color: #e67e22; }

      .pv-body p { margin-bottom: 8px; line-height: 1.6; font-size: 12px; }
      .pv-details { background: #f9f9f9; border: 1px solid #ddd; padding: 12px; border-radius: 4px; margin: 12px 0; }
      .pv-details p { margin-bottom: 4px; }

      .print-footer { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
      .print-sig-block { text-align: center; font-size: 11px; }
      .sig-line { width: 140px; border-bottom: 1px solid #000; margin: 30px auto 4px; }
      .print-footer-center { text-align: center; }
      .print-legal { font-size: 10px; color: #999; }
      .report-legend { display: flex; gap: 20px; margin-top: 8px; font-size: 11px; }
      .legend-item { display: flex; align-items: center; gap: 6px; }
      .legend-box { width: 14px; height: 14px; display: inline-block; border: 1px solid #ddd; }
      .legend-box.row-low { background: #fff8e1; }
      .legend-box.row-zero { background: #ffebee; }

      @media print {
        body { margin: 0; }
        .report-container, .invoice-container { padding: 0; }
      }
    </style>`;
  },
};

// Register print commands globally
window.PrintEngine = PrintEngine;

// Quick-access print functions
window.printReceipt = (id) => PrintEngine.printSaleReceipt(id);
window.printInvoice = (id) => PrintEngine.printInvoice(id);
window.printStockReport = (mode) => PrintEngine.printStockReport(mode);
window.printCaisseReport = (date) => PrintEngine.printCaisseReport(date);
window.printDestructionPV = (id) => PrintEngine.printDestructionPV(id);
window.printPrescription = (id) => PrintEngine.printPrescription(id);

Router.register('print', (container) => {
  container.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Centre d'Impression</h1>
    </div>

    <h3 style="margin:0 0 12px;color:var(--text-primary);">Rapports de Stock</h3>
    <div class="print-center-grid">
      <div class="print-card" onclick="printStockReport('ruptures')">
        <div class="print-card-icon" style="color:#e74c3c;"><i data-lucide="alert-circle"></i></div>
        <h3>Ruptures de Stock</h3>
        <p>Produits avec 0 unité en stock</p>
        <button class="btn btn-primary">Imprimer</button>
      </div>
      <div class="print-card" onclick="printStockReport('low')">
        <div class="print-card-icon" style="color:#f39c12;"><i data-lucide="alert-triangle"></i></div>
        <h3>Stocks Bas</h3>
        <p>Produits sous le seuil minimum configuré</p>
        <button class="btn btn-primary">Imprimer</button>
      </div>
      <div class="print-card" onclick="printStockReport('expiring')">
        <div class="print-card-icon" style="color:#e67e22;"><i data-lucide="clock"></i></div>
        <h3>Expirations Proches</h3>
        <p>Lots expirant dans les 90 prochains jours</p>
        <button class="btn btn-primary">Imprimer</button>
      </div>
      <div class="print-card" onclick="printStockReport('full')">
        <div class="print-card-icon"><i data-lucide="package"></i></div>
        <h3>Inventaire Complet</h3>
        <p>Rapport global (limité à 2 000 produits)</p>
        <button class="btn btn-primary">Imprimer</button>
      </div>
    </div>

    <h3 style="margin:24px 0 12px;color:var(--text-primary);">Autres Documents</h3>
    <div class="print-center-grid">
      <div class="print-card" onclick="printCaisseReport()">
        <div class="print-card-icon"><i data-lucide="banknote"></i></div>
        <h3>Rapport de Caisse du Jour</h3>
        <p>Récapitulatif des encaissements journaliers</p>
        <button class="btn btn-primary">Imprimer</button>
      </div>
      <div class="print-card" onclick="Router.navigate('sales')">
        <div class="print-card-icon"><i data-lucide="file-text"></i></div>
        <h3>Facture / Ticket de Caisse</h3>
        <p>Imprimer depuis l'historique des ventes</p>
        <button class="btn btn-secondary">Aller aux ventes <i data-lucide="arrow-right"></i></button>
      </div>
      <div class="print-card" onclick="Router.navigate('traceability')">
        <div class="print-card-icon"><i data-lucide="trash-2"></i></div>
        <h3>PV de Destruction</h3>
        <p>Procès-verbal réglementaire de destruction</p>
        <button class="btn btn-secondary">Aller à la traçabilité <i data-lucide="arrow-right"></i></button>
      </div>
    </div>`;
  if (window.lucide) lucide.createIcons();
});
