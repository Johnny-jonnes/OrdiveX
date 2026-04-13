const fs = require('fs');

let content = fs.readFileSync('supabase_schema.sql', 'utf8');

// Find the start of the SECURITY section
const securityIndex = content.indexOf('-- 17. SÉCURITÉ — Row Level Security (RLS)');
if (securityIndex !== -1) {
    // Keep everything before the security section
    content = content.substring(0, securityIndex);
}

// Ensure the 16 tables are the ACTUALLY created ones
const validTables = [
  'products', 'lots', 'stock', 'movements', 'suppliers',
  'purchaseOrders', 'patients', 'prescriptions', 'sales',
  'saleItems', 'alerts', 'returns', 'cashRegister',
  'auditLog', 'app_users', 'settings'
];

let sqlAppend = '-- ═══════════════════════════════════════════════════════════════\n';
sqlAppend += '-- 17. SÉCURITÉ — Row Level Security (RLS Strict)\n';
sqlAppend += '-- ═══════════════════════════════════════════════════════════════\n\n';

for (const table of validTables) {
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

// There are migrations blocks at the end (18 and 19), so let's put them BEFORE the security block or AFTER.
// Wait, the original content has the migration blocks 18 and 19 starting at line 340. 
// If I stripped from '-- 17', I stripped the migrations too. Let's restore them.

let migrations = `
-- ═══════════════════════════════════════════════════════════════
-- 18. MIGRATION — Ajout colonnes manquantes (v3.6.0)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destroyedQty" INTEGER DEFAULT 0;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionDate" TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionReason" TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionMethod" TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionWitnesses" TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionBy" TEXT;

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "lotId" BIGINT;

-- ═══════════════════════════════════════════════════════════════
-- 19. MIGRATION — Colonnes manquantes purchaseOrders (v4.0.1)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS "orderNumber" TEXT;
ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS "expectedDate" TEXT;
ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS "createdBy" BIGINT;
ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS "receivedAt" TEXT;
ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS "receiveNote" TEXT;
ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS "hasNonConformity" BOOLEAN DEFAULT false;

-- ═══════════════════════════════════════════════════════════════
-- ✅ TERMINÉ — Toutes les tables sont prêtes. v4.0.1-stable
-- ═══════════════════════════════════════════════════════════════
`;

fs.writeFileSync('supabase_schema.sql', content + migrations + '\n' + sqlAppend);
console.log('Schema fixed!');
