import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { auditService } from '../services/auditService'
import { consentService } from '../services/consentService'
import logo from '../assets/logo.png'
import ModalRegistroTrabajador from '../components/ModalRegistroTrabajador'
import ModalEvolucion from '../components/ModalEvolucion'
import { useEmpresa } from '../context/EmpresaContext'


function BusquedaSeguimiento() {
  /* =======================
     ESTADOS
  ======================= */
  const { empresaId } = useEmpresa()
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

  const [registroSeleccionado, setRegistroSeleccionado] = useState(null)
  const [mostrarEvolucion, setMostrarEvolucion] = useState(false)
  const [evolucionCounts, setEvolucionCounts] = useState({})
  const [currentUserName, setCurrentUserName] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState('')

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
    // Cargar nombre del usuario actual
    const cargarUsuario = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      setCurrentUserEmail(session.user.email)
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, nombres, apellidos')
        .eq('id', session.user.id)
        .single()
      if (profile) {
        setCurrentUserName(profile.full_name || `${profile.nombres} ${profile.apellidos}`)
      } else {
        setCurrentUserName(session.user.email)
      }
    }
    cargarUsuario()
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

    // AUDITORÍA: fire-and-forget
    auditService.record({
      action: 'UPDATE',
      module: 'Trabajadores',
      description: `Dio de baja al trabajador ${t.nombres} ${t.apellidos} (DNI: ${t.dni})`,
      details: { dni: t.dni, nombres: t.nombres, apellidos: t.apellidos },
      overrideUser: currentUserEmail || undefined
    }).catch(err => console.warn('Audit baja error:', err))

    alert('Trabajador dado de baja correctamente')
    buscar()
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

    // AUDITORÍA: fire-and-forget
    auditService.record({
      action: 'UPDATE',
      module: 'Trabajadores',
      description: `Dio de alta/reactivó al trabajador ${t.nombres} ${t.apellidos} (DNI: ${t.dni})`,
      details: { dni: t.dni, nombres: t.nombres, apellidos: t.apellidos },
      overrideUser: currentUserEmail || undefined
    }).catch(err => console.warn('Audit reactivar error:', err))

    alert('Trabajador dado de alta correctamente')
    buscar()
  }

  /* =======================
     BUSCAR TRABAJADOR
  ======================= */
  const buscar = async () => {
    if (!/^\d{8}$/.test(dni)) {
      setMensaje('Ingrese un DNI válido de 8 dígitos')
      return
    }

    if (!empresaId) {
      setMensaje('Error: No hay empresa activa. Recargue la página.')
      return
    }

    setCargando(true)
    setMensaje('Buscando trabajador...')
    setTrabajador(null)
    setConsentimiento(null)
    setHistorial([])
    setNoExiste(false)

    let timeoutId = null

    try {
      // Promise.race: si la query de Supabase demora más de 10s, la cancelamos en el cliente
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), 10000)
      })

      const queryPromise = (async () => {
        return await supabase
          .from('trabajadores')
          .select('*')
          .eq('dni', dni)
          .eq('empresa_id', empresaId)
          .maybeSingle()
      })()

      const { data, error } = await Promise.race([queryPromise, timeoutPromise])

      // Limpiar timeout de inmediato tras resolver
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      if (error) {
        console.error('Error buscando trabajador:', error)
        setMensaje(`Error: ${error.message}`)
        return
      }

      if (!data) {
        setMensaje('Trabajador no registrado')
        setNoExiste(true)
      } else {
        setMensaje('')
        setTrabajador(data)
        cargarHistorial(data.id)

        // Consentimiento (paralelo con historial, es rápido)
        consentService.getConsentByDni(dni)
          .then(cons => setConsentimiento(cons))
          .catch(err => console.warn('Error cargando consentimiento:', err))

        // Auditoría: fire-and-forget SIN getSession() (evita lock de GoTrue)
        auditService.record({
          action: 'VIEW',
          module: 'Trabajadores',
          description: `Visualizó el historial del trabajador ${data.nombres} ${data.apellidos} con DNI ${dni}`,
          details: { dni, worker_id: data.id },
          overrideUser: currentUserEmail || undefined
        }).catch(err => console.warn('Audit VIEW error:', err))
      }
    } catch (e) {
      console.error('buscar() error/timeout:', e.message)
      if (e.message === 'TIMEOUT') {
        setMensaje('⏱ La búsqueda tardó demasiado. Problema de conexión o permisos de base de datos.')
      } else {
        setMensaje(`Error inesperado: ${e.message}`)
      }
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      setCargando(false)
    }
  }


  /* =======================
     HISTORIAL
  ======================= */
  const cargarHistorial = async (id) => {
    const { data } = await supabase
      .from('registros_medicos')
      .select('id, fecha, sintomas, recomendaciones, cie, created_by_name')
      .eq('trabajador_id', id)
      .order('fecha', { ascending: false })

    const registros = data || []
    setHistorial(registros)

    // Cargar conteo de evoluciones para cada registro
    if (registros.length > 0) {
      const ids = registros.map(r => r.id)
      const { data: evols } = await supabase
        .from('evoluciones')
        .select('registro_medico_id')
        .in('registro_medico_id', ids)

      const counts = {}
      ;(evols || []).forEach(e => {
        counts[e.registro_medico_id] = (counts[e.registro_medico_id] || 0) + 1
      })
      setEvolucionCounts(counts)
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
    trabajador_id:   trabajador.id,
    sintomas,
    recomendaciones,
    cie:             `${diagnostico.codigo} - ${diagnostico.descripcion}`,
    fecha:           new Date().toISOString(),
    created_by_name: currentUserName || null,
    empresa_id:      empresaId,   // ← multi-tenant
  })

  if (!error) {
    // AUDITORÍA: fire-and-forget SIN getSession()
    auditService.record({
      action: 'CREATE',
      module: 'Atenciones Médicas',
      description: `Registró atención médica para el trabajador ${trabajador.nombres} ${trabajador.apellidos} (DNI: ${trabajador.dni}) con diagnóstico CIE: ${diagnostico.codigo} - ${diagnostico.descripcion}`,
      details: { 
        trabajador_id: trabajador.id,
        dni: trabajador.dni,
        cie: `${diagnostico.codigo} - ${diagnostico.descripcion}`
      },
      overrideUser: currentUserEmail || undefined
    }).catch(err => console.warn('Audit atención error:', err))
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

          <h3 className="busqueda-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#0f172a' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#blue-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <defs><linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#2563eb" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Búsqueda por DNI
          </h3>

          <form onSubmit={e => { e.preventDefault(); buscar() }} className="busqueda-form">
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <svg style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
                <circle cx="8" cy="12" r="2" />
                <line x1="13" y1="10" x2="19" y2="10" />
                <line x1="13" y1="14" x2="19" y2="14" />
              </svg>
              <input
                className="mrt-input"
                ref={dniInputRef}
                placeholder="Ingrese DNI (8 dígitos)"
                value={dni}
                onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
                maxLength={8}
                style={{ paddingLeft: '38px', width: '100%' }}
              />
            </div>
            
            <button type="submit" className="btn-accion btn-accion--edit" disabled={cargando} style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
              {cargando ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mrt-spin">
                    <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                  </svg>
                  Buscando...
                </>
              ) : (
                'Buscar trabajador'
              )}
            </button>
          </form>

          <p className="mensaje-busqueda" style={{ marginTop: '8px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
            {mensaje || 'Ingrese el DNI para cargar el historial'}
          </p>

          {noExiste && (
            <button
              type="button"
              className="btn-accion btn-accion--success"
              style={{ width: '100%', justifyContent: 'center', marginTop: '10px', padding: '10px' }}
              onClick={() => setMostrarModal(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Registrar trabajador
            </button>
          )}

        </div>

        {/* CARD TRABAJADOR */}
        {trabajador && (
          <div className="card card-paciente">
            {/* ── HEADER STICKY ── */}
            <div className="card-paciente-header">
              {/* Badge + nombre en la misma fila */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span className="badge" style={{
                  background: trabajador.empresa?.endsWith(' (DE BAJA)') ? '#fee2e2' : '#eff6ff',
                  color: trabajador.empresa?.endsWith(' (DE BAJA)') ? '#ef4444' : '#3b82f6',
                  fontWeight: 'bold',
                  flexShrink: 0
                }}>
                  {trabajador.empresa?.endsWith(' (DE BAJA)') ? 'DE BAJA' : 'Paciente'}
                </span>
                <h3 style={{ margin: 0, fontSize: '17px' }}>
                  {`${trabajador.nombres || ''} ${trabajador.apellidos || ''}`.trim().toUpperCase()}
                </h3>
              </div>

              {/* ── FILA ÚNICA DE ACCIONES ── */}
              <div className="paciente-acciones">
                {/* Editar */}
                <button
                  className="btn-accion btn-accion--edit"
                  onClick={() => {
                    setTrabajadorParaEditar(trabajador)
                    setMostrarModal(true)
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editar
                </button>

                {/* Dar de baja / alta */}
                {trabajador.empresa?.endsWith(' (DE BAJA)') ? (
                  <button
                    className="btn-accion btn-accion--success"
                    onClick={async () => {
                      if (window.confirm('¿Desea volver a dar de alta/reactivar a este trabajador?')) {
                        await reactivarTrabajador(trabajador)
                      }
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Dar de alta
                  </button>
                ) : (
                  <button
                    className="btn-accion btn-accion--danger"
                    onClick={async () => {
                      if (window.confirm('¿Está seguro de que desea dar de baja a este trabajador?')) {
                        await darDeBajaTrabajador(trabajador)
                      }
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Dar de baja
                  </button>
                )}

                {/* Descargar consentimiento */}
                {consentimiento && (
                  <button
                    className="btn-accion btn-accion--teal"
                    onClick={() => {
                      const win = window.open(consentimiento.pdf_url, '_blank');
                      if (win) win.focus();
                      // Fire-and-forget SIN getSession() (evita lock de GoTrue)
                      auditService.record({
                        action: 'DOWNLOAD',
                        module: 'Consentimientos',
                        description: `Descargó el consentimiento firmado de: ${trabajador.nombres} ${trabajador.apellidos} (DNI: ${trabajador.dni})`,
                        details: { dni: trabajador.dni, pdf_url: consentimiento.pdf_url },
                        overrideUser: currentUserEmail || undefined
                      }).catch(err => console.warn('Audit DOWNLOAD error:', err));
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Consentimiento
                  </button>
                )}
              </div>
              {/* ── FIN FILA DE ACCIONES ── */}

              {/* DATOS EN 2 COLUMNAS */}
              <div className="paciente-info">
                <div>
                  <p><b>DNI:</b> {trabajador.dni}</p>
                  <p><b>Fecha de nacimiento:</b> {formatearFechaNacimiento(trabajador.fecha_nacimiento)}</p>
                  <p><b>Sexo:</b> {trabajador.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
                  <p><b>Teléfono:</b> {trabajador.telefono || '-'}</p>
                </div>
                <div>
                  <p><b>Empresa:</b> {trabajador.empresa || '-'}</p>
                  {trabajador.puesto && <p><b>Puesto:</b> {trabajador.puesto}</p>}
                  <p><b>Dirección:</b> {trabajador.direccion || '-'}</p>
                </div>
              </div>
            </div>
            {/* ── FIN HEADER STICKY ── */}

            {/* ── BODY SCROLLEABLE ── */}
            <div className="card-paciente-body">

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
                    <div
                      className="historial-card historial-card--clickable"
                      onClick={() => {
                        setRegistroSeleccionado(item)
                        setMostrarEvolucion(true)
                      }}
                      title="Click para ver o agregar seguimientos de evolución"
                    >
                      <div className="historial-card-top">
                        <div className="historial-cie">{item.cie}</div>
                        <div className="historial-evol-badge">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                          </svg>
                          {evolucionCounts[item.id] || 0} seguimiento{(evolucionCounts[item.id] || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div><b>Síntomas:</b> {item.sintomas}</div>
                      <div><b>Recomendaciones:</b> {item.recomendaciones}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
            {/* ── FIN BODY SCROLLEABLE ── */}
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
          buscar()
        }}
      />

      <ModalEvolucion
        abierto={mostrarEvolucion}
        registro={registroSeleccionado}
        trabajador={trabajador}
        onClose={() => {
          setMostrarEvolucion(false)
          setRegistroSeleccionado(null)
          // Refrescar conteos al cerrar
          if (trabajador) cargarHistorial(trabajador.id)
        }}
      />

    </div>
  )
}

export default BusquedaSeguimiento
