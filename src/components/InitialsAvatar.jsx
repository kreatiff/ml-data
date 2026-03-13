import { memo, useEffect, useRef } from 'react'

function hashString(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash)
}

function getInitials(name) {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Seed-based pseudo-random number
function seededRand(seed) {
    const x = Math.sin(seed + 1) * 10000
    return x - Math.floor(x)
}

// ─── Mesh Gradient Variant ───────────────────────────────────────────────────
const MESH_PALETTES = [
    [['#ff00cc', '#3333ff'], ['#00d2ff', '#c471ed']],    // Neon purple
    [['#f7971e', '#ffd200'], ['#fc4a1a', '#f7971e']],    // Fire
    [['#11998e', '#38ef7d'], ['#1a2a6c', '#11998e']],    // Emerald
    [['#6a11cb', '#2575fc'], ['#c471ed', '#6a11cb']],    // Electric violet
    [['#f953c6', '#b91d73'], ['#ff6e7f', '#f953c6']],    // Hot pink
    [['#4facfe', '#00f2fe'], ['#43e97b', '#4facfe']],    // Ocean blue
]

function drawMeshAvatar(canvas, name, size) {
    const ctx = canvas.getContext('2d')
    const h = hashString(name)
    const palette = MESH_PALETTES[h % MESH_PALETTES.length]
    const initials = getInitials(name)

    ctx.clearRect(0, 0, size, size)

    // Base dark background
    ctx.fillStyle = '#0d0d1a'
    ctx.fillRect(0, 0, size, size)

    // Paint large radial blobs at seeded positions
    const blobs = [
        { x: seededRand(h * 1) * size, y: seededRand(h * 2) * size, r: size * 0.8, c0: palette[0][0], c1: 'transparent' },
        { x: (1 - seededRand(h * 3)) * size, y: seededRand(h * 4) * size, r: size * 0.7, c0: palette[0][1], c1: 'transparent' },
        { x: seededRand(h * 5) * size, y: (1 - seededRand(h * 6)) * size, r: size * 0.6, c0: palette[1][0], c1: 'transparent' },
        { x: size * 0.5, y: size * 0.5, r: size * 0.5, c0: palette[1][1] + '80', c1: 'transparent' },
    ]

    blobs.forEach(({ x, y, r, c0, c1 }) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0, c0)
        g.addColorStop(1, c1)
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = g
        ctx.fillRect(0, 0, size, size)
    })

    // Noise overlay — draw translucent dots
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < size * size * 0.08; i++) {
        const nx = seededRand(i * 7) * size
        const ny = seededRand(i * 13) * size
        const a = seededRand(i * 3) * 0.15
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.fillRect(nx, ny, 1, 1)
    }

    // Initials
    ctx.globalCompositeOperation = 'source-over'
    const fontSize = Math.max(size * 0.42, 10)
    ctx.font = `800 ${fontSize}px 'Space Mono', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = size * 0.1
    ctx.fillStyle = '#ffffff'
    ctx.fillText(initials, size / 2, size / 2 + fontSize * 0.05)
}

// ─── Geometric (Identicon) Variant ───────────────────────────────────────────
const GEO_PALETTES = [
    ['#0f0f23', '#00ff88', '#00ccff'],
    ['#0a0a15', '#ff00aa', '#aa00ff'],
    ['#0d1117', '#00e5ff', '#00b3cc'],
    ['#080810', '#ffcc00', '#ff6600'],
    ['#0c0c1a', '#ff4488', '#cc2266'],
    ['#0a100a', '#44ff44', '#008800'],
]

function drawGeometricAvatar(canvas, name, size) {
    const ctx = canvas.getContext('2d')
    const h = hashString(name)
    const palette = GEO_PALETTES[h % GEO_PALETTES.length]
    const initials = getInitials(name)
    const cols = 5
    const cellSize = size / cols

    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = palette[0]
    ctx.fillRect(0, 0, size, size)

    // Grid-based identicon pattern (mirrored left-right)
    const half = Math.ceil(cols / 2)
    for (let row = 0; row < cols; row++) {
        for (let col = 0; col < half; col++) {
            const seed = row * half + col
            const on = seededRand(h * 100 + seed) > 0.4

            if (on) {
                // Vary color slightly
                const colorIdx = seededRand(h + seed * 7) > 0.5 ? 1 : 2
                ctx.fillStyle = palette[colorIdx]

                // Draw on left side
                ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
                // Mirror to right side
                const mirrored = cols - 1 - col
                if (mirrored !== col) {
                    ctx.fillRect(mirrored * cellSize, row * cellSize, cellSize, cellSize)
                }
            }
        }
    }

    // Glowing grid lines
    ctx.strokeStyle = `${palette[1]}55`
    ctx.lineWidth = 0.5
    for (let i = 0; i <= cols; i++) {
        ctx.beginPath()
        ctx.moveTo(i * cellSize, 0)
        ctx.lineTo(i * cellSize, size)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, i * cellSize)
        ctx.lineTo(size, i * cellSize)
        ctx.stroke()
    }

    // Neon glow border
    ctx.shadowColor = palette[1]
    ctx.shadowBlur = size * 0.05
    ctx.strokeStyle = palette[1]
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, size - 2, size - 2)

    // Initials with neon glow
    const fontSize = Math.max(size * 0.35, 10)
    ctx.font = `700 ${fontSize}px 'Space Mono', monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = palette[1]
    ctx.shadowBlur = size * 0.15
    ctx.fillStyle = '#ffffff'
    ctx.fillText(initials, size / 2, size / 2 + fontSize * 0.05)
    // Second pass for extra glow
    ctx.fillStyle = palette[1]
    ctx.globalAlpha = 0.4
    ctx.fillText(initials, size / 2, size / 2 + fontSize * 0.05)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    ctx.shadowBlur = 0
    ctx.fillText(initials, size / 2, size / 2 + fontSize * 0.05)
}

// ─── Vinyl Variant ───────────────────────────────────────────────────────────
const LABEL_COLORS = [
    ['#c0392b', '#e74c3c'],
    ['#d4ac0d', '#f1c40f'],
    ['#117a65', '#1abc9c'],
    ['#1a5276', '#2980b9'],
    ['#6c3483', '#8e44ad'],
    ['#ba4a00', '#e67e22'],
]

function drawVinylAvatar(canvas, name, size) {
    const ctx = canvas.getContext('2d')
    const h = hashString(name)
    const labelColors = LABEL_COLORS[h % LABEL_COLORS.length]
    const initials = getInitials(name)
    const cx = size / 2
    const cy = size / 2
    const outerR = size / 2 - 1
    const labelR = outerR * 0.42
    const spindleR = outerR * 0.05

    ctx.clearRect(0, 0, size, size)

    // Outer vinyl disc
    const vinylGrad = ctx.createRadialGradient(cx * 0.8, cy * 0.7, 0, cx, cy, outerR)
    vinylGrad.addColorStop(0, '#3a3a3a')
    vinylGrad.addColorStop(0.3, '#111')
    vinylGrad.addColorStop(0.7, '#1a1a1a')
    vinylGrad.addColorStop(1, '#000')
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.fillStyle = vinylGrad
    ctx.fill()

    // Grooves (concentric rings)
    for (let r = labelR + 4; r < outerR - 2; r += 3.5) {
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${0.03 + seededRand(r) * 0.04})`
        ctx.lineWidth = 1
        ctx.stroke()
    }

    // Specular highlight
    const specGrad = ctx.createRadialGradient(cx * 0.65, cy * 0.55, 0, cx, cy, outerR)
    specGrad.addColorStop(0, 'rgba(255,255,255,0.18)')
    specGrad.addColorStop(0.3, 'rgba(255,255,255,0.02)')
    specGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.fillStyle = specGrad
    ctx.fill()

    // Center label - outer ring
    const labelGrad = ctx.createRadialGradient(cx * 0.85, cy * 0.8, 0, cx, cy, labelR)
    labelGrad.addColorStop(0, labelColors[1])
    labelGrad.addColorStop(1, labelColors[0])
    ctx.beginPath()
    ctx.arc(cx, cy, labelR, 0, Math.PI * 2)
    ctx.fillStyle = labelGrad
    ctx.fill()

    // Label concentric lines
    for (let i = 1; i <= 3; i++) {
        ctx.beginPath()
        ctx.arc(cx, cy, labelR * (0.5 + i * 0.15), 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'
        ctx.lineWidth = 0.5
        ctx.stroke()
    }

    // Initials on label
    const fontSize = Math.max(labelR * 0.7, 8)
    ctx.font = `800 ${fontSize}px 'Inter', sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 3
    ctx.fillStyle = 'rgba(255,255,255,0.95)'
    ctx.fillText(initials, cx, cy)
    ctx.shadowBlur = 0

    // Spindle hole
    ctx.beginPath()
    ctx.arc(cx, cy, spindleR, 0, Math.PI * 2)
    ctx.fillStyle = '#000'
    ctx.fill()
}

// ─── Component ────────────────────────────────────────────────────────────────
function InitialsAvatar({ name, size = 24, className = '', borderRadius = '50%', variant = 'mesh' }) {
    const canvasRef = useRef(null)

    useEffect(() => {
        if (!canvasRef.current) return
        const canvas = canvasRef.current
        canvas.width = size
        canvas.height = size

        if (variant === 'vinyl') drawVinylAvatar(canvas, name || '?', size)
        else if (variant === 'geometric') drawGeometricAvatar(canvas, name || '?', size)
        else drawMeshAvatar(canvas, name || '?', size)
    }, [name, size, variant])

    return (
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className={`initials-avatar ${className}`}
            title={name}
            style={{
                borderRadius,
                flexShrink: 0,
                display: 'block',
            }}
        />
    )
}

export default memo(InitialsAvatar)
