export type VariantPieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p' | 'a' | 'c';
// a = Archbishop (Bishop + Knight), c = Chancellor (Rook + Knight)

export interface VariantPiece {
  type: VariantPieceType;
  color: 'w' | 'b';
}

export interface VariantSquareCoord {
  r: number; // 0 = top row
  c: number; // 0 = left col
}

export interface VariantMove {
  from: VariantSquareCoord;
  to: VariantSquareCoord;
  promotion?: VariantPieceType;
  captured?: VariantPiece;
  notation: string;
}

export type DimensionVariantId = 'mini-4x4' | 'grand-10x10' | 'custom';

export interface DimensionBoardState {
  variantId: DimensionVariantId;
  rows: number;
  cols: number;
  grid: (VariantPiece | null)[][];
  turn: 'w' | 'b';
  moveHistory: string[];
  winner: 'w' | 'b' | 'draw' | null;
  terminationReason: string | null;
  rulesSummary: string[];
}

export const VARIANT_PIECE_NAMES: Record<VariantPieceType, string> = {
  k: 'King',
  q: 'Queen',
  r: 'Rook',
  b: 'Bishop',
  n: 'Knight',
  p: 'Pawn',
  a: 'Archbishop (B+N)',
  c: 'Chancellor (R+N)',
};

export function coordToAlgebraic(r: number, c: number, rows: number): string {
  const file = String.fromCharCode(97 + c);
  const rank = rows - r;
  return `${file}${rank}`;
}

export function createMini4x4Board(): DimensionBoardState {
  // Silverman 4x4 Chess variant: R Q K R / P P P P / p p p p / r q k r
  const grid: (VariantPiece | null)[][] = [
    [
      { type: 'r', color: 'b' },
      { type: 'q', color: 'b' },
      { type: 'k', color: 'b' },
      { type: 'r', color: 'b' },
    ],
    [
      { type: 'p', color: 'b' },
      { type: 'p', color: 'b' },
      { type: 'p', color: 'b' },
      { type: 'p', color: 'b' },
    ],
    [
      { type: 'p', color: 'w' },
      { type: 'p', color: 'w' },
      { type: 'p', color: 'w' },
      { type: 'p', color: 'w' },
    ],
    [
      { type: 'r', color: 'w' },
      { type: 'q', color: 'w' },
      { type: 'k', color: 'w' },
      { type: 'r', color: 'w' },
    ],
  ];

  return {
    variantId: 'mini-4x4',
    rows: 4,
    cols: 4,
    grid,
    turn: 'w',
    moveHistory: [],
    winner: null,
    terminationReason: null,
    rulesSummary: [
      '4×4 Silverman Mini Chess grid with Rooks, Queen, King, and Pawns.',
      'Pawns advance 1 square forward (no double-step) and capture diagonally forward.',
      'Pawns reaching the final rank promote immediately to a Queen.',
      'Win by delivering Checkmate or capturing the opposing King if left in check; Stalemate is a draw.',
    ],
  };
}

export function createGrand10x10Board(): DimensionBoardState {
  // 10x10 Experimental Grand Board with Archbishop (a = B+N) and Chancellor (c = R+N)
  const emptyRow = (): (VariantPiece | null)[] => Array(10).fill(null);
  const backRank = (color: 'w' | 'b'): (VariantPiece | null)[] => [
    { type: 'r', color },
    { type: 'n', color },
    { type: 'b', color },
    { type: 'a', color },
    { type: 'q', color },
    { type: 'k', color },
    { type: 'c', color },
    { type: 'b', color },
    { type: 'n', color },
    { type: 'r', color },
  ];
  const pawnRank = (color: 'w' | 'b'): (VariantPiece | null)[] =>
    Array.from({ length: 10 }, () => ({ type: 'p' as const, color }));

  const grid: (VariantPiece | null)[][] = [
    backRank('b'),
    pawnRank('b'),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    emptyRow(),
    pawnRank('w'),
    backRank('w'),
  ];

  return {
    variantId: 'grand-10x10',
    rows: 10,
    cols: 10,
    grid,
    turn: 'w',
    moveHistory: [],
    winner: null,
    terminationReason: null,
    rulesSummary: [
      '10×10 Experimental Grand Board introducing two compound pieces.',
      'Archbishop (A): Combines the sliding diagonal movement of a Bishop with the leap of a Knight.',
      'Chancellor (C): Combines the orthogonal sliding movement of a Rook with the leap of a Knight.',
      'Pawns may advance 1 or 2 squares on their starting rank and promote on the final rank.',
      'Check and Checkmate rules apply identically to standard chess.',
    ],
  };
}

export function createCustomDimensionBoard(
  rows: number,
  cols: number,
  grid?: (VariantPiece | null)[][],
): DimensionBoardState {
  const safeRows = Math.max(4, Math.min(10, rows));
  const safeCols = Math.max(4, Math.min(10, cols));
  const finalGrid: (VariantPiece | null)[][] =
    grid && grid.length === safeRows && grid[0]?.length === safeCols
      ? grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
      : Array.from({ length: safeRows }, (_, r) =>
          Array.from({ length: safeCols }, (__, c) => {
            if (r === 0 && c === Math.floor(safeCols / 2)) return { type: 'k', color: 'b' };
            if (r === safeRows - 1 && c === Math.floor(safeCols / 2)) return { type: 'k', color: 'w' };
            if (r === 1) return { type: 'p', color: 'b' };
            if (r === safeRows - 2) return { type: 'p', color: 'w' };
            return null;
          }),
        );

  return {
    variantId: 'custom',
    rows: safeRows,
    cols: safeCols,
    grid: finalGrid,
    turn: 'w',
    moveHistory: [],
    winner: null,
    terminationReason: null,
    rulesSummary: [
      `Custom ${safeRows}×${safeCols} Dimension Board.`,
      'Each side requires one King to enforce check/checkmate validation.',
      'Supports standard pieces plus Archbishop (B+N) and Chancellor (R+N).',
    ],
  };
}

function inside(r: number, c: number, rows: number, cols: number): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

function generatePseudoMovesForSquare(
  state: DimensionBoardState,
  r: number,
  c: number,
): VariantMove[] {
  const piece = state.grid[r][c];
  if (!piece) return [];
  const { rows, cols, grid } = state;
  const moves: VariantMove[] = [];

  const pushMove = (tr: number, tc: number, promotion?: VariantPieceType) => {
    const target = grid[tr][tc];
    if (target && target.color === piece.color) return;
    const prefix = piece.type === 'p' ? '' : piece.type.toUpperCase();
    const captureMark = target ? 'x' : '';
    const promoMark = promotion ? `=${promotion.toUpperCase()}` : '';
    const notation = `${prefix}${coordToAlgebraic(r, c, rows)}${captureMark}${coordToAlgebraic(tr, tc, rows)}${promoMark}`;
    moves.push({
      from: { r, c },
      to: { r: tr, c: tc },
      promotion,
      captured: target ?? undefined,
      notation,
    });
  };

  const slide = (dirs: [number, number][]) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr;
      let nc = c + dc;
      while (inside(nr, nc, rows, cols)) {
        const occ = grid[nr][nc];
        if (!occ) {
          pushMove(nr, nc);
        } else {
          if (occ.color !== piece.color) pushMove(nr, nc);
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  };

  const leap = (offsets: [number, number][]) => {
    for (const [dr, dc] of offsets) {
      const nr = r + dr;
      const nc = c + dc;
      if (inside(nr, nc, rows, cols)) {
        pushMove(nr, nc);
      }
    }
  };

  const knightOffsets: [number, number][] = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  const orthoDirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const diagDirs: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  switch (piece.type) {
    case 'p': {
      const dir = piece.color === 'w' ? -1 : 1;
      const promoRank = piece.color === 'w' ? 0 : rows - 1;
      const nr = r + dir;
      if (inside(nr, c, rows, cols) && !grid[nr][c]) {
        pushMove(nr, c, nr === promoRank ? 'q' : undefined);
        // Double step only on larger boards (>= 6 rows) from starting 2nd rank
        const isStartRank = piece.color === 'w' ? r === rows - 2 : r === 1;
        const nr2 = r + dir * 2;
        if (rows >= 6 && isStartRank && inside(nr2, c, rows, cols) && !grid[nr2][c]) {
          pushMove(nr2, c);
        }
      }
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (inside(nr, nc, rows, cols)) {
          const target = grid[nr][nc];
          if (target && target.color !== piece.color) {
            pushMove(nr, nc, nr === promoRank ? 'q' : undefined);
          }
        }
      }
      break;
    }
    case 'n':
      leap(knightOffsets);
      break;
    case 'b':
      slide(diagDirs);
      break;
    case 'r':
      slide(orthoDirs);
      break;
    case 'q':
      slide([...orthoDirs, ...diagDirs]);
      break;
    case 'a':
      slide(diagDirs);
      leap(knightOffsets);
      break;
    case 'c':
      slide(orthoDirs);
      leap(knightOffsets);
      break;
    case 'k':
      leap([...orthoDirs, ...diagDirs]);
      break;
  }

  return moves;
}

export function isKingInCheck(state: DimensionBoardState, color: 'w' | 'b'): boolean {
  let kr = -1;
  let kc = -1;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const p = state.grid[r][c];
      if (p && p.color === color && p.type === 'k') {
        kr = r;
        kc = c;
      }
    }
  }
  if (kr === -1) return false;
  const enemy = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const p = state.grid[r][c];
      if (p && p.color === enemy) {
        const pseudo = generatePseudoMovesForSquare(state, r, c);
        if (pseudo.some((m) => m.to.r === kr && m.to.c === kc)) {
          return true;
        }
      }
    }
  }
  return false;
}

function applyRawMove(state: DimensionBoardState, move: VariantMove): DimensionBoardState {
  const newGrid = state.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  const moving = newGrid[move.from.r][move.from.c];
  newGrid[move.from.r][move.from.c] = null;
  if (moving) {
    newGrid[move.to.r][move.to.c] = move.promotion
      ? { type: move.promotion, color: moving.color }
      : moving;
  }
  return {
    ...state,
    grid: newGrid,
    turn: state.turn === 'w' ? 'b' : 'w',
    moveHistory: [...state.moveHistory, move.notation],
  };
}

export function getLegalVariantMoves(state: DimensionBoardState): VariantMove[] {
  if (state.winner) return [];
  const allLegal: VariantMove[] = [];
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const p = state.grid[r][c];
      if (p && p.color === state.turn) {
        const pseudo = generatePseudoMovesForSquare(state, r, c);
        for (const mv of pseudo) {
          const next = applyRawMove(state, mv);
          if (!isKingInCheck(next, state.turn)) {
            allLegal.push(mv);
          }
        }
      }
    }
  }
  return allLegal;
}

export function makeVariantMove(
  state: DimensionBoardState,
  from: VariantSquareCoord,
  to: VariantSquareCoord,
): DimensionBoardState | null {
  const legal = getLegalVariantMoves(state);
  const chosen = legal.find(
    (m) => m.from.r === from.r && m.from.c === from.c && m.to.r === to.r && m.to.c === to.c,
  );
  if (!chosen) return null;

  const next = applyRawMove(state, chosen);
  const opponentMoves = getLegalVariantMoves(next);
  if (opponentMoves.length === 0) {
    const inCheck = isKingInCheck(next, next.turn);
    return {
      ...next,
      winner: inCheck ? state.turn : 'draw',
      terminationReason: inCheck
        ? `Checkmate — ${state.turn === 'w' ? 'White' : 'Black'} wins`
        : 'Stalemate — Draw',
    };
  }

  return next;
}

export function validateCustomBoard(state: DimensionBoardState): { valid: boolean; error?: string } {
  let wk = 0;
  let bk = 0;
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const p = state.grid[r][c];
      if (p?.type === 'k') {
        if (p.color === 'w') wk++;
        else bk++;
      }
    }
  }
  if (wk !== 1 || bk !== 1) {
    return { valid: false, error: 'Each side must have exactly one King on the board.' };
  }
  if (isKingInCheck(state, state.turn === 'w' ? 'b' : 'w')) {
    return { valid: false, error: 'The side not to move cannot already be in check.' };
  }
  if (getLegalVariantMoves(state).length === 0) {
    return { valid: false, error: 'The side to move has no legal moves in this starting setup.' };
  }
  return { valid: true };
}
