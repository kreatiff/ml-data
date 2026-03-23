import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { PLAYER_COLORS } from '../../constants/ui';

const TOOLTIP_STYLE = {
  background: 'var(--spotify-elevated)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '4px',
  color: 'var(--spotify-white)',
  fontSize: '0.85rem'
};

const VoteProgressionChart = ({ data, roundSongs, height = '350px' }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="recap-chart-container" style={{ height, marginTop: '1rem' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: -20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="voterName"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={{ fontSize: '0.8rem', padding: '2px 0' }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: 'var(--spotify-green)' }}
            itemSorter={(item) => -item.value}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            content={({ payload }) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', fontSize: '10px', marginBottom: '10px' }}>
                {payload.map((entry, index) => (
                  <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: entry.color }} />
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>{entry.value}</span>
                  </div>
                ))}
              </div>
            )}
          />
          {roundSongs.map((song, i) => (
            <Line
              key={song.spotifyUri}
              type="stepAfter"
              dataKey={song.spotifyUri}
              name={song.songName}
              stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
              strokeWidth={i === 0 ? 3 : 2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
              animationDuration={1500}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VoteProgressionChart;
