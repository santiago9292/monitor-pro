import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { EmpresaProvider } from './context/EmpresaContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <EmpresaProvider>
      <App />
    </EmpresaProvider>
  </React.StrictMode>
)
