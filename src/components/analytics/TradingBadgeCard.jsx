import InitialsAvatar from '../InitialsAvatar'

function TradingBadgeCard({ player, badge, cardRef }) {
  return (
    <div className="badge-export-card trading-theme" ref={cardRef}>
      <div className="card-holographic-overlay" />
      
      <div className="trading-card-header">
        <span className="card-rarity">PRISMATIC RARE</span>
        <span className="card-type">BADGE // ACHIEVEMENT</span>
      </div>

      <div className="trading-card-window">
        <img src={badge.image} alt={badge.name} className="trading-badge-img" />
        <div className="trading-avatar-frame">
          {player.avatar_url ? (
            <img src={player.avatar_url} alt={player.name} className="trading-avatar" />
          ) : (
            <InitialsAvatar name={player.name} size={40} className="trading-avatar" borderRadius="0" variant="mesh" />
          )}
        </div>
      </div>

      <div className="trading-info-block">
        <div className="trading-player-name">{player.name}</div>
        <div className="trading-badge-name">{badge.name}</div>
        <div className="trading-description">{badge.description}</div>
      </div>

      <div className="trading-stats-grid">
        {(player.stats || []).map((s, i) => (
          <div key={i} className="trading-stat">
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
        {(!player.stats || player.stats.length === 0) && (
          <>
            <div className="trading-stat">
              <span className="stat-label">PTS</span>
              <span className="stat-value">{player.points || '??'}</span>
            </div>
            <div className="trading-stat">
              <span className="stat-label">AVG</span>
              <span className="stat-value">{player.average || '?.?'}</span>
            </div>
            <div className="trading-stat">
              <span className="stat-label">WINS</span>
              <span className="stat-value">{player.wins || '0'}</span>
            </div>
          </>
        )}
      </div>

      <div className="trading-footer">
        <span>SET-001 // MUSIC LEAGUE ANALYTICS</span>
        <span>© 2026 MLX</span>
      </div>
    </div>
  )
}

export default TradingBadgeCard
