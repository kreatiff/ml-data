import { useMemo } from "react";
import {
  computeSongScores,
  computeRoundWinners,
  computeRoundLastPlace,
  buildSortedRounds,
  buildNameMap,
  buildCompetitorMap,
  buildStandingsHistory,
} from "../utils/analyticsHelpers";

import {
  computeCrownJewel,
  computeConsistent,
  computeOneHitWonder,
  computeColdStreak,
  computeSummit,
  computeReign,
  computePodium,
  computeHotStreak,
  computeDarkHorse,
  computeHitOracle,
  computeStalker,
  computeNonconformist,
  computeCrowdPleaser,
  computeControversial,
  computeHipster,
  computeGottaCatchEmAll,
  computeCommentator,
  computeKeyboardWarrior,
  computeProcrastinatorGeneral,
  computeInfinityGauntlet,
} from "../utils/badgeComputations";

import { buildBadgeStats } from "../utils/badgeStats";
import { BADGE_DEFS } from "../constants/badges";

export function useBadges(filteredVotes, filteredSubmissions) {
  return useMemo(() => {
    if (!filteredVotes.length || !filteredSubmissions.length) {
      return BADGE_DEFS.map((d) => ({ ...d, players: [], achieved: false }));
    }

    // ── Precompute shared structures ──
    const songScores = computeSongScores(filteredVotes, { trackVotes: true });
    const roundWinners = computeRoundWinners(songScores);
    const roundLastPlace = computeRoundLastPlace(songScores);

    // Pre-group votes by round for O(1) lookup
    const votesByRound = {};
    filteredVotes.forEach((v) => {
      if (!votesByRound[v.round_id]) votesByRound[v.round_id] = [];
      votesByRound[v.round_id].push(v);
    });

    // Per-player stats
    const playerMap = {};
    filteredSubmissions.forEach((s) => {
      if (!playerMap[s.submitter_id]) {
        playerMap[s.submitter_id] = {
          name: s.submitter_name,
          totalPoints: 0,
          totalPointsGiven: 0,
          commentCount: 0,
          songCount: 0,
          bestSongScore: 0,
          roundWins: 0,
          zeroSongs: 0,
        };
      }
      playerMap[s.submitter_id].songCount++;
    });

    Object.values(songScores).forEach((ss) => {
      if (playerMap[ss.submitter_id]) {
        playerMap[ss.submitter_id].totalPoints += ss.total;
        if (ss.total > playerMap[ss.submitter_id].bestSongScore) {
          playerMap[ss.submitter_id].bestSongScore = ss.total;
        }
        if (ss.total === 0) {
          playerMap[ss.submitter_id].zeroSongs++;
        }
      }
    });

    filteredVotes.forEach((v) => {
      if (playerMap[v.voter_id]) {
        playerMap[v.voter_id].totalPointsGiven += v.points_assigned;
        if (v.comment && v.comment.trim()) {
          playerMap[v.voter_id].commentCount++;
        }
      }
    });

    Object.entries(roundWinners).forEach(([, w]) => {
      if (playerMap[w.submitter_id]) playerMap[w.submitter_id].roundWins++;
    });

    // Sorted rounds + standings history
    const { sortedRoundIds } = buildSortedRounds(filteredVotes);
    const nameMap = buildNameMap(filteredSubmissions);
    const competitorMap = buildCompetitorMap(filteredSubmissions);
    Object.entries(playerMap).forEach(([id, p]) => {
      nameMap[id] = p.name;
      if (!competitorMap[id]) {
        competitorMap[id] = { name: p.name, avatar_url: "" };
      }
    });
    const allPlayerIds = Object.keys(playerMap);
    const standingsHistory = buildStandingsHistory({
      sortedRoundIds,
      songScores,
      allPlayerIds,
    });

    // Round song counts (for commentator badge)
    const roundSongCounts = {};
    filteredSubmissions.forEach((s) => {
      roundSongCounts[s.round_id] = (roundSongCounts[s.round_id] || 0) + 1;
    });

    // ── Badge computations ──
    const badgeResults = {};

    badgeResults.crown_jewel = computeCrownJewel(playerMap, nameMap, competitorMap);
    badgeResults.consistent = computeConsistent(playerMap, nameMap, competitorMap);
    badgeResults.one_hit_wonder = computeOneHitWonder(playerMap, nameMap, competitorMap);
    badgeResults.cold_streak = computeColdStreak(playerMap, nameMap, competitorMap);
    badgeResults.summit = computeSummit(standingsHistory, nameMap, competitorMap);
    badgeResults.reign = computeReign(standingsHistory, allPlayerIds, nameMap, competitorMap);
    badgeResults.podium = computePodium(standingsHistory, allPlayerIds, nameMap, competitorMap);
    badgeResults.hot_streak = computeHotStreak(sortedRoundIds, songScores, allPlayerIds, nameMap, competitorMap);
    badgeResults.dark_horse = computeDarkHorse(standingsHistory, roundWinners, nameMap, competitorMap);
    badgeResults.kingmaker = computeHitOracle(filteredVotes, roundWinners, nameMap, competitorMap);
    badgeResults.stalker = computeStalker(filteredVotes, sortedRoundIds.length, nameMap, competitorMap);
    badgeResults.nonconformist = computeNonconformist(filteredVotes, songScores, roundLastPlace, nameMap, competitorMap);
    badgeResults.crowd_pleaser = computeCrowdPleaser(songScores, allPlayerIds.length, nameMap, competitorMap);
    badgeResults.controversial = computeControversial(songScores, competitorMap);
    badgeResults.hipster = computeHipster(filteredSubmissions, nameMap, competitorMap);
    badgeResults.gotta_catch_em_all = computeGottaCatchEmAll(filteredVotes, allPlayerIds, nameMap, competitorMap);
    badgeResults.commentator = computeCommentator(filteredVotes, filteredSubmissions, roundSongCounts, nameMap, competitorMap);
    badgeResults.keyboard_warrior = computeKeyboardWarrior(filteredVotes, filteredSubmissions, nameMap, competitorMap);
    badgeResults.procrastinator_general = computeProcrastinatorGeneral(votesByRound, sortedRoundIds, nameMap, competitorMap);

    // Hit oracle rounds map (for kingmaker stats)
    const kingmakerRounds = {};
    filteredVotes.forEach((v) => {
      const winner = roundWinners[v.round_id];
      if (winner && v.spotify_uri === winner.spotify_uri && v.points_assigned > 0) {
        if (!kingmakerRounds[v.voter_id]) kingmakerRounds[v.voter_id] = new Set();
        kingmakerRounds[v.voter_id].add(v.round_id);
      }
    });

    const totalOthers = allPlayerIds.length - 1;

    // Infinity Gauntlet
    const otherBadgeDefs = BADGE_DEFS.filter((d) => d.id !== "infinity_gauntlet");
    const otherBadgeIds = otherBadgeDefs.map((d) => d.id);
    const gauntlet = computeInfinityGauntlet(badgeResults, otherBadgeIds, otherBadgeDefs, nameMap, competitorMap);
    badgeResults.infinity_gauntlet = gauntlet.winners;

    // ── Assemble final badges array ──
    return BADGE_DEFS.map((def) => {
      const result = {
        ...def,
        players: (badgeResults[def.id] || []).map((p) => {
          const global = playerMap[p.id] || {};
          const stats = buildBadgeStats(def.id, p, {
            winCount: global.roundWins || 0,
            totalPts: global.totalPoints || 0,
            songCount: global.songCount || 0,
            bestSongScore: global.bestSongScore || 0,
            zeroSongs: global.zeroSongs || 0,
            commentCount: global.commentCount || 0,
            totalPointsGiven: global.totalPointsGiven || 0,
          }, {
            kingmakerRounds,
            sortedRoundIds,
            totalOthers,
            playerBadgeSet: gauntlet.playerBadgeSet,
          });
          return { ...p, stats };
        }),
        achieved: (badgeResults[def.id] || []).length > 0,
      };
      if (def.id === "infinity_gauntlet") {
        result.closestPlayers = gauntlet.closestPlayers;
        result.totalBadges = otherBadgeIds.length;
      }
      return result;
    });
  }, [filteredVotes, filteredSubmissions]);
}
