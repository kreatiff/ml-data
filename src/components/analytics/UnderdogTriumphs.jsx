import React from 'react';

const UnderdogTriumphs = ({ underdogTriumphs, isMobile }) => {
  if (underdogTriumphs.length === 0) return null;

  return (
    <section className="analytics-section">
      <h2 className="section-title">Underdog Triumphs</h2>
      <p className="section-desc">Rounds won by a player ranked outside the top 3 going in</p>
      {isMobile ? (
        <div className="underdog-cards">
          {underdogTriumphs.map((t, i) => (
            <div key={i} className="underdog-card">
              <div className="underdog-rank-badge">#{t.position_before} → 🏆</div>
              <div className="underdog-info">
                <div className="underdog-winner">{t.winner_name}</div>
                <div className="underdog-song">{t.song_name}</div>
                <div className="underdog-artist">{t.artists}</div>
                <div className="underdog-meta">
                  <span>{t.round_name}</span>
                  <span>{t.round_points} pts</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="table-scroll">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Winner</th>
                <th>Song</th>
                <th>Artist</th>
                <th>Ranked</th>
                <th>Round Pts</th>
              </tr>
            </thead>
            <tbody>
              {underdogTriumphs.map((t, i) => (
                <tr key={i}>
                  <td title={t.round_name}>{t.round_name}</td>
                  <td><strong>{t.winner_name}</strong></td>
                  <td className="song-name" title={t.song_name}>{t.song_name}</td>
                  <td title={t.artists}>{t.artists}</td>
                  <td className="underdog-position">#{t.position_before} of {t.total_players}</td>
                  <td>{t.round_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default UnderdogTriumphs;
