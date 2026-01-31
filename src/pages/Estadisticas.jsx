 import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid
} from 'recharts'

function Estadisticas() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const [porCie, setPorCie] = useState([])
  const [porDia, setPorDia] = useState([])
  const [topPacientes, setTopPacientes] = useState([])

  useEffect(() => {
    cargarEstadisticas()
  }, [])

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

    /* ===== REGISTROS POR CIE ===== */
    const cieMap = {}
    data.forEach(r => {
      if (!r.cie) return
      cieMap[r.cie] = (cieMap[r.cie] || 0) + 1
    })

    setPorCie(
      Object.entries(cieMap)
        .map(([cie, total]) => ({ cie, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
    )

    /* ===== REGISTROS POR DÍA ===== */
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

    /* ===== TOP PACIENTES ===== */
    const pacMap = {}
    data.forEach(r => {
      const t = r.trabajadores
      if (!t) return

      if (!pacMap[t.dni]) {
        pacMap[t.dni] = {
          nombre: `${t.nombres} ${t.apellidos}`,
          dni: t.dni,
          total: 0
        }
      }
      pacMap[t.dni].total++
    })

    setTopPacientes(
      Object.values(pacMap).sort((a, b) => b.total - a.total)
    )
  }

  return (
    <div>
      <h2>📊 Estadísticas y Reportes</h2>

      {/* ===== FILTROS ===== */}
      <div className="card">
        <h3>Filtros</h3>

        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-end'
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Fecha inicio</label>
            <input
              type="date"
              value={desde}
              onChange={e => setDesde(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="label">Fecha fin</label>
            <input
              type="date"
              value={hasta}
              onChange={e => setHasta(e.target.value)}
            />
          </div>

          <div style={{ minWidth: 180 }}>
            <button onClick={cargarEstadisticas}>
              Aplicar filtros
            </button>
          </div>
        </div>
      </div>

      {/* ===== REGISTROS POR ENFERMEDAD ===== */}
      <div className="card">
        <h3>Registros por enfermedad</h3>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={porCie}>
            <XAxis dataKey="cie" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ===== ATENCIONES POR DÍA ===== */}
      <div className="card">
        <h3>Atenciones por día</h3>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={porDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" />
            <YAxis />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#16a34a"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ===== TOP PACIENTES ===== */}
      <div className="card">
        <h3>Pacientes con más atenciones</h3>

        {topPacientes.slice(0, 5).map((p, i) => (
          <p key={i}>
            <b>{p.nombre}</b> ({p.dni}) — {p.total}
          </p>
        ))}
      </div>
    </div>
  )
}

export default Estadisticas
