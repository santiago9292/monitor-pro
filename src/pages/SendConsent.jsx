import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { consentService } from '../services/consentService';
import { userService } from '../services/userService';
import ModalRegistroTrabajador from '../components/ModalRegistroTrabajador';

export default function SendConsent() {
  const [dni, setDni] = useState('');
  const [trabajador, setTrabajador] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [noExiste, setNoExiste] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [existingConsent, setExistingConsent] = useState(null);

  const [linkUrl, setLinkUrl] = useState('');
  const [generandoLink, setGenerandoLink] = useState(false);
  const [telefono, setTelefono] = useState('');

  const [profesionalNombre, setProfesionalNombre] = useState('Profesional Monitor Pro');

  const dniInputRef = useRef(null);

  useEffect(() => {
    dniInputRef.current?.focus();

    // Obtener datos del profesional logueado
    async function getProfData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const profile = await userService.getProfile(user.id);
          if (profile) {
            if (profile.nombres && profile.apellidos) {
              setProfesionalNombre(`${profile.nombres} ${profile.apellidos}`);
            } else if (profile.full_name) {
              setProfesionalNombre(profile.full_name);
            } else {
              setProfesionalNombre(user.email);
            }
          } else {
            setProfesionalNombre(user.email);
          }
        } catch (e) {
          setProfesionalNombre(user.email);
        }
      }
    }
    getProfData();
  }, []);

  const buscar = async () => {
    if (!/^\d{8}$/.test(dni)) {
      setMensaje('Ingrese un DNI válido de 8 dígitos');
      return;
    }

    setCargando(true);
    setMensaje('Buscando trabajador...');
    setTrabajador(null);
    setNoExiste(false);
    setLinkUrl('');
    setTelefono('');
    setExistingConsent(null);

    const { data } = await supabase
      .from('trabajadores')
      .select('*')
      .eq('dni', dni)
      .maybeSingle();

    if (!data) {
      setMensaje('Trabajador no registrado');
      setNoExiste(true);
    } else {
      setMensaje('');
      setTrabajador(data);
      if (data.telefono) {
        setTelefono(data.telefono);
      }

      // Verificar si ya tiene consentimiento
      const cons = await consentService.getConsentByDni(dni);
      setExistingConsent(cons);
    }
    setCargando(false);
  };

  const generarEnlace = async () => {
    if (!trabajador) return;

    setGenerandoLink(true);
    try {
      const workerName = `${trabajador.nombres} ${trabajador.apellidos}`;
      const linkId = await consentService.createConsentLink(
        trabajador.dni,
        workerName,
        profesionalNombre,
        telefono
      );

      const url = `${window.location.origin}/firmar/${linkId}`;
      setLinkUrl(url);
    } catch (err) {
      console.error('Error al generar enlace:', err);
      setMensaje('Error al generar el enlace. Revise su conexión.');
    } finally {
      setGenerandoLink(false);
    }
  };

  const enviarWhatsApp = () => {
    if (!telefono || !linkUrl) return;

    const numeroFormateado = telefono.replace(/\D/g, ''); // Solo números
    const mensajeTexto = `🏥 *Monitor Pro – VitaCorp360*\n\nHola ${trabajador.nombres}, le saludamos del equipo de *Salud Ocupacional*.\n\nLe hacemos llegar su enlace personal para firmar el *Consentimiento Informado* de manera digital, rápida y segura:\n\n👉 ${linkUrl}\n\n⚠️ *El enlace estará activo por 15 minutos, por favor fírmelo antes de ese tiempo.*\n\n📋 *Instrucciones:*\n• Ingrese al enlace desde su celular o computadora.\n• Lea el documento con detenimiento.\n• Firme con su dedo o mouse en el espacio indicado.\n\nSi tiene alguna duda, comuníquese con su médico ocupacional.\n\nAtentamente,\n*${profesionalNombre}*\n_Monitor Pro – VitaCorp360_`;

    const waUrl = `https://wa.me/${numeroFormateado}?text=${encodeURIComponent(mensajeTexto)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="container">
      <div className="grid">
        <div className="card card-busqueda">
          <h3>Enviar Consentimiento</h3>
          <p style={{ color: '#64748b', marginBottom: '15px', fontSize: '14px' }}>
            Busque al trabajador por DNI para enviarle un enlace único de firma por WhatsApp.
          </p>

          <form onSubmit={e => { e.preventDefault(); buscar(); }}>
            <input
              ref={dniInputRef}
              placeholder="Ingrese DNI"
              value={dni}
              onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
              maxLength={8}
            />
            <button type="submit" disabled={cargando}>
              {cargando ? 'Buscando...' : 'Buscar trabajador'}
            </button>
          </form>

          <p className="mensaje-busqueda">{mensaje}</p>

          {noExiste && (
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 10 }}
              onClick={() => setMostrarModal(true)}
            >
              ➕ Registrar trabajador
            </button>
          )}
        </div>

        {trabajador && (
          <div className="card">
            <span className="badge">Trabajador Encontrado</span>

            <h3 style={{ marginTop: '10px' }}>
              {trabajador.nombres} {trabajador.apellidos}
            </h3>

            <div className="paciente-info">
              <div>
                <p><b>DNI:</b> {trabajador.dni}</p>
                <p><b>Empresa:</b> {trabajador.empresa || '-'}</p>
                {trabajador.puesto && <p><b>Puesto:</b> {trabajador.puesto}</p>}
              </div>
            </div>

            {existingConsent && (
              <div style={{ marginTop: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <h4 style={{ margin: 0, color: '#166534' }}>Documento Firmado Existente</h4>
                </div>
                <p style={{ fontSize: '13px', color: '#166534', marginBottom: '15px' }}>
                  Este trabajador ya ha firmado un consentimiento previamente.
                </p>
                <button
                  onClick={() => {
                    // Usamos <a> con noopener para evitar el lock de GoTrue entre pestañas
                    const a = document.createElement('a');
                    a.href = existingConsent.pdf_url;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  📄 Descargar Consentimiento Firmado
                </button>
              </div>
            )}

            <hr style={{ margin: '20px 0', borderColor: '#e2e8f0', borderStyle: 'solid' }} />

            <h4 style={{ marginBottom: '10px' }}>Opciones de Envío</h4>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '5px' }}>
                Teléfono de contacto (WhatsApp):
              </label>
              <input
                type="text"
                value={telefono}
                onChange={e => setTelefono(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 987654321"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            {!linkUrl ? (
              <button
                onClick={generarEnlace}
                disabled={generandoLink}
                className="mp-roles-primary-btn"
                style={{ width: '100%', padding: '12px', background: '#0f172a' }}
              >
                {generandoLink ? 'Generando...' : '🔗 Generar Enlace Único'}
              </button>
            ) : (
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>Enlace generado:</p>
                <input
                  readOnly
                  value={linkUrl}
                  style={{ width: '100%', padding: '8px', fontSize: '12px', marginBottom: '15px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '4px' }}
                  onClick={e => e.target.select()}
                />

                <button
                  onClick={enviarWhatsApp}
                  disabled={!telefono || telefono.length < 9}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: telefono && telefono.length >= 9 ? '#25D366' : '#cbd5e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: telefono && telefono.length >= 9 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                  </svg>
                  Enviar por WhatsApp
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ModalRegistroTrabajador
        abierto={mostrarModal}
        dniInicial={dni}
        onClose={() => setMostrarModal(false)}
        onGuardado={() => {
          setMostrarModal(false);
          setNoExiste(false);
          buscar();
        }}
      />
    </div>
  );
}
