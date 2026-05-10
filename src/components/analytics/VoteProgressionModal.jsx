import React from 'react';
import VoteProgressionChart from './VoteProgressionChart';

const VoteProgressionModal = ({ isOpen, onClose, data, roundSongs }) => {
  if (!isOpen) return null;

  return (
    <div className="trajectory-modal-backdrop" onClick={onClose}>
      <div className="trajectory-modal" onClick={e => e.stopPropagation()}>
        <div className="trajectory-modal-header">
          <h2 className="section-title">🗳️ Vote Progression Race</h2>
          <div className="trajectory-controls">
            <button className="expand-btn" onClick={onClose} title="Close fullscreen">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="4" x2="12" y2="12" />
                <line x1="12" y1="4" x2="4" y2="12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="trajectory-modal-chart">
          <p className="recap-section-desc" style={{ marginLeft: '1rem' }}>
            Watch the scores climb as each voter submitted their ballot chronologically.
          </p>
          <VoteProgressionChart 
            data={data} 
            roundSongs={roundSongs} 
            height="100%" 
          />
        </div>
      </div>
    </div>
  );
};

export default VoteProgressionModal;
