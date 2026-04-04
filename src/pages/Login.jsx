import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import logo from "../assets/logo.png"
import { auditService } from "../services/auditService"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mfaCode, setMfaCode] = useState("")
  const [showMfa, setShowMfa] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tempData, setTempData] = useState(null)
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
        return
      }

      // Verificar si el usuario tiene MFA habilitado
      const { data: { all: factors } } = await supabase.auth.mfa.listFactors()
      const mfaFactor = factors.find(f => f.status === 'verified')

      if (mfaFactor) {
        setTempData({ factorId: mfaFactor.id })
        setShowMfa(true)
        setLoading(false)
      } else {
        await completeLogin(email)
      }
    } catch (err) {
      setError("Error inesperado: " + err.message)
      setLoading(false)
    }
  }

  const handleMfaVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: tempData.factorId
      })
      if (challengeError) throw challengeError

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: tempData.factorId,
        challengeId: challengeData.id,
        code: mfaCode
      })

      if (verifyError) throw verifyError

      await completeLogin(email)
    } catch (err) {
      setError("Código de verificación incorrecto")
      setLoading(false)
    }
  }

  const completeLogin = async (userEmail) => {
    await auditService.record({
      action: 'LOGIN',
      module: 'Autenticación',
      description: `El usuario ${userEmail} inició sesión en el sistema.`
    })
    navigate("/")
  }

  return (
    <div className="mp-login">
      {!showMfa ? (
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
      ) : (
        <form className="mp-login-card" onSubmit={handleMfaVerify}>
          <img src={logo} alt="Monitor Pro" className="mp-login-logo" />
          <h2 style={{ marginBottom: '10px' }}>Verificación MFA</h2>
          <p className="mp-login-subtitle">
            Ingrese el código de su aplicación autenticadora
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
            type="text" 
            placeholder="000000"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
            style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '4px' }}
            required
            autoFocus
          />

          <button type="submit" disabled={loading}>
            {loading ? "Verificando..." : "Confirmar Código"}
          </button>
          
          <button 
            type="button" 
            onClick={() => setShowMfa(false)} 
            style={{ 
              marginTop: '10px', 
              background: 'none', 
              border: 'none', 
              color: '#64748b', 
              fontSize: '12px', 
              cursor: 'pointer' 
            }}
          >
            Volver
          </button>
        </form>
      )}
    </div>
  )
}