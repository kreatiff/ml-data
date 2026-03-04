import { useState, useMemo, useEffect, useCallback } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAnalyticsComputations } from '../hooks/useAnalyticsComputations'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSalmonMode } from '../hooks/useSalmonMode'
import { YEAR_TO_LEAGUE, SALMON_YEAR_MAP } from '../constants/leagues'
import VoteHeatmap from '../components/VoteHeatmap'
import MobilePageHeader from '../components/MobilePageHeader'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'
import './AnalyticsPage.css'

const PLAYER_COLORS = [
  '#CCFF00', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F',
  '#BB8FCE', '#F0876A', '#58D68D', '#5DADE2', '#F1948A',
  '#85C1E9', '#E59866', '#82E0AA', '#D7BDE2', '#F8C471',
  '#AED6F1', '#A3E4D7', '#FAD7A0', '#D5F5E3', '#FADBD8'
]

const SORT_KEYS = {
  name: 'name',
  totalPoints: 'totalPoints',
  avgPoints: 'avgPoints',
  submissionCount: 'submissionCount',
  roundWins: 'roundWins',
  bestSongScore: 'bestSongScore',
}



function AnalyticsPage() {
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
    // Re-read after a microtask so CSS variable changes from theme/salmon are applied
    const id = requestAnimationFrame(() => {
      const val = getComputedStyle(document.documentElement).getPropertyValue('--spotify-green').trim()
      setThemeGreen(val || '#CCFF00')
    })
    return () => cancelAnimationFrame(id)
  }, [selectedLeague])

  // Close fullscreen on Escape key
  useEffect(() => {
    if (!trajectoryFullscreen) return
    const handleKey = (e) => { if (e.key === 'Escape') setTrajectoryFullscreen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [trajectoryFullscreen])

  const renderTrajectoryChart = (height) => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={playerTrajectory.data}
        margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="round_label"
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
          height={30}
          interval={0}
        />
        <YAxis
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
          allowDecimals={false}
          label={{ value: 'Total Points', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--spotify-elevated)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '4px',
            color: 'var(--spotify-white)',
            fontSize: '0.85rem'
          }}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.round_name || label}
          itemSorter={(item) => -item.value}
        />
        <Legend content={renderTrajectoryLegend} onClick={handleLegendClick} />
        {playerTrajectory.players.map((name, i) => {
          const hasHighlights = highlightedPlayers.size > 0
          const isHighlighted = !hasHighlights || highlightedPlayers.has(name)
          return (
            <Line
              key={name}
              type={smoothLines ? "monotone" : "linear"}
              dataKey={name}
              stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
              strokeWidth={isHighlighted ? 3 : 1.5}
              strokeOpacity={isHighlighted ? 1 : 0.15}
              dot={isHighlighted ? { r: 3 } : false}
              activeDot={isHighlighted ? { r: 5, cursor: 'pointer', onClick: () => togglePlayer(name) } : false}
              name={name}
              style={{ cursor: 'pointer' }}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )

  if (loading) {
    return <PageLoadingSkeleton />
  }

  if (error) {
    return (
      <div className="analytics-error">
        <h2>Error loading analytics</h2>
        <p>{error}</p>
      </div>
    )
  }

  const leagueSelect = leagues.length >= 1 && (
    <select
      value={selectedLeague}
      onChange={(e) => setSelectedLeague(e.target.value)}
      className="theme-selector filter-select"
    >
      <option value="">All Leagues</option>
      {leagues.map(l => (
        <option key={l.id} value={l.id}>{getLeagueName(l.id, l.name || l.id)}</option>
      ))}
    </select>
  )

  const leagueSelectMobile = leagues.length >= 1 && (
    <select
      value={selectedLeague}
      onChange={(e) => setSelectedLeague(e.target.value)}
      className="theme-selector filter-select"
    >
      <option value="">All</option>
      {leagues.map(l => {
        const fullName = getLeagueName(l.id, l.name || l.id)
        let year = fullName.match(/\d{4}/)?.[0]
        if (!year && fullName.toLowerCase().includes('fearless')) year = '2025'
        year = year || fullName
        return <option key={l.id} value={l.id}>{year}</option>
      })}
    </select>
  )

  return (
    <div className="analytics-page">
      {isMobile && <MobilePageHeader title="Analytics" rightContent={leagueSelectMobile} />}
      {!isMobile && (
        <div className="analytics-header">
          <div className="analytics-header-row">
            <h1>Analytics</h1>
            {leagueSelect}
          </div>
          <div className="analytics-summary">
          <span className="summary-stat"><strong>{totalSubmissions}</strong> submissions</span>
          <span className="summary-divider">/</span>
          <span className="summary-stat"><strong>{totalVotes}</strong> votes</span>
          <span className="summary-divider">/</span>
          <span className="summary-stat"><strong>{playerStats.length}</strong> players</span>
          {activeTeam && (
            <>
              <span className="summary-divider">/</span>
              <span className="summary-stat team-badge">Team: <strong>{activeTeam}</strong></span>
            </>
          )}
          </div>
        </div>
      )}

      {/* Section 1: Player Stats */}
      <section className="analytics-section">
        <h2 className="section-title">Player Stats</h2>
        {isMobile ? (
          <div className="player-cards">
            {sortedPlayerStats.map((p, i) => (
              <div key={p.id} className="player-card">
                <div className="player-card-rank">#{i + 1}</div>
                <div className="player-card-info">
                  <div className="player-card-name">{p.name}</div>
                  <div className="player-card-stats">
                    <span><strong>{p.totalPoints}</strong> pts</span>
                    <span><strong>{p.avgPoints}</strong> avg</span>
                    <span><strong>{p.submissionCount}</strong> songs</span>
                    <span><strong>{p.roundWins}</strong> wins</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th onClick={() => handlePlayerSort('name')} className="sortable">
                    Player {getPlayerSortIcon('name')}
                  </th>
                  <th onClick={() => handlePlayerSort('totalPoints')} className="sortable">
                    Total Pts {getPlayerSortIcon('totalPoints')}
                  </th>
                  <th onClick={() => handlePlayerSort('avgPoints')} className="sortable">
                    Avg Pts {getPlayerSortIcon('avgPoints')}
                  </th>
                  <th onClick={() => handlePlayerSort('submissionCount')} className="sortable">
                    Songs {getPlayerSortIcon('submissionCount')}
                  </th>
                  <th onClick={() => handlePlayerSort('roundWins')} className="sortable">
                    Wins {getPlayerSortIcon('roundWins')}
                  </th>
                  <th onClick={() => handlePlayerSort('bestSongScore')} className="sortable">
                    Best Song {getPlayerSortIcon('bestSongScore')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayerStats.map((p, i) => (
                  <tr key={p.id}>
                    <td className="rank-cell">{i + 1}</td>
                    <td className="player-name-cell">{p.name}</td>
                    <td><strong>{p.totalPoints}</strong></td>
                    <td>{p.avgPoints}</td>
                    <td>{p.submissionCount}</td>
                    <td>{p.roundWins}</td>
                    <td className="best-song-cell" title={p.bestSongName}>
                      {p.bestSongScore} <span className="best-song-label">({p.bestSongName})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section: Player Position Trajectory */}
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
                <div className={`toggle-switch ${smoothLines ? 'active' : ''}`} onClick={() => setSmoothLines(s => { const next = !s; localStorage.setItem('trajectory-smooth-lines', String(next)); return next })}>
                  <div className="toggle-knob" />
                </div>
              </label>
              <button className="expand-btn" onClick={() => setTrajectoryFullscreen(true)} title="View fullscreen">
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
            {renderTrajectoryChart(600)}
          </div>
        </section>
      )}

      {/* Fullscreen Trajectory Modal */}
      {trajectoryFullscreen && (
        <div className="trajectory-modal-backdrop" onClick={() => setTrajectoryFullscreen(false)}>
          <div className="trajectory-modal" onClick={e => e.stopPropagation()}>
            <div className="trajectory-modal-header">
              <h2 className="section-title">Points Trajectory</h2>
              <div className="trajectory-controls">
                <label className="line-style-toggle">
                  <span className="toggle-label">{smoothLines ? 'Smooth' : 'Angled'}</span>
                  <div className={`toggle-switch ${smoothLines ? 'active' : ''}`} onClick={() => setSmoothLines(s => { const next = !s; localStorage.setItem('trajectory-smooth-lines', String(next)); return next })}>
                    <div className="toggle-knob" />
                  </div>
                </label>
                <button className="expand-btn" onClick={() => setTrajectoryFullscreen(false)} title="Close fullscreen">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="4" x2="12" y2="12" />
                    <line x1="12" y1="4" x2="4" y2="12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="trajectory-modal-chart">
              {renderTrajectoryChart('100%')}
            </div>
          </div>
        </div>
      )}

      {/* Section 6: Vote Collection Leaderboard */}
      {voteCollectionBoard.length > 0 && (
        <section className="analytics-section">
          <h2 className="section-title">Gotta Catch 'Em All!</h2>
          <p className="section-desc">Who is closest to receiving a vote from every other player?</p>
          <div className="vote-collection-list">
            {voteCollectionBoard.map((p, i) => (
              <div key={p.id} className="vote-collection-row">
                <div className="vcr-rank">#{i + 1}</div>
                <div className="vcr-info">
                  <div className="vcr-name-row">
                    <span className="vcr-name">{p.name}</span>
                    <span className="vcr-count">{p.uniqueVoters}/{p.totalOthers}</span>
                  </div>
                  <div className="vcr-bar-track">
                    <div
                      className={`vcr-bar-fill ${p.pct === 100 ? 'vcr-complete' : ''}`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                  {p.missing.length > 0 && (
                    <div className="vcr-missing">Missing: {p.missing.join(', ')}</div>
                  )}
                </div>
                <div className="vcr-pct">{p.pct}%</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Voting Patterns Heatmap */}
      <section className="analytics-section">
        <h2 className="section-title">Voting Patterns</h2>
        <p className="section-desc">Total points each voter has given to each submitter across all rounds</p>
        <VoteHeatmap
          matrix={votingPatterns.matrix}
          voters={votingPatterns.voters}
          submitters={votingPatterns.submitters}
        />
      </section>

      {/* Section 3: Most Submitted Artists */}
      {topArtists.length > 0 && (
        <section className="analytics-section">
          <h2 className="section-title">Most Submitted Artists</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={Math.max(400, topArtists.length * 28)}>
              <BarChart
                data={topArtists}
                layout="vertical"
                margin={{ top: 5, right: 30, left: isMobile ? 80 : 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 11 : 12 }}
                  width={isMobile ? 75 : 115}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--spotify-elevated)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: 'var(--spotify-white)',
                    fontSize: '0.85rem'
                  }}
                />
                <Bar dataKey="count" fill={themeGreen} radius={[0, 3, 3, 0]} name="Submissions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Section 4: Underdog Triumphs */}
      {underdogTriumphs.length > 0 && (
        <section className="analytics-section">
          <h2 className="section-title">Underdog Triumphs</h2>
          <p className="section-desc">Rounds won by a player ranked outside the top 3 going in</p>
          {isMobile ? (
            <div className="underdog-cards">
              {underdogTriumphs.map((t, i) => (
                <div key={i} className="underdog-card">
                  <div className="underdog-rank-badge">#{t.position_before} → 🏆</div>
                  <div className="underdog-info">
                    <div className="underdog-winner">{t.winner_name}</div>
                    <div className="underdog-song">{t.song_name}</div>
                    <div className="underdog-artist">{t.artists}</div>
                    <div className="underdog-meta">
                      <span>{t.round_name}</span>
                      <span>{t.round_points} pts</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Winner</th>
                    <th>Song</th>
                    <th>Artist</th>
                    <th>Ranked</th>
                    <th>Round Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {underdogTriumphs.map((t, i) => (
                    <tr key={i}>
                      <td title={t.round_name}>{t.round_name}</td>
                      <td><strong>{t.winner_name}</strong></td>
                      <td className="song-name" title={t.song_name}>{t.song_name}</td>
                      <td title={t.artists}>{t.artists}</td>
                      <td className="underdog-position">#{t.position_before} of {t.total_players}</td>
                      <td>{t.round_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

    </div>
  )
}

export default AnalyticsPage
