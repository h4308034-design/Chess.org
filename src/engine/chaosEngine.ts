import { Chess, Move, Square } from 'chess.js';
import { ChaosEvent, ChaosRuleModifier } from '../types/chess';

export const CHAOS_MODIFIERS: ChaosRuleModifier[] = [
  {
    id: 'pawn-sidestep',
    name: 'Pawn Sidestep',
    description: 'Pawns may step 1 square horizontally onto an empty adjacent file.',
    category: 'movement',
  },
  {
    id: 'king-knight-leap',
    name: "King's Escape Leap",
    description: 'Once per game, each King may leap like a Knight if not landing in check.',
    category: 'king',
  },
  {
    id: 'knight-charge',
    name: 'Double Knight Tempo',
    description: 'Capturing with a Knight grants a special bonus move indicator every 6 turns.',
    category: 'capture',
  },
  {
    id: 'border-portals',
    name: 'A-H Edge Portals',
    description: 'Rooks on the a-file or h-file may warp across to the opposite edge file if the rank is clear.',
    category: 'board',
  },
  {
    id: 'chaos-events',
    name: 'Deterministic Board Events',
    description: 'Every 4 full moves, a seeded board event activates (announced & logged for both players).',
    category: 'board',
  },
];

// Deterministic PRNG (Mulberry32) so online matches stay 100% synchronized
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDeterministicChaosEvent(
  turnNumber: number,
  seed: number,
): ChaosEvent | null {
  if (turnNumber <= 1 || turnNumber % 4 !== 0) return null;

  const rng = createSeededRng(seed + turnNumber * 7919);
  const roll = Math.floor(rng() * 4);
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const file = files[Math.floor(rng() * files.length)];

  switch (roll) {
    case 0:
      return {
        id: `evt-${turnNumber}-double`,
        turnNumber,
        name: 'Tailwind Surge',
        description: `Pawns on the ${file}-file gain extra momentum this round.`,
        effectType: 'double-step',
        affectedSquare: `${file}4`,
      };
    case 1:
      return {
        id: `evt-${turnNumber}-shield`,
        turnNumber,
        name: 'Royal Bastion',
        description: 'Both Kings receive heightened defensive priority on this turn.',
        effectType: 'shielded-king',
      };
    case 2:
      return {
        id: `evt-${turnNumber}-knight`,
        turnNumber,
        name: 'Cavalry Rally',
        description: 'Knights gain tactical priority in center outposts this round.',
        effectType: 'knight-boost',
      };
    default:
      return {
        id: `evt-${turnNumber}-frozen`,
        turnNumber,
        name: `Frost Line (${file}-file)`,
        description: `Quiet anomaly on the ${file}-file; major pieces avoid lingering there.`,
        effectType: 'frozen-file',
        affectedSquare: `${file}5`,
      };
  }
}

export interface ChaosMoveOption {
  from: Square;
  to: Square;
  san: string;
  isChaosSpecial: boolean;
  specialLabel?: string;
}

export interface ChaosGameState {
  fen: string;
  activeModifiers: string[];
  seed: number;
  turnCount: number;
  whiteKingLeapUsed: boolean;
  blackKingLeapUsed: boolean;
  currentEvent: ChaosEvent | null;
  eventLog: ChaosEvent[];
}

export function getChaosMovesForSquare(
  state: ChaosGameState,
  square: Square,
): ChaosMoveOption[] {
  const chess = new Chess(state.fen);
  const standardMoves: ChaosMoveOption[] = chess.moves({ square, verbose: true }).map((m: Move) => ({
    from: m.from,
    to: m.to,
    san: m.san,
    isChaosSpecial: false,
  }));

  const piece = chess.get(square);
  if (!piece || piece.color !== chess.turn()) return standardMoves;

  const fileIdx = square.charCodeAt(0) - 97;
  const rank = parseInt(square[1], 10);

  // 1) Pawn Sidestep modifier
  if (piece.type === 'p' && state.activeModifiers.includes('pawn-sidestep')) {
    for (const df of [-1, 1]) {
      const nf = fileIdx + df;
      if (nf >= 0 && nf < 8) {
        const targetSq = `${String.fromCharCode(97 + nf)}${rank}` as Square;
        if (!chess.get(targetSq)) {
          // Verify king safety by simulating
          const sim = new Chess(state.fen);
          sim.remove(square);
          sim.put({ type: 'p', color: piece.color }, targetSq);
          if (!isSideInCheckAfterRawBoard(sim, piece.color)) {
            standardMoves.push({
              from: square,
              to: targetSq,
              san: `${square}→${targetSq} (Sidestep)`,
              isChaosSpecial: true,
              specialLabel: 'Pawn Sidestep',
            });
          }
        }
      }
    }
  }

  // 2) King's Escape Leap modifier
  const kingLeapAvailable =
    piece.type === 'k' &&
    state.activeModifiers.includes('king-knight-leap') &&
    ((piece.color === 'w' && !state.whiteKingLeapUsed) ||
      (piece.color === 'b' && !state.blackKingLeapUsed));

  if (kingLeapAvailable) {
    const knightDeltas = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [df, dr] of knightDeltas) {
      const nf = fileIdx + df;
      const nr = rank + dr;
      if (nf >= 0 && nf < 8 && nr >= 1 && nr <= 8) {
        const targetSq = `${String.fromCharCode(97 + nf)}${nr}` as Square;
        const occ = chess.get(targetSq);
        if (!occ || occ.color !== piece.color) {
          const sim = new Chess(state.fen);
          sim.remove(square);
          sim.put({ type: 'k', color: piece.color }, targetSq);
          if (!isSideInCheckAfterRawBoard(sim, piece.color)) {
            standardMoves.push({
              from: square,
              to: targetSq,
              san: `K→${targetSq} (Leap)`,
              isChaosSpecial: true,
              specialLabel: "King's Leap",
            });
          }
        }
      }
    }
  }

  // 3) A-H Edge Portals for Rooks
  if (
    piece.type === 'r' &&
    state.activeModifiers.includes('border-portals') &&
    (fileIdx === 0 || fileIdx === 7)
  ) {
    const targetFile = fileIdx === 0 ? 'h' : 'a';
    const targetSq = `${targetFile}${rank}` as Square;
    const occ = chess.get(targetSq);
    if (!occ || occ.color !== piece.color) {
      const sim = new Chess(state.fen);
      sim.remove(square);
      sim.put({ type: 'r', color: piece.color }, targetSq);
      if (!isSideInCheckAfterRawBoard(sim, piece.color)) {
        standardMoves.push({
          from: square,
          to: targetSq,
          san: `R${square}⇄${targetSq} (Portal)`,
          isChaosSpecial: true,
          specialLabel: 'Edge Portal',
        });
      }
    }
  }

  return standardMoves;
}

function isSideInCheckAfterRawBoard(sim: Chess, side: 'w' | 'b'): boolean {
  const tokens = sim.fen().split(' ');
  tokens[1] = side === 'w' ? 'b' : 'w';
  tokens[3] = '-';
  try {
    const flipped = new Chess(tokens.join(' '));
    const oppMoves = flipped.moves({ verbose: true });
    // Find side's king
    let kingSq = '';
    const board = sim.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = board[r][c];
        if (cell && cell.type === 'k' && cell.color === side) {
          kingSq = `${String.fromCharCode(97 + c)}${8 - r}`;
        }
      }
    }
    return oppMoves.some((m) => m.to === kingSq);
  } catch {
    return true;
  }
}

export function applyChaosSpecialMove(
  state: ChaosGameState,
  option: ChaosMoveOption,
): ChaosGameState {
  const chess = new Chess(state.fen);
  const movingPiece = chess.get(option.from);
  if (!movingPiece) return state;

  chess.remove(option.from);
  chess.put(movingPiece, option.to);

  // Flip turn and update move counters in FEN
  const tokens = chess.fen().split(' ');
  const nextTurn = tokens[1] === 'w' ? 'b' : 'w';
  tokens[1] = nextTurn;
  tokens[3] = '-';
  if (nextTurn === 'w') {
    tokens[5] = String(parseInt(tokens[5], 10) + 1);
  }

  const nextTurnCount = state.turnCount + 1;
  const fullMove = Math.ceil(nextTurnCount / 2);
  const newEvent = state.activeModifiers.includes('chaos-events') && nextTurn === 'w'
    ? generateDeterministicChaosEvent(fullMove, state.seed)
    : null;

  return {
    ...state,
    fen: tokens.join(' '),
    turnCount: nextTurnCount,
    whiteKingLeapUsed:
      state.whiteKingLeapUsed || (movingPiece.color === 'w' && option.specialLabel === "King's Leap"),
    blackKingLeapUsed:
      state.blackKingLeapUsed || (movingPiece.color === 'b' && option.specialLabel === "King's Leap"),
    currentEvent: newEvent,
    eventLog: newEvent ? [...state.eventLog, newEvent] : state.eventLog,
  };
}
