import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './live.css'
import App from './BrutalistDashboard.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
