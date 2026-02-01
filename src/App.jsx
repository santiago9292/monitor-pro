import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import BusquedaSeguimiento from './pages/BusquedaSeguimiento.jsx'
import Estadisticas from './pages/Estadisticas.jsx'
import DescansosMedicos from "./pages/DescansosMedicos.jsx"


function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <div className="container">
        <Routes>
          <Route path="/" element={<BusquedaSeguimiento />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route  path="/descansos-medicos"  element={<DescansosMedicos />}/>
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
