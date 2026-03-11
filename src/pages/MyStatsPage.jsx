import { useState, useMemo, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAnalyticsComputations } from '../hooks/useAnalyticsComputations'
import { useBadges } from '../hooks/useBadges'
import { useMyStats } from '../hooks/useMyStats'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useSalmonMode } from '../hooks/useSalmonMode'
import { YEAR_TO_LEAGUE, SALMON_YEAR_MAP } from '../constants/leagues'
import InitialsAvatar from '../components/InitialsAvatar'
import { useItunesArt } from '../hooks/useItunesArt'
import MobilePageHeader from '../components/MobilePageHeader'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'
import ExportableBadgeCard from '../components/analytics/ExportableBadgeCard'
import './MyStatsPage.css'

const TOOLTIP_STYLE = {
  background: 'var(--spotify-elevated)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '4px',
  color: 'var(--spotify-white)',
  fontSize: '0.85rem'
}

function ordSuffix(n) {
  if (n >= 11 && n <= 13) return 'th'
  const rem = n % 10
  if (rem === 1) return 'st'
  if (rem === 2) return 'nd'
  if (rem === 3) return 'rd'
  return 'th'
}

function MyStatsPage() {
  const { year: urlYear } = useParams()
  const { user, profile, loading: authLoading } = useAuth()
  const isMobile = useIsMobile()
  const { getLeagueName } = useSalmonMode()

  const {
    loading, error, leagues, selectedLeague, setSelectedLeague,
    filteredVotes, filteredSubmissions,
  } = useAnalytics()

  const {
    playerStats, votingPatterns, playerTrajectory
  } = useAnalyticsComputations(filteredVotes, filteredSubmissions)

  const badges = useBadges(filteredVotes, filteredSubmissions)

  const myId = profile?.id || null

  const [compareId, setCompareId] = useState('')
  const [exportBadge, setExportBadge] = useState(null)
  const [exportPlayer, setExportPlayer] = useState(null)

  const {
    myName, myRank, myPlayerStats,
    roundBreakdown, votingDna, personalRecords, headToHead
  } = useMyStats(filteredVotes, filteredSubmissions, myId, votingPatterns, playerStats, compareId)

  // Year-to-league URL syncing (same pattern as AnalyticsPage)
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

  // Read theme green for charts
  const [themeGreen, setThemeGreen] = useState('#CCFF00')
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const val = getComputedStyle(document.documentElement).getPropertyValue('--spotify-green').trim()
      setThemeGreen(val || '#CCFF00')
    })
    return () => cancelAnimationFrame(id)
  }, [selectedLeague])

  // ── My trajectory data: my line + field average ──
  const myTrajectoryData = useMemo(() => {
    if (!myName || !playerTrajectory.data.length || !playerTrajectory.players.length) return []
    const playerCount = playerTrajectory.players.length
    return playerTrajectory.data.map(entry => {
      const fieldTotal = playerTrajectory.players.reduce((sum, name) => sum + (entry[name] || 0), 0)
      return {
        round_label: entry.round_label,
        round_name: entry.round_name,
        [myName]: entry[myName] || 0,
        'Field Avg': Math.round(fieldTotal / playerCount),
      }
    })
  }, [myName, playerTrajectory])

  // ── My badges ──
  const myBadges = useMemo(() => {
    if (!myId) return { earned: [], unearned: [], total: 0 }
    const all = badges.filter(b => b.id !== 'infinity_gauntlet')
    const earned = all.filter(b => b.players.some(p => p.id === myId))
    const unearned = all.filter(b => !b.players.some(p => p.id === myId))
    return { earned, unearned, total: all.length }
  }, [badges, myId])

  // ── iTunes art for round breakdown ──
  const itunesSongs = useMemo(() =>
    roundBreakdown.map(r => ({ key: r.roundId, songName: r.songName, artists: r.artists })),
  [roundBreakdown])
  const artMap = useItunesArt(itunesSongs)

  // ── Other players for H2H dropdown ──
  const otherPlayers = useMemo(() => {
    return playerStats.filter(p => p.id !== myId).sort((a, b) => a.name.localeCompare(b.name))
  }, [playerStats, myId])

  // ── Loading state (check before user/profile missing) ──
  if (authLoading || loading) {
    return <PageLoadingSkeleton />
  }

  // ── Not logged in ──
  if (!user) {
    return (
      <div className="mystats-gate">
        <div className="mystats-gate-icon">📊</div>
        <h2>Sign in to see your stats</h2>
        <p>Log in to view your personal analytics dashboard.</p>
      </div>
    )
  }

  // ── No linked profile ──
  if (!profile?.id) {
    return (
      <div className="mystats-gate">
        <div className="mystats-gate-icon">🔗</div>
        <h2>Link your profile</h2>
        <p>Go to your <Link to="/profile" className="mystats-link">Profile page</Link> to link your account to a competitor.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mystats-error">
        <h2>Error loading stats</h2>
        <p>{error}</p>
      </div>
    )
  }

  if (!myPlayerStats) {
    return (
      <div className="mystats-gate">
        <div className="mystats-gate-icon">🔍</div>
        <h2>No data found</h2>
        <p>We couldn't find any submissions for your profile in this league. Try switching leagues above.</p>
      </div>
    )
  }

  const badgePct = myBadges.total > 0 ? Math.round((myBadges.earned.length / myBadges.total) * 100) : 0

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
    <div className="mystats-page">
      {/* Header */}
      {isMobile && <MobilePageHeader title="My Stats" rightContent={leagueSelectMobile} />}
      {!isMobile && (
        <div className="mystats-header">
          <div className="mystats-header-row">
            <h1>My Stats</h1>
            {leagueSelect}
          </div>
        </div>
      )}

      {/* 1. Hero Card */}
      <section className="mystats-hero">
        <div className="mystats-hero-identity">
          <div className="mystats-hero-avatar-wrap">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={myName} className="mystats-hero-avatar" />
            ) : (
              <InitialsAvatar name={myName} size={72} />
            )}
            <div className="mystats-hero-rank-badge">#{myRank}</div>
          </div>
          <div>
            <h2 className="mystats-hero-name">{myName}</h2>
            <div className="mystats-hero-subtitle">
              Ranked <strong>#{myRank}</strong> of {playerStats.length} players
            </div>
          </div>
        </div>
        <div className="mystats-stat-grid">
          <div className="mystats-stat-tile">
            <div className="mystats-stat-value">{myPlayerStats.totalPoints}</div>
            <div className="mystats-stat-label">Total Points</div>
          </div>
          <div className="mystats-stat-tile">
            <div className="mystats-stat-value">{myPlayerStats.avgPoints}</div>
            <div className="mystats-stat-label">Avg / Song</div>
          </div>
          <div className="mystats-stat-tile">
            <div className="mystats-stat-value">{myPlayerStats.submissionCount}</div>
            <div className="mystats-stat-label">Songs</div>
          </div>
          <div className="mystats-stat-tile">
            <div className="mystats-stat-value">{myPlayerStats.roundWins}</div>
            <div className="mystats-stat-label">Round Wins</div>
          </div>
          <div className="mystats-stat-tile">
            <div className="mystats-stat-value">{myPlayerStats.bestSongScore}</div>
            <div className="mystats-stat-label">Best Score</div>
          </div>
          {personalRecords && (
            <div className="mystats-stat-tile">
              <div className="mystats-stat-value">{personalRecords.avgPlacement}{ordSuffix(Math.round(personalRecords.avgPlacement))}</div>
              <div className="mystats-stat-label">Avg Place</div>
            </div>
          )}
        </div>
      </section>

      {/* 1b. Personal Records */}
      {personalRecords && (
        <section className="analytics-section mystats-records">
          <h2 className="section-title">Personal Records</h2>
          <div className="mystats-records-grid">
            <div className="mystats-record-card">
              <div className="mystats-record-icon">🏆</div>
              <div className="mystats-record-details">
                <div className="mystats-record-title">Best Song</div>
                <div className="mystats-record-value">{personalRecords.bestSong.name}</div>
                <div className="mystats-record-meta">{personalRecords.bestSong.score} pts — {personalRecords.bestSong.round}</div>
              </div>
            </div>
            <div className="mystats-record-card">
              <div className="mystats-record-icon">💀</div>
              <div className="mystats-record-details">
                <div className="mystats-record-title">Worst Song</div>
                <div className="mystats-record-value">{personalRecords.worstSong.name}</div>
                <div className="mystats-record-meta">{personalRecords.worstSong.score} pts — {personalRecords.worstSong.round}</div>
              </div>
            </div>
            <div className="mystats-record-card">
              <div className="mystats-record-icon">🔥</div>
              <div className="mystats-record-details">
                <div className="mystats-record-title">Best Top-3 Streak</div>
                <div className="mystats-record-value">{personalRecords.longestTop3Streak} round{personalRecords.longestTop3Streak !== 1 ? 's' : ''}</div>
                <div className="mystats-record-meta">Consecutive top-3 finishes</div>
              </div>
            </div>
            <div className="mystats-record-card">
              <div className="mystats-record-icon">🕳️</div>
              <div className="mystats-record-details">
                <div className="mystats-record-title">Zero-Point Songs</div>
                <div className="mystats-record-value">{personalRecords.zeroPointSongs}</div>
                <div className="mystats-record-meta">Songs that scored 0</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Points Trajectory */}
      {myTrajectoryData.length > 0 && (
        <section className="analytics-section">
          <h2 className="section-title">Your Points Trajectory</h2>
          <p className="section-desc">Your cumulative points vs. the field average</p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={myTrajectoryData} margin={{ top: 10, right: isMobile ? 10 : 30, left: isMobile ? -20 : 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="round_label"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
                  interval={0}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(label, payload) => payload?.[0]?.payload?.round_name || label}
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.75rem', color: 'var(--spotify-gray)' }}
                />
                <Line
                  type="monotone"
                  dataKey={myName}
                  stroke={themeGreen}
                  strokeWidth={3}
                  dot={{ r: 4, fill: themeGreen }}
                  activeDot={{ r: 6 }}
                  name={myName}
                />
                <Line
                  type="monotone"
                  dataKey="Field Avg"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Field Average"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 3. Round-by-Round Breakdown */}
      {roundBreakdown.length > 0 && (
        <section className="analytics-section">
          <h2 className="section-title">Round-by-Round</h2>
          <p className="section-desc">Your submission and placement in each round</p>
          {isMobile ? (
            <div className="mystats-rounds-cards">
              {roundBreakdown.map(r => (
                <div key={r.roundId} className={`mystats-round-card ${r.isWin ? 'round-win' : r.isTop3 ? 'round-top3' : ''}`}>
                  {artMap.get(r.roundId)
                    ? <img src={artMap.get(r.roundId)} alt="" className="mystats-round-art" />
                    : <div className="mystats-round-art mystats-round-art-placeholder" />}
                  <div className="mystats-round-placement">
                    {r.isWin ? '🏆' : `#${r.placement}`}
                  </div>
                  <div className="mystats-round-info">
                    <div className="mystats-round-name">{r.roundName}</div>
                    <div className="mystats-round-song">{r.songName}</div>
                    <div className="mystats-round-artist">{r.artists}</div>
                    <div className="mystats-round-meta">
                      <span><strong>{r.score}</strong> pts</span>
                      <span>{r.placement} of {r.totalSongs}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="analytics-table">
                <colgroup>
                  <col className="col-art" />
                  <col className="col-num" />
                  <col className="col-round" />
                  <col className="col-song" />
                  <col className="col-artist" />
                  <col className="col-score" />
                  <col className="col-place" />
                </colgroup>
                <thead>
                  <tr>
                    <th></th>
                    <th>#</th>
                    <th>Round</th>
                    <th>Song</th>
                    <th>Artist</th>
                    <th>Score</th>
                    <th>Placement</th>
                  </tr>
                </thead>
                <tbody>
                  {roundBreakdown.map((r, idx) => (
                    <tr key={r.roundId} className={r.isWin ? 'round-win-row' : r.isTop3 ? 'round-top3-row' : ''}>
                      <td className="mystats-art-cell">
                        {artMap.get(r.roundId)
                          ? <img src={artMap.get(r.roundId)} alt="" className="mystats-art-thumb" />
                          : <div className="mystats-art-placeholder" />}
                      </td>
                      <td className="rank-cell">{idx + 1}</td>
                      <td title={r.roundName}>{r.roundName}</td>
                      <td className="song-name" title={r.songName}>{r.songName}</td>
                      <td title={r.artists}>{r.artists}</td>
                      <td><strong>{r.score}</strong></td>
                      <td className={`mystats-placement ${r.isWin ? 'placement-win' : r.isTop3 ? 'placement-top3' : ''}`}>
                        {r.isWin ? '🏆 1st' : `${r.placement}${ordSuffix(r.placement)}`} <span className="placement-total">of {r.totalSongs}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 4. Voting DNA */}
      {(votingDna.given.length > 0 || votingDna.received.length > 0) && (
        <section className="analytics-section">
          <h2 className="section-title">Voting DNA</h2>
          <p className="section-desc">Your voting relationships — who you support and who supports you</p>
          <div className="mystats-dna-row">
            {votingDna.given.length > 0 && (
              <div className="mystats-dna-chart">
                <h3 className="mystats-dna-label">🎯 Points You Gave</h3>
                <ResponsiveContainer width="100%" height={Math.max(180, votingDna.given.length * 36)}>
                  <BarChart data={votingDna.given} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                    <YAxis
                      type="category" dataKey="name" stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                      width={65}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="points" fill={themeGreen} radius={[0, 4, 4, 0]} name="Points Given">
                      {votingDna.given.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? themeGreen : `${themeGreen}${Math.max(40, 99 - i * 12).toString(16)}`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {votingDna.received.length > 0 && (
              <div className="mystats-dna-chart">
                <h3 className="mystats-dna-label">❤️ Points You Received</h3>
                <ResponsiveContainer width="100%" height={Math.max(180, votingDna.received.length * 36)}>
                  <BarChart data={votingDna.received} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                    <YAxis
                      type="category" dataKey="name" stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                      width={65}
                    />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="points" radius={[0, 4, 4, 0]} name="Points Received">
                      {votingDna.received.map((_, i) => {
                        const colors = ['#FF6B6B', '#FF8E8E', '#FFB0B0', '#FFCCCC', '#FFD8D8', '#FFE5E5', '#FFF0F0']
                        return <Cell key={i} fill={colors[i] || colors[colors.length - 1]} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Your Badges */}
      <section className="analytics-section">
        <h2 className="section-title">Your Badges</h2>
        <div className="mystats-badge-progress">
          <div className="mystats-badge-progress-text">
            <span><strong>{myBadges.earned.length}</strong> of <strong>{myBadges.total}</strong> badges earned</span>
            <span className="mystats-badge-pct">{badgePct}%</span>
          </div>
          <div className="mystats-badge-progress-bar">
            <div
              className={`mystats-badge-progress-fill ${badgePct === 100 ? 'complete' : ''}`}
              style={{ width: `${badgePct}%` }}
            />
          </div>
        </div>
        {myBadges.earned.length > 0 && (
          <>
            <h3 className="mystats-badge-section-label">Earned</h3>
            <div className="mystats-badge-grid">
              {myBadges.earned.map(b => (
                <div 
                  key={b.id} 
                  className="mystats-badge-card earned"
                  onClick={() => {
                    const me = b.players.find(p => p.id === myId)
                    if (me) {
                      setExportBadge(b)
                      setExportPlayer(me)
                    }
                  }}
                >
                  <img src={b.image} alt={b.name} className="mystats-badge-img" />
                  <div className="mystats-badge-name">{b.name}</div>
                  <div className="mystats-badge-desc">{b.description}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {myBadges.unearned.length > 0 && (
          <>
            <h3 className="mystats-badge-section-label">Locked</h3>
            <div className="mystats-badge-grid">
              {myBadges.unearned.map(b => (
                <div key={b.id} className="mystats-badge-card locked">
                  <img src={b.image} alt={b.name} className="mystats-badge-img" />
                  <div className="mystats-badge-name">{b.name}</div>
                  <div className="mystats-badge-desc">{b.description}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 6. Head-to-Head */}
      <section className="analytics-section">
        <h2 className="section-title">Head-to-Head</h2>
        <p className="section-desc">Compare your stats with another player</p>
        <select
          className="theme-selector mystats-h2h-select"
          value={compareId}
          onChange={e => setCompareId(e.target.value)}
        >
          <option value="">Select a player…</option>
          {otherPlayers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {headToHead && (
          <div className="mystats-h2h">
            <div className="mystats-h2h-summary">
              <div className="mystats-h2h-record">
                <span className="h2h-wins">{headToHead.myWins}W</span>
                <span className="h2h-sep">–</span>
                <span className="h2h-ties">{headToHead.ties}D</span>
                <span className="h2h-sep">–</span>
                <span className="h2h-losses">{headToHead.theirWins}L</span>
              </div>
              <div className="h2h-record-label">Round record (rounds where you outscored them)</div>
            </div>

            <div className="mystats-h2h-comparison">
              <div className="h2h-col h2h-me">
                <div className="h2h-col-name">{myName}</div>
                {[
                  ['Total Pts', myPlayerStats.totalPoints, headToHead.compareStats.totalPoints],
                  ['Avg / Song', myPlayerStats.avgPoints, headToHead.compareStats.avgPoints],
                  ['Wins', myPlayerStats.roundWins, headToHead.compareStats.roundWins],
                  ['Best Song', myPlayerStats.bestSongScore, headToHead.compareStats.bestSongScore],
                ].map(([label, myVal, theirVal]) => (
                  <div key={label} className="h2h-stat-row">
                    <span className="h2h-label">{label}</span>
                    <span className={`h2h-val ${myVal >= theirVal ? 'h2h-winning' : ''}`}>{myVal}</span>
                  </div>
                ))}
              </div>

              <div className="h2h-vs">VS</div>

              <div className="h2h-col h2h-them">
                <div className="h2h-col-name">{headToHead.compareName}</div>
                {[
                  ['Total Pts', headToHead.compareStats.totalPoints, myPlayerStats.totalPoints],
                  ['Avg / Song', headToHead.compareStats.avgPoints, myPlayerStats.avgPoints],
                  ['Wins', headToHead.compareStats.roundWins, myPlayerStats.roundWins],
                  ['Best Song', headToHead.compareStats.bestSongScore, myPlayerStats.bestSongScore],
                ].map(([label, val, otherVal]) => (
                  <div key={label} className="h2h-stat-row">
                    <span className={`h2h-val ${val >= otherVal ? 'h2h-winning' : ''}`}>{val}</span>
                    <span className="h2h-label">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Round-by-round chart */}
            {headToHead.roundComparison.length > 0 && (
              <div className="mystats-h2h-chart">
                <h3 className="mystats-dna-label">Points Per Round</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={headToHead.roundComparison} margin={{ top: 10, right: 15, left: -20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="roundLabel"
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis
                      stroke="rgba(255,255,255,0.3)"
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.roundName || label}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.72rem' }} />
                    <Bar dataKey="myPts" fill={themeGreen} name={myName} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="theirPts" fill="#FF6B6B" name={headToHead.compareName} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </section>
      
      {exportBadge && exportPlayer && (
        <ExportableBadgeCard
          badge={exportBadge}
          player={exportPlayer}
          onClose={() => {
            setExportBadge(null)
            setExportPlayer(null)
          }}
        />
      )}
    </div>
  )
}

export default MyStatsPage
