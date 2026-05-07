/*
  Limpieza transaccional — borra TODO el historial de movimientos
  pero conserva: profiles, products, categories, customers, promotions, promotion_products.

  Orden importante (respeta FKs):
    sale_items  -> sales
    sales
    cash_movements
    inventory_entries
    losses
    audit_log
*/

BEGIN;

TRUNCATE TABLE
  sale_items,
  sales,
  cash_movements,
  inventory_entries,
  losses,
  audit_log
RESTART IDENTITY CASCADE;

COMMIT;

/* Verificación — todos deben dar 0 */
SELECT
  (SELECT count(*) FROM sales)              AS sales,
  (SELECT count(*) FROM sale_items)         AS sale_items,
  (SELECT count(*) FROM cash_movements)     AS cash_movements,
  (SELECT count(*) FROM inventory_entries)  AS inventory_entries,
  (SELECT count(*) FROM losses)             AS losses,
  (SELECT count(*) FROM audit_log)          AS audit_log;
