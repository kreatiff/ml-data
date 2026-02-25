/**
 * useAnalytics — thin hook that reads cached data from AnalyticsDataContext
 * and applies team/league filtering. No Supabase calls here.
 */
import { useMemo, useState } from 'react'
import { useAnalyticsData } from '../contexts/AnalyticsDataContext'
import { DEFAULT_LEAGUE_ID } from '../constants/leagues'

export function useAnalytics({ team } = {}) {
  const { data, loading, error } = useAnalyticsData()
  const [selectedLeague, setSelectedLeague] = useState(DEFAULT_LEAGUE_ID)

  const votes = data?.votes || []
  const submissions = data?.submissions || []
  const competitors = data?.competitors || []
  const leagues = data?.leagues || []

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

  return {
    loading,
    error,
    leagues,
    teams,
    activeTeam: teamPlayerIds ? team : null,
    selectedLeague,
    setSelectedLeague,
    filteredVotes,
    filteredSubmissions,
    totalVotes: filteredVotes.length,
    totalSubmissions: filteredSubmissions.length,
  }
}
