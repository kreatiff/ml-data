import { useState, useRef, useMemo } from 'react'
import html2canvas from 'html2canvas'
import ClassicBadgeCard from './ClassicBadgeCard'
import TradingBadgeCard from './TradingBadgeCard'
import VinylBadgeCard from './VinylBadgeCard'
import CyberpunkBadgeCard from './CyberpunkBadgeCard'
import './ExportableBadgeCard.css'

function ExportableBadgeCard({ player, badge, onClose }) {
  const [activeThemeIndex, setActiveThemeIndex] = useState(0)
  const cardRef = useRef(null)

  const themes = useMemo(() => [
    { id: 'classic', name: 'Classic', Component: ClassicBadgeCard },
    { id: 'trading', name: 'Trading Card', Component: TradingBadgeCard },
    { id: 'vinyl', name: 'Vinyl Sleeve', Component: VinylBadgeCard },
    { id: 'cyberpunk', name: 'Cyberpunk ID', Component: CyberpunkBadgeCard },
  ], [])

  const handleDownload = async () => {
    if (!cardRef.current) return

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
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
            clonedCard.style.transform = 'none'
            
            // Special handling for vinyl square aspect
            if (clonedCard.classList.contains('vinyl-theme')) {
              clonedCard.style.height = '400px'
            }
          }
        }
      })

      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `${player.name.replace(/\s+/g, '_')}_${badge.name.replace(/\s+/g, '_')}_${themes[activeThemeIndex].id}.png`
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
            clonedCard.style.transform = 'none'

            if (clonedCard.classList.contains('vinyl-theme')) {
              clonedCard.style.height = '400px'
            }
          }
        }
      })

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
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

  const handlePrev = () => {
    setActiveThemeIndex((prev) => (prev === 0 ? themes.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setActiveThemeIndex((prev) => (prev === themes.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="export-card-overlay" onClick={onClose}>
      <div className="export-card-container" onClick={e => e.stopPropagation()}>
        
        <div className="carousel-wrapper">
          <button className="carousel-nav prev" onClick={handlePrev}>‹</button>
          
          <div className="carousel-viewport">
            {themes.map((theme, index) => {
              const diff = index - activeThemeIndex
              
              // Basic wrapping logic for 4 items
              let position = diff
              if (diff > 2) position = diff - themes.length
              if (diff < -1) position = diff + themes.length

              const isCenter = index === activeThemeIndex
              
              return (
                <div 
                  key={theme.id}
                  className={`carousel-item ${isCenter ? 'active' : ''}`}
                  style={{
                    '--offset': position,
                    '--abs-offset': Math.abs(position),
                    '--badge-color': badge.color || 'var(--spotify-green)'
                  }}
                >
                  <theme.Component 
                    player={player} 
                    badge={badge} 
                    cardRef={isCenter ? cardRef : null} 
                  />
                </div>
              )
            })}
          </div>

          <button className="carousel-nav next" onClick={handleNext}>›</button>
        </div>

        <div className="theme-name-display">
          STYLE: {themes[activeThemeIndex].name.toUpperCase()}
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
