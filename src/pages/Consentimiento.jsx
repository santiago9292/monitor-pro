import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { auditService } from '../services/auditService';
import { consentService } from '../services/consentService';
import SignaturePad from '../components/SignaturePad';
import CameraCapture from '../components/CameraCapture';

export default function Consentimiento() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    dni: '',
    cargo: '',
    empresa: '',
    testigo_email: '',
    ip_address: ''
  });

  const [signature, setSignature] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      const ip = await auditService.getIP();
      setFormData(prev => ({ 
        ...prev, 
        testigo_email: session?.user?.email || 'Sistema', 
        ip_address: ip 
      }));
    }
    init();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const pdfBlob = await consentService.generatePDF(formData, signature, photo);
      
      // 2. Convertir imágenes para Storage
      const signatureFile = consentService.base64ToFile(signature, 'signature.png', 'image/png');
      const photoFile = consentService.base64ToFile(photo, 'selfie.jpg', 'image/jpeg');

      // 3. Guardar todo en Supabase
      const pdfUrl = await consentService.saveConsent(formData, signatureFile, photoFile, pdfBlob);

      // 4. Registro de Auditoría
      await auditService.record({
        action: 'CREATE',
        module: 'Consentimientos',
        description: `Registró consentimiento firmado con éxito para: ${formData.nombre} ${formData.apellidos} (DNI: ${formData.dni})`,
        details: { dni: formData.dni, pdf_url: pdfUrl }
      });

      setSuccess(true);
      
      // Limpiar formulario tras éxito (opcional, mejor redirigir o mostrar éxito)
    } catch (err) {
      console.error('Error al procesar consentimiento:', err);
      setError('Ocurrió un error al guardar el consentimiento. Verifique su conexión.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mp-consent" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="mp-consent-container" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✔️</div>
          <h2 style={{ color: '#16a34a', marginBottom: '10px' }}>¡Consentimiento Registrado!</h2>
          <p style={{ color: '#475569', marginBottom: '30px' }}>
            El documento ha sido firmado, validado y guardado correctamente en el expediente del colaborador.
          </p>
          <button 
            className="mp-roles-primary-btn"
            onClick={() => window.location.reload()}
          >
            Firmar otro documento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-consent">
      <div className="mp-consent-container">
        <div className="mp-consent-header">
          <h2>Consentimiento Informado</h2>
          <p>Autorización para el tratamiento de datos personales y de salud ocupacional</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* DATOS DEL COLABORADOR */}
          <div className="mp-consent-section">
            <h4>1. Datos del Colaborador</h4>
            <div className="mp-consent-grid">
              <input 
                name="nombre" 
                placeholder="Nombres" 
                value={formData.nombre} 
                onChange={handleInputChange} 
                required 
              />
              <input 
                name="apellidos" 
                placeholder="Apellidos" 
                value={formData.apellidos} 
                onChange={handleInputChange} 
                required 
              />
              <input 
                name="dni" 
                placeholder="DNI" 
                value={formData.dni} 
                onChange={handleInputChange} 
                required 
              />
              <input 
                name="cargo" 
                placeholder="Cargo" 
                value={formData.cargo} 
                onChange={handleInputChange} 
              />
              <input 
                name="empresa" 
                placeholder="Empresa" 
                value={formData.empresa} 
                onChange={handleInputChange} 
              />
            </div>
          </div>

          {/* DECLARACIÓN LEGAL */}
          <div className="mp-consent-section">
            <h4>2. Declaración Jurada</h4>
            <div className="mp-consent-text">
              <p>
                <b>AUTORIZO</b> expresamente el tratamiento de mis datos personales y sensibles relacionados con mi salud ocupacional, los cuales serán recopilados y tratados bajo el sistema <b>MONITOR PRO®</b>.
              </p>
              <p>
                He sido informado sobre la finalidad de esta vigilancia médica y declaro conocer mis derechos de acceso, rectificación y cancelación (ARCO).
              </p>
            </div>
            <div className="mp-consent-checkbox">
              <input 
                type="checkbox" 
                id="acepto" 
                checked={accepted} 
                onChange={(e) => setAccepted(e.target.checked)} 
              />
              <label htmlFor="acepto">He leído y acepto los términos de este consentimiento.</label>
            </div>
          </div>

          {/* EVIDENCIA DIGITAL (Firma y Foto) */}
          <div className="mp-consent-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
            <div>
              <h4 style={{ marginBottom: '15px' }}>3. Firma Digital del Colaborador</h4>
              <SignaturePad onSave={setSignature} onClear={() => setSignature(null)} />
              <p className="mp-signature-hint">Use su dedo o mouse para firmar sobre el recuadro blanco.</p>
            </div>

            <div>
              <h4 style={{ marginBottom: '15px' }}>4. Fotografía de Validación (Obligatorio)</h4>
              <CameraCapture onCapture={setPhoto} onClear={() => setPhoto(null)} />
              <p className="mp-signature-hint" style={{ textAlign: 'center' }}>Capture una foto frontal del colaborador para validar la firma.</p>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', padding: '15px', borderRadius: '8px', marginBottom: '25px', textAlign: 'center' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
              Este proceso es presenciado por el profesional: <b>{formData.testigo_email}</b> desde la IP: <b>{formData.ip_address}</b>.
            </p>
            <button 
              type="submit" 
              className="mp-consent-submit" 
              disabled={loading}
              style={{ opacity: isFormValid() ? 1 : 0.6, cursor: loading ? 'wait' : (isFormValid() ? 'pointer' : 'not-allowed') }}
            >
              {loading ? 'Generando PDF y Guardando...' : 'FINALIZAR Y FIRMAR DOCUMENTO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}