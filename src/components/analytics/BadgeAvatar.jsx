import InitialsAvatar from '../InitialsAvatar'

function BadgeAvatar({ player, size = 64, className = '', borderRadius, variant = 'mesh' }) {
  if (player?.avatar_url) {
    return (
      <img
        src={player.avatar_url}
        alt={player.name}
        className={className}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: borderRadius ?? '0' }}
      />
    )
  }
  return (
    <InitialsAvatar
      name={player?.name || '?'}
      size={size}
      className={className}
      borderRadius={borderRadius}
      variant={variant}
    />
  )
}

export default BadgeAvatar
