import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'

export function useAnalytics({ team } = {}) {
  const [votes, setVotes] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [competitors, setCompetitors] = useState([])
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState('fe08d6855f204613b30922e34a7486c6')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        // Helper to fetch all rows (Supabase defaults to 1000 row limit)
        async function fetchAll(table, columns) {
          const PAGE_SIZE = 1000
          let allData = []
          let from = 0
          let hasMore = true
          while (hasMore) {
            const { data, error } = await supabase
              .from(table)
              .select(columns)
              .range(from, from + PAGE_SIZE - 1)
            if (error) throw error
            allData = allData.concat(data)
            hasMore = data.length === PAGE_SIZE
            from += PAGE_SIZE
          }
          return allData
        }

        const [votesData, submissionsData, competitorsData, roundsData] = await Promise.all([
          fetchAll('votes', 'round_id, spotify_uri, voter_id, points_assigned, comment, imported_at'),
          fetchAll('submissions', 'round_id, spotify_uri, song_name, artists, album, created_at, submitter_id'),
          fetchAll('competitors', 'id, name, team'),
          fetchAll('rounds', 'id, name, created_at, league_id')
        ])

        // Leagues fetch is non-fatal (may be blocked by RLS)
        let leaguesData = []
        try {
          leaguesData = await fetchAll('leagues', 'id, name')
        } catch (e) {
          console.warn('Could not fetch leagues table (may need RLS policy):', e.message)
        }

        if (!isMounted) return

        // Build lookup maps
        const competitorMap = {}
        const competitorTeamMap = {}
        competitorsData.forEach(c => {
          competitorMap[c.id] = c.name
          competitorTeamMap[c.id] = c.team || ''
        })

        setCompetitors(competitorsData)

        const roundMap = {}
        roundsData.forEach(r => { roundMap[r.id] = { name: r.name, created_at: r.created_at, league_id: r.league_id } })

        const submissionMap = {}
        submissionsData.forEach(s => {
          submissionMap[`${s.round_id}_${s.spotify_uri}`] = s
        })

        // Flatten votes with joined data
        const flatVotes = votesData.map(v => {
          const sub = submissionMap[`${v.round_id}_${v.spotify_uri}`]
          const round = roundMap[v.round_id]
          return {
            round_id: v.round_id,
            spotify_uri: v.spotify_uri,
            voter_id: v.voter_id,
            voter_name: competitorMap[v.voter_id] || 'Unknown',
            voter_team: competitorTeamMap[v.voter_id] || '',
            points_assigned: v.points_assigned,
            comment: v.comment || '',
            song_name: sub?.song_name || 'Unknown',
            artists: sub?.artists || 'Unknown',
            album: sub?.album || '',
            submitter_id: sub?.submitter_id || '',
            submitter_name: sub ? (competitorMap[sub.submitter_id] || 'Unknown') : 'Unknown',
            submitter_team: sub ? (competitorTeamMap[sub.submitter_id] || '') : '',
            round_name: round?.name || 'Unknown',
            round_date: round?.created_at || '',
            league_id: round?.league_id || '',
            imported_at: v.imported_at || ''
          }
        })

        const flatSubmissions = submissionsData.map(s => ({
          round_id: s.round_id,
          spotify_uri: s.spotify_uri,
          song_name: s.song_name,
          artists: s.artists,
          album: s.album,
          created_at: s.created_at,
          submitter_id: s.submitter_id,
          submitter_name: competitorMap[s.submitter_id] || 'Unknown',
          submitter_team: competitorTeamMap[s.submitter_id] || '',
          round_name: roundMap[s.round_id]?.name || 'Unknown',
          round_date: roundMap[s.round_id]?.created_at || '',
          league_id: roundMap[s.round_id]?.league_id || ''
        }))

        setVotes(flatVotes)
        setSubmissions(flatSubmissions)


        // Derive leagues from rounds data, enrich with league table names
        const leagueNameMap = {}
        leaguesData.forEach(l => { leagueNameMap[l.id] = l.name })
        const uniqueLeagueIds = [...new Set(roundsData.map(r => r.league_id).filter(Boolean))]
        const derivedLeagues = uniqueLeagueIds.map(id => ({
          id,
          name: leagueNameMap[id] || id
        }))
        setLeagues(derivedLeagues)
      } catch (err) {
        console.error('Error fetching analytics data:', err)
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()
    return () => { isMounted = false }
  }, [])

  // Derive teams and team filter reactively from competitors + team prop
  const teams = useMemo(() => {
    return [...new Set(competitors.map(c => c.team).filter(Boolean))].sort()
  }, [competitors])

  const teamPlayerIds = useMemo(() => {
    const normalizedTeam = team?.trim().toUpperCase() || ''
    if (!normalizedTeam) return null
    const valid = teams.some(t => t.toUpperCase() === normalizedTeam)
    if (!valid) return null
    return new Set(competitors.filter(c => c.team && c.team.toUpperCase() === normalizedTeam).map(c => c.id))
  }, [competitors, teams, team])

  // Filter by team (from URL param), then by league
  const teamFilteredVotes = useMemo(() => {
    if (!teamPlayerIds) return votes
    return votes.filter(v => teamPlayerIds.has(v.submitter_id))
  }, [votes, teamPlayerIds])

  const teamFilteredSubmissions = useMemo(() => {
    if (!teamPlayerIds) return submissions
    return submissions.filter(s => teamPlayerIds.has(s.submitter_id))
  }, [submissions, teamPlayerIds])

  const filteredVotes = useMemo(() => {
    if (!selectedLeague) return teamFilteredVotes
    return teamFilteredVotes.filter(v => v.league_id === selectedLeague)
  }, [teamFilteredVotes, selectedLeague])

  const filteredSubmissions = useMemo(() => {
    if (!selectedLeague) return teamFilteredSubmissions
    return teamFilteredSubmissions.filter(s => s.league_id === selectedLeague)
  }, [teamFilteredSubmissions, selectedLeague])

  // 1. Player Stats
  const playerStats = useMemo(() => {
    if (filteredSubmissions.length === 0) return []

    const players = {}

    // Initialize from submissions
    filteredSubmissions.forEach(s => {
      if (!players[s.submitter_id]) {
        players[s.submitter_id] = {
          name: s.submitter_name,
          totalPoints: 0,
          submissionCount: 0,
          roundWins: 0,
          bestSongScore: 0,
          bestSongName: '',
        }
      }
      players[s.submitter_id].submissionCount++
    })

    // Calculate per-submission scores
    const submissionScores = {}
    filteredVotes.forEach(v => {
      const key = `${v.round_id}_${v.spotify_uri}`
      if (!submissionScores[key]) {
        submissionScores[key] = {
          round_id: v.round_id,
          submitter_id: v.submitter_id,
          song_name: v.song_name,
          totalPoints: 0
        }
      }
      submissionScores[key].totalPoints += v.points_assigned
    })

    // Accumulate points per player + track best song
    Object.values(submissionScores).forEach(sub => {
      if (players[sub.submitter_id]) {
        players[sub.submitter_id].totalPoints += sub.totalPoints
        if (sub.totalPoints > players[sub.submitter_id].bestSongScore) {
          players[sub.submitter_id].bestSongScore = sub.totalPoints
          players[sub.submitter_id].bestSongName = sub.song_name
        }
      }
    })

    // Determine round winners
    const roundBest = {}
    Object.values(submissionScores).forEach(sub => {
      if (!roundBest[sub.round_id] || sub.totalPoints > roundBest[sub.round_id].totalPoints) {
        roundBest[sub.round_id] = sub
      }
    })
    Object.values(roundBest).forEach(winner => {
      if (players[winner.submitter_id]) {
        players[winner.submitter_id].roundWins++
      }
    })

    return Object.entries(players).map(([id, p]) => ({
      id,
      name: p.name,
      totalPoints: p.totalPoints,
      avgPoints: p.submissionCount > 0 ? Math.round((p.totalPoints / p.submissionCount) * 100) / 100 : 0,
      submissionCount: p.submissionCount,
      roundWins: p.roundWins,
      bestSongScore: p.bestSongScore,
      bestSongName: p.bestSongName,
    })).sort((a, b) => b.totalPoints - a.totalPoints)
  }, [filteredVotes, filteredSubmissions])

  // 2. Voting Patterns (who votes for whom)
  const votingPatterns = useMemo(() => {
    if (filteredVotes.length === 0) return { matrix: {}, voters: [], submitters: [] }

    const matrix = {}
    const voterSet = new Set()
    const submitterSet = new Set()

    filteredVotes.forEach(v => {
      voterSet.add(v.voter_name)
      submitterSet.add(v.submitter_name)
      
      if (!matrix[v.voter_name]) matrix[v.voter_name] = {}
      if (!matrix[v.voter_name][v.submitter_name]) matrix[v.voter_name][v.submitter_name] = 0
      matrix[v.voter_name][v.submitter_name] += v.points_assigned
    })

    const voters = [...voterSet].sort()
    const submitters = [...submitterSet].sort()

    return { matrix, voters, submitters }
  }, [filteredVotes])

  // 3. Most Submitted Artists
  const topArtists = useMemo(() => {
    if (filteredSubmissions.length === 0) return []

    const artistCount = {}
    filteredSubmissions.forEach(s => {
      if (s.artists) {
        // Split multi-artist strings and count each
        const artists = s.artists.split(/,\s*/)
        artists.forEach(artist => {
          const trimmed = artist.trim()
          if (trimmed) {
            artistCount[trimmed] = (artistCount[trimmed] || 0) + 1
          }
        })
      }
    })

    return Object.entries(artistCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [filteredSubmissions])

  // 4. Controversial Songs (highest vote variance)
  const controversialSongs = useMemo(() => {
    if (filteredVotes.length === 0) return []

    const songVotes = {}
    filteredVotes.forEach(v => {
      const key = `${v.round_id}_${v.spotify_uri}`
      if (!songVotes[key]) {
        songVotes[key] = {
          song_name: v.song_name,
          artists: v.artists,
          submitter_name: v.submitter_name,
          round_name: v.round_name,
          votes: []
        }
      }
      songVotes[key].votes.push(v.points_assigned)
    })

    return Object.values(songVotes)
      .filter(s => s.votes.length >= 3) // Need enough votes for variance to be meaningful
      .map(s => {
        const mean = s.votes.reduce((a, b) => a + b, 0) / s.votes.length
        const variance = s.votes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / s.votes.length
        const maxVote = Math.max(...s.votes)
        const minVote = Math.min(...s.votes)
        return {
          ...s,
          avgVote: Math.round(mean * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          spread: maxVote - minVote,
          voteCount: s.votes.length,
          maxVote,
          minVote,
          totalPoints: s.votes.reduce((a, b) => a + b, 0)
        }
      })
      .sort((a, b) => b.variance - a.variance)
      .slice(0, 20)
  }, [filteredVotes])

  // 5. Trends Over Time (per-round stats)
  const roundTrends = useMemo(() => {
    if (filteredSubmissions.length === 0) return []

    // Group submissions by round
    const rounds = {}
    filteredSubmissions.forEach(s => {
      if (!rounds[s.round_id]) {
        rounds[s.round_id] = {
          round_id: s.round_id,
          round_name: s.round_name,
          round_date: s.round_date,
          submissionCount: 0,
          voterSet: new Set(),
          totalPoints: 0,
          voteCount: 0
        }
      }
      rounds[s.round_id].submissionCount++
    })

    // Add vote data per round
    filteredVotes.forEach(v => {
      if (rounds[v.round_id]) {
        rounds[v.round_id].voterSet.add(v.voter_id)
        rounds[v.round_id].totalPoints += v.points_assigned
        rounds[v.round_id].voteCount++
      }
    })

    return Object.values(rounds)
      .map(r => ({
        round_name: r.round_name,
        round_date: r.round_date,
        submissionCount: r.submissionCount,
        voterCount: r.voterSet.size,
        avgScore: r.submissionCount > 0
          ? Math.round((r.totalPoints / r.submissionCount) * 100) / 100
          : 0
      }))
      .sort((a, b) => new Date(a.round_date) - new Date(b.round_date))
  }, [filteredVotes, filteredSubmissions])

  // 6. "Voted by Everyone" leaderboard
  const voteCollectionBoard = useMemo(() => {
    if (filteredVotes.length === 0) return []

    // Get all player IDs who appear as submitters in filtered data
    const playerIds = new Set()
    filteredSubmissions.forEach(s => playerIds.add(s.submitter_id))

    const playerNameMap = {}
    filteredSubmissions.forEach(s => { playerNameMap[s.submitter_id] = s.submitter_name })

    const totalOthers = playerIds.size - 1
    if (totalOthers <= 0) return []

    // For each submitter, collect unique voters who are also in the player set
    const uniqueVotersPerPlayer = {}
    playerIds.forEach(id => { uniqueVotersPerPlayer[id] = new Set() })

    filteredVotes.forEach(v => {
      if (playerIds.has(v.submitter_id) && playerIds.has(v.voter_id) && v.voter_id !== v.submitter_id && v.points_assigned > 0) {
        uniqueVotersPerPlayer[v.submitter_id].add(v.voter_id)
      }
    })

    return [...playerIds].map(id => {
      const received = uniqueVotersPerPlayer[id]
      const missing = [...playerIds].filter(pid => pid !== id && !received.has(pid))
        .map(pid => playerNameMap[pid] || 'Unknown')
      return {
        id,
        name: playerNameMap[id] || 'Unknown',
        uniqueVoters: received.size,
        totalOthers,
        pct: Math.round((received.size / totalOthers) * 100),
        missing,
      }
    }).sort((a, b) => b.uniqueVoters - a.uniqueVoters || a.name.localeCompare(b.name))
  }, [filteredVotes, filteredSubmissions])

  return {
    loading,
    error,
    leagues,
    teams,
    activeTeam: teamPlayerIds ? team : null,
    selectedLeague,
    setSelectedLeague,
    playerStats,
    votingPatterns,
    topArtists,
    controversialSongs,
    roundTrends,
    voteCollectionBoard,
    filteredVotes,
    filteredSubmissions,
    totalVotes: filteredVotes.length,
    totalSubmissions: filteredSubmissions.length,
  }
}
