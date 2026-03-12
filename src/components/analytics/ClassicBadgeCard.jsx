import InitialsAvatar from '../InitialsAvatar'

function ClassicBadgeCard({ player, badge, cardRef }) {
  return (
    <div className="badge-export-card classic-theme" ref={cardRef}>
      <div className="card-glow" />
      <div className="card-avatar-wrapper">
        {player.avatar_url ? (
          <img src={player.avatar_url} alt={player.name} className="card-avatar" />
        ) : (
          <InitialsAvatar name={player.name} size={80} className="card-avatar" />
        )}
      </div>

      <img src={badge.image} alt={badge.name} className="card-badge-image" />

      <div className="card-info">
        <div className="card-player-name">{player.name}</div>
        <div className="card-badge-name">{badge.name}</div>
        <div className="card-description">{badge.description}</div>
        <div className="card-stats">
          {player.stat || 'ACHIEVED'} • {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="card-footer">
        <span>MUSIC_LEAGUE // ANALYTICS</span>
        <span>VERIFIED_GENUINE</span>
      </div>
    </div>
  )
}

export default ClassicBadgeCard
