import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { auditService } from '../services/auditService';

export default function Auditoria() {
  const [searchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [filterUser, setFilterUser] = useState('Todos');
  const [filterDni, setFilterDni] = useState('');

  useEffect(() => {
    const userParam = searchParams.get('user');
    if (userParam) {
      setFilterUser(userParam);
      loadInitialData(userParam);
    } else {
      setFilterUser('Todos');
      loadInitialData('Todos');
    }
  }, [searchParams]);

  async function loadInitialData(initialUser = 'Todos') {
    setLoading(true);
    try {
      const filter = initialUser && initialUser !== 'Todos' ? { user: initialUser } : {};
      const [dataLogs, dataUsers] = await Promise.all([
        auditService.getLogs(filter),
        auditService.getUniqueUsers()
      ]);
      setLogs(dataLogs);
      
      const finalUsers = [...dataUsers];
      if (initialUser && initialUser !== 'Todos' && !finalUsers.includes(initialUser)) {
        finalUsers.unshift(initialUser);
      }
      setUsers(finalUsers);
    } catch (error) {
      console.error('Error loading audit data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFilter = async () => {
    setLoading(true);
    try {
      const filteredLogs = await auditService.getLogs({
        since: filterDesde,
        until: filterHasta,
        user: filterUser,
        dni: filterDni
      });
      setLogs(filteredLogs);
    } catch (error) {
      console.error('Error filtering logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionClass = (action) => {
    switch (action) {
      case 'CREATE': return 'create';
      case 'UPDATE': return 'edit';
      case 'DELETE': return 'delete';
      case 'VIEW': return 'view';
      case 'LOGIN': return 'login';
      default: return '';
    }
  };

  return (
    <div className="mp-audit">
      <div className="mp-audit-header">
        <h2>Auditoría del Sistema</h2>
        <p className="mp-audit-subtitle">
          Registro de modificaciones y actividades realizadas por los usuarios
        </p>
      </div>

      <div className="mp-audit-filters">
        <div className="mp-audit-filter-group">
          <label>Desde</label>
          <input
            type="date"
            value={filterDesde}
            onChange={(e) => setFilterDesde(e.target.value)}
          />
        </div>

        <div className="mp-audit-filter-group">
          <label>Hasta</label>
          <input
            type="date"
            value={filterHasta}
            onChange={(e) => setFilterHasta(e.target.value)}
          />
        </div>

        <div className="mp-audit-filter-group">
          <label>Usuario</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
          >
            <option value="Todos">Todos</option>
            {users.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <div className="mp-audit-filter-group">
          <label>DNI del Paciente</label>
          <input 
            type="text" 
            placeholder="Buscar por DNI..."
            value={filterDni}
            onChange={(e) => setFilterDni(e.target.value)}
            maxLength={8}
          />
        </div>

        <button
          className="mp-audit-filter-btn"
          onClick={handleFilter}
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Filtrar'}
        </button>
      </div>

      <div className="mp-audit-table-container">
        {loading && logs.length === 0 ? (
          <div className="mp-audit-loading">Cargando registros...</div>
        ) : (
          <table className="mp-audit-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Descripción</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>
                    No se encontraron registros de auditoría.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatDateTime(log.created_at)}</td>
                    <td>
                      {log.user_name && (
                        <span className="audit-user-name">{log.user_name}</span>
                      )}
                      <span className="audit-user-email">{log.user_email}</span>
                    </td>
                    <td>
                      <span className={`mp-audit-action ${getActionClass(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.module}</td>
                    <td>{log.description}</td>
                    <td>{log.ip_address}</td>
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