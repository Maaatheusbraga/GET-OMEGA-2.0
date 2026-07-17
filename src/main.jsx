import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const rootEl = document.getElementById('root')

function showBootError(message) {
  if (!rootEl) return
  rootEl.innerHTML = `
    <div style="padding:24px;font-family:Segoe UI,sans-serif;max-width:720px;margin:40px auto">
      <h1 style="color:#7c3aed;margin:0 0 12px">GET OMEGA 2.0</h1>
      <p style="color:#b91c1c;font-weight:600">Nao foi possivel abrir a interface neste navegador.</p>
      <pre style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:12px;white-space:pre-wrap">${message}</pre>
      <p style="color:#475569">Tente atualizar o Chrome/Edge no servidor ou acesse de outro PC: <strong>http://192.168.2.4:3001</strong></p>
    </div>
  `
}

try {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  showBootError(error?.message || String(error))
}
