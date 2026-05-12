-- ============================================================
-- Nuevo tipo de promoción: 'bundle'
-- "N unidades por ₡X" (precio fijo por paquete de cantidad).
-- Reusa columnas existentes: buy_qty (tamaño del paquete)
-- y combo_price (precio del paquete).
-- Ejecutar en Supabase > SQL Editor.
-- ============================================================
SET search_path TO public;

ALTER TABLE promotions DROP CONSTRAINT IF EXISTS promotions_type_check;

ALTER TABLE promotions
  ADD CONSTRAINT promotions_type_check
  CHECK (type IN ('pct_discount', 'fixed_discount', '2x1', 'NxM', 'combo', 'bundle'));
