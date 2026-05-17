import { useState, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { QRCodeSVG } from "qrcode.react"
import { auditService } from "../services/auditService"

export default function Seguridad() {
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [enrollData, setEnrollData] = useState(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [userRole, setUserRole] = useState("")

  useEffect(() => {
    checkMFAStatus()
    loadUserRole()
  }, [])

  async function loadUserRole() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (data) setUserRole(data.role)
    }
  }

  async function checkMFAStatus() {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      
      const activeFactor = data.all.find(f => f.status === 'verified')
      setMfaEnabled(!!activeFactor)
    } catch (err) {
      console.error("Error checking MFA status:", err.message)
    }
  }

  const handleStartEnroll = async () => {
    setLoading(true)
    setError("")
    try {
      // Limpiar factores previos no verificados para evitar el error "already exists"
      const { data: factors } = await supabase.auth.mfa.listFactors()
      if (factors?.all?.length > 0) {
        for (const factor of factors.all) {
          if (factor.status === 'unverified') {
            await supabase.auth.mfa.unenroll({ factorId: factor.id })
          }
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "Monitor Pro",
        friendlyName: "Authenticator App"
      })

      if (error) throw error
      setEnrollData(data)
    } catch (err) {
      setError("Error iniciando enrolamiento: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAndActivate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      // 1. Crear el challenge para el factor que estamos enrolando
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id
      })
      if (challengeError) throw challengeError

      // 2. Verificar el código ingresado por el usuario
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challengeData.id,
        code: verificationCode
      })

      if (verifyError) throw verifyError

      // AUDITORÍA: Registro de activación de MFA
      try {
        const { data: { user } } = await supabase.auth.getUser()
        await auditService.record({
          action: 'UPDATE',
          module: 'Seguridad',
          description: `Activó el doble factor de autenticación (MFA) para su cuenta.`,
          details: { user_id: user?.id, factor_id: enrollData.id }
        })
      } catch (auditErr) {
        console.error("Error al registrar auditoría de MFA:", auditErr)
      }

      setSuccess("¡Doble factor (MFA) activado correctamente! Redirigiendo...")
      setMfaEnabled(true)
      setEnrollData(null)
      setVerificationCode("")

      // Redirigir al inicio después de 2 segundos para actualizar el estado global
      setTimeout(() => {
        window.location.href = "/"
      }, 2000)
    } catch (err) {
      setError("Código incorrecto o error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUnenroll = async () => {
    if (!window.confirm("¿Estás seguro de desactivar el MFA? Tu cuenta será menos segura.")) return
    
    setLoading(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const factorId = factors.all[0]?.id
      
      if (factorId) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId })
        if (error) throw error

        // AUDITORÍA: Registro de desactivación de MFA
        try {
          const { data: { user } } = await supabase.auth.getUser()
          await auditService.record({
            action: 'UPDATE',
            module: 'Seguridad',
            description: `Desactivó el doble factor de autenticación (MFA) de su cuenta.`,
            details: { user_id: user?.id, factor_id: factorId }
          })
        } catch (auditErr) {
          console.error("Error al registrar auditoría de MFA:", auditErr)
        }

        setMfaEnabled(false)
        setSuccess("MFA desactivado correctamente.")
      }
    } catch (err) {
      setError("Error desactivando MFA: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const isMandatory = false // ['admin', 'medico'].includes(userRole) // DESACTIVADO TEMPORALMENTE

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{ fontSize: '24px' }}>🛡️</span>
        <h2 style={{ margin: 0 }}>Seguridad de la Cuenta</h2>
      </div>

      <div className="status-badge" style={{ 
        background: mfaEnabled ? '#f0fdf4' : '#fff7ed', 
        color: mfaEnabled ? '#16a34a' : '#c2410c',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '20px',
        border: '1px solid',
        borderColor: mfaEnabled ? '#bbf7d0' : '#fdba74'
      }}>
        {mfaEnabled 
          ? "✅ El doble factor (MFA) está activo." 
          : "⚠️ El doble factor (MFA) está desactivado."}
      </div>

      {isMandatory && !mfaEnabled && (
        <div style={{ background: '#fef2f2', color: '#991b1b', padding: '20px', borderRadius: '12px', marginBottom: '25px', fontSize: '14px', border: '2px solid #fecaca', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.1)' }}>
          <strong style={{ fontSize: '16px', display: 'block', marginBottom: '8px' }}>🚨 Acción Requerida: Seguridad Obligatoria</strong>
          Debido a tu rol como <strong>{userRole.toUpperCase()}</strong>, el acceso al sistema está restringido hasta que actives el Doble Factor de Autenticación (MFA). Esto es necesario para proteger los datos médicos sensibles.
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}

      {!mfaEnabled && !enrollData && (
        <div>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
            Aumenta la seguridad de tu cuenta usando una aplicación autenticadora (Google Authenticator, Microsoft Authenticator, Authy, etc.).
          </p>
          <button onClick={handleStartEnroll} disabled={loading} className="btn-primary">
            {loading ? "Iniciando..." : "Configurar Doble Factor"}
          </button>
        </div>
      )}

      {enrollData && (
        <div style={{ textAlign: 'center', background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
          <h4>Escanea el código QR</h4>
          <p style={{ fontSize: '13px', color: '#475569' }}>Usa tu app de autenticación para escanear este código:</p>
          
          <div style={{ background: 'white', padding: '20px', display: 'inline-block', borderRadius: '8px', marginBottom: '10px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <QRCodeSVG 
              value={`otpauth://totp/MonitorPro:${encodeURIComponent(enrollData.user_id)}?secret=${enrollData.totp.secret}&issuer=MonitorPro`} 
              size={200}
              level="M"
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '5px' }}>¿No puedes escanear el código? Ingresa la clave manualmente:</p>
            <code style={{ background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', color: '#101827', display: 'block' }}>
              {enrollData.totp.secret}
            </code>
          </div>

          <form onSubmit={handleVerifyAndActivate}>
            <label style={{ display: 'block', marginBottom: '10px' }}>Ingresa el código de 6 dígitos que aparece en tu celular:</label>
            <input 
              type="text" 
              placeholder="000000"
              maxLength={6}
              value={verificationCode}
              onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', width: '200px', marginBottom: '20px' }}
              required
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: 'auto' }}>
                {loading ? "Verificando..." : "Activar Ahora"}
              </button>
              
              {(!isMandatory || mfaEnabled) && (
                <button type="button" onClick={() => setEnrollData(null)} style={{ width: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {mfaEnabled && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <button onClick={handleUnenroll} disabled={loading} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            Desactivar MFA
          </button>
        </div>
      )}
    </div>
  )
}
