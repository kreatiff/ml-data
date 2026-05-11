import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useAnalytics } from '../hooks/useAnalytics'
import { useBadges } from '../hooks/useBadges'
import { useSalmonMode } from '../hooks/useSalmonMode'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { YEAR_TO_LEAGUE, SALMON_YEAR_MAP } from '../constants/leagues'
import MobilePageHeader from '../components/MobilePageHeader'
import PageLoadingSkeleton from '../components/PageLoadingSkeleton'
import ExportableBadgeCard from '../components/analytics/ExportableBadgeCard'
import './BadgesPage.css'

const CATEGORIES = ['Performance', 'Standings', 'Voting', 'Social', 'Meta']

const MAX_VISIBLE = 3



function BadgesPage() {
  useDocumentTitle('Shiny Pixels for Good Taste | Dupleighcates')
  const { year: urlYear } = useParams()
  const [searchParams] = useSearchParams()
  const teamParam = searchParams.get('team') || ''
  const [modalBadge, setModalBadge] = useState(null)
  const [exportPlayer, setExportPlayer] = useState(null)
  const [exportBadge, setExportBadge] = useState(null)
  const modalRef = useRef(null)

  const { isAdmin } = useAuth()

  // Focus modal close button when modal opens; restore focus on close
  useEffect(() => {
    if (modalBadge && modalRef.current) {
      const closeBtn = modalRef.current.querySelector('.badge-modal-close')
      if (closeBtn) closeBtn.focus()
    }
  }, [modalBadge])

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setModalBadge(null)
    }
  }

  const {
    loading, error, leagues, activeTeam, selectedLeague, setSelectedLeague,
    filteredVotes, filteredSubmissions
  } = useAnalytics({ team: teamParam })

  const { getLeagueName } = useSalmonMode()
  const isMobile = useIsMobile()

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

  if (loading) {
    return <PageLoadingSkeleton />
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
      {isMobile && <MobilePageHeader title="Badges" rightContent={leagueSelectMobile} />}
      {!isMobile && (
        <div className="badges-header">
          <div className="badges-header-row">
            <h1>Badges</h1>
            {leagueSelect}
          </div>
          {activeTeam && (
            <div className="badges-team-badge">Team: <strong>{activeTeam}</strong></div>
          )}
        </div>
      )}

      {modalBadge && (
        <div
          className="badge-modal-overlay"
          onClick={() => setModalBadge(null)}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-modal-title"
        >
          <div className="badge-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
            <div className="badge-modal-header">
              <img className="badge-modal-image" src={modalBadge.image} alt={`${modalBadge.name} badge`} />
              <div>
                <div className="badge-modal-name" id="badge-modal-title">{modalBadge.name}</div>
                <div className="badge-modal-desc">{modalBadge.description}</div>
              </div>
              <button className="badge-modal-close" onClick={() => setModalBadge(null)}>&times;</button>
            </div>
            <div className="badge-modal-players">
              {modalBadge.players.map((p, i) => (
                <div key={`${p.id}-${i}`} className="badge-modal-player">
                  <button
                    type="button"
                    className={`badge-player-name ${isAdmin ? 'badge-player-name-admin' : ''}`}
                    onClick={() => {
                      if (isAdmin) {
                        setExportBadge(modalBadge)
                        setExportPlayer(p)
                      }
                    }}
                    disabled={!isAdmin}
                    aria-disabled={!isAdmin}
                  >
                    {p.name}
                  </button>
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
                    <button
                      type="button"
                      className={`badge-name ${badge.achieved && activeTeam ? 'badge-name-achieved' : ''}`}
                      onClick={() => {
                        if (badge.achieved && activeTeam && badge.players.length > 0) {
                          setExportBadge(badge)
                          setExportPlayer(badge.players[0])
                        }
                      }}
                      disabled={!(badge.achieved && activeTeam)}
                      aria-disabled={!(badge.achieved && activeTeam)}
                    >
                      {badge.name}
                    </button>
                    <div className="badge-desc">{badge.description}</div>
                    {badge.achieved ? (
                      <div className="badge-players">
                        {badge.players.map((p, i) => (
                          <div key={`${p.id}-${i}`} className="badge-player">
                            <button
                              type="button"
                              className="badge-player-name badge-player-name-clickable"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExportBadge(badge)
                                setExportPlayer(p)
                              }}
                            >
                              {p.name}
                            </button>
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
                    <button
                      type="button"
                      className={`badge-name ${badge.achieved && activeTeam ? 'badge-name-achieved' : ''}`}
                      onClick={() => {
                        if (badge.achieved && activeTeam && badge.players.length > 0) {
                          setExportBadge(badge)
                          setExportPlayer(badge.players[0])
                        }
                      }}
                      disabled={!(badge.achieved && activeTeam)}
                      aria-disabled={!(badge.achieved && activeTeam)}
                    >
                      {badge.name}
                    </button>
                    <div className="badge-desc">{badge.description}</div>
                    {badge.achieved ? (
                      <div className="badge-players">
                        {badge.players.slice(0, MAX_VISIBLE).map((p, i) => (
                          <div key={`${p.id}-${i}`} className="badge-player">
                            <button
                              type="button"
                              className="badge-player-name badge-player-name-clickable"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExportBadge(badge)
                                setExportPlayer(p)
                              }}
                            >
                              {p.name}
                            </button>
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
      {exportPlayer && exportBadge && (
        <ExportableBadgeCard 
          player={exportPlayer} 
          badge={exportBadge} 
          onClose={() => {
            setExportPlayer(null)
            setExportBadge(null)
          }} 
        />
      )}
    </div>
  )
}

export default BadgesPage
