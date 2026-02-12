import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAnalytics } from '../hooks/useAnalytics'
import { usePlaylistDefinitions } from '../hooks/usePlaylistDefinitions'
import { supabase } from '../supabaseClient'
import './PlaylistsPage.css'

function PlaylistCard({ playlist, onCreate, creating, result }) {
  const [expanded, setExpanded] = useState(false)
  const trackCount = playlist.trackUris.length

  return (
    <div className="playlist-card">
      <div className="playlist-card-header">
        <span className="playlist-card-icon">{playlist.icon}</span>
        <div>
          <div className="playlist-card-title">{playlist.name}</div>
          <div className="playlist-card-desc">{playlist.description}</div>
        </div>
      </div>

      <div className="playlist-card-meta">
        <strong>{trackCount}</strong> track{trackCount !== 1 ? 's' : ''}
      </div>

      {trackCount > 0 && (
        <>
          <button
            className="playlist-tracks-toggle"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? 'Hide tracks' : 'Show tracks'}
          </button>

          {expanded && (
            <div className="playlist-tracks-list">
              {playlist.songs.map((song, i) => (
                <div key={`${song.spotify_uri}_${i}`} className="playlist-track-row">
                  <span className="playlist-track-num">{i + 1}</span>
                  <span className="playlist-track-name" title={song.song_name}>{song.song_name}</span>
                  <span className="playlist-track-artist" title={song.artists}>{song.artists}</span>
                  <span className="playlist-track-pts">{song.total}pts</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="playlist-card-actions">
        <button
          className="playlist-create-btn"
          disabled={creating || trackCount === 0}
          onClick={() => onCreate(playlist)}
        >
          {creating ? 'Creating...' : 'Create on Spotify'}
        </button>

        {result?.success && (
          <a
            className="playlist-open-link"
            href={result.playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in Spotify
          </a>
        )}

        {result?.error && (
          <span className="playlist-error-msg">{result.error}</span>
        )}
      </div>
    </div>
  )
}

function PlaylistsPage() {
  const [searchParams] = useSearchParams()
  const teamParam = searchParams.get('team') || ''

  const {
    loading, error, leagues, selectedLeague, setSelectedLeague,
    filteredVotes, filteredSubmissions, playerStats
  } = useAnalytics({ team: teamParam })

  const players = useMemo(() =>
    playerStats.map(p => ({ id: p.id, name: p.name })),
    [playerStats]
  )

  const { featured, bestOfPlaylists } = usePlaylistDefinitions(
    filteredVotes, filteredSubmissions, players
  ) || { featured: [], bestOfPlaylists: [] }

  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [creatingId, setCreatingId] = useState(null)
  const [results, setResults] = useState({})

  const selectedBestOf = useMemo(() => {
    if (!selectedPlayer) return null
    return bestOfPlaylists.find(p => p.playerId === selectedPlayer) || null
  }, [bestOfPlaylists, selectedPlayer])

  async function handleCreate(playlist) {
    setCreatingId(playlist.id)
    setResults(prev => ({ ...prev, [playlist.id]: null }))

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-playlist', {
        body: {
          name: playlist.name,
          description: playlist.description,
          trackUris: playlist.trackUris,
        }
      })

      if (fnError) throw fnError

      if (data?.error) {
        setResults(prev => ({ ...prev, [playlist.id]: { error: data.error } }))
      } else {
        setResults(prev => ({
          ...prev,
          [playlist.id]: { success: true, playlistUrl: data.playlistUrl }
        }))
      }
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [playlist.id]: { error: err.message || 'Failed to create playlist' }
      }))
    } finally {
      setCreatingId(null)
    }
  }

  if (loading) {
    return <div className="playlists-loading">Loading playlists...</div>
  }

  if (error) {
    return (
      <div className="playlists-error">
        <h2>Error loading data</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="playlists-page">
      <div className="playlists-header">
        <div className="playlists-header-row">
          <h1>Playlists</h1>
          {leagues.length >= 1 && (
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="league-filter"
            >
              <option value="">All Leagues</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name || l.id}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <h2 className="playlists-section-title">Featured Playlists</h2>
      <div className="playlists-grid">
        {featured.map(pl => (
          <PlaylistCard
            key={pl.id}
            playlist={pl}
            onCreate={handleCreate}
            creating={creatingId === pl.id}
            result={results[pl.id]}
          />
        ))}
      </div>

      <div className="bestof-section">
        <h2 className="playlists-section-title">Best Of Player</h2>
        <select
          className="bestof-player-select"
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
        >
          <option value="">Select a player...</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {selectedBestOf && (
          <div className="playlists-grid">
            <PlaylistCard
              playlist={selectedBestOf}
              onCreate={handleCreate}
              creating={creatingId === selectedBestOf.id}
              result={results[selectedBestOf.id]}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default PlaylistsPage
