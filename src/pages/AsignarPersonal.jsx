import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { restQuery } from '../lib/supabaseRest'
import { auditService } from '../services/auditService'

const ROLES_DISPONIBLES = ['admin', 'medico', 'enfermeria', 'rrhh', 'tecnico', 'super_admin']
const ROLE_LABELS = {
  admin: 'Admin Local',
  medico: 'Médico',
  enfermeria: 'Enfermería',
  rrhh: 'RRHH',
  tecnico: 'Técnico',
  super_admin: 'Super Admin',
}
const ROLE_COLORS = {
  admin: { bg: '#eff6ff', color: '#1d4ed8' },
  medico: { bg: '#f0fdf4', color: '#15803d' },
  enfermeria: { bg: '#fdf4ff', color: '#7e22ce' },
  rrhh: { bg: '#fff7ed', color: '#c2410c' },
  tecnico: { bg: '#f0f9ff', color: '#0369a1' },
  super_admin: { bg: '#fef3c7', color: '#b45309' },
}

// ── Componente: Buscador de Empresas ──────────────────────────────
function EmpresaSearchBox({ empresas, seleccionadas, onSelect, multiple }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const resultados = query.trim()
    ? empresas.filter(e =>
        e.nombre.toLowerCase().includes(query.toLowerCase()) ||
        e.codigo.toLowerCase().includes(query.toLowerCase())
      )
    : empresas

  // Filtrar las ya seleccionadas si no es multiple
  const resultadosFiltrados = multiple
    ? resultados
    : resultados.filter(e => !seleccionadas.includes(e.id))

  const handleSelect = (empId) => {
    onSelect(empId)
    setQuery('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          fontSize: '14px', color: '#94a3b8', pointerEvents: 'none'
        }}>🔍</span>
        <input
          type="text"
          id="search_empresa"
          placeholder="Buscar empresa por nombre o código..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          style={{
            width: '100%',
            padding: '10px 14px 10px 36px',
            borderRadius: '10px',
            border: '2px solid #e2e8f0',
            fontSize: '13px',
            outline: 'none',
            transition: 'border-color 0.15s',
            boxSizing: 'border-box'
          }}
          autoComplete="off"
        />
      </div>

      {open && resultadosFiltrados.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: '4px',
          maxHeight: '180px', overflowY: 'auto'
        }}>
          {resultadosFiltrados.map(emp => {
            const yaSeleccionada = seleccionadas.includes(emp.id)
            return (
              <button
                key={emp.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(emp.id)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid #f1f5f9',
                  background: yaSeleccionada ? '#eff6ff' : 'white',
                  color: yaSeleccionada ? '#1d4ed8' : '#334155',
                  cursor: 'pointer', textAlign: 'left', fontSize: '13px',
                  fontWeight: yaSeleccionada ? '700' : '400',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={e => { if (!yaSeleccionada) e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={e => { if (!yaSeleccionada) e.currentTarget.style.background = 'white' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {yaSeleccionada && <span style={{ color: '#2563eb', fontSize: '14px' }}>✓</span>}
                  {emp.nombre}
                </span>
                <span style={{
                  fontFamily: 'monospace', fontSize: '11px', fontWeight: '700',
                  background: yaSeleccionada ? '#dbeafe' : '#f1f5f9',
                  color: yaSeleccionada ? '#2563eb' : '#64748b',
                  padding: '2px 8px', borderRadius: '20px'
                }}>{emp.codigo}</span>
              </button>
            )
          })}
        </div>
      )}

      {open && resultadosFiltrados.length === 0 && query.trim() && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: '4px',
          padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px'
        }}>
          No se encontraron empresas con "{query}"
        </div>
      )}
    </div>
  )
}

export default function AsignarPersonal() {
  const [profiles, setProfiles] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('todos')
  const [editUser, setEditUser] = useState(null)
  const [editEmpresasSeleccionadas, setEditEmpresasSeleccionadas] = useState([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [medico_empresas, setMedicoEmpresas] = useState([]) // todas las relaciones

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [profilesRes, empresasRes, me_res] = await Promise.all([
        restQuery('profiles?select=*&order=full_name.asc'),
        restQuery('empresas?select=id,codigo,nombre&activa=eq.true&order=nombre.asc'),
        restQuery('medico_empresas?select=medico_id,empresa_id,activo'),
      ])
      setProfiles(profilesRes || [])
      setEmpresas(empresasRes || [])
      setMedicoEmpresas(me_res || [])
    } catch (error) {
      console.error('Error loading assignments data:', error)
    }
    setLoading(false)
  }

  const getEmpresaNombre = (id) => {
    const e = empresas.find(e => e.id === id)
    return e ? `${e.nombre} (${e.codigo})` : '—'
  }

  const getMedicoEmpresas = (medicoId) =>
    medico_empresas.filter(m => m.medico_id === medicoId && m.activo)

  const handleOpenEdit = (user) => {
    setEditUser(user)
    setMsg({ type: '', text: '' })
    // Inicializar empresas seleccionadas desde medico_empresas para todos los roles
    const asignadas = medico_empresas.filter(m => m.medico_id === user.id && m.activo).map(m => m.empresa_id)
    setEditEmpresasSeleccionadas(asignadas)
  }

  const handleToggleEmpresaSeleccion = (empresaId) => {
    setEditEmpresasSeleccionadas(prev =>
      prev.includes(empresaId)
        ? prev.filter(id => id !== empresaId)
        : [...prev, empresaId]
    )
  }

  const handleSave = async () => {
    if (!editUser) return
    setSaving(true)
    setMsg({ type: '', text: '' })

    try {
      const role = editUser.role

      // 1. Desactivar todas las relaciones actuales en medico_empresas
      const { error: deactivateErr } = await supabase
        .from('medico_empresas').update({ activo: false }).eq('medico_id', editUser.id)
      if (deactivateErr) throw new Error('Error al desactivar asignaciones: ' + deactivateErr.message)

      // 2. Insertar o reactivar las seleccionadas
      for (const empresaId of editEmpresasSeleccionadas) {
        const existingArr = await restQuery(`medico_empresas?select=id&medico_id=eq.${editUser.id}&empresa_id=eq.${empresaId}`)
        const existing = existingArr[0] || null

        if (existing) {
          const { error: reactivateErr } = await supabase
            .from('medico_empresas').update({ activo: true }).eq('id', existing.id)
          if (reactivateErr) throw new Error('Error al reactivar asignación: ' + reactivateErr.message)
        } else {
          const { error: insertErr } = await supabase
            .from('medico_empresas').insert({ medico_id: editUser.id, empresa_id: empresaId })
          if (insertErr) throw new Error('Error al asignar empresa: ' + insertErr.message)
        }
      }

      // 3. Sincronizar profiles.empresa_id con la primera empresa de editEmpresasSeleccionadas como fallback legacy
      const nuevaEmpresaId = editEmpresasSeleccionadas[0] || null
      const updateData = { empresa_id: nuevaEmpresaId }
      updateData.role = editUser.role

      const { error: updateErr } = await supabase.rpc('admin_update_profile', {
        target_user_id: editUser.id,
        update_data: updateData
      })

      if (updateErr) {
        console.error('Error Supabase al actualizar perfil:', updateErr)
        throw new Error('Error al actualizar perfil: ' + updateErr.message)
      }

      await auditService.record({
        action: 'UPDATE', module: 'Asignación de Personal',
        description: `Configuró al usuario ${editUser.full_name || editUser.email}: rol="${ROLE_LABELS[editUser.role]}", empresas asignadas=${editEmpresasSeleccionadas.length}.`
      })

      setMsg({ type: 'ok', text: 'Cambios guardados correctamente.' })
      await loadAll()
      setTimeout(() => setEditUser(null), 1500)
    } catch (err) {
      console.error('Error en handleSave:', err)
      setMsg({ type: 'error', text: err.message || 'Error al guardar.' })
    } finally {
      setSaving(false)
    }
  }

  // Filtrar
  const profilesFiltrados = profiles.filter(p => {
    const nombre = `${p.nombres || ''} ${p.apellidos || ''} ${p.email || ''}`.toLowerCase()
    const cumpleBusqueda = nombre.includes(search.toLowerCase())
    const cumpleRol = filterRole === 'todos' || p.role === filterRole
    return cumpleBusqueda && cumpleRol
  })

  return (
    <div style={{ padding: '0 4px' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
          👥 Gestión de Personal y Empresas
        </h2>
        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
          Asigne roles y empresas a cada usuario. Los médicos pueden tener acceso a múltiples empresas.
        </p>
      </div>

      {/* LEYENDA DE ROLES */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', paddingTop: '4px' }}>Roles:</span>
        {ROLES_DISPONIBLES.map(r => (
          <span key={r} style={{ ...ROLE_COLORS[r], borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: '700' }}>
            {ROLE_LABELS[r]}
          </span>
        ))}
      </div>

      {/* FILTROS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre o correo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
        />
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', background: 'white' }}
        >
          <option value="todos">Todos los roles</option>
          {ROLES_DISPONIBLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </div>

      {/* TABLA */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Cargando personal...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Profesional', 'Rol', 'Empresa(s) Asignada(s)', 'Estado', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profilesFiltrados.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Sin resultados.</td></tr>
              ) : profilesFiltrados.map(user => {
                const rolColor = ROLE_COLORS[user.role] || ROLE_COLORS.rrhh
                const asignaciones = getMedicoEmpresas(user.id)
                const empresasAsignadas = asignaciones.length > 0
                  ? asignaciones.map(m => empresas.find(e => e.id === m.empresa_id)).filter(Boolean)
                  : user.empresa_id ? [empresas.find(e => e.id === user.empresa_id)].filter(Boolean) : []

                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>
                        {(user.nombres && user.apellidos ? `${user.nombres} ${user.apellidos}` : (user.full_name || 'Sin nombre')).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{user.email}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ ...rolColor, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: '700' }}>
                        {ROLE_LABELS[user.role] || user.role?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {empresasAsignadas.length === 0 ? (
                        <span style={{ color: '#f59e0b', fontSize: '13px', fontWeight: '600' }}>⚠️ Sin empresa</span>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {empresasAsignadas.map(e => e && (
                            <span key={e.id} style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: '700' }}>
                              {e.codigo}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: user.status === 'inactivo' ? '#fef2f2' : '#f0fdf4', color: user.status === 'inactivo' ? '#dc2626' : '#16a34a', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '700' }}>
                        {(user.status || 'activo').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => handleOpenEdit({ ...user, _originalRole: user.role })}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                      >
                        ✏️ Configurar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CONFIGURAR USUARIO */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '4px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              Configurar: {(editUser.nombres && editUser.apellidos ? `${editUser.nombres} ${editUser.apellidos}` : (editUser.full_name || editUser.email)).toUpperCase()}
            </h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              Asigne un rol y una o más empresas al usuario.
            </p>

            {/* ROL — Select desplegable */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px' }}>
                Rol del usuario
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  id="select_role"
                  value={editUser.role}
                  onChange={(e) => setEditUser(prev => ({ ...prev, role: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '2px solid #e2e8f0',
                    background: ROLE_COLORS[editUser.role]?.bg || 'white',
                    color: ROLE_COLORS[editUser.role]?.color || '#334155',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {ROLES_DISPONIBLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <span style={{
                  position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                  pointerEvents: 'none', fontSize: '12px', color: '#94a3b8'
                }}>▼</span>
              </div>
            </div>

            {/* EMPRESAS — Buscador con chips */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '8px' }}>
                Empresas asignadas (múltiple)
              </label>

              {/* Chips de empresas seleccionadas */}
              {editEmpresasSeleccionadas.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                  {editEmpresasSeleccionadas.map(empId => {
                    const emp = empresas.find(e => e.id === empId)
                    if (!emp) return null
                    return (
                      <div
                        key={empId}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', background: '#eff6ff', color: '#1d4ed8', borderRadius: '10px',
                          padding: '9px 12px', fontSize: '13px', fontWeight: '700',
                          border: '1px solid #bfdbfe', boxSizing: 'border-box'
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emp.nombre}
                        </span>
                        <span style={{
                          background: '#dbeafe', borderRadius: '10px', padding: '2px 8px',
                          fontFamily: 'monospace', fontSize: '10px', color: '#3b82f6',
                          marginLeft: '8px', flexShrink: 0
                        }}>{emp.codigo}</span>
                        <button
                           type="button"
                          onClick={() => handleToggleEmpresaSeleccion(empId)}
                          style={{
                            background: 'none', border: 'none', color: '#93c5fd',
                            cursor: 'pointer', fontWeight: '900', fontSize: '16px',
                            lineHeight: 1, padding: '0 0 0 8px', display: 'flex', alignItems: 'center',
                            flexShrink: 0
                          }}
                          title="Quitar empresa"
                        >×</button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Buscador de empresas */}
              <EmpresaSearchBox
                empresas={empresas}
                seleccionadas={editEmpresasSeleccionadas}
                onSelect={(empId) => handleToggleEmpresaSeleccion(empId)}
                multiple={true}
              />
            </div>

            {msg.text && (
              <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                {msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 1, background: '#2563eb', color: 'white', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px' }}
              >
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
              <button
                onClick={() => setEditUser(null)}
                style={{ flex: 1, background: 'white', color: '#64748b', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
