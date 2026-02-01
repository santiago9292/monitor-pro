import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"

const BUCKET = "descansos-medicos"

export default function ModalDescansoMedico({ abierto, onClose, onGuardado }) {
  const dniInputRef = useRef(null)

  const [dni, setDni] = useState("")
  const [trabajador, setTrabajador] = useState(null)
  const [buscando, setBuscando] = useState(false)

  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [tipo, setTipo] = useState("comun")

  const [cieBusqueda, setCieBusqueda] = useState("")
  const [cieResultados, setCieResultados] = useState([])
  const [cieSeleccionado, setCieSeleccionado] = useState(null)

  const [observaciones, setObservaciones] = useState("")
  const [archivo, setArchivo] = useState(null)

  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false) // ✅ HOOK EN LUGAR CORRECTO

  /* 🔁 Limpia formulario */
  const limpiarFormulario = () => {
    setDni("")
    setTrabajador(null)
    setFechaInicio("")
    setFechaFin("")
    setTipo("comun")
    setCieBusqueda("")
    setCieResultados([])
    setCieSeleccionado(null)
    setObservaciones("")
    setArchivo(null)
  }

  /* 🎯 Autofocus */
  useEffect(() => {
    if (abierto) {
      limpiarFormulario()
      setGuardadoOk(false)
      setTimeout(() => dniInputRef.current?.focus(), 0)
    }
  }, [abierto])

  if (!abierto) return null

  /* 🔎 Buscar trabajador */
  const buscarTrabajador = async () => {
    if (dni.length < 8) {
      alert("Ingrese un DNI válido")
      return
    }

    setBuscando(true)

    const { data } = await supabase
      .from("trabajadores")
      .select("id, nombres, apellidos, dni")
      .eq("dni", dni)
      .single()

    if (!data) {
      alert("Trabajador no encontrado")
      setTrabajador(null)
    } else {
      setTrabajador(data)
    }

    setBuscando(false)
  }

  /* 🔍 Buscar CIE */
  const buscarCie = async (texto) => {
    setCieBusqueda(texto)

    if (texto.length < 3) {
      setCieResultados([])
      return
    }

    const { data } = await supabase
      .from("cie")
      .select("codigo, descripcion")
      .ilike("descripcion", `%${texto}%`)
      .limit(5)

    setCieResultados(data || [])
  }

  /* 💾 Guardar descanso */
  const guardarDescanso = async () => {
    // ✅ VALIDACIONES COMPLETAS
    if (!trabajador) {
      alert("Debe buscar y seleccionar un trabajador")
      return
    }

    if (!fechaInicio || !fechaFin) {
      alert("Debe ingresar fecha de inicio y fin")
      return
    }

    if (fechaFin < fechaInicio) {
      alert("La fecha de fin no puede ser menor a la fecha de inicio")
      return
    }

    if (!tipo) {
      alert("Debe seleccionar el tipo de descanso")
      return
    }

    if (!cieSeleccionado) {
      alert("Debe seleccionar un diagnóstico (CIE)")
      return
    }

    setGuardando(true)

    const { data, error } = await supabase
      .from("descansos_medicos")
      .insert({
        trabajador_id: trabajador.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        tipo,
        cie: cieSeleccionado.codigo,
        diagnostico: cieSeleccionado.descripcion,
        observaciones
      })
      .select()
      .single()

    if (error) {
      alert("Error al guardar descanso")
      setGuardando(false)
      return
    }

    /* 📎 Archivo */
    if (archivo) {
      const ext = archivo.name.split(".").pop()
      const fileName = `descanso_${data.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, archivo, {
          upsert: true,
          contentType: archivo.type
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName)

        await supabase
          .from("descansos_medicos")
          .update({ archivo_url: urlData.publicUrl })
          .eq("id", data.id)
      }
    }

    setGuardando(false)
    setGuardadoOk(true)
    onGuardado()

    setTimeout(() => {
      setGuardadoOk(false)
      limpiarFormulario()
      onClose()
    }, 1200)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {guardadoOk && (
          <div className="alert-success">
            ✔️ Descanso médico registrado correctamente
          </div>
        )}

        <h3>Registrar descanso médico</h3>

        <label>DNI</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            ref={dniInputRef}
            value={dni}
            disabled={!!trabajador}
            onChange={e => setDni(e.target.value)}
            onKeyDown={e => e.key === "Enter" && buscarTrabajador()}
          />
          <button
            onClick={buscarTrabajador}
            disabled={buscando || !!trabajador}
          >
            Buscar
          </button>
        </div>

        {trabajador && (
          <>
            <p>
              <strong>
                {trabajador.nombres} {trabajador.apellidos}
              </strong>
            </p>

            <label>Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => {
                setFechaInicio(e.target.value)
                if (fechaFin && e.target.value > fechaFin) setFechaFin("")
              }}
            />

            <label>Fecha fin</label>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio}
              onChange={e => setFechaFin(e.target.value)}
            />

            <label>Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}>
              <option value="comun">Común</option>
              <option value="ocupacional">Ocupacional</option>
              <option value="accidente">Accidente</option>
            </select>

            <label>Diagnóstico (CIE)</label>
            <div className="cie-autocomplete">
              <input
                value={cieBusqueda}
                onChange={e => buscarCie(e.target.value)}
                placeholder="Buscar por descripción"
              />
              {cieResultados.length > 0 && (
                <ul className="cie-lista">
                  {cieResultados.map(c => (
                    <li
                      key={c.codigo}
                      onClick={() => {
                        setCieSeleccionado(c)
                        setCieBusqueda(`${c.codigo} - ${c.descripcion}`)
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

            <label>Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
            />

            <label>Adjuntar archivo</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={e => setArchivo(e.target.files[0])}
            />
          </>
        )}

        <div className="modal-actions">
          <button onClick={() => { limpiarFormulario(); onClose() }}>
            Cancelar
          </button>
          <button
            onClick={guardarDescanso}
            disabled={guardando || !trabajador}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
