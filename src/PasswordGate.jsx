import { useState } from 'react'
import './PasswordGate.css'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const STORAGE_KEY = 'app_access_token'
const ADMIN_KEY = 'app_is_admin'

function PasswordGate({ children }) {
  const [password, setPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) !== null
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/verify-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ password })
      })

      const data = await response.json()

      if (data.success && data.token) {
        localStorage.setItem(STORAGE_KEY, data.token)
        if (data.isAdmin) {
          localStorage.setItem(ADMIN_KEY, 'true')
        } else {
          localStorage.removeItem(ADMIN_KEY)
        }
        setIsAuthenticated(true)
        setError('')
      } else {
        setError(data.message || 'Incorrect password')
        setPassword('')
      }
    } catch {
      setError('Failed to verify password. Please try again.')
      setPassword('')
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthenticated) {
    return children
  }

  return (
    <div className="password-gate">
              <h1 className="password-gate-title">Dupleighcates</h1>
      <div className="password-gate-container">
        <form onSubmit={handleSubmit} className="password-gate-form">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="password-gate-input"
            autoFocus
            disabled={isLoading}
          />
          {error && <div className="password-gate-error">{error}</div>}
          <button type="submit" className="password-gate-button" disabled={isLoading}>
            {isLoading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PasswordGate
