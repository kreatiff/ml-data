import { BADGE_CRITERIA } from "../constants/badges";

// ── Helper: pick players with max value ──
function pickMax(entries, minVal = 1) {
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map((e) => e.stat));
  if (max < minVal) return [];
  return entries.filter((e) => e.stat === max);
}

function fmtPlayer(id, nameMap, competitorMap) {
  return {
    id,
    name: nameMap[id] || "Unknown",
    avatar_url: competitorMap[id]?.avatar_url || "",
  };
}

// 1. Crown Jewel — most round wins
export function computeCrownJewel(playerMap, nameMap, competitorMap) {
  return pickMax(
    Object.entries(playerMap).map(([id, p]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: p.roundWins,
    })),
  );
}

// 2. Consistent — avg pts per song >= 3.0, min 3 rounds
export function computeConsistent(playerMap, nameMap, competitorMap) {
  return Object.entries(playerMap)
    .filter(([, p]) => {
      if (p.songCount < BADGE_CRITERIA.MIN_ROUNDS_FOR_CONSISTENT) return false;
      const avg = p.totalPoints / p.songCount;
      return avg >= BADGE_CRITERIA.CONSISTENT_MIN_AVG;
    })
    .map(([id, p]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: Math.round((p.totalPoints / p.songCount) * 100) / 100,
    }));
}

// 3. One Hit Wonder — has a song scoring 2x+ their average
export function computeOneHitWonder(playerMap, nameMap, competitorMap) {
  return Object.entries(playerMap)
    .filter(([, p]) => {
      if (p.songCount < BADGE_CRITERIA.ONE_HIT_WONDER_MIN_SONGS) return false;
      const avg = p.totalPoints / p.songCount;
      return avg > 0 && p.bestSongScore >= avg * BADGE_CRITERIA.ONE_HIT_WONDER_MULTIPLIER;
    })
    .map(([id, p]) => {
      const avg = Math.round((p.totalPoints / p.songCount) * 100) / 100;
      return {
        ...fmtPlayer(id, nameMap, competitorMap),
        stat: `Best: ${p.bestSongScore} (avg ${avg})`,
      };
    });
}

// 4. Cold Streak — had 5 or more songs score 0 points
export function computeColdStreak(playerMap, nameMap, competitorMap) {
  return Object.entries(playerMap)
    .filter(([, p]) => p.zeroSongs >= BADGE_CRITERIA.COLD_STREAK_SONG_THRESHOLD)
    .map(([id, p]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: `${p.zeroSongs} songs`,
    }));
}

// 5. Reached the Summit — was ever #1
export function computeSummit(standingsHistory, nameMap, competitorMap) {
  const summitPlayers = new Set();
  standingsHistory.forEach((s) => {
    s.rankings.forEach((r) => {
      if (r.rank === 1) summitPlayers.add(r.id);
    });
  });
  return [...summitPlayers].map((id) => ({
    ...fmtPlayer(id, nameMap, competitorMap),
    stat: "#1",
  }));
}

// 6. Reign — most consecutive rounds at #1
export function computeReign(standingsHistory, allPlayerIds, nameMap, competitorMap) {
  const streaks = {};
  allPlayerIds.forEach((id) => { streaks[id] = { max: 0, current: 0 }; });
  standingsHistory.forEach((s) => {
    allPlayerIds.forEach((id) => {
      const r = s.rankings.find((x) => x.id === id);
      if (r && r.rank === 1) {
        streaks[id].current++;
        if (streaks[id].current > streaks[id].max) streaks[id].max = streaks[id].current;
      } else {
        streaks[id].current = 0;
      }
    });
  });
  return pickMax(
    allPlayerIds.map((id) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: streaks[id].max,
    })),
  );
}

// 7. Podium — top 3 overall for 5+ consecutive rounds
export function computePodium(standingsHistory, allPlayerIds, nameMap, competitorMap) {
  const streaks = {};
  allPlayerIds.forEach((id) => { streaks[id] = { max: 0, current: 0 }; });
  standingsHistory.forEach((s) => {
    allPlayerIds.forEach((id) => {
      const r = s.rankings.find((x) => x.id === id);
      if (r && r.rank <= 3) {
        streaks[id].current++;
        if (streaks[id].current > streaks[id].max) streaks[id].max = streaks[id].current;
      } else {
        streaks[id].current = 0;
      }
    });
  });
  return allPlayerIds
    .filter((id) => streaks[id].max >= BADGE_CRITERIA.PODIUM_MIN_STREAK)
    .map((id) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: streaks[id].max,
    }));
}

// 8. Hot Streak — top 3 in a round for 3+ consecutive rounds
export function computeHotStreak(sortedRoundIds, songScores, allPlayerIds, nameMap, competitorMap) {
  const roundTop3 = {};
  sortedRoundIds.forEach((roundId) => {
    const roundSongs = Object.values(songScores).filter((ss) => ss.round_id === roundId);
    roundSongs.sort((a, b) => b.total - a.total);
    roundTop3[roundId] = new Set(roundSongs.slice(0, 3).map((ss) => ss.submitter_id));
  });
  const streaks = {};
  allPlayerIds.forEach((id) => { streaks[id] = { max: 0, current: 0 }; });
  sortedRoundIds.forEach((roundId) => {
    allPlayerIds.forEach((id) => {
      if (roundTop3[roundId]?.has(id)) {
        streaks[id].current++;
        if (streaks[id].current > streaks[id].max) streaks[id].max = streaks[id].current;
      } else {
        streaks[id].current = 0;
      }
    });
  });
  return allPlayerIds
    .filter((id) => streaks[id].max >= BADGE_CRITERIA.HOT_STREAK_MIN_STREAK)
    .map((id) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: streaks[id].max,
    }));
}

// 9. Dark Horse — won a round while ranked in the bottom half overall
export function computeDarkHorse(standingsHistory, roundWinners, nameMap, competitorMap) {
  const darkHorsePlayers = new Set();
  standingsHistory.forEach((s) => {
    const half = Math.ceil(s.rankings.length / 2);
    const winner = roundWinners[s.round_id];
    if (!winner) return;
    const winnerRanking = s.rankings.find((r) => r.id === winner.submitter_id);
    if (winnerRanking && winnerRanking.rank > half) {
      darkHorsePlayers.add(winner.submitter_id);
    }
  });
  return [...darkHorsePlayers].map((id) => ({
    ...fmtPlayer(id, nameMap, competitorMap),
    stat: "Won a round from the bottom half",
  }));
}

// 10. Hit Oracle — voted for winner in 5+ rounds
export function computeHitOracle(filteredVotes, roundWinners, nameMap, competitorMap) {
  const kingmakerRounds = {};
  filteredVotes.forEach((v) => {
    const winner = roundWinners[v.round_id];
    if (winner && v.spotify_uri === winner.spotify_uri && v.points_assigned > 0) {
      if (!kingmakerRounds[v.voter_id]) kingmakerRounds[v.voter_id] = new Set();
      kingmakerRounds[v.voter_id].add(v.round_id);
    }
  });
  return Object.entries(kingmakerRounds)
    .filter(([, rounds]) => rounds.size >= BADGE_CRITERIA.HIT_ORACLE_MIN_ROUNDS)
    .map(([id, rounds]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: rounds.size,
    }));
}

// 11. Stalker — gave > roundCount points to a single player
export function computeStalker(filteredVotes, roundCount, nameMap, competitorMap) {
  const pairPoints = {};
  filteredVotes.forEach((v) => {
    if (v.voter_id === v.submitter_id) return;
    const key = `${v.voter_id}_${v.submitter_id}`;
    pairPoints[key] = (pairPoints[key] || 0) + v.points_assigned;
  });
  const threshold = roundCount;
  if (threshold <= 0) return [];
  return Object.entries(pairPoints)
    .filter(([, pts]) => pts > threshold)
    .map(([key, pts]) => {
      const [voterId, submitterId] = key.split("_");
      return {
        ...fmtPlayer(voterId, nameMap, competitorMap),
        stat: `${pts} pts → ${nameMap[submitterId] || "Unknown"}`,
      };
    });
}

// 12. Non-conformist — gave points to last-place song in 5+ rounds
export function computeNonconformist(filteredVotes, songScores, roundLastPlace, nameMap, competitorMap) {
  const nonconformistRounds = {};
  filteredVotes.forEach((v) => {
    const key = `${v.round_id}_${v.spotify_uri}`;
    const ss = songScores[key];
    if (ss && ss.total === roundLastPlace[v.round_id] && v.points_assigned > 0) {
      if (!nonconformistRounds[v.voter_id]) nonconformistRounds[v.voter_id] = new Set();
      nonconformistRounds[v.voter_id].add(v.round_id);
    }
  });
  return Object.entries(nonconformistRounds)
    .filter(([, rounds]) => rounds.size >= BADGE_CRITERIA.NONCONFORMIST_ROUND_THRESHOLD)
    .map(([id, rounds]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: `${rounds.size} rounds`,
    }));
}

// 13. Crowd Pleaser — got > numPlayers total votes in a single round
export function computeCrowdPleaser(songScores, numPlayers, nameMap, competitorMap) {
  if (numPlayers <= 0) return [];
  const playerMaxVotes = {};
  Object.values(songScores).forEach((ss) => {
    if (ss.total > numPlayers) {
      if (!playerMaxVotes[ss.submitter_id] || ss.total > playerMaxVotes[ss.submitter_id]) {
        playerMaxVotes[ss.submitter_id] = ss.total;
      }
    }
  });
  return Object.entries(playerMaxVotes)
    .map(([id, max]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: `${max} pts in one round`,
    }));
}

// 14. Controversial — song with variance >= 2.0
export function computeControversial(songScores, competitorMap) {
  const entries = [];
  Object.values(songScores).forEach((ss) => {
    if (ss.votes.length < BADGE_CRITERIA.CONTROVERSIAL_MIN_VOTES) return;
    const mean = ss.votes.reduce((a, b) => a + b, 0) / ss.votes.length;
    const variance =
      ss.votes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / ss.votes.length;
    const rounded = Math.round(variance * 100) / 100;
    if (rounded >= BADGE_CRITERIA.CONTROVERSIAL_MIN_VARIANCE) {
      entries.push({
        id: ss.submitter_id,
        name: ss.submitter_name,
        avatar_url: competitorMap[ss.submitter_id]?.avatar_url || "",
        stat: `${ss.song_name} (var: ${rounded})`,
      });
    }
  });
  return entries;
}

// 15. Hipster — never submitted the same artist twice (min 3 songs)
export function computeHipster(filteredSubmissions, nameMap, competitorMap) {
  const playerArtists = {};
  const playerSongCounts = {};

  filteredSubmissions.forEach((s) => {
    playerSongCounts[s.submitter_id] = (playerSongCounts[s.submitter_id] || 0) + 1;
    if (!playerArtists[s.submitter_id]) {
      playerArtists[s.submitter_id] = new Set();
    }
    if (s.artists) {
      const artist = s.artists.trim();
      if (artist) {
        playerArtists[s.submitter_id].add(artist);
      }
    }
  });

  return Object.entries(playerArtists)
    .filter(([id, artists]) => {
      const songCount = playerSongCounts[id] || 0;
      return songCount >= BADGE_CRITERIA.MIN_HIPSTER_SONGS &&
             artists.size === songCount;
    })
    .map(([id, artists]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: `${artists.size} unique artists`,
    }));
}

// 16. Gotta Catch 'em All — received at least 1 vote from every other player
export function computeGottaCatchEmAll(filteredVotes, allPlayerIds, nameMap, competitorMap) {
  const uniqueVotersPerPlayer = {};
  allPlayerIds.forEach((id) => { uniqueVotersPerPlayer[id] = new Set(); });
  filteredVotes.forEach((v) => {
    if (
      v.voter_id !== v.submitter_id &&
      v.points_assigned > 0 &&
      uniqueVotersPerPlayer[v.submitter_id]
    ) {
      uniqueVotersPerPlayer[v.submitter_id].add(v.voter_id);
    }
  });
  const totalOthers = allPlayerIds.length - 1;
  if (totalOthers <= 0) return [];
  return allPlayerIds
    .filter((id) => uniqueVotersPerPlayer[id].size >= totalOthers)
    .map((id) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: `${uniqueVotersPerPlayer[id].size}/${totalOthers} voters`,
    }));
}

// 17. Commentator — left a comment on every song in at least 3 rounds
export function computeCommentator(filteredVotes, filteredSubmissions, roundSongCounts, nameMap, competitorMap) {
  const voterComments = {};
  filteredVotes.forEach((v) => {
    if (v.comment && v.comment.trim()) {
      if (!voterComments[v.voter_id]) voterComments[v.voter_id] = {};
      if (!voterComments[v.voter_id][v.round_id]) voterComments[v.voter_id][v.round_id] = 0;
      voterComments[v.voter_id][v.round_id]++;
    }
  });

  const players = [];
  Object.entries(voterComments).forEach(([voterId, roundData]) => {
    const completedRounds = [];
    Object.entries(roundData).forEach(([roundId, commentCount]) => {
      const totalSongs = roundSongCounts[roundId] || 0;
      const hasOwnSubmission = filteredSubmissions.some(
        (s) => s.submitter_id === voterId && s.round_id === roundId,
      );
      if (commentCount === totalSongs - (hasOwnSubmission ? 1 : 0)) {
        completedRounds.push(roundId);
      }
    });
    if (completedRounds.length >= BADGE_CRITERIA.MIN_COMMENTATOR_ROUNDS) {
      players.push({
        id: voterId,
        name: nameMap[voterId] || "Unknown",
        stat: completedRounds.length,
        displayStat: `${completedRounds.length} round${completedRounds.length > 1 ? "s" : ""}`,
      });
    }
  });

  return players
    .sort((a, b) => b.stat - a.stat)
    .map((p) => ({
      ...fmtPlayer(p.id, nameMap, competitorMap),
      stat: p.displayStat,
    }));
}

// 18. Keyboard Warrior — commented on >= 50% of all submitted songs
export function computeKeyboardWarrior(filteredVotes, filteredSubmissions, nameMap, competitorMap) {
  const totalSongs = filteredSubmissions.length;
  if (totalSongs === 0) return [];

  const commentCounts = {};
  filteredVotes.forEach((v) => {
    if (v.comment && v.comment.trim()) {
      commentCounts[v.voter_id] = (commentCounts[v.voter_id] || 0) + 1;
    }
  });

  const threshold = totalSongs * BADGE_CRITERIA.KEYBOARD_WARRIOR_RATIO;
  return Object.entries(commentCounts)
    .filter(([, count]) => count >= threshold)
    .map(([id, count]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: `${Math.round((count / totalSongs) * 100)}%`,
    }))
    .sort((a, b) => parseInt(b.stat) - parseInt(a.stat));
}

// 19. Procrastinator General — voted last in at least 2 rounds
export function computeProcrastinatorGeneral(votesByRound, sortedRoundIds, nameMap, competitorMap) {
  const lastVoterCounts = {};
  sortedRoundIds.forEach((roundId) => {
    const roundVotes = votesByRound[roundId] || [];
    if (roundVotes.length === 0) return;

    // Find latest vote per voter in this round
    const voterLatest = {};
    roundVotes.forEach((v) => {
      if (!v.vote_created_at) return;
      if (!voterLatest[v.voter_id] || v.vote_created_at > voterLatest[v.voter_id]) {
        voterLatest[v.voter_id] = v.vote_created_at;
      }
    });

    const entries = Object.entries(voterLatest);
    if (entries.length === 0) return;

    let maxTs = "";
    entries.forEach(([, ts]) => { if (ts > maxTs) maxTs = ts; });
    entries.forEach(([voterId, ts]) => {
      if (ts === maxTs) {
        lastVoterCounts[voterId] = (lastVoterCounts[voterId] || 0) + 1;
      }
    });
  });

  return Object.entries(lastVoterCounts)
    .filter(([, count]) => count >= BADGE_CRITERIA.PROCRASTINATOR_MIN_ROUNDS)
    .map(([id, count]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: `${count} round${count > 1 ? "s" : ""}`,
    }))
    .sort((a, b) => parseInt(b.stat) - parseInt(a.stat));
}

// 20. Infinity Gauntlet — collected 16 of 19 badges
export function computeInfinityGauntlet(badgeResults, otherBadgeIds, otherBadgeDefs, nameMap, competitorMap) {
  const playerBadgeSet = {};
  otherBadgeIds.forEach((bid) => {
    (badgeResults[bid] || []).forEach((p) => {
      if (!playerBadgeSet[p.id]) playerBadgeSet[p.id] = new Set();
      playerBadgeSet[p.id].add(bid);
    });
  });

  const minRequired = otherBadgeIds.length - BADGE_CRITERIA.INFINITY_GAUNTLET_MISSES_ALLOWED;

  const winners = Object.entries(playerBadgeSet)
    .filter(([, badges]) => badges.size >= minRequired)
    .map(([id, badges]) => ({
      ...fmtPlayer(id, nameMap, competitorMap),
      stat: `${badges.size}/${otherBadgeIds.length} badges`,
    }));

  // Closest contenders: top 3 counts (excluding winners), with per-badge earned status
  const contenders = Object.entries(playerBadgeSet)
    .filter(([, badges]) => badges.size < minRequired)
    .map(([id, badges]) => ({
      id,
      name: nameMap[id] || "Unknown",
      count: badges.size,
      badges: otherBadgeDefs.map((d) => ({
        id: d.id,
        name: d.name,
        image: d.image,
        earned: badges.has(d.id),
      })),
    }))
    .sort((a, b) => b.count - a.count);

  let closestPlayers = [];
  if (contenders.length > 0) {
    const cutoff =
      contenders.length >= 3
        ? contenders[2].count
        : contenders[contenders.length - 1].count;
    closestPlayers = contenders.filter((c) => c.count >= cutoff);
  }

  return { winners, closestPlayers, playerBadgeSet };
}
