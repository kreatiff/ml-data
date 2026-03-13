import { useEffect, useRef } from 'react'
import InitialsAvatar from '../InitialsAvatar'
import { CATEGORY_COLORS, hexToRgba } from '../../utils/themeHelpers'

function seededRand(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function drawVinylDisc(canvas, primaryColor, size = 240) {
  const ctx = canvas.getContext('2d')
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 1

  ctx.clearRect(0, 0, size, size)

  // Clip to circle
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.clip()

  // Disc base – dark radial gradient for depth
  const base = ctx.createRadialGradient(cx * 0.7, cy * 0.65, 0, cx, cy, outerR)
  base.addColorStop(0,   '#2a2a2a')
  base.addColorStop(0.4, '#111')
  base.addColorStop(1,   '#000')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  // Groove rings with variable brightness
  const startR = outerR * 0.44
  for (let r = startR; r < outerR - 2; r += 2.2) {
    const brightness = 0.015 + seededRand(r * 13.7) * 0.035
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${brightness})`
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // Specular rainbow shimmer — now tinted by category primary
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

  // Outer edge rim highlight
  const rim = ctx.createRadialGradient(cx, cy, outerR * 0.88, cx, cy, outerR)
  rim.addColorStop(0,   'transparent')
  rim.addColorStop(0.5, 'rgba(255,255,255,0.04)')
  rim.addColorStop(1,   hexToRgba(primaryColor, 0.08))
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, size, size)
}

function VinylBadgeCard({ player, badge, cardRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const size = 240
    canvasRef.current.width = size
    canvasRef.current.height = size
    
    const primaryColor = CATEGORY_COLORS[badge.category] || CATEGORY_COLORS['Performance']
    drawVinylDisc(canvasRef.current, primaryColor, size)
  }, [badge.category])

  return (
    <div className="badge-export-card vinyl-theme" ref={cardRef}>

      {/* Dark disc well at the top */}
      <div className="vinyl-disc-container">
        <div className="vinyl-disc-ring">
          <canvas ref={canvasRef} className="vinyl-disc-canvas" width="240" height="240" />

          {/* Center label overlaid on canvas */}
          <div className="vinyl-disc-label">
            <div className="vinyl-disc-label-track">RECORDED LIVE</div>
            <div className="vinyl-disc-label-title">{badge.name}</div>
            <div className="vinyl-disc-label-subtitle">A LEAGUE EXCLUSIVE</div>
            <div className="vinyl-disc-spindle" />
          </div>
        </div>
      </div>

      {/* Cream paper sleeve body */}
      <div className="vinyl-sleeve-body">
        <div className="vinyl-sleeve-top-rule" />

        <div className="vinyl-sleeve-header">
          <div className="vinyl-sleeve-artist-col">
            <div className="vinyl-sleeve-overline">ARTIST</div>
            <div className="vinyl-sleeve-player-name">{player.name.toUpperCase()}</div>
          </div>
          <div className="vinyl-sleeve-avatar-col">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.name} className="vinyl-wax-avatar" />
            ) : (
              <InitialsAvatar name={player.name} size={56} className="vinyl-wax-avatar" variant="vinyl" borderRadius="50%" />
            )}
          </div>
        </div>

        <div className="vinyl-sleeve-divider" />

        <div className="vinyl-sleeve-badge-name">{badge.name}</div>
        <div className="vinyl-sleeve-description">{badge.description}</div>

        <div className="vinyl-sleeve-stats">
          {(player.stats || []).map((s, i) => (
            <div key={i} className="vinyl-sleeve-stat">
              <span className="vinyl-sleeve-stat-label">{s.label}</span>
              <strong className="vinyl-sleeve-stat-value">{s.value}</strong>
            </div>
          ))}
        </div>

        <div className="vinyl-sleeve-footer">
          <span>℗ {new Date().getFullYear()} MUSIC LEAGUE RECORDINGS</span>
          <span>STEREO // 33⅓ RPM</span>
        </div>
      </div>
    </div>
  )
}

export default VinylBadgeCard
