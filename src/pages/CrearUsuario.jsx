import { useState } from "react"
import { supabase } from "../lib/supabase"
import { auditService } from "../services/auditService"

export default function CrearUsuario() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("Pro123456") // Contraseña predeterminada
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")

  const handleCrearUsuario = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMensaje("")
    setError("")

    // Crear el usuario con email y password
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: email.split('@')[0], // Nombre temporal
        }
      }
    })

    if (signUpError) {
      console.error("Error creando usuario:", signUpError)
      setError(signUpError.message || "No se pudo crear el usuario")
      setLoading(false)
      return
    }

    // AUDITORÍA
    try {
      await auditService.record({
        action: 'CREATE',
        module: 'Usuarios',
        description: `Creó un nuevo usuario con email: ${email}`,
        details: { email }
      });
    } catch (auditErr) {
      console.warn("No se pudo registrar auditoría:", auditErr);
    }

    setMensaje(
      `Usuario creado correctamente. Ahora puede ingresar con el correo ${email} y la contraseña: ${password}`
    )
    setEmail("")
    setLoading(false)
  }

  return (
    <div className="container">
      <div className="grid grid-center">
        <div className="card create-user-card">
          <h2 className="create-user-title">Crear nuevo usuario</h2>
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
            El usuario deberá cambiar esta contraseña al iniciar sesión por primera vez.
          </p>

          <form className="create-user-form" onSubmit={handleCrearUsuario}>
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />

            <label>Contraseña temporal</label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {error && <p className="form-error">{error}</p>}
            {mensaje && <p className="form-success" style={{ background: '#dcfce7', padding: '10px', borderRadius: '6px' }}>{mensaje}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear usuario y contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
