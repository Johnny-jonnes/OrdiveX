const fs = require('fs');

const tables = [
  'cashRegister', 'auditLog', 'app_users', 'users', 'returns', 'alerts',
  'saleItems', 'sales', 'movements', 'stock', 'lots', 'purchaseOrders',
  'suppliers', 'prescriptions', 'patients', 'products', 'settings'
];

let sqlAppend = '\n-- ═══════════════════════════════════════════════════════════════\n';
sqlAppend += '-- SECURITÉ & RLS (Row Level Security)\n';
sqlAppend += '-- ═══════════════════════════════════════════════════════════════\n\n';

for (const table of tables) {
  // Enclose table name in quotes if it has capital letters
  const safeTable = `"${table}"`;
  
  sqlAppend += `-- RLS pour ${table}\n`;
  sqlAppend += `ALTER TABLE ${safeTable} ENABLE ROW LEVEL SECURITY;\n`;
  
  sqlAppend += `DROP POLICY IF EXISTS "${table}_policy_select" ON ${safeTable};\n`;
  sqlAppend += `CREATE POLICY "${table}_policy_select" ON ${safeTable} FOR SELECT USING (auth.uid() IS NOT NULL);\n`;

  sqlAppend += `DROP POLICY IF EXISTS "${table}_policy_insert" ON ${safeTable};\n`;
  sqlAppend += `CREATE POLICY "${table}_policy_insert" ON ${safeTable} FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);\n`;
  
  sqlAppend += `DROP POLICY IF EXISTS "${table}_policy_update" ON ${safeTable};\n`;
  sqlAppend += `CREATE POLICY "${table}_policy_update" ON ${safeTable} FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);\n`;
  
  sqlAppend += `DROP POLICY IF EXISTS "${table}_policy_delete" ON ${safeTable};\n`;
  sqlAppend += `CREATE POLICY "${table}_policy_delete" ON ${safeTable} FOR DELETE USING (auth.uid() IS NOT NULL);\n\n`;
}

fs.appendFileSync('supabase_schema.sql', sqlAppend);
console.log('RLS policies appended successfully!');
