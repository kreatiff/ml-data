import React from 'react';

const PlayerStatsTable = ({
  isMobile,
  sortedPlayerStats,
  handlePlayerSort,
  getPlayerSortIcon
}) => {
  if (isMobile) {
    return (
      <div className="player-cards">
        {sortedPlayerStats.map((p, i) => (
          <div key={p.id} className="player-card">
            <div className="player-card-rank">#{i + 1}</div>
            <div className="player-card-info">
              <div className="player-card-name">{p.name}</div>
              <div className="player-card-stats">
                <span><strong>{p.totalPoints}</strong> pts</span>
                <span><strong>{p.avgPoints}</strong> avg</span>
                <span><strong>{p.submissionCount}</strong> songs</span>
                <span><strong>{p.roundWins}</strong> wins</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="analytics-table">
        <thead>
          <tr>
            <th>#</th>
            <th onClick={() => handlePlayerSort('name')} className="sortable">
              Player {getPlayerSortIcon('name')}
            </th>
            <th onClick={() => handlePlayerSort('totalPoints')} className="sortable">
              Total Pts {getPlayerSortIcon('totalPoints')}
            </th>
            <th onClick={() => handlePlayerSort('avgPoints')} className="sortable">
              Avg Pts {getPlayerSortIcon('avgPoints')}
            </th>
            <th onClick={() => handlePlayerSort('submissionCount')} className="sortable">
              Songs {getPlayerSortIcon('submissionCount')}
            </th>
            <th onClick={() => handlePlayerSort('roundWins')} className="sortable">
              Wins {getPlayerSortIcon('roundWins')}
            </th>
            <th onClick={() => handlePlayerSort('bestSongScore')} className="sortable">
              Best Song {getPlayerSortIcon('bestSongScore')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayerStats.map((p, i) => (
            <tr key={p.id}>
              <td className="rank-cell">{i + 1}</td>
              <td className="player-name-cell">{p.name}</td>
              <td><strong>{p.totalPoints}</strong></td>
              <td>{p.avgPoints}</td>
              <td>{p.submissionCount}</td>
              <td>{p.roundWins}</td>
              <td className="best-song-cell" title={p.bestSongName}>
                {p.bestSongScore} <span className="best-song-label">({p.bestSongName})</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerStatsTable;
