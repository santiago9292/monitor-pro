import { Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)

      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("password_set")
          .eq("id", data.session.user.id)
          .single()

        if (profile && profile.password_set === false) {
          setMustChangePassword(true)
        }
      }

      setLoading(false)
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

  if (mustChangePassword) {
    return <Navigate to="/cambiar-password" replace />
  }

  return children
}
