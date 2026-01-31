import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import logoEmpresa from '../assets/logo.png'

function Estadisticas() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [porCie, setPorCie] = useState([])
  const [porDia, setPorDia] = useState([])
  const [topPacientes, setTopPacientes] = useState([])

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  /* =======================
     CARGAR ESTADÍSTICAS
  ======================= */
  const cargarEstadisticas = async () => {
    let query = supabase
      .from('registros_medicos')
      .select(`
        fecha,
        cie,
        trabajador_id,
        trabajadores (
          nombres,
          apellidos,
          dni
        )
      `)

    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta + 'T23:59:59')

    const { data } = await query
    if (!data) return

    /* === POR CIE === */
    const cieMap = {}
    data.forEach(r => {
      if (!r.cie) return
      cieMap[r.cie] = (cieMap[r.cie] || 0) + 1
    })

    setPorCie(
      Object.entries(cieMap).map(([cie, total]) => ({ cie, total }))
    )

    /* === POR DÍA === */
    const fechaMap = {}
    data.forEach(r => {
      const dia = r.fecha.split('T')[0]
      fechaMap[dia] = (fechaMap[dia] || 0) + 1
    })

    setPorDia(
      Object.entries(fechaMap)
        .map(([fecha, total]) => ({ fecha, total }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
    )

    /* === TOP PACIENTES === */
    const pacMap = {}
    data.forEach(r => {
      const t = r.trabajadores
      if (!t) return
      pacMap[t.dni] = pacMap[t.dni] || {
        nombre: `${t.nombres} ${t.apellidos}`,
        dni: t.dni,
        total: 0
      }
      pacMap[t.dni].total++
    })

    setTopPacientes(Object.values(pacMap).sort((a, b) => b.total - a.total))
  }

  /* =======================
     EXPORTAR EXCEL
  ======================= */
  const exportarExcel = async () => {
    let query = supabase
      .from('registros_medicos')
      .select(`
        fecha,
        sintomas,
        recomendaciones,
        cie,
        trabajadores (
          dni,
          nombres,
          apellidos,
          sexo,
          fecha_nacimiento
        )
      `)

    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta + 'T23:59:59')

    const { data } = await query
    if (!data || data.length === 0) {
      alert('No hay datos para exportar')
      return
    }

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Reporte')

    const img = await fetch(logoEmpresa)
    const bufferImg = await img.arrayBuffer()

    const imageId = workbook.addImage({
      buffer: bufferImg,
      extension: 'png'
    })

    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 180, height: 60 }
    })

    sheet.mergeCells('C1:H2')
    sheet.getCell('C1').value = 'REPORTE DE ATENCIONES MÉDICAS'
    sheet.getCell('C1').font = { size: 16, bold: true }

    sheet.addRow([])
    sheet.addRow([
      'Fecha',
      'DNI',
      'Paciente',
      'Sexo',
      'Fecha Nac.',
      'CIE',
      'Síntomas',
      'Recomendaciones'
    ])

    data.forEach(r => {
      const t = r.trabajadores
      sheet.addRow([
        new Date(r.fecha).toLocaleDateString('es-PE'),
        t?.dni,
        `${t?.nombres} ${t?.apellidos}`,
        t?.sexo === 'M' ? 'Masculino' : 'Femenino',
        t?.fecha_nacimiento,
        r.cie,
        r.sintomas,
        r.recomendaciones
      ])
    })

    sheet.columns.forEach(c => (c.width = 22))

    const excelBuffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([excelBuffer]), 'reporte_atenciones.xlsx')
  }

  /* =======================
     RENDER
  ======================= */
  return (
    <div>
      <h2>📊 Estadísticas y Reportes</h2>

      <div className="card">
        <h3>Filtros</h3>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label>Fecha inicio</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
          </div>

          <div style={{ flex: 1 }}>
            <label>Fecha fin</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
          </div>

          <div style={{ minWidth: 220 }}>
            <button onClick={cargarEstadisticas}>
              Aplicar filtros
            </button>

            <button
              style={{ marginTop: 10, background: '#16a34a' }}
              onClick={exportarExcel}
            >
              📥 Exportar a Excel
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Registros por enfermedad</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={porCie}>
            <XAxis dataKey="cie" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>Atenciones por día</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={porDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Line dataKey="total" stroke="#16a34a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3>Pacientes con más atenciones</h3>
        {topPacientes.slice(0, 5).map((p, i) => (
          <p key={i}><b>{p.nombre}</b> ({p.dni}) — {p.total}</p>
        ))}
      </div>
    </div>
  )
}

export default Estadisticas
