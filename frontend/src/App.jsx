import React, { useState, useEffect } from 'react';
import { ShoppingBag, MapPin, Tag, AlertCircle, CheckCircle2, SlidersHorizontal, User, Sparkles, Receipt } from 'lucide-react';

export default function App() {
  const [artesanias, setArtesanias] = useState([]);
  const [pedidos, setPedidos] = useState([]); 
  const [usuarios, setUsuarios] = useState([]); // Almacena los usuarios dinámicos desde SQLite
  const [provinciaFiltro, setProvinciaFiltro] = useState('');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(1); 
  const [mensajeTransaccion, setMensajeTransaccion] = useState(null);
  const [errorTransaccion, setErrorTransaccion] = useState(null);

  // Función unificada para sincronizar el estado local con la base de datos SQLite
  const cargarDatosSistemicos = () => {
    // 🔥 OPTIMIZACIÓN: Manejo limpio de Query Params para evitar enviar cadenas vacías '?provincia='
    const params = new URLSearchParams();
    if (provinciaFiltro && provinciaFiltro.trim() !== '') {
      params.append('provincia', provinciaFiltro);
    }

    // 1. Obtener catálogo de artesanías (Puerto 4000 de tu server.js)
    fetch(`http://localhost:4000/api/artesanias?${params.toString()}`)
      .then(res => res.json())
      .then(data => setArtesanias(data))
      .catch(err => console.error("Error al conectar con el catálogo:", err));

    // 2. Obtener historial relacional con include de Usuarios y Artesanías
    fetch(`http://localhost:4000/api/pedidos`)
      .then(res => res.json())
      .then(data => setPedidos(data))
      .catch(err => console.error("Error al conectar con pedidos:", err));

    // 3. Obtener la lista dinámica de usuarios directos de SQLite
    fetch(`http://localhost:4000/api/usuarios`)
      .then(res => res.json())
      .then(data => setUsuarios(data))
      .catch(err => console.error("Error al cargar usuarios:", err));
  };

  // Escuchar cambios en los filtros de localización e inicializar datos del sistema
  useEffect(() => {
    cargarDatosSistemicos();
  }, [provinciaFiltro]);

  const manejarCompra = async (id) => {
    setMensajeTransaccion(null);
    setErrorTransaccion(null);

    try {
      const respuesta = await fetch('http://localhost:4000/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          artesaniaId: id, 
          usuarioId: usuarioSeleccionado, 
          cantidad: 1 
        })
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.error || "Error transaccional");

      setMensajeTransaccion(`¡Transacción Exitosa! El cliente ${datos.cliente} adquirió: ${datos.producto}.`);
      
      // Descuento inmediato y reactivo en el estado de React
      setArtesanias(prev => prev.map(art => art.id === id ? { ...art, stock: datos.stockRemanente } : art));
      
      // Forzar recarga síncrona de la tabla de auditoría
      fetch(`http://localhost:4000/api/pedidos`)
        .then(res => res.json())
        .then(data => setPedidos(data));

    } catch (err) {
      setErrorTransaccion(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      
      {/* Encabezado Principal de Alta Gama con Selector de Sesión QA */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm backdrop-blur-md bg-white/95">
        <div className="container mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-600 to-red-700 p-2.5 rounded-xl text-white shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-red-800 to-amber-700 bg-clip-text text-transparent">
                Ruraq Maki
              </h1>
              <p className="text-xs text-slate-400 font-medium">Plataforma de Clasificados Regionales</p>
            </div>
          </div>

          {/* Selector Dinámico de Comprador para Pruebas del Modelo Relacional */}
          <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-2xl w-full md:w-auto">
            <User className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">Simular Cliente:</span>
            <select
              value={usuarioSeleccionado}
              onChange={(e) => setUsuarioSeleccionado(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer w-full"
            >
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider hidden md:inline-block">
            Entorno de Pruebas QA
          </span>
        </div>
      </header>

      {/* Cuerpo de la Aplicación */}
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        
        {/* Banner Hero Visual */}
        <div className="relative rounded-3xl overflow-hidden mb-8 shadow-md bg-gradient-to-r from-red-900 via-amber-950 to-slate-900 text-white p-8 md:p-12 flex flex-col justify-center min-h-[220px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" /> Arte y Tradición de Ayacucho
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
              Aseguramiento de Calidad en Comercio Electrónico Regional
            </h2>
            <p className="text-slate-300 text-sm md:text-base mt-2 font-medium">
              Evaluación sistémica de idoneidad funcional, rendimiento bajo concurrencia y adaptabilidad móvil según la norma ISO/IEC 25010.
            </p>
          </div>
        </div>

        {/* Alertas de Notificación Dinámicas */}
        {mensajeTransaccion && (
          <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 rounded-r-xl shadow-sm flex items-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-sm">{mensajeTransaccion}</span>
          </div>
        )}
        {errorTransaccion && (
          <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-900 rounded-r-xl shadow-sm flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-semibold text-sm">Conflicto: {errorTransaccion}</span>
          </div>
        )}

        {/* Panel de Filtros Estilizado */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-700 font-bold text-sm">
            <SlidersHorizontal className="w-4 h-4 text-red-700" />
            <span>Filtro de Localización Geográfica</span>
          </div>
          <div className="relative w-full sm:w-auto flex items-center">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <select 
              id="filtro-provincia"
              value={provinciaFiltro} 
              onChange={(e) => setProvinciaFiltro(e.target.value)}
              className="pl-9 pr-10 py-2 w-full sm:w-64 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all appearance-none cursor-pointer"
            >
              <option value="">Todas las provincias</option>
              <option value="Huamanga">Huamanga</option>
              <option value="Huanta">Huanta</option>
              <option value="Cangallo">Cangallo</option>
            </select>
          </div>
        </div>

        {/* Grilla de Anuncios / Productos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {artesanias.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-slate-400 font-medium text-sm">
                No se encontraron anuncios disponibles o el servidor backend (`node server.js`) está desconectado.
              </p>
            </div>
          ) : (
            artesanias.map((art) => (
              <div 
                key={art.id} 
                className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-100 overflow-hidden flex flex-col justify-between group transition-all duration-300 transform hover:-translate-y-1"
              >
                {/* Contenedor de la Imagen del Anuncio */}
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img 
                    src={art.imagen} 
                    alt={art.nombre} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-extrabold text-red-800 uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Artesanía Tradicional
                  </span>
                </div>

                {/* Cuerpo de Información */}
                <div className="p-5 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Provincia de {art.provincia}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mt-2 line-clamp-2 group-hover:text-red-700 transition-colors">
                      {art.nombre}
                    </h3>
                  </div>

                  {/* Precio, Stock y Botón Transaccional */}
                  <div className="mt-5">
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio</span>
                        <span className="text-lg font-black text-slate-900">S/. {art.precio.toFixed(2)}</span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                        art.stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {art.stock > 0 ? `${art.stock} Unidades` : 'Agotado'}
                      </span>
                    </div>

                    <button
                      onClick={() => manejarCompra(art.id)}
                      disabled={art.stock === 0}
                      className={`mt-4 w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm shadow-sm transition-all ${
                        art.stock > 0 
                          ? 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-800 hover:to-red-700 active:scale-[0.99]' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {art.stock > 0 ? 'Adquirir Producto' : 'Sin Stock Disponible'}
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

        {/* TABLA DE AUDITORÍA DE VENTAS RELACIONALES */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Receipt className="w-5 h-5 text-red-700" />
            <h3 className="text-lg font-extrabold text-slate-800">
              Historial de Auditoría de Pedidos <span className="text-sm font-normal text-slate-400">(Lectura de Claves Foráneas SQL en vivo)</span>
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-4">ID Venta</th>
                  <th className="py-3 px-4">Usuario (Comprador)</th>
                  <th className="py-3 px-4">Artesanía Adquirida</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                  <th className="py-3 px-4 text-right">Total Impactado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pedidos.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-400 text-xs">
                      No se registran transacciones activas en el archivo SQLite.
                    </td>
                  </tr>
                ) : (
                  pedidos.map((ped) => (
                    <tr key={ped.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-400">#{ped.id}</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {ped.Usuario ? `${ped.Usuario.nombre} (${ped.Usuario.email})` : 'Anónimo'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {ped.Artesania ? ped.Artesania.nombre : 'Producto desvinculado'}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-500">{ped.cantidad} ud</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                        S/. {ped.total ? ped.total.toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}