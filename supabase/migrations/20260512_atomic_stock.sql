-- ============================================================
-- RPCs atómicas para movimiento de stock
-- Resuelven races por lectura-luego-escritura en JS bajo
-- ventas/devoluciones/inventario concurrentes.
-- Ejecutar en Supabase > SQL Editor.
-- ============================================================
SET search_path TO public;

-- Decremento condicional: devuelve el nuevo stock o NULL si insuficiente.
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id INT, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock INT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'p_qty debe ser positivo';
  END IF;

  UPDATE products
     SET stock = stock - p_qty
   WHERE id = p_product_id
     AND stock >= p_qty
  RETURNING stock INTO v_new_stock;

  RETURN v_new_stock; -- NULL si no hubo match (stock insuficiente o producto inexistente)
END;
$$;

-- Incremento simple: devuelve el nuevo stock o NULL si el producto no existe.
CREATE OR REPLACE FUNCTION increment_stock(p_product_id INT, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock INT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'p_qty debe ser positivo';
  END IF;

  UPDATE products
     SET stock = stock + p_qty
   WHERE id = p_product_id
  RETURNING stock INTO v_new_stock;

  RETURN v_new_stock;
END;
$$;

-- Decremento con piso en 0 (para pérdidas: si el inventario real ya estaba mal,
-- no bloquea el registro de la pérdida, solo deja stock en 0).
CREATE OR REPLACE FUNCTION decrement_stock_clamped(p_product_id INT, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_stock INT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'p_qty debe ser positivo';
  END IF;

  UPDATE products
     SET stock = GREATEST(0, stock - p_qty)
   WHERE id = p_product_id
  RETURNING stock INTO v_new_stock;

  RETURN v_new_stock;
END;
$$;

GRANT EXECUTE ON FUNCTION decrement_stock(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_stock(INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_stock_clamped(INT, INT) TO authenticated;
