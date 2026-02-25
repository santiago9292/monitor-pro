export default function Auditoria() {
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
          <input type="date" />
        </div>

        <div className="mp-audit-filter-group">
          <label>Hasta</label>
          <input type="date" />
        </div>

        <div className="mp-audit-filter-group">
          <label>Usuario</label>
          <select>
            <option>Todos</option>
            <option>admin@empresa.com</option>
            <option>medico@empresa.com</option>
          </select>
        </div>

        <button className="mp-audit-filter-btn">
          Filtrar
        </button>
      </div>

      <div className="mp-audit-table-container">
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
            <tr>
              <td>24/02/2026 10:35</td>
              <td>admin@empresa.com</td>
              <td className="mp-audit-action edit">EDITÓ</td>
              <td>Trabajador</td>
              <td>Modificó el DNI del trabajador Juan Pérez</td>
              <td>192.168.1.10</td>
            </tr>

            <tr>
              <td>23/02/2026 16:20</td>
              <td>medico@empresa.com</td>
              <td className="mp-audit-action create">CREÓ</td>
              <td>Descanso Médico</td>
              <td>Registró nuevo descanso médico</td>
              <td>192.168.1.15</td>
            </tr>

            <tr>
              <td>22/02/2026 09:12</td>
              <td>admin@empresa.com</td>
              <td className="mp-audit-action delete">ELIMINÓ</td>
              <td>Trabajador</td>
              <td>Eliminó registro duplicado</td>
              <td>192.168.1.10</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}