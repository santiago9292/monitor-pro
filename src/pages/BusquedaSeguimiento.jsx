import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { auditService } from '../services/auditService'
import { consentService } from '../services/consentService'
import logo from '../assets/logo.png'
import ModalRegistroTrabajador from '../components/ModalRegistroTrabajador'


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
  const [consentimiento, setConsentimiento] = useState(null)

  const [sintomas, setSintomas] = useState('')
  const [recomendaciones, setRecomendaciones] = useState('')
  const [cieQuery, setCieQuery] = useState('')
  const [cieResultados, setCieResultados] = useState([])
  const [diagnostico, setDiagnostico] = useState(null)

  const [mostrarModal, setMostrarModal] = useState(false)
  const [trabajadorParaEditar, setTrabajadorParaEditar] = useState(null)
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

  const darDeBajaTrabajador = async (t) => {
    const nuevaEmpresa = t.empresa.endsWith(' (DE BAJA)') 
      ? t.empresa 
      : `${t.empresa} (DE BAJA)`

    const { error } = await supabase
      .from('trabajadores')
      .update({ empresa: nuevaEmpresa })
      .eq('id', t.id)

    if (error) {
      alert('Error al dar de baja al trabajador')
      return
    }

    // AUDITORÍA
    await auditService.record({
      action: 'UPDATE',
      module: 'Trabajadores',
      description: `Dio de baja al trabajador ${t.nombres} ${t.apellidos} (DNI: ${t.dni})`,
      details: { dni: t.dni, nombres: t.nombres, apellidos: t.apellidos }
    })

    alert('Trabajador dado de baja correctamente')
    buscar() // Refrescar datos
  }

  const reactivarTrabajador = async (t) => {
    const nuevaEmpresa = t.empresa.endsWith(' (DE BAJA)')
      ? t.empresa.slice(0, -10).trim()
      : t.empresa

    const { error } = await supabase
      .from('trabajadores')
      .update({ empresa: nuevaEmpresa })
      .eq('id', t.id)

    if (error) {
      alert('Error al dar de alta al trabajador')
      return
    }

    // AUDITORÍA
    await auditService.record({
      action: 'UPDATE',
      module: 'Trabajadores',
      description: `Dio de alta/reactivó al trabajador ${t.nombres} ${t.apellidos} (DNI: ${t.dni})`,
      details: { dni: t.dni, nombres: t.nombres, apellidos: t.apellidos }
    })

    alert('Trabajador dado de alta correctamente')
    buscar() // Refrescar datos
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
    setConsentimiento(null) // Reset
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

      // Cargar consentimiento
      const cons = await consentService.getConsentByDni(dni)
      setConsentimiento(cons)
      
      // AUDITORÍA
      await auditService.record({
        action: 'VIEW',
        module: 'Trabajadores',
        description: `Visualizó los datos y el historial médico del trabajador ${data.nombres} ${data.apellidos} con DNI ${dni}`,
        details: { dni, worker_id: data.id }
      });
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
  if (!consentimiento) {
    alert("No se puede registrar atención: El trabajador no cuenta con un consentimiento firmado.")
    return
  }
  if (!sintomas.trim() || !diagnostico) return

  const { error } = await supabase.from('registros_medicos').insert({
    trabajador_id: trabajador.id,
    sintomas,
    recomendaciones,
    cie: `${diagnostico.codigo} - ${diagnostico.descripcion}`,
    fecha: new Date().toISOString() // ✅ UTC limpio
  })

  if (!error) {
    // AUDITORÍA: Registro de creación exitosa de Atención Médica
    try {
      await auditService.record({
        action: 'CREATE',
        module: 'Atenciones Médicas',
        description: `Registró atención médica para el trabajador ${trabajador.nombres} ${trabajador.apellidos} (DNI: ${trabajador.dni}) con diagnóstico CIE: ${diagnostico.codigo} - ${diagnostico.descripcion}`,
        details: { 
          trabajador_id: trabajador.id,
          dni: trabajador.dni,
          cie: `${diagnostico.codigo} - ${diagnostico.descripcion}`
        }
      });
    } catch (auditErr) {
      console.error("Error al registrar auditoría de atención médica:", auditErr)
    }
  }

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

      <div className="grid">
        {/* CARD BÚSQUEDA */}
        <div className="card card-busqueda">

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

          <p className="mensaje-busqueda">{mensaje}</p>
          {noExiste && (
  <button
    type="button"
    className="btn-primary"
    style={{ marginTop: 10 }}
    onClick={() => setMostrarModal(true)}
  >
    ➕ Registrar trabajador
  </button>
)}


        </div>

        {/* CARD TRABAJADOR */}
        {trabajador && (
          <div className="card">
            <span className="badge" style={{
              background: trabajador.empresa?.endsWith(' (DE BAJA)') ? '#fee2e2' : '#eff6ff',
              color: trabajador.empresa?.endsWith(' (DE BAJA)') ? '#ef4444' : '#3b82f6',
              fontWeight: 'bold'
            }}>
              {trabajador.empresa?.endsWith(' (DE BAJA)') ? 'DE BAJA' : 'Paciente'}
            </span>

            <h3>
              {trabajador.nombres} {trabajador.apellidos}
            </h3>

            {/* ACCIONES DE TRABAJADOR */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', marginBottom: '15px' }}>
              <button
                onClick={() => {
                  setTrabajadorParaEditar(trabajador)
                  setMostrarModal(true)
                }}
                className="btn-primary"
                style={{ 
                  background: '#2563eb', 
                  fontSize: '12px', 
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ✏️ Editar Trabajador
              </button>

              {trabajador.empresa?.endsWith(' (DE BAJA)') ? (
                <button
                  onClick={async () => {
                    if (window.confirm('¿Desea volver a dar de alta/reactivar a este trabajador?')) {
                      await reactivarTrabajador(trabajador)
                    }
                  }}
                  className="btn-primary"
                  style={{ 
                    background: '#10b981', 
                    fontSize: '12px', 
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🟢 Dar de alta
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if (window.confirm('¿Está seguro de que desea dar de baja a este trabajador? Ya no se considerará para las estadísticas ni reportes gerenciales.')) {
                      await darDeBajaTrabajador(trabajador)
                    }
                  }}
                  className="btn-primary"
                  style={{ 
                    background: '#ef4444', 
                    fontSize: '12px', 
                    padding: '6px 12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  🔴 Dar de baja
                </button>
              )}
            </div>

            {/* DATOS EN 2 COLUMNAS */}
            <div className="paciente-info">
              <div>
                <p><b>DNI:</b> {trabajador.dni}</p>
                <p><b>Fecha de nacimiento:</b> {formatearFechaNacimiento(trabajador.fecha_nacimiento)}</p>
                <p><b>Sexo:</b> {trabajador.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
              </div>
              <div>
                <p><b>Empresa:</b> {trabajador.empresa || '-'}</p>
                <p><b>Dirección:</b> {trabajador.direccion || '-'}</p>
                <p><b>Teléfono:</b> {trabajador.telefono || '-'}</p>
              </div>
            </div>

            {/* BOTÓN CONSENTIMIENTO SI EXISTE */}
            {consentimiento && (
              <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                <button 
                  onClick={async () => {
                    const win = window.open(consentimiento.pdf_url, '_blank');
                    if (win) win.focus();
                    
                    await auditService.record({
                      action: 'DOWNLOAD',
                      module: 'Consentimientos',
                      description: `Descargó el consentimiento firmado de: ${trabajador.nombres} ${trabajador.apellidos} (DNI: ${trabajador.dni})`,
                      details: { dni: trabajador.dni, pdf_url: consentimiento.pdf_url }
                    });
                  }}
                  className="mp-roles-primary-btn"
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    background: '#0d9488',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '8px 14px'
                  }}
                >
                  📄 Descargar Consentimiento Firmado
                </button>
              </div>
            )}

            {/* BANNER: Trabajador de baja */}
            {trabajador.empresa?.endsWith(' (DE BAJA)') && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                🔴 TRABAJADOR DADO DE BAJA. No se pueden registrar nuevas atenciones. El historial médico anterior sigue disponible para consulta.
              </div>
            )}

            {/* BANNER: Sin consentimiento (solo si está activo) */}
            {!consentimiento && !trabajador.empresa?.endsWith(' (DE BAJA)') && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                ⚠️ TRABAJADOR SIN CONSENTIMIENTO INFORMADO FIRMADO. Para registrar atenciones médicas, primero debe generar y firmar el consentimiento de este trabajador en la pestaña de "Consentimiento".
              </div>
            )}

            {/* NUEVA ATENCIÓN: Ocultar formulario si está de baja */}
            {!trabajador.empresa?.endsWith(' (DE BAJA)') && (
              <>
                <textarea
                  className="auto-textarea"
                  placeholder="Síntomas"
                  value={sintomas}
                  onChange={e => setSintomas(e.target.value)}
                  disabled={!consentimiento}
                />

                <textarea
                  className="auto-textarea"
                  placeholder="Recomendaciones"
                  value={recomendaciones}
                  onChange={e => setRecomendaciones(e.target.value)}
                  disabled={!consentimiento}
                />

                <label>Diagnóstico (CIE)</label>

                <div className="cie-autocomplete">
                  <input
                    placeholder="Buscar diagnóstico (CIE)"
                    value={cieQuery}
                    onChange={e => setCieQuery(e.target.value)}
                    disabled={!consentimiento}
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
                  disabled={!sintomas || !diagnostico || !consentimiento}
                  onClick={registrarAtencion}
                >
                  Guardar atención
                </button>
              </>
            )}

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
      <ModalRegistroTrabajador
        abierto={mostrarModal}
        dniInicial={dni}
        trabajadorParaEditar={trabajadorParaEditar}
        onClose={() => {
          setMostrarModal(false)
          setTrabajadorParaEditar(null)
        }}
        onGuardado={() => {
          setMostrarModal(false)
          setTrabajadorParaEditar(null)
          setNoExiste(false)
          buscar() // vuelve a ejecutar la búsqueda y carga el trabajador
        }}
      />

    </div>
  )
}

export default BusquedaSeguimiento
