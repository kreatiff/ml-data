import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import InitialsAvatar from '../components/InitialsAvatar'
import './ProfilePage.css'

function ProfilePage() {
    const { user, profile, isAdmin, updatePassword, refreshProfile } = useAuth()

    const [displayName, setDisplayName] = useState('')
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [status, setStatus] = useState({ type: '', message: '' })
    const [loading, setLoading] = useState(false)

    // Initialize fields when profile is loaded
    useEffect(() => {
        if (profile) {
            setDisplayName(profile.name || '')
            setAvatarPreview(profile.avatar_url || '')
        }
    }, [profile])

    const handleAvatarChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            try {
                const compressedFile = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const maxSize = 256;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > maxSize) {
                                    height = Math.round((height *= maxSize / width));
                                    width = maxSize;
                                }
                            } else {
                                if (height > maxSize) {
                                    width = Math.round((width *= maxSize / height));
                                    height = maxSize;
                                }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            canvas.toBlob((blob) => {
                                resolve(new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                }));
                            }, 'image/jpeg', 0.85);
                        };
                        img.onerror = reject;
                        img.src = event.target.result;
                    };
                    reader.onerror = reject;
                });

                setAvatarFile(compressedFile)
                setAvatarPreview(URL.createObjectURL(compressedFile))
            } catch (err) {
                setStatus({ type: 'error', message: 'Failed to compress image.' })
            }
        }
    }

    const handleProfileSave = async (e) => {
        e.preventDefault()
        setLoading(true)
        setStatus({ type: '', message: '' })

        try {
            if (!profile) throw new Error('No profile linked to this account')

            let newAvatarUrl = profile.avatar_url

            // 1. Upload new avatar if selected
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop()
                const fileName = `${user.id}-${Date.now()}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, avatarFile)

                if (uploadError) throw uploadError

                const { data } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName)

                newAvatarUrl = data.publicUrl
            }

            // 2. Update competitor record
            if (displayName !== profile.name || newAvatarUrl !== profile.avatar_url) {
                const { data: updateData, error: updateError } = await supabase
                    .from('competitors')
                    .update({ name: displayName, avatar_url: newAvatarUrl })
                    .eq('auth_user_id', user.id)
                    .select()

                if (updateError) throw updateError
                if (!updateData || updateData.length === 0) {
                    throw new Error('Profile update failed — no matching competitor record found for your account.')
                }

                await refreshProfile()
                setStatus({ type: 'success', message: 'Profile updated successfully.' })
                setAvatarFile(null)
            } else {
                setStatus({ type: 'success', message: 'No profile changes detected.' })
            }

        } catch (err) {
            console.error(err)
            setStatus({ type: 'error', message: err.message || 'Error updating profile' })
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordReset = async (e) => {
        e.preventDefault()
        setLoading(true)
        setStatus({ type: '', message: '' })

        try {
            if (newPassword.length < 6) {
                throw new Error('Password must be at least 6 characters')
            }
            if (newPassword !== confirmPassword) {
                throw new Error('Passwords do not match')
            }

            const { error } = await updatePassword(newPassword)
            if (error) throw error

            setNewPassword('')
            setConfirmPassword('')
            setStatus({ type: 'success', message: 'Password updated successfully.' })
        } catch (err) {
            console.error(err)
            setStatus({ type: 'error', message: err.message || 'Error updating password' })
        } finally {
            setLoading(false)
        }
    }

    if (!user) {
        return <div className="profile-page"><p className="profile-error">You must be logged in to view this page.</p></div>
    }

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1 className="glitch-text">USER_PROFILE</h1>
                <div className="profile-meta">
                    <p className="profile-id">ID: {user.id}</p>
                    <span className={`role-badge role-${profile?.role || 'user'}`}>
                        {(profile?.role || 'user').toUpperCase()}
                    </span>
                </div>
            </div>

            {status.message && (
                <div className={`status-banner status-${status.type}`}>
                    {status.message}
                </div>
            )}

            <div className="profile-grid">
                {/* PROFILE SETTINGS CARD */}
                <div className="profile-card">
                    <h2>[ IDENTITY_CONFIG ]</h2>
                    <form onSubmit={handleProfileSave} className="profile-form">

                        <div className="form-group avatar-group">
                            <div className="avatar-preview-container">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Avatar Preview" className="avatar-img" />
                                ) : (
                                    <InitialsAvatar name={displayName || profile?.name || user?.email} size={100} />
                                )}
                            </div>
                            <div className="avatar-upload">
                                <label htmlFor="avatar-upload" className="cyber-button file-button">
                                    SELECT_AVATAR
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    style={{ display: 'none' }}
                                />
                                {avatarFile && <span className="file-name">{avatarFile.name}</span>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="displayName">DISPLAY_NAME</label>
                            <input
                                id="displayName"
                                type="text"
                                className="cyber-input"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                autoComplete="off"
                            />
                        </div>

                        <button type="submit" disabled={loading} className="cyber-button submit-btn">
                            {loading ? 'PROCESSING...' : 'SAVE_IDENTITY'}
                        </button>
                    </form>
                </div>

                {/* SECURITY SETTINGS CARD */}
                <div className="profile-card">
                    <h2>[ SECURITY_CONFIG ]</h2>
                    <form onSubmit={handlePasswordReset} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="newPassword">NEW_PASSWORD</label>
                            <input
                                id="newPassword"
                                type="password"
                                className="cyber-input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">CONFIRM_PASSWORD</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                className="cyber-input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button type="submit" disabled={loading} className="cyber-button danger-btn">
                            {loading ? 'PROCESSING...' : 'UPDATE_SECURITY'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ProfilePage
