import InitialsAvatar from '../InitialsAvatar'

function VinylBadgeCard({ player, badge, cardRef }) {
  return (
    <div className="badge-export-card vinyl-theme" ref={cardRef}>
      <div className="vinyl-grooves" />
      
      <div className="vinyl-content">
        <div className="vinyl-cover">
          <img src={badge.image} alt={badge.name} className="vinyl-badge-art" />
          <div className="vinyl-sticker-avatar">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.name} className="vinyl-avatar" />
            ) : (
              <InitialsAvatar name={player.name} size={60} className="vinyl-avatar" borderRadius="2px" />
            )}
          </div>
        </div>

        <div className="vinyl-info">
          <div className="vinyl-meta">ARTIST / PLAYER</div>
          <div className="vinyl-player-name">{player.name}</div>
          
          <div className="vinyl-meta" style={{ marginTop: '1.5rem' }}>RELEASE / BADGE</div>
          <div className="vinyl-badge-name">{badge.name}</div>
          <div className="vinyl-description">{badge.description}</div>
          
          <div className="vinyl-stats-row">
            {(player.stats || []).slice(0, 2).map((s, i) => (
              <div key={i} className="vinyl-stat">
                <span>{s.label}</span>
                <strong>{s.value}</strong>
              </div>
            ))}
            {(!player.stats || player.stats.length === 0) && (
              <>
                <div className="vinyl-stat">
                  <span>SCORE</span>
                  <strong>{player.points || '000'}</strong>
                </div>
                <div className="vinyl-stat">
                  <span>AVG</span>
                  <strong>{player.average || '0.0'}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="vinyl-footer">
        SIDE A // {new Date().getFullYear()} // ANALYTICS_RECORDINGS
      </div>
    </div>
  )
}

export default VinylBadgeCard
