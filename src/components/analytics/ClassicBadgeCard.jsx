import BadgeAvatar from './BadgeAvatar'
import BadgeStatsList from './BadgeStatsList'

function ClassicBadgeCard({ player, badge, cardRef }) {
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const fallbackStats = [{ label: 'STATUS', value: 'VERIFIED' }]

  return (
    <div className="badge-export-card classic-theme" ref={cardRef}>
      <div className="classic-scanlines" />
      <div className="classic-torn-edge" />

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

      <div className="classic-main-art">
        <img src={badge.image} alt={badge.name} className="classic-badge-image" />
        <div className="classic-avatar-cluster">
          <BadgeAvatar player={player} size={64} className="classic-avatar" />
        </div>
      </div>

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

      <div className="classic-detail-section">
        <div className="classic-description">{badge.description}</div>

        <BadgeStatsList
          stats={player.stats}
          fallback={fallbackStats}
          className="classic-stats-footer"
          itemClassName="classic-stat-pill"
          labelClassName="pill-label"
          valueClassName="pill-val"
        />
      </div>

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
