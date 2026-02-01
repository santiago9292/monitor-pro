import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import "../App.css"
import ModalDescansoMedico from "../components/ModalDescansomedico"

// 🧠 Estado clínico correcto (hora local Perú)
const calcularEstado = (fechaInicio, fechaFin) => {
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, "0")
  const dd = String(hoy.getDate()).padStart(2, "0")
  const hoyLocal = `${yyyy}-${mm}-${dd}`

  if (hoyLocal < fechaInicio) return "programado"
  if (hoyLocal > fechaFin) return "vencido"
  return "activo"
}

function DescansosMedicos() {
  const [descansos, setDescansos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [filtroTrabajador, setFiltroTrabajador] = useState("")

  const cargarDescansos = async () => {
    setCargando(true)

    const { data, error } = await supabase
      .from("descansos_medicos")
      .select(`
        id,
        fecha_inicio,
        fecha_fin,
        dias,
        tipo,
        cie,
        diagnostico,
        archivo_url,
        trabajadores (
          nombres,
          apellidos,
          dni
        )
      `)
      .order("fecha_inicio", { ascending: false })

    if (!error) setDescansos(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargarDescansos()
  }, [])

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="page-header center column">
        <h2>Registro y Seguimiento de Descansos Médicos</h2>

        <button
          className="btn-primary"
          onClick={() => setMostrarModal(true)}
        >
          + Nuevo descanso
        </button>
      </div>

      {/* TABLA */}
      {cargando ? (
        <p>Cargando descansos...</p>
      ) : (
        <div className="tabla-wrapper">
          <table className="tabla">
            <thead>
              <tr>
                <th>DNI</th>
                <th>
                  Trabajador
                  <input
                    className="filtro-texto"
                    type="text"
                    placeholder="Buscar..."
                    value={filtroTrabajador}
                    onChange={e => setFiltroTrabajador(e.target.value)}
                  />
                </th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Días</th>
                <th>CIE</th>
                <th>Tipo</th>
                <th>
                  Estado
                  <select
                    className="filtro-estado"
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="activo">Activo</option>
                    <option value="programado">Programado</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </th>
                <th>Archivo</th>
              </tr>
            </thead>

            <tbody>
              {descansos
                .filter(d => {
                  if (filtroEstado !== "todos") {
                    if (
                      calcularEstado(
                        d.fecha_inicio,
                        d.fecha_fin
                      ) !== filtroEstado
                    ) {
                      return false
                    }
                  }

                  if (filtroTrabajador.trim() !== "") {
                    const texto =
                      filtroTrabajador.toLowerCase()
                    const nombreCompleto =
                      `${d.trabajadores?.nombres} ${d.trabajadores?.apellidos}`.toLowerCase()
                    const dni =
                      d.trabajadores?.dni || ""

                    return (
                      nombreCompleto.includes(texto) ||
                      dni.includes(texto)
                    )
                  }

                  return true
                })
                .map(d => (
                  <tr key={d.id}>
                    <td>{d.trabajadores?.dni}</td>
                    <td>
                      {d.trabajadores?.nombres}{" "}
                      {d.trabajadores?.apellidos}
                    </td>
                    <td>{d.fecha_inicio}</td>
                    <td>{d.fecha_fin}</td>
                    <td>{d.dias}</td>
                    <td>
                      {d.cie
                        ? `${d.cie} – ${d.diagnostico}`
                        : "-"}
                    </td>
                    <td>{d.tipo}</td>
                    <td>
                      <span
                        className={`estado ${calcularEstado(
                          d.fecha_inicio,
                          d.fecha_fin
                        )}`}
                      >
                        {calcularEstado(
                          d.fecha_inicio,
                          d.fecha_fin
                        )}
                      </span>
                    </td>
                    <td>
                      {d.archivo_url ? (
                        <a
                          href={d.archivo_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      <ModalDescansoMedico
        abierto={mostrarModal}
        onClose={() => setMostrarModal(false)}
        onGuardado={cargarDescansos}
      />
    </div>
  )
}

export default DescansosMedicos
