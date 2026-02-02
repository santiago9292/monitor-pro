import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

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

        <NavLink
          to="/descansos-medicos"
          className={({ isActive }) =>
            isActive ? 'nav-link active' : 'nav-link'
          }
        >
          Descansos médicos
        </NavLink>

        {/* LOGOUT */}
        <button
  onClick={handleLogout}
  className="nav-link logout-btn"
>
  Cerrar sesión
</button>


      </div>
    </nav>
  )
}
