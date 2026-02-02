import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"


export default function CambiarPassword() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    if (!data.session) {
      // Si por alguna razón no hay sesión, obligamos a login
      window.location.href = "/login"
    }
  })
}, [])

const handleCambiarPassword = async (e) => {
  e.preventDefault()
  setLoading(true)
  setMensaje("")
  setError("")

  const { data: sessionData } = await supabase.auth.getSession()

  if (!sessionData.session) {
    setError("Sesión no válida. Vuelve a iniciar sesión.")
    setLoading(false)
    return
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password
  })

  if (updateError) {
    console.error("Error actualizando password:", updateError)
    setError("No se pudo actualizar la contraseña. Intenta nuevamente.")
    setLoading(false)
    return
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("id", user.id)
  }

  setMensaje("Contraseña creada correctamente. Ya puedes usar el sistema.")
  setPassword("")
  setLoading(false)
}


  return (
    <div className="card">
      <h2>Cambiar contraseña</h2>

      <form onSubmit={handleCambiarPassword}>
        <label>Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        {error && <p className="form-error">{error}</p>}
        {mensaje && <p className="form-success">{mensaje}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar contraseña"}
        </button>
      </form>
    </div>
  )
}
