import { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { useAnalytics } from '../hooks/useAnalytics'
import { useBadges } from '../hooks/useBadges'
import { useSalmonMode, SALMON_YEAR_MAP } from '../hooks/useSalmonMode'
import './BadgesPage.css'

const CATEGORIES = ['Performance', 'Standings', 'Voting', 'Social', 'Meta']

const MAX_VISIBLE = 3

const YEAR_TO_LEAGUE = {
  '2025': '2a40e26e20e846cbae7b66d53c1488f0',
  '2026': 'fe08d6855f204613b30922e34a7486c6',
}

function BadgesPage() {
  const { year: urlYear } = useParams()
  const [searchParams] = useSearchParams()
  const teamParam = searchParams.get('team') || ''
  const [modalBadge, setModalBadge] = useState(null)

  const {
    loading, error, leagues, activeTeam, selectedLeague, setSelectedLeague,
    filteredVotes, filteredSubmissions
  } = useAnalytics({ team: teamParam })

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

  const badges = useBadges(filteredVotes, filteredSubmissions)

  if (loading) {
    return <div className="badges-loading">Loading badges...</div>
  }

  if (error) {
    return (
      <div className="badges-error">
        <h2>Error loading data</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="badges-page">
      <div className="badges-header">
        <div className="badges-header-row">
          <h1>Badges</h1>
          {leagues.length >= 1 && (
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="theme-selector"
            >
              <option value="">All Leagues</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{getLeagueName(l.id, l.name || l.id)}</option>
              ))}
            </select>
          )}
        </div>
        {activeTeam && (
          <div className="badges-team-badge">Team: <strong>{activeTeam}</strong></div>
        )}
      </div>

      {modalBadge && (
        <div className="badge-modal-overlay" onClick={() => setModalBadge(null)}>
          <div className="badge-modal" onClick={e => e.stopPropagation()}>
            <div className="badge-modal-header">
              <img className="badge-modal-image" src={modalBadge.image} alt={modalBadge.name} />
              <div>
                <div className="badge-modal-name">{modalBadge.name}</div>
                <div className="badge-modal-desc">{modalBadge.description}</div>
              </div>
              <button className="badge-modal-close" onClick={() => setModalBadge(null)}>&times;</button>
            </div>
            <div className="badge-modal-players">
              {modalBadge.players.map((p, i) => (
                <div key={`${p.id}-${i}`} className="badge-modal-player">
                  <span className="badge-player-name">{p.name}</span>
                  {p.stat != null ? (
                    <span className="badge-player-stat">{p.stat}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {CATEGORIES.map(cat => {
        const catBadges = badges.filter(b => b.category === cat)
        if (catBadges.length === 0) return null
        return (
          <section key={cat} className="badges-category">
            <h2 className="badges-category-title">{cat}</h2>
            <div className="badges-grid">
              {catBadges.map(badge => badge.id === 'infinity_gauntlet' ? (
                <div
                  key={badge.id}
                  className="badge-card badge-card-gauntlet"
                >
                  <img className={`badge-image badge-image-gauntlet ${badge.achieved ? '' : 'badge-image-locked'}`} src={badge.image} alt={badge.name} />
                  <div className="badge-info">
                    <div className="badge-name">{badge.name}</div>
                    <div className="badge-desc">{badge.description}</div>
                    {badge.achieved ? (
                      <div className="badge-players">
                        {badge.players.map((p, i) => (
                          <div key={`${p.id}-${i}`} className="badge-player">
                            <span className="badge-player-name">{p.name}</span>
                            {p.stat != null ? (
                              <span className="badge-player-stat">{p.stat}</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="badge-not-achieved">Not yet achieved</div>
                    )}
                    {badge.closestPlayers && badge.closestPlayers.length > 0 && (
                      <div className="gauntlet-closest">
                        <div className="gauntlet-closest-title">Closest Contenders</div>
                        {badge.closestPlayers.map((c, i) => (
                          <div key={`${c.id}-${i}`} className="gauntlet-contender">
                            <div className="gauntlet-contender-header">
                              <span className="badge-player-name">{c.name}</span>
                              <span className="badge-player-stat">{c.count}/{badge.totalBadges} badges</span>
                            </div>
                            <div className="gauntlet-badge-icons">
                              {c.badges.map(b => (
                                <div key={b.id} className="gauntlet-badge-icon-wrapper" title={b.name}>
                                  <img
                                    className={`gauntlet-badge-icon ${b.earned ? '' : 'gauntlet-badge-icon-locked'}`}
                                    src={b.image}
                                    alt={b.name}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  key={badge.id}
                  className={`badge-card ${badge.achieved ? '' : 'badge-locked'}`}
                >
                  <img className="badge-image" src={badge.image} alt={badge.name} />
                  <div className="badge-info">
                    <div className="badge-name">{badge.name}</div>
                    <div className="badge-desc">{badge.description}</div>
                    {badge.achieved ? (
                      <div className="badge-players">
                        {badge.players.slice(0, MAX_VISIBLE).map((p, i) => (
                          <div key={`${p.id}-${i}`} className="badge-player">
                            <span className="badge-player-name">{p.name}</span>
                            {p.stat != null ? (
                              <span className="badge-player-stat">{p.stat}</span>
                            ) : null}
                          </div>
                        ))}
                        {badge.players.length > MAX_VISIBLE && (
                          <button
                            className="badge-view-more"
                            onClick={() => setModalBadge(badge)}
                          >
                            +{badge.players.length - MAX_VISIBLE} more
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="badge-not-achieved">Not yet achieved</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default BadgesPage
