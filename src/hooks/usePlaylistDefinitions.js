import { useMemo } from 'react'

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

    // ── Shared structures ──

    // Song scores: total points per unique (round_id, spotify_uri)
    const songScores = {}
    filteredVotes.forEach(v => {
      const key = `${v.round_id}_${v.spotify_uri}`
      if (!songScores[key]) {
        songScores[key] = {
          round_id: v.round_id,
          spotify_uri: v.spotify_uri,
          song_name: v.song_name,
          artists: v.artists,
          submitter_id: v.submitter_id,
          submitter_name: v.submitter_name,
          round_name: v.round_name,
          round_date: v.round_date,
          total: 0,
          maxVoteCount: 0,
          voterCount: 0,
        }
      }
      songScores[key].total += v.points_assigned
      if (v.points_assigned === maxPts) songScores[key].maxVoteCount++
      songScores[key].voterCount++
    })

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

    const hallOfFameDeduped = dedup(hallOfFame).slice(0, MAX_TRACKS)

    // ── 2. Round Winners — #1 song per round, chronological ──
    const roundWinners = {}
    allSongs.forEach(s => {
      if (!roundWinners[s.round_id] || s.total > roundWinners[s.round_id].total) {
        roundWinners[s.round_id] = s
      }
    })
    const roundWinnersList = Object.values(roundWinners)
      .sort((a, b) => new Date(a.round_date) - new Date(b.round_date))
    const roundWinnersDeduped = dedup(roundWinnersList).slice(0, MAX_TRACKS)

    // ── 3. Crowd Pleasers — most max-point votes received ──
    const crowdPleasers = [...allSongs]
      .filter(s => s.maxVoteCount > 0)
      .sort((a, b) => b.maxVoteCount - a.maxVoteCount || b.total - a.total)
    const crowdPleasersDeduped = dedup(crowdPleasers).slice(0, MAX_TRACKS)

    // ── 4. The Bottom Shelf — lowest scoring songs with > 0 votes ──
    const bottomShelf = [...allSongs]
      .filter(s => s.total > 0)
      .sort((a, b) => a.total - b.total || a.song_name.localeCompare(b.song_name))
    const bottomShelfDeduped = dedup(bottomShelf).slice(0, MAX_TRACKS)

    // ── 5. Best Of [Player] — per player, their highest scoring songs (no 0-point songs) ──
    const playerBestOf = {}
    allSongs.forEach(s => {
      if (s.total <= 0) return
      if (!playerBestOf[s.submitter_id]) playerBestOf[s.submitter_id] = []
      playerBestOf[s.submitter_id].push(s)
    })

    const bestOfPlaylists = (players || []).map(p => {
      const songs = (playerBestOf[p.id] || [])
        .sort((a, b) => b.total - a.total)
      const songsDeduped = dedup(songs).slice(0, MAX_TRACKS)
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

    // ── 6. Sub-zero — only songs with 0 total points ──
    const subZero = [...allSongs]
      .filter(s => s.total === 0)
      .sort((a, b) => a.song_name.localeCompare(b.song_name))
    const subZeroDeduped = dedup(subZero).slice(0, MAX_TRACKS)

    // Also include submissions that received NO votes at all
    const scoredKeys = new Set(Object.keys(songScores))
    const noVoteSongs = filteredSubmissions
      .filter(s => !scoredKeys.has(`${s.round_id}_${s.spotify_uri}`))
      .map(s => ({
        spotify_uri: s.spotify_uri,
        song_name: s.song_name,
        artists: s.artists,
        total: 0,
        round_name: s.round_name,
      }))

    const allSubZero = [...subZeroDeduped.map(s => ({
      spotify_uri: s.spotify_uri,
      song_name: s.song_name,
      artists: s.artists,
      total: 0,
      round_name: s.round_name,
    })), ...noVoteSongs]

    const subZeroFinal = dedup(allSubZero).slice(0, MAX_TRACKS)

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
        description: `Top ${hallOfFameDeduped.length} songs by total points across all rounds`,
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
        id: 'crowd_pleasers',
        name: 'Crowd Pleasers',
        description: `Songs with the most ${maxPts}-point (max) votes received`,
        icon: '🎉',
        songs: makeSongList(crowdPleasersDeduped),
        trackUris: crowdPleasersDeduped.map(s => s.spotify_uri),
      },
      {
        id: 'bottom_shelf',
        name: 'The Bottom Shelf',
        description: 'Lowest-scoring songs that still got some love (more than 0 votes)',
        icon: '📉',
        songs: makeSongList(bottomShelfDeduped),
        trackUris: bottomShelfDeduped.map(s => s.spotify_uri),
      },
      {
        id: 'sub_zero',
        name: 'Sub-zero',
        description: 'Songs that received zero points — the ultimate underdogs',
        icon: '🥶',
        songs: subZeroFinal.map(s => ({
          song_name: s.song_name,
          artists: s.artists,
          total: 0,
          round_name: s.round_name,
          spotify_uri: s.spotify_uri,
        })),
        trackUris: subZeroFinal.map(s => s.spotify_uri),
      },
    ]

    return { featured, bestOfPlaylists }
  }, [filteredVotes, filteredSubmissions, players])
}
