-- ============================================================
-- Stock RPCs: agregar SECURITY DEFINER
-- Motivo: la tabla products tiene RLS con UPDATE restringido a
-- role='admin'. Sin SECURITY DEFINER las funciones corrían como
-- el usuario llamante (authenticated) y el UPDATE se filtraba en
-- silencio para vendedores → la función devolvía NULL → el POS
-- mostraba "Stock insuficiente" aunque hubiera stock real.
-- Con SECURITY DEFINER las funciones corren como su owner
-- (postgres) y bypasean RLS. La validación de cantidades sigue
-- adentro de la función. SET search_path explícito previene
-- search-path injection.
-- Ejecutar en Supabase > SQL Editor.
-- ============================================================
SET search_path TO public;

CREATE OR REPLACE FUNCTION decrement_stock(p_product_id INT, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  RETURN v_new_stock;
END;
$$;

CREATE OR REPLACE FUNCTION increment_stock(p_product_id INT, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION decrement_stock_clamped(p_product_id INT, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
