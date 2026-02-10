import { useMemo } from 'react'

import crownJewelImg from '../assets/badges/crown_jewels.jpg'
import consistentImg from '../assets/badges/consistent.jpg'
import oneHitWonderImg from '../assets/badges/one_hit_wonder.jpg'
import coldStreakImg from '../assets/badges/cold_streak.jpg'
import summitImg from '../assets/badges/summit.jpg'
import reignImg from '../assets/badges/reign.jpg'
import podiumImg from '../assets/badges/podium.jpg'
import hotStreakImg from '../assets/badges/hot_streak.jpg'
import darkHorseImg from '../assets/badges/dark_horse.jpg'
import hitOracleImg from '../assets/badges/hit_oracle.jpg'
import stalkerImg from '../assets/badges/stalker.jpg'
import nonConformistImg from '../assets/badges/non_conformist.jpg'
import crowdPleaserImg from '../assets/badges/crowd_pleaser.jpg'
import controversialImg from '../assets/badges/controversial.jpg'
import hipsterImg from '../assets/badges/hipster.jpg'

const BADGE_DEFS = [
  // Performance
  { id: 'crown_jewel', name: 'Crown Jewel', image: crownJewelImg, category: 'Performance', description: 'Won the most rounds' },
  { id: 'consistent', name: 'Consistent', image: consistentImg, category: 'Performance', description: 'Highest average points per song (min 3 rounds)' },
  { id: 'one_hit_wonder', name: 'One Hit Wonder', image: oneHitWonderImg, category: 'Performance', description: 'Has a song scoring 2x+ their own average' },
  { id: 'cold_streak', name: 'Cold Streak', image: coldStreakImg, category: 'Performance', description: 'Most submissions with 0 points' },
  // Standings History
  { id: 'summit', name: 'Reached the Summit', image: summitImg, category: 'Standings', description: 'Was #1 overall at any point during the league' },
  { id: 'reign', name: 'Reign', image: reignImg, category: 'Standings', description: 'Most consecutive rounds spent at #1 overall' },
  { id: 'podium', name: 'Podium', image: podiumImg, category: 'Standings', description: 'Most consecutive rounds at #2 or #3 overall' },
  { id: 'hot_streak', name: 'Hot Streak', image: hotStreakImg, category: 'Standings', description: 'Most consecutive rounds finishing top 3 in a round' },
  { id: 'dark_horse', name: 'Dark Horse', image: darkHorseImg, category: 'Standings', description: 'Won a round while ranked in the bottom half overall' },
  // Voting Style
  { id: 'kingmaker', name: 'Hit Oracle', image: hitOracleImg, category: 'Voting', description: 'Predicted the crowd favourite the most, voting for the round winner more than anyone else' },
  { id: 'stalker', name: 'Stalker', image: stalkerImg, category: 'Voting', description: 'Highest total points given to a single other player' },
  { id: 'nonconformist', name: 'Non-conformist', image: nonConformistImg, category: 'Voting', description: 'Most points given to songs that finished last in their round' },
  // Social
  { id: 'crowd_pleaser', name: 'Crowd Pleaser', image: crowdPleaserImg, category: 'Social', description: 'Most 4-point votes received across all rounds' },
  { id: 'controversial', name: 'Controversial', image: controversialImg, category: 'Social', description: 'Submitted the song with the highest vote variance' },
  { id: 'hipster', name: 'Hipster', image: hipsterImg, category: 'Social', description: 'Most unique artists (artists nobody else submitted)' },
]

export function useBadges(filteredVotes, filteredSubmissions) {
  return useMemo(() => {
    if (!filteredVotes.length || !filteredSubmissions.length) {
      return BADGE_DEFS.map(d => ({ ...d, players: [], achieved: false }))
    }

    // ── Precompute shared structures ──

    // Song scores: total points per (round_id, spotify_uri)
    const songScores = {}
    filteredVotes.forEach(v => {
      const key = `${v.round_id}_${v.spotify_uri}`
      if (!songScores[key]) {
        songScores[key] = { round_id: v.round_id, spotify_uri: v.spotify_uri, submitter_id: v.submitter_id, submitter_name: v.submitter_name, song_name: v.song_name, artists: v.artists, total: 0, votes: [] }
      }
      songScores[key].total += v.points_assigned
      songScores[key].votes.push(v.points_assigned)
    })

    // Round winners (highest scoring song per round)
    const roundWinners = {} // round_id → { submitter_id, total }
    const roundLastPlace = {} // round_id → min total score
    Object.values(songScores).forEach(ss => {
      if (!roundWinners[ss.round_id] || ss.total > roundWinners[ss.round_id].total) {
        roundWinners[ss.round_id] = { submitter_id: ss.submitter_id, submitter_name: ss.submitter_name, total: ss.total, spotify_uri: ss.spotify_uri }
      }
      if (roundLastPlace[ss.round_id] === undefined || ss.total < roundLastPlace[ss.round_id]) {
        roundLastPlace[ss.round_id] = ss.total
      }
    })

    // Per-player stats
    const playerMap = {} // id → { name, totalPoints, songCount, bestSongScore, bestSongAvg, roundWins, zeroSongs }
    filteredSubmissions.forEach(s => {
      if (!playerMap[s.submitter_id]) {
        playerMap[s.submitter_id] = { name: s.submitter_name, totalPoints: 0, songCount: 0, bestSongScore: 0, roundWins: 0, zeroSongs: 0 }
      }
      playerMap[s.submitter_id].songCount++
    })

    Object.values(songScores).forEach(ss => {
      if (playerMap[ss.submitter_id]) {
        playerMap[ss.submitter_id].totalPoints += ss.total
        if (ss.total > playerMap[ss.submitter_id].bestSongScore) {
          playerMap[ss.submitter_id].bestSongScore = ss.total
        }
        if (ss.total === 0) {
          playerMap[ss.submitter_id].zeroSongs++
        }
      }
    })

    Object.entries(roundWinners).forEach(([, w]) => {
      if (playerMap[w.submitter_id]) playerMap[w.submitter_id].roundWins++
    })

    // Rounds sorted chronologically by round_date (rounds.created_at)
    const roundDates = {}
    filteredVotes.forEach(v => {
      if (v.round_id && v.round_date && !roundDates[v.round_id]) {
        roundDates[v.round_id] = v.round_date
      }
    })
    const sortedRoundIds = Object.keys(roundDates).sort((a, b) => {
      return new Date(roundDates[a]) - new Date(roundDates[b])
    })

    // Name map for convenience
    const nameMap = {}
    Object.entries(playerMap).forEach(([id, p]) => { nameMap[id] = p.name })

    // ── Helper: pick players with max value ──
    function pickMax(entries, minVal = 1) {
      // entries: [{ id, name, stat }]
      if (entries.length === 0) return []
      const max = Math.max(...entries.map(e => e.stat))
      if (max < minVal) return []
      return entries.filter(e => e.stat === max)
    }

    // ── Badge computations ──

    const badgeResults = {}

    // 1. Crown Jewel — most round wins
    badgeResults.crown_jewel = pickMax(
      Object.entries(playerMap).map(([id, p]) => ({ id, name: p.name, stat: p.roundWins }))
    )

    // 2. Consistent — highest avg pts per song, min 3 rounds
    const avgEntries = Object.entries(playerMap)
      .filter(([, p]) => p.songCount >= 3)
      .map(([id, p]) => ({ id, name: p.name, stat: Math.round((p.totalPoints / p.songCount) * 100) / 100 }))
    badgeResults.consistent = pickMax(avgEntries)

    // 3. One Hit Wonder — has a song scoring 2x+ their average
    badgeResults.one_hit_wonder = Object.entries(playerMap)
      .filter(([, p]) => {
        if (p.songCount < 2) return false
        const avg = p.totalPoints / p.songCount
        return avg > 0 && p.bestSongScore >= avg * 2
      })
      .map(([id, p]) => {
        const avg = Math.round((p.totalPoints / p.songCount) * 100) / 100
        return { id, name: p.name, stat: `Best: ${p.bestSongScore} (avg ${avg})` }
      })

    // 4. Cold Streak — most submissions with 0 points
    const zeroEntries = Object.entries(playerMap)
      .filter(([, p]) => p.zeroSongs > 0)
      .map(([id, p]) => ({ id, name: p.name, stat: p.zeroSongs }))
    badgeResults.cold_streak = pickMax(zeroEntries)

    // ── Standings History ──
    // Simulate cumulative standings after each round
    const cumulativePoints = {} // playerId → running total
    const allPlayerIds = Object.keys(playerMap)
    allPlayerIds.forEach(id => { cumulativePoints[id] = 0 })

    const standingsHistory = [] // [{ round_id, rankings: [{ id, total, rank }] }]

    sortedRoundIds.forEach(roundId => {
      // Add this round's song scores to cumulative
      Object.values(songScores).forEach(ss => {
        if (ss.round_id === roundId && cumulativePoints[ss.submitter_id] !== undefined) {
          cumulativePoints[ss.submitter_id] += ss.total
        }
      })

      // Rank players
      const ranked = allPlayerIds
        .map(id => ({ id, total: cumulativePoints[id] }))
        .sort((a, b) => b.total - a.total)

      ranked.forEach((r, i) => {
        r.rank = (i === 0 || ranked[i - 1].total !== r.total) ? i + 1 : ranked[i - 1].rank
      })

      standingsHistory.push({ round_id: roundId, rankings: ranked })
    })

    // DEBUG: log standings history to help verify Summit badge
    console.log('[Badges] Round order:', sortedRoundIds.map(id => ({ id, date: roundDates[id] })))
    console.log('[Badges] Standings history:', standingsHistory.map(s => ({
      round_id: s.round_id,
      top3: s.rankings.slice(0, 3).map(r => `${r.rank}. ${nameMap[r.id] || r.id} (${r.total})`)
    })))

    // 5. Reached the Summit — was ever #1
    const summitPlayers = new Set()
    standingsHistory.forEach(s => {
      s.rankings.forEach(r => {
        if (r.rank === 1) summitPlayers.add(r.id)
      })
    })
    badgeResults.summit = [...summitPlayers].map(id => ({ id, name: nameMap[id] || 'Unknown', stat: '#1' }))

    // 6. Reign — most consecutive rounds at #1
    const reignStreaks = {}
    allPlayerIds.forEach(id => { reignStreaks[id] = { max: 0, current: 0 } })
    standingsHistory.forEach(s => {
      allPlayerIds.forEach(id => {
        const r = s.rankings.find(x => x.id === id)
        if (r && r.rank === 1) {
          reignStreaks[id].current++
          if (reignStreaks[id].current > reignStreaks[id].max) reignStreaks[id].max = reignStreaks[id].current
        } else {
          reignStreaks[id].current = 0
        }
      })
    })
    badgeResults.reign = pickMax(
      allPlayerIds.map(id => ({ id, name: nameMap[id] || 'Unknown', stat: reignStreaks[id].max }))
    )

    // 7. Podium — most consecutive rounds at #2 or #3 overall
    const podiumStreaks = {}
    allPlayerIds.forEach(id => { podiumStreaks[id] = { max: 0, current: 0 } })
    standingsHistory.forEach(s => {
      allPlayerIds.forEach(id => {
        const r = s.rankings.find(x => x.id === id)
        if (r && (r.rank === 2 || r.rank === 3)) {
          podiumStreaks[id].current++
          if (podiumStreaks[id].current > podiumStreaks[id].max) podiumStreaks[id].max = podiumStreaks[id].current
        } else {
          podiumStreaks[id].current = 0
        }
      })
    })
    badgeResults.podium = pickMax(
      allPlayerIds.map(id => ({ id, name: nameMap[id] || 'Unknown', stat: podiumStreaks[id].max }))
    )

    // 8. Hot Streak — most consecutive rounds finishing top 3 IN A ROUND (round winner/2nd/3rd)
    // For each round, get top 3 scorers
    const roundTop3 = {}
    sortedRoundIds.forEach(roundId => {
      const roundSongs = Object.values(songScores).filter(ss => ss.round_id === roundId)
      roundSongs.sort((a, b) => b.total - a.total)
      const top3Ids = new Set(roundSongs.slice(0, 3).map(ss => ss.submitter_id))
      roundTop3[roundId] = top3Ids
    })
    const hotStreaks = {}
    allPlayerIds.forEach(id => { hotStreaks[id] = { max: 0, current: 0 } })
    sortedRoundIds.forEach(roundId => {
      allPlayerIds.forEach(id => {
        if (roundTop3[roundId]?.has(id)) {
          hotStreaks[id].current++
          if (hotStreaks[id].current > hotStreaks[id].max) hotStreaks[id].max = hotStreaks[id].current
        } else {
          hotStreaks[id].current = 0
        }
      })
    })
    badgeResults.hot_streak = pickMax(
      allPlayerIds.map(id => ({ id, name: nameMap[id] || 'Unknown', stat: hotStreaks[id].max }))
    )

    // 9. Dark Horse — won a round while ranked in the bottom half overall
    const darkHorsePlayers = new Set()
    standingsHistory.forEach(s => {
      const half = Math.ceil(s.rankings.length / 2)
      const winner = roundWinners[s.round_id]
      if (!winner) return
      const winnerRanking = s.rankings.find(r => r.id === winner.submitter_id)
      if (winnerRanking && winnerRanking.rank > half) {
        darkHorsePlayers.add(winner.submitter_id)
      }
    })
    badgeResults.dark_horse = [...darkHorsePlayers].map(id => ({ id, name: nameMap[id] || 'Unknown', stat: 'Won from bottom half' }))

    // ── Voting Style ──

    // 10. Kingmaker — most rounds where they voted for the round winner
    const kingmakerCounts = {}
    filteredVotes.forEach(v => {
      const winner = roundWinners[v.round_id]
      if (winner && v.spotify_uri === winner.spotify_uri && v.points_assigned > 0) {
        kingmakerCounts[v.voter_id] = (kingmakerCounts[v.voter_id] || 0) + 1
      }
    })
    // Deduplicate per round (a voter votes for the winning song once per round)
    const kingmakerRounds = {}
    filteredVotes.forEach(v => {
      const winner = roundWinners[v.round_id]
      if (winner && v.spotify_uri === winner.spotify_uri && v.points_assigned > 0) {
        if (!kingmakerRounds[v.voter_id]) kingmakerRounds[v.voter_id] = new Set()
        kingmakerRounds[v.voter_id].add(v.round_id)
      }
    })
    badgeResults.kingmaker = pickMax(
      Object.entries(kingmakerRounds).map(([id, rounds]) => ({ id, name: nameMap[id] || 'Unknown', stat: rounds.size }))
    )

    // 11. Stalker — highest total points given to a single other player
    const pairPoints = {} // `voterId_submitterId` → total
    filteredVotes.forEach(v => {
      if (v.voter_id === v.submitter_id) return
      const key = `${v.voter_id}_${v.submitter_id}`
      pairPoints[key] = (pairPoints[key] || 0) + v.points_assigned
    })
    let maxPairPts = 0
    Object.values(pairPoints).forEach(pts => { if (pts > maxPairPts) maxPairPts = pts })
    badgeResults.stalker = maxPairPts > 0
      ? Object.entries(pairPoints)
          .filter(([, pts]) => pts === maxPairPts)
          .map(([key]) => {
            const [voterId, submitterId] = key.split('_')
            return { id: voterId, name: nameMap[voterId] || 'Unknown', stat: `${maxPairPts} pts → ${nameMap[submitterId] || 'Unknown'}` }
          })
      : []

    // 12. Non-conformist — most points given to songs that finished last in their round
    const nonconformistPts = {}
    filteredVotes.forEach(v => {
      const key = `${v.round_id}_${v.spotify_uri}`
      const ss = songScores[key]
      if (ss && ss.total === roundLastPlace[v.round_id] && v.points_assigned > 0) {
        nonconformistPts[v.voter_id] = (nonconformistPts[v.voter_id] || 0) + v.points_assigned
      }
    })
    badgeResults.nonconformist = pickMax(
      Object.entries(nonconformistPts).map(([id, pts]) => ({ id, name: nameMap[id] || 'Unknown', stat: pts }))
    )

    // ── Social ──

    // 13. Crowd Pleaser — most 4-point votes received
    const fourPtReceived = {}
    filteredVotes.forEach(v => {
      if (v.points_assigned === 4) {
        fourPtReceived[v.submitter_id] = (fourPtReceived[v.submitter_id] || 0) + 1
      }
    })
    badgeResults.crowd_pleaser = pickMax(
      Object.entries(fourPtReceived).map(([id, count]) => ({ id, name: nameMap[id] || 'Unknown', stat: count }))
    )

    // 14. Controversial — song with highest vote variance
    let maxVariance = 0
    let controversialEntries = []
    Object.values(songScores).forEach(ss => {
      if (ss.votes.length < 3) return
      const mean = ss.votes.reduce((a, b) => a + b, 0) / ss.votes.length
      const variance = ss.votes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / ss.votes.length
      const rounded = Math.round(variance * 100) / 100
      if (rounded > maxVariance) {
        maxVariance = rounded
        controversialEntries = [{ id: ss.submitter_id, name: ss.submitter_name, stat: `${ss.song_name} (var: ${rounded})` }]
      } else if (rounded === maxVariance && rounded > 0) {
        controversialEntries.push({ id: ss.submitter_id, name: ss.submitter_name, stat: `${ss.song_name} (var: ${rounded})` })
      }
    })
    badgeResults.controversial = controversialEntries

    // 15. Hipster — most unique artists (artists nobody else submitted)
    // Use the full artists string per submission (not split by comma)
    // so "Artist A, Artist B" is one entry, max = number of submissions
    const artistSubmitters = {} // artist → Set of submitter_ids
    filteredSubmissions.forEach(s => {
      if (s.artists) {
        const artist = s.artists.trim()
        if (artist) {
          if (!artistSubmitters[artist]) artistSubmitters[artist] = new Set()
          artistSubmitters[artist].add(s.submitter_id)
        }
      }
    })
    const uniqueArtistCount = {} // submitter_id → count of artists only they submitted
    Object.entries(artistSubmitters).forEach(([, submitters]) => {
      if (submitters.size === 1) {
        const id = [...submitters][0]
        uniqueArtistCount[id] = (uniqueArtistCount[id] || 0) + 1
      }
    })
    badgeResults.hipster = pickMax(
      Object.entries(uniqueArtistCount).map(([id, count]) => ({ id, name: nameMap[id] || 'Unknown', stat: count }))
    )

    // ── Assemble final badges array ──
    return BADGE_DEFS.map(def => ({
      ...def,
      players: badgeResults[def.id] || [],
      achieved: (badgeResults[def.id] || []).length > 0,
    }))
  }, [filteredVotes, filteredSubmissions])
}
