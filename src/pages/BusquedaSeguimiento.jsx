import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

function BusquedaSeguimiento() {
  /* =======================
     ESTADOS
  ======================= */
  const [dni, setDni] = useState('')
  const [trabajador, setTrabajador] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [historial, setHistorial] = useState([])
  const [noExiste, setNoExiste] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [toast, setToast] = useState('')

  const [sintomas, setSintomas] = useState('')
  const [recomendaciones, setRecomendaciones] = useState('')
  const [cieQuery, setCieQuery] = useState('')
  const [cieResultados, setCieResultados] = useState([])
  const [diagnostico, setDiagnostico] = useState(null)

  const [mostrarModal, setMostrarModal] = useState(false)
  const [errores, setErrores] = useState({})

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoApellido, setNuevoApellido] = useState('')
  const [nuevoDni, setNuevoDni] = useState('')
  const [sexo, setSexo] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [nuevaEmpresa, setNuevaEmpresa] = useState('')
  const [nuevaDireccion, setNuevaDireccion] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')


  const dniInputRef = useRef(null)

  /* =======================
     EFECTOS
  ======================= */
  useEffect(() => {
    dniInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscarCie(cieQuery), 300)
    return () => clearTimeout(t)
  }, [cieQuery])

  /* =======================
     HELPERS
  ======================= */
  const formatearFechaHoraPE = (fechaUTC) => {
  if (!fechaUTC) return '-'

  return new Date(fechaUTC).toLocaleString('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}


  const formatearFechaNacimiento = (fecha) => {
    if (!fecha) return '-'
    const [y, m, d] = fecha.split('-')
    return `${d}/${m}/${y}`
  }

  /* =======================
     BUSCAR TRABAJADOR
  ======================= */
  const buscar = async () => {
    if (!/^\d{8}$/.test(dni)) {
      setMensaje('Ingrese un DNI válido de 8 dígitos')
      return
    }

    setCargando(true)
    setMensaje('Buscando trabajador...')
    setTrabajador(null)
    setHistorial([])
    setNoExiste(false)

    const { data } = await supabase
      .from('trabajadores')
      .select('*')
      .eq('dni', dni)
      .maybeSingle()

    if (!data) {
      setMensaje('Trabajador no registrado')
      setNoExiste(true)
    } else {
      setMensaje('')
      setTrabajador(data)
      cargarHistorial(data.id)
    }

    setCargando(false)
  }

  /* =======================
     HISTORIAL
  ======================= */
  const cargarHistorial = async (id) => {
    const { data } = await supabase
      .from('registros_medicos')
      .select('id, fecha, sintomas, recomendaciones, cie')
      .eq('trabajador_id', id)
      .order('fecha', { ascending: false })

    setHistorial(data || [])
  }

  /* =======================
     BUSCAR CIE
  ======================= */
  const buscarCie = async (texto) => {
    if (!texto || texto.trim().length < 2) {
      setCieResultados([])
      return
    }

    const q = texto.trim()

    const { data } = await supabase
      .from('cie')
      .select('codigo, descripcion')
      .or(`codigo.ilike.%${q}%,descripcion.ilike.%${q}%`)
      .limit(10)

    setCieResultados(data || [])
  }

  /* =======================
     REGISTRAR ATENCIÓN
  ======================= */
  const registrarAtencion = async () => {
  if (!sintomas.trim() || !diagnostico) return

  await supabase.from('registros_medicos').insert({
    trabajador_id: trabajador.id,
    sintomas,
    recomendaciones,
    cie: `${diagnostico.codigo} - ${diagnostico.descripcion}`,
    fecha: new Date().toISOString() // ✅ UTC limpio
  })

  setSintomas('')
  setRecomendaciones('')
  setDiagnostico(null)
  setCieQuery('')
  setCieResultados([])

  setToast('Atención registrada correctamente')
  setTimeout(() => setToast(''), 3000)

  cargarHistorial(trabajador.id)
}


  /* =======================
     RENDER
  ======================= */
  return (
    <div className="container">
      {toast && <div className="toast">{toast}</div>}

      <div className={`grid ${!trabajador ? 'grid-center' : ''}`}>
        {/* CARD BÚSQUEDA */}
        <div className="card">
          <h3>Búsqueda por DNI</h3>

          <form onSubmit={e => { e.preventDefault(); buscar() }}>
            <input
              ref={dniInputRef}
              placeholder="Ingrese DNI"
              value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
              maxLength={8}
            />
            <button type="submit">
              {cargando ? 'Buscando...' : 'Buscar trabajador'}
            </button>
          </form>

          <p>{mensaje}</p>
        </div>

        {/* CARD TRABAJADOR */}
        {trabajador && (
          <div className="card">
            <span className="badge">Paciente</span>

            <h3>
              {trabajador.nombres} {trabajador.apellidos}
            </h3>

            {/* DATOS EN 2 COLUMNAS */}
            <div className="paciente-info">
              <div>
                <p><b>DNI:</b> {trabajador.dni}</p>
                <p><b>Fecha de nacimiento:</b> {formatearFechaNacimiento(trabajador.fecha_nacimiento)}</p>
                <p><b>Sexo:</b> {trabajador.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
              </div>
              <div>
                <p><b>Dirección:</b> {trabajador.direccion || '-'}</p>
                <p><b>Teléfono:</b> {trabajador.telefono || '-'}</p>
              </div>
            </div>

            {/* NUEVA ATENCIÓN */}
            <textarea
              className="auto-textarea"
              placeholder="Síntomas"
              value={sintomas}
              onChange={e => setSintomas(e.target.value)}
            />

            <textarea
              className="auto-textarea"
              placeholder="Recomendaciones"
              value={recomendaciones}
              onChange={e => setRecomendaciones(e.target.value)}
            />

            <label>Diagnóstico (CIE)</label>

<div className="cie-autocomplete">
  <input
    placeholder="Buscar diagnóstico (CIE)"
    value={cieQuery}
    onChange={e => setCieQuery(e.target.value)}
  />

  {cieResultados.length > 0 && (
    <ul className="cie-lista">
      {cieResultados.map(c => (
        <li
          key={c.codigo}
          onClick={() => {
            setDiagnostico(c)
            setCieQuery(`${c.codigo} - ${c.descripcion}`)
            setCieResultados([])
          }}
        >
          <strong>{c.codigo}</strong>
          <span>{c.descripcion}</span>
        </li>
      ))}
    </ul>
  )}
</div>


            <button
              disabled={!sintomas || !diagnostico}
              onClick={registrarAtencion}
            >
              Guardar atención
            </button>

            {/* HISTORIAL */}
            <h3>Historial médico</h3>

            {historial.length === 0 ? (
              <p style={{ color: '#64748b' }}>No hay atenciones registradas</p>
            ) : (
              <div className="historial-medico">
                {historial.map(item => (
                  <div key={item.id} className="historial-item">
                    <div className="historial-fecha">
                      {formatearFechaHoraPE(item.fecha)}
                    </div>
                    <div className="historial-card">
                      <div className="historial-cie">{item.cie}</div>
                      <div><b>Síntomas:</b> {item.sintomas}</div>
                      <div><b>Recomendaciones:</b> {item.recomendaciones}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BusquedaSeguimiento
