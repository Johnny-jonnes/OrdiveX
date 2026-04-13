const fs = require('fs');

const generateSeed = () => {
  console.log('-- Generation du seed SQL: 50,000 medicaments...');
  
  const forms = ['Comprimé', 'Sirop', 'Gélule', 'Injection', 'Pommade', 'Suppositoire', 'Gouttes'];
  const categories = ['Antalgique', 'Antibiotique', 'Antipaludéen', 'Vitamines', 'Cardiologie', 'Dermatologie', 'Pédiatrie'];
  
  let id = 1000;
  
  let currentRows = [];
  let fileIndex = 1;

  for (let i = 1; i <= 50000; i++) {
    id++;
    const form = forms[Math.floor(Math.random() * forms.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const rx = Math.random() > 0.6;
    const sale = Math.floor(Math.random() * 500) * 100 + 5000;
    const purc = Math.floor(sale * 0.7);
    const code = `P${String(id).padStart(6, '0')}`;
    
    // Simulate some text for the 20k extra info (instructions/side effects)
    let dosageInstructions = 'NULL';
    let sideEffects = 'NULL';
    if (i <= 20000) {
      dosageInstructions = "'Prendre 1 après les repas'";
      sideEffects = "'Peut causer des somnolences ou nausées'";
    }
    
    const row = `(${id}, '${code}', 'Produit Medicament ${i}', 'DCI ${i}', 'Marque ${i}', '${form}', 'Ajusté', '${category}', ${rx}, 10, ${sale}, ${purc}, 30, ${Math.floor(sale / 30)}, true, 'active', ${dosageInstructions}, ${sideEffects})`;
    
    currentRows.push(row);

    if (currentRows.length === 2500 || i === 50000) {
        let chunkSql = 'INSERT INTO products (id, code, name, dci, brand, form, dosage, category, "requiresPrescription", "minStock", "salePrice", "purchasePrice", "unitsPerBox", "pricePerUnit", "allowUnitSale", status, "dosageInstructions", "sideEffects") VALUES\n' + currentRows.join(',\n') + ';\n\n';
        fs.writeFileSync(`scripts/seed_50k_part_${fileIndex}.sql`, chunkSql);
        currentRows = [];
        fileIndex++;
    }
  }
  
  console.log('Fichiers seed_50k_part générés avec succès !');
}

generateSeed();
