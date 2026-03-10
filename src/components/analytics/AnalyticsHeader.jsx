import React from 'react';
import MobilePageHeader from '../MobilePageHeader';

const AnalyticsHeader = ({
  isMobile,
  leagues,
  selectedLeague,
  setSelectedLeague,
  totalSubmissions,
  totalVotes,
  playerCount,
  activeTeam,
  getLeagueName
}) => {
  const leagueSelect = leagues.length >= 1 && (
    <select
      value={selectedLeague}
      onChange={(e) => setSelectedLeague(e.target.value)}
      className="theme-selector filter-select"
    >
      <option value="">{isMobile ? 'All' : 'All Leagues'}</option>
      {leagues.map(l => {
        const fullName = getLeagueName(l.id, l.name || l.id);
        if (isMobile) {
          let year = fullName.match(/\d{4}/)?.[0];
          if (!year && fullName.toLowerCase().includes('fearless')) year = '2025';
          return <option key={l.id} value={l.id}>{year || fullName}</option>;
        }
        return <option key={l.id} value={l.id}>{fullName}</option>;
      })}
    </select>
  );

  if (isMobile) {
    return <MobilePageHeader title="Analytics" rightContent={leagueSelect} />;
  }

  return (
    <div className="analytics-header">
      <div className="analytics-header-row">
        <h1>Analytics</h1>
        {leagueSelect}
      </div>
      <div className="analytics-summary">
        <span className="summary-stat"><strong>{totalSubmissions}</strong> submissions</span>
        <span className="summary-divider">/</span>
        <span className="summary-stat"><strong>{totalVotes}</strong> votes</span>
        <span className="summary-divider">/</span>
        <span className="summary-stat"><strong>{playerCount}</strong> players</span>
        {activeTeam && (
          <>
            <span className="summary-divider">/</span>
            <span className="summary-stat team-badge">Team: <strong>{activeTeam}</strong></span>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsHeader;
