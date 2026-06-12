import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { restQuery } from '../lib/supabaseRest'
import { auditService } from '../services/auditService'

export default function ModalEvolucion({ abierto, registro, trabajador, onClose }) {
  const [evoluciones, setEvoluciones]   = useState([])
  const [nuevaNota, setNuevaNota]       = useState('')
  const [guardando, setGuardando]       = useState(false)
  const [cargando, setCargando]         = useState(false)
  const [currentUserName, setCurrentUserName] = useState('')
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)

  const timelineEndRef = useRef(null)
  const fileInputRef   = useRef(null)

  /* ── Al abrir ── */
  useEffect(() => {
    if (abierto && registro) {
      cargarEvoluciones()
      cargarUsuarioActual()
    }
    if (!abierto) {
      setArchivoSeleccionado(null)
      setNuevaNota('')
    }
  }, [abierto, registro])

  useEffect(() => {
    if (evoluciones.length > 0) {
      timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [evoluciones])

  /* ── Helpers ── */
  const formatearFechaHoraPE = (fechaUTC) => {
    if (!fechaUTC) return '-'
    return new Date(fechaUTC).toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    })
  }

  const cargarUsuarioActual = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return
    const profileArr = await restQuery(`profiles?select=full_name,nombres,apellidos&id=eq.${session.user.id}`)
    const profile = profileArr[0] || null
    if (profile) {
      setCurrentUserName(profile.full_name || `${profile.nombres} ${profile.apellidos}`)
    } else {
      setCurrentUserName(session.user.email)
    }
  }

  const cargarEvoluciones = async () => {
    setCargando(true)
    const data = await restQuery(`evoluciones?select=*&registro_medico_id=eq.${registro.id}&order=fecha.asc`)
    setEvoluciones(data || [])
    setCargando(false)
  }

  /* ── Subir archivo a Storage ── */
  const subirArchivo = async (registroId) => {
    if (!archivoSeleccionado) return { url: null, nombre: null }
    setSubiendoArchivo(true)
    const ext  = archivoSeleccionado.name.split('.').pop()
    const path = `evoluciones/${registroId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('evidencias')
      .upload(path, archivoSeleccionado, { upsert: false })

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError)
      setSubiendoArchivo(false)
      return { url: null, nombre: null }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('evidencias')
      .getPublicUrl(path)

    setSubiendoArchivo(false)
    return { url: publicUrl, nombre: archivoSeleccionado.name }
  }

  /* ── Guardar seguimiento ── */
  const guardarEvolucion = async () => {
    if (!nuevaNota.trim()) return
    setGuardando(true)

    // 1. Subir evidencia si hay una
    const { url: evidenciaUrl, nombre: evidenciaNombre } = await subirArchivo(registro.id)

    // 2. Insertar evolución
    const { error } = await supabase.from('evoluciones').insert({
      registro_medico_id: registro.id,
      nota:               nuevaNota.trim(),
      fecha:              new Date().toISOString(),
      created_by_name:    currentUserName,
      evidencia_url:      evidenciaUrl,
      evidencia_nombre:   evidenciaNombre
    })

    if (!error) {
      await auditService.record({
        action:      'CREATE',
        module:      'Evoluciones',
        description: `Registró evolución para diagnóstico ${registro.cie} — ${trabajador.nombres} ${trabajador.apellidos} (DNI: ${trabajador.dni})`,
        details:     { registro_medico_id: registro.id, dni: trabajador.dni, evidencia: evidenciaNombre }
      })
      setNuevaNota('')
      setArchivoSeleccionado(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await cargarEvoluciones()
    }
    setGuardando(false)
  }

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') guardarEvolucion()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setArchivoSeleccionado(file)
  }

  const esImagen = (nombre) => /\.(jpg|jpeg|png|gif|webp)$/i.test(nombre || '')

  if (!abierto || !registro) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-evolucion" onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="evol-header">
          <div className="evol-header-left">
            <span className="evol-tag">Seguimiento de evolución</span>
            <h2 className="evol-title">{registro.cie}</h2>
            <p className="evol-subtitle">
              {trabajador.nombres} {trabajador.apellidos} · DNI {trabajador.dni}
            </p>
          </div>
          <button className="evol-close-btn" onClick={onClose} title="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── DATOS DE LA ATENCIÓN ORIGINAL ── */}
        <div className="evol-atencion-original">
          <div className="evol-atencion-fecha">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Atención del {formatearFechaHoraPE(registro.fecha)}
            {/* Médico registrador */}
            {registro.created_by_name && (
              <span className="evol-autor">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                {registro.created_by_name}
              </span>
            )}
          </div>
          <div className="evol-atencion-grid">
            <div>
              <span className="evol-label">Síntomas</span>
              <p className="evol-value">{registro.sintomas || <em>Sin registro</em>}</p>
            </div>
            <div>
              <span className="evol-label">Recomendaciones</span>
              <p className="evol-value">{registro.recomendaciones || <em>Sin registro</em>}</p>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="evol-body">

          {/* Timeline */}
          <div className="evol-timeline-section">
            <div className="evol-section-header">
              <h4 className="evol-section-title">Seguimientos registrados</h4>
              <span className="evol-count-badge">{evoluciones.length}</span>
            </div>

            <div className="evol-timeline">
              {cargando ? (
                <p className="evol-empty">Cargando seguimientos...</p>
              ) : evoluciones.length === 0 ? (
                <div className="evol-empty-state">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <p>Sin seguimientos aún. Agregue el primero abajo.</p>
                </div>
              ) : (
                evoluciones.map((ev, idx) => (
                  <div key={ev.id} className="evol-item">
                    <div className="evol-item-marker">
                      <div className="evol-item-dot">{idx + 1}</div>
                      {idx < evoluciones.length - 1 && <div className="evol-item-line" />}
                    </div>
                    <div className="evol-item-content">
                      {/* Fecha + autor */}
                      <div className="evol-item-meta">
                        <span className="evol-item-date">{formatearFechaHoraPE(ev.fecha)}</span>
                        {ev.created_by_name && (
                          <span className="evol-autor">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                            </svg>
                            {ev.created_by_name}
                          </span>
                        )}
                      </div>
                      <p className="evol-item-nota">{ev.nota}</p>
                      {/* Evidencia adjunta */}
                      {ev.evidencia_url && (
                        <div className="evol-evidencia">
                          {esImagen(ev.evidencia_nombre) ? (
                            <a href={ev.evidencia_url} target="_blank" rel="noopener noreferrer">
                              <img src={ev.evidencia_url} alt={ev.evidencia_nombre} className="evol-evidencia-img" />
                            </a>
                          ) : (
                            <a href={ev.evidencia_url} target="_blank" rel="noopener noreferrer" className="evol-evidencia-link">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              {ev.evidencia_nombre}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={timelineEndRef} />
            </div>
          </div>

          {/* Formulario nuevo seguimiento */}
          <div className="evol-form-section">
            <div className="evol-section-header">
              <h4 className="evol-section-title">Nuevo seguimiento</h4>
              <span className="evol-hint">Ctrl+Enter para guardar</span>
            </div>
            <textarea
              className="evol-textarea"
              placeholder="Describe la evolución del paciente: cambios observados, respuesta al tratamiento, nueva indicación médica, próxima cita..."
              value={nuevaNota}
              onChange={e => setNuevaNota(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />

            {/* Previsualización del archivo seleccionado */}
            {archivoSeleccionado && (
              <div className="evol-file-preview">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                </svg>
                <span>{archivoSeleccionado.name}</span>
                <button
                  className="evol-file-remove"
                  onClick={() => { setArchivoSeleccionado(null); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  title="Quitar archivo"
                >✕</button>
              </div>
            )}

            <div className="evol-form-actions">
              {/* Input oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Botón adjuntar evidencia */}
              <button
                className="btn-accion-evidencia"
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar imagen, PDF u otro documento"
                type="button"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                {archivoSeleccionado ? 'Cambiar evidencia' : 'Adjuntar evidencia'}
              </button>

              {/* Botón guardar */}
              <button
                className="btn-accion btn-accion--edit"
                onClick={guardarEvolucion}
                disabled={!nuevaNota.trim() || guardando || subiendoArchivo}
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {subiendoArchivo ? 'Subiendo...' : guardando ? 'Guardando...' : 'Guardar seguimiento'}
              </button>

              <button className="evol-btn-cerrar" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
