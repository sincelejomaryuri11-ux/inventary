'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function bloquearNegativo(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-') e.preventDefault()
}

export default function AgregarProducto() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('medicamento')
  const [precio, setPrecio] = useState('')
  const [vendeSuelta, setVendeSuelta] = useState(false)
  const [unidadesPorPresentacion, setUnidadesPorPresentacion] = useState('10')
  const [precioTableta, setPrecioTableta] = useState('')
  const [stockTabletas, setStockTabletas] = useState('')
  const [stock, setStock] = useState('')
  const [stockMinimo, setStockMinimo] = useState('5')
  const [stockMinimoTabletas, setStockMinimoTabletas] = useState('1')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esMedicamento = categoria === 'medicamento'

  async function guardarProducto(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const unidades = vendeSuelta ? parseInt(unidadesPorPresentacion) : 1
    const stockFinal = vendeSuelta ? parseInt(stockTabletas) * unidades : parseInt(stock)
    const stockMinimoFinal = vendeSuelta ? parseInt(stockMinimoTabletas) * unidades : parseInt(stockMinimo)

    const { data, error } = await supabase.from('productos').insert({
      nombre,
      categoria,
      precio: parseFloat(precio),
      precio_tableta: vendeSuelta ? parseFloat(precioTableta) : null,
      unidades_por_presentacion: unidades,
      stock: stockFinal,
      stock_minimo: stockMinimoFinal,
      fecha_vencimiento: fechaVencimiento || null,
    }).select().single()

    if (error) {
      setError(error.message)
      setGuardando(false)
    } else {
      await supabase.from('movimientos').insert({
        producto_id: data.id,
        tipo: 'creacion',
        cantidad: stockFinal,
        precio_unitario: parseFloat(precio),
      })
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-full px-4 py-2 text-sm font-semibold shadow-sm mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Volver
      </Link>
      <h1 className="text-2xl font-display font-bold text-[#4A3F35] mb-6">Agregar producto</h1>

      <form onSubmit={guardarProducto} className="flex flex-col gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div>
          <label className="block mb-1 font-medium text-gray-700">Nombre</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">Categoría</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="medicamento">Medicamento</option>
            <option value="variedades">Variedades</option>
          </select>
        </div>

        <label className="flex items-center gap-2 bg-[#F5EFE6] rounded-xl px-3 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={vendeSuelta}
            onChange={(e) => setVendeSuelta(e.target.checked)}
            className="w-4 h-4 accent-[#8B6F52]"
          />
          <span className="text-sm font-medium text-gray-700">
            {esMedicamento ? 'Se vende también suelto (por pastilla/unidad)' : 'Se vende también por unidad suelta (no solo la presentación completa)'}
          </span>
        </label>

        {!vendeSuelta ? (
          <div>
            <label className="block mb-1 font-medium text-gray-700">Precio</label>
            <input
              type="number"
              min="0"
              step="0.01"
              onKeyDown={bloquearNegativo}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                {esMedicamento ? 'Pastillas por tableta/caja' : 'Unidades por presentación'}
              </label>
              <input
                type="number"
                min="0"
                onKeyDown={bloquearNegativo}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
                value={unidadesPorPresentacion}
                onChange={(e) => setUnidadesPorPresentacion(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                {esMedicamento ? 'Precio de la tableta completa' : 'Precio de la presentación completa'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                onKeyDown={bloquearNegativo}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
                value={precioTableta}
                onChange={(e) => setPrecioTableta(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-700">
                {esMedicamento ? 'Precio por pastilla suelta' : 'Precio por unidad suelta'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                onKeyDown={bloquearNegativo}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
              />
            </div>
          </>
        )}

        {!vendeSuelta ? (
          <div>
            <label className="block mb-1 font-medium text-gray-700">Stock inicial</label>
            <input
              type="number"
              min="0"
              onKeyDown={bloquearNegativo}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
          </div>
        ) : (
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              {esMedicamento ? '¿Cuántas tabletas tienes ahora?' : '¿Cuántas presentaciones completas tienes ahora?'}
            </label>
            <input
              type="number"
              min="0"
              onKeyDown={bloquearNegativo}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
              value={stockTabletas}
              onChange={(e) => setStockTabletas(e.target.value)}
              required
            />
            {stockTabletas && unidadesPorPresentacion && (
              <p className="text-xs text-gray-400 mt-1">
                = {parseInt(stockTabletas) * parseInt(unidadesPorPresentacion || '0')} unidades en total
              </p>
            )}
          </div>
        )}

        {!vendeSuelta ? (
          <div>
            <label className="block mb-1 font-medium text-gray-700">Stock mínimo (para alertas)</label>
            <input
              type="number"
              min="0"
              onKeyDown={bloquearNegativo}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="block mb-1 font-medium text-gray-700">
              {esMedicamento ? '¿Con cuántas tabletas quieres que te avise stock bajo?' : '¿Con cuántas presentaciones quieres que te avise stock bajo?'}
            </label>
            <input
              type="number"
              min="0"
              onKeyDown={bloquearNegativo}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
              value={stockMinimoTabletas}
              onChange={(e) => setStockMinimoTabletas(e.target.value)}
            />
            {stockMinimoTabletas && (
              <p className="text-xs text-gray-400 mt-1">
                = {parseInt(stockMinimoTabletas || '0') * parseInt(unidadesPorPresentacion || '0')} unidades
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block mb-1 font-medium text-gray-700">Fecha de vencimiento (opcional)</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
          />
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-xl px-4 py-2 font-semibold shadow-md disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar producto'}
        </button>
      </form>
    </main>
  )
}