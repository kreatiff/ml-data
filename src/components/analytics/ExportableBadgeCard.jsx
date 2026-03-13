import { useState, useRef, useMemo } from 'react'
import { Download, Copy, X, Check, Loader2 } from 'lucide-react'
import ClassicBadgeCard from './ClassicBadgeCard'
import TradingBadgeCard from './TradingBadgeCard'
import VinylBadgeCard from './VinylBadgeCard'
import CyberpunkBadgeCard from './CyberpunkBadgeCard'
import { getCategoryPalette } from '../../utils/themeHelpers'
import { useImageExport } from '../../hooks/useImageExport'
import './ExportableBadgeCard.css'

function ExportableBadgeCard({ player, badge, onClose }) {
  const [activeThemeIndex, setActiveThemeIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const cardRef = useRef(null)
  const { isExporting, copyImage, downloadImage } = useImageExport()

  const themes = useMemo(() => [
    { id: 'classic', name: 'Classic', Component: ClassicBadgeCard },
    { id: 'trading', name: 'Trading Card', Component: TradingBadgeCard },
    { id: 'vinyl', name: 'Vinyl Sleeve', Component: VinylBadgeCard },
    { id: 'cyberpunk', name: 'Cyberpunk ID', Component: CyberpunkBadgeCard },
  ], [])

  const getCanvasOptions = (themeId) => ({
    scale: 3,
    backgroundColor: null,
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
    if (!cardRef.current || isExporting) return

    const themeId = themes[activeThemeIndex].id
    const filename = `${player.name.replace(/\s+/g, '_')}_${badge.name.replace(/\s+/g, '_')}_${themeId}`
    await downloadImage(cardRef, filename, getCanvasOptions(themeId))
  }

  const handleCopy = async () => {
    if (!cardRef.current || isExporting) return

    const themeId = themes[activeThemeIndex].id
    const success = await copyImage(cardRef, 'badge_copy', getCanvasOptions(themeId))
    
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
          <button 
            className={`export-button btn-primary ${isExporting ? 'loading' : ''}`} 
            onClick={handleDownload}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
            <span>SAVE_IMAGE</span>
          </button>
          <button 
            className={`export-button btn-secondary ${copied ? 'success' : ''} ${isExporting ? 'loading' : ''}`} 
            onClick={handleCopy}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="animate-spin" size={18} /> : 
             copied ? <Check size={18} /> : <Copy size={18} />}
            <span>{copied ? 'COPIED!' : 'COPY_IMAGE'}</span>
          </button>
          <button className="export-button btn-secondary" onClick={onClose}>
            <X size={18} />
            <span>CLOSE</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportableBadgeCard
