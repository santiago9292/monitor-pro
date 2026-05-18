import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { consentService } from '../services/consentService';
import { auditService } from '../services/auditService';
import SignaturePad from '../components/SignaturePad';
import CameraCapture from '../components/CameraCapture';
import logo from '../assets/logo.png';

export default function PublicConsent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [linkData, setLinkData] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    dni: '',
    cargo: '',
    empresa: '',
    testigo_email: '',
    ip_address: 'CAPTURA_DIGITAL'
  });

  const [signature, setSignature] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        if (!id) {
          setInvalidLink(true);
          return;
        }

        const data = await consentService.getConsentLink(id);
        
        if (!isMounted) return;

        if (!data) {
          setInvalidLink(true);
          return;
        }

        // Verificar expiración (15 minutos)
        if (data.created_at) {
          const createdTime = new Date(data.created_at).getTime();
          const currentTime = new Date().getTime();
          const diffInMinutes = (currentTime - createdTime) / (1000 * 60);
          
          if (diffInMinutes > 15 && !data.signed) {
            setLinkExpired(true);
            return;
          }
        }

        if (data.signed) {
          setAlreadySigned(true);
          setLinkData(data);
          return;
        }

        setLinkData(data);
        setFormData(prev => ({ 
          ...prev, 
          dni: data.dni,
          testigo_email: data.testigo_email
        }));

        // Fetch worker details to pre-fill
        if (data.dni) {
          const { data: workerData } = await supabase
            .from('trabajadores')
            .select('*')
            .eq('dni', data.dni)
            .maybeSingle();
          
          if (workerData && isMounted) {
            setFormData(prev => ({
              ...prev,
              nombre: (workerData.nombres || '').toUpperCase(),
              apellidos: (workerData.apellidos || '').toUpperCase(),
              cargo: (workerData.puesto || '').toUpperCase(),
              empresa: (workerData.empresa || '').toUpperCase()
            }));
          }
        }
      } catch (err) {
        console.error("Error loading link:", err);
        if (isMounted) setInvalidLink(true);
      }
    }
    init();
    return () => { isMounted = false; };
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const finalValue = ['nombre', 'apellidos', 'cargo', 'empresa'].includes(name) 
      ? value.toUpperCase() 
      : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const isFormValid = () => {
    return (
      formData.nombre && 
      formData.apellidos && 
      formData.dni && 
      signature && 
      photo && 
      accepted
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      setError('Por favor, complete todos los campos, firme y tome la foto de validación.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Generar el PDF Blob
      const pdfBlob = await consentService.generatePDF(formData, signature, photo, logo);
      
      // 2. Convertir imágenes para Storage
      const signatureFile = consentService.base64ToFile(signature, 'signature.png', 'image/png');
      const photoFile = consentService.base64ToFile(photo, 'selfie.jpg', 'image/jpeg');

      // 3. Guardar todo en Supabase (Consentimientos table)
      const pdfUrl = await consentService.saveConsent(formData, signatureFile, photoFile, pdfBlob);

      // 4. Marcar el link como firmado
      await consentService.markLinkAsSigned(id, pdfUrl);

      // 5. Registro de auditoría (override user for public access)
      await auditService.record({
        action: 'CREATE',
        module: 'Consentimientos',
        description: `El trabajador ${formData.nombre} ${formData.apellidos} (DNI: ${formData.dni}) firmó su consentimiento de forma remota.`,
        details: { dni: formData.dni, pdf_url: pdfUrl },
        overrideUser: `Paciente (${formData.dni})`
      });

      setSuccess(true);
    } catch (err) {
      console.error('Error al procesar consentimiento:', err);
      setError('Ocurrió un error al guardar el consentimiento. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (invalidLink) {
    return (
      <div className="mp-consent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div className="mp-consent-container" style={{ textAlign: 'center', padding: '50px 40px', maxWidth: '450px' }}>
          <img src={logo} alt="Vitacorp Logo" style={{ height: '50px', marginBottom: '30px' }} />
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Enlace Inválido</h2>
          <p style={{ color: '#475569', marginBottom: '10px' }}>
            Este enlace de consentimiento no es válido o no existe. Por favor, solicite un nuevo enlace al administrador.
          </p>
        </div>
      </div>
    );
  }

  if (linkExpired) {
    return (
      <div className="mp-consent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div className="mp-consent-container" style={{ textAlign: 'center', padding: '50px 40px', maxWidth: '450px' }}>
          <img src={logo} alt="Vitacorp Logo" style={{ height: '50px', marginBottom: '30px' }} />
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏳</div>
          <h2 style={{ color: '#f59e0b', marginBottom: '10px' }}>Enlace Expirado</h2>
          <p style={{ color: '#475569', marginBottom: '10px' }}>
            Por motivos de seguridad, los enlaces de firma tienen una validez de 15 minutos. Este enlace ha caducado. Por favor, solicite al administrador que le envíe uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  if (alreadySigned) {
    return (
      <div className="mp-consent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div className="mp-consent-container" style={{ textAlign: 'center', padding: '50px 40px', maxWidth: '450px' }}>
          <img src={logo} alt="Vitacorp Logo" style={{ height: '50px', marginBottom: '30px' }} />
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ color: '#0f172a', marginBottom: '10px' }}>Documento ya firmado</h2>
          <p style={{ color: '#475569', marginBottom: '10px' }}>
            Este consentimiento ya ha sido completado y firmado correctamente.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mp-consent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8fafc' }}>
        <div className="mp-consent-container" style={{ textAlign: 'center', padding: '50px 40px', maxWidth: '450px' }}>
          <img src={logo} alt="Vitacorp Logo" style={{ height: '50px', marginBottom: '30px' }} />
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✔️</div>
          <h2 style={{ color: '#16a34a', marginBottom: '10px' }}>¡Consentimiento Registrado!</h2>
          <p style={{ color: '#475569', marginBottom: '10px' }}>
            El documento ha sido firmado, validado y guardado correctamente de forma segura. Ya puede cerrar esta página.
          </p>
        </div>
      </div>
    );
  }

  if (!linkData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <p style={{ color: '#64748b', fontSize: '18px' }}>Cargando información del documento...</p>
      </div>
    );
  }

  return (
    <div className="mp-consent" style={{ background: '#f8fafc', minHeight: '100vh', padding: '20px 0' }}>
      <div className="mp-consent-container" style={{ margin: '0 auto', maxWidth: '800px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
          <img src={logo} alt="Logo" style={{ height: '60px', marginBottom: '15px' }} />
          <h2 style={{ color: '#0f172a', margin: 0 }}>Consentimiento Informado</h2>
          <p style={{ color: '#64748b', marginTop: '5px' }}>Autorización para el tratamiento de datos personales y de salud ocupacional</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* DATOS DEL COLABORADOR */}
          <div className="mp-consent-section" style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px', color: '#1e293b' }}>1. Mis Datos</h4>
            <div className="mp-consent-grid">
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>DNI</label>
                <input 
                  name="dni" 
                  value={formData.dni} 
                  readOnly
                  style={{ background: '#f1f5f9', cursor: 'not-allowed', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Nombres</label>
                <input 
                  name="nombre" 
                  value={formData.nombre} 
                  onChange={handleInputChange} 
                  required 
                  style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Apellidos</label>
                <input 
                  name="apellidos" 
                  value={formData.apellidos} 
                  onChange={handleInputChange} 
                  required 
                  style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Cargo (Opcional)</label>
                <input 
                  name="cargo" 
                  value={formData.cargo} 
                  onChange={handleInputChange} 
                  style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Empresa</label>
                <input 
                  name="empresa" 
                  value={formData.empresa} 
                  onChange={handleInputChange} 
                  style={{ border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px' }}
                />
              </div>
            </div>
          </div>

          {/* DECLARACIÓN LEGAL */}
          <div className="mp-consent-section" style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px', color: '#1e293b' }}>2. Declaración Jurada</h4>
            <div className="mp-consent-text" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', lineHeight: '1.6', color: '#475569' }}>
              <p style={{ marginBottom: '10px' }}>
                <b>AUTORIZO</b> expresamente el tratamiento de mis datos personales y sensibles relacionados con mi salud ocupacional, los cuales serán recopilados y tratados bajo el sistema <b>MONITOR PRO®</b>.
              </p>
              <p>
                He sido informado sobre la finalidad de esta vigilancia médica y declaro conocer mis derechos de acceso, rectificación y cancelación (ARCO).
              </p>
            </div>
            <div className="mp-consent-checkbox" style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox" 
                id="acepto" 
                checked={accepted} 
                onChange={(e) => setAccepted(e.target.checked)} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="acepto" style={{ cursor: 'pointer', fontWeight: 'bold', color: '#0f172a' }}>He leído y acepto los términos de este consentimiento.</label>
            </div>
          </div>

          {/* EVIDENCIA DIGITAL (Firma y Foto) */}
          <div className="mp-consent-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '30px' }}>
            <div>
              <h4 style={{ marginBottom: '15px', color: '#1e293b' }}>3. Mi Firma Digital</h4>
              <SignaturePad onSave={setSignature} onClear={() => setSignature(null)} />
              <p className="mp-signature-hint" style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>Use su dedo para firmar sobre el recuadro blanco.</p>
            </div>

            <div>
              <h4 style={{ marginBottom: '15px', color: '#1e293b' }}>4. Fotografía (Obligatorio)</h4>
              <CameraCapture onCapture={setPhoto} onClear={() => setPhoto(null)} />
              <p className="mp-signature-hint" style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', textAlign: 'center' }}>Tómese una selfie para validar su identidad.</p>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '15px', borderRadius: '8px', marginBottom: '25px', textAlign: 'center', fontWeight: 'bold' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px', textAlign: 'center' }}>
              Este proceso es validado por el profesional: <b>{formData.testigo_email}</b>.
            </p>
            <button 
              type="submit" 
              className="mp-consent-submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '16px', 
                fontSize: '16px', 
                fontWeight: 'bold', 
                background: isFormValid() ? '#0ea5e9' : '#cbd5e1', 
                color: 'white', 
                border: 'none', 
                borderRadius: '8px',
                cursor: loading ? 'wait' : (isFormValid() ? 'pointer' : 'not-allowed'),
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Procesando Documento...' : 'FINALIZAR Y ENVIAR FIRMA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
