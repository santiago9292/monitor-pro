import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { auditService } from '../services/auditService'
import { consentService } from '../services/consentService'

export default function ModalRegistroTrabajador({
  abierto,
  dniInicial,
  onClose,
  onRegistrado,
  onGuardado,
  trabajadorParaEditar = null
}) {
  const nombreRef = useRef(null)

  const [dni, setDni] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [sexo, setSexo] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [generandoEnlace, setGenerandoEnlace] = useState(false)
  const [enlaceWhatsApp, setEnlaceWhatsApp] = useState('')
  const [trabajadorCreado, setTrabajadorCreado] = useState(null)

  /* =======================
     INIT / RESET
  ======================= */
  useEffect(() => {
    if (abierto) {
      if (trabajadorParaEditar) {
        setDni(trabajadorParaEditar.dni || '')
        setNombres(trabajadorParaEditar.nombres || '')
        setApellidos(trabajadorParaEditar.apellidos || '')
        setSexo(trabajadorParaEditar.sexo || '')
        setFechaNacimiento(trabajadorParaEditar.fecha_nacimiento || '')
        setEmpresa(trabajadorParaEditar.empresa || '')
        setDireccion(trabajadorParaEditar.direccion || '')
        setTelefono(trabajadorParaEditar.telefono || '')
      } else {
        setDni(dniInicial || '')
        setNombres('')
        setApellidos('')
        setSexo('')
        setFechaNacimiento('')
        setEmpresa('')
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

  /* =======================
     ESC PARA CERRAR
  ======================= */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') finalizarYcerrar()
    }

    if (abierto) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [abierto, onClose, trabajadorCreado, onRegistrado, onGuardado])

  if (!abierto) return null

  /* =======================
     GUARDAR
  ======================= */
  const registrarTrabajador = async () => {
    if (
      !dni ||
      !nombres.trim() ||
      !apellidos.trim() ||
      !sexo ||
      !fechaNacimiento ||
      !empresa.trim() ||
      !direccion.trim() ||
      !telefono.trim()
    ) {
      alert('Debe completar todos los campos')
      return
    }

    setGuardando(true)

    let data, error

    if (trabajadorParaEditar) {
      const { data: updateData, error: updateError } = await supabase
        .from('trabajadores')
        .update({
          nombres: nombres.trim().toUpperCase(),
          apellidos: apellidos.trim().toUpperCase(),
          sexo,
          fecha_nacimiento: fechaNacimiento,
          empresa: empresa.trim(),
          direccion: direccion.trim(),
          telefono: telefono.trim()
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
          nombres: nombres.trim().toUpperCase(),
          apellidos: apellidos.trim().toUpperCase(),
          sexo,
          fecha_nacimiento: fechaNacimiento,
          empresa: empresa.trim(),
          direccion: direccion.trim(),
          telefono: telefono.trim()
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
      // AUDITORÍA: Registro de actualización exitosa
      await auditService.record({
        action: 'UPDATE',
        module: 'Trabajadores',
        description: `Editó los datos del trabajador ${nombres.trim().toUpperCase()} ${apellidos.trim().toUpperCase()} con DNI ${dni}`,
        details: { dni, nombre: `${nombres.trim().toUpperCase()} ${apellidos.trim().toUpperCase()}` }
      });
      
      setGuardando(false)
      if (typeof onGuardado === 'function') onGuardado(data)
      if (typeof onRegistrado === 'function') onRegistrado(data)
      onClose()
    } else {
      // AUDITORÍA: Registro de creación exitosa
      await auditService.record({
        action: 'CREATE',
        module: 'Trabajadores',
        description: `Registró al trabajador ${nombres.trim().toUpperCase()} ${apellidos.trim().toUpperCase()} con DNI ${dni}`,
        details: { dni, nombre: `${nombres.trim().toUpperCase()} ${apellidos.trim().toUpperCase()}` }
      });

      setExito(true)
      setTrabajadorCreado(data)

      // Generar enlace
      setGenerandoEnlace(true)
      try {
        const workerName = `${nombres.trim().toUpperCase()} ${apellidos.trim().toUpperCase()}`
        const linkId = await consentService.createConsentLink(
          dni,
          workerName,
          "Profesional Monitor Pro",
          telefono
        )
        
        const url = `${window.location.origin}/firmar/${linkId}`
        const numeroFormateado = telefono.replace(/\D/g, '')
        const msg = `Hola ${workerName},\n\nPor favor, ingresa al siguiente enlace para firmar tu Consentimiento Informado de Salud Ocupacional:\n${url}\n\nGracias,\nProfesional Monitor Pro`
        
        const waUrl = `https://wa.me/${numeroFormateado}?text=${encodeURIComponent(msg)}`
        setEnlaceWhatsApp(waUrl)
      } catch (err) {
        console.error('Error generando enlace', err)
      } finally {
        setGenerandoEnlace(false)
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={finalizarYcerrar}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{trabajadorParaEditar ? 'Editar trabajador' : 'Registro de trabajador'}</h3>

        {exito ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            <div className="alert-success" style={{ margin: 0 }}>
              ✔️ Trabajador registrado correctamente
            </div>
            
            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 10px 0' }}>Consentimiento Informado</p>
              
              {generandoEnlace ? (
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Generando enlace único...</p>
              ) : enlaceWhatsApp ? (
                <button 
                  onClick={() => window.open(enlaceWhatsApp, '_blank')}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: '#25D366', 
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  Enviar enlace por WhatsApp
                </button>
              ) : (
                <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>Error al generar el enlace</p>
              )}
            </div>

            <button 
              onClick={finalizarYcerrar}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', background: '#e2e8f0', color: '#475569', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
            >
              Cerrar ventana
            </button>
          </div>
        ) : (
          <>
            <input
              ref={nombreRef}
              placeholder="Nombres"
          value={nombres}
          onChange={e => setNombres(e.target.value.toUpperCase())}
          disabled={guardando}
        />

        <input
          placeholder="Apellidos"
          value={apellidos}
          onChange={e => setApellidos(e.target.value.toUpperCase())}
          disabled={guardando}
        />

        <input value={dni} disabled />

        <select
          value={sexo}
          onChange={e => setSexo(e.target.value)}
          disabled={guardando}
        >
          <option value="">Seleccione sexo</option>
          <option value="M">Masculino</option>
          <option value="F">Femenino</option>
        </select>

        <label>Fecha de nacimiento</label>
        <input
          type="date"
          value={fechaNacimiento}
          onChange={e => setFechaNacimiento(e.target.value)}
          disabled={guardando}
        />

        <input
          placeholder="Empresa"
          value={empresa}
          onChange={e => setEmpresa(e.target.value)}
          disabled={guardando}
        />

        <input
          placeholder="Dirección"
          value={direccion}
          onChange={e => setDireccion(e.target.value)}
          disabled={guardando}
        />

        <input
          placeholder="Teléfono (Obligatorio) *"
          value={telefono}
          onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))}
          disabled={guardando}
        />

        <div className="modal-actions">
          <button onClick={registrarTrabajador} disabled={guardando}>
            {guardando ? 'Guardando…' : (trabajadorParaEditar ? 'Actualizar trabajador' : 'Guardar trabajador')}
          </button>

            <button
              className="btn-secondary"
              onClick={onClose}
              disabled={guardando}
            >
              Cancelar
            </button>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
