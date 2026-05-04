'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingCart, History, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  role: string
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'vendedor'] },
  { href: '/productos', label: 'Productos', icon: Package, roles: ['admin'] },
  { href: '/ventas', label: 'Nueva Venta', icon: ShoppingCart, roles: ['admin', 'vendedor'] },
  { href: '/ventas/historial', label: 'Historial', icon: History, roles: ['admin', 'vendedor'] },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Users, roles: ['admin'] },
]

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const items = navItems.filter((item) => item.roles.includes(role))

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col shrink-0" style={{ backgroundColor: '#023e55' }}>
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-2xl font-bold text-white tracking-wide">ASEIC</span>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all',
                  active
                    ? 'text-white border-l-4'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
                style={active ? { backgroundColor: '#3b4e73', borderLeftColor: '#2ba5b2' } : {}}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/40 text-center">Sistema de Control de Ventas</p>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/10 px-2 py-2"
        style={{ backgroundColor: '#023e55' }}
      >
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium transition-all min-w-0',
                active ? 'text-white' : 'text-white/60'
              )}
              style={active ? { backgroundColor: '#3b4e7380' } : {}}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="truncate max-w-[56px] text-center leading-tight">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
