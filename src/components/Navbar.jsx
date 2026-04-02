import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-header">
          <NavLink to="/" className="navbar-brand" onClick={closeMenu}>
            <img src={logo} className="navbar-logo" alt="Monitor Pro Logo" />
            <div className="navbar-brand-text">
              <div className="navbar-title">MONITOR PRO®</div>
              <div className="navbar-subtitle">Vigilancia de Salud Ocupacional</div>
            </div>
          </NavLink>

          <button className="navbar-toggle" onClick={toggleMenu} aria-label="Toggle navigation">
            <span className={`hamburger ${isOpen ? 'is-active' : ''}`}></span>
          </button>
        </div>

        <div className={`navbar-menu ${isOpen ? 'is-active' : ''}`}>
          <div className="navbar-links">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Búsqueda y seguimiento
            </NavLink>
            
            <NavLink to="/estadisticas" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Estadísticas
            </NavLink>
            
            <NavLink to="/descansos-medicos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Descansos médicos
            </NavLink>
            
            <NavLink to="/examenes-medicos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Exámenes médicos
            </NavLink>
            
            <NavLink to="/auditoria" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Auditoría
            </NavLink>
            
            <NavLink to="/consentimiento" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Consentimiento
            </NavLink>

            <div className="nav-divider"></div>

            <NavLink to="/roles" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Roles
            </NavLink>

            <NavLink to="/usuarios/crear" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Crear Usuario
            </NavLink>

            <NavLink to="/cambiar-password" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Seguridad
            </NavLink>

            <button onClick={handleLogout} className="nav-link logout-btn">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
