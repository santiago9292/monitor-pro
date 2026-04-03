import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import logo from "../assets/logo.png"
import { auditService } from "../services/auditService"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError("Credenciales inválidas o error de conexión")
        setLoading(false)
      } else {
        // AUDITORÍA: Registro de inicio de sesión exitoso
        await auditService.record({
          action: 'LOGIN',
          module: 'Autenticación',
          description: `El usuario ${email} inició sesión en el sistema.`
        });
        navigate("/")
      }
    } catch (err) {
      setError("Error inesperado. Intente de nuevo.")
      setLoading(false)
    }
  }

  return (
    <div className="mp-login">
      <form className="mp-login-card" onSubmit={handleLogin}>
        <img src={logo} alt="Monitor Pro" className="mp-login-logo" />
        <h1>MONITOR PRO®</h1>
        <p className="mp-login-subtitle">
          Sistema de Vigilancia de Salud Ocupacional
        </p>

        {error && (
          <div className="alert-error" style={{ 
            background: '#fee2e2', 
            color: '#b91c1c', 
            padding: '10px', 
            borderRadius: '6px', 
            fontSize: '13px', 
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <input 
          type="email" 
          placeholder="Correo electrónico" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input 
          type="password" 
          placeholder="Contraseña" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>

        <span className="mp-login-link">¿Olvidaste tu contraseña?</span>
      </form>
    </div>
  )
}