import { useState, useEffect, memo } from 'react'
import InitialsAvatar from './InitialsAvatar'
import './DynamicImage.css'

/**
 * DynamicImage Component
 * 
 * Handles loading states with a skeleton loader and provides a premium
 * vinyl placeholder for missing images.
 */
function DynamicImage({ 
  src, 
  alt = '', 
  className = '', 
  size = 100, 
  placeholderName = '?',
  borderRadius = '8px'
}) {
  const [status, setStatus] = useState('loading') // loading | loaded | error
  const [currentSrc, setCurrentSrc] = useState(src)

  // Reset status when src changes
  useEffect(() => {
    if (src !== currentSrc) {
      setCurrentSrc(src)
      setStatus(src ? 'loading' : 'error')
    } else if (!src) {
      setStatus('error')
    }
  }, [src, currentSrc])

  const handleLoad = () => setStatus('loaded')
  const handleError = () => setStatus('error')

  return (
    <div 
      className={`dynamic-image-wrapper ${className}`}
      style={{ 
        width: size, 
        height: size, 
        borderRadius,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.03)'
      }}
    >
      {/* Skeleton / Loading State */}
      {status === 'loading' && (
        <div className="dynamic-image-skeleton" />
      )}

      {/* Actual Image */}
      {src && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`dynamic-image-element ${status === 'loaded' ? 'is-loaded' : ''}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: status === 'loaded' ? 'block' : 'none'
          }}
        />
      )}

      {/* Error / Placeholder State */}
      {status === 'error' && (
        <div className="dynamic-image-placeholder">
          <InitialsAvatar 
            name={placeholderName} 
            size={size} 
            variant="vinyl" 
            borderRadius={borderRadius}
          />
        </div>
      )}
    </div>
  )
}

export default memo(DynamicImage)
