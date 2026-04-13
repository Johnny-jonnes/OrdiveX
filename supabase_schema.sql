-- ============================================================
-- PHARMA_PROJET v3.2.1 — Schéma Supabase COMPLET (STABLE)
-- 
-- DESCRIPTION :
-- Ce fichier contient la structure complète de la base de données 
-- Supabase pour PharmaProjet. Il inclut toutes les tables, 
-- types de données et politiques de sécurité (RLS).
-- ============================================================

-- ═══════════════════════════════════════════════════════════════
-- 0. NETTOYAGE — Supprime les tables existantes (ordre = dépendances)
-- ═══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS "cashRegister" CASCADE;
DROP TABLE IF EXISTS "auditLog" CASCADE;
DROP TABLE IF EXISTS "app_users" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "returns" CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS "saleItems" CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS movements CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS lots CASCADE;
DROP TABLE IF EXISTS "purchaseOrders" CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS prescriptions CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- 1. TABLE PRODUCTS — Catalogue des médicaments
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE products (
  id                      BIGINT PRIMARY KEY,
  code                    TEXT,
  name                    TEXT,
  dci                     TEXT,
  brand                   TEXT,
  form                    TEXT,
  dosage                  TEXT,
  category                TEXT,
  "requiresPrescription"  BOOLEAN DEFAULT false,
  "minStock"              INTEGER DEFAULT 10,
  "salePrice"             NUMERIC DEFAULT 0,
  "purchasePrice"         NUMERIC DEFAULT 0,
  "vatRate"               NUMERIC DEFAULT 0,
  unit                    TEXT DEFAULT 'boîte',
  status                  TEXT DEFAULT 'active',
  "expiryDate"            TEXT,
  -- ═══ NOTICE MÉDICALE (Feature 4) ═══
  "dosageInstructions"    TEXT,
  "precautions"           TEXT,
  "contraindications"     TEXT,
  "sideEffects"           TEXT,
  "medicalNotice"         TEXT,
  -- ═══ DÉCONDITIONNEMENT (Feature 1) ═══
  "unitsPerBox"           INTEGER DEFAULT 1,
  "pricePerUnit"          NUMERIC DEFAULT 0,
  "allowUnitSale"         BOOLEAN DEFAULT false,
  "updatedAt"             BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 2. TABLE LOTS — Gestion des lots
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE lots (
  id                      BIGINT PRIMARY KEY,
  "productId"             BIGINT,
  "lotNumber"             TEXT,
  "expiryDate"            TEXT,
  quantity                INTEGER DEFAULT 0,
  "initialQuantity"       INTEGER DEFAULT 0,
  "supplierId"            BIGINT,
  "receiptDate"           TEXT,
  status                  TEXT DEFAULT 'active',
  "updatedAt"             BIGINT,
  "destroyedQty"          INTEGER DEFAULT 0,
  "destructionDate"       TEXT,
  "destructionReason"     TEXT,
  "destructionMethod"     TEXT,
  "destructionWitnesses"  TEXT,
  "destructionBy"         TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- 3. TABLE STOCK — État du stock par produit
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE stock (
  id                  BIGINT PRIMARY KEY,
  "productId"         BIGINT,
  quantity            INTEGER DEFAULT 0,
  "reservedQuantity"  INTEGER DEFAULT 0,
  "lastUpdated"       BIGINT,
  "updatedAt"         BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 4. TABLE MOVEMENTS — Historique des mouvements
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE movements (
  id            BIGINT PRIMARY KEY,
  "productId"   BIGINT,
  type          TEXT,
  "subType"     TEXT,
  quantity      INTEGER DEFAULT 0,
  "lotNumber"   TEXT,
  date          TEXT,
  "userId"      BIGINT,
  note          TEXT,
  reference     TEXT,
  "updatedAt"   BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 5. TABLE SUPPLIERS — Fournisseurs
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE suppliers (
  id              BIGINT PRIMARY KEY,
  name            TEXT,
  contact         TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  status          TEXT DEFAULT 'active',
  "agrément"      TEXT,
  "paymentTerms"  INTEGER DEFAULT 30,
  "updatedAt"     BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 6. TABLE PURCHASE_ORDERS — Bons de commande
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "purchaseOrders" (
  id              BIGINT PRIMARY KEY,
  "supplierId"    BIGINT,
  "orderNumber"   TEXT,
  status          TEXT DEFAULT 'draft',
  date            TEXT,
  "expectedDate"  TEXT,
  "totalAmount"   NUMERIC DEFAULT 0,
  items           JSONB,
  note            TEXT,
  "createdBy"     BIGINT,
  "receivedAt"    TEXT,
  "receiveNote"   TEXT,
  "hasNonConformity" BOOLEAN DEFAULT false,
  "updatedAt"     BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 7. TABLE PATIENTS — Dossiers patients
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE patients (
  id          BIGINT PRIMARY KEY,
  name        TEXT,
  phone       TEXT,
  dob         TEXT,
  allergies   TEXT,
  address     TEXT,
  assurances  JSONB, -- Tableau d'assurances [{"name": "CNSS", "coverage": 80, "ref": "123"}]
  "updatedAt" BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 8. TABLE PRESCRIPTIONS — Ordonnances médicales
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE prescriptions (
  id            BIGINT PRIMARY KEY,
  "patientId"   BIGINT,
  date          TEXT,
  status        TEXT DEFAULT 'pending',
  "doctorName"  TEXT,
  items         JSONB,
  "updatedAt"   BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 9. TABLE SALES — Ventes
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE sales (
  id                BIGINT PRIMARY KEY,
  date              TEXT,
  "patientId"       BIGINT,
  "patientName"     TEXT,
  "patientPhone"    TEXT,
  "userId"          BIGINT,
  "sellerName"      TEXT,
  total             NUMERIC DEFAULT 0,
  subtotal          NUMERIC DEFAULT 0,
  discount          NUMERIC DEFAULT 0,
  "paymentMethod"   TEXT,
  "mmPhone"         TEXT,
  status            TEXT DEFAULT 'completed',
  "prescriptionId"  BIGINT,
  "prescriptionRef" TEXT,
  "doctorName"      TEXT,
  "itemCount"       INTEGER DEFAULT 0,
  "creditDueDate"   TEXT,
  "cashReceived"    NUMERIC,
  "returnStatus"    TEXT,
  "lastReturnId"    BIGINT,
  "lastReturnDate"  TEXT,
  "insuranceDetails" JSONB, -- Détails de prise en charge multi-assurances
  "updatedAt"       BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 10. TABLE SALE_ITEMS — Détails des lignes de vente
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "saleItems" (
  id              BIGINT PRIMARY KEY,
  "saleId"        BIGINT,
  "productId"     BIGINT,
  "productName"   TEXT,
  quantity        INTEGER DEFAULT 0,
  "unitPrice"     NUMERIC DEFAULT 0,
  "purchasePrice" NUMERIC DEFAULT 0,
  "lotId"         BIGINT,
  total           NUMERIC DEFAULT 0,
  "updatedAt"     BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 11. TABLE ALERTS — Alertes système
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE alerts (
  id            BIGINT PRIMARY KEY,
  type          TEXT,
  "productId"   BIGINT,
  "productName" TEXT,
  message       TEXT,
  status        TEXT DEFAULT 'unread',
  date          BIGINT,
  priority      TEXT DEFAULT 'medium',
  "lotId"       BIGINT,
  "updatedAt"   BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 12. TABLE RETURNS — Retours clients
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "returns" (
  id              BIGINT PRIMARY KEY,
  "saleId"        BIGINT,
  "saleRef"       TEXT,
  "patientId"     BIGINT,
  "patientName"   TEXT,
  date            TEXT,
  reason          TEXT,
  items           JSONB,
  "refundAmount"  NUMERIC DEFAULT 0,
  "isFullReturn"  BOOLEAN DEFAULT false,
  status          TEXT DEFAULT 'approved',
  "paymentMethod" TEXT,
  "processedBy"   TEXT,
  "updatedAt"     BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 13. TABLE CASH_REGISTER — Caisse journalière & Clôtures
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "cashRegister" (
  id                BIGINT PRIMARY KEY,
  type              TEXT, -- 'income', 'expense', 'closure'
  amount            NUMERIC DEFAULT 0,
  "paymentMethod"   TEXT,
  reason            TEXT,
  date              TEXT,
  "timestamp"       BIGINT,
  "userId"          BIGINT,
  "closedAt"        BIGINT,
  "closedBy"        TEXT,
  "openingFund"     NUMERIC DEFAULT 0,
  "expectedCash"    NUMERIC DEFAULT 0,
  "physicalCash"    NUMERIC DEFAULT 0,
  "totalSales"      NUMERIC DEFAULT 0,
  "transactionCount" BIGINT DEFAULT 0,
  "note"            TEXT,
  "updatedAt"       BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 14. TABLE AUDIT_LOG — Journal d'audit (traçabilité)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "auditLog" (
  id          BIGINT PRIMARY KEY,
  "userId"    BIGINT,
  username    TEXT,
  action      TEXT,
  entity      TEXT,
  "entityId"  BIGINT,
  details     JSONB,
  "timestamp" BIGINT,
  ip          TEXT,
  "updatedAt" BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 15. TABLE APP_USERS — Gestion des utilisateurs
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE "app_users" (
  id          BIGINT PRIMARY KEY,
  name        TEXT,
  email       TEXT,
  username    TEXT UNIQUE,
  password    TEXT,
  role        TEXT,
  active      BOOLEAN DEFAULT true,
  "updatedAt" BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 16. TABLE SETTINGS — Paramètres clé/valeur
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  "updatedAt" BIGINT
);

-- ═══════════════════════════════════════════════════════════════
-- 17. SÉCURITÉ — Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════
-- On active RLS et on autorise tout accès via clé anon pour le PWA.
-- ═══════════════════════════════════════════════════════════════

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I', t);
        EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 18. MIGRATION — Ajout colonnes manquantes (v3.6.0)
-- Exécuter ce bloc si la base existe déjà (ALTER TABLE).
-- ═══════════════════════════════════════════════════════════════

-- Colonnes destruction dans lots
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destroyedQty" INTEGER DEFAULT 0;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionDate" TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionReason" TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionMethod" TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionWitnesses" TEXT;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS "destructionBy" TEXT;

-- Colonne lotId dans alerts
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS "lotId" BIGINT;

-- ═══════════════════════════════════════════════════════════════
-- 19. MIGRATION — Colonnes manquantes purchaseOrders (v4.0.1)
-- Fix sync errors: ces colonnes sont utilisées localement
-- mais n'existaient pas dans le schéma Supabase original.
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
