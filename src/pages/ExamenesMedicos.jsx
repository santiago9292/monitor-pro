import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import ModalRegistroEMO from "../components/ModalRegistroEMO"
import {
  calcularEstadoEMO,
  ordenarEmosPorEstadoYVencimiento
} from "../utils/emoEstado"
import logo from "../assets/logo.png"
import ExcelJS from "exceljs"
import { auditService } from "../services/auditService"

export default function ExamenesMedicos() {
  const [emos, setEmos] = useState([])
  const [openModal, setOpenModal] = useState(false)
const [busqueda, setBusqueda] = useState("")
const [filtroEstado, setFiltroEstado] = useState("todos")
const exportarExcel = async () => {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("EMO")

  /* ===============================
     🖼️ AGREGAR LOGO
  =============================== */
  const response = await fetch(logo)
  const blob = await response.blob()
  const buffer = await blob.arrayBuffer()

  const imageId = workbook.addImage({
    buffer,
    extension: "png"
  })

  // Posicionar logo (A1:B3)
  sheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    br: { col: 2, row: 3 }
  })

  /* ===============================
     🏷️ TÍTULOS
  =============================== */
  sheet.mergeCells("C1:G1")
  sheet.getCell("C1").value = "MONITOR PRO®"
  sheet.getCell("C1").font = { size: 16, bold: true }

  sheet.mergeCells("C2:G2")
  sheet.getCell("C2").value = "Exámenes Médicos Ocupacionales"
  sheet.getCell("C2").font = { size: 12 }

  /* ===============================
     📊 CABECERA TABLA
  =============================== */
  sheet.columns = [
    { header: "DNI", key: "dni", width: 15 },
    { header: "Trabajador", key: "trabajador", width: 32 },
    { header: "Tipo EMO", key: "tipo", width: 15 },
    { header: "Resultado", key: "resultado", width: 22 },
    { header: "Fecha Vencimiento", key: "vencimiento", width: 18 },
    { header: "Estado", key: "estado", width: 15 },
    { header: "Archivo EMO", key: "archivo", width: 40 }
  ]

  // Cabecera en fila 5
  const headerRow = sheet.getRow(5)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }

  /* ===============================
     📥 DATOS
  =============================== */
  emosFiltrados.forEach(e => {
    sheet.addRow({
      dni: e.trabajadores?.dni || "",
      trabajador: e.trabajadores
        ? `${e.trabajadores.nombres} ${e.trabajadores.apellidos}`
        : "",
      tipo: e.tipo,
      resultado: e.resultado,
      vencimiento: e.fecha_vencimiento,
      estado: calcularEstadoEMO(e.fecha_vencimiento),
      archivo: e.archivo_url || ""
    })
  })

  /* ===============================
     🎨 AJUSTES VISUALES
  =============================== */
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber >= 5) {
      row.alignment = { vertical: "middle" }
    }
  })

  /* ===============================
     📤 DESCARGA
  =============================== */
  const excelBuffer = await workbook.xlsx.writeBuffer()
  const blobExcel = new Blob([excelBuffer], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  })

  const url = URL.createObjectURL(blobExcel)
  const link = document.createElement("a")
  link.href = url
  link.download = "monitor_pro_emos.xlsx"
  link.click()
  URL.revokeObjectURL(url)

  // AUDITORÍA: Registro de exportación a Excel
  await auditService.record({
    action: 'EXPORT',
    module: 'Exámenes Médicos',
    description: `Exportó el listado de EMOs filtrados (${emosFiltrados.length} registros) a un archivo Excel.`
  });
}

  useEffect(() => {
    fetchEmos()
  }, [])

  const fetchEmos = async () => {
    const { data, error } = await supabase
      .from("emos")
      .select(`
        id,
        tipo,
        resultado,
        fecha_vencimiento,
        archivo_url,
        trabajadores (
          dni,
          nombres,
          apellidos
        )
      `)
      .order("fecha_vencimiento", { ascending: true })

    if (!error) setEmos(data || [])
  }

  // ✅ ORDEN CORRECTO
  const emosOrdenados = ordenarEmosPorEstadoYVencimiento(emos)
const textoBusqueda = busqueda.toLowerCase().trim()

const emosFiltrados = emosOrdenados.filter(e => {
  const estado = calcularEstadoEMO(e.fecha_vencimiento)

  // 🎯 filtro por estado
  if (filtroEstado !== "todos" && estado !== filtroEstado) {
    return false
  }

  // 🔍 filtro por texto
  if (!textoBusqueda) return true

  const dni = e.trabajadores?.dni?.toLowerCase() || ""
  const nombres = e.trabajadores?.nombres?.toLowerCase() || ""
  const apellidos = e.trabajadores?.apellidos?.toLowerCase() || ""
  const nombreCompleto = `${nombres} ${apellidos}`

  return (
    dni.includes(textoBusqueda) ||
    nombres.includes(textoBusqueda) ||
    apellidos.includes(textoBusqueda) ||
    nombreCompleto.includes(textoBusqueda)
  )
})


  return (
    <div className="emo-page">
      <div className="emo-header">
  <h2 className="emo-title">Exámenes Médicos Ocupacionales</h2>

  <div className="emo-toolbar">
    <input
      type="text"
      placeholder="Buscar por DNI o nombre..."
      value={busqueda}
      onChange={e => setBusqueda(e.target.value)}
      className="emo-search"
    />
    
<select
  value={filtroEstado}
  onChange={e => setFiltroEstado(e.target.value)}
  className="emo-filter"
>
  <option value="todos">Todos</option>
  <option value="caducado">Caducados</option>
  <option value="por vencer">Por vencer</option>
  <option value="vigente">Vigentes</option>
</select>

    <button
      className="emo-btn"
      onClick={() => setOpenModal(true)}
    >
      + Registrar EMO
    </button>
    <button
  className="emo-btn secondary"
  onClick={exportarExcel}
>
  📥 Descargar Excel
</button>

  </div>
</div>




      {/* ===== DESKTOP ===== */}
      <div className="emo-table-wrapper">
        <table className="emo-table">
          <thead>
            <tr>
              <th>DNI</th>
              <th>Trabajador</th>
              <th>Tipo</th>
              <th>Resultado</th>
              <th>Vence</th>
              <th>Estado</th>
              <th>EMO</th>
            </tr>
          </thead>
          <tbody>
            {emosFiltrados.map(e => (
              <tr key={e.id}>
                <td>{e.trabajadores?.dni}</td>
                <td>
  {e.trabajadores
    ? `${e.trabajadores.nombres} ${e.trabajadores.apellidos}`
    : "—"}
</td>
                <td>{e.tipo}</td>
                <td>{e.resultado}</td>
                <td>{e.fecha_vencimiento}</td>
                <td className={`estado ${calcularEstadoEMO(e.fecha_vencimiento)}`}>
                  {calcularEstadoEMO(e.fecha_vencimiento)}
                </td>
                <td>
                  {e.archivo_url ? (
                    <a
                      href={e.archivo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ver"
                    >
                      Ver
                    </a>
                  ) : (
                    <span className="sin-archivo">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE ===== */}
      <div className="emo-cards">
        {emosFiltrados.map(e => (
          <div className="emo-card" key={e.id}>
            <div><strong>DNI:</strong> {e.trabajadores?.dni}</div>
            <div>
  <strong>Trabajador:</strong>{" "}
  {e.trabajadores
    ? `${e.trabajadores.nombres} ${e.trabajadores.apellidos}`
    : "—"}
</div>

            <div><strong>Tipo:</strong> {e.tipo}</div>
            <div><strong>Resultado:</strong> {e.resultado}</div>
            <div><strong>Vence:</strong> {e.fecha_vencimiento}</div>

            <div className={`estado ${calcularEstadoEMO(e.fecha_vencimiento)}`}>
              {calcularEstadoEMO(e.fecha_vencimiento).toUpperCase()}
            </div>

            {e.archivo_url ? (
              <a
                href={e.archivo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ver"
                style={{ marginTop: 8, display: "inline-block" }}
              >
                📄 Ver EMO
              </a>
            ) : (
              <span className="sin-archivo">Sin archivo</span>
            )}
          </div>
        ))}
      </div>

      {/* ===== MODAL ===== */}
      {openModal && (
        <ModalRegistroEMO
          abierto={openModal}
          onClose={() => setOpenModal(false)}
          onGuardado={fetchEmos}
        />
      )}
    </div>
  )
}
