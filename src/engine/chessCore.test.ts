import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { PUZZLES, getDailyPuzzle } from '../data/puzzles';
import { OPENINGS } from '../data/openings';
import { HISTORICAL_GAMES } from '../data/historicalGames';
import { GUESS_ELO_CASES } from '../data/guessEloGames';
import { searchBestMove, evaluatePosition } from './chessEngine';
import { analyzePgnGame, classifySingleMove } from './analysisEngine';
import {
  createMini4x4Board,
  createGrand10x10Board,
  createCustomDimensionBoard,
  getLegalVariantMoves,
  makeVariantMove,
  validateCustomBoard,
} from './variantEngine';
import {
  ChaosGameState,
  getChaosMovesForSquare,
  applyChaosSpecialMove,
  generateDeterministicChaosEvent,
} from './chaosEngine';
import {
  calculateLevelFromXp,
  calculateRatingDelta,
  createInitialUserProfile,
  applyMatchCompletion,
} from './progression';

test('every puzzle has a valid FEN, legal solution line, and expected mate outcome', () => {
  for (const puzzle of PUZZLES) {
    const chess = new Chess(puzzle.fen);
    assert.equal(chess.turn(), puzzle.sideToMove, `Side mismatch on ${puzzle.id}`);
    for (let i = 0; i < puzzle.solutionMoves.length; i++) {
      const uci = puzzle.solutionMoves[i];
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.slice(4) || undefined;
      const move = chess.move({ from, to, promotion });
      assert.ok(move, `Illegal move ${uci} at ply ${i} in puzzle ${puzzle.id}`);
    }
    if (puzzle.theme.startsWith('mate-in-')) {
      assert.equal(chess.isCheckmate(), true, `Puzzle ${puzzle.id} did not end in checkmate`);
    }
  }
});

test('daily puzzle is deterministic for a given calendar date', () => {
  const d1 = new Date('2026-11-12T08:00:00');
  const d2 = new Date('2026-11-12T22:30:00');
  assert.equal(getDailyPuzzle(d1).id, getDailyPuzzle(d2).id);
});

test('every Opening Lab main line and variation plays cleanly on chess.js', () => {
  for (const opening of OPENINGS) {
    const main = new Chess(opening.startingFen);
    for (const node of opening.mainLine) {
      const mv = main.move(node.san);
      assert.ok(mv, `Illegal mainLine move ${node.san} in ${opening.id}`);
    }
    for (const v of opening.variations) {
      const vc = new Chess(opening.startingFen);
      for (const san of v.moves) {
        const mv = vc.move(san);
        assert.ok(mv, `Illegal variation move ${san} in ${opening.id} (${v.name})`);
      }
    }
  }
});

test('every Chess Time Machine historical game plays cleanly to completion', () => {
  for (const game of HISTORICAL_GAMES) {
    const chess = new Chess();
    for (let i = 0; i < game.moves.length; i++) {
      const mv = chess.move(game.moves[i].san);
      assert.ok(mv, `Illegal historical move ${game.moves[i].san} in ${game.id} at index ${i}`);
    }
    if (game.moves[game.moves.length - 1].san.endsWith('#')) {
      assert.equal(chess.isCheckmate(), true, `${game.id} ended in # but chess.js disagrees`);
    }
  }
});

test('every Guess the Elo PGN parses cleanly', () => {
  for (const item of GUESS_ELO_CASES) {
    const chess = new Chess();
    chess.loadPgn(item.pgn);
    assert.ok(chess.history().length >= 8, `PGN too short in ${item.id}`);
  }
});

test('chessEngine finds forced mate in 1 and evaluates checkmate accurately', () => {
  const mateFen = '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1';
  const res = searchBestMove(mateFen, { personalityId: 'grandmaster', depth: 2, maxTimeMs: 400 });
  assert.equal(res.bestMoveUci, 'e1e8');
  assert.equal(res.mateIn, 1);

  const mated = new Chess('4R1k1/5ppp/8/8/8/8/5PPP/6K1 b - - 1 1');
  assert.equal(evaluatePosition(mated), 90000);
});

test('analysisEngine classifies blunders accurately and applies conservative Brilliant rules', () => {
  const summary = analyzePgnGame('1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#', {
    depth: 1,
    inaccuracyThresholdCp: 55,
    mistakeThresholdCp: 130,
    blunderThresholdCp: 280,
    brilliantMinGainOrHoldCp: 60,
  });
  assert.equal(summary.moves.length, 7);
  // 3...Nf6 allows Qxf7#, should be marked Blunder or Missed Mate
  const nf6 = summary.moves[5];
  assert.equal(nf6.san, 'Nf6');
  assert.equal(nf6.classification, 'Blunder');

  // Ordinary move without material sacrifice must NEVER be marked Brilliant
  const nonSac = classifySingleMove({
    playedUci: 'e2e4',
    bestUci: 'e2e4',
    evalBeforeSideCp: 20,
    evalAfterSideCp: 25,
    mateBeforeSide: null,
    mateAfterSide: null,
    materialBeforeMover: 39,
    materialAfterMover: 39,
    secondBestSideCp: -50,
    ply: 1,
    isCheckOrCapture: false,
  });
  assert.notEqual(nonSac.classification, 'Brilliant');
});

test('Dimension variantEngine handles 4x4, 10x10 Grand Chess, and Custom validation', () => {
  const mini = createMini4x4Board();
  const miniMoves = getLegalVariantMoves(mini);
  assert.ok(miniMoves.length > 0);
  const afterMini = makeVariantMove(mini, miniMoves[0].from, miniMoves[0].to);
  assert.ok(afterMini);
  assert.equal(afterMini.turn, 'b');

  const grand = createGrand10x10Board();
  const grandMoves = getLegalVariantMoves(grand);
  // Archbishop on d1 (9,3) and Chancellor on g1 (9,6) can leap like knights over pawns!
  const archbishopKnightMove = grandMoves.find(
    (m) => m.from.r === 9 && m.from.c === 3 && m.to.r === 7 && m.to.c === 2,
  );
  assert.ok(archbishopKnightMove, 'Archbishop should be able to leap like a knight on move 1');
  const afterGrand = makeVariantMove(grand, archbishopKnightMove.from, archbishopKnightMove.to);
  assert.ok(afterGrand);
  assert.equal(afterGrand.turn, 'b');

  const custom = createCustomDimensionBoard(6, 6);
  assert.equal(validateCustomBoard(custom).valid, true);
});

test('Chaos engine special moves and deterministic events are consistent', () => {
  const state: ChaosGameState = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    activeModifiers: ['pawn-sidestep', 'king-knight-leap', 'border-portals', 'chaos-events'],
    seed: 42,
    turnCount: 0,
    whiteKingLeapUsed: false,
    blackKingLeapUsed: false,
    currentEvent: null,
    eventLog: [],
  };
  const openState: ChaosGameState = {
    ...state,
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
  };
  const e4Moves = getChaosMovesForSquare(openState, 'e4');
  const e4ToD4 = e4Moves.find((m) => m.to === 'd4' && m.isChaosSpecial);
  assert.ok(e4ToD4, 'Pawn on e4 should be able to sidestep onto empty d4');
  const after = applyChaosSpecialMove(openState, e4ToD4);
  assert.equal(new Chess(after.fen).get('d4')?.type, 'p');

  // Deterministic event matches across calls with same seed
  const evA = generateDeterministicChaosEvent(4, 12345);
  const evB = generateDeterministicChaosEvent(4, 12345);
  assert.deepEqual(evA, evB);
});

test('Progression level, ELO, and achievements update accurately', () => {
  assert.equal(calculateLevelFromXp(0).level, 1);
  assert.equal(calculateLevelFromXp(100).level, 2);
  assert.ok(calculateRatingDelta(1200, 1400, 'win') > 12);

  let profile = createInitialUserProfile();
  profile = applyMatchCompletion(profile, {
    id: 'm1',
    timestamp: Date.now(),
    mode: 'ai',
    opponentName: 'Casual Bot',
    opponentType: 'ai',
    personalityId: 'casual',
    playerColor: 'w',
    result: 'win',
    termination: 'Checkmate',
    timeControlLabel: '10+0',
    pgn: '1. e4 e5',
    finalFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    moveCount: 2,
    xpEarned: 60,
    ratingDelta: 12,
  });
  assert.equal(profile.matchHistory.length, 1);
  assert.equal(profile.rating, 1212);
  assert.ok(profile.unlockedAchievements.some((a) => a.id === 'first-game'));
});
