import { useMemo } from 'react'
import BadgeAvatar from './BadgeAvatar'
import BadgeStatsList from './BadgeStatsList'

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function generateStableId(seed) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let id = ''
  let h = seed
  for (let i = 0; i < 9; i++) {
    h = ((h * 16807) % 2147483647)
    id += chars[h % chars.length]
  }
  return id
}

function CyberpunkBadgeCard({ player, badge, cardRef }) {
  const stableId = useMemo(() => {
    const seed = hashString(`${player.id || 'unknown'}_${badge.id || 'badge'}`)
    return generateStableId(seed)
  }, [player.id, badge.id])

  const fallbackStats = [
    { label: 'PNT', value: player.points || '000' },
    { label: 'AVG', value: player.average || '0.0' },
  ]

  return (
    <div className="badge-export-card cyberpunk-theme" ref={cardRef}>
      <div className="cyber-grid" />
      <div className="cyber-scanline" />

      <div className="cyber-header">
        <div className="cyber-glitch-text" data-text="SECURITY CLEARANCE">SECURITY CLEARANCE</div>
        <div className="cyber-id-number">#ID-{stableId}</div>
      </div>

      <div className="cyber-body">
        <div className="cyber-avatar-section">
          <div className="cyber-avatar-frame">
            <BadgeAvatar player={player} size={100} className="cyber-avatar" variant="geometric" borderRadius="0" />
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

          <BadgeStatsList
            stats={player.stats}
            fallback={fallbackStats}
            className="cyber-stats-block"
            itemClassName="cyber-stat-item"
            labelClassName="stat-code"
            valueClassName="stat-val"
          />
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
