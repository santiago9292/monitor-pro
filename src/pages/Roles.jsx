export default function Roles() {
  return (
    <div className="mp-roles">
      
      {/* HEADER */}
      <div className="mp-roles-header">
        <div>
          <h2>Gestión de Roles</h2>
          <p>Administra los permisos y niveles de acceso del sistema</p>
        </div>
        <button className="mp-roles-primary-btn">+ Asignar Rol</button>
      </div>

      {/* RESUMEN POR ROLES */}
      <div className="mp-roles-cards">
        <div className="mp-role-card admin">
          <h4>Administrativo</h4>
          <span>2 usuarios</span>
        </div>

        <div className="mp-role-card medico">
          <h4>Médico</h4>
          <span>3 usuarios</span>
        </div>

        <div className="mp-role-card usuario">
          <h4>Usuario</h4>
          <span>5 usuarios</span>
        </div>
      </div>

      {/* TABLA */}
      <div className="mp-roles-table-container">
        <table className="mp-roles-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Último acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Juan Pérez</td>
              <td>admin@empresa.com</td>
              <td><span className="badge admin">Administrativo</span></td>
              <td><span className="status active">Activo</span></td>
              <td>24/02/2026</td>
              <td><button className="mp-roles-action">Editar</button></td>
            </tr>

            <tr>
              <td>Dra. López</td>
              <td>medico@empresa.com</td>
              <td><span className="badge medico">Médico</span></td>
              <td><span className="status active">Activo</span></td>
              <td>23/02/2026</td>
              <td><button className="mp-roles-action">Editar</button></td>
            </tr>

            <tr>
              <td>Carlos Díaz</td>
              <td>usuario@empresa.com</td>
              <td><span className="badge usuario">Usuario</span></td>
              <td><span className="status inactive">Inactivo</span></td>
              <td>15/02/2026</td>
              <td><button className="mp-roles-action">Editar</button></td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  )
}