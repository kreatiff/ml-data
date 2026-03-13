import { useState } from 'react'
import html2canvas from 'html2canvas'

/**
 * Hook for capturing a DOM element as an image and copying it to the clipboard or downloading it.
 */
export function useImageExport() {
  const [isExporting, setIsExporting] = useState(false)

  const getCanvasOptions = (options = {}) => ({
    scale: 2, // 2x for good quality without massive files
    backgroundColor: 'var(--spotify-black, #121212)', // Default to app background
    logging: false,
    useCORS: true,
    ...options,
  })

  const copyImage = async (ref, filename = 'screenshot') => {
    if (!ref.current) return false

    if (!navigator?.clipboard?.write) {
      alert('Your browser does not support direct image copying. Please try downloading or use a modern browser.')
      return false
    }

    setIsExporting(true)
    try {
      const canvas = await html2canvas(ref.current, getCanvasOptions())
      
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0))
      if (!blob) throw new Error('Failed to generate image blob')

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      
      return true
    } catch (err) {
      console.error('Error copying image:', err)
      return false
    } finally {
      setIsExporting(false)
    }
  }

  const downloadImage = async (ref, filename = 'screenshot') => {
    if (!ref.current) return false

    setIsExporting(true)
    try {
      const canvas = await html2canvas(ref.current, getCanvasOptions())
      const image = canvas.toDataURL('image/png', 1.0)
      
      const link = document.createElement('a')
      link.href = image
      link.download = `${filename}.png`
      link.click()
      
      return true
    } catch (err) {
      console.error('Error downloading image:', err)
      return false
    } finally {
      setIsExporting(false)
    }
  }

  return {
    isExporting,
    copyImage,
    downloadImage,
  }
}
