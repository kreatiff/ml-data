import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { useSalmonMode } from './hooks/useSalmonMode'
import { themes } from './constants/themes'
import NavBar from './components/NavBar'
import SongsPage from './pages/SongsPage'
import './App.css'
import './CyberTheme.css'

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const BadgesPage = lazy(() => import('./pages/BadgesPage'))
const PlaylistsPage = lazy(() => import('./pages/PlaylistsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))

function App() {
  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'cyber'
  })
  const { salmonMode } = useSalmonMode()
  const { signOut } = useAuth()

  useEffect(() => {
    const theme = themes[selectedTheme]
    if (theme) {
      Object.entries(theme.colors).forEach(([key, value]) => {
        if (salmonMode && (key === '--spotify-green' || key === '--spotify-green-hover')) return
        document.documentElement.style.setProperty(key, value)
      })
      localStorage.setItem('app_theme', selectedTheme)
    }
  }, [selectedTheme, salmonMode])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key === 'a') {
        e.preventDefault()
        signOut()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [signOut])

  return (
    <div className={`app theme-${selectedTheme}`}>
      <NavBar />
      <Suspense fallback={<div className="loading">Loading...</div>}>
        <Routes>
          <Route path="/" element={<SongsPage selectedTheme={selectedTheme} setSelectedTheme={setSelectedTheme} />} />
          <Route path="/analytics/:year?" element={<AnalyticsPage />} />
          <Route path="/badges/:year?" element={<BadgesPage />} />
          <Route path="/playlists/:year?" element={<PlaylistsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App

