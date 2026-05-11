import crownJewelImg from "../assets/badges/crown_jewels.jpg";
import consistentImg from "../assets/badges/consistent.jpg";
import oneHitWonderImg from "../assets/badges/one_hit_wonder.jpg";
import coldStreakImg from "../assets/badges/cold_streak.jpg";
import summitImg from "../assets/badges/summit.jpg";
import reignImg from "../assets/badges/reign.jpg";
import podiumImg from "../assets/badges/podium.jpg";
import hotStreakImg from "../assets/badges/hot_streak.jpg";
import darkHorseImg from "../assets/badges/dark_horse.jpg";
import hitOracleImg from "../assets/badges/hit_oracle.jpg";
import stalkerImg from "../assets/badges/stalker.jpg";
import nonConformistImg from "../assets/badges/non_conformist.jpg";
import crowdPleaserImg from "../assets/badges/crowd_pleaser.jpg";
import controversialImg from "../assets/badges/controversial.jpg";
import hipsterImg from "../assets/badges/hipster.jpg";
import gottaCatchEmAllImg from "../assets/badges/pokemon.jpg";
import infinityGauntletImg from "../assets/badges/infinity_gauntlet.jpg";
import commentatorImg from "../assets/badges/commentator.png";
import keyboardWarriorImg from "../assets/badges/keyboard_warrior.jpg";
import procrastinatorGeneralImg from "../assets/badges/procrastinator_general.jpg";

export const BADGE_CRITERIA = {
  // Performance
  MIN_ROUNDS_FOR_CONSISTENT: 3,
  CONSISTENT_MIN_AVG: 3.0,
  COLD_STREAK_SONG_THRESHOLD: 3,
  ONE_HIT_WONDER_MIN_SONGS: 2,
  ONE_HIT_WONDER_MULTIPLIER: 2,

  // Standings
  PODIUM_MIN_STREAK: 5,
  HOT_STREAK_MIN_STREAK: 3,

  // Voting
  HIT_ORACLE_MIN_ROUNDS: 5,
  NONCONFORMIST_ROUND_THRESHOLD: 5,
  MIN_COMMENTATOR_ROUNDS: 3,
  KEYBOARD_WARRIOR_RATIO: 0.5,

  // Social
  CONTROVERSIAL_MIN_VOTES: 3,
  CONTROVERSIAL_MIN_VARIANCE: 2.0,
  MIN_HIPSTER_SONGS: 3,
  PROCRASTINATOR_MIN_ROUNDS: 2,

  // Meta
  INFINITY_GAUNTLET_MISSES_ALLOWED: 3,
};

export const BADGE_DEFS = [
  {
    id: "crown_jewel",
    name: "Crown Jewel",
    image: crownJewelImg,
    category: "Performance",
    description: "Won the most rounds",
  },
  {
    id: "consistent",
    name: "Consistent",
    image: consistentImg,
    category: "Performance",
    description: "Averaged 3.0+ points per song (min 3 rounds)",
  },
  {
    id: "one_hit_wonder",
    name: "One Hit Wonder",
    image: oneHitWonderImg,
    category: "Performance",
    description: "Has a song scoring 2x+ their own average",
  },
  {
    id: "cold_streak",
    name: "Cold Streak",
    image: coldStreakImg,
    category: "Performance",
    description: "Had 3 or more songs score 0 points",
  },
  {
    id: "summit",
    name: "Reached the Summit",
    image: summitImg,
    category: "Standings",
    description: "Was #1 overall at any point during the league",
  },
  {
    id: "reign",
    name: "Reign",
    image: reignImg,
    category: "Standings",
    description: "Most consecutive rounds spent at #1 overall",
  },
  {
    id: "podium",
    name: "Podium",
    image: podiumImg,
    category: "Standings",
    description: "Top 3 overall for 5+ consecutive rounds",
  },
  {
    id: "hot_streak",
    name: "Hot Streak",
    image: hotStreakImg,
    category: "Standings",
    description: "Top 3 in a round for 3+ consecutive rounds",
  },
  {
    id: "dark_horse",
    name: "Dark Horse",
    image: darkHorseImg,
    category: "Standings",
    description: "Won a round while ranked in the bottom half overall",
  },
  {
    id: "kingmaker",
    name: "Hit Oracle",
    image: hitOracleImg,
    category: "Voting",
    description: "Voted for the round winner in 5+ rounds",
  },
  {
    id: "stalker",
    name: "Stalker",
    image: stalkerImg,
    category: "Voting",
    description: "Gave more points to a single player than there were rounds",
  },
  {
    id: "nonconformist",
    name: "Non-conformist",
    image: nonConformistImg,
    category: "Voting",
    description: "Gave points to the last-place song in 5 or more rounds",
  },
  {
    id: "gotta_catch_em_all",
    name: "Gotta Catch 'em All",
    image: gottaCatchEmAllImg,
    category: "Voting",
    description: "Received at least 1 vote from every other player",
  },
  {
    id: "commentator",
    name: "Dedicated Commentator",
    image: commentatorImg,
    category: "Voting",
    description: "Left a comment on every song in at least 3 rounds",
  },
  {
    id: "keyboard_warrior",
    name: "Keyboard Warrior",
    image: keyboardWarriorImg,
    category: "Voting",
    description:
      "Commented on more than 50% of all submitted songs. Bonus points if they built a custom keyboard to do it.",
  },
  {
    id: "crowd_pleaser",
    name: "Crowd Pleaser",
    image: crowdPleaserImg,
    category: "Social",
    description: "Got more total votes in a single round than players in the league",
  },
  {
    id: "controversial",
    name: "Controversial",
    image: controversialImg,
    category: "Social",
    description: "Submitted a song with vote variance of 2.0+",
  },
  {
    id: "hipster",
    name: "Hipster",
    image: hipsterImg,
    category: "Social",
    description: "Never submitted the same artist twice (min 3 songs)",
  },
  {
    id: "procrastinator_general",
    name: "Procrastinator General",
    image: procrastinatorGeneralImg,
    category: "Social",
    description: "Voted last in at least 2 rounds",
  },
  {
    id: "infinity_gauntlet",
    name: "Infinity Gauntlet",
    image: infinityGauntletImg,
    category: "Meta",
    description: "Collected 16 of 19 badges",
  },
];
