import BadgeAvatar from './BadgeAvatar'
import BadgeStatsList from './BadgeStatsList'

function TradingBadgeCard({ player, badge, cardRef }) {
  const fallbackStats = [
    { label: 'PTS', value: player.points || '??' },
    { label: 'AVG', value: player.average || '?.?' },
    { label: 'WINS', value: player.wins || '0' },
  ]

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
          <BadgeAvatar player={player} size={40} className="trading-avatar" borderRadius="0" variant="mesh" />
        </div>
      </div>

      <div className="trading-info-block">
        <div className="trading-player-name">{player.name}</div>
        <div className="trading-badge-name">{badge.name}</div>
        <div className="trading-description">{badge.description}</div>
      </div>

      <BadgeStatsList
        stats={player.stats}
        fallback={fallbackStats}
        className="trading-stats-grid"
        itemClassName="trading-stat"
        labelClassName="stat-label"
        valueClassName="stat-value"
      />

      <div className="trading-footer">
        <span>SET-001 // MUSIC LEAGUE ANALYTICS</span>
        <span>© 2026 MLX</span>
      </div>
    </div>
  )
}

export default TradingBadgeCard
