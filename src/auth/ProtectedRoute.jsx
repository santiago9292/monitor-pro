import { Navigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { auditService } from "../services/auditService"
import { useEmpresa } from "../context/EmpresaContext"

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const location = useLocation()
  const { activeEmpresa } = useEmpresa()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)

        if (data.session?.user) {
          const { data: userProfile, error: profileError } = await supabase
            .from("profiles")
            .select("password_set, role, status")
            .eq("id", data.session.user.id)
            .single()

          if (profileError) {
            console.warn("No se pudo verificar el perfil:", profileError)
          } else {
            setProfile(userProfile)
            if (userProfile.password_set === false) {
              setMustChangePassword(true)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Rastreador de inactividad (10 minutos)
  useEffect(() => {
    let timeoutId

    const logoutDueToInactivity = async () => {
      if (session) {
        try {
          await auditService.record({
            action: "LOGOUT",
            module: "Autenticación",
            description: "El usuario cerró sesión automáticamente por inactividad (10 minutos)."
          })
          await supabase.auth.signOut()
        } catch (error) {
          console.error("Error al cerrar sesión por inactividad:", error)
        }
      }
    }

    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(logoutDueToInactivity, 600000)
    }

    if (session) {
      resetTimer()
      const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"]
      const handleActivity = () => resetTimer()
      events.forEach(event => document.addEventListener(event, handleActivity))
      return () => {
        clearTimeout(timeoutId)
        events.forEach(event => document.removeEventListener(event, handleActivity))
      }
    }
  }, [session])

  if (loading) return null

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Obligar a cambio de password
  if (mustChangePassword && location.pathname !== "/cambiar-password") {
    return <Navigate to="/cambiar-password" replace />
  }

  // Rutas exclusivas para super_admin
  const superAdminRoutes = ["/super-admin/empresas", "/super-admin/personal"]
  if (superAdminRoutes.includes(location.pathname) && profile?.role !== "super_admin") {
    return <Navigate to="/" replace />
  }

  // Rutas de admin (admin local o super_admin)
  const adminOnlyRoutes = ["/auditoria"]
  if (adminOnlyRoutes.includes(location.pathname) && !["admin", "super_admin"].includes(profile?.role)) {
    console.warn("Acceso denegado: Se requiere rol de administrador.")
    return <Navigate to="/" replace />
  }

  return children
}
