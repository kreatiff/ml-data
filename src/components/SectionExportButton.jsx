import { useState } from 'react'
import { useImageExport } from '../hooks/useImageExport'
import './SectionExportButton.css'

export default function SectionExportButton({ targetRef, filename = 'stats_screenshot' }) {
  const { isExporting, copyImage } = useImageExport()
  const [copied, setCopied] = useState(false)

  const handleExport = async (e) => {
    e.stopPropagation()
    if (isExporting) return

    const success = await copyImage(targetRef, filename)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button 
      className={`section-export-btn ${copied ? 'is-copied' : ''} ${isExporting ? 'is-exporting' : ''}`}
      onClick={handleExport}
      title="Copy section to clipboard as image"
      disabled={isExporting}
      data-html2canvas-ignore="true"
    >
      <span className="export-icon">
        {copied ? '✅' : '📷'}
      </span>
      {copied && <span className="export-tooltip">Copied!</span>}
    </button>
  )
}
