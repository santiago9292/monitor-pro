import { Navigate, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        setSession(data.session)

        if (data.session?.user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("password_set")
            .eq("id", data.session.user.id)
            .single()

          if (profileError) {
            console.warn("No se pudo verificar el perfil (posiblemente la tabla no exista):", profileError)
            // No forzamos el cambio de contraseña si la tabla no existe o hay error
          } else if (profile && profile.password_set === false) {
            setMustChangePassword(true)
          } else if (!profile) {
            setMustChangePassword(true)
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

  if (mustChangePassword && location.pathname !== "/cambiar-password") {
    return <Navigate to="/cambiar-password" replace />
  }

  return children
}
