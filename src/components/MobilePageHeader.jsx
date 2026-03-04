import './MobilePageHeader.css'

function MobilePageHeader({ title, rightContent }) {
  return (
    <header className="mobile-page-header">
      <h1 className="mobile-page-title">{title}</h1>
      {rightContent && <div className="mobile-page-action">{rightContent}</div>}
    </header>
  )
}

export default MobilePageHeader
