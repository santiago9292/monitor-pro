import { NavLink } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-left">
  <img src={logo} className="navbar-logo" />

        <div>
          <div>
    <div className="navbar-title">MONITOR PRO®</div>
    <div className="navbar-subtitle">
      Sistema de Vigilancia de Salud Ocupacional
    </div>
    <a
      href="https://desarrolloinka.com"
      target="_blank"
      rel="noopener noreferrer"
      className="powered-by"
    >
      powered by desarrolloinka.com
    </a>
  </div>


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

        {/* 👇 NUEVO LINK */}
        <NavLink
          to="/descansos-medicos"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Descansos médicos
        </NavLink>
      </div>
    </nav>
  )
}
