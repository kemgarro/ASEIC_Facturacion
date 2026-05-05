'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import type { SalesReport, StockReport } from '@/lib/actions/reports'

interface ExportButtonProps {
  salesReport: SalesReport
  stockReport: StockReport
  dateFrom: string
  dateTo: string
}

export default function ExportButton({ salesReport, stockReport, dateFrom, dateTo }: ExportButtonProps) {
  async function handleExport() {
    const XLSX = await import('xlsx')

    const wb = XLSX.utils.book_new()

    // Hoja 1: Resumen ventas
    const resumenData = [
      ['Reporte de Ventas', `${dateFrom} al ${dateTo}`],
      [],
      ['Métrica', 'Valor'],
      ['Total ventas', salesReport.totalSales],
      ['Ingresos totales', salesReport.totalRevenue],
      ['Artículos vendidos', salesReport.totalItems],
      ['Ticket promedio', salesReport.avgTicket],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

    // Hoja 2: Ventas por día
    const byDayData = [
      ['Fecha', 'Ventas', 'Ingresos'],
      ...salesReport.byDay.map((d) => [d.date, d.sales, d.revenue]),
    ]
    const wsByDay = XLSX.utils.aoa_to_sheet(byDayData)
    XLSX.utils.book_append_sheet(wb, wsByDay, 'Ventas por día')

    // Hoja 3: Top productos
    const topData = [
      ['Producto', 'Cantidad vendida', 'Ingresos'],
      ...salesReport.topProducts.map((p) => [p.name, p.qty, p.revenue]),
    ]
    const wsTop = XLSX.utils.aoa_to_sheet(topData)
    XLSX.utils.book_append_sheet(wb, wsTop, 'Top productos')

    // Hoja 4: Stock actual
    const stockData = [
      ['Producto', 'Stock', 'Precio unitario', 'Valor inventario'],
      ...stockReport.products.map((p) => [p.name, p.stock, p.price, p.value]),
      [],
      ['TOTAL', '', '', stockReport.totalValue],
    ]
    const wsStock = XLSX.utils.aoa_to_sheet(stockData)
    XLSX.utils.book_append_sheet(wb, wsStock, 'Stock actual')

    XLSX.writeFile(wb, `reporte-aseic-${dateFrom}-${dateTo}.xlsx`)
  }

  return (
    <Button
      onClick={handleExport}
      className="h-11 px-5 text-base font-semibold rounded-xl"
      style={{ backgroundColor: '#023e55', color: 'white' }}
    >
      <Download className="h-5 w-5 mr-2" />
      Exportar Excel
    </Button>
  )
}
