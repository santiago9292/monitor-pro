import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import logo from "../assets/logo.png"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate("/", { replace: true })
      }
    })
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      setError("Usuario o contraseña incorrectos")
      setLoading(false)
      return
    }

    navigate("/", { replace: true })
    setLoading(false)
  }

  return (
    <div className="container">
      <div className="grid grid-center">
        <div className="card">
          <img
            src={logo}
            alt="Monitor Pro"
            style={{
              display: "block",
              margin: "0 auto 12px",
              maxWidth: 120
            }}
          />

          <h2 style={{ textAlign: "center", marginBottom: 4 }}>
            Bienvenido a MONITOR PRO
          </h2>

          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: "#64748b",
              marginBottom: 20
            }}
          >
            Salud Ocupacional · Solo Personal autorizado
          </p>

          <form onSubmit={handleLogin}>
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="form-error">{error}</p>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
