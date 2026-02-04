import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import BusquedaSeguimiento from './pages/BusquedaSeguimiento.jsx'
import Estadisticas from './pages/Estadisticas.jsx'
import DescansosMedicos from "./pages/DescansosMedicos.jsx"
import Login from './auth/Login.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import CrearUsuario from "./pages/CrearUsuario.jsx"
import CambiarPassword from "./pages/CambiarPassword.jsx"
import ExamenesMedicos from "./pages/ExamenesMedicos.jsx"



function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN SIN PROTECCIÓN */}
        <Route path="/login" element={<Login />} />
        <Route path="/usuarios/crear" element={<CrearUsuario />} />
<Route path="/cambiar-password" element={<CambiarPassword />} />
<Route path="/cambiar-password" element={<CambiarPassword />} />



        {/* TODO EL SISTEMA PROTEGIDO */}
        <Route
          path="/*"
          element={
            
              <>
                <Navbar />
                <div className="container">
                  <Routes>
                    <Route path="/" element={<BusquedaSeguimiento />} />
                    <Route path="/estadisticas" element={<Estadisticas />} />
                    <Route path="/descansos-medicos" element={<DescansosMedicos />} />
                    <Route path="/examenes-medicos" element={<ExamenesMedicos />} />
                  </Routes>
                </div>
              </>
           
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

