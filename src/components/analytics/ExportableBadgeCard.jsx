import { useRef } from 'react'
import html2canvas from 'html2canvas'
import InitialsAvatar from '../InitialsAvatar'
import './ExportableBadgeCard.css'

function ExportableBadgeCard({ player, badge, onClose }) {
  const cardRef = useRef(null)

  const handleDownload = async () => {
    if (!cardRef.current) return

    try {
      // Use a slightly higher scale for better quality
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // Higher scale for even better results
        backgroundColor: null,
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.querySelector('.badge-export-card')
          if (clonedCard) {
            clonedCard.style.width = '400px'
            clonedCard.style.maxWidth = 'none'
            clonedCard.style.height = '500px'
            clonedCard.style.display = 'flex'
            clonedCard.style.flexDirection = 'column'
            clonedCard.style.padding = '2.5rem'
          }
        }
      })

      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `${player.name.replace(/\s+/g, '_')}_${badge.name.replace(/\s+/g, '_')}_Badge.png`
      link.click()
    } catch (err) {
      console.error('Error generating badge image:', err)
    }
  }

  const handleCopy = async () => {
    if (!cardRef.current) return

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: null,
        useCORS: true,
        onclone: (clonedDoc) => {
          const clonedCard = clonedDoc.querySelector('.badge-export-card')
          if (clonedCard) {
            clonedCard.style.width = '400px'
            clonedCard.style.maxWidth = 'none'
            clonedCard.style.height = '500px'
            clonedCard.style.display = 'flex'
            clonedCard.style.flexDirection = 'column'
            clonedCard.style.padding = '2.5rem'
          }
        }
      })

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ])
          alert('Image copied to clipboard!')
        } catch (copyErr) {
          console.error('Clipboard error:', copyErr)
          alert('Failed to copy. Try downloading instead.')
        }
      })
    } catch (err) {
      console.error('Error copying badge image:', err)
    }
  }

  return (
    <div className="export-card-overlay" onClick={onClose}>
      <div className="export-card-container" onClick={e => e.stopPropagation()}>
        <div className="badge-export-card" ref={cardRef}>          
          <div className="card-avatar-wrapper">
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.name} className="card-avatar" />
            ) : (
              <InitialsAvatar name={player.name} size={80} className="card-avatar" />
            )}
          </div>

          <img src={badge.image} alt={badge.name} className="card-badge-image" />

          <div className="card-info">
            <div className="card-player-name">{player.name}</div>
            <div className="card-badge-name">{badge.name}</div>
            <div className="card-stats">
              {player.stat || 'ACHIEVED'} • {new Date().toLocaleDateString()}
            </div>
          </div>

          <div className="card-footer">
            <span>MUSIC_LEAGUE // ANALYTICS</span>
            <span>VERIFIED_GENUINE</span>
          </div>
        </div>

        <div className="export-actions">
          <button className="export-button btn-primary" onClick={handleDownload}>
            <span>💾</span> SAVE_IMAGE
          </button>
          <button className="export-button btn-secondary" onClick={handleCopy}>
            <span>📋</span> COPY_IMAGE
          </button>
          <button className="export-button btn-secondary" onClick={onClose}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportableBadgeCard
