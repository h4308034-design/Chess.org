import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { PersonalityConfig, PersonalityId } from '../types/chess';
import { AI_PERSONALITIES } from './personalities';

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables (from White's perspective, rank 8 down to rank 1)
const PAWN_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5, 5, 10, 27, 27, 10, 5, 5,
  0, 0, 0, 24, 24, 0, 0, 0,
  5, -5, -10, 0, 0, -10, -5, 5,
  5, 10, 10, -22, -22, 10, 10, 5,
  0, 0, 0, 0, 0, 0, 0, 0,
];

const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20, 0, 0, 0, 0, -20, -40,
  -30, 0, 12, 16, 16, 12, 0, -30,
  -30, 6, 16, 22, 22, 16, 6, -30,
  -30, 0, 16, 22, 22, 16, 0, -30,
  -30, 6, 12, 16, 16, 12, 6, -30,
  -40, -20, 0, 5, 5, 0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50,
];

const BISHOP_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 8, 12, 12, 8, 0, -10,
  -10, 6, 6, 12, 12, 6, 6, -10,
  -10, 0, 12, 12, 12, 12, 0, -10,
  -10, 10, 10, 10, 10, 10, 10, -10,
  -10, 6, 0, 0, 0, 0, 6, -10,
  -20, -10, -10, -10, -10, -10, -10, -20,
];

const ROOK_PST = [
  0, 0, 0, 0, 0, 0, 0, 0,
  6, 12, 12, 12, 12, 12, 12, 6,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  -5, 0, 0, 0, 0, 0, 0, -5,
  0, 0, 0, 6, 6, 0, 0, 0,
];

const QUEEN_PST = [
  -20, -10, -10, -5, -5, -10, -10, -20,
  -10, 0, 0, 0, 0, 0, 0, -10,
  -10, 0, 5, 5, 5, 5, 0, -10,
  -5, 0, 5, 5, 5, 5, 0, -5,
  0, 0, 5, 5, 5, 5, 0, -5,
  -10, 5, 5, 5, 5, 5, 0, -10,
  -10, 0, 5, 0, 0, 0, 0, -10,
  -20, -10, -10, -5, -5, -10, -10, -20,
];

const KING_MID_PST = [
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20,
  20, 30, 10, 0, 0, 10, 30, 20,
];

const PST_MAP: Record<PieceSymbol, number[]> = {
  p: PAWN_PST,
  n: KNIGHT_PST,
  b: BISHOP_PST,
  r: ROOK_PST,
  q: QUEEN_PST,
  k: KING_MID_PST,
};

// Lightweight curated opening book (FEN prefix -> popular strong UCI responses)
const OPENING_BOOK: Record<string, string[]> = {
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': ['e2e4', 'd2d4', 'c2c4', 'g1f3'],
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq -': ['d7d5', 'g8f6', 'e7e6'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['g1f3', 'f1c4', 'b1c3'],
  'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq -': ['b8c6', 'g8f6'],
  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -': ['f1b5', 'f1c4', 'd2d4'],
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -': ['g1f3', 'b1c3', 'c2c3'],
  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq -': ['c2c4', 'g1f3', 'c1f4'],
  'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq -': ['e7e6', 'c7c6', 'd5c4'],
};

export interface EngineSearchResult {
  bestMoveUci: string;
  bestMoveSan: string;
  evalCp: number; // Always from White's perspective (+ = White advantage)
  mateIn: number | null; // Positive = White mates in N, Negative = Black mates in N
  depth: number;
  nodes: number;
  pvSan: string[];
  pvUci: string[];
  topMoves: { uci: string; san: string; evalCp: number }[];
}

export interface SearchOptions {
  personalityId?: PersonalityId;
  depth?: number;
  maxTimeMs?: number;
  shouldAbort?: () => boolean;
}

function toUci(move: Move): string {
  return `${move.from}${move.to}${move.promotion ?? ''}`;
}

export function evaluatePosition(
  chess: Chess,
  personality: PersonalityConfig = AI_PERSONALITIES.grandmaster,
): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -90000 : 90000;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  const board = chess.board();
  let score = 0;
  let whiteKingRow = 7;
  let whiteKingCol = 4;
  let blackKingRow = 0;
  let blackKingCol = 4;
  let whiteBishops = 0;
  let blackBishops = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      if (cell.type === 'k') {
        if (cell.color === 'w') {
          whiteKingRow = r;
          whiteKingCol = c;
        } else {
          blackKingRow = r;
          blackKingCol = c;
        }
      }
      if (cell.type === 'b') {
        if (cell.color === 'w') whiteBishops++;
        else blackBishops++;
      }
    }
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;

      const pstIndex = cell.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
      const baseValue = PIECE_VALUES[cell.type];
      const pstBonus = PST_MAP[cell.type][pstIndex];

      // Aggression: reward advancing non-king pieces into opponent's half & near enemy king
      let aggressionBonus = 0;
      if (cell.type !== 'k') {
        const enemyKingR = cell.color === 'w' ? blackKingRow : whiteKingRow;
        const enemyKingC = cell.color === 'w' ? blackKingCol : whiteKingCol;
        const distToEnemyKing = Math.abs(r - enemyKingR) + Math.abs(c - enemyKingC);
        const advanceRank = cell.color === 'w' ? 7 - r : r;
        aggressionBonus = ((14 - distToEnemyKing) * 2 + advanceRank * 2) * (personality.aggressionWeight - 1);
      }

      // King safety: reward pawn shield in front of king
      let safetyBonus = 0;
      if (cell.type === 'p') {
        const ownKingR = cell.color === 'w' ? whiteKingRow : blackKingRow;
        const ownKingC = cell.color === 'w' ? whiteKingCol : blackKingCol;
        if (Math.abs(c - ownKingC) <= 1 && Math.abs(r - ownKingR) <= 2) {
          safetyBonus = 12 * personality.kingSafetyWeight;
        }
      }

      const total = baseValue + pstBonus + aggressionBonus + safetyBonus;
      if (cell.color === 'w') score += total;
      else score -= total;
    }
  }

  if (whiteBishops >= 2) score += 30;
  if (blackBishops >= 2) score -= 30;

  // Tempo bonus
  score += chess.turn() === 'w' ? 12 : -12;

  return Math.round(score);
}

function scoreMoveOrder(move: Move): number {
  let s = 0;
  if (move.captured) {
    s += 10 * PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece];
  }
  if (move.promotion) {
    s += PIECE_VALUES[move.promotion];
  }
  if (move.san.includes('+')) s += 45;
  if (move.san.includes('#')) s += 10000;
  if (move.flags.includes('k') || move.flags.includes('q')) s += 40;
  return s;
}

interface TTEntry {
  depth: number;
  score: number;
  flag: 'EXACT' | 'LOWER' | 'UPPER';
  bestUci?: string;
}

export function searchBestMove(fen: string, options: SearchOptions = {}): EngineSearchResult {
  const chess = new Chess(fen);
  const personality = AI_PERSONALITIES[options.personalityId ?? 'grandmaster'];
  const maxDepth = options.depth ?? personality.searchDepth;
  const maxTimeMs = options.maxTimeMs ?? personality.maxTimeMs;
  const startTime = Date.now();

  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) {
    const evalNow = evaluatePosition(chess, personality);
    return {
      bestMoveUci: '',
      bestMoveSan: '',
      evalCp: evalNow,
      mateIn: chess.isCheckmate() ? (chess.turn() === 'w' ? -1 : 1) : null,
      depth: 0,
      nodes: 0,
      pvSan: [],
      pvUci: [],
      topMoves: [],
    };
  }

  // Random bot special handling
  if (personality.id === 'random') {
    const pick = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    const temp = new Chess(fen);
    temp.move(pick);
    return {
      bestMoveUci: toUci(pick),
      bestMoveSan: pick.san,
      evalCp: evaluatePosition(temp, personality),
      mateIn: null,
      depth: 1,
      nodes: legalMoves.length,
      pvSan: [pick.san],
      pvUci: [toUci(pick)],
      topMoves: [{ uci: toUci(pick), san: pick.san, evalCp: 0 }],
    };
  }

  // Opening book check
  const fenKey = fen.split(' ').slice(0, 4).join(' ');
  const bookMoves = OPENING_BOOK[fenKey];
  if (bookMoves && Math.random() < personality.openingBookProb) {
    const uciChoice = bookMoves[Math.floor(Math.random() * bookMoves.length)];
    const found = legalMoves.find((m) => toUci(m) === uciChoice);
    if (found) {
      const temp = new Chess(fen);
      temp.move(found);
      return {
        bestMoveUci: toUci(found),
        bestMoveSan: found.san,
        evalCp: evaluatePosition(temp, personality),
        mateIn: null,
        depth: 1,
        nodes: 1,
        pvSan: [found.san],
        pvUci: [toUci(found)],
        topMoves: [{ uci: toUci(found), san: found.san, evalCp: 15 }],
      };
    }
  }

  let nodes = 0;
  let aborted = false;
  let allowTimeAbort = false;
  const tt = new Map<string, TTEntry>();

  function isTimeUp(): boolean {
    if (aborted) return true;
    if (options.shouldAbort?.()) {
      aborted = true;
      return true;
    }
    if (allowTimeAbort && (nodes & 31) === 0 && Date.now() - startTime > maxTimeMs) {
      aborted = true;
      return true;
    }
    return false;
  }

  // Quiescence search for tactical stability (captures & checks)
  function quiesce(alpha: number, beta: number, qDepth: number): number {
    nodes++;
    const standPat = (chess.turn() === 'w' ? 1 : -1) * evaluatePosition(chess, personality);
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;
    if (qDepth <= 0 || isTimeUp()) return alpha;

    const captures = chess
      .moves({ verbose: true })
      .filter((m) => m.captured || m.promotion)
      .sort((a, b) => scoreMoveOrder(b) - scoreMoveOrder(a));

    for (const move of captures) {
      chess.move(move);
      const score = -quiesce(-beta, -alpha, qDepth - 1);
      chess.undo();
      if (aborted) return alpha;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(depth: number, alpha: number, beta: number, ply: number): number {
    if (isTimeUp()) return alpha;
    nodes++;

    if (chess.isCheckmate()) {
      return -90000 + ply;
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return 0;
    }
    if (depth <= 0) {
      return quiesce(alpha, beta, 3);
    }

    const key = chess.fen();
    const cached = tt.get(key);
    if (cached && cached.depth >= depth) {
      if (cached.flag === 'EXACT') return cached.score;
      if (cached.flag === 'LOWER' && cached.score > alpha) alpha = cached.score;
      else if (cached.flag === 'UPPER' && cached.score < beta) beta = cached.score;
      if (alpha >= beta) return cached.score;
    }

    const moves = chess.moves({ verbose: true }).sort((a, b) => {
      if (cached?.bestUci === toUci(a)) return -1;
      if (cached?.bestUci === toUci(b)) return 1;
      return scoreMoveOrder(b) - scoreMoveOrder(a);
    });

    const origAlpha = alpha;
    let bestScore = -Infinity;
    let bestUci = '';

    for (const move of moves) {
      chess.move(move);
      let score = -negamax(depth - 1, -beta, -alpha, ply + 1);

      // Sacrifice Maniac: small dynamic compensation when giving up material for check/initiative
      if (personality.sacrificeBonus !== 0 && !move.captured && chess.inCheck()) {
        score += personality.sacrificeBonus;
      }

      chess.undo();
      if (aborted) return alpha;

      if (score > bestScore) {
        bestScore = score;
        bestUci = toUci(move);
      }
      if (score > alpha) alpha = score;
      if (alpha >= beta) break;
    }

    let flag: TTEntry['flag'] = 'EXACT';
    if (bestScore <= origAlpha) flag = 'UPPER';
    else if (bestScore >= beta) flag = 'LOWER';
    if (tt.size < 25000) {
      tt.set(key, { depth, score: bestScore, flag, bestUci });
    }

    return bestScore;
  }

  const rootTurnSign = chess.turn() === 'w' ? 1 : -1;
  let rootEvaluations: { move: Move; scoreFromSide: number }[] = [];
  let completedDepth = 0;

  // Iterative deepening
  for (let d = 1; d <= maxDepth; d++) {
    allowTimeAbort = d >= 2;
    const currentEvals: { move: Move; scoreFromSide: number }[] = [];
    const sortedMoves = [...legalMoves].sort((a, b) => {
      const prevA = rootEvaluations.find((r) => toUci(r.move) === toUci(a));
      const prevB = rootEvaluations.find((r) => toUci(r.move) === toUci(b));
      if (prevA && prevB) return prevB.scoreFromSide - prevA.scoreFromSide;
      return scoreMoveOrder(b) - scoreMoveOrder(a);
    });

    for (const move of sortedMoves) {
      chess.move(move);
      let score = -negamax(d - 1, -100000, 100000, 1);

      // Sacrifice heuristic: reward sound-ish gambit attacks if giving up minor piece/pawn for attack
      if (personality.sacrificeBonus > 0 && move.captured === undefined && chess.inCheck()) {
        score += personality.sacrificeBonus * 0.6;
      }

      chess.undo();
      if (aborted) break;
      currentEvals.push({ move, scoreFromSide: score });
    }

    if (!aborted && currentEvals.length === legalMoves.length) {
      rootEvaluations = currentEvals;
      completedDepth = d;
    } else {
      break;
    }
  }

  if (rootEvaluations.length === 0) {
    // Fallback single-ply evaluation if aborted early
    rootEvaluations = legalMoves.map((move) => {
      chess.move(move);
      const s = -evaluatePosition(chess, personality) * rootTurnSign;
      chess.undo();
      return { move, scoreFromSide: s };
    });
    completedDepth = 1;
  }

  // Apply personality variance & top-move spread
  const noisy = rootEvaluations
    .map((item) => {
      const noise = personality.randomnessCp > 0 ? (Math.random() - 0.5) * 2 * personality.randomnessCp : 0;
      return {
        ...item,
        noisyScore: item.scoreFromSide + noise,
      };
    })
    .sort((a, b) => b.noisyScore - a.noisyScore);

  const spread = Math.min(personality.topMoveSpread, noisy.length);
  const chosenIndex = spread > 1 ? Math.floor(Math.random() * spread) : 0;
  const chosen = noisy[chosenIndex];
  const bestExact = [...rootEvaluations].sort((a, b) => b.scoreFromSide - a.scoreFromSide)[0];

  // Reconstruct PV from TT
  const pvSan: string[] = [bestExact.move.san];
  const pvUci: string[] = [toUci(bestExact.move)];
  const pvChess = new Chess(fen);
  pvChess.move(bestExact.move);
  for (let i = 0; i < 4; i++) {
    const entry = tt.get(pvChess.fen());
    if (!entry?.bestUci) break;
    const nextMove = pvChess.moves({ verbose: true }).find((m) => toUci(m) === entry.bestUci);
    if (!nextMove) break;
    pvSan.push(nextMove.san);
    pvUci.push(toUci(nextMove));
    pvChess.move(nextMove);
  }

  const evalWhiteCp = bestExact.scoreFromSide * rootTurnSign;
  let mateIn: number | null = null;
  if (Math.abs(bestExact.scoreFromSide) > 85000) {
    const pliesToMate = 90000 - Math.abs(bestExact.scoreFromSide);
    const movesToMate = Math.max(1, Math.ceil(pliesToMate / 2));
    mateIn = evalWhiteCp > 0 ? movesToMate : -movesToMate;
  }

  return {
    bestMoveUci: toUci(chosen.move),
    bestMoveSan: chosen.move.san,
    evalCp: evalWhiteCp,
    mateIn,
    depth: completedDepth,
    nodes,
    pvSan,
    pvUci,
    topMoves: [...rootEvaluations]
      .sort((a, b) => b.scoreFromSide - a.scoreFromSide)
      .slice(0, 3)
      .map((item) => ({
        uci: toUci(item.move),
        san: item.move.san,
        evalCp: item.scoreFromSide * rootTurnSign,
      })),
  };
}

export function getLegalMovesForSquare(fen: string, square: Square): Move[] {
  const chess = new Chess(fen);
  return chess.moves({ square, verbose: true });
}
