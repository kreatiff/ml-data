import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './ResetPasswordPage.css'

function ResetPasswordPage() {
  const { updatePassword, session } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // If there's no session, the user shouldn't be here
    // Supabase handles the recovery session automatically via the URL link
    if (!session) {
      // Small delay to allow session to initialize
      const timer = setTimeout(() => {
        if (!session) {
          setError('Invalid or expired reset link. Please request a new one.')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [session])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    if (!password || !confirmPassword) {
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

    const { error: updateError } = await updatePassword(password)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 3000)
    }

    setIsSubmitting(false)
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <h1 className="reset-password-title">Success!</h1>
          <p className="reset-password-message">Your password has been updated. Redirecting you to the home page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <h1 className="reset-password-title">Reset Your Password</h1>
        <p className="reset-password-subtitle">Please enter your new password below.</p>
        
        <form onSubmit={handleSubmit} className="reset-password-form">
          <div className="form-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              className="reset-password-input"
              autoFocus
              disabled={isSubmitting || !session}
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm New Password"
              className="reset-password-input"
              disabled={isSubmitting || !session}
            />
          </div>
          
          {error && <div className="reset-password-error">{error}</div>}
          
          <button 
            type="submit" 
            className="reset-password-button" 
            disabled={isSubmitting || !session}
          >
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ResetPasswordPage
