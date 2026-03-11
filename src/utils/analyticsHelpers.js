/**
 * Shared analytics computation helpers.
 * Used by useAnalytics, useBadges, and usePlaylistDefinitions to avoid
 * recomputing the same structures independently.
 */

/**
 * Compute song scores: total points per (round_id, spotify_uri).
 * Optionally tracks individual vote values and max-vote counts.
 *
 * @param {Array} filteredVotes - Flat vote records
 * @param {Object} [options]
 * @param {boolean} [options.trackVotes] - Collect individual vote values (for variance calc)
 * @param {number}  [options.maxPts]     - Track count of votes at this point value
 * @returns {Object} songScores keyed by `${round_id}_${spotify_uri}`
 */
export function computeSongScores(
  filteredVotes,
  { trackVotes = false, maxPts = null } = {},
) {
  const songScores = {};
  filteredVotes.forEach((v) => {
    const key = `${v.round_id}_${v.spotify_uri}`;
    if (!songScores[key]) {
      songScores[key] = {
        round_id: v.round_id,
        spotify_uri: v.spotify_uri,
        submitter_id: v.submitter_id,
        submitter_name: v.submitter_name,
        song_name: v.song_name,
        artists: v.artists,
        round_name: v.round_name,
        round_date: v.round_date,
        total: 0,
      };
      if (trackVotes) songScores[key].votes = [];
      if (maxPts !== null) {
        songScores[key].maxVoteCount = 0;
        songScores[key].voterCount = 0;
      }
    }
    songScores[key].total += v.points_assigned;
    if (trackVotes) songScores[key].votes.push(v.points_assigned);
    if (maxPts !== null) {
      if (v.points_assigned === maxPts) songScores[key].maxVoteCount++;
      songScores[key].voterCount++;
    }
  });
  return songScores;
}

/**
 * Find the highest-scoring song per round.
 * @param {Object} songScores - Output of computeSongScores
 * @returns {Object} roundWinners keyed by round_id
 */
export function computeRoundWinners(songScores) {
  const roundWinners = {};
  Object.values(songScores).forEach((ss) => {
    if (
      !roundWinners[ss.round_id] ||
      ss.total > roundWinners[ss.round_id].total
    ) {
      roundWinners[ss.round_id] = ss;
    }
  });
  return roundWinners;
}

/**
 * Find the lowest score per round.
 * @param {Object} songScores - Output of computeSongScores
 * @returns {Object} roundLastPlace keyed by round_id → min total
 */
export function computeRoundLastPlace(songScores) {
  const roundLastPlace = {};
  Object.values(songScores).forEach((ss) => {
    if (
      roundLastPlace[ss.round_id] === undefined ||
      ss.total < roundLastPlace[ss.round_id]
    ) {
      roundLastPlace[ss.round_id] = ss.total;
    }
  });
  return roundLastPlace;
}

/**
 * Extract sorted round IDs from votes (chronological by round_date).
 * @param {Array} filteredVotes
 * @returns {{ sortedRoundIds: string[], roundDates: Object }}
 */
export function buildSortedRounds(filteredVotes) {
  const roundDates = {};
  filteredVotes.forEach((v) => {
    if (v.round_id && v.round_date && !roundDates[v.round_id]) {
      roundDates[v.round_id] = v.round_date;
    }
  });
  const sortedRoundIds = Object.keys(roundDates).sort(
    (a, b) => new Date(roundDates[a]) - new Date(roundDates[b]),
  );
  return { sortedRoundIds, roundDates };
}

/**
 * Build a submitter_id → name map from submissions.
 * @param {Array} filteredSubmissions
 * @returns {Object} nameMap
 */
export function buildNameMap(filteredSubmissions) {
  const nameMap = {};
  filteredSubmissions.forEach((s) => {
    nameMap[s.submitter_id] = s.submitter_name;
  });
  return nameMap;
}

/**
 * Build a submitter_id → { name, avatar_url } map from submissions.
 * @param {Array} filteredSubmissions
 * @returns {Object} competitorMap
 */
export function buildCompetitorMap(filteredSubmissions) {
  const competitorMap = {};
  filteredSubmissions.forEach((s) => {
    competitorMap[s.submitter_id] = {
      name: s.submitter_name,
      avatar_url: s.submitter_avatar,
    };
  });
  return competitorMap;
}

/**
 * Build cumulative standings history over sorted rounds.
 * @param {Object} params
 * @param {string[]} params.sortedRoundIds
 * @param {Object} params.songScores - Output of computeSongScores
 * @param {string[]} params.allPlayerIds
 * @returns {Array} standingsHistory - [{ round_id, rankings: [{ id, total, rank }] }]
 */
export function buildStandingsHistory({
  sortedRoundIds,
  songScores,
  allPlayerIds,
}) {
  const cumulativePoints = {};
  allPlayerIds.forEach((id) => {
    cumulativePoints[id] = 0;
  });

  return sortedRoundIds.map((roundId) => {
    // Add this round's song scores to cumulative
    Object.values(songScores).forEach((ss) => {
      if (
        ss.round_id === roundId &&
        cumulativePoints[ss.submitter_id] !== undefined
      ) {
        cumulativePoints[ss.submitter_id] += ss.total;
      }
    });

    // Rank players
    const ranked = allPlayerIds
      .map((id) => ({ id, total: cumulativePoints[id] }))
      .sort((a, b) => b.total - a.total);

    ranked.forEach((r, i) => {
      r.rank =
        i === 0 || ranked[i - 1].total !== r.total ? i + 1 : ranked[i - 1].rank;
    });

    return { round_id: roundId, rankings: ranked };
  });
}

/**
 * Build per-round per-submitter point totals from votes.
 * @param {Array} filteredVotes
 * @returns {Object} pointsByRoundPlayer[round_id][submitter_id] = total
 */
export function buildPointsByRoundPlayer(filteredVotes) {
  const pointsByRoundPlayer = {};
  filteredVotes.forEach((v) => {
    if (!pointsByRoundPlayer[v.round_id]) pointsByRoundPlayer[v.round_id] = {};
    if (!pointsByRoundPlayer[v.round_id][v.submitter_id])
      pointsByRoundPlayer[v.round_id][v.submitter_id] = 0;
    pointsByRoundPlayer[v.round_id][v.submitter_id] += v.points_assigned;
  });
  return pointsByRoundPlayer;
}
