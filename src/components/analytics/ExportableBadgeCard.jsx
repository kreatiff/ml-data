import { useState, useRef, useMemo } from 'react'
import html2canvas from 'html2canvas'
import ClassicBadgeCard from './ClassicBadgeCard'
import TradingBadgeCard from './TradingBadgeCard'
import VinylBadgeCard from './VinylBadgeCard'
import CyberpunkBadgeCard from './CyberpunkBadgeCard'
import { getCategoryPalette } from '../../utils/themeHelpers'
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

  const getCanvasOptions = (themeId) => ({
    scale: 3,
    backgroundColor: null,
    logging: false,
    useCORS: true,
    onclone: (clonedDoc) => {
      const clonedCard = clonedDoc.querySelector('.badge-export-card')
      if (clonedCard) {
        // Strip the 3D carousel transformations so the export is perfectly flat.
        clonedCard.style.transform = 'none'
        clonedCard.style.margin = '0'
        clonedCard.style.maxWidth = 'none'
        
        // Enforce EXACT pixel boundaries to prevent flex/carousel distortions
        if (themeId === 'classic') {
          clonedCard.style.width = '360px'
          clonedCard.style.height = '540px'
        } else if (themeId === 'vinyl') {
          clonedCard.style.width = '400px'
          clonedCard.style.height = '400px'
        } else {
          // Trading/Cyberpunk
          clonedCard.style.width = '400px'
          clonedCard.style.height = '500px'
        }
      }
    }
  })

  const handleDownload = async () => {
    if (!cardRef.current) return

    try {
      const themeId = themes[activeThemeIndex].id
      const canvas = await html2canvas(cardRef.current, getCanvasOptions(themeId))
      const image = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = image
      link.download = `${player.name.replace(/\s+/g, '_')}_${badge.name.replace(/\s+/g, '_')}_${themeId}.png`
      link.click()
    } catch (err) {
      console.error('Error generating badge image:', err)
      alert('Failed to generate image. Please try again.')
    }
  }

  const handleCopy = async () => {
    if (!cardRef.current) return

    if (!navigator?.clipboard?.write) {
      alert('Your browser does not support direct image copying (or you are not in a secure context). Please use the Save Image button instead.')
      return
    }

    try {
      const themeId = themes[activeThemeIndex].id
      const canvas = await html2canvas(cardRef.current, getCanvasOptions(themeId))
      
      // Use a Promise to await the blob generation so we don't lose the 'transient user activation' 
      // required by some browsers for navigator.clipboard.write
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Image blob generation failed')

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      alert('Image copied to clipboard!')
    } catch (err) {
      console.error('Error copying badge image:', err)
      alert('Failed to copy to clipboard. Please try downloading instead.')
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
              const palette = getCategoryPalette(badge.category)
              
              return (
                <div 
                  key={theme.id}
                  className={`carousel-item ${isCenter ? 'active' : ''}`}
                  style={{
                    '--offset': position,
                    '--abs-offset': Math.abs(position),
                    ...palette
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
