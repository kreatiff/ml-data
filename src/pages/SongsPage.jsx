import { useState, useMemo, useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useNavigate } from 'react-router-dom'
import { useSongs } from '../hooks/useSongs'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useSpotifyAlbumArt } from '../hooks/useSpotifyAlbumArt'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useDebounce } from '../hooks/useDebounce'
import { themes } from '../constants/themes'
import SongCard from '../components/SongCard'
import BottomSheet from '../components/BottomSheet'
import { useSalmonMode } from '../hooks/useSalmonMode'
import InitialsAvatar from '../components/InitialsAvatar'
import salmonImg from '../assets/salmon_mode.png'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'

// ── Virtualized desktop table ──
function VirtualizedTable({ songs, handleSort, getSortIcon, formatDate, onRoundClick }) {
  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0
  const paddingBottom = virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0

  return (
    <div className="table-container" ref={parentRef} style={{ overflow: 'auto' }}>
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
          {songs.length === 0 ? (
            <tr>
              <td colSpan="7" className="no-results">
                No songs found matching your filters
              </td>
            </tr>
          ) : (
            <>
              {paddingTop > 0 && <tr><td style={{ height: paddingTop, padding: 0, border: 'none' }} colSpan="7" /></tr>}
              {virtualItems.map(virtualRow => {
                const song = songs[virtualRow.index]
                return (
                  <tr key={`${song.round_id}_${song.spotify_uri}`}>
                    <td className="song-name" title={song.song_name}>{song.song_name}</td>
                    <td title={song.artists}>{song.artists}</td>
                    <td className="album" title={song.album}>{song.album}</td>
                    <td title={song.submitter_name}>
                      <div className="table-submitter">
                        {song.submitter_avatar_url ? (
                          <img src={song.submitter_avatar_url} alt="Profile" className="table-avatar" />
                        ) : (
                          <InitialsAvatar name={song.submitter_name} size={24} />
                        )}
                        <span>{song.submitter_name}</span>
                      </div>
                    </td>
                    <td
                      title={song.round_name}
                      className="round-name-clickable"
                      onClick={() => onRoundClick(song.round_id)}
                    >{song.round_name}</td>
                    <td className="votes" title={song.total_votes}>{song.total_votes}</td>
                    <td className="date" title={formatDate(song.created_at)}>
                      {formatDate(song.created_at)}
                    </td>
                  </tr>
                )
              })}
              {paddingBottom > 0 && <tr><td style={{ height: paddingBottom, padding: 0, border: 'none' }} colSpan="7" /></tr>}
            </>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ── Virtualized mobile cards ──
function VirtualizedCards({ songs, salmonMode, onRoundClick }) {
  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 160,
    overscan: 5,
  })

  if (songs.length === 0) {
    return (
      <div className="cards-container">
        <div className="no-results">No songs found matching your filters</div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="cards-container"
      style={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}
    >
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => {
          const song = songs[virtualRow.index]
          return (
            <div
              key={`${song.round_id}_${song.spotify_uri}`}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <SongCard song={song} onRoundClick={onRoundClick} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SongsPage({ selectedTheme, setSelectedTheme }) {
  useDocumentTitle('The Search for the Perfect 12-Pointer | Dupleighcates')
  const navigate = useNavigate()
  const { songs, loading, error } = useSongs()
  const isMobile = useIsMobile()
  const { salmonMode, activateSalmonMode, deactivateSalmonMode, formatDate } = useSalmonMode()
  const [searchTerm, setSearchTerm] = useState('')
  const [salmonPopupText, setSalmonPopupText] = useState('')
  const salmonTimerRef = useRef(null)

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchTerm(val)
    if (val.toLowerCase() === 'salmon') {
      setSearchTerm('')
      if (salmonTimerRef.current) clearTimeout(salmonTimerRef.current)
      const activating = !salmonMode
      setSalmonPopupText(activating ? 'Activating Salmon Mode...' : 'Deactivating Salmon Mode...')
      salmonTimerRef.current = setTimeout(() => {
        if (activating) {
          activateSalmonMode()
        } else {
          deactivateSalmonMode()
        }
        salmonTimerRef.current = setTimeout(() => setSalmonPopupText(''), 1200)
      }, 1500)
    }
  }

  useEffect(() => {
    return () => { if (salmonTimerRef.current) clearTimeout(salmonTimerRef.current) }
  }, [])
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [selectedSubmitter, setSelectedSubmitter] = useState('')
  const [selectedRound, setSelectedRound] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' })
  const [isFilterOpen, setIsFilterOpen] = useState(false)

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

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase()
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
  }, [songs, debouncedSearchTerm, selectedSubmitter, selectedRound, sortConfig])

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '\u2195'
    return sortConfig.direction === 'asc' ? '\u2191' : '\u2193'
  }

  if (loading) {
    return <PageLoadingSkeleton />
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error loading songs</h2>
        <p>{error}</p>
        <p className="hint">Make sure you've created a .env file with your Supabase credentials</p>
      </div>
    )
  }

  // Navigation for clicking round name
  const navigateToRound = (roundId) => navigate(`/rounds/${roundId}`)

  return (
    <div className="songs-page">
      {!isMobile && (
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
            {!isMobile && <p className="subtitle">Browse and search all previously submitted songs</p>}
          </div>

          {!isMobile && <div className="filters-row">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by song name, artist, album, submitter, or round..."
                value={searchTerm}
                onChange={handleSearchChange}
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
          </div>}
        </div>
      </header>
      )}

      {isMobile && (
        <>
          <div className="mobile-search-bar">
            <input
              type="text"
              placeholder="Search songs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="mobile-search-input"
            />
          </div>

          <button
            className="mobile-filter-button"
            onClick={() => setIsFilterOpen(true)}
            aria-label="Open filters"
          >
            <span className="filter-icon">{'\u2699\uFE0F'}</span>
            {(selectedSubmitter || selectedRound) && (
              <span className="filter-badge">{[selectedSubmitter, selectedRound].filter(Boolean).length}</span>
            )}
          </button>

          <BottomSheet isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)}>
            <div className="bottom-sheet-group">
              <h4 className="bottom-sheet-section-header">Theme</h4>
              <div className="bottom-sheet-section">
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="filter-select"
                >
                  {Object.entries(themes).map(([key, theme]) => (
                    <option key={key} value={key}>{theme.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bottom-sheet-group">
              <h4 className="bottom-sheet-section-header">Filters</h4>
              <div className="bottom-sheet-section">
                <label className="bottom-sheet-label">Submitter</label>
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
              </div>

              <div className="bottom-sheet-section">
                <label className="bottom-sheet-label">Round</label>
                <select
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Rounds</option>
                  {uniqueRounds.map(round => (
                    <option key={round} value={round}>{round}</option>
                  ))}
                </select>
              </div>
            </div>

            {(selectedSubmitter || selectedRound || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedSubmitter('')
                  setSelectedRound('')
                  setIsFilterOpen(false)
                }}
                className="clear-filters-btn"
              >
                Clear Filters
              </button>
            )}

            <div className="mobile-result-count">
              {filteredAndSortedSongs.length} {filteredAndSortedSongs.length === 1 ? 'song' : 'songs'}
            </div>
          </BottomSheet>
        </>
      )}

      {isMobile ? (
        <VirtualizedCards
          songs={filteredAndSortedSongs}
          salmonMode={salmonMode}
          onRoundClick={navigateToRound}
        />
      ) : (
        <VirtualizedTable
          songs={filteredAndSortedSongs}
          handleSort={handleSort}
          getSortIcon={getSortIcon}
          formatDate={formatDate}
          onRoundClick={navigateToRound}
        />
      )}

      {salmonPopupText && (
        <div className="salmon-popup-overlay">
          <div className="salmon-popup">
            <img src={salmonImg} alt="Salmon Mode" className="salmon-popup-img" />
            <p className="salmon-popup-text">{salmonPopupText}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SongsPage
