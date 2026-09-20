import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { HealthPage } from './components/HealthPage'
import './styles.css'

const root = window.location.pathname === '/health' ? <HealthPage /> : <App />

createRoot(document.getElementById('root')!).render(<StrictMode>{root}</StrictMode>)
