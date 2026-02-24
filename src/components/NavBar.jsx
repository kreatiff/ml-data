import { NavLink, useSearchParams } from 'react-router-dom'
import './NavBar.css'

const TEAM_ICONS = {
  dux: '🦆',
  platties: '🦫',
  funkies: '🕺',
}

function NavBar() {
  const [searchParams] = useSearchParams()
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
        <NavLink to="/badges" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Badges
        </NavLink>
        <NavLink to="/playlists" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          Playlists
        </NavLink>
      </div>
    </nav>
  )
}

export default NavBar
