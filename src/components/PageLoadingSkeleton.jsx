import './PageLoadingSkeleton.css'

function PageLoadingSkeleton() {
  return (
    <div className="page-loading-skeleton">
      <div className="skeleton-header">
        <div className="skeleton-title skeleton"></div>
        <div className="skeleton-action skeleton"></div>
      </div>
      <div className="skeleton-content">
        <div className="skeleton-card skeleton"></div>
        <div className="skeleton-card skeleton"></div>
        <div className="skeleton-card skeleton"></div>
        <div className="skeleton-card skeleton"></div>
      </div>
    </div>
  )
}

export default PageLoadingSkeleton
