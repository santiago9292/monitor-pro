import logo from "../assets/logo.png"

export default function Login() {
  return (
    <div className="mp-login">
      <div className="mp-login-card">
        <img src={logo} alt="Monitor Pro" className="mp-login-logo" />
        <h1>MONITOR PRO®</h1>
        <p className="mp-login-subtitle">
          Sistema de Vigilancia de Salud Ocupacional
        </p>

        <input type="email" placeholder="Correo electrónico" />
        <input type="password" placeholder="Contraseña" />

        <button>Iniciar Sesión</button>

        <span className="mp-login-link">¿Olvidaste tu contraseña?</span>
      </div>
    </div>
  )
}