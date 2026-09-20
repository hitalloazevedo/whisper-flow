import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { HealthPage } from './components/HealthPage'
import './styles.css'

const healthPath = `${import.meta.env.BASE_URL}health`.replace(/\/{2,}/g, '/')
const root =
  window.location.pathname.replace(/\/$/, '') === healthPath.replace(/\/$/, '') ? (
    <HealthPage />
  ) : (
    <App />
  )

createRoot(document.getElementById('root')!).render(<StrictMode>{root}</StrictMode>)
