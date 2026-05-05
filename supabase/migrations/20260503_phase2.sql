-- ============================================================
-- FASE 2: métodos de pago, anulación, pérdidas, caja
-- ============================================================

-- Payment methods on sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'efectivo'
  CHECK (payment_method IN ('efectivo','sinpe','mixto'));
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sinpe_amount NUMERIC(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(10,2);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_code TEXT;

-- Cancellation fields on sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Losses table
CREATE TABLE IF NOT EXISTS losses (
  id          SERIAL PRIMARY KEY,
  product_id  INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity    INT NOT NULL CHECK (quantity > 0),
  reason      TEXT NOT NULL,
  cost        NUMERIC(10,2),
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE losses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage losses"
  ON losses
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

GRANT ALL ON losses TO service_role;
GRANT SELECT, INSERT ON losses TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE losses_id_seq TO authenticated;

-- Cash movements table
CREATE TABLE IF NOT EXISTS cash_movements (
  id           SERIAL PRIMARY KEY,
  type         TEXT NOT NULL CHECK (type IN ('ingreso','egreso')),
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  description  TEXT NOT NULL,
  category     TEXT,
  reference_id INT,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access cash_movements"
  ON cash_movements
  USING (auth.role() = 'authenticated');

GRANT ALL ON cash_movements TO service_role;
GRANT SELECT, INSERT ON cash_movements TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE cash_movements_id_seq TO authenticated;
