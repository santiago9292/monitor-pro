import { Navigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [mustEnrollMFA, setMustEnrollMFA] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)

        if (data.session?.user) {
          const { data: userProfile, error: profileError } = await supabase
            .from("profiles")
            .select("password_set, role")
            .eq("id", data.session.user.id)
            .single()

          if (profileError) {
            console.warn("No se pudo verificar el perfil:", profileError)
          } else {
            setProfile(userProfile)
            
            // Verificar si debe cambiar password
            if (userProfile.password_set === false) {
              setMustChangePassword(true)
            }

            // Verificar si debe enrolar MFA (admin y medico)
            if (['admin', 'medico'].includes(userProfile.role)) {
              const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors()
              if (!mfaError && factors.all.filter(f => f.status === 'verified').length === 0) {
                setMustEnrollMFA(true)
              }
            }
          }
        }
      } catch (err) {
        console.error("Error inesperado en checkSession", err)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Obligatoriedad de MFA (para admin y medico)
  if (mustEnrollMFA && location.pathname !== "/seguridad") {
    return <Navigate to="/seguridad" replace />
  }

  // Obligar a cambio de password
  if (mustChangePassword && location.pathname !== "/cambiar-password") {
    return <Navigate to="/cambiar-password" replace />
  }

  // RESTRICCIÓN DE ROLES: Solo admin puede entrar a /roles y /auditoria
  const adminOnlyRoutes = ["/roles", "/auditoria"]
  if (adminOnlyRoutes.includes(location.pathname) && profile?.role !== "admin") {
    console.warn("Acceso denegado: Se requiere rol de administrador.")
    return <Navigate to="/" replace />
  }

  return children
}
