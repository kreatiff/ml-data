import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useIsMobile } from '../hooks/useMediaQuery'
import MobilePageHeader from '../components/MobilePageHeader'
import InitialsAvatar from '../components/InitialsAvatar'
import './ProfilePage.css'

function ProfilePage() {
    useDocumentTitle('Your Digital Vanity Mirror | Dupleighcates')
    const { user, profile, loading: authLoading, updateProfile, uploadAvatar } = useAuth()
    const isMobile = useIsMobile()

    const [displayName, setDisplayName] = useState('')
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [status, setStatus] = useState({ type: '', message: '' })
    const [loading, setLoading] = useState(false)
    const [enrichLoading, setEnrichLoading] = useState(false)
    const [enrichProgress, setEnrichProgress] = useState('')

    // Initialize fields when profile is loaded
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.name || '')
            setAvatarPreview(profile.avatar_url || '')
        }
    }, [profile])

    const handleAvatarChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setStatus({ type: '', message: '' })

        try {
            if (avatarFile) {
                await uploadAvatar(avatarFile)
            }
            if (displayName !== profile.name) {
                await updateProfile({ name: displayName })
            }
            setStatus({ type: 'success', message: 'Profile updated successfully!' })
        } catch (err) {
            setStatus({ type: 'error', message: err.message })
        } finally {
            setLoading(false)
        }
    }

    if (authLoading && !profile) {
        return <div className="profile-loading">Loading profile...</div>
    }

    return (
        <div className="profile-page fade-in">
            {isMobile && <MobilePageHeader title="Profile Settings" />}
            <div className="profile-content">
                {!isMobile && (
                    <h1 className="profile-title" data-text="Profile Settings">
                        Profile Settings
                    </h1>
                )}

                <div className="profile-grid">
                    {/* Avatar Section */}
                    <div className="profile-card avatar-card">
                        <div className="avatar-upload-container">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="profile-avatar-large" />
                            ) : (
                                <InitialsAvatar name={profile?.name || user?.email} size={120} />
                            )}
                            <label className="avatar-upload-label">
                                <span>Change Photo</span>
                                <input type="file" accept="image/*" onChange={handleAvatarChange} hidden />
                            </label>
                        </div>
                    </div>

                    {/* Account Settings */}
                    <div className="profile-card settings-card">
                        <form onSubmit={handleSubmit} className="profile-form">
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" value={user?.email} disabled className="readonly-input" />
                                <span className="input-hint">Email cannot be changed</span>
                            </div>

                            <div className="form-group">
                                <label>Display Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your name"
                                    required
                                />
                            </div>

                            {status.message && (
                                <div className={`status-message ${status.type}`}>
                                    {status.message}
                                </div>
                            )}

                            <div className="profile-actions">
                                <button type="submit" className="save-button" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProfilePage
