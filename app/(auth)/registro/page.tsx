'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('duplicate') || signUpError.message.includes('already')) {
        setError('Este correo ya está registrado')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #023e55 0%, #3b4e73 100%)' }}
      >
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white tracking-widest mb-2">ASEIC</h1>
            <p className="text-white/60 text-base">Sistema de Control de Ventas</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="mb-6" style={{ color: '#2ba5b2' }}>
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#023e55' }}>
              ¡Usuario creado!
            </h2>
            <p className="text-gray-600 mb-2">
              La cuenta para <strong>{email}</strong> ha sido creada.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              Ya podés iniciar sesión.
            </p>
            <Button
              asChild
              className="w-full h-12 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#2ba5b2', color: 'white' }}
            >
              <Link href="/login">Ir a iniciar sesión</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #023e55 0%, #3b4e73 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white tracking-widest mb-2">ASEIC</h1>
          <p className="text-white/60 text-base">Sistema de Control de Ventas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-6" style={{ color: '#023e55' }}>
            Crear cuenta
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-base font-medium" style={{ color: '#3b4e73' }}>
                Nombre completo
              </Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Juan Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-medium" style={{ color: '#3b4e73' }}>
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium" style={{ color: '#3b4e73' }}>
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 text-base"
              />
              <p className="text-xs text-gray-400">Mínimo 6 caracteres</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-xl"
              style={{ backgroundColor: '#2ba5b2', color: 'white' }}
              disabled={loading}
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-base text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="font-semibold" style={{ color: '#2ba5b2' }}>
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}