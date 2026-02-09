const iconStyle = { width: '1.4em', height: '1.4em', verticalAlign: 'middle', fill: 'currentColor' }

export function DuckIcon(props) {
  return (
    <svg viewBox="0 0 64 64" style={iconStyle} {...props}>
      <path d="M52 28c0-1.5-.3-2.9-.8-4.2C49.5 19.5 45.2 16 40 16c-1.2 0-2.4.2-3.5.5C34.2 12.8 30 10 25 10c-7.7 0-14 6.3-14 14 0 .7.1 1.4.2 2.1C6.8 28.5 4 32.5 4 37c0 6.1 4.9 11 11 11h2c1 3.4 4.2 6 8 6h14c3.8 0 7-2.6 8-6h2c6.1 0 11-4.9 11-11 0-4-2.1-7.5-5.5-9.5C53.8 27.5 52 28 52 28z"/>
      <circle cx="21" cy="22" r="2.5" fill="#111"/>
      <path d="M30 28c0 0 4 1 7 0" stroke="#111" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <ellipse cx="35" cy="26" rx="6" ry="3" fill="#F4A623" opacity="0.9"/>
    </svg>
  )
}

export function PlatypusIcon(props) {
  return (
    <svg viewBox="0 0 64 64" style={iconStyle} {...props}>
      <ellipse cx="30" cy="34" rx="18" ry="13" />
      <ellipse cx="16" cy="28" rx="5" ry="4" />
      <ellipse cx="44" cy="28" rx="5" ry="4" />
      <path d="M10 36 C6 36 2 38 2 40 C2 42 6 43 10 42 Z" fill="#B8860B"/>
      <path d="M48 34 C56 32 62 34 62 37 C62 40 56 41 48 38 Z" fill="#B8860B"/>
      <ellipse cx="48" cy="36" rx="12" ry="5" fill="#B8860B"/>
      <circle cx="22" cy="28" r="2" fill="#111"/>
      <circle cx="38" cy="28" r="2" fill="#111"/>
    </svg>
  )
}

export function DiscoIcon(props) {
  return (
    <svg viewBox="0 0 64 64" style={iconStyle} {...props}>
      <circle cx="32" cy="12" r="6" />
      <path d="M24 22h16l2 18H22l2-18z" />
      <path d="M26 40l-6 18h4l5-14" />
      <path d="M38 40l6 18h-4l-5-14" />
      <path d="M24 22l-10-6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M40 22l10-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <circle cx="12" cy="15" r="3" />
      <circle cx="52" cy="17" r="3" />
      <circle cx="10" cy="6" r="1.5" opacity="0.6"/>
      <circle cx="54" cy="8" r="1.5" opacity="0.6"/>
      <circle cx="8" cy="12" r="1" opacity="0.4"/>
      <circle cx="56" cy="12" r="1" opacity="0.4"/>
    </svg>
  )
}
