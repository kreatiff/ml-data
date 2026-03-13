import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAnalyticsComputations } from '../hooks/useAnalyticsComputations'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSalmonMode } from '../hooks/useSalmonMode'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { YEAR_TO_LEAGUE, SALMON_YEAR_MAP } from '../constants/leagues'
import { PLAYER_COLORS } from '../constants/ui'

// Modular Components
import AnalyticsHeader from '../components/analytics/AnalyticsHeader'
import PlayerStatsTable from '../components/analytics/PlayerStatsTable'
import TrajectorySection from '../components/analytics/TrajectorySection'
import TrajectoryModal from '../components/analytics/TrajectoryModal'
import VoteCollectionBoard from '../components/analytics/VoteCollectionBoard'
import TopArtistsChart from '../components/analytics/TopArtistsChart'
import UnderdogTriumphs from '../components/analytics/UnderdogTriumphs'
import VoteHeatmap from '../components/VoteHeatmap'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'
import RacingBarChartModal from '../components/RacingBarChartModal'

import './AnalyticsPage.css'

const CHART_CONFIG = {
  TRAJECTORY_HEIGHT: 600,
  TRAJECTORY_FULLSCREEN_HEIGHT: '100%',
  ARTISTS_MIN_HEIGHT: 400,
  ARTISTS_ROW_HEIGHT: 28
}

function AnalyticsPage() {
  useDocumentTitle('Number Crunching & Emotional Damage | Dupleighcates')
  const { year: urlYear } = useParams()
  const [searchParams] = useSearchParams()
  const teamParam = searchParams.get('team') || ''

  const {
    loading, error, leagues, activeTeam, selectedLeague, setSelectedLeague,
    filteredVotes, filteredSubmissions,
    totalVotes, totalSubmissions
  } = useAnalytics({ team: teamParam })

  const {
    playerStats, votingPatterns,
    topArtists, underdogTriumphs, playerTrajectory, voteCollectionBoard
  } = useAnalyticsComputations(filteredVotes, filteredSubmissions)

  const { getLeagueName } = useSalmonMode()

  useEffect(() => {
    if (urlYear?.toLowerCase() === 'all') {
      setSelectedLeague('')
    } else {
      const leagueId = YEAR_TO_LEAGUE[urlYear] || SALMON_YEAR_MAP[urlYear?.toLowerCase()]
      if (urlYear && leagueId) {
        setSelectedLeague(leagueId)
      }
    }
  }, [urlYear, setSelectedLeague])

  const isMobile = useIsMobile()
  const [playerSort, setPlayerSort] = useState({ key: 'totalPoints', dir: 'desc' })
  const [smoothLines, setSmoothLines] = useState(() => {
    const stored = localStorage.getItem('trajectory-smooth-lines')
    return stored !== null ? stored === 'true' : true
  })
  const [highlightedPlayers, setHighlightedPlayers] = useState(new Set())
  const [trajectoryFullscreen, setTrajectoryFullscreen] = useState(false)
  const [isRacingOpen, setIsRacingOpen] = useState(searchParams.get('racingMode') === 'true')

  // Support direct link to racing mode
  useEffect(() => {
    if (searchParams.get('racingMode') === 'true' && !isRacingOpen) {
      setIsRacingOpen(true)
    }
  }, [searchParams])

  const togglePlayer = useCallback((name) => {
    setHighlightedPlayers(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }, [])

  const handleLegendClick = useCallback((entry) => {
    togglePlayer(entry.dataKey || entry.value)
  }, [togglePlayer])

  const renderTrajectoryLegend = useCallback(({ payload }) => {
    const hasHighlights = highlightedPlayers.size > 0
    return (
      <div className="trajectory-legend">
        {payload.map((entry) => {
          const isActive = !hasHighlights || highlightedPlayers.has(entry.dataKey || entry.value)
          return (
            <span
              key={entry.value}
              className={`trajectory-legend-item ${isActive ? '' : 'dimmed'}`}
              onClick={() => togglePlayer(entry.dataKey || entry.value)}
            >
              <span className="legend-color" style={{ background: entry.color }} />
              {entry.value}
            </span>
          )
        })}
      </div>
    )
  }, [highlightedPlayers, togglePlayer])

  const sortedPlayerStats = useMemo(() => {
    return [...playerStats].sort((a, b) => {
      const aVal = a[playerSort.key]
      const bVal = b[playerSort.key]
      if (typeof aVal === 'number') {
        return playerSort.dir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const cmp = String(aVal).localeCompare(String(bVal))
      return playerSort.dir === 'asc' ? cmp : -cmp
    })
  }, [playerStats, playerSort])

  const handlePlayerSort = (key) => {
    setPlayerSort(prev => ({
      key,
      dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc'
    }))
  }

  const getPlayerSortIcon = (key) => {
    if (playerSort.key !== key) return '\u2195'
    return playerSort.dir === 'asc' ? '\u2191' : '\u2193'
  }

  const [themeGreen, setThemeGreen] = useState('#CCFF00')
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const val = getComputedStyle(document.documentElement).getPropertyValue('--spotify-green').trim()
      setThemeGreen(val || '#CCFF00')
    })
    return () => cancelAnimationFrame(id)
  }, [selectedLeague])

  if (loading) return <PageLoadingSkeleton />

  if (error) {
    return (
      <div className="analytics-error">
        <h2>Error loading analytics</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="analytics-page">
      <AnalyticsHeader
        isMobile={isMobile}
        leagues={leagues}
        selectedLeague={selectedLeague}
        setSelectedLeague={setSelectedLeague}
        totalSubmissions={totalSubmissions}
        totalVotes={totalVotes}
        playerCount={playerStats.length}
        activeTeam={activeTeam}
        getLeagueName={getLeagueName}
      />

      <section className="analytics-section">
        <h2 className="section-title">Player Stats</h2>
        <PlayerStatsTable
          isMobile={isMobile}
          sortedPlayerStats={sortedPlayerStats}
          handlePlayerSort={handlePlayerSort}
          getPlayerSortIcon={getPlayerSortIcon}
        />
      </section>

      {playerTrajectory.data.length > 0 && (
        <section className="analytics-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Points Trajectory</h2>
              <p className="section-desc">Cumulative points after each round</p>
            </div>
            <div className="trajectory-controls">
              <label className="line-style-toggle">
                <span className="toggle-label">{smoothLines ? 'Smooth' : 'Angled'}</span>
                <div 
                  className={`toggle-switch ${smoothLines ? 'active' : ''}`} 
                  onClick={() => setSmoothLines(s => {
                    const next = !s;
                    localStorage.setItem('trajectory-smooth-lines', String(next));
                    return next;
                  })}
                >
                  <div className="toggle-knob" />
                </div>
              </label>
                            <button 
                className="expand-btn" 
                onClick={() => setIsRacingOpen(true)} 
                title="Racing Leaderboard"
              >
                <svg id="Racing-Helmet--Streamline-Atlas" viewBox="-0.5 -0.5 16 16" height="16" width="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0.9375 8.45v-0.5874999999999999a7.08125 7.08125 0 0 1 1.1937499999999999 -3.9437499999999996L0.9375 2.725v-0.625C1.875 1.60625 4.543749999999999 0.9375 7.5 0.9375c4.175 0 6.5625 2.3874999999999997 6.5625 5.36875v4.65a3.125 3.125 0 0 1 -3.125 3.125 3.125 3.125 0 0 1 -0.925 -0.14375000000000002L3.4499999999999997 11.875a3.5749999999999997 3.5749999999999997 0 0 1 -2.5124999999999997 -3.4250000000000003Z" strokeMiterlimit="10" strokeWidth="1"></path>
                  <path d="M14.0625 11.675a9.375 9.375 0 0 1 -5.4125 -1.73125l-1.0125000000000002 -0.725a1.75625 1.75625 0 0 1 -0.73125 -1.43125 1.7625 1.7625 0 0 1 2.04375 -1.7374999999999998l5.1125 0.8562500000000001" strokeMiterlimit="10" strokeWidth="1"></path>
                  <path d="m9.8875 6.30625 -1.1937499999999999 3.5812500000000003" strokeMiterlimit="10" strokeWidth="1"></path>
                </svg>
              </button>
              <button 
                className="expand-btn" 
                onClick={() => setTrajectoryFullscreen(true)} 
                title="View fullscreen"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="10,2 14,2 14,6" />
                  <polyline points="6,14 2,14 2,10" />
                  <line x1="14" y1="2" x2="9.5" y2="6.5" />
                  <line x1="2" y1="14" x2="6.5" y2="9.5" />
                </svg>
              </button>
            </div>
          </div>
          <div className="chart-container">
            <TrajectorySection
              playerTrajectory={playerTrajectory}
              smoothLines={smoothLines}
              highlightedPlayers={highlightedPlayers}
              togglePlayer={togglePlayer}
              handleLegendClick={handleLegendClick}
              renderTrajectoryLegend={renderTrajectoryLegend}
              height={CHART_CONFIG.TRAJECTORY_HEIGHT}
            />
          </div>
        </section>
      )}

      <TrajectoryModal
        isOpen={trajectoryFullscreen}
        onClose={() => setTrajectoryFullscreen(false)}
        smoothLines={smoothLines}
        setSmoothLines={setSmoothLines}
        setIsRacingOpen={setIsRacingOpen}
        playerTrajectory={playerTrajectory}
        highlightedPlayers={highlightedPlayers}
        togglePlayer={togglePlayer}
        handleLegendClick={handleLegendClick}
        renderTrajectoryLegend={renderTrajectoryLegend}
      />

      <VoteCollectionBoard voteCollectionBoard={voteCollectionBoard} />

      <section className="analytics-section">
        <h2 className="section-title">Voting Patterns</h2>
        <p className="section-desc">Total points each voter has given to each submitter across all rounds</p>
        <VoteHeatmap
          matrix={votingPatterns.matrix}
          voters={votingPatterns.voters}
          submitters={votingPatterns.submitters}
        />
      </section>

      <TopArtistsChart 
        topArtists={topArtists} 
        isMobile={isMobile} 
        themeGreen={themeGreen} 
      />

      <UnderdogTriumphs 
        underdogTriumphs={underdogTriumphs} 
        isMobile={isMobile} 
      />

      {isRacingOpen && (
        <RacingBarChartModal 
          isOpen={isRacingOpen}
          onClose={() => setIsRacingOpen(false)}
          playerTrajectory={playerTrajectory}
          leagues={leagues}
          selectedLeague={selectedLeague}
          setSelectedLeague={setSelectedLeague}
          getLeagueName={getLeagueName}
        />
      )}
    </div>
  )
}

export default AnalyticsPage
