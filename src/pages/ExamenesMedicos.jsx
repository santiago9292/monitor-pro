import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { restQuery } from "../lib/supabaseRest"
import ModalRegistroEMO from "../components/ModalRegistroEMO"
import {
  calcularEstadoEMO,
  ordenarEmosPorEstadoYVencimiento
} from "../utils/emoEstado"
import logo from "../assets/logo.png"
import ExcelJS from "exceljs"
import { auditService } from "../services/auditService"
import { useEmpresa } from "../context/EmpresaContext"

const formatResultado = (res) => {
  if (!res) return "—"
  const mapped = {
    apto: "Apto",
    apto_con_restricciones: "Apto con restricciones",
    no_apto: "No apto",
    observado: "Observado"
  }
  return mapped[res] || res.charAt(0).toUpperCase() + res.slice(1)
}

export default function ExamenesMedicos() {
  const { empresaId } = useEmpresa()
  console.log("=== COMPONENTE EXAMENES MEDICOS MONTADO ===")
  console.log("empresaId recibido de useEmpresa:", empresaId)
  const [emos, setEmos] = useState([])
  const [openModal, setOpenModal] = useState(false)
  const [emoParaEditar, setEmoParaEditar] = useState(null)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("todos")

  const handleAbrirEdicionObservado = (emo) => {
    setEmoParaEditar(emo)
    setOpenModal(true)
  }

  const handleCerrarModal = () => {
    setOpenModal(false)
    setEmoParaEditar(null)
  }
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
     📊 CABECERA TABLA (fila 5)
  =============================== */
  // Definir columnas sin header automático (para controlar su posición)
  sheet.columns = [
    { key: "dni",       width: 15 },
    { key: "trabajador",width: 32 },
    { key: "tipo",      width: 15 },
    { key: "resultado", width: 22 },
    { key: "vencimiento",width: 18 },
    { key: "estado",    width: 15 },
    { key: "archivo",   width: 40 },
    { key: "legajo",    width: 40 },
    { key: "informe",   width: 40 }
  ]

  // Escribir cabeceras manualmente en fila 5
  const headers = ["DNI", "Trabajador", "Tipo EMO", "Resultado", "Fecha Vencimiento", "Estado", "Archivo EMO", "Legajo Completo", "Informe Médico"]
  const headerRow = sheet.getRow(5)
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h
  })
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: "middle", horizontal: "center" }
  headerRow.commit()

  /* ===============================
     📥 DATOS (desde fila 6)
  =============================== */
  emosFiltrados.forEach(e => {
    sheet.addRow({
      dni: e.trabajadores?.dni || "",
      trabajador: e.trabajadores
        ? `${e.trabajadores.nombres} ${e.trabajadores.apellidos}`.toUpperCase()
        : "",
      tipo: e.tipo,
      resultado: formatResultado(e.resultado),
      vencimiento: e.fecha_vencimiento,
      estado: calcularEstadoEMO(e.fecha_vencimiento),
      archivo: e.archivo_url || "",
      legajo: e.legajo_url || "",
      informe: e.informe_medico_url || ""
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
    if (empresaId) {
      fetchEmos()
    } else {
      setEmos([])
    }
  }, [empresaId])

  const fetchEmos = async () => {
    console.log("fetchEmos llamado con empresaId:", empresaId)
    try {
      const data = await restQuery(
        `emos?select=id,tipo,resultado,fecha_examen,fecha_vencimiento,entidad_medica,observaciones,archivo_url,legajo_url,informe_medico_url,trabajadores(dni,nombres,apellidos,empresa)&empresa_id=eq.${empresaId}&order=fecha_vencimiento.asc`
      )
      console.log("EMOs obtenidos exitosamente:", data)
      setEmos(data || [])
    } catch (error) {
      console.error("Error al obtener EMOs:", error)
    }
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
              <th>Legajo</th>
              <th>Informe Médico</th>
            </tr>
          </thead>
          <tbody>
            {emosFiltrados.map(e => (
              <tr key={e.id}>
                <td>{e.trabajadores?.dni}</td>
                <td style={{ fontWeight: 600, color: "#1e293b" }}>
                  {e.trabajadores
                    ? `${e.trabajadores.nombres} ${e.trabajadores.apellidos}`.toUpperCase()
                    : "—"}
                </td>
                <td style={{ textTransform: "capitalize" }}>{e.tipo}</td>
                <td>
                  {e.resultado === "observado" ? (
                    <button
                      onClick={() => handleAbrirEdicionObservado(e)}
                      className="badge-resultado observado"
                      title="Haga click para levantar observación"
                      style={{ border: "1px solid #c7d2fe", font: "inherit" }}
                    >
                      ✏️ Observado
                    </button>
                  ) : (
                    <span className={`badge-resultado ${e.resultado}`}>
                      {formatResultado(e.resultado)}
                    </span>
                  )}
                </td>
                <td>{e.fecha_vencimiento}</td>
                <td>
                  <span className={`badge-estado ${calcularEstadoEMO(e.fecha_vencimiento).replace(" ", "-")}`}>
                    {calcularEstadoEMO(e.fecha_vencimiento)}
                  </span>
                </td>
                <td>
                  {e.archivo_url ? (
                    <button
                      onClick={() => {
                        // Usamos <a> con noopener para evitar el lock de GoTrue entre pestañas
                        const a = document.createElement('a');
                        a.href = e.archivo_url;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        auditService.record({
                          action: 'VIEW',
                          module: 'Exámenes Médicos',
                          description: `Visualizó el archivo EMO de: ${e.trabajadores?.nombres} ${e.trabajadores?.apellidos} (DNI: ${e.trabajadores?.dni})`,
                          details: { dni: e.trabajadores?.dni, archivo_url: e.archivo_url }
                        }).catch(err => console.warn('Audit VIEW error:', err));
                      }}
                      className="btn-ver"
                      style={{ border: 'none', cursor: 'pointer', background: 'none', padding: 0, color: 'inherit', font: 'inherit', textDecoration: 'underline' }}
                    >
                      Ver
                    </button>
                  ) : (
                    <span className="sin-archivo">—</span>
                  )}
                </td>
                <td>
                  {e.legajo_url ? (
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = e.legajo_url;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        auditService.record({
                          action: 'VIEW',
                          module: 'Exámenes Médicos',
                          description: `Visualizó el Legajo Completo de: ${e.trabajadores?.nombres} ${e.trabajadores?.apellidos} (DNI: ${e.trabajadores?.dni})`,
                          details: { dni: e.trabajadores?.dni, legajo_url: e.legajo_url }
                        }).catch(err => console.warn('Audit VIEW error:', err));
                      }}
                      className="btn-ver"
                      style={{ border: 'none', cursor: 'pointer', background: 'none', padding: 0, color: 'inherit', font: 'inherit', textDecoration: 'underline' }}
                    >
                      Ver
                    </button>
                  ) : (
                    <span className="sin-archivo">—</span>
                  )}
                </td>
                <td>
                  {e.informe_medico_url ? (
                    <button
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = e.informe_medico_url;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        auditService.record({
                          action: 'VIEW',
                          module: 'Exámenes Médicos',
                          description: `Visualizó el Informe Médico de: ${e.trabajadores?.nombres} ${e.trabajadores?.apellidos} (DNI: ${e.trabajadores?.dni})`,
                          details: { dni: e.trabajadores?.dni, informe_medico_url: e.informe_medico_url }
                        }).catch(err => console.warn('Audit VIEW error:', err));
                      }}
                      className="btn-ver"
                      style={{ border: 'none', cursor: 'pointer', background: 'none', padding: 0, color: 'inherit', font: 'inherit', textDecoration: 'underline' }}
                    >
                      Ver
                    </button>
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
    ? `${e.trabajadores.nombres} ${e.trabajadores.apellidos}`.toUpperCase()
    : "—"}
</div>

            <div><strong>Tipo:</strong> {e.tipo}</div>
            <div><strong>Resultado:</strong> {formatResultado(e.resultado)}</div>
            <div><strong>Vence:</strong> {e.fecha_vencimiento}</div>

            <div className={`estado ${calcularEstadoEMO(e.fecha_vencimiento)}`}>
              {calcularEstadoEMO(e.fecha_vencimiento).toUpperCase()}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: '8px' }}>
              {e.archivo_url ? (
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = e.archivo_url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    auditService.record({
                      action: 'VIEW',
                      module: 'Exámenes Médicos',
                      description: `Visualizó el archivo EMO de: ${e.trabajadores?.nombres} ${e.trabajadores?.apellidos} (DNI: ${e.trabajadores?.dni})`,
                      details: { dni: e.trabajadores?.dni, archivo_url: e.archivo_url }
                    }).catch(err => console.warn('Audit VIEW error:', err));
                  }}
                  className="btn-ver"
                  style={{ border: 'none', cursor: 'pointer', background: 'none', padding: 0, color: 'inherit', font: 'inherit', textDecoration: 'underline' }}
                >
                  📄 Ver EMO
                </button>
              ) : (
                <span className="sin-archivo">Sin EMO</span>
              )}

              {e.legajo_url ? (
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = e.legajo_url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    auditService.record({
                      action: 'VIEW',
                      module: 'Exámenes Médicos',
                      description: `Visualizó el Legajo Completo de: ${e.trabajadores?.nombres} ${e.trabajadores?.apellidos} (DNI: ${e.trabajadores?.dni})`,
                      details: { dni: e.trabajadores?.dni, legajo_url: e.legajo_url }
                    }).catch(err => console.warn('Audit VIEW error:', err));
                  }}
                  className="btn-ver"
                  style={{ border: 'none', cursor: 'pointer', background: 'none', padding: 0, color: 'inherit', font: 'inherit', textDecoration: 'underline' }}
                >
                  📁 Ver Legajo
                </button>
              ) : (
                <span className="sin-archivo">Sin Legajo</span>
              )}

              {e.informe_medico_url ? (
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = e.informe_medico_url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    auditService.record({
                      action: 'VIEW',
                      module: 'Exámenes Médicos',
                      description: `Visualizó el Informe Médico de: ${e.trabajadores?.nombres} ${e.trabajadores?.apellidos} (DNI: ${e.trabajadores?.dni})`,
                      details: { dni: e.trabajadores?.dni, informe_medico_url: e.informe_medico_url }
                    }).catch(err => console.warn('Audit VIEW error:', err));
                  }}
                  className="btn-ver"
                  style={{ border: 'none', cursor: 'pointer', background: 'none', padding: 0, color: 'inherit', font: 'inherit', textDecoration: 'underline' }}
                >
                  📋 Ver Informe
                </button>
              ) : (
                <span className="sin-archivo">Sin Informe</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ===== MODAL ===== */}
      {openModal && (
        <ModalRegistroEMO
          abierto={openModal}
          onClose={handleCerrarModal}
          onGuardado={() => {
            fetchEmos()
            handleCerrarModal()
          }}
          emoParaEditar={emoParaEditar}
        />
      )}
    </div>
  )
}
