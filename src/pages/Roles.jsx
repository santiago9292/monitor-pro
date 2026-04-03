import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { auditService } from '../services/auditService';
import { useNavigate } from 'react-router-dom';

const AVAILABLE_ROLES = ['admin', 'medico', 'enfermeria', 'rrhh'];

export default function Roles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState(null); 
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    admin: 0,
    medico: 0,
    enfermeria: 0,
    rrhh: 0
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    try {
      const data = await userService.getProfiles();
      setProfiles(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  const calculateStats = (data) => {
    const newStats = { admin: 0, medico: 0, enfermeria: 0, rrhh: 0 };
    data.forEach(p => {
      if (newStats[p.role] !== undefined) {
        newStats[p.role]++;
      }
    });
    setStats(newStats);
  };

  const handleRoleChange = async (userId, userEmail, oldRole, newRole) => {
    if (oldRole === newRole) return;
    
    if (!window.confirm(`¿Estás seguro de cambiar el rol de ${userEmail} a "${newRole}"?`)) return;

    try {
      const success = await userService.updateRole(userId, newRole);
      if (success) {
        await auditService.record({
          action: 'UPDATE',
          module: 'Usuarios',
          description: `Cambió el rol de ${userEmail} a "${newRole}"`,
          details: { userId, oldRole, newRole }
        });
        loadProfiles();
      }
    } catch (error) {
      alert('Error actualizando rol');
    }
  };

  const handleStatusChange = async (user) => {
    const newStatus = user.status === 'activo' ? 'inactivo' : 'activo';
    if (!window.confirm(`¿Estás seguro de marcar a ${user.full_name || user.email} como "${newStatus}"?`)) return;

    try {
      const success = await userService.updateStatus(user.id, newStatus);
      if (success) {
        await auditService.record({
          action: 'UPDATE',
          module: 'Usuarios',
          description: `Cambió el estado de ${user.email} a "${newStatus}"`,
          details: { userId: user.id, newStatus }
        });
        loadProfiles();
      }
    } catch (error) {
      alert('Error actualizando estado');
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    
    // 1. Encontrar el perfil original para comparar
    const original = profiles.find(p => p.id === editUser.id);
    const changes = [];
    
    const fields = [
      { key: 'nombres', label: 'Nombres' },
      { key: 'apellidos', label: 'Apellidos' },
      { key: 'dni', label: 'DNI' },
      { key: 'genero', label: 'Género' },
      { key: 'fecha_nacimiento', label: 'F. Nac.' },
      { key: 'cmp', label: 'CMP' }
    ];

    fields.forEach(field => {
      if (original[field.key] !== editUser[field.key]) {
        changes.push(`${field.label}: "${original[field.key] || 'Vacio'}" -> "${editUser[field.key] || 'Vacio'}"`);
      }
    });

    try {
      const success = await userService.updateProfile(editUser.id, editUser);
      if (success) {
        const detailStr = changes.length > 0 ? ` [Cambios: ${changes.join(', ')}]` : ' (Sin cambios detectados)';
        const identifier = editUser.email || editUser.full_name || 'Usuario desconocido';
        
        await auditService.record({
          action: 'UPDATE',
          module: 'Usuarios',
          description: `Editó el perfil profesional de ${identifier}${detailStr}`,
          details: { userId: editUser.id, changes }
        });
        setEditUser(null);
        loadProfiles();
      } else {
        alert('Error al guardar los cambios.');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la operación.');
    }
  };

  return (
    <div className="mp-roles">
      
      {/* HEADER */}
      <div className="mp-roles-header">
        <div>
          <h2>Gestión de Usuarios</h2>
          <p>Administre identidades, roles y permisos de acceso al sistema</p>
        </div>
        <button 
          className="mp-roles-primary-btn" 
          onClick={() => navigate('/usuarios/crear')}
          style={{ height: 'fit-content' }}
        >
          + Nuevo Usuario
        </button>
      </div>

      {/* RESUMEN POR ROLES */}
      <div className="mp-roles-cards">
        <div className="mp-role-card admin">
          <h4>Administrador</h4>
          <span>{stats.admin} usuarios</span>
        </div>
        <div className="mp-role-card medico">
          <h4>Médico</h4>
          <span>{stats.medico} usuarios</span>
        </div>
        <div className="mp-role-card enfermeria" style={{ background: '#f0f9ff' }}>
          <h4>Enfermería / RRHH</h4>
          <span>{stats.enfermeria + stats.rrhh} usuarios</span>
        </div>
      </div>

      {/* TABLA */}
      <div className="mp-roles-table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando personal...</div>
        ) : (
          <table className="mp-roles-table">
            <thead>
              <tr>
                <th>Profesional / Email</th>
                <th>Rol Actual</th>
                <th>Cambiar Rol</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No hay perfiles registrados.
                  </td>
                </tr>
              ) : (
                profiles.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: '700', color: '#1e293b' }}>
                        {user.nombres && user.apellidos 
                          ? `${user.nombres} ${user.apellidos}` 
                          : (user.full_name || 'Sin nombre configurado')
                        }
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{user.email || 'Email no disponible'}</div>
                    </td>
                    <td>
                      <span className={`badge ${user.role}`}>
                        {(user.role || 'rrhh').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <select 
                        value={user.role || 'rrhh'}
                        onChange={(e) => handleRoleChange(user.id, user.full_name || user.email, user.role, e.target.value)}
                        style={{ margin: 0, padding: '6px', fontSize: '13px' }}
                      >
                        {AVAILABLE_ROLES.map(r => (
                          <option key={r} value={r}>{r.toUpperCase()}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`status ${user.status === 'activo' ? 'active' : 'inactive'}`}>
                        {(user.status || 'activo').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          className="mp-roles-action-btn edit"
                          onClick={() => setEditUser(user)}
                          title="Editar perfil completo"
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          className="mp-roles-action-btn audit"
                          onClick={() => window.location.href = `/auditoria?user=${user.email}`}
                          title="Ver bitácora de acciones"
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          👁️ Acciones
                        </button>
                        <button 
                          className="mp-roles-action-btn status"
                          onClick={() => handleStatusChange(user)}
                          style={{ background: user.status === 'activo' ? '#fff1f2' : '#f0fdf4', border: '1px solid', borderColor: user.status === 'activo' ? '#fecaca' : '#bbf7d0', color: user.status === 'activo' ? '#e11d48' : '#16a34a', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                        >
                          {user.status === 'activo' ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE EDICIÓN COMPLETO */}
      {editUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', padding: '35px', borderRadius: '16px', width: '100%', maxWidth: '550px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h3 style={{ marginBottom: '5px', color: '#1e293b', fontSize: '20px' }}>Perfil de: {editUser.email}</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '25px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>Actualice la información del profesional.</p>
            
            <form onSubmit={handleEditProfile} style={{ display: 'grid', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '5px', display: 'block' }}>Nombres</label>
                  <input 
                    value={editUser.nombres || ''} 
                    onChange={e => setEditUser({...editUser, nombres: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '5px', display: 'block' }}>Apellidos</label>
                  <input 
                    value={editUser.apellidos || ''} 
                    onChange={e => setEditUser({...editUser, apellidos: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '5px', display: 'block' }}>Identificación (DNI)</label>
                  <input 
                    value={editUser.dni || ''} 
                    onChange={e => setEditUser({...editUser, dni: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                    maxLength={12}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '5px', display: 'block' }}>Género</label>
                  <select 
                    value={editUser.genero || 'M'} 
                    onChange={e => setEditUser({...editUser, genero: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                    <option value="O">Otro</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '5px', display: 'block' }}>Fecha de Nacimiento</label>
                  <input 
                    type="date"
                    value={editUser.fecha_nacimiento || ''} 
                    onChange={e => setEditUser({...editUser, fecha_nacimiento: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  />
                </div>
                {editUser.role === 'medico' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#475569', marginBottom: '5px', display: 'block' }}>CMP (Colegiatura)</label>
                    <input 
                      value={editUser.cmp || ''} 
                      onChange={e => setEditUser({...editUser, cmp: e.target.value})}
                      style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc' }}
                      placeholder="Ej: 45678"
                      required
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button type="submit" style={{ flex: 1, background: '#2563eb', color: 'white', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>Guardar Cambios</button>
                <button type="button" onClick={() => setEditUser(null)} style={{ flex: 1, background: 'white', color: '#64748b', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}