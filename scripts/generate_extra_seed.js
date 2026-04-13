const fs = require('fs');

const generateExtraSeed = () => {
  const chunkSize = 5000;
  
  console.log('-- Generation du seed SQL extra: 20,000+ autres données...');
  const fd = fs.openSync('seed_20k_extra.sql', 'w');
  
  // 1. Génération de 10 000 Patients
  let patientsSql = '-- Seed 10,000 Patients\n';
  patientsSql += 'INSERT INTO patients (id, name, phone, dob, gender, address, allergies, "medicalHistory", assurances, synced) VALUES\n';
  
  const firstNames = ['Amadou', 'Fatou', 'Mamadou', 'Oumar', 'Awa', 'Ibrahim', 'Mariam', 'Abdoulaye', 'Aissatou', 'Ousmane'];
  const lastNames = ['Diallo', 'Barry', 'Bah', 'Sow', 'Sylla', 'Camara', 'Traoré', 'Cissé', 'Keita', 'Touré'];
  const cities = ['Conakry', 'Dakar', 'Abidjan', 'Bamako', 'Niamey', 'Ouagadougou'];
  
  let patientsContent = [];
  for (let i = 1; i <= 10000; i++) {
    const name = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    const phone = `+2246${Math.floor(Math.random() * 90000000 + 10000000)}`;
    const gender = Math.random() > 0.5 ? 'M' : 'F';
    const address = `${cities[Math.floor(Math.random() * cities.length)]}`;
    
    // Some random JSON for assurances
    let assurances = 'NULL';
    if (Math.random() > 0.7) {
      assurances = `'[{"name": "ASCOMA", "coverage": 80, "ref": "REF-${i}"}]'`;
    }
    
    patientsContent.push(`(${i}, '${name.replace(/'/g, "''")}', '${phone}', '19${Math.floor(Math.random()*40)+50}-01-01', '${gender}', '${address}', NULL, NULL, ${assurances}, true)`);
    
    if (patientsContent.length === chunkSize || i === 10000) {
      fs.writeSync(fd, patientsSql + patientsContent.join(',\n') + ';\n\n');
      patientsSql = 'INSERT INTO patients (id, name, phone, dob, gender, address, allergies, "medicalHistory", assurances, synced) VALUES\n';
      patientsContent = [];
    }
  }

  // 2. Génération de 10 000 Ventes (Sales)
  let salesSql = '-- Seed 10,000 Sales\n';
  salesSql += 'INSERT INTO sales (id, date, "patientId", "patientName", "userId", "sellerName", total, subtotal, discount, "paymentMethod", status, "itemCount", "insuranceDetails", synced) VALUES\n';
  
  let salesContent = [];
  for (let i = 1; i <= 10000; i++) {
    const amount = Math.floor(Math.random() * 500000) + 10000;
    const patientId = Math.floor(Math.random() * 10000) + 1;
    const methods = ['cash', 'orange_money', 'assurance'];
    const method = methods[Math.floor(Math.random() * methods.length)];
    const status = 'completed';
    
    let insuranceDetails = 'NULL';
    if (method === 'assurance') {
       insuranceDetails = `'[{"name":"ASCOMA","ref":"X","amount":${amount * 0.8}}]'`;
    }
    
    salesContent.push(`(${i}, '${new Date(Date.now() - Math.random() * 10000000000).toISOString()}', ${patientId}, 'Patient ${patientId}', 1, 'Admin', ${amount}, ${amount}, 0, '${method}', '${status}', ${Math.floor(Math.random() * 5) + 1}, ${insuranceDetails}, true)`);
    
    if (salesContent.length === chunkSize || i === 10000) {
      fs.writeSync(fd, salesSql + salesContent.join(',\n') + ';\n\n');
      salesSql = 'INSERT INTO sales (id, date, "patientId", "patientName", "userId", "sellerName", total, subtotal, discount, "paymentMethod", status, "itemCount", "insuranceDetails", synced) VALUES\n';
      salesContent = [];
    }
  }
  
  fs.closeSync(fd);
  console.log('Fichier seed_20k_extra.sql généré avec succès !');
}

generateExtraSeed();
