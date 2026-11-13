import {
  AchievementDef,
  BoardThemeId,
  MatchRecord,
  RoyaleStage,
  UserProfile,
} from '../types/chess';
import { STANDARD_TIME_CONTROLS } from './personalities';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-game',
    title: 'Opening Move',
    description: 'Complete your first standard or variant game on Chess.org.',
    category: 'play',
    xpReward: 50,
    target: 1,
  },
  {
    id: 'five-wins',
    title: 'Club Contender',
    description: 'Win 5 matches across any Chess.org arena mode.',
    category: 'play',
    xpReward: 150,
    target: 5,
  },
  {
    id: 'first-puzzle',
    title: 'Sharp Eye',
    description: 'Solve your first tactical puzzle in Chess Mystery or Puzzles.',
    category: 'tactics',
    xpReward: 40,
    target: 1,
  },
  {
    id: 'ten-puzzles',
    title: 'Tactical Disciplinarian',
    description: 'Solve 10 tactical puzzles accurately.',
    category: 'tactics',
    xpReward: 180,
    target: 10,
  },
  {
    id: 'rush-streak-5',
    title: 'Under Pressure',
    description: 'Reach a streak of 5 or higher in Puzzle Rush.',
    category: 'tactics',
    xpReward: 120,
    target: 5,
  },
  {
    id: 'opening-scholar',
    title: 'Repertoire Builder',
    description: 'Explore 3 or more classical openings in Opening Lab.',
    category: 'explore',
    xpReward: 90,
    target: 3,
  },
  {
    id: 'royale-champion',
    title: 'Royale Ascendant',
    description: 'Clear Stage 3 or higher in Chess Royale.',
    category: 'mastery',
    xpReward: 250,
    target: 3,
  },
];

export const ROYALE_STAGES: RoyaleStage[] = [
  {
    stage: 1,
    title: 'Stage I · The Apprentice Gate',
    personalityId: 'beginner',
    botName: 'Alden (Beginner)',
    objective: 'Defeat the Apprentice bot using sound piece development.',
    timeControl: STANDARD_TIME_CONTROLS[6], // 10+0
    xpReward: 80,
  },
  {
    stage: 2,
    title: 'Stage II · The Tactical Gauntlet',
    personalityId: 'tactical',
    botName: 'Sora (Tactical)',
    objective: 'Avoid hanging pieces and convert a tactical edge.',
    timeControl: STANDARD_TIME_CONTROLS[6], // 10+0
    xpReward: 140,
    unlockTheme: 'slate',
    unlockTitle: 'Tactician',
  },
  {
    stage: 3,
    title: 'Stage III · The Stormfront',
    personalityId: 'aggressive',
    botName: 'Kael (Aggressive)',
    objective: 'Weather early king-side pressure and counterattack.',
    timeControl: STANDARD_TIME_CONTROLS[4], // 3+2
    xpReward: 200,
    unlockTheme: 'warm-sand',
  },
  {
    stage: 4,
    title: 'Stage IV · The Iron Citadel',
    personalityId: 'defensive',
    botName: 'Helena (Defensive)',
    objective: 'Break down a solid pawn structure in a patient positional battle.',
    timeControl: STANDARD_TIME_CONTROLS[7], // 10+5
    xpReward: 260,
    unlockTheme: 'classic-green',
    unlockTitle: 'Strategist',
  },
  {
    stage: 5,
    title: 'Stage V · The Obsidian Crown',
    personalityId: 'grandmaster',
    botName: 'Vesper (Master Engine)',
    objective: 'Prevail against maximum local search depth under tournament clock.',
    timeControl: STANDARD_TIME_CONTROLS[8], // 15+10
    xpReward: 400,
    unlockTheme: 'graphite',
    unlockTitle: 'Royale Champion',
  },
];

export function calculateLevelFromXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
} {
  let level = 1;
  let threshold = 100;
  let remaining = Math.max(0, xp);

  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = Math.round(100 * Math.pow(1.25, level - 1));
  }

  return {
    level,
    currentLevelXp: remaining,
    nextLevelXp: threshold,
    progressPct: Math.min(100, Math.round((remaining / threshold) * 100)),
  };
}

export function calculateRatingDelta(
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw',
): number {
  const kFactor = 24;
  const expected = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(kFactor * (actual - expected));
}

export function evaluateAchievements(profile: UserProfile): UserProfile {
  const totalGames = profile.matchHistory.length;
  const totalWins = profile.matchHistory.filter((m) => m.result === 'win').length;
  const bestRush = Math.max(profile.puzzleRushBestTimed, profile.puzzleRushBestUntimed);

  const alreadyUnlocked = new Set(profile.unlockedAchievements.map((a) => a.id));
  const newlyUnlocked: { id: string; unlockedAt: number }[] = [];
  let bonusXp = 0;

  const checks: Record<string, boolean> = {
    'first-game': totalGames >= 1,
    'five-wins': totalWins >= 5,
    'first-puzzle': profile.puzzlesSolved >= 1,
    'ten-puzzles': profile.puzzlesSolved >= 10,
    'rush-streak-5': bestRush >= 5,
    'opening-scholar': profile.exploredOpenings.length >= 3,
    'royale-champion': profile.royaleStageReached >= 3,
  };

  for (const def of ACHIEVEMENTS) {
    if (!alreadyUnlocked.has(def.id) && checks[def.id]) {
      newlyUnlocked.push({ id: def.id, unlockedAt: Date.now() });
      bonusXp += def.xpReward;
    }
  }

  if (newlyUnlocked.length === 0) return profile;

  return {
    ...profile,
    xp: profile.xp + bonusXp,
    unlockedAchievements: [...profile.unlockedAchievements, ...newlyUnlocked],
  };
}

export function createInitialUserProfile(): UserProfile {
  return {
    username: 'Player',
    title: 'Enthusiast',
    rating: 1200,
    puzzleRating: 1200,
    xp: 0,
    puzzlesSolved: 0,
    puzzleRushBestTimed: 0,
    puzzleRushBestUntimed: 0,
    royaleStageReached: 1,
    royaleStreak: 0,
    royaleBestStreak: 0,
    exploredOpenings: [],
    favoriteOpenings: [],
    unlockedThemes: ['ivory', 'graphite', 'slate', 'classic-green', 'warm-sand'] as BoardThemeId[],
    unlockedAchievements: [],
    matchHistory: [],
    dailyPuzzleSolvedDates: [],
    customization: {
      boardTheme: 'ivory',
      pieceSet: 'geo',
      defaultBoardMode: '2d',
      showCoordinates: true,
      highlightLegalMoves: true,
      soundEnabled: true,
      animationSpeed: 'normal',
      appearance: 'light',
      evaluationBarVisible: true,
    },
  };
}

export function applyMatchCompletion(
  profile: UserProfile,
  record: MatchRecord,
): UserProfile {
  const updated: UserProfile = {
    ...profile,
    rating: Math.max(400, profile.rating + record.ratingDelta),
    xp: profile.xp + record.xpEarned,
    matchHistory: [record, ...profile.matchHistory].slice(0, 100),
  };
  return evaluateAchievements(updated);
}
