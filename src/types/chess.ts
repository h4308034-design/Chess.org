export type NavSection =
  | 'dashboard'
  | 'quick-play'
  | 'play-ai'
  | 'online-multiplayer'
  | 'local-multiplayer'
  | 'custom-game'
  | 'chess-chaos'
  | 'chess-royale'
  | 'chess-dimension'
  | 'chess-mystery'
  | 'chess-time-machine'
  | 'chess-puzzles'
  | 'puzzle-rush'
  | 'opening-lab'
  | 'blindfold-chess'
  | 'guess-the-elo'
  | 'game-review'
  | 'chess-detective'
  | 'engine-analysis'
  | 'pgn-explorer'
  | 'leaderboards'
  | 'tournaments'
  | 'achievements'
  | 'xp-levels'
  | 'personal-profile'
  | 'statistics'
  | 'match-history'
  | 'favorite-openings'
  | 'customization'
  | 'settings';

export type BoardThemeId = 'ivory' | 'graphite' | 'slate' | 'classic-green' | 'warm-sand';
export type PieceSetId = 'geo' | 'classic' | 'monolith';
export type BoardMode = '2d' | '3d';
export type AnimationSpeed = 'instant' | 'fast' | 'normal' | 'smooth';
export type AppearanceMode = 'light' | 'dark';

export type PersonalityId =
  | 'beginner'
  | 'casual'
  | 'tactical'
  | 'aggressive'
  | 'defensive'
  | 'random'
  | 'sacrifice'
  | 'grandmaster';

export type TimeCategory = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'custom';

export interface TimeControl {
  id: string;
  label: string;
  category: TimeCategory;
  initialSeconds: number;
  incrementSeconds: number;
}

export interface PersonalityConfig {
  id: PersonalityId;
  name: string;
  tagline: string;
  description: string;
  searchDepth: number;
  maxTimeMs: number;
  skillLevel: number; // 0-20
  randomnessCp: number; // noise added to eval
  aggressionWeight: number; // bonus for king-zone pressure & forward pieces
  kingSafetyWeight: number; // bonus for castling, pawn shield, safe king
  sacrificeBonus: number; // willingness to give material for initiative/tactics
  topMoveSpread: number; // pick among top K moves within tolerance
  openingBookProb: number;
  engineStrengthLabel: string; // honest engine description, never claiming FIDE GM
}

export interface MatchRecord {
  id: string;
  timestamp: number;
  mode: 'ai' | 'local' | 'online' | 'chaos' | 'royale' | 'blindfold' | 'custom';
  opponentName: string;
  opponentType: 'ai' | 'human-local' | 'human-online';
  personalityId?: PersonalityId;
  playerColor: 'w' | 'b';
  result: 'win' | 'loss' | 'draw';
  termination: string;
  timeControlLabel: string;
  pgn: string;
  finalFen: string;
  moveCount: number;
  openingName?: string;
  eco?: string;
  xpEarned: number;
  ratingDelta: number;
  accuracyEstimate?: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  category: 'play' | 'tactics' | 'explore' | 'mastery';
  xpReward: number;
  target: number;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: number;
}

export interface RoyaleStage {
  stage: number;
  title: string;
  personalityId: PersonalityId;
  botName: string;
  objective: string;
  timeControl: TimeControl;
  xpReward: number;
  unlockTheme?: BoardThemeId;
  unlockTitle?: string;
}

export interface ChaosRuleModifier {
  id: string;
  name: string;
  description: string;
  category: 'movement' | 'capture' | 'king' | 'board';
}

export interface ChaosEvent {
  id: string;
  turnNumber: number;
  name: string;
  description: string;
  effectType: 'double-step' | 'knight-boost' | 'shielded-king' | 'pawn-promotion-boost' | 'frozen-file';
  affectedSquare?: string;
}

export type PuzzleTheme =
  | 'mate-in-1'
  | 'mate-in-2'
  | 'mate-in-3'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered-attack'
  | 'deflection'
  | 'sacrifice'
  | 'defensive'
  | 'endgame';

export interface PuzzleData {
  id: string;
  title: string;
  fen: string;
  sideToMove: 'w' | 'b';
  solutionMoves: string[]; // UCI moves e.g. ['e2e4', 'e7e5'] or SAN
  alternativeFirstMoves?: string[]; // valid alternative UCI moves if any
  rating: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'master';
  theme: PuzzleTheme;
  explanation: string;
  source: string;
}

export interface OpeningMoveNode {
  san: string;
  annotation: string;
  evalCp: number; // centipawns from White's POV
  candidates?: { san: string; evalCp: number; note: string }[];
}

export interface OpeningData {
  id: string;
  eco: string;
  name: string;
  family: string;
  description: string;
  startingFen: string;
  mainLine: OpeningMoveNode[];
  variations: {
    name: string;
    moves: string[];
    note: string;
  }[];
}

export interface HistoricalGame {
  id: string;
  title: string;
  white: string;
  black: string;
  whiteBio: string;
  blackBio: string;
  event: string;
  year: number;
  result: '1-0' | '0-1' | '1/2-1/2';
  opening: string;
  eco: string;
  source: string;
  summary: string;
  moves: {
    san: string;
    annotation?: string;
  }[];
}

export type MoveClassification =
  | 'Brilliant'
  | 'Best'
  | 'Excellent'
  | 'Good'
  | 'Inaccuracy'
  | 'Mistake'
  | 'Blunder'
  | 'Missed Win'
  | 'Missed Mate'
  | 'Book';

export interface AnalyzedMove {
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  mateBefore?: number | null;
  mateAfter?: number | null;
  bestMoveUci: string;
  bestMoveSan: string;
  bestEvalCp: number;
  cpLoss: number;
  classification: MoveClassification;
  pvSan: string[];
  reason: string;
}

export interface UserCustomization {
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  defaultBoardMode: BoardMode;
  showCoordinates: boolean;
  highlightLegalMoves: boolean;
  soundEnabled: boolean;
  animationSpeed: AnimationSpeed;
  appearance: AppearanceMode;
  evaluationBarVisible: boolean;
}

export interface UserProfile {
  username: string;
  title: string;
  rating: number;
  puzzleRating: number;
  xp: number;
  puzzlesSolved: number;
  puzzleRushBestTimed: number;
  puzzleRushBestUntimed: number;
  royaleStageReached: number;
  royaleStreak: number;
  royaleBestStreak: number;
  exploredOpenings: string[];
  favoriteOpenings: string[];
  unlockedThemes: BoardThemeId[];
  unlockedAchievements: UnlockedAchievement[];
  matchHistory: MatchRecord[];
  dailyPuzzleSolvedDates: string[];
  customization: UserCustomization;
}
