import { useEffect } from 'react'
import './BottomSheet.css'

function BottomSheet({ isOpen, onClose, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div className="bottom-sheet-backdrop" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-handle" />
        <div className="bottom-sheet-header">
          <h3>Preferences</h3>
          <button 
            className="bottom-sheet-close" 
            onClick={onClose}
            aria-label="Close preferences"
          >
            ✕
          </button>
        </div>
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  )
}

export default BottomSheet
