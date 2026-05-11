function BadgeStatsList({ stats, fallback, className = '', itemClassName = '', labelClassName = '', valueClassName = '' }) {
  const displayStats = stats?.length > 0 ? stats : fallback

  if (!displayStats || displayStats.length === 0) return null

  return (
    <div className={className}>
      {displayStats.map((s, i) => (
        <div key={i} className={itemClassName}>
          <span className={labelClassName}>{s.label}</span>
          <span className={valueClassName}>{s.value}</span>
        </div>
      ))}
    </div>
  )
}

export default BadgeStatsList
