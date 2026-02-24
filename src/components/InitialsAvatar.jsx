import { memo } from 'react'

const COLORS = [
    '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
    '#3949AB', '#1E88E5', '#039BE5', '#00ACC1',
    '#00897B', '#43A047', '#7CB342', '#C0CA33',
    '#FDD835', '#FFB300', '#FB8C00', '#F4511E',
]

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

function InitialsAvatar({ name, size = 24, className = '' }) {
    const initials = getInitials(name)
    const color = COLORS[hashString(name || '') % COLORS.length]
    const fontSize = Math.max(size * 0.4, 10)

    return (
        <div
            className={`initials-avatar ${className}`}
            style={{
                width: size,
                height: size,
                minWidth: size,
                borderRadius: '50%',
                backgroundColor: color,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Space Mono', monospace",
                fontSize: `${fontSize}px`,
                fontWeight: 700,
                color: '#fff',
                lineHeight: 1,
                flexShrink: 0,
            }}
            title={name}
        >
            {initials}
        </div>
    )
}

export default memo(InitialsAvatar)
