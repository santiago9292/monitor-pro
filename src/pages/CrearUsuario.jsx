import { useState } from "react"
import { supabase } from "../lib/supabase"
import { auditService } from "../services/auditService"
import { userService } from "../services/userService"

export default function CrearUsuario() {
  const [formData, setFormData] = useState({
    email: "",
    password: "Pro" + Math.floor(100000 + Math.random() * 900000), // Contraseña aleatoria
    nombres: "",
    apellidos: "",
    dni: "",
    is_medico: false,
    cmp: "",
    genero: "M",
    fecha_nacimiento: "",
    role: "usuario"
  });

  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMensaje("")
    setError("")

    // 1. Crear el usuario en Auth (Supabase maneja la creación en auth.users)
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: `${formData.nombres} ${formData.apellidos}`,
        }
      }
    })

    if (signUpError) {
      console.error("Error creando usuario:", signUpError)
      setError(signUpError.message || "No se pudo crear el usuario en Auth")
      setLoading(false)
      return
    }

    // 2. Nota: Supabase suele disparar un trigger que crea el perfil. 
    // Vamos a esperar un momento y actualizar el perfil con los datos extendidos.
    const userId = authData.user?.id;
    if (userId) {
      // Intentamos actualizar el perfil (esperando que el trigger lo haya creado, o forzando si no)
      const success = await userService.updateProfile(userId, formData);
      if (!success) {
        console.error("Error actualizando perfil extendido");
        setError("Usuario de Auth creado, pero falló la creación del perfil detallado.");
        setLoading(false)
        return;
      }
    }

    // AUDITORÍA
    try {
      await auditService.record({
        action: 'CREATE',
        module: 'Usuarios',
        description: `Creó un nuevo perfil profesional para: ${formData.nombres} ${formData.apellidos} (${formData.role})`,
        details: { email: formData.email, role: formData.role }
      });
    } catch (auditErr) {
      console.warn("No se pudo registrar auditoría:", auditErr);
    }

    setMensaje(
      `Perfil profesional creado correctamente para ${formData.nombres}. Use la contraseña: ${formData.password}`
    )
    
    // Reset form
    setFormData({
      email: "",
      password: "Pro" + Math.floor(100000 + Math.random() * 900000),
      nombres: "",
      apellidos: "",
      dni: "",
      is_medico: false,
      cmp: "",
      genero: "M",
      fecha_nacimiento: "",
      role: "usuario"
    });
    setLoading(false)
  }

  return (
    <div className="container" style={{ padding: '0 20px' }}>
      <div className="grid grid-center" style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="card create-user-card" style={{ maxWidth: '600px', width: '100%', padding: '40px' }}>
          <h2 className="create-user-title" style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b', marginBottom: '10px' }}>
            Registro de Perfil Profesional
          </h2>
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', marginBottom: '30px' }}>
            Ingrese los datos completos para el nuevo usuario del sistema.
          </p>

          <form className="create-user-form" onSubmit={handleCrearUsuario} style={{ display: 'grid', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="input-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '5px', display: 'block' }}>Nombres</label>
                <input name="nombres" value={formData.nombres} onChange={handleInputChange} placeholder="Ej: Juan" required />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '5px', display: 'block' }}>Apellidos</label>
                <input name="apellidos" value={formData.apellidos} onChange={handleInputChange} placeholder="Ej: Perez" required />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="input-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '5px', display: 'block' }}>Identificación (DNI)</label>
                <input name="dni" value={formData.dni} onChange={handleInputChange} placeholder="8 dígitos" required maxLength={12} />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '5px', display: 'block' }}>Género</label>
                <select name="genero" value={formData.genero} onChange={handleInputChange}>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div className="input-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '5px', display: 'block' }}>Fecha de Nacimiento</label>
                <input name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onChange={handleInputChange} />
              </div>
              <div className="input-group">
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '5px', display: 'block' }}>Rol del Usuario</label>
                <select name="role" value={formData.role} onChange={handleInputChange}>
                  <option value="usuario">Usuario Estándar</option>
                  <option value="medico">Médico / Especialista</option>
                  <option value="rrhh">RRHH / Admin Local</option>
                  <option value="admin">Administrador General</option>
                </select>
              </div>
            </div>

            <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: formData.is_medico ? '15px' : '0' }}>
                <input 
                  type="checkbox" 
                  name="is_medico" 
                  id="chk_medico" 
                  checked={formData.is_medico} 
                  onChange={handleInputChange} 
                  style={{ width: 'auto', marginBottom: 0 }}
                />
                <label htmlFor="chk_medico" style={{ fontWeight: '600', color: '#1e293b' }}>¿Es profesional médico colegiado?</label>
              </div>
              
              {formData.is_medico && (
                <div className="input-group">
                  <label style={{ fontSize: '12px', color: '#64748b' }}>Número de CMP</label>
                  <input name="cmp" value={formData.cmp} onChange={handleInputChange} placeholder="Ej: 45678" required />
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '10px 0' }} />

            <div className="input-group">
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '5px', display: 'block' }}>Correo electrónico Institucional</label>
              <input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="ejemplo@monitorpro.com" required />
            </div>

            <div className="input-group">
              <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '5px', display: 'block' }}>Contraseña Temporal (Manual o Auto)</label>
              <input name="password" type="text" value={formData.password} onChange={handleInputChange} required />
            </div>

            {error && <p className="form-error" style={{ color: '#dc2626', background: '#fef2f2', padding: '10px', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }}>⚠️ {error}</p>}
            {mensaje && <p className="form-success" style={{ background: '#dcfce7', color: '#166534', padding: '12px', borderRadius: '6px', fontSize: '14px', textAlign: 'center' }}>✔️ {mensaje}</p>}

            <button type="submit" disabled={loading} style={{ background: '#2563eb', color: 'white', padding: '14px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
              {loading ? "Creando Registro..." : "CREAR USUARIO Y CONFIGURAR PERFIL"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
