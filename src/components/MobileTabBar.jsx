import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import BottomSheet from './BottomSheet'
import './MobileTabBar.css'

// SVGs are placeholders per user request ("I am happy to find them myself, so don't generate them.")
// Feel free to replace the contents of these SVG elements with your own.

const HomeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
)

const ChartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
)

const TargetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2"></circle>
  </svg>
)

const StarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
)

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
)

function MobileTabBar() {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  const handleHapticFeedback = () => {
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  return (
    <>
      <nav className="mobile-tab-bar">
        <NavLink to="/" end className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`} onClick={handleHapticFeedback}>
          <div className="tab-icon"><HomeIcon /></div>
          <span className="tab-label">Songs</span>
        </NavLink>
        
        <NavLink to="/analytics" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`} onClick={handleHapticFeedback}>
          <div className="tab-icon"><ChartIcon /></div>
          <span className="tab-label">Analytics</span>
        </NavLink>
        
        <NavLink to="/rounds" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`} onClick={handleHapticFeedback}>
          <div className="tab-icon"><TargetIcon /></div>
          <span className="tab-label">Rounds</span>
        </NavLink>
        
        <NavLink to="/badges" className={({ isActive }) => `tab-item ${isActive ? 'active' : ''}`} onClick={handleHapticFeedback}>
          <div className="tab-icon"><StarIcon /></div>
          <span className="tab-label">Badges</span>
        </NavLink>
        
        <button 
          className={`tab-item more-tab ${isMoreMenuOpen ? 'active' : ''}`} 
          onClick={() => {
            handleHapticFeedback()
            setIsMoreMenuOpen(true)
          }}
        >
          <div className="tab-icon"><MenuIcon /></div>
          <span className="tab-label">More</span>
        </button>
      </nav>

      <BottomSheet isOpen={isMoreMenuOpen} onClose={() => setIsMoreMenuOpen(false)}>
        <div className="bottom-sheet-group">
          <h4 className="bottom-sheet-section-header">More Pages</h4>
          
          <div className="bottom-sheet-section">
            <NavLink 
              to="/my-stats" 
              className={({ isActive }) => `more-menu-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsMoreMenuOpen(false)}
            >
              My Stats
            </NavLink>
          </div>
          
          <div className="bottom-sheet-section">
            <NavLink 
              to="/profile" 
              className={({ isActive }) => `more-menu-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsMoreMenuOpen(false)}
            >
              Profile
            </NavLink>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}

export default MobileTabBar
