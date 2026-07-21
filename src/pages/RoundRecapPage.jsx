import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useAnalyticsData } from '../contexts/AnalyticsDataContext'
import { useRoundRecap } from '../hooks/useRoundRecap'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useItunesArt } from '../hooks/useItunesArt'
import { useIsMobile } from '../hooks/useMediaQuery'
import InitialsAvatar from '../components/InitialsAvatar'
import MobilePageHeader from '../components/MobilePageHeader'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'
import DynamicImage from '../components/DynamicImage'
import VoteProgressionModal from '../components/analytics/VoteProgressionModal'
import './RoundRecapPage.css'

const TOOLTIP_STYLE = {
  background: 'var(--spotify-elevated)',
  border: '2px solid var(--spotify-black)',
  borderRadius: '4px',
  color: 'var(--spotify-white)',
  fontSize: '0.85rem'
}

function RoundRecapPage() {
  useDocumentTitle('Who Ruined the Vibe this Week? | Dupleighcates')
  const { roundId } = useParams()
  const navigate = useNavigate()
  const { data, loading } = useAnalyticsData()
  const isMobile = useIsMobile()
  const [isRaceOpen, setIsRaceOpen] = useState(false)

  const votes = data?.votes || []
  const submissions = data?.submissions || []

  // Compute recap for the selected round, or fallback to the latest round
  const { rounds, latestRoundId, recapData } = useRoundRecap(votes, submissions, roundId)

  const currentRoundId = roundId || latestRoundId

  // Update URL if no roundId is in URL but we have a latest round
  useEffect(() => {
    if (!roundId && latestRoundId) {
      navigate(`/rounds/${latestRoundId}`, { replace: true })
    }
  }, [roundId, latestRoundId, navigate])

  // Album art for the winning song
  const winnerArtSongs = useMemo(() => {
    if (!recapData?.winner) return []
    return [{ key: recapData.winner.spotifyUri || 'page-winner', songName: recapData.winner.songName, artists: recapData.winner.artists }]
  }, [recapData])
  const artMap = useItunesArt(winnerArtSongs)
  const winnerArt = artMap.get(recapData?.winner?.spotifyUri || 'page-winner')

  // Theme green for charts
  const themeGreen = useMemo(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--spotify-green').trim()
    return val || '#CCFF00'
  }, [])

  if (loading) {
    return <PageLoadingSkeleton />
  }

  if (!recapData) {
    return (
      <div className="recap-page-error">
        <div className="no-results">Round data not found.</div>
      </div>
    )
  }

  const handleRoundChange = (e) => {
    const newId = e.target.value
    if (newId) {
      navigate(`/rounds/${newId}`)
    }
  }

  const roundSelect = (
    <select
      className="filter-select filter-select-small"
      value={currentRoundId || ''}
      onChange={handleRoundChange}
    >
      <option value="" disabled>Select a Round</option>
      {[...rounds].reverse().map(r => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
      ))}
    </select>
  )

  return (
    <div className="recap-page-container fade-in">
      {isMobile && <MobilePageHeader title="Round Recap" rightContent={roundSelect} />}
      {/* ── LEFT COLUMN: STATS & SUMMARY ── */}
      <div className="recap-stats-column">
        {!isMobile && (
          <div className="recap-page-header">
            <h1 className="recap-page-title">Round Recap</h1>
            <div className="recap-round-selector">
              {roundSelect}
            </div>
          </div>
        )}

        {/* 1. Winner Card */}
        {recapData.winner && (
          <section className="recap-page-section recap-winner-section">
            <div className="recap-winner-card">
              <DynamicImage 
                src={winnerArt} 
                alt={recapData.winner.songName}
                className="recap-winner-art"
                placeholderName={recapData.winner.songName}
                size={100}
              />
              <div className="recap-winner-info">
                <div className="recap-winner-trophy">🏆 Winner</div>
                <div className="recap-winner-song">{recapData.winner.songName}</div>
                <div className="recap-winner-artist">{recapData.winner.artists}</div>
                <div className="recap-winner-meta">
                  <span className="recap-winner-submitter">by {recapData.winner.submitterName}</span>
                  <span className="recap-winner-score">{recapData.winner.score} pts</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 2. Race Replay Banner/CTA */}
        {recapData.voteProgression && recapData.voteProgression.length > 1 && (
          <section className="recap-page-section">
            <div className="recap-race-banner" onClick={() => setIsRaceOpen(true)}>
              <div className="recap-race-banner-content">
                <div className="recap-race-banner-icon">
                  <svg id="Racing-Helmet--Streamline-Atlas" viewBox="-0.5 -0.5 16 16" height="32" width="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M0.9375 8.45v-0.5874999999999999a7.08125 7.08125 0 0 1 1.1937499999999999 -3.9437499999999996L0.9375 2.725v-0.625C1.875 1.60625 4.543749999999999 0.9375 7.5 0.9375c4.175 0 6.5625 2.3874999999999997 6.5625 5.36875v4.65a3.125 3.125 0 0 1 -3.125 3.125 3.125 3.125 0 0 1 -0.925 -0.14375000000000002L3.4499999999999997 11.875a3.5749999999999997 3.5749999999999997 0 0 1 -2.5124999999999997 -3.4250000000000003Z" strokeMiterlimit="10" strokeWidth="1"></path>
                    <path d="M14.0625 11.675a9.375 9.375 0 0 1 -5.4125 -1.73125l-1.0125000000000002 -0.725a1.75625 1.75625 0 0 1 -0.73125 -1.43125 1.7625 1.7625 0 0 1 2.04375 -1.7374999999999998l5.1125 0.8562500000000001" strokeMiterlimit="10" strokeWidth="1"></path>
                    <path d="m9.8875 6.30625 -1.1937499999999999 3.5812500000000003" strokeMiterlimit="10" strokeWidth="1"></path>
                  </svg>
                </div>
                <div className="recap-race-banner-text">
                  <div className="recap-race-banner-title">Vote Race Replay</div>
                  <div className="recap-race-banner-desc">See the plot twists as the votes came in!</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 3. Score Distribution */}
        {recapData.scoreDistribution.length > 0 && (
          <section className="recap-page-section">
            <h3 className="recap-section-title">📊 Score Distribution</h3>
            <div className="recap-chart-container">
              <ResponsiveContainer width="100%" height={Math.max(200, recapData.scoreDistribution.length * 32)}>
                <BarChart
                   data={recapData.scoreDistribution}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="submitterName"
                    stroke="rgba(255,255,255,0.3)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                    width={65}
                  />
                   <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: 'var(--spotify-white)' }}
                    labelStyle={{ display: 'none' }}
                    formatter={(value, name, props) => [
                      `${value} pts`,
                      `${props.payload.songName} — ${props.payload.artists}`
                    ]}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} name="Score">
                    {recapData.scoreDistribution.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={i === 0 ? themeGreen : `${themeGreen}${Math.max(30, 99 - i * 8).toString(16).padStart(2, '0')}`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* 4. Leaderboard Movers */}
        {(recapData.biggestMover || recapData.biggestFaller) && (
          <section className="recap-page-section">
            <h3 className="recap-section-title">📈 Leaderboard Movers</h3>
            <div className="recap-movers-row">
              {recapData.biggestMover && (
                <div className="recap-mover-card recap-mover-up">
                  <div className="recap-mover-icon">🔥</div>
                  <div className="recap-mover-label">Biggest Climber</div>
                  <div className="recap-mover-name">{recapData.biggestMover.name}</div>
                  <div className="recap-mover-change">
                    <span className="recap-mover-arrow">↑</span>
                    {recapData.biggestMover.positionChange} {recapData.biggestMover.positionChange === 1 ? 'spot' : 'spots'}
                  </div>
                  <div className="recap-mover-positions">
                    #{recapData.biggestMover.positionBefore} → #{recapData.biggestMover.positionAfter}
                  </div>
                </div>
              )}
              {recapData.biggestFaller && (
                <div className="recap-mover-card recap-mover-down">
                  <div className="recap-mover-icon">❄️</div>
                  <div className="recap-mover-label">Biggest Drop</div>
                  <div className="recap-mover-name">{recapData.biggestFaller.name}</div>
                  <div className="recap-mover-change">
                    <span className="recap-mover-arrow">↓</span>
                    {Math.abs(recapData.biggestFaller.positionChange)} {Math.abs(recapData.biggestFaller.positionChange) === 1 ? 'spot' : 'spots'}
                  </div>
                  <div className="recap-mover-positions">
                    #{recapData.biggestFaller.positionBefore} → #{recapData.biggestFaller.positionAfter}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 5. Controversial Pick */}
        {recapData.controversialPick && (
          <section className="recap-page-section">
            <h3 className="recap-section-title">💣 Most Controversial</h3>
            <div className="recap-controversy-card">
              <div className="recap-controversy-song">
                <strong>{recapData.controversialPick.songName}</strong>
                <span> — {recapData.controversialPick.artists}</span>
              </div>
              <div className="recap-controversy-submitter">
                Submitted by {recapData.controversialPick.submitterName} • {recapData.controversialPick.score} pts total
              </div>
              <div className="recap-controversy-votes">
                {recapData.controversialPick.votes.map((v, i) => (
                  <span
                    key={i}
                    className="recap-vote-pill"
                    style={{
                      background: v > 0
                        ? `rgba(${Math.min(255, 100 + v * 20)}, ${Math.min(255, 200 + v * 10)}, 0, 0.8)`
                        : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
              <div className="recap-controversy-variance">Variance: {recapData.controversialPick.variance}</div>
            </div>
          </section>
        )}

        {/* 6. Prediction Accuracy */}
        {recapData.predictionAccuracy.length > 0 && (
          <section className="recap-page-section">
            <h3 className="recap-section-title">🎯 Prediction Accuracy</h3>
            <p className="recap-section-desc">Who voted closest to the final rankings</p>
            <div className="recap-prediction-list">
              {recapData.predictionAccuracy.slice(0, 10).map((p, i) => (
                <div key={i} className="recap-prediction-row">
                  <span className="recap-prediction-rank">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <span className="recap-prediction-name">{p.name}</span>
                  <div className="recap-prediction-bar-bg">
                    <div
                      className="recap-prediction-bar-fill"
                      style={{ width: `${p.accuracy}%` }}
                    />
                  </div>
                  <span className="recap-prediction-score">{p.accuracy}%</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── RIGHT COLUMN: SONGS & COMMENTS ── */}
      <div className="recap-songs-column">
        <h2 className="recap-songs-header">Round Songs & Comments</h2>
        <div className="recap-songs-list">
          {recapData.roundSongs.map((song) => (
            <div key={song.spotifyUri} className="recap-song-row">
              {/* Song Header Info */}
              <div className="recap-song-details">
                <div className={`recap-song-rank-badge rank-${song.rank}`}>#{song.rank}</div>
                <div className="recap-song-info-core">
                  <div className="recap-song-title">{song.songName}</div>
                  <div className="recap-song-artist">by {song.artists}</div>
                </div>
                <div className="recap-song-submitter-block">
                  {song.submitterAvatarUrl ? (
                    <img src={song.submitterAvatarUrl} alt="" className="recap-song-avatar" />
                  ) : (
                    <InitialsAvatar name={song.submitterName} size={24} />
                  )}
                  <div className="recap-song-submitter-details">
                    <div className="recap-song-submitter-name">{song.submitterName}</div>
                    <div className="recap-song-total-score">{song.score} pts</div>
                  </div>
                </div>
              </div>

              {/* Vote Comments for this Song */}
              {song.comments && song.comments.length > 0 && (
                <div className="recap-song-comments">
                  {song.comments.map((c, i) => (
                    <div key={i} className="recap-song-comment">
                      <div className="recap-comment-bubble">
                        "{c.comment}"
                      </div>
                      <div className="recap-comment-meta">
                        <span className="recap-comment-author">— {c.voterName}</span>
                        {c.pointsAssigned > 0 && (
                          <span className="recap-comment-pts">({c.pointsAssigned} pts)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <VoteProgressionModal
        isOpen={isRaceOpen}
        onClose={() => setIsRaceOpen(false)}
        data={recapData.voteProgression}
        roundSongs={recapData.roundSongs}
      />
    </div>
  )
}

export default RoundRecapPage
