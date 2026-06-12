import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { restQuery } from '../lib/supabaseRest'

const EmpresaContext = createContext(null)

export function EmpresaProvider({ children }) {
  const [activeEmpresa, setActiveEmpresaState] = useState(() => {
    // Recuperar empresa activa de sessionStorage al recargar
    try {
      const saved = sessionStorage.getItem('mp_active_empresa')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [empresasDisponibles, setEmpresasDisponibles] = useState([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(false)

  const setActiveEmpresa = (empresa) => {
    setActiveEmpresaState(empresa)
    if (empresa) {
      sessionStorage.setItem('mp_active_empresa', JSON.stringify(empresa))
    } else {
      sessionStorage.removeItem('mp_active_empresa')
    }
  }

  const clearEmpresa = () => {
    setActiveEmpresaState(null)
    setEmpresasDisponibles([])
    sessionStorage.removeItem('mp_active_empresa')
  }

  /**
   * Carga las empresas disponibles para el usuario autenticado.
   * - super_admin: todas las empresas activas
   * - médico: sus empresas asignadas en medico_empresas
   * - otros: solo su empresa (profiles.empresa_id)
   */
  const loadEmpresasForUser = async (userId, role) => {
    setLoadingEmpresas(true)
    try {
      if (role === 'super_admin') {
        const data = await restQuery('empresas?select=*&activa=eq.true&order=nombre.asc')
        setEmpresasDisponibles(data || [])
        return data || []
      }

      // Para todos los demás roles (medico, admin, enfermeria, rrhh, tecnico)
      // Primero intentamos consultar la tabla N:M medico_empresas
      const asignaciones = await restQuery(`medico_empresas?select=empresa_id,empresas(*)&medico_id=eq.${userId}&activo=eq.true`)

      let empresas = (asignaciones || [])
        .map(a => a.empresas)
        .filter(Boolean)
        .filter(e => e.activa)

      // Fallback para compatibilidad heredada: si no hay asignaciones N:M, consultar profiles.empresa_id
      if (empresas.length === 0) {
        const profileArr = await restQuery(`profiles?select=empresa_id&id=eq.${userId}`)
        const profile = profileArr[0] || null

        if (profile?.empresa_id) {
          const empresaArr = await restQuery(`empresas?select=*&id=eq.${profile.empresa_id}`)
          const empresa = empresaArr[0] || null
          if (empresa && empresa.activa) {
            empresas = [empresa]
          }
        }
      }

      setEmpresasDisponibles(empresas)
      return empresas
    } catch (err) {
      console.error('Error loading empresas:', err)
      setEmpresasDisponibles([])
      return []
    } finally {
      setLoadingEmpresas(false)
    }
  }

  // Limpiar al cerrar sesión
  useEffect(() => {
    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const profileArr = await restQuery(`profiles?select=role&id=eq.${session.user.id}`)
        const profile = profileArr[0] || null
        
        if (profile) {
          await loadEmpresasForUser(session.user.id, profile.role)
        }
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // TOKEN_REFRESHED se dispara en descargas de Storage — ignorar para no re-cargar empresas
      if (event === 'SIGNED_OUT') {
        clearEmpresa()
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Solo re-cargar en SIGNED_IN real (primer login), no en refresco de token
        const profileArr = await restQuery(`profiles?select=role&id=eq.${session.user.id}`)
        const profile = profileArr[0] || null
        
        if (profile) {
          await loadEmpresasForUser(session.user.id, profile.role)
        }
      }
      // INITIAL_SESSION, TOKEN_REFRESHED, USER_UPDATED → no hacer nada adicional
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <EmpresaContext.Provider value={{
      activeEmpresa,
      setActiveEmpresa,
      clearEmpresa,
      empresaId: activeEmpresa?.id || null,
      empresasDisponibles,
      loadingEmpresas,
      loadEmpresasForUser,
    }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext)
  if (!ctx) throw new Error('useEmpresa must be used within EmpresaProvider')
  return ctx
}
