import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { auditService } from '../services/auditService'

const EMPTY_FORM = {
  codigo: '',
  nombre: '',
  ruc: '',
  direccion: '',
  contacto: '',
}

export default function GestionEmpresas() {
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'crear' | 'editar'
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [search, setSearch] = useState('')

  useEffect(() => { loadEmpresas() }, [])

  async function loadEmpresas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('empresas')
      .select('*, profiles(count)')
      .order('nombre')

    if (!error) setEmpresas(data || [])
    setLoading(false)
  }

  const handleOpenCrear = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setMsg({ type: '', text: '' })
    setModal('crear')
  }

  const handleOpenEditar = (emp) => {
    setForm({
      codigo: emp.codigo,
      nombre: emp.nombre,
      ruc: emp.ruc || '',
      direccion: emp.direccion || '',
      contacto: emp.contacto || '',
    })
    setEditingId(emp.id)
    setMsg({ type: '', text: '' })
    setModal('editar')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg({ type: '', text: '' })

    const payload = {
      codigo: form.codigo.trim().toUpperCase(),
      nombre: form.nombre.trim(),
      ruc: form.ruc.trim() || null,
      direccion: form.direccion.trim() || null,
      contacto: form.contacto.trim() || null,
    }

    try {
      if (modal === 'crear') {
        const { error } = await supabase.from('empresas').insert(payload)
        if (error) throw error
        await auditService.record({
          action: 'CREATE', module: 'Empresas',
          description: `Creó la empresa "${payload.nombre}" (${payload.codigo})`
        })
        setMsg({ type: 'ok', text: `Empresa "${payload.nombre}" creada correctamente.` })
      } else {
        const { error } = await supabase.from('empresas').update(payload).eq('id', editingId)
        if (error) throw error
        await auditService.record({
          action: 'UPDATE', module: 'Empresas',
          description: `Editó la empresa "${payload.nombre}" (${payload.codigo})`
        })
        setMsg({ type: 'ok', text: `Empresa actualizada correctamente.` })
      }
      loadEmpresas()
      setTimeout(() => setModal(null), 1500)
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Error al guardar.' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActiva = async (emp) => {
    const nuevaActiva = !emp.activa
    const { error } = await supabase
      .from('empresas')
      .update({ activa: nuevaActiva })
      .eq('id', emp.id)

    if (!error) {
      await auditService.record({
        action: 'UPDATE', module: 'Empresas',
        description: `${nuevaActiva ? 'Activó' : 'Desactivó'} la empresa "${emp.nombre}" (${emp.codigo})`
      })
      loadEmpresas()
    }
  }

  const empresasFiltradas = empresas.filter(e =>
    e.nombre.toLowerCase().includes(search.toLowerCase()) ||
    e.codigo.toLowerCase().includes(search.toLowerCase()) ||
    (e.ruc || '').includes(search)
  )

  const stats = {
    total: empresas.length,
    activas: empresas.filter(e => e.activa).length,
    inactivas: empresas.filter(e => !e.activa).length,
  }

  return (
    <div style={{ padding: '0 4px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            🏢 Gestión de Empresas
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
            Panel de super administrador — Configure los tenants del sistema
          </p>
        </div>
        <button
          onClick={handleOpenCrear}
          style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}
        >
          + Nueva Empresa
        </button>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {[
          { label: 'Total Empresas', value: stats.total, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Activas', value: stats.activas, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Inactivas', value: stats.inactivas, color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* BUSCADOR */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, código o RUC..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px' }}
        />
      </div>

      {/* TABLA */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Cargando empresas...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Empresa', 'Código', 'RUC', 'Contacto', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #e2e8f0' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresasFiltradas.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No hay empresas registradas.</td></tr>
              ) : empresasFiltradas.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{emp.nombre}</div>
                    {emp.direccion && <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{emp.direccion}</div>}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' }}>
                      {emp.codigo}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>{emp.ruc || '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#475569' }}>{emp.contacto || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: emp.activa ? '#f0fdf4' : '#fef2f2',
                      color: emp.activa ? '#16a34a' : '#dc2626',
                      borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: '700'
                    }}>
                      {emp.activa ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleOpenEditar(emp)}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleToggleActiva(emp)}
                        style={{
                          background: emp.activa ? '#fff1f2' : '#f0fdf4',
                          border: `1px solid ${emp.activa ? '#fecaca' : '#bbf7d0'}`,
                          color: emp.activa ? '#dc2626' : '#16a34a',
                          padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                        }}
                      >
                        {emp.activa ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL CREAR / EDITAR */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '36px', width: '100%', maxWidth: '520px', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '6px', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
              {modal === 'crear' ? '+ Nueva Empresa' : '✏️ Editar Empresa'}
            </h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              Complete los datos de la empresa cliente.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>
                    Código único *
                  </label>
                  <input
                    value={form.codigo}
                    onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))}
                    placeholder="Ej: MINSUR"
                    required
                    disabled={modal === 'editar'}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', fontFamily: 'monospace', letterSpacing: '1px', background: modal === 'editar' ? '#f8fafc' : 'white' }}
                  />
                  {modal === 'editar' && <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>El código no se puede modificar.</p>}
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>RUC</label>
                  <input
                    value={form.ruc}
                    onChange={e => setForm(p => ({ ...p, ruc: e.target.value.replace(/\D/g, '') }))}
                    placeholder="20123456789"
                    maxLength={11}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>Razón Social / Nombre *</label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Minera Surperú S.A."
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>Dirección</label>
                <input
                  value={form.direccion}
                  onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))}
                  placeholder="Av. Principal 123, Lima"
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '5px' }}>Contacto (email o teléfono)</label>
                <input
                  value={form.contacto}
                  onChange={e => setForm(p => ({ ...p, contacto: e.target.value }))}
                  placeholder="contacto@empresa.com"
                  style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              {msg.text && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'ok' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
                  {msg.type === 'ok' ? '✅' : '⚠️'} {msg.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, background: '#2563eb', color: 'white', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(37,99,235,0.2)' }}>
                  {saving ? 'Guardando...' : modal === 'crear' ? 'Crear Empresa' : 'Guardar Cambios'}
                </button>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, background: 'white', color: '#64748b', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
