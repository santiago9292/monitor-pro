import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { restQuery } from '../lib/supabaseRest'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, LabelList, PieChart, Pie, Cell, Legend
} from 'recharts'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import logoEmpresa from '../assets/logo.png'
import { auditService } from '../services/auditService'
import { useEmpresa } from '../context/EmpresaContext'
import '../App.css'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9'];

function Estadisticas() {
  const { empresaId } = useEmpresa()
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [loading, setLoading] = useState(true)

  // Datos para gráficos
  const [porCie, setPorCie] = useState([])
  const [porDia, setPorDia] = useState([])
  const [generoDist, setGeneroDist] = useState([])
  const [topPacientes, setTopPacientes] = useState([])

  // KPIs
  const [kpis, setKpis] = useState({
    totalAtenciones: 0,
    emosVencidos: 0,
    descansosActivos: 0,
    crecimiento: '+0%'
  })

  useEffect(() => {
    if (empresaId) {
      cargarTodo()
    }
  }, [empresaId])

  const cargarTodo = async () => {
    setLoading(true)
    try {
      await Promise.all([
        cargarEstadisticasAtenciones(),
        cargarKpisAdicionales()
      ])
    } finally {
      setLoading(false)
    }
  }

  const cargarEstadisticasAtenciones = async () => {
    try {
      const params = [
        'select=fecha,cie,trabajador_id,trabajadores(nombres,apellidos,dni,sexo)',
        `empresa_id=eq.${empresaId}`
      ]
      if (desde) params.push(`fecha=gte.${desde}`)
      if (hasta) params.push(`fecha=lte.${hasta}T23:59:59`)

      const data = await restQuery(`registros_medicos?${params.join('&')}`)
      if (!data) return

      // 1. KPI Total
      const total = data.length

      // 2. Por CIE
      const cieMap = {}
      data.forEach(r => { if (r.cie) cieMap[r.cie] = (cieMap[r.cie] || 0) + 1 })
      setPorCie(Object.entries(cieMap).map(([cie, total]) => ({ cie, total })).sort((a,b) => b.total - a.total).slice(0, 8))

      // 3. Por Día
      const fechaMap = {}
      data.forEach(r => { const d = r.fecha.split('T')[0]; fechaMap[d] = (fechaMap[d] || 0) + 1 })
      setPorDia(Object.entries(fechaMap).map(([fecha, total]) => ({ fecha, total })).sort((a,b) => a.fecha.localeCompare(b.fecha)))

      // 4. Distribución Género
      const genMap = { M: 0, F: 0 }
      data.forEach(r => { if (r.trabajadores?.sexo) genMap[r.trabajadores.sexo]++ })
      setGeneroDist([
        { name: 'Masculino', value: genMap.M },
        { name: 'Femenino', value: genMap.F }
      ])

      // 5. Top Pacientes
      const pacMap = {}
      data.forEach(r => {
        const t = r.trabajadores
        if (!t) return
        pacMap[t.dni] = pacMap[t.dni] || { nombre: `${t.nombres} ${t.apellidos}`, dni: t.dni, total: 0 }
        pacMap[t.dni].total++
      })
      setTopPacientes(Object.values(pacMap).sort((a,b) => b.total - a.total).slice(0, 5))
      
      setKpis(prev => ({ ...prev, totalAtenciones: total }))
    } catch (error) {
      console.error("Error loading atenciones stats:", error)
    }
  }

  const cargarKpisAdicionales = async () => {
    const today = new Date().toISOString().split('T')[0]

    try {
      // Descansos Activos (excluyendo trabajadores de baja)
      const descansosData = await restQuery(
        `descansos_medicos?select=id,trabajadores!inner(empresa)&empresa_id=eq.${empresaId}&fecha_fin=gte.${today}&trabajadores.empresa=not.ilike.*DE%20BAJA*`
      )
      const descansos = descansosData ? descansosData.length : 0

      // EMOs Vencidos (excluyendo trabajadores de baja)
      const emosData = await restQuery(
        `emos?select=id,trabajadores!inner(empresa)&empresa_id=eq.${empresaId}&fecha_vencimiento=lt.${today}&trabajadores.empresa=not.ilike.*DE%20BAJA*`
      )
      const emos = emosData ? emosData.length : 0

      setKpis(prev => ({
        ...prev,
        descansosActivos: descansos,
        emosVencidos: emos
      }))
    } catch (error) {
      console.error("Error loading additional KPIs:", error)
    }
  }

  const exportarExcel = async () => {
    let data = []
    try {
      const params = [
        'select=fecha,sintomas,recomendaciones,cie,trabajadores(dni,nombres,apellidos,sexo,fecha_nacimiento)'
      ]
      if (desde) params.push(`fecha=gte.${desde}`)
      if (hasta) params.push(`fecha=lte.${hasta}T23:59:59`)
      data = await restQuery(`registros_medicos?${params.join('&')}`)
    } catch (error) {
      console.error("Error exporting to excel:", error)
    }

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Reporte Atenciones')
    sheet.columns = [
      { header: 'Fecha', key: 'fecha', width: 15 },
      { header: 'DNI', key: 'dni', width: 15 },
      { header: 'Paciente', key: 'paciente', width: 30 },
      { header: 'Sexo', key: 'sexo', width: 12 },
      { header: 'Diagnóstico (CIE)', key: 'cie', width: 20 },
      { header: 'Síntomas', key: 'sintomas', width: 40 }
    ]
    
    data.forEach(r => sheet.addRow({
      fecha: new Date(r.fecha).toLocaleDateString(),
      dni: r.trabajadores?.dni,
      paciente: `${r.trabajadores?.nombres} ${r.trabajadores?.apellidos}`,
      sexo: r.trabajadores?.sexo,
      cie: r.cie,
      sintomas: r.sintomas
    }))

    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer]), `Reporte_Salud_${today}.xlsx`)
    auditService.record({ action: 'EXPORT', module: 'Estadísticas', description: 'Exportó reporte consolidado de salud' })
  }

  const today = new Date().toLocaleDateString()

  return (
    <div className="page-container" style={{ maxWidth: '1400px' }}>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, color: '#1e293b' }}>Dashboard de Salud Ocupacional</h1>
          <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0' }}>Indicadores y reportes gerenciales</p>
        </div>
      </div>

      <div className="stats-toolbar">
        <div className="toolbar-field">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        <div className="toolbar-field">
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={cargarTodo}>
          Filtrar Datos
        </button>
        <button onClick={exportarExcel} className="btn-primary" style={{ background: '#10b981' }}>
          📥 Descargar Excel
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="dashboard-metrics">
        <KPIItem icon="🏥" label="Total Atenciones" value={kpis.totalAtenciones} color="#eff6ff" iconColor="#3b82f6" />
        <KPIItem icon="🩺" label="EMOs Vencidos" value={kpis.emosVencidos} color="#fff1f2" iconColor="#ef4444" trend="Requiere Acción" />
        <KPIItem icon="🛌" label="Descansos Activos" value={kpis.descansosActivos} color="#f0fdf4" iconColor="#10b981" />
        <KPIItem icon="📈" label="Crecimiento Mensual" value={kpis.crecimiento} color="#fffbeb" iconColor="#f59e0b" />
      </div>
      <div className="stats-grid">
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Tendencia Diaria</span>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <LineChart data={porDia} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="fecha" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={5} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
              <Tooltip 
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', fontSize: '11px', background: '#fff', color: '#0f172a' }} 
                formatter={(value) => [`${value} atenciones`, 'Total']}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 1, stroke: '#fff' }} activeDot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Género</span>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie 
                data={generoDist} 
                innerRadius={30} 
                outerRadius={45} 
                paddingAngle={5} 
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                style={{ fontSize: '10px', fontWeight: '600', fill: '#475569' }}
                activeShape={false}
              >
                {generoDist.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', fontSize: '11px', background: '#fff' }} 
                itemStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                formatter={(value, name) => [`${value} pacientes`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Top Diagnósticos CIE</span>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={porCie} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                dataKey="cie" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                interval={0}
                tick={({ x, y, payload }) => {
                  const code = payload.value.split('-')[0].trim();
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text x={-5} y={0} dy={4} textAnchor="end" fill="#1e293b" fontSize={10} fontWeight={600}>
                        {code}
                      </text>
                    </g>
                  );
                }}
                width={50} 
              />
              <Tooltip 
                cursor={false} 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', maxWidth: '220px' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: '1.4' }}>{payload[0].payload.cie}</p>
                        <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>{payload[0].value} atenciones</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12}>
                <LabelList dataKey="total" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Pacientes Recurrentes</span>
          </div>
          <div style={{ overflowY: 'auto', height: '140px' }}>
            <table className="stats-table">
              <tbody>
                {topPacientes.map((p, i) => (
                  <tr key={i}>
                    <td>{`${p.nombre.split(' ')[0]} ${p.nombre.split(' ').slice(-1)}`.toUpperCase()}</td>
                    <td style={{ color: '#64748b', fontSize: '10px' }}>{p.dni}</td>
                    <td><span className="badge" style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 6px', fontSize: '9px' }}>{p.total} v.</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPIItem({ icon, label, value, color, iconColor, trend }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: color }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="kpi-info">
        <h4>{label}</h4>
        <p className="value">{value}</p>
        {trend && <span className="trend down" style={{fontSize: '11px'}}>{trend}</span>}
      </div>
    </div>
  )
}

export default Estadisticas
