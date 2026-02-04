import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"
import ModalRegistroTrabajador from "./ModalRegistroTrabajador"

const BUCKET = "emos"

export default function ModalRegistroEMO({ abierto, onClose, onGuardado }) {
  const dniInputRef = useRef(null)

  const [dni, setDni] = useState("")
  const [trabajador, setTrabajador] = useState(null)
  const [buscando, setBuscando] = useState(false)

  const [mostrarRegistroTrabajador, setMostrarRegistroTrabajador] = useState(false)

  const [tipo, setTipo] = useState("ingreso")
  const [fechaExamen, setFechaExamen] = useState("")
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [resultado, setResultado] = useState("apto")
  const [entidadMedica, setEntidadMedica] = useState("")
  const [observaciones, setObservaciones] = useState("")

  const [archivo, setArchivo] = useState(null)

  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)

  /* 🔁 Reset */
  const limpiarFormulario = () => {
    setDni("")
    setTrabajador(null)
    setTipo("ingreso")
    setFechaExamen("")
    setFechaVencimiento("")
    setResultado("apto")
    setEntidadMedica("")
    setObservaciones("")
    setArchivo(null)
    setMostrarRegistroTrabajador(false)
  }

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
      .maybeSingle()

    if (!data) {
      setTrabajador(null)
      setMostrarRegistroTrabajador(true)
    } else {
      setTrabajador(data)
      setMostrarRegistroTrabajador(false)
    }

    setBuscando(false)
  }

  /* 💾 Guardar EMO + PDF */
  const guardarEMO = async () => {
    if (!trabajador) {
      alert("Debe buscar y seleccionar un trabajador")
      return
    }

    if (!fechaExamen || !fechaVencimiento) {
      alert("Debe ingresar fechas")
      return
    }

    if (fechaVencimiento < fechaExamen) {
      alert("La fecha de vencimiento no puede ser menor")
      return
    }

    setGuardando(true)

    // 1️⃣ Insert EMO
    const { data, error } = await supabase
      .from("emos")
      .insert({
        trabajador_id: trabajador.id,
        tipo,
        fecha_examen: fechaExamen,
        fecha_vencimiento: fechaVencimiento,
        resultado,
        entidad_medica: entidadMedica,
        observaciones
      })
      .select()
      .single()

    if (error) {
      alert("Error al guardar EMO")
      setGuardando(false)
      return
    }

    // 2️⃣ Subir PDF (si existe)
    if (archivo) {
      const ext = archivo.name.split(".").pop()
      const fileName = `emo_${data.id}.${ext}`

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
          .from("emos")
          .update({ archivo_url: urlData.publicUrl })
          .eq("id", data.id)
      }
    }

    setGuardando(false)
    setGuardadoOk(true)
    onGuardado()

    setTimeout(() => {
      limpiarFormulario()
      onClose()
    }, 1200)
  }

  return (
    <>
      {/* ===== MODAL EMO ===== */}
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          {guardadoOk && (
            <div className="alert-success">
              ✔️ EMO registrado correctamente
            </div>
          )}

          <h3>Registrar Examen Médico Ocupacional</h3>

          <label>DNI</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={dniInputRef}
              value={dni}
              disabled={!!trabajador}
              onChange={e => {
                setDni(e.target.value)
                setMostrarRegistroTrabajador(false)
              }}
              onKeyDown={e => e.key === "Enter" && buscarTrabajador()}
            />
            <button onClick={buscarTrabajador} disabled={buscando || !!trabajador}>
              Buscar
            </button>
          </div>

          {mostrarRegistroTrabajador && (
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13, color: "#b91c1c" }}>
                El trabajador no está registrado.
              </p>
              <button
                type="button"
                onClick={() => setMostrarRegistroTrabajador(true)}
                style={{
                  background: "#16a34a",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer"
                }}
              >
                ➕ Registrar trabajador
              </button>
            </div>
          )}

          {trabajador && (
            <>
              <p>
                <strong>{trabajador.nombres} {trabajador.apellidos}</strong>
              </p>

              <label>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}>
                <option value="ingreso">Ingreso</option>
                <option value="periodico">Periódico</option>
                <option value="retiro">Retiro</option>
              </select>

              <label>Fecha examen</label>
              <input type="date" value={fechaExamen} onChange={e => setFechaExamen(e.target.value)} />

              <label>Fecha vencimiento</label>
              <input type="date" value={fechaVencimiento} min={fechaExamen} onChange={e => setFechaVencimiento(e.target.value)} />

              <label>Resultado</label>
              <select value={resultado} onChange={e => setResultado(e.target.value)}>
                <option value="apto">Apto</option>
                <option value="apto_con_restricciones">Apto con restricciones</option>
                <option value="no_apto">No apto</option>
              </select>

              <label>Entidad médica</label>
              <input value={entidadMedica} onChange={e => setEntidadMedica(e.target.value)} />

              <label>Observaciones</label>
              <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} />

              <label>Adjuntar EMO (PDF)</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={e => setArchivo(e.target.files[0])}
              />
            </>
          )}

          <div className="modal-actions">
            <button onClick={onClose}>Cancelar</button>
            <button onClick={guardarEMO} disabled={guardando || !trabajador}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>

      {/* ===== MODAL REGISTRO TRABAJADOR ===== */}
      <ModalRegistroTrabajador
        abierto={mostrarRegistroTrabajador}
        dniInicial={dni}
        onClose={() => setMostrarRegistroTrabajador(false)}
        onRegistrado={async () => {
          const { data } = await supabase
            .from("trabajadores")
            .select("id, nombres, apellidos, dni")
            .eq("dni", dni)
            .single()

          if (data) {
            setTrabajador(data)
            setMostrarRegistroTrabajador(false)
          }
        }}
      />
    </>
  )
}
