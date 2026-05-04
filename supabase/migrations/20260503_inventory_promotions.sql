-- ============================================================
-- MIGRACIÓN: inventory_entries + promotions + promotion_products
-- Ejecutar en Supabase > SQL Editor
-- ============================================================
SET search_path TO public;

-- ------------------------------------------------------------
-- TABLA: inventory_entries
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_entries (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity    INT NOT NULL CHECK (quantity > 0),
  cost        NUMERIC(10,2),
  supplier    TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inventory"
  ON inventory_entries
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

GRANT ALL ON inventory_entries TO service_role;
GRANT SELECT, INSERT ON inventory_entries TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE inventory_entries_id_seq TO authenticated;

-- ------------------------------------------------------------
-- TABLA: promotions
-- type: pct_discount | fixed_discount | 2x1 | NxM | combo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('pct_discount','fixed_discount','2x1','NxM','combo')),
  value        NUMERIC(10,2),
  buy_qty      INT,
  pay_qty      INT,
  combo_price  NUMERIC(10,2),
  active       BOOLEAN DEFAULT TRUE,
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promotions"
  ON promotions
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Authenticated read promotions"
  ON promotions
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT ALL ON promotions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON promotions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE promotions_id_seq TO authenticated;

-- ------------------------------------------------------------
-- TABLA: promotion_products
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotion_products (
  promotion_id INT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id   INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, product_id)
);

ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promotion_products"
  ON promotion_products
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Authenticated read promotion_products"
  ON promotion_products
  FOR SELECT USING (auth.role() = 'authenticated');

GRANT ALL ON promotion_products TO service_role;
GRANT SELECT, INSERT, DELETE ON promotion_products TO authenticated;
