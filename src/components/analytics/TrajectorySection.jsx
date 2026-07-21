import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PLAYER_COLORS } from '../../constants/ui';

const TrajectorySection = ({
  playerTrajectory,
  smoothLines,
  highlightedPlayers,
  togglePlayer,
  handleLegendClick,
  renderTrajectoryLegend,
  height = 600
}) => {
  return (
    <div className="trajectory-chart-container">
      <div className="trajectory-chart-header">
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={playerTrajectory.data}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="round_label"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
            height={30}
            interval={0}
          />
          <YAxis
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 13 }}
            allowDecimals={false}
            label={{ value: 'Total Points', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--spotify-elevated)',
              border: '2px solid var(--spotify-black)',
              borderRadius: '4px',
              color: 'var(--spotify-white)',
              fontSize: '0.85rem'
            }}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.round_name || label}
            itemSorter={(item) => -item.value}
          />
          <Legend content={renderTrajectoryLegend} onClick={handleLegendClick} />
          {playerTrajectory.players.map((name, i) => {
            const hasHighlights = highlightedPlayers.size > 0;
            const isHighlighted = !hasHighlights || highlightedPlayers.has(name);
            return (
              <Line
                key={name}
                type={smoothLines ? "monotone" : "linear"}
                dataKey={name}
                stroke={PLAYER_COLORS[i % PLAYER_COLORS.length]}
                strokeWidth={isHighlighted ? 3 : 1.5}
                strokeOpacity={isHighlighted ? 1 : 0.15}
                dot={isHighlighted ? { r: 3 } : false}
                activeDot={isHighlighted ? { r: 5, cursor: 'pointer', onClick: () => togglePlayer(name) } : false}
                name={name}
                style={{ cursor: 'pointer' }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrajectorySection;
