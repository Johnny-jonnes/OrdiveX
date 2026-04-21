const fs = require('fs');

console.log('⏳ Début de la génération de la base de données OrdiveX...');

// ── Dictionnaires
const prefix = ['Amox', 'Para', 'Ibu', 'Doxy', 'Arthe', 'Cipro', 'Mebe', 'Vita', 'Ome', 'Vogal'];
const suffix = ['500mg', '250mg', '100mg', '1g', 'Sir', 'Inj', 'Gel'];
const forms = ['Comprimé', 'Sirop', 'Gélule', 'Injection', 'Pommade', 'Sachet'];
const cats = ['Antibiotique', 'Antipaludéen', 'Antalgique', 'Vitamine', 'Anti-inflammatoire'];
const dcis = ['Paracétamol', 'Amoxicilline', 'Ibuprofène', 'Artéméther', 'Ciprofloxacine', 'Oméprazole'];

const fnames = ['Mamadou', 'Aminata', 'Fatoumata', 'Ibrahima', 'Oumar', 'Awa', 'Sekou', 'Mariam', 'Aboubacar', 'Kadiatou'];
const lnames = ['Diallo', 'Barry', 'Camara', 'Sylla', 'Toure', 'Keita', 'Traore', 'Cisse', 'Conde', 'Soumah'];
const allergies = ['Pénicilline', 'Aspirine', 'Arachide', 'Iode', 'Aucune'];

// ── Base de données
const db = {
  _version: '1.0',
  _exportDate: new Date().toISOString(),
  products: [],
  patients: [],
  stock: [],
  lots: []
};

// ── 1. Génération de 100 000 Produits et Stocks
console.log('📦 Génération de 100 000 médicaments...');
for (let i = 1; i <= 100000; i++) {
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const s = suffix[Math.floor(Math.random() * suffix.length)];
  const f = forms[Math.floor(Math.random() * forms.length)];
  const c = cats[Math.floor(Math.random() * cats.length)];
  const dci = dcis[Math.floor(Math.random() * dcis.length)];
  
  const name = p + ' ' + s + ' ' + f + ' (Lot ' + (i%100) + ')';
  const code = 'PRD_' + String(i).padStart(6, '0');
  
  const pp = 500 + Math.floor(Math.random() * 50) * 100;
  const sp = Math.floor(pp * 1.3);

  // Produit
  db.products.push({
    id: i,
    code: code,
    name: name,
    dci: dci,
    category: c,
    form: f,
    purchasePrice: pp,
    salePrice: sp,
    minStock: 10,
    allowUnitSale: i % 3 === 0, // 33% des produits sont déconditionnables
    unitsPerBox: 3,
    subUnitsPerBox: 10,
    pricePerSubUnit: Math.floor((sp/3)*1.1),
    pricePerUnit: Math.floor((sp/30)*1.2),
    status: 'active'
  });

  // Stock et Lots
  const qty = Math.floor(Math.random() * 500) + 10;
  
  db.stock.push({
    id: i,
    productId: i,
    quantity: qty,
    minQuantity: 10,
    lastUpdate: new Date().toISOString()
  });

  db.lots.push({
    id: i,
    productId: i,
    lotNumber: 'LOT-' + String(i).padStart(5, '0'),
    quantity: qty,
    productionDate: '2025-01-01',
    expiryDate: '2028-12-31',
    status: 'active'
  });

  if (i % 25000 === 0) console.log(`   ... ${i} médicaments générés`);
}

// ── 2. Génération de 30 000 Patients
console.log('👤 Génération de 30 000 dossiers patients...');
for (let i = 1; i <= 30000; i++) {
  const fn = fnames[Math.floor(Math.random() * fnames.length)];
  const ln = lnames[Math.floor(Math.random() * lnames.length)];
  const al = allergies[Math.floor(Math.random() * allergies.length)];

  db.patients.push({
    id: i,
    name: fn + ' ' + ln,
    phone: '62' + String(Math.floor(Math.random() * 9000000) + 1000000), // Ex: 62x xxx xxx
    address: 'Conakry, Quartier ' + (i%50),
    allergies: al === 'Aucune' ? '' : al,
    createdAt: new Date().toISOString(),
    creditLimit: i % 5 === 0 ? 500000 : 0
  });

  if (i % 10000 === 0) console.log(`   ... ${i} dossiers patients générés`);
}

// ── Écriture dans un fichier JSON (Backup restaurable dans OrdiveX)
console.log('💾 Sauvegarde du fichier JSON...');
fs.writeFileSync('OrdiveX_Data_Massive_Backup.json', JSON.stringify(db));

console.log('✅ TERMINÉ !');
console.log('👉 Fichier "OrdiveX_Data_Massive_Backup.json" créé.');
console.log('👉 Allez dans Paramètres > "Restaurer une sauvegarde" pour charger ce fichier en un seul clic !');
