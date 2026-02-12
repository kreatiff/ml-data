import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAnalytics } from '../hooks/useAnalytics'
import { usePlaylistDefinitions } from '../hooks/usePlaylistDefinitions'
import { supabase } from '../supabaseClient'
import './PlaylistsPage.css'

function TrackListModal({ playlist, onClose }) {
  return (
    <div className="playlist-modal-overlay" onClick={onClose}>
      <div className="playlist-modal" onClick={e => e.stopPropagation()}>
        <div className="playlist-modal-header">
          <span className="playlist-card-icon">{playlist.icon}</span>
          <div>
            <div className="playlist-card-title">{playlist.name}</div>
            <div className="playlist-card-desc">{playlist.description}</div>
          </div>
          <button className="playlist-modal-close" onClick={onClose}>&times;</button>
        </div>
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
      </div>
    </div>
  )
}

function PlaylistCard({ playlist, prefix, onCreate, creating, result, onShowTracks }) {
  const trackCount = playlist.trackUris.length
  const displayName = `${prefix}${playlist.name}`

  return (
    <div className="playlist-card">
      <div className="playlist-card-header">
        <span className="playlist-card-icon">{playlist.icon}</span>
        <div>
          <div className="playlist-card-title">{displayName}</div>
          <div className="playlist-card-desc">{playlist.description}</div>
        </div>
      </div>

      <div className="playlist-card-meta">
        <strong>{trackCount}</strong> track{trackCount !== 1 ? 's' : ''}
      </div>

      {trackCount > 0 && (
        <button
          className="playlist-tracks-toggle"
          onClick={() => onShowTracks(playlist)}
        >
          Show tracks
        </button>
      )}

      <div className="playlist-card-actions">
        <button
          className="playlist-create-btn"
          disabled={creating || trackCount === 0}
          onClick={() => onCreate({ ...playlist, name: `${prefix}${playlist.name}` })}
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

  const LEAGUE_YEARS = {
    '2a40e26e20e846cbae7b66d53c1488f0': '2025',
    'fe08d6855f204613b30922e34a7486c6': '2026',
  }

  const leagueName = LEAGUE_YEARS[selectedLeague] || 'All Leagues'

  const { featured, bestOfPlaylists } = usePlaylistDefinitions(
    filteredVotes, filteredSubmissions, players
  ) || { featured: [], bestOfPlaylists: [] }

  const prefix = leagueName ? `${leagueName} — ` : ''

  const [creatingId, setCreatingId] = useState(null)
  const [results, setResults] = useState({})
  const [modalPlaylist, setModalPlaylist] = useState(null)

  const loadSavedPlaylists = useCallback(async () => {
    const { data } = await supabase
      .from('created_playlists')
      .select('playlist_key, league_id, spotify_url')
    if (data) {
      const saved = {}
      data.forEach(row => {
        const stateKey = row.league_id
          ? `${row.league_id}_${row.playlist_key}`
          : row.playlist_key
        saved[stateKey] = { success: true, playlistUrl: row.spotify_url }
      })
      setResults(prev => ({ ...saved, ...prev }))
    }
  }, [])

  useEffect(() => { loadSavedPlaylists() }, [loadSavedPlaylists])

  function getResultKey(playlistId) {
    return selectedLeague ? `${selectedLeague}_${playlistId}` : playlistId
  }

  async function handleCreate(playlist) {
    const resultKey = getResultKey(playlist.id)
    setCreatingId(playlist.id)
    setResults(prev => ({ ...prev, [resultKey]: null }))

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
        setResults(prev => ({ ...prev, [resultKey]: { error: data.error } }))
      } else {
        setResults(prev => ({
          ...prev,
          [resultKey]: { success: true, playlistUrl: data.playlistUrl }
        }))

        await supabase.from('created_playlists').upsert({
          playlist_key: playlist.id,
          league_id: selectedLeague || null,
          spotify_url: data.playlistUrl,
          spotify_playlist_id: data.playlistId || null,
          playlist_name: playlist.name,
        }, { onConflict: 'playlist_key,league_id' })
      }
    } catch (err) {
      setResults(prev => ({
        ...prev,
        [resultKey]: { error: err.message || 'Failed to create playlist' }
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

      <div className="playlists-columns">
      <div className="playlists-col-featured">
      <h2 className="playlists-section-title">Featured Playlists</h2>
      <div className="playlists-grid">
        {featured.map(pl => (
          <PlaylistCard
            key={pl.id}
            playlist={pl}
            prefix={prefix}
            onCreate={handleCreate}
            creating={creatingId === pl.id}
            result={results[getResultKey(pl.id)]}
            onShowTracks={setModalPlaylist}
          />
        ))}
      </div>
      </div>

      <div className="playlists-col-bestof">
        <h2 className="playlists-section-title">Best Of Player</h2>
        <table className="bestof-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Tracks</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bestOfPlaylists.map(pl => (
              <tr key={pl.id}>
                <td className="bestof-player-name">{pl.playerName}</td>
                <td className="bestof-track-count">{pl.trackUris.length}</td>
                <td>
                  <button
                    className="playlist-tracks-toggle"
                    onClick={() => setModalPlaylist(pl)}
                  >
                    Show tracks
                  </button>
                </td>
                <td className="bestof-actions">
                  <button
                    className="playlist-create-btn"
                    disabled={creatingId === pl.id || pl.trackUris.length === 0}
                    onClick={() => handleCreate({ ...pl, name: `${prefix}${pl.name}` })}
                  >
                    {creatingId === pl.id ? 'Creating...' : 'Create on Spotify'}
                  </button>
                  {results[getResultKey(pl.id)]?.success && (
                    <a
                      className="playlist-open-link"
                      href={results[getResultKey(pl.id)].playlistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </a>
                  )}
                  {results[getResultKey(pl.id)]?.error && (
                    <span className="playlist-error-msg">{results[getResultKey(pl.id)].error}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {modalPlaylist && (
        <TrackListModal
          playlist={modalPlaylist}
          onClose={() => setModalPlaylist(null)}
        />
      )}
    </div>
  )
}

export default PlaylistsPage
