import { useEffect, useRef } from 'react'
import BadgeAvatar from './BadgeAvatar'
import BadgeStatsList from './BadgeStatsList'
import { CATEGORY_COLORS, hexToRgba } from '../../utils/themeHelpers'

function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function drawVinylDisc(canvas, primaryColor, size = 240, dpr = 1) {
  const ctx = canvas.getContext('2d')
  const scaledSize = size * dpr
  canvas.width = scaledSize
  canvas.height = scaledSize
  ctx.scale(dpr, dpr)

  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 1

  ctx.clearRect(0, 0, size, size)

  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.clip()

  const base = ctx.createRadialGradient(cx * 0.7, cy * 0.65, 0, cx, cy, outerR)
  base.addColorStop(0,   '#2a2a2a')
  base.addColorStop(0.4, '#111')
  base.addColorStop(1,   '#000')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  const startR = outerR * 0.44
  for (let r = startR; r < outerR - 2; r += 2.2) {
    const brightness = 0.015 + seededRand(r * 13.7) * 0.035
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${brightness})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const sweeps = [
    { x: cx * 1.5, y: cy * 0.4, r: outerR * 1.1, c: hexToRgba(primaryColor, 0.12) },
    { x: cx * 1.6, y: cy * 0.5, r: outerR * 1.0, c: 'rgba(80,200,255,0.06)' },
    { x: cx * 0.4, y: cy * 1.7, r: outerR * 0.9, c: hexToRgba(primaryColor, 0.08) },
    { x: cx * 1.5, y: cy * 1.6, r: outerR * 1.1, c: 'rgba(100,255,150,0.04)' },
    { x: cx,       y: cy * 0.2, r: outerR * 0.8, c: hexToRgba(primaryColor, 0.1)  },
  ]
  sweeps.forEach(({ x, y, r, c }) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, c)
    g.addColorStop(1, 'transparent')
    ctx.globalCompositeOperation = 'lighter'
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
  })
  ctx.globalCompositeOperation = 'source-over'

  const rim = ctx.createRadialGradient(cx, cy, outerR * 0.88, cx, cy, outerR)
  rim.addColorStop(0,   'transparent')
  rim.addColorStop(0.5, 'rgba(255,255,255,0.04)')
  rim.addColorStop(1,   hexToRgba(primaryColor, 0.08))
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, size, size)
}

function VinylBadgeCard({ player, badge, cardRef }) {
  const canvasRef = useRef(null)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  useEffect(() => {
    if (!canvasRef.current) return
    const primaryColor = CATEGORY_COLORS[badge.category] || CATEGORY_COLORS['Performance']
    drawVinylDisc(canvasRef.current, primaryColor, 240, dpr)
  }, [badge.category, dpr])

  return (
    <div className="badge-export-card vinyl-theme" ref={cardRef}>
      <div className="vinyl-disc-container">
        <div className="vinyl-disc-ring">
          <canvas ref={canvasRef} className="vinyl-disc-canvas" style={{ width: 240, height: 240 }} />
          <div className="vinyl-disc-label">
            <div className="vinyl-disc-label-track">RECORDED LIVE</div>
            <div className="vinyl-disc-label-title">{badge.name}</div>
            <div className="vinyl-disc-label-subtitle">A LEAGUE EXCLUSIVE</div>
            <div className="vinyl-disc-spindle" />
          </div>
        </div>
      </div>

      <div className="vinyl-sleeve-body">
        <div className="vinyl-sleeve-top-rule" />

        <div className="vinyl-sleeve-header">
          <div className="vinyl-sleeve-artist-col">
            <div className="vinyl-sleeve-overline">ARTIST</div>
            <div className="vinyl-sleeve-player-name">{player.name.toUpperCase()}</div>
          </div>
          <div className="vinyl-sleeve-avatar-col">
            <BadgeAvatar player={player} size={56} className="vinyl-wax-avatar" variant="vinyl" borderRadius="50%" />
          </div>
        </div>

        <div className="vinyl-sleeve-divider" />

        <div className="vinyl-sleeve-badge-name">{badge.name}</div>
        <div className="vinyl-sleeve-description">{badge.description}</div>

        <BadgeStatsList
          stats={player.stats}
          className="vinyl-sleeve-stats"
          itemClassName="vinyl-sleeve-stat"
          labelClassName="vinyl-sleeve-stat-label"
          valueClassName="vinyl-sleeve-stat-value"
        />

        <div className="vinyl-sleeve-footer">
          <span>℗ {new Date().getFullYear()} MUSIC LEAGUE RECORDINGS</span>
          <span>STEREO // 33⅓ RPM</span>
        </div>
      </div>
    </div>
  )
}

export default VinylBadgeCard
