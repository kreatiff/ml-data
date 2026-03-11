/**
 * AnalyticsDataContext — caches the raw analytics data (votes, submissions,
 * competitors, leagues) in React Context so it's fetched once from Supabase
 * and shared across all pages (Analytics, Badges, Playlists).
 *
 * Before this, each page independently called useAnalytics which re-fetched
 * all 4 tables on every mount/navigation.
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

const AnalyticsDataContext = createContext(null)

/**
 * Paginated Supabase fetch — handles the 1000-row default limit.
 */
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

export function AnalyticsDataProvider({ children }) {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let isMounted = true

        async function fetchData() {
            try {
                const [votesData, submissionsData, competitorsData, roundsData] = await Promise.all([
                    fetchAll('votes', 'round_id, spotify_uri, voter_id, points_assigned, comment, imported_at, created_at'),
                    fetchAll('submissions', 'round_id, spotify_uri, song_name, artists, album, created_at, submitter_id'),
                    fetchAll('competitors', 'id, name, team, avatar_url'),
                    fetchAll('rounds', 'id, name, started_at, league_id')
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
                const competitorAvatarMap = {}
                competitorsData.forEach(c => {
                    competitorMap[c.id] = c.name
                    competitorTeamMap[c.id] = c.team || ''
                    competitorAvatarMap[c.id] = c.avatar_url || ''
                })

                const roundMap = {}
                roundsData.forEach(r => { roundMap[r.id] = { name: r.name, started_at: r.started_at, league_id: r.league_id } })

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
                        voter_avatar: competitorAvatarMap[v.voter_id] || '',
                        points_assigned: v.points_assigned,
                        comment: v.comment || '',
                        song_name: sub?.song_name || 'Unknown',
                        artists: sub?.artists || 'Unknown',
                        album: sub?.album || '',
                        submitter_id: sub?.submitter_id || '',
                        submitter_name: sub ? (competitorMap[sub.submitter_id] || 'Unknown') : 'Unknown',
                        submitter_team: sub ? (competitorTeamMap[sub.submitter_id] || '') : '',
                        submitter_avatar: sub ? (competitorAvatarMap[sub.submitter_id] || '') : '',
                        round_name: round?.name || 'Unknown',
                        round_date: round?.started_at || '',
                        league_id: round?.league_id || '',
                        imported_at: v.imported_at || '',
                        vote_created_at: v.created_at || ''
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
                    submitter_avatar: competitorAvatarMap[s.submitter_id] || '',
                    round_name: roundMap[s.round_id]?.name || 'Unknown',
                    round_date: roundMap[s.round_id]?.started_at || '',
                    league_id: roundMap[s.round_id]?.league_id || ''
                }))

                // Derive leagues from rounds data, enrich with league table names
                const leagueNameMap = {}
                leaguesData.forEach(l => { leagueNameMap[l.id] = l.name })
                const uniqueLeagueIds = [...new Set(roundsData.map(r => r.league_id).filter(Boolean))]
                const derivedLeagues = uniqueLeagueIds.map(id => ({
                    id,
                    name: leagueNameMap[id] || id
                }))

                setData({
                    votes: flatVotes,
                    submissions: flatSubmissions,
                    competitors: competitorsData,
                    leagues: derivedLeagues,
                })
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

    return (
        <AnalyticsDataContext.Provider value={{ data, loading, error }}>
            {children}
        </AnalyticsDataContext.Provider>
    )
}

export function useAnalyticsData() {
    const ctx = useContext(AnalyticsDataContext)
    if (!ctx) {
        throw new Error('useAnalyticsData must be used within <AnalyticsDataProvider>')
    }
    return ctx
}
