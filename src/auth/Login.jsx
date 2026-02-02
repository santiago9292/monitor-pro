import { useState } from "react"
import { supabase } from "../lib/supabase"
import { useNavigate } from "react-router-dom"
import logo from "../assets/logo.png"


export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

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
              <p
                style={{
                  color: "#b91c1c",
                  fontSize: 13,
                  marginBottom: 10,
                  textAlign: "center"
                }}
              >
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: 12,
                color: "#94a3b8",
                marginBottom: 24
              }}
            >
              <strong style={{ color: "#334155" }}>Monitor Pro</strong> · Powered by{" "}
              <a
                href="https://desarrolloinca.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#2563eb",
                  textDecoration: "none",
                  fontWeight: 500
                }}
              >
                Desarrolloinca.com
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
