'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Movimiento = {
  id: string
  tipo: string
  cantidad: number
  precio_unitario: number
  fecha: string
  venta_id: string | null
  modo: string | null
  presentacion_cantidad: number | null
  productos: { nombre: string } | null
}

const ESTILOS_TIPO: Record<string, { etiqueta: string; color: string; fondo: string }> = {
  venta: { etiqueta: 'Venta', color: '#8B6F52', fondo: '#F5EFE6' },
  entrada: { etiqueta: 'Reposición', color: '#2563EB', fondo: '#EFF6FF' },
  creacion: { etiqueta: 'Producto creado', color: '#9CAF88', fondo: '#F0F5EC' },
  edicion: { etiqueta: 'Edición', color: '#B45309', fondo: '#FFFBEB' },
  ajuste: { etiqueta: 'Ajuste', color: '#6B7280', fondo: '#F3F4F6' },
}

export default function Historial() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargarHistorial() {
      const { data, error } = await supabase
        .from('movimientos')
        .select('id, tipo, cantidad, precio_unitario, fecha, venta_id, modo, presentacion_cantidad, productos(nombre)')
        .order('fecha', { ascending: false })

      if (error) setError(error.message)
      else setMovimientos((data as unknown as Movimiento[]) || [])
      setCargando(false)
    }
    cargarHistorial()
  }, [])

  const ventas = movimientos.filter((m) => m.tipo === 'venta')
  const otrosMovimientos = movimientos.filter((m) => m.tipo !== 'venta')
  const totalVentas = ventas.reduce((acc, m) => acc + m.cantidad * (m.precio_unitario || 0), 0)

  // Agrupa las ventas por venta_id (o por su propio id si es una venta antigua sin venta_id)
  const gruposVenta = new Map<string, Movimiento[]>()
  for (const v of ventas) {
    const clave = v.venta_id || v.id
    if (!gruposVenta.has(clave)) gruposVenta.set(clave, [])
    gruposVenta.get(clave)!.push(v)
  }

  const grupos = Array.from(gruposVenta.entries())
    .map(([clave, items]) => ({
      clave,
      items,
      fecha: items[0].fecha,
      total: items.reduce((acc, i) => acc + i.cantidad * (i.precio_unitario || 0), 0),
    }))
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-full px-4 py-2 text-sm font-semibold shadow-sm mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver
      </Link>

      <h1 className="text-2xl font-display font-bold text-[#4A3F35] mb-1">Historial</h1>
      {!cargando && !error && (
        <p className="text-sm text-gray-500 mb-6">
          Total vendido: <span className="font-semibold text-[#8B6F52]">${totalVentas.toLocaleString('es-CO')}</span>
        </p>
      )}

      {cargando && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && movimientos.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500">Todavía no hay movimientos registrados.</p>
        </div>
      )}

      {grupos.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Ventas</h2>
          <ul className="flex flex-col gap-2 mb-6">
            {grupos.map((grupo) => {
              const fecha = new Date(grupo.fecha)
              return (
                <li key={grupo.clave} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">
                      {fecha.toLocaleDateString('es-CO')} · {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="font-bold text-[#8B6F52]">${grupo.total.toLocaleString('es-CO')}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                  {grupo.items.map((item) => (
                    <p key={item.id} className="text-sm text-gray-600">
                       {item.modo && item.presentacion_cantidad
                       ? `${item.presentacion_cantidad} ${item.modo === 'tableta' ? (item.presentacion_cantidad === 1 ? 'tableta' : 'tabletas') : (item.presentacion_cantidad === 1 ? 'suelta' : 'sueltas')}`
                       : `${item.cantidad} und`} de {item.productos?.nombre || 'Producto eliminado'}
                    </p>
                  ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {otrosMovimientos.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Otros movimientos</h2>
          <ul className="flex flex-col gap-2">
            {otrosMovimientos.map((m) => {
              const estilo = ESTILOS_TIPO[m.tipo] || ESTILOS_TIPO.ajuste
              const fecha = new Date(m.fecha)
              return (
                <li key={m.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1"
                      style={{ backgroundColor: estilo.fondo, color: estilo.color }}
                    >
                      {estilo.etiqueta}
                    </span>
                    <p className="font-semibold text-gray-800">{m.productos?.nombre || 'Producto eliminado'}</p>
                    <p className="text-xs text-gray-400">
                      {fecha.toLocaleDateString('es-CO')} · {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    {(m.tipo === 'entrada' || m.tipo === 'creacion') && (
                      <p className="font-bold" style={{ color: estilo.color }}>+{m.cantidad} und</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </main>
  )
}