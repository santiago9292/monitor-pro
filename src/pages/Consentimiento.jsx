export default function Consentimiento() {
  return (
    <div className="mp-consent">

      <div className="mp-consent-container">

        <div className="mp-consent-header">
          <h2>Consentimiento Informado</h2>
          <p>
            Autorización para el tratamiento de datos personales y datos de salud ocupacional
          </p>
        </div>

        {/* DATOS DEL COLABORADOR */}
        <div className="mp-consent-section">
          <h4>Datos del Colaborador</h4>

          <div className="mp-consent-grid">
            <input type="text" placeholder="Nombres completos" />
            <input type="text" placeholder="Apellidos completos" />
            <input type="text" placeholder="DNI" />
            <input type="text" placeholder="Cargo" />
            <input type="text" placeholder="Empresa" />
            <input type="date" />
          </div>
        </div>

        {/* TEXTO LEGAL */}
        <div className="mp-consent-section">
          <h4>Declaración</h4>

          <div className="mp-consent-text">
            <p>
              Declaro haber sido informado de manera clara y suficiente que mis datos
              personales y datos sensibles relacionados con mi salud ocupacional
              serán recopilados y tratados por la empresa responsable del sistema
              MONITOR PRO®, con la finalidad de gestionar la vigilancia de salud
              ocupacional y cumplir obligaciones legales en materia de seguridad y
              salud en el trabajo.
            </p>

            <p>
              Autorizo expresamente el tratamiento de datos de identificación,
              datos laborales, resultados de exámenes médicos y descansos médicos.
            </p>

            <p>
              Declaro conocer que puedo ejercer mis derechos de acceso,
              rectificación, cancelación y oposición (ARCO).
            </p>
          </div>

          <div className="mp-consent-checkbox">
            <input type="checkbox" id="acepto" />
            <label htmlFor="acepto">
              He leído y acepto el tratamiento de mis datos personales
            </label>
          </div>
        </div>

        {/* FIRMA DIGITAL MOCKUP */}
        <div className="mp-consent-section">
          <h4>Firma Digital</h4>

          <div className="mp-signature-box">
            Firma aquí
          </div>

          <p className="mp-signature-hint">
            (Espacio destinado para firma digital del colaborador)
          </p>
        </div>

        <button className="mp-consent-submit">
          Aceptar y Firmar
        </button>

      </div>
    </div>
  )
}