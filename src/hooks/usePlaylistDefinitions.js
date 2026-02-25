import { useMemo } from 'react'
import { computeSongScores, computeRoundWinners } from '../utils/analyticsHelpers'

const MAX_TRACKS = 50

// The default league (2026) uses 0-4 points; older leagues used 0-2.
// We detect the max points per league from the data itself.
function getMaxPoints(votes) {
  let max = 0
  for (const v of votes) {
    if (v.points_assigned > max) max = v.points_assigned
  }
  return max
}

export function usePlaylistDefinitions(filteredVotes, filteredSubmissions, players) {
  return useMemo(() => {
    if (!filteredVotes.length || !filteredSubmissions.length) return []

    const maxPts = getMaxPoints(filteredVotes)

    // Use shared helpers for song scores and round winners
    const songScores = computeSongScores(filteredVotes, { maxPts })
    const allSongs = Object.values(songScores)

    // ── 1. Hall of Fame — top songs by total points ──
    const hallOfFame = [...allSongs]
      .sort((a, b) => b.total - a.total || a.song_name.localeCompare(b.song_name))

    // Deduplicate by spotify_uri (same track in multiple rounds → keep highest scoring)
    const dedup = (songs) => {
      const seen = new Set()
      return songs.filter(s => {
        if (seen.has(s.spotify_uri)) return false
        seen.add(s.spotify_uri)
        return true
      })
    }

    const hallOfFameDeduped = dedup(hallOfFame).slice(0, 10)

    // ── 2. Round Winners — #1 song per round, chronological ──
    const roundWinners = computeRoundWinners(songScores)
    const roundWinnersList = Object.values(roundWinners)
      .sort((a, b) => new Date(a.round_date) - new Date(b.round_date))
    const roundWinnersDeduped = dedup(roundWinnersList).slice(0, MAX_TRACKS)

    // ── 3. Best Of [Player] — per player, their highest scoring songs (no 0-point songs) ──
    const playerBestOf = {}
    allSongs.forEach(s => {
      if (s.total <= 0) return
      if (!playerBestOf[s.submitter_id]) playerBestOf[s.submitter_id] = []
      playerBestOf[s.submitter_id].push(s)
    })

    const bestOfPlaylists = (players || []).map(p => {
      const songs = (playerBestOf[p.id] || [])
        .sort((a, b) => b.total - a.total)
      const songsDeduped = dedup(songs).slice(0, 10)
      return {
        id: `best_of_${p.id}`,
        name: `Best Of ${p.name}`,
        description: `${p.name}'s highest-scoring submissions`,
        icon: '👤',
        isPlayerPlaylist: true,
        playerId: p.id,
        playerName: p.name,
        songs: songsDeduped.map(s => ({
          song_name: s.song_name,
          artists: s.artists,
          total: s.total,
          round_name: s.round_name,
          spotify_uri: s.spotify_uri,
        })),
        trackUris: songsDeduped.map(s => s.spotify_uri),
      }
    })

    // ── 6. Player Highlights — each player's single highest-scoring song ──
    const playerHighlights = {}
    allSongs.forEach(s => {
      if (s.total <= 0) return
      if (!playerHighlights[s.submitter_id] || s.total > playerHighlights[s.submitter_id].total) {
        playerHighlights[s.submitter_id] = s
      }
    })
    const playerHighlightsList = Object.values(playerHighlights)
      .sort((a, b) => b.total - a.total)
    const playerHighlightsDeduped = dedup(playerHighlightsList).slice(0, MAX_TRACKS)

    const makeSongList = (songs) => songs.map(s => ({
      song_name: s.song_name,
      artists: s.artists,
      total: s.total,
      round_name: s.round_name,
      spotify_uri: s.spotify_uri,
    }))

    const featured = [
      {
        id: 'hall_of_fame',
        name: 'Hall of Fame',
        description: `Top ${hallOfFameDeduped.length} songs by total points`,
        icon: '🏆',
        songs: makeSongList(hallOfFameDeduped),
        trackUris: hallOfFameDeduped.map(s => s.spotify_uri),
      },
      {
        id: 'round_winners',
        name: 'Round Winners',
        description: 'The #1 song from each round, in chronological order',
        icon: '🥇',
        songs: makeSongList(roundWinnersDeduped),
        trackUris: roundWinnersDeduped.map(s => s.spotify_uri),
      },
      {
        id: 'player_highlights',
        name: 'Player Highlights',
        description: 'Each player\'s single most successful song',
        icon: '⭐',
        songs: makeSongList(playerHighlightsDeduped),
        trackUris: playerHighlightsDeduped.map(s => s.spotify_uri),
      },
    ]

    return { featured, bestOfPlaylists }
  }, [filteredVotes, filteredSubmissions, players])
}
