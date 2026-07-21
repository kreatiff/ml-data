import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const TopArtistsChart = ({ topArtists, isMobile, themeGreen }) => {
  if (topArtists.length === 0) return null;

  return (
    <section className="analytics-section">
      <h2 className="section-title">Most Submitted Artists</h2>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={Math.max(400, topArtists.length * 28)}>
          <BarChart
            data={topArtists}
            layout="vertical"
            margin={{ top: 5, right: 30, left: isMobile ? 80 : 120, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis type="number" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              stroke="rgba(255,255,255,0.3)"
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: isMobile ? 11 : 12 }}
              width={isMobile ? 75 : 115}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--spotify-elevated)',
                border: '2px solid var(--spotify-black)',
                borderRadius: '4px',
                color: 'var(--spotify-white)',
                fontSize: '0.85rem'
              }}
            />
            <Bar dataKey="count" fill={themeGreen} radius={[0, 3, 3, 0]} name="Submissions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default TopArtistsChart;
