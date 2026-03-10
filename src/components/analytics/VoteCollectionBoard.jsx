import React from 'react';

const VoteCollectionBoard = ({ voteCollectionBoard }) => {
  if (voteCollectionBoard.length === 0) return null;

  return (
    <section className="analytics-section">
      <h2 className="section-title">Gotta Catch 'Em All!</h2>
      <p className="section-desc">Who is closest to receiving a vote from every other player?</p>
      <div className="vote-collection-list">
        {voteCollectionBoard.map((p, i) => (
          <div key={p.id} className="vote-collection-row">
            <div className="vcr-rank">#{i + 1}</div>
            <div className="vcr-info">
              <div className="vcr-name-row">
                <span className="vcr-name">{p.name}</span>
                <span className="vcr-count">{p.uniqueVoters}/{p.totalOthers}</span>
              </div>
              <div className="vcr-bar-track">
                <div
                  className={`vcr-bar-fill ${p.pct === 100 ? 'vcr-complete' : ''}`}
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              {p.missing.length > 0 && (
                <div className="vcr-missing">Missing: {p.missing.join(', ')}</div>
              )}
            </div>
            <div className="vcr-pct">{p.pct}%</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default VoteCollectionBoard;
