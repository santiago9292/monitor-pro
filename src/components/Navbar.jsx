import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [role, setRole] = useState(null)
  const [mfaRequired, setMfaRequired] = useState(false)

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // 1. Obtener Rol
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, password_set')
          .eq('id', session.user.id)
          .single()
        
        if (!profileError && profileData) {
          setRole(profileData.role)
          
          // 2. Verificar MFA si es admin o medico - DESACTIVADO TEMPORALMENTE
          if (false && ['admin', 'medico'].includes(profileData.role)) {
            const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors()
            const isVerified = factors?.all?.some(f => f.status === 'verified')
            
            // Si es obligatorio y no está verificado, marcamos como requerido
            if (!mfaError && !isVerified) {
              setMfaRequired(true)
            }
          }
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
            {!mfaRequired ? (
              <>
                <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
                  Seguimiento
                </NavLink>
                
                <NavLink to="/estadisticas" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
                  Estadísticas
                </NavLink>
                
                <NavLink to="/descansos-medicos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
                  Descansos
                </NavLink>
                
                <NavLink to="/examenes-medicos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
                  Exámenes
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
                  Contraseña
                </NavLink>

                <NavLink to="/seguridad" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
                  Seguridad
                </NavLink>
              </>
            ) : (
              <div style={{ padding: '10px', color: '#64748b', fontSize: '13px', fontStyle: 'italic' }}>
                Acceso restringido: Configuración de seguridad pendiente
              </div>
            )}

            <button onClick={handleLogout} className="nav-link logout-btn">
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
