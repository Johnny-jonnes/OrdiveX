const fs = require('fs');
const prefix = ['A', 'B', 'C', 'D', 'E', 'F'];
const suffix = ['500mg', '250mg', '100mg', '1g', 'Sir', 'Inj'];
const forms = ['Comprime', 'Sirop', 'Gelule', 'Injection', 'Pommade'];
const cats = ['Antibiotique', 'Antipaludeen', 'Antalgique', 'Vitamine', 'Anti-inflammatoire'];

let csv = 'name,code,barcode,category,form,purchasePrice,salePrice,minStock,taxRate,prescription,status\n';
for(let i=1; i<=50000; i++) {
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const s = suffix[Math.floor(Math.random() * suffix.length)];
  const f = forms[Math.floor(Math.random() * forms.length)];
  const c = cats[Math.floor(Math.random() * cats.length)];
  
  const name = 'PROD_'+p+(i%1000)+'_'+s+'_'+f;
  const code = 'PRD_'+i.toString().padStart(6,'0');
  let barcode = '3400'+i.toString().padStart(8,'0');
  if (i%5===0) barcode = '';
  
  const pp = 1000 + (Math.floor(Math.random()*10)*500);
  const sp = Math.floor(pp * 1.3);
  
  csv += `${name},${code},${barcode},${c},${f},${pp},${sp},10,0,false,active\n`;
}
fs.writeFileSync('C:\\Users\\LUXE\\Desktop\\OrdiveX_v4\\Pharmacie_50000_Produits_Supabase.csv', csv);
console.log('CSV de 50 000 produits créé sur le Bureau\\OrdiveX_v4 !');
