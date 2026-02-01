import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ModalRegistroTrabajador({
  abierto,
  dniInicial,
  onClose,
  onRegistrado
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

  /* =======================
     INIT / RESET
  ======================= */
  useEffect(() => {
    if (abierto) {
      setDni(dniInicial || '')
      setNombres('')
      setApellidos('')
      setSexo('')
      setFechaNacimiento('')
      setEmpresa('')
      setDireccion('')
      setTelefono('')
      setGuardando(false)
      setExito(false)

      setTimeout(() => nombreRef.current?.focus(), 0)
    }
  }, [abierto, dniInicial])

  /* =======================
     ESC PARA CERRAR
  ======================= */
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }

    if (abierto) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [abierto, onClose])

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

    const { data, error } = await supabase
      .from('trabajadores')
      .insert({
        dni,
        nombres,
        apellidos,
        sexo,
        fecha_nacimiento: fechaNacimiento,
        empresa,
        direccion,
        telefono
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      alert('Error al registrar trabajador')
      setGuardando(false)
      return
    }

    setExito(true)

    setTimeout(() => {
      onRegistrado(data)   // 👈 devuelve el trabajador creado
      onClose()
    }, 1200)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Registro de trabajador</h3>

        {exito && (
          <div className="alert-success">
            ✔️ Trabajador registrado correctamente
          </div>
        )}

        <input
          ref={nombreRef}
          placeholder="Nombres"
          value={nombres}
          onChange={e => setNombres(e.target.value)}
          disabled={guardando}
        />

        <input
          placeholder="Apellidos"
          value={apellidos}
          onChange={e => setApellidos(e.target.value)}
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
          placeholder="Teléfono"
          value={telefono}
          onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))}
          disabled={guardando}
        />

        <div className="modal-actions">
          <button onClick={registrarTrabajador} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar trabajador'}
          </button>

          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={guardando}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
