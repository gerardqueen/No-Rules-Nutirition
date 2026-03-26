import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MobileApp from './MobileApp.jsx'

const isMobile = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isMobile ? <MobileApp /> : <App />}
  </StrictMode>,
)