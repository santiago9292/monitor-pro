import { useState, useEffect, useRef } from "react"
import { supabase } from "../lib/supabase"
import { restQuery } from "../lib/supabaseRest"
import { auditService } from "../services/auditService"
import ModalRegistroTrabajador from "./ModalRegistroTrabajador"
import { useEmpresa } from "../context/EmpresaContext"

const BUCKET = "emos"

export default function ModalRegistroEMO({ abierto, onClose, onGuardado, emoParaEditar }) {
  const dniInputRef = useRef(null)
  const { empresaId } = useEmpresa()

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
  const [legajoCompleto, setLegajoCompleto] = useState(null)
  const [informeMedico, setInformeMedico] = useState(null)

  const [guardando, setGuardando] = useState(false)
  const [guardadoOk, setGuardadoOk] = useState(false)
  const [tieneEmoVigente, setTieneEmoVigente] = useState(false)
  const [tieneConsentimiento, setTieneConsentimiento] = useState(true)

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
    setLegajoCompleto(null)
    setInformeMedico(null)
    setMostrarRegistroTrabajador(false)
    setTieneEmoVigente(false)
    setTieneConsentimiento(true)
  }

  useEffect(() => {
    if (abierto) {
      setGuardadoOk(false)
      if (emoParaEditar) {
        setDni(emoParaEditar.trabajadores?.dni || "")
        setTrabajador(emoParaEditar.trabajadores || null)
        setTipo(emoParaEditar.tipo || "ingreso")
        setResultado(emoParaEditar.resultado || "apto")
        setFechaExamen(emoParaEditar.fecha_examen || "")
        setFechaVencimiento(emoParaEditar.fecha_vencimiento || "")
        setEntidadMedica(emoParaEditar.entidad_medica || "")
        setObservaciones(emoParaEditar.observaciones || "")
        setArchivo(null)
        setLegajoCompleto(null)
        setInformeMedico(null)
        setMostrarRegistroTrabajador(false)
        setTieneEmoVigente(false)

        const checkConsent = async (workerDni) => {
          const consentArr = await restQuery(`consentimientos?select=id&dni=eq.${workerDni}`)
          const consentData = consentArr[0] || null
          setTieneConsentimiento(!!consentData)
        }
        if (emoParaEditar.trabajadores?.dni) {
          checkConsent(emoParaEditar.trabajadores.dni)
        } else {
          setTieneConsentimiento(true)
        }
      } else {
        limpiarFormulario()
        setTimeout(() => dniInputRef.current?.focus(), 0)
      }
    }
  }, [abierto, emoParaEditar])

  if (!abierto) return null

  /* 🔎 Buscar trabajador */
  const buscarTrabajador = async () => {
    if (dni.length < 8) {
      alert("Ingrese un DNI válido")
      return
    }

    setBuscando(true)
    setTieneEmoVigente(false)

    const workerArr = await restQuery(`trabajadores?select=id,nombres,apellidos,dni,empresa&dni=eq.${dni}`)
    const data = workerArr[0] || null

    if (!data) {
      setTrabajador(null)
      setMostrarRegistroTrabajador(true)
      setTieneConsentimiento(true)
    } else {
      setTrabajador(data)
      setMostrarRegistroTrabajador(false)

      // Verificar si está de baja
      if (data.empresa?.endsWith(' (DE BAJA)')) {
        setBuscando(false)
        return // El banner lo muestra el render
      }

      // Consultar si tiene consentimiento firmado
      const consentArr = await restQuery(`consentimientos?select=id&dni=eq.${data.dni}`)
      const consentData = consentArr[0] || null
      
      setTieneConsentimiento(!!consentData)

      // Consultar historial EMO
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
 
      const emosHistorial = await restQuery(`emos?select=fecha_vencimiento,resultado&trabajador_id=eq.${data.id}`)

      if (emosHistorial && emosHistorial.length > 0) {
        const tieneVigente = emosHistorial.some(emo => {
          if (!emo.fecha_vencimiento) return false
          const venc = new Date(`${emo.fecha_vencimiento}T00:00:00`)
          const esValido = emo.resultado === "apto" || emo.resultado === "apto_con_restricciones" || emo.resultado === "observado"
          return venc >= hoy && esValido
        })
        setTieneEmoVigente(tieneVigente)
      }
    }

    setBuscando(false)
  }

  /* 💾 Guardar EMO + PDF */
  const guardarEMO = async () => {
    if (!trabajador) {
      alert("Debe buscar y seleccionar un trabajador")
      return
    }

    if (!tieneConsentimiento) {
      alert("No se puede registrar EMO: El trabajador no cuenta con un consentimiento firmado.")
      return
    }

    if (tieneEmoVigente && !emoParaEditar) {
      const confirmar = window.confirm("PACIENTE CON EMO VIGENTE, DESEA VOLVER A CARGAR UN EMO?")
      if (!confirmar) return
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

    let data = null
    let error = null

    if (emoParaEditar) {
      // Modo Edición Observado: Actualiza el resultado (aptitud) y cualquier otro campo que estuviera en blanco
      const { data: updateData, error: updateError } = await supabase
        .from("emos")
        .update({
          resultado,
          tipo,
          fecha_examen: fechaExamen,
          fecha_vencimiento: fechaVencimiento,
          entidad_medica: entidadMedica,
          observaciones
        })
        .eq("id", emoParaEditar.id)
        .select()
        .single()

      data = updateData
      error = updateError
    } else {
      // Modo Inserción: Inserta nuevo EMO
      const { data: insertData, error: insertError } = await supabase
        .from("emos")
        .insert({
          trabajador_id: trabajador.id,
          tipo,
          fecha_examen: fechaExamen,
          fecha_vencimiento: fechaVencimiento,
          resultado,
          entidad_medica: entidadMedica,
          observaciones,
          empresa_id: empresaId,   // ← multi-tenant
        })
        .select()
        .single()

      data = insertData
      error = insertError
    }

    if (error) {
      alert("Error al guardar EMO")
      setGuardando(false)
      return
    }

    // 2️⃣ Subir archivos y acumular URLs de descarga
    const updates = {}

    // A. Subir PDF EMO (si existe)
    if (archivo) {
      const ext = archivo.name.split(".").pop()
      const fileName = `EMO-${trabajador.dni}.${ext}`

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
        updates.archivo_url = urlData.publicUrl
      }
    }

    // B. Subir Legajo Completo (si existe)
    if (legajoCompleto) {
      const ext = legajoCompleto.name.split(".").pop()
      const fileName = `LEGAJO-${trabajador.dni}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, legajoCompleto, {
          upsert: true,
          contentType: legajoCompleto.type
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName)
        updates.legajo_url = urlData.publicUrl
      }
    }

    // C. Subir Informe Médico (si existe)
    if (informeMedico) {
      const ext = informeMedico.name.split(".").pop()
      const fileName = `INFORME-${trabajador.dni}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, informeMedico, {
          upsert: true,
          contentType: informeMedico.type
        })

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(fileName)
        updates.informe_medico_url = urlData.publicUrl
      }
    }

    // Guardar todas las URLs en el registro EMO
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("emos")
        .update(updates)
        .eq("id", data.id)

      if (updateError) {
        console.error("Error al actualizar URLs de archivos:", updateError)
      }
    }

    // 3️⃣ REGISTRO DE AUDITORÍA
    try {
      const formatResultadoLocal = (res) => {
        const mapped = {
          apto: "Apto",
          apto_con_restricciones: "Apto con restricciones",
          no_apto: "No apto",
          observado: "Observado"
        }
        return mapped[res] || res
      }

      await auditService.record({
        action: emoParaEditar ? 'UPDATE' : 'CREATE',
        module: 'Exámenes Médicos',
        description: emoParaEditar 
          ? `Actualizó EMO observado de: ${trabajador.nombres} ${trabajador.apellidos} (DNI: ${trabajador.dni}) a resultado: ${formatResultadoLocal(resultado)}`
          : `Registró un EMO tipo ${tipo} para el trabajador ${trabajador.nombres} ${trabajador.apellidos} (DNI: ${trabajador.dni})`,
        details: { 
          emo_id: data.id, 
          tipo, 
          resultado, 
          tiene_archivo: !!archivo,
          tiene_legajo: !!legajoCompleto,
          tiene_informe_medico: !!informeMedico
        }
      });
    } catch (auditErr) {
      console.warn("No se pudo registrar la auditoría:", auditErr);
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
        <div className="modal" style={{ width: "840px", maxWidth: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column", padding: "24px 28px" }} onClick={e => e.stopPropagation()}>
          {guardadoOk && (
            <div className="alert-success" style={{ flexShrink: 0 }}>
              {emoParaEditar ? "✔️ EMO actualizado correctamente" : "✔️ EMO registrado correctamente"}
            </div>
          )}

          <h3 style={{ flexShrink: 0, margin: "0 0 20px 0", fontSize: "20px", color: "#0f172a" }}>
            {emoParaEditar ? "Modificar Aptitud y EMO de Trabajador Observado" : "Registrar Examen Médico Ocupacional"}
          </h3>

          {/* Contenedor central con scroll independiente */}
          <div style={{ overflowY: "auto", flex: 1, paddingRight: "8px", marginBottom: "20px" }}>
            
            {/* Panel de Búsqueda de Trabajador */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "center", marginBottom: "20px", background: tieneEmoVigente && !emoParaEditar ? "#fef08a" : "#f8fafc", padding: "16px", borderRadius: "10px", border: tieneEmoVigente && !emoParaEditar ? "2px solid #eab308" : "1px solid #e2e8f0" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569" }}>DNI del Trabajador</label>
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
                    style={{ marginBottom: 0 }}
                  />
                  <button onClick={buscarTrabajador} disabled={buscando || !!trabajador} style={{ width: "auto", padding: "10px 20px" }}>
                    Buscar
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "56px" }}>
                {trabajador ? (
                  <>
                    <span style={{ fontSize: "10px", textTransform: "uppercase", color: tieneEmoVigente && !emoParaEditar ? "#a16207" : "#64748b", fontWeight: 700, letterSpacing: "0.5px" }}>Trabajador Seleccionado</span>
                    <span style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>{`${trabajador.nombres} ${trabajador.apellidos}`.toUpperCase()}</span>
                    {tieneEmoVigente && !emoParaEditar && (
                      <span style={{ fontSize: "12px", color: "#b45309", fontWeight: 800, marginTop: "6px" }}>
                        ⚠️ PACIENTE CON EMO YA VIGENTE
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>Busque un DNI para habilitar el registro...</span>
                )}
              </div>
            </div>

            {mostrarRegistroTrabajador && (
              <div style={{ marginBottom: 20, background: "#fef2f2", padding: "12px 16px", borderRadius: "8px", border: "1px solid #fee2e2" }}>
                <p style={{ fontSize: 13, color: "#b91c1c", margin: "0 0 8px 0" }}>
                  El DNI ingresado no está registrado en el sistema.
                </p>
                <button
                  type="button"
                  onClick={() => setMostrarRegistroTrabajador(true)}
                  style={{
                    background: "#16a34a",
                    color: "white",
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    width: "auto"
                  }}
                >
                  ➕ Registrar trabajador
                </button>
              </div>
            )}

            {trabajador && (
              <>
                {/* Banner: Trabajador de baja - bloquea todo el formulario */}
                {trabajador.empresa?.endsWith(' (DE BAJA)') ? (
                  <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                    🔴 TRABAJADOR DADO DE BAJA. No se pueden registrar nuevos exámenes médicos (EMO).
                  </div>
                ) : (
                  <>
                    {!tieneConsentimiento && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                        ⚠️ TRABAJADOR SIN CONSENTIMIENTO INFORMADO FIRMADO. Para registrar exámenes médicos (EMO), primero debe generar y firmar el consentimiento de este trabajador en la pestaña de "Consentimiento".
                      </div>
                    )}
                {/* Fila 1: Cargas de Archivo Premium y Modernizados (Movido hacia arriba) */}
                <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                  <label style={{ display: "block", marginBottom: "12px", fontWeight: 700, fontSize: "14px", color: "#1e293b" }}>
                    {emoParaEditar ? "Volver a Cargar / Completar Documentos" : "Documentos Adjuntos"}
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                    
                    {/* Archivo EMO */}
                    <div>
                      <span style={{ display: "block", fontSize: "12px", color: "#64748b", fontWeight: 600, marginBottom: "6px" }}>Archivo EMO (PDF)</span>
                      <label htmlFor="file-upload-emo" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: archivo ? "#eff6ff" : "#f8fafc", border: archivo ? "1px dashed #3b82f6" : "1px dashed #cbd5e1", borderRadius: "8px", cursor: !tieneConsentimiento ? "not-allowed" : ((emoParaEditar && emoParaEditar.archivo_url) ? "not-allowed" : "pointer"), transition: "all 0.2s", minHeight: "44px", opacity: !tieneConsentimiento ? 0.5 : ((emoParaEditar && emoParaEditar.archivo_url) ? 0.5 : 1) }}>
                        <span style={{ fontSize: "12px", color: archivo ? "#1e3a8a" : "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }} title={archivo ? archivo.name : ""}>
                          {archivo ? `✔️ ${archivo.name}` : (emoParaEditar && emoParaEditar.archivo_url ? "Ya registrado" : "Seleccionar...")}
                        </span>
                        <span style={{ fontSize: "11px", background: archivo ? "#2563eb" : "#64748b", color: "white", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, flexShrink: 0 }}>Subir</span>
                      </label>
                      <input
                        id="file-upload-emo"
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => setArchivo(e.target.files[0])}
                        style={{ display: "none" }}
                        disabled={!tieneConsentimiento || !!(emoParaEditar && emoParaEditar.archivo_url)}
                      />
                    </div>

                    {/* Legajo Completo */}
                    <div>
                      <span style={{ display: "block", fontSize: "12px", color: (emoParaEditar && emoParaEditar.legajo_url) ? "#94a3b8" : "#64748b", fontWeight: 600, marginBottom: "6px" }}>Legajo Completo</span>
                      <label htmlFor="file-upload-legajo" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: legajoCompleto ? "#eff6ff" : "#f8fafc", border: legajoCompleto ? "1px dashed #3b82f6" : "1px dashed #cbd5e1", borderRadius: "8px", cursor: !tieneConsentimiento ? "not-allowed" : ((emoParaEditar && emoParaEditar.legajo_url) ? "not-allowed" : "pointer"), transition: "all 0.2s", minHeight: "44px", opacity: !tieneConsentimiento ? 0.5 : ((emoParaEditar && emoParaEditar.legajo_url) ? 0.5 : 1) }}>
                        <span style={{ fontSize: "12px", color: legajoCompleto ? "#1e3a8a" : "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }} title={legajoCompleto ? legajoCompleto.name : ""}>
                          {legajoCompleto ? `✔️ ${legajoCompleto.name}` : (emoParaEditar && emoParaEditar.legajo_url ? "Ya registrado" : "Seleccionar...")}
                        </span>
                        <span style={{ fontSize: "11px", background: legajoCompleto ? "#2563eb" : "#64748b", color: "white", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, flexShrink: 0 }}>Subir</span>
                      </label>
                      <input
                        id="file-upload-legajo"
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => setLegajoCompleto(e.target.files[0])}
                        style={{ display: "none" }}
                        disabled={!tieneConsentimiento || !!(emoParaEditar && emoParaEditar.legajo_url)}
                      />
                    </div>

                    {/* Informe Médico */}
                    <div>
                      <span style={{ display: "block", fontSize: "12px", color: (emoParaEditar && emoParaEditar.informe_medico_url) ? "#94a3b8" : "#64748b", fontWeight: 600, marginBottom: "6px" }}>Informe Médico</span>
                      <label htmlFor="file-upload-informe" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: informeMedico ? "#eff6ff" : "#f8fafc", border: informeMedico ? "1px dashed #3b82f6" : "1px dashed #cbd5e1", borderRadius: "8px", cursor: !tieneConsentimiento ? "not-allowed" : ((emoParaEditar && emoParaEditar.informe_medico_url) ? "not-allowed" : "pointer"), transition: "all 0.2s", minHeight: "44px", opacity: !tieneConsentimiento ? 0.5 : ((emoParaEditar && emoParaEditar.informe_medico_url) ? 0.5 : 1) }}>
                        <span style={{ fontSize: "12px", color: informeMedico ? "#1e3a8a" : "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }} title={informeMedico ? informeMedico.name : ""}>
                          {informeMedico ? `✔️ ${informeMedico.name}` : (emoParaEditar && emoParaEditar.informe_medico_url ? "Ya registrado" : "Seleccionar...")}
                        </span>
                        <span style={{ fontSize: "11px", background: informeMedico ? "#2563eb" : "#64748b", color: "white", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, flexShrink: 0 }}>Subir</span>
                      </label>
                      <input
                        id="file-upload-informe"
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => setInformeMedico(e.target.files[0])}
                        style={{ display: "none" }}
                        disabled={!tieneConsentimiento || !!(emoParaEditar && emoParaEditar.informe_medico_url)}
                      />
                    </div>

                  </div>
                </div>

                {/* Fila 2: Tipo y Resultado */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569" }}>Tipo</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value)} style={{ marginBottom: 0 }} disabled={!tieneConsentimiento || !!(emoParaEditar && emoParaEditar.tipo)}>
                      <option value="ingreso">Ingreso</option>
                      <option value="periodico">Periódico</option>
                      <option value="retiro">Retiro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569" }}>Resultado</label>
                    <select value={resultado} onChange={e => setResultado(e.target.value)} style={{ marginBottom: 0 }} disabled={!tieneConsentimiento}>
                      <option value="apto">Apto</option>
                      <option value="apto_con_restricciones">Apto con restricciones</option>
                      <option value="no_apto">No apto</option>
                      <option value="observado">Observado</option>
                    </select>
                  </div>
                </div>

                {/* Fila 3: Fecha examen y Fecha vencimiento */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569" }}>Fecha examen</label>
                    <input type="date" value={fechaExamen} onChange={e => setFechaExamen(e.target.value)} style={{ marginBottom: 0 }} disabled={!tieneConsentimiento || !!(emoParaEditar && emoParaEditar.fecha_examen)} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569" }}>Fecha vencimiento</label>
                    <input type="date" value={fechaVencimiento} min={fechaExamen} onChange={e => setFechaVencimiento(e.target.value)} style={{ marginBottom: 0 }} disabled={!tieneConsentimiento || !!(emoParaEditar && emoParaEditar.fecha_vencimiento)} />
                  </div>
                </div>

                {/* Fila 4: Entidad médica y Observaciones (Saborizado y Sinuoso) */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569" }}>Entidad médica</label>
                    <input value={entidadMedica} onChange={e => setEntidadMedica(e.target.value)} style={{ marginBottom: 0 }} placeholder="Ej. Policlínico..." disabled={!tieneConsentimiento || !!(emoParaEditar && emoParaEditar.entidad_medica)} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "13px", color: "#475569" }}>Observaciones</label>
                    <input value={observaciones} onChange={e => setObservaciones(e.target.value)} style={{ marginBottom: 0 }} placeholder="Ej. Apto para el puesto..." disabled={!tieneConsentimiento || !!(emoParaEditar && emoParaEditar.observaciones)} />
                  </div>
                </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Acciones fijas al fondo */}
          <div className="modal-actions" style={{ flexShrink: 0, marginTop: 0 }}>
            <button onClick={onClose} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1" }}>Cancelar</button>
            <button onClick={guardarEMO} disabled={guardando || !trabajador || !tieneConsentimiento || trabajador?.empresa?.endsWith(' (DE BAJA)')}>
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
          const workerArr = await restQuery(`trabajadores?select=id,nombres,apellidos,dni&dni=eq.${dni}`)
          const data = workerArr[0] || null
 
          if (data) {
            setTrabajador(data)
            setMostrarRegistroTrabajador(false)
          }
        }}
      />
    </>
  )
}
