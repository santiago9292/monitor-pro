import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { auditService } from '../services/auditService';

const AVAILABLE_ROLES = ['admin', 'medico', 'enfermeria', 'rrhh'];

export default function Roles() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
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
    
    const confirm = window.confirm(`¿Estás seguro de cambiar el rol de ${userEmail} de "${oldRole}" a "${newRole}"?`);
    if (!confirm) return;

    try {
      const success = await userService.updateRole(userId, newRole);
      if (success) {
        // Auditoría
        await auditService.record({
          action: 'UPDATE',
          module: 'Roles',
          description: `Cambió el rol de ${userEmail} de "${oldRole}" a "${newRole}"`,
          details: { userId, oldRole, newRole }
        });
        
        loadProfiles(); // Recargar
      }
    } catch (error) {
      alert('Error actualizando rol');
    }
  };

  const handleStatusChange = async (userId, userEmail, oldStatus) => {
    const newStatus = oldStatus === 'activo' ? 'inactivo' : 'activo';
    const confirm = window.confirm(`¿Estás seguro de marcar a ${userEmail} como "${newStatus}"?`);
    if (!confirm) return;

    try {
      const success = await userService.updateStatus(userId, newStatus);
      if (success) {
        // Auditoría
        await auditService.record({
          action: 'UPDATE',
          module: 'Roles',
          description: `Cambió el estado de ${userEmail} a "${newStatus}"`,
          details: { userId, newStatus }
        });
        
        loadProfiles();
      }
    } catch (error) {
      alert('Error actualizando estado');
    }
  };

  return (
    <div className="mp-roles">
      
      {/* HEADER */}
      <div className="mp-roles-header">
        <div>
          <h2>Gestión de Roles</h2>
          <p>Administra los permisos y niveles de acceso del sistema</p>
        </div>
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
          <h4>Enfermería</h4>
          <span>{stats.enfermeria} usuarios</span>
        </div>

        <div className="mp-role-card rrhh" style={{ background: '#f5f3ff' }}>
          <h4>RRHH</h4>
          <span>{stats.rrhh} usuarios</span>
        </div>
      </div>

      {/* TABLA */}
      <div className="mp-roles-table-container">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Cargando usuarios...</div>
        ) : (
          <table className="mp-roles-table">
            <thead>
              <tr>
                <th>Usuario / Email</th>
                <th>Rol Actual</th>
                <th>Cambiar Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                    No hay perfiles registrados.
                  </td>
                </tr>
              ) : (
                profiles.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{user.full_name || 'Sin nombre'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{user.id} (UUID)</div>
                    </td>
                    <td>
                      <span className={`badge ${user.role}`}>
                        {user.role?.toUpperCase() || 'RRHH'}
                      </span>
                    </td>
                    <td>
                      <select 
                        value={user.role || 'rrhh'}
                        onChange={(e) => handleRoleChange(user.id, user.full_name || user.id, user.role, e.target.value)}
                        style={{ margin: 0, padding: '4px' }}
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
                    <td>
                      <button 
                        className="mp-roles-action"
                        onClick={() => handleStatusChange(user.id, user.full_name || user.id, user.status || 'activo')}
                      >
                        {user.status === 'activo' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}