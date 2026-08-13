'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function bloquearNegativo(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key === '-') e.preventDefault()
}

export default function EditarProducto() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('medicamento')
  const [precio, setPrecio] = useState('')
  const [vendeSuelta, setVendeSuelta] = useState(false)
  const [unidadesPorPresentacion, setUnidadesPorPresentacion] = useState('10')
  const [precioTableta, setPrecioTableta] = useState('')
  const [stock, setStock] = useState('')
  const [stockMinimo, setStockMinimo] = useState('5')
  const [stockMinimoTabletas, setStockMinimoTabletas] = useState('1')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [tabletasReponer, setTabletasReponer] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const esMedicamento = categoria === 'medicamento'

  const [original, setOriginal] = useState({
    nombre: '', categoria: '', precio: 0, stock: 0, fechaVencimiento: '',
  })

  useEffect(() => {
    async function cargarProducto() {
      const { data, error } = await supabase.from('productos').select('*').eq('id', id).single()
      if (error) {
        setError(error.message)
      } else if (data) {
        setNombre(data.nombre)
        setCategoria(data.categoria)
        setPrecio(String(data.precio))
        setVendeSuelta(data.unidades_por_presentacion > 1)
        setUnidadesPorPresentacion(String(data.unidades_por_presentacion || 10))
        setPrecioTableta(data.precio_tableta ? String(data.precio_tableta) : '')
        setStock(String(data.stock))
        setStockMinimo(String(data.stock_minimo))
        setStockMinimoTabletas(String(Math.floor(data.stock_minimo / (data.unidades_por_presentacion || 1))))
        setFechaVencimiento(data.fecha_vencimiento || '')
        setOriginal({
          nombre: data.nombre, categoria: data.categoria, precio: data.precio,
          stock: data.stock, fechaVencimiento: data.fecha_vencimiento || '',
        })
      }
      setCargando(false)
    }
    cargarProducto()
  }, [id])

  function agregarTabletasAlStock() {
    const unidades = parseInt(unidadesPorPresentacion || '0')
    const tabletas = parseInt(tabletasReponer || '0')
    if (!unidades || !tabletas) return
    setStock((prev) => String((parseInt(prev) || 0) + tabletas * unidades))
    setTabletasReponer('')
  }

  async function guardarCambios(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)

    const nuevoPrecio = parseFloat(precio)
    const nuevoStock = parseInt(stock)
    const unidades = vendeSuelta ? parseInt(unidadesPorPresentacion) : 1
    const stockMinimoFinal = vendeSuelta ? parseInt(stockMinimoTabletas) * unidades : parseInt(stockMinimo)

    const { error } = await supabase.from('productos').update({
      nombre,
      categoria,
      precio: nuevoPrecio,
      precio_tableta: vendeSuelta ? parseFloat(precioTableta) : null,
      unidades_por_presentacion: unidades,
      stock: nuevoStock,
      stock_minimo: stockMinimoFinal,
      fecha_vencimiento: fechaVencimiento || null,
    }).eq('id', id)

    if (error) {
      setError(error.message)
      setGuardando(false)
      return
    }

    const diferenciaStock = nuevoStock - original.stock
    if (diferenciaStock > 0) {
      await supabase.from('movimientos').insert({
        producto_id: id, tipo: 'entrada', cantidad: diferenciaStock, precio_unitario: nuevoPrecio,
      })
    }

    const huboOtroCambio =
      nombre !== original.nombre || categoria !== original.categoria ||
      nuevoPrecio !== original.precio || fechaVencimiento !== original.fechaVencimiento

    if (huboOtroCambio) {
      await supabase.from('movimientos').insert({
        producto_id: id, tipo: 'edicion', cantidad: 0, precio_unitario: nuevoPrecio,
      })
    }

    router.push('/')
  }

  async function eliminarProducto() {
    const confirmado = window.confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)
    if (!confirmado) return
    const { error } = await supabase.from('productos').delete().eq('id', id)
    if (error) setError(error.message)
    else router.push('/')
  }

  if (cargando) return <p className="p-8">Cargando...</p>

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
      <h1 className="text-2xl font-display font-bold text-[#4A3F35] mb-6">Editar producto</h1>

      <form onSubmit={guardarCambios} className="flex flex-col gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div>
          <label className="block mb-1 font-medium text-gray-700">Nombre</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={nombre} onChange={(e) => setNombre(e.target.value)} required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700">Categoría</label>
          <select
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={categoria} onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="medicamento">Medicamento</option>
            <option value="variedades">Variedades</option>
          </select>
        </div>

        <label className="flex items-center gap-2 bg-[#F5EFE6] rounded-xl px-3 py-3 cursor-pointer">
          <input
            type="checkbox" checked={vendeSuelta}
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
              value={precio} onChange={(e) => setPrecio(e.target.value)} required
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
                value={unidadesPorPresentacion} onChange={(e) => setUnidadesPorPresentacion(e.target.value)} required
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
                value={precioTableta} onChange={(e) => setPrecioTableta(e.target.value)} required
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
                value={precio} onChange={(e) => setPrecio(e.target.value)} required
              />
            </div>
          </>
        )}

        <div>
          <label className="block mb-1 font-medium text-gray-700">
            Stock {vendeSuelta && '(en unidades individuales)'}
          </label>
          <input
            type="number"
            min="0"
            onKeyDown={bloquearNegativo}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={stock} onChange={(e) => setStock(e.target.value)} required
          />
          {vendeSuelta && parseInt(unidadesPorPresentacion || '0') > 0 && stock && (
            <p className="text-xs text-gray-400 mt-1">
              = {Math.floor(parseInt(stock) / parseInt(unidadesPorPresentacion))} {esMedicamento ? 'tabletas' : 'presentaciones completas'} + {parseInt(stock) % parseInt(unidadesPorPresentacion)} unidades sueltas
            </p>
          )}
        </div>

        {vendeSuelta && (
          <div className="bg-[#F5EFE6] rounded-xl p-3">
            <label className="block mb-1 font-medium text-gray-700 text-sm">
              {esMedicamento ? '¿Le llegaron tabletas nuevas?' : '¿Le llegó mercancía nueva?'}
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                onKeyDown={bloquearNegativo}
                placeholder={esMedicamento ? 'Cantidad de tabletas' : 'Cantidad de presentaciones'}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
                value={tabletasReponer}
                onChange={(e) => setTabletasReponer(e.target.value)}
              />
              <button
                type="button"
                onClick={agregarTabletasAlStock}
                className="bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-xl px-4 text-sm font-semibold"
              >
                Sumar al stock
              </button>
            </div>
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
              value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)}
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
              value={stockMinimoTabletas} onChange={(e) => setStockMinimoTabletas(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="block mb-1 font-medium text-gray-700">Fecha de vencimiento (opcional)</label>
          <input
            type="date"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
            value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)}
          />
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit" disabled={guardando}
          className="bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-xl px-4 py-2 font-semibold shadow-md disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>

        <button
          type="button" onClick={eliminarProducto}
          className="text-red-500 hover:text-red-700 transition-colors text-sm font-medium"
        >
          Eliminar producto
        </button>
      </form>
    </main>
  )
}