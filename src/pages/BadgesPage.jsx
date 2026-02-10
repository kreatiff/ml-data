import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAnalytics } from '../hooks/useAnalytics'
import { useBadges } from '../hooks/useBadges'
import './BadgesPage.css'

const CATEGORIES = ['Performance', 'Standings', 'Voting', 'Social']

const MAX_VISIBLE = 3

function BadgesPage() {
  const [searchParams] = useSearchParams()
  const teamParam = searchParams.get('team') || ''
  const [modalBadge, setModalBadge] = useState(null)

  const {
    loading, error, leagues, activeTeam, selectedLeague, setSelectedLeague,
    filteredVotes, filteredSubmissions
  } = useAnalytics({ team: teamParam })

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
              className="league-filter"
            >
              <option value="">All Leagues</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>{l.name || l.id}</option>
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
              {catBadges.map(badge => (
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
