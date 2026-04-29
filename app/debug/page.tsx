import { createClient } from '@/lib/supabase/server'

export default async function DebugPage() {
  const supabase = await createClient()
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_ANON_KEY
  
  let authStatus = 'Unknown'
  let testResult = ''
  
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      authStatus = `Error: ${error.message}`
    } else if (data.user) {
      authStatus = `User logged in: ${data.user.email}`
    } else {
      authStatus = 'No user (expected - just checking API works)'
    }
    testResult = '✓ Supabase connection successful'
  } catch (e: any) {
    testResult = `✗ Connection failed: ${e.message}`
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Diagnóstico de Entorno</h1>
      
      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Variables de Entorno</h2>
        <ul className="space-y-2 font-mono text-sm">
          <li className="flex gap-2">
            <span className="font-semibold">NEXT_PUBLIC_SUPABASE_URL:</span>
            <span className="text-blue-600">{url || 'NO DEFINIDA'}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
            <span className="text-blue-600">{anonKey ? `${anonKey.substring(0, 20)}...` : 'NO DEFINIDA'}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold">SUPABASE_URL:</span>
            <span className="text-green-600">{process.env.SUPABASE_URL ? '✓ Configurada' : 'NO DEFINIDA'}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold">SUPABASE_ANON_KEY:</span>
            <span className="text-green-600">{serviceKey ? '✓ Configurada' : 'NO DEFINIDA'}</span>
          </li>
        </ul>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Prueba de Conexión</h2>
        <p className={`text-lg ${testResult.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
          {testResult}
        </p>
        <p className="mt-2 text-gray-600">{authStatus}</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Información</h2>
        <p className="text-gray-600">
          Esta página es solo para diagnóstico. En producción, elimine questa página.
        </p>
      </div>
    </div>
  )
}