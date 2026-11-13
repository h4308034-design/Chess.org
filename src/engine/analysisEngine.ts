import { Chess, PieceSymbol } from 'chess.js';
import { AnalyzedMove, MoveClassification } from '../types/chess';
import { searchBestMove } from './chessEngine';

const MATERIAL_MAP: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function countMaterial(chess: Chess, color: 'w' | 'b'): number {
  let total = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.color === color) {
        total += MATERIAL_MAP[cell.type];
      }
    }
  }
  return total;
}

export interface AnalysisCriteriaConfig {
  depth: number;
  inaccuracyThresholdCp: number;
  mistakeThresholdCp: number;
  blunderThresholdCp: number;
  brilliantMinGainOrHoldCp: number;
}

export const DEFAULT_ANALYSIS_CRITERIA: AnalysisCriteriaConfig = {
  depth: 2,
  inaccuracyThresholdCp: 55,
  mistakeThresholdCp: 130,
  blunderThresholdCp: 280,
  brilliantMinGainOrHoldCp: 60,
};

export interface GameReviewSummary {
  moves: AnalyzedMove[];
  whiteAccuracy: number;
  blackAccuracy: number;
  counts: {
    w: Record<MoveClassification, number>;
    b: Record<MoveClassification, number>;
  };
  depthUsed: number;
}

function emptyCountMap(): Record<MoveClassification, number> {
  return {
    Brilliant: 0,
    Best: 0,
    Excellent: 0,
    Good: 0,
    Inaccuracy: 0,
    Mistake: 0,
    Blunder: 0,
    'Missed Win': 0,
    'Missed Mate': 0,
    Book: 0,
  };
}

export function classifySingleMove(params: {
  playedUci: string;
  bestUci: string;
  evalBeforeSideCp: number;
  evalAfterSideCp: number; // from mover's perspective after the move
  mateBeforeSide: number | null;
  mateAfterSide: number | null;
  materialBeforeMover: number;
  materialAfterMover: number;
  secondBestSideCp: number | null;
  ply: number;
  isCheckOrCapture: boolean;
  criteria?: AnalysisCriteriaConfig;
}): { classification: MoveClassification; cpLoss: number; reason: string } {
  const cfg = params.criteria ?? DEFAULT_ANALYSIS_CRITERIA;
  const cpLoss = Math.max(0, Math.round(params.evalBeforeSideCp - params.evalAfterSideCp));

  // Missed mate check
  if (params.mateBeforeSide !== null && params.mateBeforeSide > 0 && (params.mateAfterSide === null || params.mateAfterSide <= 0)) {
    return {
      classification: 'Missed Mate',
      cpLoss,
      reason: `A forced mate in ${params.mateBeforeSide} was available before this move.`,
    };
  }

  // Missed winning tactical swing
  if (params.evalBeforeSideCp >= 300 && params.evalAfterSideCp < 110) {
    return {
      classification: 'Missed Win',
      cpLoss,
      reason: 'Position held a decisive advantage (+3.0+) that slipped into near equality.',
    };
  }

  // Conservative Brilliant move criteria:
  // 1) Must be top engine move (or within 15cp of top move)
  // 2) Must sacrifice net material (mover has strictly less material 1 ply later or gave up >=2 material on move)
  // 3) Must not already be trivially winning (+6.0+ before move)
  // 4) Must be a forced/only-move tactical justification (better than 2nd best move by >= 60cp)
  const isTopMove = params.playedUci === params.bestUci || cpLoss <= 15;
  const materialDropped = params.materialAfterMover < params.materialBeforeMover;
  const notTriviallyWinning = params.evalBeforeSideCp < 550 && params.evalBeforeSideCp > -250;
  const marginOverSecondBest =
    params.secondBestSideCp !== null ? params.evalAfterSideCp - params.secondBestSideCp : 0;

  if (
    isTopMove &&
    materialDropped &&
    notTriviallyWinning &&
    params.evalAfterSideCp >= -40 &&
    (marginOverSecondBest >= cfg.brilliantMinGainOrHoldCp || params.isCheckOrCapture)
  ) {
    return {
      classification: 'Brilliant',
      cpLoss,
      reason:
        'Sound tactical sacrifice: gives up material while maintaining or seizing the engine initiative over alternatives.',
    };
  }

  if (params.ply <= 6 && cpLoss <= 30 && params.playedUci === params.bestUci) {
    return {
      classification: 'Book',
      cpLoss,
      reason: 'Standard opening development.',
    };
  }

  if (params.playedUci === params.bestUci || cpLoss <= 10) {
    return {
      classification: 'Best',
      cpLoss,
      reason: `Matches top engine line at depth ${cfg.depth}.`,
    };
  }
  if (cpLoss <= 30) {
    return {
      classification: 'Excellent',
      cpLoss,
      reason: `Within 0.30 pawns of the top engine recommendation.`,
    };
  }
  if (cpLoss < cfg.inaccuracyThresholdCp) {
    return {
      classification: 'Good',
      cpLoss,
      reason: 'Solid practical continuation with minimal evaluation drop.',
    };
  }
  if (cpLoss < cfg.mistakeThresholdCp) {
    return {
      classification: 'Inaccuracy',
      cpLoss,
      reason: `Lost ${(cpLoss / 100).toFixed(2)} pawns of evaluation compared to the best continuation.`,
    };
  }
  if (cpLoss < cfg.blunderThresholdCp) {
    return {
      classification: 'Mistake',
      cpLoss,
      reason: `Significant ${(cpLoss / 100).toFixed(2)}-pawn evaluation loss.`,
    };
  }
  return {
    classification: 'Blunder',
    cpLoss,
    reason: `Severe ${(cpLoss / 100).toFixed(2)}-pawn drop allowing tactical refutation.`,
  };
}

export function analyzePgnGame(
  pgn: string,
  criteria: AnalysisCriteriaConfig = DEFAULT_ANALYSIS_CRITERIA,
): GameReviewSummary {
  const loader = new Chess();
  loader.loadPgn(pgn);
  const history = loader.history({ verbose: true });

  const replay = new Chess();
  const analyzedMoves: AnalyzedMove[] = [];
  const counts = {
    w: emptyCountMap(),
    b: emptyCountMap(),
  };

  let whiteLossSum = 0;
  let whiteMoves = 0;
  let blackLossSum = 0;
  let blackMoves = 0;

  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const fenBefore = replay.fen();
    const color = move.color;
    const sign = color === 'w' ? 1 : -1;
    const materialBeforeMover = countMaterial(replay, color);

    const beforeSearch = searchBestMove(fenBefore, {
      personalityId: 'grandmaster',
      depth: criteria.depth,
      maxTimeMs: 320,
    });

    const playedUci = `${move.from}${move.to}${move.promotion ?? ''}`;
    replay.move(move);
    const fenAfter = replay.fen();

    const afterSearch = searchBestMove(fenAfter, {
      personalityId: 'grandmaster',
      depth: Math.max(1, criteria.depth - 1),
      maxTimeMs: 220,
    });

    const evalBeforeSideCp = beforeSearch.evalCp * sign;
    const evalAfterSideCp = afterSearch.evalCp * sign;
    const mateBeforeSide = beforeSearch.mateIn !== null ? beforeSearch.mateIn * sign : null;
    const mateAfterSide = afterSearch.mateIn !== null ? afterSearch.mateIn * sign : null;
    const secondBestSideCp =
      beforeSearch.topMoves.length > 1 ? beforeSearch.topMoves[1].evalCp * sign : null;

    // Look 1 ply deeper after opponent's best recapture if capture happened to detect real sacrifice
    let materialAfterMover = countMaterial(replay, color);
    if (afterSearch.bestMoveUci) {
      const checkNext = new Chess(fenAfter);
      try {
        checkNext.move({
          from: afterSearch.bestMoveUci.slice(0, 2),
          to: afterSearch.bestMoveUci.slice(2, 4),
          promotion: afterSearch.bestMoveUci.slice(4) || undefined,
        });
        materialAfterMover = Math.min(materialAfterMover, countMaterial(checkNext, color));
      } catch {
        // ignore
      }
    }

    const { classification, cpLoss, reason } = classifySingleMove({
      playedUci,
      bestUci: beforeSearch.bestMoveUci,
      evalBeforeSideCp,
      evalAfterSideCp,
      mateBeforeSide,
      mateAfterSide,
      materialBeforeMover,
      materialAfterMover,
      secondBestSideCp,
      ply: i + 1,
      isCheckOrCapture: Boolean(move.captured || move.san.includes('+')),
      criteria,
    });

    counts[color][classification]++;
    if (color === 'w') {
      whiteLossSum += Math.min(cpLoss, 600);
      whiteMoves++;
    } else {
      blackLossSum += Math.min(cpLoss, 600);
      blackMoves++;
    }

    analyzedMoves.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color,
      san: move.san,
      uci: playedUci,
      fenBefore,
      fenAfter,
      evalBeforeCp: beforeSearch.evalCp,
      evalAfterCp: afterSearch.evalCp,
      mateBefore: beforeSearch.mateIn,
      mateAfter: afterSearch.mateIn,
      bestMoveUci: beforeSearch.bestMoveUci,
      bestMoveSan: beforeSearch.bestMoveSan,
      bestEvalCp: beforeSearch.evalCp,
      cpLoss,
      classification,
      pvSan: beforeSearch.pvSan,
      reason,
    });
  }

  const calcAccuracy = (avgLoss: number) =>
    Math.max(15, Math.min(99.5, Math.round((100 * Math.exp(-0.0038 * avgLoss)) * 10) / 10));

  return {
    moves: analyzedMoves,
    whiteAccuracy: whiteMoves > 0 ? calcAccuracy(whiteLossSum / whiteMoves) : 100,
    blackAccuracy: blackMoves > 0 ? calcAccuracy(blackLossSum / blackMoves) : 100,
    counts,
    depthUsed: criteria.depth,
  };
}

export async function analyzePgnGameAsync(
  pgn: string,
  criteria: AnalysisCriteriaConfig = DEFAULT_ANALYSIS_CRITERIA,
  onProgress?: (completed: number, total: number) => void,
  isCancelled?: () => boolean,
): Promise<GameReviewSummary> {
  const loader = new Chess();
  loader.loadPgn(pgn);
  const history = loader.history({ verbose: true });

  const replay = new Chess();
  const analyzedMoves: AnalyzedMove[] = [];
  const counts = {
    w: emptyCountMap(),
    b: emptyCountMap(),
  };

  let whiteLossSum = 0;
  let whiteMoves = 0;
  let blackLossSum = 0;
  let blackMoves = 0;

  let cachedSearch =
    history.length > 0
      ? searchBestMove(replay.fen(), {
          personalityId: 'grandmaster',
          depth: criteria.depth,
          maxTimeMs: 65,
        })
      : null;

  for (let i = 0; i < history.length; i++) {
    if (isCancelled?.()) {
      throw new Error('Analysis cancelled');
    }

    const move = history[i];
    const fenBefore = replay.fen();
    const color = move.color;
    const sign = color === 'w' ? 1 : -1;
    const materialBeforeMover = countMaterial(replay, color);

    const beforeSearch =
      cachedSearch ??
      searchBestMove(fenBefore, {
        personalityId: 'grandmaster',
        depth: criteria.depth,
        maxTimeMs: 65,
      });

    const playedUci = `${move.from}${move.to}${move.promotion ?? ''}`;
    replay.move(move);
    const fenAfter = replay.fen();

    const afterSearch = searchBestMove(fenAfter, {
      personalityId: 'grandmaster',
      depth: criteria.depth,
      maxTimeMs: 65,
    });
    cachedSearch = afterSearch;

    const evalBeforeSideCp = beforeSearch.evalCp * sign;
    const evalAfterSideCp = afterSearch.evalCp * sign;
    const mateBeforeSide = beforeSearch.mateIn !== null ? beforeSearch.mateIn * sign : null;
    const mateAfterSide = afterSearch.mateIn !== null ? afterSearch.mateIn * sign : null;
    const secondBestSideCp =
      beforeSearch.topMoves.length > 1 ? beforeSearch.topMoves[1].evalCp * sign : null;

    let materialAfterMover = countMaterial(replay, color);
    if (afterSearch.bestMoveUci) {
      const checkNext = new Chess(fenAfter);
      try {
        checkNext.move({
          from: afterSearch.bestMoveUci.slice(0, 2),
          to: afterSearch.bestMoveUci.slice(2, 4),
          promotion: afterSearch.bestMoveUci.slice(4) || undefined,
        });
        materialAfterMover = Math.min(materialAfterMover, countMaterial(checkNext, color));
      } catch {
        // ignore
      }
    }

    const { classification, cpLoss, reason } = classifySingleMove({
      playedUci,
      bestUci: beforeSearch.bestMoveUci,
      evalBeforeSideCp,
      evalAfterSideCp,
      mateBeforeSide,
      mateAfterSide,
      materialBeforeMover,
      materialAfterMover,
      secondBestSideCp,
      ply: i + 1,
      isCheckOrCapture: Boolean(move.captured || move.san.includes('+')),
      criteria,
    });

    counts[color][classification]++;
    if (color === 'w') {
      whiteLossSum += Math.min(cpLoss, 600);
      whiteMoves++;
    } else {
      blackLossSum += Math.min(cpLoss, 600);
      blackMoves++;
    }

    analyzedMoves.push({
      ply: i + 1,
      moveNumber: Math.floor(i / 2) + 1,
      color,
      san: move.san,
      uci: playedUci,
      fenBefore,
      fenAfter,
      evalBeforeCp: beforeSearch.evalCp,
      evalAfterCp: afterSearch.evalCp,
      mateBefore: beforeSearch.mateIn,
      mateAfter: afterSearch.mateIn,
      bestMoveUci: beforeSearch.bestMoveUci,
      bestMoveSan: beforeSearch.bestMoveSan,
      bestEvalCp: beforeSearch.evalCp,
      cpLoss,
      classification,
      pvSan: beforeSearch.pvSan,
      reason,
    });

    onProgress?.(i + 1, history.length);
    if (i % 2 === 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  const calcAccuracy = (avgLoss: number) =>
    Math.max(15, Math.min(99.5, Math.round((100 * Math.exp(-0.0038 * avgLoss)) * 10) / 10));

  return {
    moves: analyzedMoves,
    whiteAccuracy: whiteMoves > 0 ? calcAccuracy(whiteLossSum / whiteMoves) : 100,
    blackAccuracy: blackMoves > 0 ? calcAccuracy(blackLossSum / blackMoves) : 100,
    counts,
    depthUsed: criteria.depth,
  };
}
