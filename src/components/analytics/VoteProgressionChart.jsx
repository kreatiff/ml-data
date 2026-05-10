import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PLAYER_COLORS } from '../../constants/ui';
import '../RacingBarChartModal.css';

const BASE_SPEED = 1000; // ms per vote at 1x

const VoteProgressionChart = ({ data, roundSongs, height = '450px' }) => {
  const maxVotes = data.length - 1;
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  // Reset progress when data changes
  useEffect(() => {
    setCurrentVoteIndex(0);
    setIsPlaying(false);
    setHasPlayed(false);
  }, [data]);

  // Playback timer (60fps LERP)
  useEffect(() => {
    if (!isPlaying) return;
    
    const frameRate = 16; // ~60fps
    const increment = (frameRate / BASE_SPEED) * speedMultiplier;

    const interval = setInterval(() => {
      setCurrentVoteIndex(prev => {
        if (prev >= maxVotes) {
          setIsPlaying(false);
          return maxVotes;
        }
        return Math.min(prev + increment, maxVotes);
      });
    }, frameRate);
    
    return () => clearInterval(interval);
  }, [isPlaying, maxVotes, speedMultiplier]);

  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev && currentVoteIndex >= maxVotes) {
        setCurrentVoteIndex(0);
      }
      return !prev;
    });
    setHasPlayed(true);
  }, [currentVoteIndex, maxVotes]);

  const currentLeaderboard = useMemo(() => {
    const floorIdx = Math.floor(currentVoteIndex);
    const ceilIdx = Math.min(floorIdx + 1, maxVotes);
    const progress = currentVoteIndex - floorIdx;

    const dataStart = data[floorIdx] || {};
    const dataEnd = data[ceilIdx] || {};

    return roundSongs
      .map((song, i) => {
        const startScore = dataStart[song.spotifyUri] || 0;
        const endScore = dataEnd[song.spotifyUri] || 0;
        // Linear Interpolation (LERP)
        const interpolatedScore = startScore + (endScore - startScore) * progress;

        return {
          name: song.songName,
          id: song.spotifyUri,
          score: interpolatedScore,
          color: PLAYER_COLORS[i % PLAYER_COLORS.length]
        };
      })
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [currentVoteIndex, data, roundSongs, maxVotes]);

  const maxScoreShown = useMemo(() => {
    const finalRound = data[maxVotes] || {};
    const finalMax = Math.max(...roundSongs.map(s => finalRound[s.spotifyUri] || 0), 1);
    return finalMax;
  }, [data, roundSongs, maxVotes]);

  if (!data || data.length === 0) return null;

  const currentVoter = data[Math.floor(currentVoteIndex)]?.voterName || 'Starting Standings';

  return (
    <div className="racing-component-container" style={{ height, display: 'flex', flexDirection: 'column' }}>
      <div className="racing-playback-controls" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px 8px 0 0' }}>
        <button 
          className={`racing-play-btn ${!isPlaying && !hasPlayed ? 'pulsating' : ''}`}
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
              {multiplier}x
            </button>
          ))}
        </div>
        
        <div className="racing-slider-container">
          <input 
            type="range"
            min={0}
            max={maxVotes}
            step={0.01}
            value={currentVoteIndex}
            onChange={e => {
              setIsPlaying(false);
              setCurrentVoteIndex(parseFloat(e.target.value));
            }}
            className="racing-slider"
          />
          <div 
            className="racing-slider-fill" 
            style={{ width: `${(currentVoteIndex / maxVotes) * 100}%` }} 
          />
        </div>

        <div className="racing-round-info" style={{ minWidth: '120px' }}>
          {currentVoter}
        </div>
      </div>

      <div className="racing-list-container" style={{ borderRadius: '0 0 8px 8px' }}>
        <div className="racing-list">
          <AnimatePresence mode="popLayout">
            {currentLeaderboard.map((item, index) => (
              <motion.div
                key={item.id}
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
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VoteProgressionChart;

