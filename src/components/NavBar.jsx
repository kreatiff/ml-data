import { NavLink, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import InitialsAvatar from './InitialsAvatar'
import './NavBar.css'

const TEAM_ICONS = {
  dux: '🦆',
  platties: '🦫',
  funkies: '🕺',
}

function NavBar() {
  const [searchParams] = useSearchParams()
  const { user, profile } = useAuth()

  const team = searchParams.get('team')?.trim().toLowerCase() || ''
  const teamIcon = TEAM_ICONS[team] || ''

  return (
    <nav className="nav-bar">
      <div className="nav-brand">Dupleighcates{teamIcon && <span className="team-icon">{teamIcon}</span>}</div>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Songs
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Analytics
        </NavLink>
        <NavLink to="/rounds" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Rounds
        </NavLink>
        <NavLink to="/badges" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Badges
        </NavLink>
        <NavLink to="/playlists" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Playlists
        </NavLink>
        {user && (
          <NavLink to="/my-stats" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            My Stats
          </NavLink>
        )}
        {user && (
          <NavLink to="/profile" className={({ isActive }) => `nav-link profile-link ${isActive ? 'active' : ''}`} title="Profile">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="nav-avatar" />
            ) : (
              <InitialsAvatar name={profile?.name || user?.email} size={28} />
            )}
          </NavLink>
        )}
      </div>
    </nav>
  )
}

export default NavBar
