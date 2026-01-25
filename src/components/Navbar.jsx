import { NavLink } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <div>
          <h1 className="navbar-title">MONITOR PRO®</h1>
          <p className="navbar-subtitle">
            Sistema de Vigilancia de Salud Ocupacional
          </p>
        </div>
      </div>

      <div className="navbar-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Búsqueda y seguimiento
        </NavLink>

        <NavLink
          to="/estadisticas"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Estadísticas y reportes
        </NavLink>
      </div>
    </nav>
  )
}
