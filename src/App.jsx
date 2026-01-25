import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import BusquedaSeguimiento from '../pages/BusquedaSeguimiento.jsx'
import Estadisticas from '../pages/Estadisticas.jsx'

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <div className="container">
        <Routes>
          <Route path="/" element={<BusquedaSeguimiento />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
