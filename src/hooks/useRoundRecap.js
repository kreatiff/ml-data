/**
 * useRoundRecap — computes recap data for a specific round.
 * Takes the full votes/submissions from AnalyticsDataContext and a roundId,
 * then derives winner, score distribution, movers, controversial pick,
 * prediction accuracy, comments, and summary stats.
 *
 * No new Supabase calls — entirely derived from existing context data.
 */
import { useMemo } from 'react'
import {
  computeSongScores, buildSortedRounds, buildStandingsHistory,
  buildNameMap
} from '../utils/analyticsHelpers'

/**
 * @param {Array} allVotes    - flat vote records from AnalyticsDataContext
 * @param {Array} allSubmissions - flat submission records
 * @param {string|null} roundId  - the round to compute recap for
 * @returns {Object} recapData
 */
export function useRoundRecap(allVotes, allSubmissions, roundId) {

  // ── Sorted rounds list (for navigation / latest detection) ──
  const rounds = useMemo(() => {
    if (!allSubmissions.length) return []
    const roundSet = {}
    allSubmissions.forEach(s => {
      if (!roundSet[s.round_id]) {
        roundSet[s.round_id] = { id: s.round_id, name: s.round_name, date: s.round_date }
      }
    })
    return Object.values(roundSet).sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [allSubmissions])

  const latestRoundId = useMemo(() => {
    return rounds.length > 0 ? rounds[rounds.length - 1].id : null
  }, [rounds])

  // ── Full song scores across ALL rounds (needed for standings history) ──
  const allSongScores = useMemo(() => {
    if (!allVotes.length) return {}
    return computeSongScores(allVotes, { trackVotes: true })
  }, [allVotes])

  // ── All player IDs ──
  const allPlayerIds = useMemo(() => {
    return [...new Set(allSubmissions.map(s => s.submitter_id))]
  }, [allSubmissions])

  const nameMap = useMemo(() => buildNameMap(allSubmissions), [allSubmissions])

  // ── Standings history (cumulative leaderboard after each round) ──
  const standingsHistory = useMemo(() => {
    if (!allVotes.length || !allPlayerIds.length) return []
    const { sortedRoundIds } = buildSortedRounds(allVotes)
    return buildStandingsHistory({
      sortedRoundIds,
      songScores: allSongScores,
      allPlayerIds,
    })
  }, [allVotes, allSongScores, allPlayerIds])

  // ── Recap data for the selected round ──
  const recapData = useMemo(() => {
    if (!roundId || !allVotes.length || !allSubmissions.length) return null

    // -- Round votes and songs --
    const roundVotes = allVotes.filter(v => v.round_id === roundId)
    if (roundVotes.length === 0) return null

    const roundSongScores = computeSongScores(roundVotes, { trackVotes: true })
    const songsList = Object.values(roundSongScores).sort((a, b) => b.total - a.total)

    // 1. Winner
    const winnerSong = songsList[0] || null
    const winner = winnerSong ? {
      songName: winnerSong.song_name,
      artists: winnerSong.artists,
      submitterName: winnerSong.submitter_name,
      score: winnerSong.total,
      spotifyUri: winnerSong.spotify_uri,
    } : null

    // 2. Score distribution
    const scoreDistribution = songsList.map(ss => ({
      songName: ss.song_name,
      artists: ss.artists,
      submitterName: ss.submitter_name,
      score: ss.total,
    }))

    // 3. Leaderboard movers
    let biggestMover = null
    let biggestFaller = null

    const roundIndex = standingsHistory.findIndex(sh => sh.round_id === roundId)
    if (roundIndex > 0) {
      const before = standingsHistory[roundIndex - 1].rankings
      const after = standingsHistory[roundIndex].rankings

      const beforeRankMap = {}
      before.forEach(r => { beforeRankMap[r.id] = r.rank })
      const afterRankMap = {}
      after.forEach(r => { afterRankMap[r.id] = r.rank })

      let bestImprove = 0
      let worstDrop = 0

      allPlayerIds.forEach(id => {
        const rankBefore = beforeRankMap[id] || allPlayerIds.length
        const rankAfter = afterRankMap[id] || allPlayerIds.length
        const change = rankBefore - rankAfter // positive = moved up

        if (change > bestImprove) {
          bestImprove = change
          biggestMover = {
            name: nameMap[id] || 'Unknown',
            positionChange: change,
            positionBefore: rankBefore,
            positionAfter: rankAfter,
          }
        }
        if (change < worstDrop) {
          worstDrop = change
          biggestFaller = {
            name: nameMap[id] || 'Unknown',
            positionChange: change,
            positionBefore: rankBefore,
            positionAfter: rankAfter,
          }
        }
      })
    }

    // 4. Controversial pick (highest vote variance)
    let controversialPick = null
    let highestVariance = -1

    songsList.forEach(ss => {
      if (!ss.votes || ss.votes.length < 2) return
      const mean = ss.total / ss.votes.length
      const variance = ss.votes.reduce((sum, v) => sum + (v - mean) ** 2, 0) / ss.votes.length
      if (variance > highestVariance) {
        highestVariance = variance
        controversialPick = {
          songName: ss.song_name,
          artists: ss.artists,
          submitterName: ss.submitter_name,
          score: ss.total,
          variance: Math.round(variance * 100) / 100,
          votes: [...ss.votes].sort((a, b) => b - a),
        }
      }
    })

    // 5. Prediction accuracy
    // How close each voter's point allocation was to the final ordering
    // Lower "error" = more accurate predictor
    const finalRanking = songsList.map(ss => ss.spotify_uri)
    const voterPoints = {}
    roundVotes.forEach(v => {
      if (!voterPoints[v.voter_id]) voterPoints[v.voter_id] = {}
      if (!voterPoints[v.voter_id][v.spotify_uri]) voterPoints[v.voter_id][v.spotify_uri] = 0
      voterPoints[v.voter_id][v.spotify_uri] += v.points_assigned
    })

    const predictionAccuracy = Object.entries(voterPoints).map(([voterId, songPts]) => {
      // Rank the songs by this voter's points (desc)
      const voterRanked = Object.entries(songPts)
        .sort((a, b) => b[1] - a[1])
        .map(([uri]) => uri)

      // Sum of absolute rank differences between voter's ranking and final ranking
      let totalDiff = 0
      voterRanked.forEach((uri, voterRank) => {
        const finalRank = finalRanking.indexOf(uri)
        if (finalRank >= 0) {
          totalDiff += Math.abs(voterRank - finalRank)
        }
      })

      // Normalize to 0-100 accuracy score
      const maxPossibleDiff = finalRanking.length * finalRanking.length
      const accuracy = Math.round((1 - totalDiff / maxPossibleDiff) * 100)

      return {
        name: nameMap[voterId] || roundVotes.find(v => v.voter_id === voterId)?.voter_name || 'Unknown',
        accuracy: Math.max(0, accuracy),
      }
    }).sort((a, b) => b.accuracy - a.accuracy)

    // 6. Comments (extract all vote comments to attach to songs)
    const songComments = {}
    roundVotes.forEach(v => {
      if (v.comment && v.comment.trim()) {
        if (!songComments[v.spotify_uri]) songComments[v.spotify_uri] = []
        songComments[v.spotify_uri].push({
          voterName: v.voter_name,
          comment: v.comment.trim(),
          pointsAssigned: v.points_assigned,
        })
      }
    })

    // 7. Assemble the Songs List (with comments attached) for the right column
    const roundSongs = songsList.map((ss, index) => ({
      rank: index + 1,
      songName: ss.song_name,
      artists: ss.artists,
      submitterName: ss.submitter_name,
      submitterAvatarUrl: ss.submitter_avatar_url,
      score: ss.total,
      spotifyUri: ss.spotify_uri,
      comments: songComments[ss.spotify_uri] || [],
    }))

    // 8. Round stats
    const allScores = songsList.map(ss => ss.total)
    const stats = {
      totalSongs: songsList.length,
      totalVotes: roundVotes.length,
      avgScore: songsList.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / songsList.length) : 0,
      highestScore: allScores.length > 0 ? Math.max(...allScores) : 0,
      lowestScore: allScores.length > 0 ? Math.min(...allScores) : 0,
    }

    // Round name
    const roundInfo = rounds.find(r => r.id === roundId)

    return {
      roundName: roundInfo?.name || 'Unknown',
      roundDate: roundInfo?.date || '',
      winner,
      scoreDistribution,
      biggestMover,
      biggestFaller,
      controversialPick,
      predictionAccuracy,
      roundSongs,
      stats,
    }
  }, [roundId, allVotes, allSubmissions, standingsHistory, allPlayerIds, nameMap, rounds, allSongScores])

  return {
    rounds,
    latestRoundId,
    recapData,
  }
}
