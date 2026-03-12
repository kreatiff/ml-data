import InitialsAvatar from '../InitialsAvatar'

function CyberpunkBadgeCard({ player, badge, cardRef }) {
  return (
    <div className="badge-export-card cyberpunk-theme" ref={cardRef}>
      <div className="cyber-grid" />
      <div className="cyber-scanline" />
      
      <div className="cyber-header">
        <div className="cyber-glitch-text" data-text="SECURITY CLEARANCE">SECURITY CLEARANCE</div>
        <div className="cyber-id-number">#ID-{Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
      </div>

      <div className="cyber-body">
        <div className="cyber-avatar-section">
          <div className="cyber-avatar-frame">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.name} className="cyber-avatar" />
            ) : (
              <InitialsAvatar name={player.name} size={100} className="cyber-avatar" borderRadius="0" />
            )}
            <div className="cyber-corner-detail top-left" />
            <div className="cyber-corner-detail bottom-right" />
          </div>
          <div className="cyber-barcode">|| ||| | ||| || | || |||</div>
        </div>

        <div className="cyber-info-section">
          <div className="cyber-label">SUBJECT_NAME</div>
          <div className="cyber-value player-name">{player.name}</div>
          
          <div className="cyber-label">ACHIEVEMENT_DAT</div>
          <div className="cyber-value badge-name">{badge.name}</div>
          <div className="cyber-description">{badge.description}</div>
          
          <div className="cyber-stats-block">
            {(player.stats || []).map((s, i) => (
              <div key={i} className="cyber-stat-item">
                <span className="stat-code">{s.label}::</span>
                <span className="stat-val">{s.value}</span>
              </div>
            ))}
            {(!player.stats || player.stats.length === 0) && (
              <>
                <div className="cyber-stat-item">
                  <span className="stat-code">PNT::</span>
                  <span className="stat-val">{player.points || '000'}</span>
                </div>
                <div className="cyber-stat-item">
                  <span className="stat-code">AVG::</span>
                  <span className="stat-val">{player.average || '0.0'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="cyber-badge-overlay">
        <img src={badge.image} alt={badge.name} className="cyber-badge-img" />
      </div>

      <div className="cyber-footer">
        <div className="footer-tag">MNEMONIC_LINK_VERIFIED</div>
        <div className="footer-status">STATUS: OPTIMAL</div>
      </div>
    </div>
  )
}

export default CyberpunkBadgeCard
