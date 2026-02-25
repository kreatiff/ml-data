/**
 * Analytics computations hook — used only by AnalyticsPage.
 * Takes the filtered data from useAnalytics and computes:
 *   playerStats, votingPatterns, topArtists, underdogTriumphs,
 *   playerTrajectory, voteCollectionBoard
 *
 * This was extracted from useAnalytics to avoid computing these
 * expensive derivations on pages that don't need them (Badges, Playlists).
 */
import { useMemo } from 'react'
import { buildPointsByRoundPlayer, buildNameMap } from '../utils/analyticsHelpers'

export function useAnalyticsComputations(filteredVotes, filteredSubmissions) {
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
            .filter(([, count]) => count > 1)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20)
    }, [filteredSubmissions])

    // 4. Underdog Triumphs (rounds won by the lowest-ranked player going in)
    const underdogTriumphs = useMemo(() => {
        if (filteredSubmissions.length === 0 || filteredVotes.length === 0) return []

        // Collect rounds sorted chronologically
        const roundSet = {}
        filteredSubmissions.forEach(s => {
            if (!roundSet[s.round_id]) {
                roundSet[s.round_id] = { id: s.round_id, name: s.round_name, date: s.round_date }
            }
        })
        const sortedRounds = Object.values(roundSet).sort((a, b) => new Date(a.date) - new Date(b.date))

        // Build per-round per-song scores
        const songScoresByRound = {}
        filteredVotes.forEach(v => {
            if (!songScoresByRound[v.round_id]) songScoresByRound[v.round_id] = {}
            const key = v.spotify_uri
            if (!songScoresByRound[v.round_id][key]) {
                songScoresByRound[v.round_id][key] = {
                    song_name: v.song_name, artists: v.artists,
                    submitter_id: v.submitter_id, pts: 0
                }
            }
            songScoresByRound[v.round_id][key].pts += v.points_assigned
        })

        const pointsByRoundPlayer = buildPointsByRoundPlayer(filteredVotes)
        const playerNameMap = buildNameMap(filteredSubmissions)
        const playerIds = Object.keys(playerNameMap)

        const cumulative = {}
        playerIds.forEach(id => { cumulative[id] = 0 })

        const triumphs = []

        sortedRounds.forEach((round, roundIdx) => {
            const totalPlayers = playerIds.length

            // Rank players by cumulative points BEFORE this round
            const rankedBefore = playerIds
                .map(id => ({ id, pts: cumulative[id] }))
                .sort((a, b) => b.pts - a.pts)

            const positionBefore = {}
            let currentRank = 1
            rankedBefore.forEach((r, i) => {
                if (i > 0 && r.pts < rankedBefore[i - 1].pts) currentRank = i + 1
                positionBefore[r.id] = currentRank
            })

            // Find winning song this round
            const songs = Object.values(songScoresByRound[round.id] || {})
            let winnerSong = null
            songs.forEach(s => {
                if (!winnerSong || s.pts > winnerSong.pts) winnerSong = s
            })

            // Update cumulative for next round
            playerIds.forEach(id => {
                cumulative[id] += (pointsByRoundPlayer[round.id]?.[id] || 0)
            })

            // Skip first round (no prior standings) or if no winner
            if (roundIdx === 0 || !winnerSong) return

            const winnerId = winnerSong.submitter_id
            const pos = positionBefore[winnerId] || totalPlayers

            // Only count if winner was outside top 3 going in
            if (pos <= 3) return

            triumphs.push({
                round_name: round.name,
                winner_name: playerNameMap[winnerId] || 'Unknown',
                song_name: winnerSong.song_name,
                artists: winnerSong.artists,
                round_points: winnerSong.pts,
                position_before: pos,
                total_players: totalPlayers,
            })
        })

        return triumphs.sort((a, b) => b.position_before - a.position_before).slice(0, 15)
    }, [filteredVotes, filteredSubmissions])

    // 5. Player Position Trajectory (leaderboard position after each round)
    const playerTrajectory = useMemo(() => {
        if (filteredSubmissions.length === 0 || filteredVotes.length === 0) return { data: [], players: [] }

        // Collect rounds with dates, sorted chronologically
        const roundSet = {}
        filteredSubmissions.forEach(s => {
            if (!roundSet[s.round_id]) {
                roundSet[s.round_id] = { id: s.round_id, name: s.round_name, date: s.round_date }
            }
        })
        const sortedRounds = Object.values(roundSet).sort((a, b) => new Date(a.date) - new Date(b.date))

        const pointsByRoundPlayer = buildPointsByRoundPlayer(filteredVotes)

        // Get all player IDs + names
        const playerNameMap = buildNameMap(filteredSubmissions)
        const playerIds = Object.keys(playerNameMap)

        // Accumulate cumulative points after each round
        const cumulative = {}
        playerIds.forEach(id => { cumulative[id] = 0 })

        const data = sortedRounds.map((round, idx) => {
            playerIds.forEach(id => {
                cumulative[id] += (pointsByRoundPlayer[round.id]?.[id] || 0)
            })

            const entry = { round_name: round.name, round_label: `R${idx + 1}` }
            playerIds.forEach(id => {
                entry[playerNameMap[id]] = cumulative[id]
            })
            return entry
        })

        const players = playerIds.map(id => playerNameMap[id]).sort()

        // Prepend a "Start" entry where everyone has 0 points
        const zeroEntry = { round_name: 'Start', round_label: '⚬' }
        players.forEach(name => { zeroEntry[name] = 0 })
        data.unshift(zeroEntry)

        return { data, players }
    }, [filteredVotes, filteredSubmissions])

    // 6. "Voted by Everyone" leaderboard
    const voteCollectionBoard = useMemo(() => {
        if (filteredVotes.length === 0) return []

        const playerIds = new Set()
        filteredSubmissions.forEach(s => playerIds.add(s.submitter_id))

        const playerNameMap = {}
        filteredSubmissions.forEach(s => { playerNameMap[s.submitter_id] = s.submitter_name })

        const totalOthers = playerIds.size - 1
        if (totalOthers <= 0) return []

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
        playerStats,
        votingPatterns,
        topArtists,
        underdogTriumphs,
        playerTrajectory,
        voteCollectionBoard,
    }
}
