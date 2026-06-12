import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
        const { data } = await supabase
          .from('empresas')
          .select('*')
          .eq('activa', true)
          .order('nombre')
        setEmpresasDisponibles(data || [])
        return data || []
      }

      if (role === 'medico') {
        const { data: asignaciones } = await supabase
          .from('medico_empresas')
          .select('empresa_id, empresas(*)')
          .eq('medico_id', userId)
          .eq('activo', true)

        const empresas = (asignaciones || [])
          .map(a => a.empresas)
          .filter(Boolean)
          .filter(e => e.activa)

        setEmpresasDisponibles(empresas)
        return empresas
      }

      // Para admin, enfermeria, rrhh, tecnico — su única empresa
      // Usamos 2 queries separadas para evitar el bug 406 del subrequest PostgREST
      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('id', userId)
        .single()

      if (!profile?.empresa_id) {
        setEmpresasDisponibles([])
        return []
      }

      const { data: empresa } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', profile.empresa_id)
        .single()

      if (empresa) {
        setEmpresasDisponibles([empresa])
        return [empresa]
      }

      setEmpresasDisponibles([])
      return []
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
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
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        
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
