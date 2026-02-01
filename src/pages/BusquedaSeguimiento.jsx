import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

function App() {
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
  const formatearFechaNacimiento = (fecha) => {
    if (!fecha) return '-'
    const [year, month, day] = fecha.split('-')
    return `${day}/${month}/${year}`
  }

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
  const formatearFechaHoraPE = (fecha) =>
    new Date(fecha).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })

  /* =======================
     MODAL
  ======================= */
  const abrirModal = () => {
    setNuevoNombre('')
    setNuevoApellido('')
    setNuevoDni(dni)
    setSexo('')
    setFechaNacimiento('')
    setNuevaEmpresa('')
    setNuevaDireccion('')
    setNuevoTelefono('')
    setErrores({})
    setMostrarModal(true)
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
    const { data, error } = await supabase
      .from('registros_medicos')
      .select('id, fecha, sintomas, recomendaciones, cie')
      .eq('trabajador_id', id)
      .order('fecha', { ascending: false })

    if (!error) {
      setHistorial(data || [])
    }
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

  const { data, error } = await supabase
    .from('cie')
    .select('codigo, descripcion')
    .or(
      `codigo.ilike.%${q}%,descripcion.ilike.%${q}%`
    )
    .limit(10)

  if (error) {
    console.error('Error buscando CIE:', error)
  } else {
    setCieResultados(data || [])
  }
}


  /* =======================
     REGISTRAR ATENCIÓN
  ======================= */
  const registrarAtencion = async () => {
    if (!sintomas.trim() || !diagnostico) return

    const cieTexto = `${diagnostico.codigo} - ${diagnostico.descripcion}`

    await supabase.from('registros_medicos').insert({
      trabajador_id: trabajador.id,
      sintomas,
      recomendaciones,
      cie: cieTexto,
      fecha: new Date().toISOString()
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
     REGISTRAR TRABAJADOR
  ======================= */
  const registrarTrabajador = async () => {
    const e = {}
    if (!nuevoNombre) e.nombre = 'Ingrese nombres'
    if (!nuevoApellido) e.apellido = 'Ingrese apellidos'
    if (!sexo) e.sexo = 'Seleccione sexo'
    if (!fechaNacimiento) e.fechaNacimiento = 'Seleccione fecha'
    if (!nuevaEmpresa) e.empresa = 'Ingrese empresa'
    if (!nuevaDireccion) e.direccion = 'Ingrese dirección'
    if (!nuevoTelefono) e.telefono = 'Ingrese teléfono'

    if (Object.keys(e).length) {
      setErrores(e)
      return
    }

    await supabase.from('trabajadores').insert({
      dni: nuevoDni,
      nombres: nuevoNombre,
      apellidos: nuevoApellido,
      sexo,
      fecha_nacimiento: fechaNacimiento,
      empresa: nuevaEmpresa,
      direccion: nuevaDireccion,
      telefono: nuevoTelefono
    })

    setMostrarModal(false)
    setToast('Trabajador registrado correctamente')
    setTimeout(() => setToast(''), 3000)
    buscar()
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

          {noExiste && (
            <button
              style={{ marginTop: 8, background: '#16a34a' }}
              onClick={abrirModal}
            >
              ➕ Registrar trabajador
            </button>
          )}

          <div className="footer-note">
            Sistema desarrollado por{' '}
            <a href="https://desarrolloinka.com" target="_blank" rel="noreferrer">
              Desarrolloinka.com
            </a>
          </div>
        </div>

        {/* CARD TRABAJADOR */}
        {trabajador && (
  <div className="card">
    <span className="badge">Paciente</span>

    <h3>
      {trabajador.nombres} {trabajador.apellidos}
    </h3>

    {/* 👇 AQUÍ VA ESTE BLOQUE */}
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

    {/* luego sigue Nueva atención, historial, etc */}


            <textarea
  className="auto-textarea"
  placeholder="Síntomas"
  value={sintomas}
  onChange={e => {
    setSintomas(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }}
/>

<textarea
  className="auto-textarea"
  placeholder="Recomendaciones"
  value={recomendaciones}
  onChange={e => {
    setRecomendaciones(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }}
/>


            <input
              placeholder="Buscar diagnóstico (CIE)"
              value={cieQuery}
              onChange={e => setCieQuery(e.target.value)}
            />
            {diagnostico && (
  <div className="cie-seleccionado">
    <strong>Diagnóstico seleccionado:</strong>
    <div className="cie-box">
      <span>{diagnostico.codigo}</span> — {diagnostico.descripcion}
    </div>
  </div>
)}


            {cieResultados.map((c, i) => (
              <div
                key={i}
                style={{ cursor: 'pointer', padding: '6px 0' }}
                onClick={() => {
                  setDiagnostico(c)
                  setCieResultados([])
                }}
              >
                <b>{c.codigo}</b> — {c.descripcion}
              </div>
            ))}

            <button
              disabled={!sintomas || !diagnostico}
              onClick={registrarAtencion}
            >
              Guardar atención
            </button>

            <h3>Historial médico</h3>

            {historial.length === 0 ? (
              <p style={{ color: '#64748b' }}>No hay atenciones registradas</p>
            ) : (
              <div className="timeline">
  {historial.map(item => (
    <div key={item.id} className="timeline-item">
      <div className="timeline-dot" />
      <div className="timeline-card">
        <div className="timeline-date">
          {item.fecha}
        </div>
        <div>{item.diagnostico}</div>
        <div className="label">{item.cie}</div>
      </div>
    </div>
  ))}
</div>

            )}
          </div>
        )}
      </div>

      {/* MODAL REGISTRO */}
      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Registro de trabajador</h3>

            <input placeholder="Nombres" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
            <input placeholder="Apellidos" value={nuevoApellido} onChange={e => setNuevoApellido(e.target.value)} />
            <input value={nuevoDni} disabled />

            <div className="select-wrapper">
              <select value={sexo} onChange={e => setSexo(e.target.value)}>
                <option value="">Seleccione sexo</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>

            <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} />
            <input placeholder="Empresa" value={nuevaEmpresa} onChange={e => setNuevaEmpresa(e.target.value)} />
            <input placeholder="Dirección" value={nuevaDireccion} onChange={e => setNuevaDireccion(e.target.value)} />
            <input placeholder="Teléfono" value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value.replace(/\D/g, ''))} />

            <div className="modal-actions">
  <button onClick={registrarTrabajador}>
    Guardar trabajador
  </button>

  <button
    className="btn-secondary"
    onClick={() => setMostrarModal(false)}
  >
    Cancelar
  </button>
</div>

          </div>
        </div>
      )}
    </div>
  )
}

export default App