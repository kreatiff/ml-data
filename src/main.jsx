import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AnalyticsDataProvider } from './contexts/AnalyticsDataContext'
import './index.css'
import App from './App.jsx'
import PasswordGate from './PasswordGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PasswordGate>
          <AnalyticsDataProvider>
            <App />
          </AnalyticsDataProvider>
        </PasswordGate>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

