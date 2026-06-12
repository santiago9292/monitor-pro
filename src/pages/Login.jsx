import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { restQuery } from "../lib/supabaseRest"
import logo from "../assets/logo.png"
import { auditService } from "../services/auditService"
import { useEmpresa } from "../context/EmpresaContext"

export default function Login() {
  const [codigoEmpresa, setCodigoEmpresa] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mfaCode, setMfaCode] = useState("")

  const [step, setStep] = useState("login") // "login" | "mfa" | "selectEmpresa"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tempData, setTempData] = useState(null)
  const [empresasParaSeleccionar, setEmpresasParaSeleccionar] = useState([])

  const navigate = useNavigate()
  const { setActiveEmpresa, loadEmpresasForUser } = useEmpresa()

  // ── PASO 1: Login principal ──────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1a. Para super_admin, el código de empresa no es obligatorio
      const codigoBuscado = codigoEmpresa.trim().toUpperCase()

      let empresaData = null
      if (codigoBuscado) {
        const empArr = await restQuery(`empresas?select=id,codigo,nombre,logo_url,activa&codigo=eq.${codigoBuscado}`)
        const emp = empArr[0] || null

        if (!emp) {
          setError("Código de empresa no válido o empresa no encontrada.")
          setLoading(false)
          return
        }
        if (!emp.activa) {
          setError("La empresa está desactivada. Contacte al administrador.")
          setLoading(false)
          return
        }
        empresaData = emp
      }

      // 1b. Autenticar con Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError("Credenciales inválidas o error de conexión.")
        setLoading(false)
        return
      }

      const userId = data.user.id

      // 1c. Obtener perfil y rol
      const profileArr = await restQuery(`profiles?select=role,status,empresa_id&id=eq.${userId}`)
      const profile = profileArr[0] || null

      if (!profile) {
        setError("No se encontró un perfil para este usuario.")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (profile.status === "inactivo") {
        setError("Su cuenta está desactivada. Contacte al administrador.")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // 1d. Guardar datos temporales para continuar
      setTempData({ userId, role: profile.role, empresaData })

      // 1e. Verificar si tiene MFA habilitado
      const { data: { all: factors } } = await supabase.auth.mfa.listFactors()
      const mfaFactor = factors.find(f => f.status === "verified")

      if (mfaFactor) {
        setTempData(prev => ({ ...prev, factorId: mfaFactor.id }))
        setStep("mfa")
        setLoading(false)
        return
      }

      // 1f. Sin MFA → continuar al proceso de empresa
      await procesarEmpresaYEntrar(userId, profile.role, empresaData)
    } catch (err) {
      setError("Error inesperado: " + err.message)
      setLoading(false)
    }
  }

  // ── PASO 2 (opcional): Verificar MFA ────────────────────────────
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

      await procesarEmpresaYEntrar(tempData.userId, tempData.role, tempData.empresaData)
    } catch {
      setError("Código de verificación incorrecto.")
      setLoading(false)
    }
  }

  // ── Lógica central: validar acceso a empresa y navegar ──────────
  const procesarEmpresaYEntrar = async (userId, role, empresaData) => {
    try {
      // super_admin: no requiere código de empresa. Carga todas las empresas.
      if (role === "super_admin") {
        const empresas = await loadEmpresasForUser(userId, role)
        let empToActive = null
        if (empresaData) {
          empToActive = empresaData
        } else if (empresas.length === 1) {
          empToActive = empresas[0]
        }

        if (empToActive) {
          const { error: activeErr } = await supabase.rpc('set_active_empresa', { p_empresa_id: empToActive.id })
          if (activeErr) console.warn("Error setting active empresa for super_admin:", activeErr)
          setActiveEmpresa(empToActive)
        }
        await registrarLoginAudit(email)
        navigate("/")
        return
      }

      // Para todos los roles que no sean super_admin: verificar que el código corresponda a una empresa activa
      if (!empresaData) {
        setError("Debe ingresar el código de empresa.")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      const asignacionArr = await restQuery(`medico_empresas?select=id&medico_id=eq.${userId}&empresa_id=eq.${empresaData.id}&activo=eq.true`)
      const asignacion = asignacionArr[0] || null

      if (!asignacion) {
        setError("No tiene acceso asignado a la empresa " + empresaData.nombre + ".")
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // Cargar todas las empresas del usuario para posible switch posterior
      const todasEmpresas = await loadEmpresasForUser(userId, role)

      // Guardar la empresa de la sesión activa en el perfil del usuario para RLS
      const { error: activeErr } = await supabase.rpc('set_active_empresa', { p_empresa_id: empresaData.id })
      if (activeErr) {
        console.error('Error al establecer empresa activa en base de datos:', activeErr)
        throw new Error('Error al inicializar sesión de empresa: ' + activeErr.message)
      }

      setActiveEmpresa(empresaData)
      await registrarLoginAudit(email)
      navigate("/")
    } catch (err) {
      setError("Error al verificar acceso: " + err.message)
      setLoading(false)
    }
  }

  const registrarLoginAudit = (userEmail) => {
    // Fire-and-forget: no bloqueamos la navegación por el registro de auditoría
    auditService.record({
      action: "LOGIN",
      module: "Autenticación",
      description: `El usuario ${userEmail} inició sesión en el sistema.`
    }).catch(err => console.warn("Audit login error:", err));
  }

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div className="mp-login">
      {step === "login" && (
        <form className="mp-login-card" onSubmit={handleLogin}>
          <img src={logo} alt="Monitor Pro" className="mp-login-logo" />
          <h1>MONITOR PRO®</h1>
          <p className="mp-login-subtitle" style={{ whiteSpace: "nowrap", fontSize: "14px" }}>
            Sistema de Vigilancia de Salud Ocupacional
          </p>

          {error && (
            <div className="alert-error" style={{
              background: "#fee2e2", color: "#b91c1c", padding: "10px",
              borderRadius: "6px", fontSize: "13px", marginBottom: "10px", textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <div style={{ position: "relative", marginBottom: "15px" }}>
            <span style={{
              position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
              fontSize: "16px", pointerEvents: "none"
            }}>🏢</span>
            <input
              type="text"
              id="codigo_empresa"
              placeholder="Código de empresa (ej: MINSUR)"
              value={codigoEmpresa}
              onChange={(e) => setCodigoEmpresa(e.target.value.toUpperCase())}
              style={{ paddingLeft: "38px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0px" }}
              autoFocus
            />
          </div>

          <input
            type="email"
            id="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            id="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Verificando..." : "Iniciar Sesión"}
          </button>

          <p style={{ marginTop: "16px", fontSize: "12px", color: "#64748b", textAlign: "center", lineHeight: "1.4" }}>
            Al usar el sistema MONITOR PRO®, acepta los <b>Términos y Condiciones</b>.
          </p>
        </form>
      )}

      {step === "mfa" && (
        <form className="mp-login-card" onSubmit={handleMfaVerify}>
          <img src={logo} alt="Monitor Pro" className="mp-login-logo" />
          <h2 style={{ marginBottom: "10px" }}>Verificación MFA</h2>
          <p className="mp-login-subtitle">
            Ingrese el código de su aplicación autenticadora
          </p>

          {error && (
            <div className="alert-error" style={{
              background: "#fee2e2", color: "#b91c1c", padding: "10px",
              borderRadius: "6px", fontSize: "13px", marginBottom: "10px", textAlign: "center"
            }}>
              {error}
            </div>
          )}

          <input
            type="text"
            id="mfa_code"
            placeholder="000000"
            maxLength={6}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
            style={{ textAlign: "center", fontSize: "24px", letterSpacing: "4px" }}
            required
            autoFocus
          />

          <button type="submit" disabled={loading}>
            {loading ? "Verificando..." : "Confirmar Código"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("login"); setError(null) }}
            style={{ marginTop: "10px", background: "none", border: "none", color: "#64748b", fontSize: "12px", cursor: "pointer" }}
          >
            Volver
          </button>
        </form>
      )}
    </div>
  )
}