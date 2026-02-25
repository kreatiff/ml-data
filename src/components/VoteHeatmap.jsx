import { useState, useMemo, memo } from 'react'
import './VoteHeatmap.css'

function VoteHeatmap({ matrix, voters, submitters }) {
  const maxVal = useMemo(() => {
    let max = 0
    voters.forEach(voter => {
      submitters.forEach(sub => {
        const val = matrix[voter]?.[sub] || 0
        if (val > max) max = val
      })
    })
    return max || 1
  }, [matrix, voters, submitters])

  const getColor = (value) => {
    if (value === 0) return 'rgba(255, 255, 255, 0.02)'
    const t = value / maxVal // 0 → 1

    // Cold (blue) → Warm (yellow) → Hot (red/orange)
    const r = Math.round(t < 0.5 ? 30 + t * 2 * 200 : 230 + (t - 0.5) * 2 * 25)
    const g = Math.round(t < 0.5 ? 100 + t * 2 * 155 : 255 - (t - 0.5) * 2 * 180)
    const b = Math.round(t < 0.5 ? 200 - t * 2 * 180 : 20 - (t - 0.5) * 2 * 15)
    const a = 0.4 + t * 0.55

    return `rgba(${r}, ${g}, ${b}, ${a})`
  }

  const truncate = (str, len = 10) => {
    if (str.length <= len) return str
    return str.slice(0, len) + '…'
  }

  const [selectedVoter, setSelectedVoter] = useState(null)

  const handleRowClick = (voter) => {
    setSelectedVoter(prev => prev === voter ? null : voter)
  }

  if (voters.length === 0) {
    return <div className="heatmap-empty">No voting data available</div>
  }

  return (
    <div className="heatmap-wrapper">
      <div className="heatmap-scroll">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th className="heatmap-corner">Voter → Submitter</th>
              {submitters.map(sub => (
                <th key={sub} className="heatmap-col-header" title={sub}>
                  {truncate(sub)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {voters.map(voter => (
              <tr
                key={voter}
                className={`heatmap-row ${selectedVoter === voter ? 'heatmap-row-selected' : ''} ${selectedVoter && selectedVoter !== voter ? 'heatmap-row-dimmed' : ''}`}
                onClick={() => handleRowClick(voter)}
              >
                <td className="heatmap-row-header" title={voter}>{truncate(voter)}</td>
                {submitters.map(sub => {
                  const val = matrix[voter]?.[sub] || 0
                  const isSelf = voter === sub
                  return (
                    <td
                      key={sub}
                      className={`heatmap-cell ${isSelf ? 'heatmap-self' : ''}`}
                      style={{ backgroundColor: isSelf ? 'rgba(255,255,255,0.03)' : getColor(val) }}
                      title={`${voter} → ${sub}: ${val} pts`}
                    >
                      {isSelf ? '—' : val > 0 ? val : ''}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default memo(VoteHeatmap)
