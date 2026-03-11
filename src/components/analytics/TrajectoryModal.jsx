import React from 'react';
import TrajectorySection from './TrajectorySection';

const TrajectoryModal = ({
  isOpen,
  onClose,
  smoothLines,
  setSmoothLines,
  setIsRacingOpen,
  playerTrajectory,
  highlightedPlayers,
  togglePlayer,
  handleLegendClick,
  renderTrajectoryLegend
}) => {
  if (!isOpen) return null;

  return (
    <div className="trajectory-modal-backdrop" onClick={onClose}>
      <div className="trajectory-modal" onClick={e => e.stopPropagation()}>
        <div className="trajectory-modal-header">
          <h2 className="section-title">Points Trajectory</h2>
          <div className="trajectory-controls">
            <button className="expand-btn" onClick={() => setIsRacingOpen(true)} title="Racing Leaderboard">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                <line x1="4" y1="22" x2="4" y2="15"></line>
              </svg>
            </button>
            <label className="line-style-toggle">
              <span className="toggle-label">{smoothLines ? 'Smooth' : 'Angled'}</span>
              <div 
                className={`toggle-switch ${smoothLines ? 'active' : ''}`} 
                onClick={() => setSmoothLines(s => {
                  const next = !s;
                  localStorage.setItem('trajectory-smooth-lines', String(next));
                  return next;
                })}
              >
                <div className="toggle-knob" />
              </div>
            </label>
            <button className="expand-btn" onClick={onClose} title="Close fullscreen">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="trajectory-modal-chart">
          <TrajectorySection
            playerTrajectory={playerTrajectory}
            smoothLines={smoothLines}
            highlightedPlayers={highlightedPlayers}
            togglePlayer={togglePlayer}
            handleLegendClick={handleLegendClick}
            renderTrajectoryLegend={renderTrajectoryLegend}
            height="100%"
          />
        </div>
      </div>
    </div>
  );
};

export default TrajectoryModal;
