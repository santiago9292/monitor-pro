import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { auditService } from "../services/auditService"


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
    
    // Traducir mensajes comunes
    let errorMsg = updateError.message;
    if (errorMsg.includes("New password should be different")) {
      errorMsg = "La nueva contraseña debe ser diferente a la actual."
    } else if (errorMsg.includes("Password should be at least")) {
      errorMsg = "La contraseña es muy corta (mínimo 6 caracteres)."
    }

    setError(errorMsg)
    setLoading(false)
    return
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ password_set: true })
      .eq("id", user.id)

    if (profileError) {
      console.warn("No se pudo actualizar la tabla profiles (puede que no exista el esquema):", profileError)
      // Continuamos porque la contraseña ya se actualizó en el servidor de auth
    }
  }

  // 4️⃣ REGISTRO DE AUDITORÍA
  try {
    await auditService.record({
      action: 'UPDATE',
      module: 'Seguridad',
      description: `El usuario actualizó su contraseña con éxito.`,
      details: { user_id: user?.id }
    });
  } catch (auditErr) {
    console.error("Error al registrar auditoría de cambio de contraseña:", auditErr)
  }

  setMensaje("Contraseña actualizada correctamente. Redirigiendo...")
  setPassword("")
  setLoading(false)

  // Redirigir al usuario al inicio después de un breve momento
  setTimeout(() => {
    window.location.href = "/"
  }, 1500)
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
