/**
 * Build per-badge stat pills for display on export cards.
 * Returns an array of { label, value } objects.
 */
export function buildBadgeStats(defId, player, global, context = {}) {
  const {
    winCount = 0,
    totalPts = 0,
    songCount = 0,
    bestSongScore = 0,
    zeroSongs = 0,
    commentCount = 0,
    totalPointsGiven = 0,
  } = global;

  const winPct = songCount > 0 ? ((winCount / songCount) * 100).toFixed(1) + '%' : '0%';
  const globalAvg = songCount > 0 ? (totalPts / songCount).toFixed(1) : '0.0';

  switch (defId) {
    case 'crown_jewel':
      return [
        { label: 'WINS', value: winCount },
        { label: 'WIN%', value: winPct },
        { label: 'SONGS', value: songCount },
      ];
    case 'consistent':
      return [
        { label: 'AVG', value: player.stat },
        { label: 'PEAK', value: bestSongScore },
        { label: 'SONGS', value: songCount },
      ];
    case 'one_hit_wonder': {
      const mult = globalAvg > 0 ? (bestSongScore / globalAvg).toFixed(1) + '×' : 'N/A';
      return [
        { label: 'PEAK', value: bestSongScore },
        { label: 'AVG', value: globalAvg },
        { label: 'MULT', value: mult },
      ];
    }
    case 'cold_streak': {
      const zeroPct = songCount > 0 ? ((zeroSongs / songCount) * 100).toFixed(1) + '%' : '0%';
      return [
        { label: 'ZEROS', value: zeroSongs },
        { label: 'SONGS', value: songCount },
        { label: 'ZERO%', value: zeroPct },
      ];
    }
    case 'summit':
      return [
        { label: 'PEAK', value: '#1' },
        { label: 'PTS', value: totalPts },
        { label: 'WINS', value: winCount },
      ];
    case 'reign':
      return [
        { label: 'STREAK', value: player.stat },
        { label: 'WINS', value: winCount },
        { label: 'SONGS', value: songCount },
      ];
    case 'podium':
      return [
        { label: 'STREAK', value: player.stat },
        { label: 'WINS', value: winCount },
        { label: 'PTS', value: totalPts },
      ];
    case 'hot_streak':
      return [
        { label: 'STREAK', value: player.stat },
        { label: 'WIN%', value: winPct },
        { label: 'SONGS', value: songCount },
      ];
    case 'dark_horse':
      return [
        { label: 'WINS', value: winCount },
        { label: 'WIN%', value: winPct },
        { label: 'PTS', value: totalPts },
      ];
    case 'kingmaker': {
      const syncCount = player.stat || context.kingmakerRounds?.[player.id]?.size || 0;
      const roundCount = context.sortedRoundIds?.length || 1;
      const syncPct = ((syncCount / roundCount) * 100).toFixed(1) + '%';
      return [
        { label: 'SYNC', value: syncCount },
        { label: 'ROUNDS', value: roundCount },
        { label: 'SYNC%', value: syncPct },
      ];
    }
    case 'stalker': {
      const match = String(player.stat).match(/(\d+) pts → (.+)/);
      const given = match ? match[1] : 0;
      let targetName = match ? match[2] : 'Someone';
      if (targetName.indexOf(' ') > -1) {
        targetName = targetName.split(' ')[0];
      }
      return [
        { label: 'GIVEN', value: given },
        { label: 'TARGET', value: targetName.substring(0, 8).toUpperCase() },
        { label: 'CMTS', value: commentCount },
      ];
    }
    case 'nonconformist': {
      const val = String(player.stat).replace(/[^0-9]/g, '');
      return [
        { label: 'RNDS', value: val },
        { label: 'CMTS', value: commentCount },
        { label: 'GIVEN', value: totalPointsGiven },
      ];
    }
    case 'gotta_catch_em_all': {
      const totalOthers = context.totalOthers || 0;
      return [
        { label: 'FANS', value: totalOthers },
        { label: 'PTS', value: totalPts },
        { label: 'SONGS', value: songCount },
      ];
    }
    case 'commentator':
      return [
        { label: 'CMTS', value: commentCount },
        { label: 'GIVEN', value: totalPointsGiven },
        { label: 'SONGS', value: songCount },
      ];
    case 'keyboard_warrior':
      return [
        { label: 'CMTS', value: commentCount },
        { label: 'RATIO', value: player.stat },
        { label: 'GIVEN', value: totalPointsGiven },
      ];
    case 'crowd_pleaser': {
      const match = String(player.stat).match(/(\d+) pts in one round/);
      const peak = match ? match[1] : 0;
      return [
        { label: 'PEAK', value: peak },
        { label: 'SONGS', value: songCount },
        { label: 'PTS', value: totalPts },
      ];
    }
    case 'controversial': {
      const vMatch = String(player.stat).match(/\(var: ([\d.]+)\)/);
      const variance = vMatch ? vMatch[1] : '0';
      return [
        { label: 'VAR', value: variance },
        { label: 'PEAK', value: bestSongScore },
        { label: 'SONGS', value: songCount },
      ];
    }
    case 'hipster': {
      const match = String(player.stat).match(/(\d+) unique artists/);
      const unq = match ? match[1] : 0;
      const unqPct = songCount > 0 ? ((unq / songCount) * 100).toFixed(1) + '%' : '0%';
      return [
        { label: 'UNQ', value: unq },
        { label: 'SONGS', value: songCount },
        { label: 'UNQ%', value: unqPct },
      ];
    }
    case 'procrastinator_general': {
      const lVal = String(player.stat).replace(/[^0-9]/g, '');
      return [
        { label: 'LATE', value: lVal },
        { label: 'GIVEN', value: totalPointsGiven },
        { label: 'CMTS', value: commentCount },
      ];
    }
    case 'infinity_gauntlet': {
      const bCount = context.playerBadgeSet?.[player.id]?.size || 0;
      return [
        { label: 'BDGS', value: bCount },
        { label: 'WINS', value: winCount },
        { label: 'PTS', value: totalPts },
      ];
    }
    default:
      return [
        { label: 'PTS', value: totalPts },
        { label: 'AVG', value: globalAvg },
        { label: 'WINS', value: winCount },
      ];
  }
}
