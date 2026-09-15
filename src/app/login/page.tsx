'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  async function iniciarSesion(e: React.FormEvent) {
    e.preventDefault()
    setEntrando(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Usuario o contraseña incorrectos')
      setEntrando(false)
    } else {
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#F5EFE6]">
      <form onSubmit={iniciarSesion} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-display font-bold text-[#4A3F35] text-center mb-1">Farmacia y Variedades</h1>
        <p className="text-sm text-gray-500 text-center mb-2">Inicia sesión para continuar</p>

        <div>
          <label className="block mb-1 font-medium text-gray-700 text-sm">Usuario</label>
          <input
            type="email"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700 text-sm">Contraseña</label>
          <input
            type="password"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={entrando}
          className="bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-xl px-4 py-2 font-semibold shadow-md disabled:opacity-50"
        >
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}