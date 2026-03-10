import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PLAYER_COLORS } from '../constants/ui'
import './RacingBarChartModal.css'

function RacingBarChartModal({ 
  isOpen, 
  onClose, 
  playerTrajectory,
  leagues = [],
  selectedLeague,
  setSelectedLeague,
  getLeagueName
}) {
  const maxRounds = playerTrajectory.data.length - 1
  const [currentRoundIndex, setCurrentRoundIndex] = useState(maxRounds)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMultiplier, setSpeedMultiplier] = useState(1)
  const BASE_SPEED = 1000 // ms per round at 1x

  // Reset progress when data changes (e.g., league switch)
  useEffect(() => {
    const newMax = playerTrajectory.data.length - 1
    setCurrentRoundIndex(newMax)
    setIsPlaying(false)
  }, [playerTrajectory])

  // Block body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Playback timer (60fps LERP)
  useEffect(() => {
    if (!isPlaying) return
    
    const frameRate = 16 // ~60fps
    const increment = (frameRate / BASE_SPEED) * speedMultiplier // progress per frame

    const interval = setInterval(() => {
      setCurrentRoundIndex(prev => {
        if (prev >= maxRounds) {
          setIsPlaying(false)
          return maxRounds
        }
        return Math.min(prev + increment, maxRounds)
      })
    }, frameRate)
    
    return () => clearInterval(interval)
  }, [isPlaying, maxRounds, speedMultiplier])

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev && currentRoundIndex >= maxRounds) {
        setCurrentRoundIndex(0)
      }
      return !prev
    })
  }, [currentRoundIndex, maxRounds])

  const currentLeaderboard = useMemo(() => {
    const floorIdx = Math.floor(currentRoundIndex)
    const ceilIdx = Math.min(floorIdx + 1, maxRounds)
    const progress = currentRoundIndex - floorIdx

    const dataStart = playerTrajectory.data[floorIdx] || {}
    const dataEnd = playerTrajectory.data[ceilIdx] || {}

    return playerTrajectory.players
      .map((name, i) => {
        const startScore = dataStart[name] || 0
        const endScore = dataEnd[name] || 0
        // Linear Interpolation (LERP)
        const interpolatedScore = startScore + (endScore - startScore) * progress

        return {
          name,
          score: interpolatedScore,
          color: PLAYER_COLORS[i % PLAYER_COLORS.length]
        }
      })
      .sort((a, b) => b.score - a.name.localeCompare(b.name)) // Simple sort for initial, then by score
      .sort((a, b) => b.score - a.score)
  }, [currentRoundIndex, playerTrajectory, maxRounds])

  const maxScoreShown = useMemo(() => {
    // Stability: Use the final round's max score as the denominator so bars don't jitter
    const finalRound = playerTrajectory.data[maxRounds] || {}
    const finalMax = Math.max(...playerTrajectory.players.map(p => finalRound[p] || 0), 1)
    return finalMax
  }, [playerTrajectory, maxRounds])

  if (!isOpen) return null

  return (
    <div className="racing-modal-overlay" onClick={onClose}>
      <motion.div 
        className="racing-modal-content"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="racing-modal-header">
          <div className="header-text">
            <h2>Racing Leaderboard</h2>
            <p>{playerTrajectory.data[currentRoundIndex]?.round_name || 'Standings'}</p>
          </div>
          <div className="header-controls">
            {leagues.length > 0 && (
              <select
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="racing-league-select filter-select"
              >
                <option value="">All Leagues</option>
                {leagues.map(l => (
                  <option key={l.id} value={l.id}>{getLeagueName(l.id, l.name || l.id)}</option>
                ))}
              </select>
            )}
            <button className="racing-modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="racing-playback-controls">
          <button 
            className="racing-play-btn"
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          <div className="racing-speed-controls">
            {[0.5, 1, 2].map(multiplier => (
              <button
                key={multiplier}
                className={`speed-btn ${speedMultiplier === multiplier ? 'active' : ''}`}
                onClick={() => setSpeedMultiplier(multiplier)}
                title={`${multiplier}x Speed`}
              >
                {multiplier === 0.5 ? (
                  /* Turtle Icon (Slow) */
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.881 18h0.869c1.1935 0 2.3381 -0.4741 3.182 -1.318 0.8439 -0.8439 1.318 -1.9885 1.318 -3.182V9h1.5c0.3978 0 0.7794 -0.15804 1.0607 -0.43934S23.25 7.89782 23.25 7.5v-3c0 -0.79565 -0.3161 -1.55871 -0.8787 -2.12132C21.8087 1.81607 21.0457 1.5 20.25 1.5H16.5c-0.6501 0.18758 -1.2214 0.58188 -1.6274 1.12319 -0.406 0.54131 -0.6245 1.20017 -0.6226 1.87681V6"></path>
                    <path d="M12.945 9.15101c-1.3302 -1.07096 -2.98726 -1.65367 -4.695 -1.651 -4.142 0 -6 3.35799 -6 7.49999v1.5"></path>
                    <path d="M2.25 16.5c-0.39782 0 -0.77936 0.158 -1.06066 0.4393C0.908035 17.2206 0.75 17.6022 0.75 18c0 0.3978 0.158035 0.7793 0.43934 1.0607 0.2813 0.2813 0.66284 0.4393 1.06066 0.4393H12c3 0 3.75 -3 3.75 -4.5 0.0016 -1.1226 -0.2492 -2.2312 -0.7339 -3.2438S13.8253 9.85288 12.95 9.14999c0.3663 0.90541 0.5531 1.87331 0.55 2.85001 0 1.5 -0.75 4.5 -3.75 4.5h-7.5Z"></path>
                    <path d="M11.518 8.24701 3.26501 16.5"></path>
                    <path d="M5.75098 8.00101 12.678 14.928"></path>
                    <path d="m3.13599 10.636 5.863 5.863"></path>
                    <path d="M6.74998 19.5V21c0 0.3978 -0.15804 0.7794 -0.43934 1.0607 -0.28131 0.2813 -0.66284 0.4393 -1.06066 0.4393h-2.362c-0.15546 0 -0.30706 -0.0483 -0.43385 -0.1383 -0.12679 -0.0899 -0.2225 -0.217 -0.2739 -0.3637 -0.05139 -0.1468 -0.05592 -0.3058 -0.01297 -0.4552 0.04294 -0.1494 0.13126 -0.2818 0.25272 -0.3788l2.08 -1.664h2.25Z"></path>
                    <path d="M11.25 19.5V21c0 0.3978 0.158 0.7793 0.4393 1.0606 0.2813 0.2814 0.6629 0.4394 1.0607 0.4394h2.362c0.1555 0 0.3071 -0.0483 0.4338 -0.1383 0.1268 -0.0899 0.2225 -0.217 0.2739 -0.3638 0.0514 -0.1467 0.056 -0.3057 0.013 -0.4551 -0.0429 -0.1494 -0.1312 -0.2818 -0.2527 -0.3788L13.253 19.3"></path>
                    <circle cx="18.75" cy="4.5" r="0.375" fill="currentColor" />
                  </svg>
                ) : multiplier === 1 ? (
                  /* Duck/Chick Icon (Normal) */
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 6.01A5.245 5.245 0 0 0 15.943 0.754a5.252 5.252 0 0 0 -5.43 4.871 5.244 5.244 0 0 0 2.198 4.65A18.56 18.56 0 0 1 9 11.257a16.96 16.96 0 0 1 -8.25 -0.75v2.999a9.741 9.741 0 0 0 2.856 6.89 9.753 9.753 0 0 0 16.644 -6.89 5.457 5.457 0 0 0 -1.059 -3.562A5.212 5.212 0 0 0 21 6.01Z" />
                    <path d="M23.25 4.51 21 6.01l2.25 1.5" />
                    <path d="M8.25 15.76s1.5 3 4.5 2.25a3.958 3.958 0 0 0 3 -3.75" />
                    <circle cx="16.125" cy="5.635" r="0.375" fill="currentColor" />
                  </svg>
                ) : (
                  /* Rabbit Icon (Fast) */
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" height="18" width="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.238 23.25c3.307 0 5.245 -2.69 5.245 -6a5.704 5.704 0 0 0 -0.23 -1.55 4.474 4.474 0 0 0 3.997 -4.45c0 -3.75 -2.248 -4.5 -7.493 -7.5C10.51 0.75 8.243 0 7.494 1.5c-0.75 1.5 0.75 3 3.747 4.5l4.256 2.13a4.48 4.48 0 0 0 -1.249 3.2 4.768 4.768 0 0 0 -0.76 -0.08H6.746c-1.59 0 -3.115 0.632 -4.24 1.757a6.003 6.003 0 0 0 4.24 10.243h3.746" />
                    <path d="M5.25 17.25c3 0 4.5 3 3 6" />
                    <path d="M14.25 23.25h4.5" />
                    <circle cx="19.87" cy="10.88" r="0.375" fill="currentColor" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          
          <div className="racing-slider-container">
            <input 
              type="range"
              min={0}
              max={maxRounds}
              value={currentRoundIndex}
              onChange={e => {
                setIsPlaying(false)
                setCurrentRoundIndex(parseInt(e.target.value))
              }}
              className="racing-slider"
            />
            <div 
              className="racing-slider-fill" 
              style={{ width: `${(currentRoundIndex / maxRounds) * 100}%` }} 
            />
          </div>
          

        </div>

        <div className="racing-list-container">
          <div className="racing-list">
            {currentLeaderboard.map((item, index) => (
              <motion.div
                key={item.name}
                layout
                initial={false}
                className="racing-row"
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 1 }}
              >
                <div className="racing-rank">{index + 1}</div>
                <div className="racing-player-name" title={item.name}>{item.name}</div>
                <div className="racing-bar-track">
                  <motion.div 
                    className="racing-bar-fill"
                    initial={false}
                    animate={{ width: `${(item.score / maxScoreShown) * 100}%` }}
                    style={{ backgroundColor: item.color }}
                    transition={{ type: 'tween', ease: 'linear', duration: isPlaying ? 0.016 : 0.2 }}
                  />
                  <span className="racing-score">{Math.round(item.score)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default RacingBarChartModal
