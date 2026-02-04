import { useState, useMemo, useEffect } from 'react'
import { useSongs } from './hooks/useSongs'
import { useSpotifyAlbumArt } from './hooks/useSpotifyAlbumArt'
import './App.css'
import './CyberTheme.css'
//test

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
  const { songs, loading, error } = useSongs()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubmitter, setSelectedSubmitter] = useState('')
  const [selectedRound, setSelectedRound] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
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

  const randomSong = useMemo(() => {
    if (songs.length === 0) return null
    const stableIndex = songs.length > 0 ? Math.floor(songs.length / 2) : 0
    return songs[stableIndex]
  }, [songs])

  const { albumArt } = useSpotifyAlbumArt(randomSong?.spotify_uri)

  const uniqueSubmitters = useMemo(() => {
    const submitters = [...new Set(songs.map(song => song.submitter_name))]
    return submitters.sort()
  }, [songs])

  const uniqueRounds = useMemo(() => {
    const rounds = [...new Set(songs.map(song => song.round_name))]
    return rounds.sort()
  }, [songs])

  const filteredAndSortedSongs = useMemo(() => {
    let filtered = songs

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(song => 
        song.song_name?.toLowerCase().includes(term) ||
        song.artists?.toLowerCase().includes(term) ||
        song.album?.toLowerCase().includes(term) ||
        song.submitter_name?.toLowerCase().includes(term) ||
        song.round_name?.toLowerCase().includes(term)
      )
    }

    if (selectedSubmitter) {
      filtered = filtered.filter(song => song.submitter_name === selectedSubmitter)
    }

    if (selectedRound) {
      filtered = filtered.filter(song => song.round_name === selectedRound)
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      
      if (sortConfig.direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
      }
    })

    return sorted
  }, [songs, searchTerm, selectedSubmitter, selectedRound, sortConfig])

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading songs...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">
          <h2>Error loading songs</h2>
          <p>{error}</p>
          <p className="hint">Make sure you've created a .env file with your Supabase credentials</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`app theme-${selectedTheme}`}>
      <header className="banner-header">
        {albumArt && (
          <>
            <div 
              className="banner-background" 
              style={{ backgroundImage: `url(${albumArt})` }}
            />
            <div className="banner-overlay" />
          </>
        )}
        <div className="theme-selector-container">
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="theme-selector"
            title="Select Theme"
          >
            {Object.entries(themes).map(([key, theme]) => (
              <option key={key} value={key}>{theme.name}</option>
            ))}
          </select>
        </div>
        <div className="banner-content">
          <div className="header-text">
            <h1 className="glitch-text">Dupleighcates</h1>
            <p className="subtitle">Browse and search all previously submitted songs</p>
          </div>

          <div className="filters-row">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search by song name, artist, album, submitter, or round..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={selectedSubmitter}
            onChange={(e) => setSelectedSubmitter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Submitters</option>
            {uniqueSubmitters.map(submitter => (
              <option key={submitter} value={submitter}>{submitter}</option>
            ))}
          </select>

          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(e.target.value)}
            className="filter-select filter-select-small"
          >
            <option value="">All Rounds</option>
            {uniqueRounds.map(round => (
              <option key={round} value={round}>{round}</option>
            ))}
          </select>

          {(selectedSubmitter || selectedRound || searchTerm) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedSubmitter('')
                setSelectedRound('')
              }}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}

          <span className="result-count">
            {filteredAndSortedSongs.length} {filteredAndSortedSongs.length === 1 ? 'song' : 'songs'}
          </span>
        </div>
        </div>
      </header>

      <div className="table-container">
        <table className="songs-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('song_name')} className="sortable">
                Song {getSortIcon('song_name')}
              </th>
              <th onClick={() => handleSort('artists')} className="sortable">
                Artist {getSortIcon('artists')}
              </th>
              <th onClick={() => handleSort('album')} className="sortable">
                Album {getSortIcon('album')}
              </th>
              <th onClick={() => handleSort('submitter_name')} className="sortable">
                Submitter {getSortIcon('submitter_name')}
              </th>
              <th onClick={() => handleSort('round_name')} className="sortable">
                Round {getSortIcon('round_name')}
              </th>
              <th onClick={() => handleSort('total_votes')} className="sortable">
                Votes {getSortIcon('total_votes')}
              </th>
              <th onClick={() => handleSort('created_at')} className="sortable">
                Submitted {getSortIcon('created_at')}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedSongs.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-results">
                  No songs found matching your filters
                </td>
              </tr>
            ) : (
              filteredAndSortedSongs.map((song) => (
                <tr key={`${song.round_id}_${song.spotify_uri}`}>
                  <td className="song-name" title={song.song_name}>{song.song_name}</td>
                  <td title={song.artists}>{song.artists}</td>
                  <td className="album" title={song.album}>{song.album}</td>
                  <td title={song.submitter_name}>{song.submitter_name}</td>
                  <td title={song.round_name}>{song.round_name}</td>
                  <td className="votes" title={song.total_votes}>{song.total_votes}</td>
                  <td className="date" title={new Date(song.created_at).toLocaleDateString('en-AU')}>
                    {new Date(song.created_at).toLocaleDateString('en-AU')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
