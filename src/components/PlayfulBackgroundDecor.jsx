import { useEffect, useRef } from 'react'
import './PlayfulBackgroundDecor.css'

// Confetti-palette circles spread around the viewport edges (the top-left
// corner is left clear - that's the signature anchor circle from
// PlayfulTheme.css's .theme-playful.app::before). Each has its own parallax
// speed (fraction of scroll distance) so they drift past at different rates.
// Flat, no blur - matches the rest of the theme's hard-edged Memphis look.
const CIRCLES = [
  { color: '#8B5CF6', size: 260, top: '6%', left: '88%', opacity: 0.4, speed: 0.15 },
  { color: '#F472B6', size: 320, top: '55%', left: '-8%', opacity: 0.35, speed: 0.28 },
  { color: '#34D399', size: 190, top: '22%', left: '70%', opacity: 0.4, speed: 0.40 },
  { color: '#FBBF24', size: 230, top: '82%', left: '75%', opacity: 0.4, speed: 0.10 },
  { color: '#38BDF8', size: 170, top: '70%', left: '20%', opacity: 0.4, speed: 0.22 },
  { color: '#FB923C', size: 150, top: '40%', left: '96%', opacity: 0.45, speed: 0.45 },
]

function PlayfulBackgroundDecor() {
  const wrapRefs = useRef([])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return

    let ticking = false
    const applyParallax = () => {
      const y = window.scrollY
      wrapRefs.current.forEach((el, i) => {
        if (!el) return
        el.style.transform = `translateY(${y * CIRCLES[i].speed}px)`
      })
      ticking = false
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(applyParallax)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    applyParallax()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="playful-bg-decor" aria-hidden="true">
      {CIRCLES.map((c, i) => (
        <div
          key={i}
          ref={el => (wrapRefs.current[i] = el)}
          className="playful-bg-decor-wrap"
          style={{ top: c.top, left: c.left }}
        >
          <div
            className="playful-bg-decor-circle"
            style={{
              width: c.size,
              height: c.size,
              background: c.color,
              opacity: c.opacity,
              animationDelay: `${i * 1.3}s`,
            }}
          />
        </div>
      ))}
    </div>
  )
}

export default PlayfulBackgroundDecor
