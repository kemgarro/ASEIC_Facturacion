export const AUDIT_TYPE_LABELS: Record<string, string> = {
  venta_creada: 'Venta',
  venta_anulada: 'Anulación',
  producto_creado: 'Producto creado',
  producto_editado: 'Producto editado',
  inventario_entrada: 'Inventario',
  perdida_registrada: 'Pérdida',
  caja_movimiento: 'Caja',
  promocion_creada: 'Promoción creada',
  promocion_editada: 'Promoción editada',
}

export const AUDIT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  venta_creada: { bg: '#dcfce7', color: '#16a34a' },
  venta_anulada: { bg: '#fee2e2', color: '#dc2626' },
  producto_creado: { bg: '#dbeafe', color: '#2563eb' },
  producto_editado: { bg: '#e0e7ff', color: '#4338ca' },
  inventario_entrada: { bg: '#dbeafe', color: '#2563eb' },
  perdida_registrada: { bg: '#fef3c7', color: '#d97706' },
  caja_movimiento: { bg: '#f3e8ff', color: '#7c3aed' },
  promocion_creada: { bg: '#fce7f3', color: '#be185d' },
  promocion_editada: { bg: '#fce7f3', color: '#be185d' },
}

export const AUDIT_TYPE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'venta_creada', label: 'Ventas' },
  { value: 'venta_anulada', label: 'Anulaciones' },
  { value: 'inventario_entrada', label: 'Inventario' },
  { value: 'perdida_registrada', label: 'Pérdidas' },
  { value: 'caja_movimiento', label: 'Caja' },
  { value: 'producto_creado', label: 'Productos creados' },
  { value: 'producto_editado', label: 'Productos editados' },
  { value: 'promocion_creada', label: 'Promociones creadas' },
  { value: 'promocion_editada', label: 'Promociones editadas' },
]
