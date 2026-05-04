'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'

interface HeaderProps {
  userName: string
  userRole: string
}

export default function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="h-16 flex items-center justify-end px-6 gap-4 border-b border-white/10"
      style={{ backgroundColor: '#3b4e73' }}
    >
      <div className="flex items-center gap-2 text-sm text-white/80 min-w-0">
        <User className="h-4 w-4 shrink-0" />
        <span className="font-medium text-white truncate max-w-[100px] sm:max-w-none">{userName}</span>
        <span
          className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
          style={{ backgroundColor: '#2ba5b2', color: 'white' }}
        >
          {userRole}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-white/70 hover:text-white hover:bg-white/10"
      >
        <LogOut className="h-4 w-4 mr-2" />
        Salir
      </Button>
    </header>
  )
}
