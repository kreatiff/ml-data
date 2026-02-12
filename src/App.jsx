import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import SongsPage from './pages/SongsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import BadgesPage from './pages/BadgesPage'
import PlaylistsPage from './pages/PlaylistsPage'
import './App.css'
import './CyberTheme.css'

const themes = {
  default: {
    name: 'Default',
    colors: {
      '--spotify-black': '#000000',
      '--spotify-bg': '#121212',
      '--spotify-elevated': '#181818',
      '--spotify-card': '#282828',
      '--spotify-green': '#1DB954',
      '--spotify-green-hover': '#1ED760',
      '--spotify-white': '#FFFFFF',
      '--spotify-gray': '#B3B3B3',
      '--spotify-light-gray': '#E0E0E0',
    }
  },
  cyber: {
    name: 'Cyber-Brutalist',
    colors: {
      '--spotify-black': '#050505',
      '--spotify-bg': '#050505',
      '--spotify-elevated': '#111111',
      '--spotify-card': '#111111',
      '--spotify-green': '#CCFF00',
      '--spotify-green-hover': '#DDFF33',
      '--spotify-white': '#E0E0E0',
      '--spotify-gray': '#666666',
      '--spotify-light-gray': '#999999',
    }
  }
}

function App() {
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'cyber'
  })

  useEffect(() => {
    const theme = themes[selectedTheme]
    if (theme) {
      Object.entries(theme.colors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      })
      localStorage.setItem('app_theme', selectedTheme)
    }
  }, [selectedTheme])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'a') {
        e.preventDefault()
        localStorage.removeItem('app_access_token')
        localStorage.removeItem('app_is_admin')
        window.location.reload()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className={`app theme-${selectedTheme}`}>
      <NavBar />
      <Routes>
        <Route path="/" element={<SongsPage selectedTheme={selectedTheme} setSelectedTheme={setSelectedTheme} />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/badges" element={<BadgesPage />} />
        <Route path="/playlists/:year?" element={<PlaylistsPage />} />
      </Routes>
    </div>
  )
}

export default App
