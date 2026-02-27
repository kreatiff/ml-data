/**
 * useMyStats — personal analytics computations for the logged-in user.
 * Derives all data from the already-fetched filteredVotes/filteredSubmissions.
 * No new Supabase calls.
 */
import { useMemo } from 'react'
import {
  computeSongScores, buildSortedRounds, buildPointsByRoundPlayer
} from '../utils/analyticsHelpers'

/**
 * @param {Array} filteredVotes
 * @param {Array} filteredSubmissions
 * @param {string|null} myId - competitor ID of the logged-in user
 * @param {Object} votingPatterns - { matrix, voters, submitters } from useAnalyticsComputations
 * @param {Array} playerStats - from useAnalyticsComputations
 * @param {string|null} compareId - competitor ID for head-to-head comparison
 */
export function useMyStats(filteredVotes, filteredSubmissions, myId, votingPatterns, playerStats, compareId) {

  const myName = useMemo(() => {
    if (!myId) return null
    const sub = filteredSubmissions.find(s => s.submitter_id === myId)
    return sub?.submitter_name || null
  }, [filteredSubmissions, myId])

  // ── My rank from playerStats ──
  const myRank = useMemo(() => {
    if (!myId || !playerStats.length) return null
    const sorted = [...playerStats].sort((a, b) => b.totalPoints - a.totalPoints)
    const idx = sorted.findIndex(p => p.id === myId)
    return idx >= 0 ? idx + 1 : null
  }, [playerStats, myId])

  const myPlayerStats = useMemo(() => {
    if (!myId) return null
    return playerStats.find(p => p.id === myId) || null
  }, [playerStats, myId])

  // ── Round-by-round breakdown ──
  const roundBreakdown = useMemo(() => {
    if (!myId || !filteredVotes.length || !filteredSubmissions.length) return []

    const songScores = computeSongScores(filteredVotes)
    const { sortedRoundIds } = buildSortedRounds(filteredVotes)

    // Build round name lookup
    const roundNames = {}
    filteredVotes.forEach(v => {
      if (!roundNames[v.round_id]) roundNames[v.round_id] = v.round_name
    })

    return sortedRoundIds.map((roundId, idx) => {
      // All songs in this round, sorted by score
      const roundSongs = Object.values(songScores)
        .filter(ss => ss.round_id === roundId)
        .sort((a, b) => b.total - a.total)

      // Find the user's song
      const mySong = roundSongs.find(ss => ss.submitter_id === myId)
      if (!mySong) return null

      // Determine placement
      const placement = roundSongs.findIndex(ss =>
        ss.spotify_uri === mySong.spotify_uri
      ) + 1

      return {
        roundId,
        roundLabel: `R${idx + 1}`,
        roundName: roundNames[roundId] || 'Unknown',
        songName: mySong.song_name,
        artists: mySong.artists,
        score: mySong.total,
        placement,
        totalSongs: roundSongs.length,
        isWin: placement === 1,
        isTop3: placement <= 3,
      }
    }).filter(Boolean)
  }, [filteredVotes, filteredSubmissions, myId])

  // ── Voting DNA ──
  const votingDna = useMemo(() => {
    if (!myName || !votingPatterns.matrix) return { given: [], received: [] }

    // Who I vote for (my row in the matrix)
    const myRow = votingPatterns.matrix[myName] || {}
    const given = Object.entries(myRow)
      .filter(([name]) => name !== myName)
      .map(([name, pts]) => ({ name, points: pts }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 7)

    // Who votes for me (column scan)
    const received = []
    votingPatterns.voters.forEach(voter => {
      if (voter === myName) return
      const pts = votingPatterns.matrix[voter]?.[myName] || 0
      if (pts > 0) received.push({ name: voter, points: pts })
    })
    received.sort((a, b) => b.points - a.points)

    return { given, received: received.slice(0, 7) }
  }, [myName, votingPatterns])

  // ── Personal records ──
  const personalRecords = useMemo(() => {
    if (!myId || !roundBreakdown.length) return null

    // Best song
    const best = roundBreakdown.reduce((a, b) => (a.score > b.score ? a : b), roundBreakdown[0])

    // Worst song
    const worst = roundBreakdown.reduce((a, b) => (a.score < b.score ? a : b), roundBreakdown[0])

    // Longest top-3 streak
    let maxStreak = 0, streak = 0
    roundBreakdown.forEach(r => {
      if (r.isTop3) { streak++; if (streak > maxStreak) maxStreak = streak }
      else streak = 0
    })

    // Zero-point songs
    const zeroCount = roundBreakdown.filter(r => r.score === 0).length

    // Win count
    const wins = roundBreakdown.filter(r => r.isWin).length

    // Average placement
    const avgPlacement = roundBreakdown.length > 0
      ? Math.round((roundBreakdown.reduce((sum, r) => sum + r.placement, 0) / roundBreakdown.length) * 10) / 10
      : 0

    return {
      bestSong: { name: best.songName, artists: best.artists, score: best.score, round: best.roundName },
      worstSong: { name: worst.songName, artists: worst.artists, score: worst.score, round: worst.roundName },
      longestTop3Streak: maxStreak,
      zeroPointSongs: zeroCount,
      wins,
      avgPlacement,
      totalRounds: roundBreakdown.length,
    }
  }, [myId, roundBreakdown])

  // ── Head-to-head comparison ──
  const headToHead = useMemo(() => {
    if (!myId || !compareId || !filteredVotes.length) return null

    const compareStats = playerStats.find(p => p.id === compareId)
    if (!compareStats) return null

    const pointsByRoundPlayer = buildPointsByRoundPlayer(filteredVotes)
    const { sortedRoundIds } = buildSortedRounds(filteredVotes)

    // Round name lookup
    const roundNames = {}
    filteredVotes.forEach(v => { if (!roundNames[v.round_id]) roundNames[v.round_id] = v.round_name })

    // Per-round comparison
    let myWins = 0, theirWins = 0, ties = 0
    const roundComparison = sortedRoundIds.map((roundId, idx) => {
      const myPts = pointsByRoundPlayer[roundId]?.[myId] || 0
      const theirPts = pointsByRoundPlayer[roundId]?.[compareId] || 0

      if (myPts > theirPts) myWins++
      else if (theirPts > myPts) theirWins++
      else ties++

      return {
        roundLabel: `R${idx + 1}`,
        roundName: roundNames[roundId] || '',
        myPts,
        theirPts,
      }
    }).filter(r => r.myPts > 0 || r.theirPts > 0) // only rounds where at least one participated

    return {
      compareName: compareStats.name,
      compareStats,
      myWins,
      theirWins,
      ties,
      roundComparison,
    }
  }, [myId, compareId, filteredVotes, playerStats])

  return {
    myName,
    myRank,
    myPlayerStats,
    roundBreakdown,
    votingDna,
    personalRecords,
    headToHead,
  }
}
