import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import logo from '../assets/logo.png'
import { supabase } from '../lib/supabase'
import { auditService } from '../services/auditService'
import { useEmpresa } from '../context/EmpresaContext'

export default function Navbar() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [role, setRole] = useState(null)
  const [showEmpresaMenu, setShowEmpresaMenu] = useState(false)

  const { activeEmpresa, setActiveEmpresa, empresasDisponibles, clearEmpresa } = useEmpresa()

  useEffect(() => {
    async function getProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, empresa_id, email')
          .eq('id', session.user.id)
          .single()

        if (!profileError && profileData) {
          setRole(profileData.role)
        }
      }
    }
    getProfile()
  }, [])

  const handleLogout = async () => {
    await auditService.record({
      action: 'LOGOUT',
      module: 'Autenticación',
      description: 'El usuario cerró sesión manualmente (click en Cerrar sesión).'
    })
    clearEmpresa()
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  const isSuperAdmin = role === 'super_admin'
  const isAdmin = role === 'admin'
  const canSwitchEmpresa = (isSuperAdmin || role === 'medico') && empresasDisponibles.length > 1

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

          {/* Badge de empresa activa */}
          {activeEmpresa ? (
            <div
              className="navbar-empresa-badge"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(37,99,235,0.1)',
                border: '1px solid rgba(37,99,235,0.25)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#1d4ed8',
                cursor: canSwitchEmpresa ? 'pointer' : 'default',
                position: 'relative',
                flexShrink: 0
              }}
              onClick={() => canSwitchEmpresa && setShowEmpresaMenu(prev => !prev)}
              title={canSwitchEmpresa ? 'Click para cambiar empresa' : activeEmpresa.nombre}
            >
              🏢 {activeEmpresa.codigo}
              {canSwitchEmpresa && <span style={{ fontSize: '10px' }}>▼</span>}

              {/* Dropdown selector de empresa */}
              {showEmpresaMenu && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                  minWidth: '220px',
                  zIndex: 9999,
                  overflow: 'hidden'
                }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Cambiar empresa activa
                  </div>
                  {empresasDisponibles.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setActiveEmpresa(emp)
                        setShowEmpresaMenu(false)
                        window.location.reload() // refrescar datos de la nueva empresa
                      }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        background: activeEmpresa?.id === emp.id ? '#eff6ff' : 'white',
                        border: 'none',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        color: activeEmpresa?.id === emp.id ? '#1d4ed8' : '#1e293b',
                        fontWeight: activeEmpresa?.id === emp.id ? '700' : '400',
                        fontSize: '13px'
                      }}
                    >
                      <span>{emp.nombre}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{emp.codigo}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            (isSuperAdmin || role === 'medico') && empresasDisponibles.length > 0 && (
              <div
                className="navbar-empresa-badge empty"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  borderRadius: '20px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#dc2626',
                  cursor: 'pointer',
                  position: 'relative',
                  flexShrink: 0
                }}
                onClick={() => setShowEmpresaMenu(prev => !prev)}
                title="Seleccionar empresa activa"
              >
                🏢 Sin Empresa ⚠️
                <span style={{ fontSize: '10px' }}>▼</span>

                {/* Dropdown selector de empresa */}
                {showEmpresaMenu && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                    minWidth: '220px',
                    zIndex: 9999,
                    overflow: 'hidden'
                  }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Seleccionar empresa activa
                    </div>
                    {empresasDisponibles.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setActiveEmpresa(emp)
                          setShowEmpresaMenu(false)
                          window.location.reload()
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          width: '100%',
                          textAlign: 'left',
                          padding: '10px 14px',
                          background: 'white',
                          border: 'none',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          color: '#1e293b',
                          fontWeight: '400',
                          fontSize: '13px'
                        }}
                      >
                        <span>{emp.nombre}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '400' }}>{emp.codigo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          <button className="navbar-toggle" onClick={toggleMenu} aria-label="Toggle navigation">
            <span className={`hamburger ${isOpen ? 'is-active' : ''}`}></span>
          </button>
        </div>

        <div className={`navbar-menu ${isOpen ? 'is-active' : ''}`}>
          <div className="navbar-links">
            {/* ── MENÚ ADMINISTRACIÓN ── */}
            {(isSuperAdmin || isAdmin) && (
              <div className="nav-dropdown">
                <button className="nav-dropdown-trigger">
                  ⚙️ Administración <span className="arrow-down">▼</span>
                </button>
                <div className="nav-dropdown-menu">
                  {isSuperAdmin && (
                    <>
                      <NavLink to="/super-admin/empresas" className={({ isActive }) => isActive ? 'nav-dropdown-item active' : 'nav-dropdown-item'} onClick={closeMenu}>
                        🏢 Empresas
                      </NavLink>
                      <NavLink to="/super-admin/personal" className={({ isActive }) => isActive ? 'nav-dropdown-item active' : 'nav-dropdown-item'} onClick={closeMenu}>
                        👥 Personal
                      </NavLink>
                    </>
                  )}
                  <NavLink to="/usuarios" className={({ isActive }) => isActive ? 'nav-dropdown-item active' : 'nav-dropdown-item'} onClick={closeMenu}>
                    👥 Usuarios
                  </NavLink>
                  <NavLink to="/auditoria" className={({ isActive }) => isActive ? 'nav-dropdown-item active' : 'nav-dropdown-item'} onClick={closeMenu}>
                    📋 Auditoría
                  </NavLink>
                </div>
              </div>
            )}

            {/* ── LINKS GENERALES ── */}
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Atenciones
            </NavLink>
            <NavLink to="/consentimiento" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Consentimiento
            </NavLink>
            <NavLink to="/examenes-medicos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              EMOS
            </NavLink>
            <NavLink to="/descansos-medicos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Descansos médicos
            </NavLink>
            <NavLink to="/estadisticas" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={closeMenu}>
              Estadísticas
            </NavLink>

            {/* ── GRUPO MI CUENTA ── */}
            <div className="nav-dropdown account-dropdown">
              <button className="nav-dropdown-trigger">
                👤 Mi Cuenta <span className="arrow-down">▼</span>
              </button>
              <div className="nav-dropdown-menu right-aligned">
                <NavLink to="/cambiar-password" className={({ isActive }) => isActive ? 'nav-dropdown-item active' : 'nav-dropdown-item'} onClick={closeMenu}>
                  🔑 Contraseña
                </NavLink>
                <NavLink to="/seguridad" className={({ isActive }) => isActive ? 'nav-dropdown-item active' : 'nav-dropdown-item'} onClick={closeMenu}>
                  🛡️ Seguridad
                </NavLink>
                <div className="dropdown-divider"></div>
                <button onClick={handleLogout} className="nav-dropdown-item logout-btn">
                  🚪 Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
