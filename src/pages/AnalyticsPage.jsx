import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useAnalytics } from '../hooks/useAnalytics'
import { useIsMobile } from '../hooks/useMediaQuery'
import VoteHeatmap from '../components/VoteHeatmap'
import './AnalyticsPage.css'

const SORT_KEYS = {
  name: 'name',
  totalPoints: 'totalPoints',
  avgPoints: 'avgPoints',
  submissionCount: 'submissionCount',
  roundWins: 'roundWins',
  bestSongScore: 'bestSongScore',
}

function AnalyticsPage() {
  const [searchParams] = useSearchParams()
  const teamParam = searchParams.get('team') || ''

  const {
    loading, error, leagues, activeTeam, selectedLeague, setSelectedLeague,
    playerStats, votingPatterns,
    topArtists, controversialSongs, roundTrends,
    totalVotes, totalSubmissions
  } = useAnalytics({ team: teamParam })

  const isMobile = useIsMobile()
  const [playerSort, setPlayerSort] = useState({ key: 'totalPoints', dir: 'desc' })

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

  const themeGreen = useMemo(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--spotify-green').trim()
    return val || '#CCFF00'
  }, [])

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>
  }

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
      <div className="analytics-header">
        <div className="analytics-header-row">
          <h1>Analytics</h1>
          {leagues.length >= 1 && (
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="league-filter"
            >
              <option value="">All Leagues</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name || l.id}</option>
              ))}
            </select>
          )}
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

      {/* Section 4: Controversial Songs */}
      <section className="analytics-section">
        <h2 className="section-title">Most Controversial Songs</h2>
        <p className="section-desc">Songs with the widest range of opinions (highest vote variance)</p>
        {isMobile ? (
          <div className="controversial-cards">
            {controversialSongs.map((s, i) => (
              <div key={i} className="controversial-card">
                <div className="controversial-rank">#{i + 1}</div>
                <div className="controversial-info">
                  <div className="controversial-song">{s.song_name}</div>
                  <div className="controversial-artist">{s.artists}</div>
                  <div className="controversial-meta">
                    <span>by {s.submitter_name}</span>
                    <span>Avg: {s.avgVote}</span>
                    <span>Spread: {s.minVote}–{s.maxVote}</span>
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
                  <th>Song</th>
                  <th>Artist</th>
                  <th>Submitter</th>
                  <th>Round</th>
                  <th>Avg Vote</th>
                  <th>Spread</th>
                  <th>Variance</th>
                  <th>Total Pts</th>
                </tr>
              </thead>
              <tbody>
                {controversialSongs.map((s, i) => (
                  <tr key={i}>
                    <td className="rank-cell">{i + 1}</td>
                    <td className="song-name" title={s.song_name}>{s.song_name}</td>
                    <td title={s.artists}>{s.artists}</td>
                    <td>{s.submitter_name}</td>
                    <td title={s.round_name}>{s.round_name}</td>
                    <td>{s.avgVote}</td>
                    <td>{s.minVote}–{s.maxVote}</td>
                    <td><strong>{s.variance}</strong></td>
                    <td>{s.totalPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 5: Trends Over Time */}
      <section className="analytics-section">
        <h2 className="section-title">Trends Over Time</h2>
        <p className="section-desc">How scores, submissions, and participation change across rounds</p>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart
              data={roundTrends}
              margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="round_name"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--spotify-elevated)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: 'var(--spotify-white)',
                  fontSize: '0.85rem'
                }}
              />
              <Legend wrapperStyle={{ color: 'var(--spotify-gray)', fontSize: '0.8rem' }} />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke={themeGreen}
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Avg Score"
              />
              <Line
                type="monotone"
                dataKey="submissionCount"
                stroke="#FF6B6B"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Submissions"
              />
              <Line
                type="monotone"
                dataKey="voterCount"
                stroke="#4ECDC4"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Voters"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

export default AnalyticsPage
