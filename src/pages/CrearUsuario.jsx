import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function CrearUsuario() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")

  const handleCrearUsuario = async (e) => {
  e.preventDefault()
  setLoading(true)
  setMensaje("")
  setError("")

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "http://localhost:5173/login"
    }
  })

  if (error) {
    console.error("Error invitando usuario:", error)
    setError("No se pudo enviar la invitación al usuario")
    setLoading(false)
    return
  }

  setMensaje(
    "Invitación enviada. El usuario recibirá un correo para crear su contraseña."
  )
  setEmail("")
  setLoading(false)
}


  return (
  <div className="container">
    <div className="grid grid-center">
      <div className="card create-user-card">
        <h2 className="create-user-title">Crear usuario</h2>

        <form className="create-user-form" onSubmit={handleCrearUsuario}>
          <label>Correo electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          {error && <p className="form-error">{error}</p>}
          {mensaje && <p className="form-success">{mensaje}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      </div>
    </div>
  </div>
)

}
