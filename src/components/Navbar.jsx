import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [role, setRole] = useState(null)

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
        if (!error && data) {
          setRole(data.role)
        }
      }
    }
    getProfile()
  }, [])

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
          <div className="navbar-brand">
            <img src={logo} className="navbar-logo" alt="Monitor Pro Logo" />
            <a 
              href="https://desarrolloinka.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="navbar-brand-text"
            >
              <div className="navbar-title">MONITOR PRO®</div>
              <div className="navbar-subtitle">salud ocupacional</div>
              <div className="navbar-subtitle-powered">powered by desarrolloinka.com</div>
            </a>
          </div>

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
            
            <NavLink to="/consentimiento" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Consentimiento
            </NavLink>

            <div className="nav-divider"></div>

            {/* OPCIONES DE ADMINISTRADOR */}
            {role === 'admin' && (
              <>
                <NavLink to="/usuarios" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Usuarios
            </NavLink>

                <NavLink to="/auditoria" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
                  Auditoría
                </NavLink>
              </>
            )}

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
