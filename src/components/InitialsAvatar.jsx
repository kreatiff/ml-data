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

const NOISE_OVERLAY = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAAUVBMVEWFhYWDg4N3d3dtbW17e3t1dXWBgYGHh4d5eXlzc3N9fX10dHRzX3BxX3B3X3B3X3B3X3B3X3B3X3B3X3B3X3B3X3B3X3B3X3B3X3B3X3B3X3B3X3BX7632AAAABnRSTlP///////8AX7oP3QAAAClJREFUeNpjYGRkYmJkZGRigYozMTEyMTEyMTKBmYyMQM0MDAxMqPkHAA09ABA98980AAAAAElFTkSuQmCC")';

const GRADIENT_PALETTES = [
    ['#ff00cc', '#3333ff', '#00d2ff'], // Cyber
    ['#f1c40f', '#e67e22', '#e74c3c'], // Warm
    ['#2ecc71', '#1abc9c', '#3498db'], // Cool
    ['#9b59b6', '#8e44ad', '#2c3e50'], // Deep
    ['#ff7eb3', '#ff758c', '#acb6e5'], // Soft
    ['#00f2fe', '#4facfe', '#00c6ff'], // Sky
];

function getMeshGradient(name) {
    const hash = hashString(name);
    const palette = GRADIENT_PALETTES[hash % GRADIENT_PALETTES.length];
    
    // Seed positions based on hash
    const p1 = (hash % 70) + 10;
    const p2 = ((hash >> 2) % 70) + 10;
    const p3 = ((hash >> 4) % 70) + 10;
    
    return [
        NOISE_OVERLAY,
        `radial-gradient(circle at 0% 0%, ${palette[0]}cc, transparent 50%)`,
        `radial-gradient(circle at 100% 0%, ${palette[1]}cc, transparent 50%)`,
        `radial-gradient(circle at 100% 100%, ${palette[2]}33, transparent 50%)`,
        `radial-gradient(circle at 0% 100%, ${palette[0]}33, transparent 50%)`,
        palette[palette.length - 1] // Base color
    ].join(', ');
}

function InitialsAvatar({ name, size = 24, className = '', borderRadius = '50%' }) {
    const initials = getInitials(name)
    const fontSize = Math.max(size * 0.4, 10)
    const backgroundImage = getMeshGradient(name || '')

    return (
        <div
            className={`initials-avatar ${className}`}
            style={{
                width: size,
                height: size,
                minWidth: size,
                borderRadius,
                backgroundImage,
                backgroundSize: 'cover, 100% 100%, 100% 100%, 100% 100%, 100% 100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Space Mono', monospace",
                fontSize: `${fontSize}px`,
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                lineHeight: 1,
                flexShrink: 0,
                overflow: 'hidden'
            }}
            title={name}
        >
            {initials}
        </div>
    )
}

export default memo(InitialsAvatar)
