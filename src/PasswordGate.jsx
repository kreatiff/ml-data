import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import './PasswordGate.css'

function PasswordGate({ children }) {
  const { user, loading, signIn, signUp } = useAuth()
  const [activeTab, setActiveTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="password-gate">
        <div className="password-gate-loading">Loading...</div>
      </div>
    )
  }

  if (user) {
    return children
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setAccessCode('')
    setError('')
    setSuccessMessage('')
  }

  const handleTabSwitch = (tab) => {
    setActiveTab(tab)
    resetForm()
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      setIsSubmitting(false)
      return
    }

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message)
    }

    setIsSubmitting(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccessMessage('')

    if (!email || !password || !accessCode) {
      setError('Please fill in all fields')
      setIsSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsSubmitting(false)
      return
    }

    const { error: signUpError } = await signUp(email, password, accessCode)

    if (signUpError) {
      setError(signUpError.message)
    } else {
      setSuccessMessage('Registration successful! Check your email to confirm your account, then log in.')
      setActiveTab('login')
      setPassword('')
      setConfirmPassword('')
      setAccessCode('')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="password-gate">
      <h1 className="password-gate-title">Dupleighcates</h1>
      <div className="password-gate-container">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('register')}
            type="button"
          >
            Register
          </button>
        </div>

        {successMessage && (
          <div className="password-gate-success">{successMessage}</div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="password-gate-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="password-gate-input"
              autoFocus
              disabled={isSubmitting}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="password-gate-input"
              disabled={isSubmitting}
            />
            {error && <div className="password-gate-error">{error}</div>}
            <button type="submit" className="password-gate-button" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="password-gate-form">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="password-gate-input"
              autoFocus
              disabled={isSubmitting}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="password-gate-input"
              disabled={isSubmitting}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="password-gate-input"
              disabled={isSubmitting}
            />
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access Code"
              className="password-gate-input"
              disabled={isSubmitting}
            />
            {error && <div className="password-gate-error">{error}</div>}
            <button type="submit" className="password-gate-button" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default PasswordGate
