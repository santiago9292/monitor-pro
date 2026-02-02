import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function CambiarPassword() {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")

  const handleCambiarPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMensaje("")
    setError("")

    const { error } = await supabase.auth.updateUser({
      password
    })

    if (error) {
      setError("No se pudo actualizar la contraseña")
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
