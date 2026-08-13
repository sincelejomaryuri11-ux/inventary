'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Producto = {
  id: string
  nombre: string
  categoria: string
  precio: number
  precio_tableta: number | null
  unidades_por_presentacion: number
  stock: number
  stock_minimo: number
  fecha_vencimiento: string | null
}

type ModoVenta = 'individual' | 'tableta'
type ItemCarrito = { productoId: string; modo: ModoVenta; cantidad: number }

function IconPastilla() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="9" width="18" height="6" rx="3" stroke="white" strokeWidth="2" />
      <line x1="12" y1="9" x2="12" y2="15" stroke="white" strokeWidth="2" />
    </svg>
  )
}
function IconCanasta() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 9h16l-1.5 9a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8L4 9Z" stroke="white" strokeWidth="2" />
      <path d="M8 9V7a4 4 0 0 1 8 0v2" stroke="white" strokeWidth="2" />
    </svg>
  )
}
function IconMas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
function IconEditar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 20h9" stroke="#8B6F52" strokeWidth="2" strokeLinecap="round" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" stroke="#8B6F52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconEliminar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconCarrito() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="20" r="1.3" fill="white" />
      <circle cx="17" cy="20" r="1.3" fill="white" />
      <path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 7H5.2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Home() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [mensajeVenta, setMensajeVenta] = useState<string | null>(null)

  async function cargarProductos() {
    const { data, error } = await supabase
      .from('productos')
      .select('id, nombre, categoria, precio, precio_tableta, unidades_por_presentacion, stock, stock_minimo, fecha_vencimiento')
      .order('nombre')
    if (error) setError(error.message)
    else setProductos(data || [])
    setCargando(false)
  }

  useEffect(() => { cargarProductos() }, [])

  const productosFiltrados = productos.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  const productosStockBajo = productos.filter((p) => p.stock <= p.stock_minimo)
  const productosPorVencer = productos.filter((p) => {
    if (!p.fecha_vencimiento) return false
    const dias = Math.ceil((new Date(p.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return dias <= 30
  })

  function pastillasReservadas(productoId: string, unidadesPorPresentacion: number, excluirModo?: ModoVenta) {
    return carrito
      .filter((i) => i.productoId === productoId && i.modo !== excluirModo)
      .reduce((acc, i) => acc + i.cantidad * (i.modo === 'tableta' ? unidadesPorPresentacion : 1), 0)
  }

  function ajustarCarrito(producto: Producto, modo: ModoVenta, delta: number) {
    setCarrito((prev) => {
      const unidadesLinea = modo === 'tableta' ? producto.unidades_por_presentacion : 1
      const reservadoOtras = pastillasReservadas(producto.id, producto.unidades_por_presentacion, modo)
      const disponible = producto.stock - reservadoOtras
      const maxCantidadLinea = Math.floor(disponible / unidadesLinea)

      const actual = prev.find((i) => i.productoId === producto.id && i.modo === modo)
      const cantidadActual = actual?.cantidad || 0
      const nuevaCantidad = Math.max(0, Math.min(maxCantidadLinea, cantidadActual + delta))

      const sinEsta = prev.filter((i) => !(i.productoId === producto.id && i.modo === modo))
      if (nuevaCantidad === 0) return sinEsta
      return [...sinEsta, { productoId: producto.id, modo, cantidad: nuevaCantidad }]
    })
  }

  const itemsCarrito = carrito.map((i) => {
    const producto = productos.find((p) => p.id === i.productoId)!
    const precioUnit = i.modo === 'tableta' ? (producto.precio_tableta || 0) : producto.precio
    return { ...i, producto, precioLinea: precioUnit * i.cantidad }
  })
  const totalCarrito = itemsCarrito.reduce((acc, i) => acc + i.precioLinea, 0)
  const lineasCarrito = itemsCarrito.length

  async function finalizarVenta() {
    if (itemsCarrito.length === 0) return
    setProcesando(true)
    const ventaId = crypto.randomUUID()

    for (const item of itemsCarrito) {
      const unidades = item.modo === 'tableta' ? item.producto.unidades_por_presentacion : 1
      const pastillasDescontar = item.cantidad * unidades
      const nuevoStock = item.producto.stock - pastillasDescontar
      await supabase.from('productos').update({ stock: nuevoStock }).eq('id', item.producto.id)
      await supabase.from('movimientos').insert({
        producto_id: item.producto.id,
        tipo: 'venta',
        cantidad: pastillasDescontar,
        precio_unitario: item.precioLinea / pastillasDescontar,
        venta_id: ventaId,
        modo: item.modo,
        presentacion_cantidad: item.cantidad,
      })
    }

    setMensajeVenta(`Cobrar $${totalCarrito.toLocaleString('es-CO')} por ${lineasCarrito} ${lineasCarrito === 1 ? 'producto' : 'productos'}`)
    setCarrito([])
    setCarritoAbierto(false)
    await cargarProductos()
    setProcesando(false)
    setTimeout(() => setMensajeVenta(null), 8000)
  }

  async function eliminarProducto(producto: Producto) {
    const confirmado = window.confirm(`¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`)
    if (!confirmado) return
    const { error } = await supabase.from('productos').delete().eq('id', producto.id)
    if (error) setError(error.message)
    else await cargarProductos()
  }

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto pb-24">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-[#8B6F52]">Farmacia y Variedades</h1>
            <svg width="90" height="8" viewBox="0 0 90 8" className="mt-1">
              <path d="M2 5 Q 12 1, 22 5 T 42 5 T 62 5 T 88 5" stroke="#D8A48F" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/historial" className="bg-white hover:bg-gray-50 transition-colors text-[#8B6F52] rounded-full w-12 h-12 flex items-center justify-center shadow-md border border-gray-100" aria-label="Historial de ventas">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 3v5h5" stroke="#8B6F52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" stroke="#8B6F52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 7v5l4 2" stroke="#8B6F52" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/agregar" className="bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md" aria-label="Agregar producto">
              <IconMas />
            </Link>
          </div>
        </div>
      </header>

      {mensajeVenta && (
        <div className="bg-[#9CAF88] text-white rounded-xl px-4 py-3 mb-4 flex items-center justify-between shadow-sm">
          <p className="text-sm font-semibold">{mensajeVenta}</p>
          <button onClick={() => setMensajeVenta(null)} className="text-white/80 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      {(productosStockBajo.length > 0 || productosPorVencer.length > 0) && (
        <div className="flex flex-col gap-2 mb-4">
          {productosStockBajo.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4M12 17h.01M10.3 3.86l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.14l-8-14a2 2 0 0 0-3.4 0Z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-red-700"><span className="font-semibold">{productosStockBajo.length}</span> {productosStockBajo.length === 1 ? 'producto' : 'productos'} con stock bajo</p>
            </div>
          )}
          {productosPorVencer.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#B45309" strokeWidth="2" />
                <path d="M12 7v5l3 3" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-sm text-amber-800"><span className="font-semibold">{productosPorVencer.length}</span> {productosPorVencer.length === 1 ? 'producto vence' : 'productos vencen'} en 30 días o menos</p>
            </div>
          )}
        </div>
      )}

      <div className="relative mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="7" stroke="#8B6F52" strokeWidth="2" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="#8B6F52" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text" placeholder="Buscar producto..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-full pl-10 pr-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9CAF88]"
        />
      </div>

      {cargando && <p className="text-gray-500">Cargando productos...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && productosFiltrados.length === 0 && (
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
          <p className="text-gray-500">{busqueda ? 'No se encontraron productos.' : 'Todavía no hay productos.'}</p>
          <p className="text-gray-400 text-sm mt-1">{busqueda ? 'Prueba con otro nombre.' : 'Toca el botón de arriba para empezar.'}</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {productosFiltrados.map((p) => {
          const esMedicamento = p.categoria === 'medicamento'
          const color = esMedicamento ? '#9CAF88' : '#D8A48F'
          const stockBajo = p.stock <= p.stock_minimo
          const esDivisible = p.unidades_por_presentacion > 1 && p.precio_tableta

          const enCarritoIndividual = carrito.find((i) => i.productoId === p.id && i.modo === 'individual')?.cantidad || 0
          const enCarritoTableta = carrito.find((i) => i.productoId === p.id && i.modo === 'tableta')?.cantidad || 0

          return (
            <li key={p.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4" style={{ borderLeftColor: color }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{p.nombre}</p>
                  <span className="text-xs font-medium px-2 py-1 rounded-full text-white inline-flex items-center gap-1 mt-1" style={{ backgroundColor: color }}>
                    {esMedicamento ? <IconPastilla /> : <IconCanasta />}
                    {esMedicamento ? 'Medicamento' : 'Variedades'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">
                    {esDivisible ? `$${p.precio_tableta} / $${p.precio}` : `$${p.precio}`}
                  </p>
                  <p className={`text-sm ${stockBajo ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                    {esDivisible
                      ? `${Math.floor(p.stock / p.unidades_por_presentacion)} ${esMedicamento ? 'tabletas' : 'present.'} + ${p.stock % p.unidades_por_presentacion} sueltas`
                      : `Stock: ${p.stock}`}
                    {stockBajo && ' · bajo'}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-1 items-start">
                <Link href={`/editar/${p.id}`} className="inline-flex items-center gap-1 text-xs text-[#8B6F52] hover:text-[#6B5A48] transition-colors font-medium">
                  <IconEditar />Editar
                </Link>
                <button onClick={() => eliminarProducto(p)} className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors font-medium">
                  <IconEliminar />Eliminar
                </button>
              </div>

              {!esDivisible ? (
                enCarritoIndividual === 0 ? (
                  <button
                    onClick={() => ajustarCarrito(p, 'individual', 1)}
                    disabled={p.stock === 0}
                    className="mt-3 w-full sm:w-auto sm:ml-auto sm:block sm:px-6 bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-30"
                  >
                    {p.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
                  </button>
                ) : (
                  <div className="mt-3 flex items-center gap-2 bg-[#F5EFE6] rounded-xl p-2">
                    <button onClick={() => ajustarCarrito(p, 'individual', -1)} className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm font-bold text-[#8B6F52]">−</button>
                    <span className="flex-1 text-center font-semibold">{enCarritoIndividual} en el carrito</span>
                    <button onClick={() => ajustarCarrito(p, 'individual', 1)} className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm font-bold text-[#8B6F52]">+</button>
                  </div>
                )
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-[#F5EFE6] rounded-xl p-2">
                    <span className="text-xs font-medium text-gray-600 pl-1">{esMedicamento ? 'Tableta' : 'Presentación'} (${p.precio_tableta})</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => ajustarCarrito(p, 'tableta', -1)} className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm font-bold text-[#8B6F52] text-sm">−</button>
                      <span className="w-5 text-center font-semibold text-sm">{enCarritoTableta}</span>
                      <button onClick={() => ajustarCarrito(p, 'tableta', 1)} className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm font-bold text-[#8B6F52] text-sm">+</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-[#F5EFE6] rounded-xl p-2">
                    <span className="text-xs font-medium text-gray-600 pl-1">{esMedicamento ? 'Suelta' : 'Unidad'} (${p.precio})</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => ajustarCarrito(p, 'individual', -1)} className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm font-bold text-[#8B6F52] text-sm">−</button>
                      <span className="w-5 text-center font-semibold text-sm">{enCarritoIndividual}</span>
                      <button onClick={() => ajustarCarrito(p, 'individual', 1)} className="w-7 h-7 rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm font-bold text-[#8B6F52] text-sm">+</button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {itemsCarrito.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          {carritoAbierto && (
            <div className="max-w-2xl mx-auto p-4 border-b border-gray-100 max-h-64 overflow-y-auto">
              {itemsCarrito.map((item) => (
                <div key={`${item.productoId}-${item.modo}`} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-sm text-gray-800">{item.producto.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {item.cantidad} {item.modo === 'tableta'
                        ? (item.producto.categoria === 'medicamento' ? 'tableta(s)' : 'presentación(es)')
                        : (item.producto.categoria === 'medicamento' ? 'suelta(s)' : 'unidad(es)')} × ${item.modo === 'tableta' ? item.producto.precio_tableta : item.producto.precio}
                    </p>
                  </div>
                  <p className="font-semibold text-sm text-[#8B6F52]">${item.precioLinea.toLocaleString('es-CO')}</p>
                </div>
              ))}
            </div>
          )}
          <div className="max-w-2xl mx-auto p-4 flex items-center gap-3">
            <button onClick={() => setCarritoAbierto((v) => !v)} className="flex items-center gap-2 flex-1">
              <span className="bg-[#8B6F52] text-white rounded-full w-9 h-9 flex items-center justify-center"><IconCarrito /></span>
              <span className="text-left">
                <span className="block text-xs text-gray-500">{lineasCarrito} {lineasCarrito === 1 ? 'producto' : 'productos'}</span>
                <span className="block font-bold text-[#4A3F35]">${totalCarrito.toLocaleString('es-CO')}</span>
              </span>
            </button>
            <button onClick={finalizarVenta} disabled={procesando} className="bg-[#8B6F52] hover:bg-[#6B5A48] transition-colors text-white rounded-full px-6 py-3 font-semibold shadow-md disabled:opacity-50">
              {procesando ? 'Procesando...' : 'Finalizar venta'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}