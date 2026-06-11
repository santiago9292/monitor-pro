import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { auditService } from '../services/auditService'
import { consentService } from '../services/consentService'
import { useEmpresa } from '../context/EmpresaContext'

export default function ModalRegistroTrabajador({
  abierto,
  dniInicial,
  onClose,
  onRegistrado,
  onGuardado,
  trabajadorParaEditar = null
}) {
  const nombreRef = useRef(null)
  const { empresaId } = useEmpresa()

  const [dni, setDni]                         = useState('')
  const [nombres, setNombres]                 = useState('')
  const [apellidos, setApellidos]             = useState('')
  const [sexo, setSexo]                       = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [empresa, setEmpresa]                 = useState('')
  const [puesto, setPuesto]                   = useState('')
  const [direccion, setDireccion]             = useState('')
  const [telefono, setTelefono]               = useState('')

  const [guardando, setGuardando]             = useState(false)
  const [exito, setExito]                     = useState(false)
  const [generandoEnlace, setGenerandoEnlace] = useState(false)
  const [enlaceWhatsApp, setEnlaceWhatsApp]   = useState('')
  const [trabajadorCreado, setTrabajadorCreado] = useState(null)

  /* ── Init / Reset ── */
  useEffect(() => {
    if (abierto) {
      if (trabajadorParaEditar) {
        setDni(trabajadorParaEditar.dni || '')
        setNombres(trabajadorParaEditar.nombres || '')
        setApellidos(trabajadorParaEditar.apellidos || '')
        setSexo(trabajadorParaEditar.sexo || '')
        setFechaNacimiento(trabajadorParaEditar.fecha_nacimiento || '')
        setEmpresa(trabajadorParaEditar.empresa || '')
        setPuesto(trabajadorParaEditar.puesto || '')
        setDireccion(trabajadorParaEditar.direccion || '')
        setTelefono(trabajadorParaEditar.telefono || '')
      } else {
        setDni(dniInicial || '')
        setNombres('')
        setApellidos('')
        setSexo('')
        setFechaNacimiento('')
        setEmpresa('')
        setPuesto('')
        setDireccion('')
        setTelefono('')
      }
      setGuardando(false)
      setExito(false)
      setGenerandoEnlace(false)
      setEnlaceWhatsApp('')
      setTrabajadorCreado(null)
      setTimeout(() => nombreRef.current?.focus(), 0)
    }
  }, [abierto, dniInicial, trabajadorParaEditar])

  const finalizarYcerrar = () => {
    if (trabajadorCreado) {
      if (typeof onRegistrado === 'function') onRegistrado(trabajadorCreado)
      if (typeof onGuardado === 'function') onGuardado(trabajadorCreado)
    }
    onClose()
  }

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') finalizarYcerrar() }
    if (abierto) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [abierto, onClose, trabajadorCreado, onRegistrado, onGuardado])

  if (!abierto) return null

  /* ── Guardar ── */
  const registrarTrabajador = async () => {
    if (!dni || !nombres.trim() || !apellidos.trim() || !sexo ||
        !fechaNacimiento || !empresa.trim() || !direccion.trim() || !telefono.trim()) {
      alert('Debe completar todos los campos obligatorios')
      return
    }
    setGuardando(true)

    let data, error

    if (trabajadorParaEditar) {
      const { data: updateData, error: updateError } = await supabase
        .from('trabajadores')
        .update({
          nombres:          nombres.trim().toUpperCase(),
          apellidos:        apellidos.trim().toUpperCase(),
          sexo,
          fecha_nacimiento: fechaNacimiento,
          empresa:          empresa.trim(),
          puesto:           puesto.trim() || null,
          direccion:        direccion.trim(),
          telefono:         telefono.trim()
        })
        .eq('id', trabajadorParaEditar.id)
        .select()
        .single()
      data = updateData
      error = updateError
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from('trabajadores')
        .insert({
          dni,
          nombres:          nombres.trim().toUpperCase(),
          apellidos:        apellidos.trim().toUpperCase(),
          sexo,
          fecha_nacimiento: fechaNacimiento,
          empresa:          empresa.trim(),
          puesto:           puesto.trim() || null,
          direccion:        direccion.trim(),
          telefono:         telefono.trim(),
          empresa_id:       empresaId,        // ← multi-tenant
        })
        .select()
        .single()
      data = insertData
      error = insertError
    }

    if (error) {
      console.error(error)
      alert(trabajadorParaEditar ? 'Error al actualizar trabajador' : 'Error al registrar trabajador')
      setGuardando(false)
      return
    }

    if (trabajadorParaEditar) {
      await auditService.record({
        action:      'UPDATE',
        module:      'Trabajadores',
        description: `Editó los datos del trabajador ${nombres.trim().toUpperCase()} ${apellidos.trim().toUpperCase()} con DNI ${dni}`,
        details:     { dni }
      })
      setGuardando(false)
      if (typeof onGuardado === 'function') onGuardado(data)
      if (typeof onRegistrado === 'function') onRegistrado(data)
      onClose()
    } else {
      await auditService.record({
        action:      'CREATE',
        module:      'Trabajadores',
        description: `Registró al trabajador ${nombres.trim().toUpperCase()} ${apellidos.trim().toUpperCase()} con DNI ${dni}`,
        details:     { dni }
      })
      setExito(true)
      setTrabajadorCreado(data)
      setGenerandoEnlace(true)
      try {
        const workerName = `${nombres.trim().toUpperCase()} ${apellidos.trim().toUpperCase()}`
        const linkId = await consentService.createConsentLink(dni, workerName, 'Profesional Monitor Pro', telefono)
        const url = `${window.location.origin}/firmar/${linkId}`
        const msg = `🏥 *Monitor Pro – VitaCorp360*\n\nHola ${workerName}, le saludamos del equipo de *Salud Ocupacional*.\n\nLe hacemos llegar su enlace personal para firmar el *Consentimiento Informado* de manera digital, rápida y segura:\n\n👉 ${url}\n\n⚠️ *El enlace estará activo por 15 minutos, por favor fírmelo antes de ese tiempo.*\n\n📋 *Instrucciones:*\n• Ingrese al enlace desde su celular o computadora.\n• Lea el documento con detenimiento.\n• Firme con su dedo o mouse en el espacio indicado.\n\nSi tiene alguna duda, comuníquese con su médico ocupacional.\n\nAtentamente,\n*Profesional Monitor Pro*\n_Monitor Pro – VitaCorp360_`
        setEnlaceWhatsApp(`https://wa.me/${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`)
      } catch (err) {
        console.error('Error generando enlace', err)
      } finally {
        setGenerandoEnlace(false)
      }
    }
  }

  const esEdicion = Boolean(trabajadorParaEditar)

  return (
    <div className="modal-overlay" onClick={finalizarYcerrar}>
      <div className="mrt-modal" onClick={e => e.stopPropagation()}>

        {/* ── HEADER ── */}
        <div className="mrt-header">
          <div className="mrt-header-icon">
            {esEdicion ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>
          <div className="mrt-header-text">
            <h2 className="mrt-title">{esEdicion ? 'Editar trabajador' : 'Registro de trabajador'}</h2>
            <p className="mrt-subtitle">DNI: <strong>{dni}</strong></p>
          </div>
          <button className="mrt-close-btn" onClick={finalizarYcerrar} title="Cerrar (Esc)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* ── BODY ── */}
        {exito ? (
          /* ── ESTADO ÉXITO ── */
          <div className="mrt-success">
            <div className="mrt-success-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 className="mrt-success-title">¡Trabajador registrado!</h3>
            <p className="mrt-success-sub">
              {nombres.trim().toUpperCase()} {apellidos.trim().toUpperCase()} · DNI {dni}
            </p>

            <div className="mrt-consent-box">
              <p className="mrt-consent-label">Consentimiento Informado</p>
              {generandoEnlace ? (
                <p className="mrt-consent-loading">Generando enlace único…</p>
              ) : enlaceWhatsApp ? (
                <button className="mrt-wa-btn" onClick={() => window.open(enlaceWhatsApp, '_blank')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  Enviar enlace por WhatsApp
                </button>
              ) : (
                <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>Error al generar el enlace</p>
              )}
            </div>

            <button className="mrt-btn-secondary" onClick={finalizarYcerrar}>
              Cerrar ventana
            </button>
          </div>
        ) : (
          /* ── FORMULARIO ── */
          <div className="mrt-form">

            {/* Sección: Datos personales */}
            <div className="mrt-section-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Datos personales
            </div>

            <div className="mrt-row">
              <div className="mrt-field">
                <label className="mrt-label">Nombres</label>
                <input
                  ref={nombreRef}
                  className="mrt-input"
                  placeholder="Ej. JUAN CARLOS"
                  value={nombres}
                  onChange={e => setNombres(e.target.value.toUpperCase())}
                  disabled={guardando}
                />
              </div>
              <div className="mrt-field">
                <label className="mrt-label">Apellidos</label>
                <input
                  className="mrt-input"
                  placeholder="Ej. PÉREZ GARCÍA"
                  value={apellidos}
                  onChange={e => setApellidos(e.target.value.toUpperCase())}
                  disabled={guardando}
                />
              </div>
            </div>

            <div className="mrt-row mrt-row--3">
              <div className="mrt-field">
                <label className="mrt-label">DNI</label>
                <input className="mrt-input mrt-input--disabled" value={dni} disabled />
              </div>
              <div className="mrt-field">
                <label className="mrt-label">Sexo</label>
                <select
                  className="mrt-input"
                  value={sexo}
                  onChange={e => setSexo(e.target.value)}
                  disabled={guardando}
                >
                  <option value="">Seleccionar…</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
              <div className="mrt-field">
                <label className="mrt-label">Fecha de nacimiento</label>
                <input
                  className="mrt-input"
                  type="date"
                  value={fechaNacimiento}
                  onChange={e => setFechaNacimiento(e.target.value)}
                  disabled={guardando}
                />
              </div>
            </div>

            {/* Sección: Datos laborales */}
            <div className="mrt-section-label" style={{ marginTop: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              Datos laborales
            </div>

            <div className="mrt-row">
              <div className="mrt-field">
                <label className="mrt-label">Empresa</label>
                <input
                  className="mrt-input"
                  placeholder="Nombre de la empresa"
                  value={empresa}
                  onChange={e => setEmpresa(e.target.value)}
                  disabled={guardando}
                />
              </div>
              <div className="mrt-field">
                <label className="mrt-label">Puesto / Cargo</label>
                <input
                  className="mrt-input"
                  placeholder="Ej. Operador, Técnico, Supervisor"
                  value={puesto}
                  onChange={e => setPuesto(e.target.value)}
                  disabled={guardando}
                />
              </div>
            </div>

            <div className="mrt-row">
              <div className="mrt-field">
                <label className="mrt-label">Dirección</label>
                <input
                  className="mrt-input"
                  placeholder="Av. / Calle / Jr. y número"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  disabled={guardando}
                />
              </div>
              <div className="mrt-field">
                <label className="mrt-label">Teléfono <span className="mrt-required">*</span></label>
                <input
                  className="mrt-input"
                  placeholder="Ej. 999888777"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))}
                  disabled={guardando}
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="mrt-actions">
              <button
                className="btn-accion btn-accion--edit mrt-btn-save"
                onClick={registrarTrabajador}
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mrt-spin">
                      <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                    </svg>
                    Guardando…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                    </svg>
                    {esEdicion ? 'Actualizar trabajador' : 'Registrar trabajador'}
                  </>
                )}
              </button>
              <button className="mrt-btn-secondary" onClick={onClose} disabled={guardando}>
                Cancelar
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
