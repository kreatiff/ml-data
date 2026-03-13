import InitialsAvatar from '../InitialsAvatar'

function ClassicBadgeCard({ player, badge, cardRef }) {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  
  return (
    <div className="badge-export-card classic-theme" ref={cardRef}>
      <div className="classic-scanlines" />
      <div className="classic-torn-edge" />
      
      {/* Ticket Header */}
      <div className="classic-ticket-header">
        <div className="classic-header-left">
          <div className="classic-overline">EVENT / LEAGUE PRESENTS</div>
          <div className="classic-venue">ANALYTICS LIVE // BEYOND THE BADGE</div>
        </div>
        <div className="classic-header-right">
          <div className="classic-date-block">
            <span className="classic-date-label">ADMIT</span>
            <span className="classic-date-val">{dateStr.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Main Artwork Area */}
      <div className="classic-main-art">
        <img src={badge.image} alt={badge.name} className="classic-badge-image" />
        <div className="classic-avatar-cluster">
          {player.avatar_url ? (
            <img src={player.avatar_url} alt={player.name} className="classic-avatar" />
          ) : (
            <InitialsAvatar name={player.name} size={64} className="classic-avatar" variant="mesh" />
          )}
        </div>
      </div>

      {/* Headline Info */}
      <div className="classic-headline-section">
        <div className="classic-player-headline">{player.name}</div>
        <div className="classic-badge-subhead-row">
          <div className="classic-badge-name-box">
            <span>PERFORMING</span>
            {badge.name.toUpperCase()}
          </div>
          <div className="classic-badge-serial">SN // {badge.id?.slice(0, 8) || '00-XXXX'}</div>
        </div>
      </div>

      <div className="classic-divider" />

      {/* Description & Stats */}
      <div className="classic-detail-section">
        <div className="classic-description">{badge.description}</div>
        
        <div className="classic-stats-footer">
          {(player.stats || []).map((s, i) => (
            <div key={i} className="classic-stat-pill">
              <span className="pill-label">{s.label}</span>
              <span className="pill-val">{s.value}</span>
            </div>
          ))}
          {(!player.stats || player.stats.length === 0) && (
            <div className="classic-stat-pill">
              <span className="pill-label">STATUS</span>
              <span className="pill-val">VERIFIED</span>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Stub Footer */}
      <div className="classic-ticket-footer">
        <div className="classic-barcode-area">
          <div className="barcode-strip" />
          <div className="barcode-strip" />
          <div className="barcode-strip" />
          <div className="barcode-strip wide" />
          <div className="barcode-strip" />
          <div className="barcode-strip wide" />
        </div>
        <div className="classic-footer-text">
          <span>SEC: 01 // ROW: VIP // SEAT: PRO</span>
          <span className="classic-legal">NO REFUNDS • ACCESS GRANTED</span>
        </div>
      </div>
    </div>
  )
}

export default ClassicBadgeCard
