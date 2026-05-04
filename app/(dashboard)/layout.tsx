import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'vendedor'

  // Defensa en profundidad: verificar rol admin para rutas /admin
  const headersList = await headers()
  const pathname = headersList.get('x-nextjs-page') ?? ''
  if (pathname.startsWith('/admin') && role !== 'admin') {
    redirect('/')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header
          userName={profile?.full_name ?? user.email ?? ''}
          userRole={role}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  )
}
