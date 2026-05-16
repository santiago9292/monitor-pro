import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import BusquedaSeguimiento from './pages/BusquedaSeguimiento.jsx'
import Estadisticas from './pages/Estadisticas.jsx'
import DescansosMedicos from "./pages/DescansosMedicos.jsx"
//import Login from './auth/Login.jsx'//
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import CrearUsuario from "./pages/CrearUsuario.jsx"
import CambiarPassword from "./pages/CambiarPassword.jsx"
import ExamenesMedicos from "./pages/ExamenesMedicos.jsx"
import Roles from "./pages/Roles.jsx"
import Auditoria from "./pages/Auditoria.jsx"
import Login from "./pages/Login.jsx"
import SendConsent from "./pages/SendConsent.jsx"
import PublicConsent from "./pages/PublicConsent.jsx"
import Seguridad from "./pages/Seguridad.jsx"


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN SIN PROTECCIÓN */}
        <Route path="/login" element={<Login />} />

        {/* RUTAS PÚBLICAS (CONSENTIMIENTO) */}
        <Route path="/firmar/:id" element={<PublicConsent />} />

        {/* TODO EL SISTEMA PROTEGIDO */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Navbar />
              <div className="container">
                <Routes>
                  <Route path="/" element={<BusquedaSeguimiento />} />
                  <Route path="/estadisticas" element={<Estadisticas />} />
                  <Route path="/descansos-medicos" element={<DescansosMedicos />} />
                  <Route path="/examenes-medicos" element={<ExamenesMedicos />} />
                  <Route path="/usuarios" element={<Roles />} />
                  <Route path="/auditoria" element={<Auditoria />} />
                  <Route path="/consentimiento" element={<SendConsent />} />
                  <Route path="/seguridad" element={<Seguridad />} />
                  <Route path="/usuarios/crear" element={<CrearUsuario />} />
                  <Route path="/cambiar-password" element={<CambiarPassword />} />
                </Routes>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

