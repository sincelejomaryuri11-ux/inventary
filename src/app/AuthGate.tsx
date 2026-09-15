'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [cargando, setCargando] = useState(true)
  const [autenticado, setAutenticado] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const haySesion = !!data.session
      setAutenticado(haySesion)
      setCargando(false)
      if (!haySesion && pathname !== '/login') router.push('/login')
      if (haySesion && pathname === '/login') router.push('/')
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const haySesion = !!session
      setAutenticado(haySesion)
      if (!haySesion && pathname !== '/login') router.push('/login')
    })

    return () => listener.subscription.unsubscribe()
  }, [pathname, router])

  if (pathname === '/login') return <>{children}</>
  if (cargando) return <main className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Cargando...</p></main>
  if (!autenticado) return null

  return <>{children}</>
}