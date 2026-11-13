import React, { useEffect, useMemo, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lightbulb,
  Play,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PUZZLES, getDailyPuzzle, getDateKey } from '../data/puzzles';
import { PuzzleData, PuzzleTheme } from '../types/chess';
import { Chessboard2D } from '../components/chess/Chessboard2D';
import { playChessSound } from '../utils/sound';

const THEME_LABELS: { id: PuzzleTheme | 'all'; label: string }[] = [
  { id: 'all', label: 'All Themes' },
  { id: 'mate-in-1', label: 'Mate in 1' },
  { id: 'mate-in-2', label: 'Mate in 2' },
  { id: 'mate-in-3', label: 'Mate in 3' },
  { id: 'fork', label: 'Forks' },
  { id: 'pin', label: 'Pins' },
  { id: 'skewer', label: 'Skewers' },
  { id: 'discovered-attack', label: 'Discovered Attack' },
  { id: 'sacrifice', label: 'Sacrifices' },
  { id: 'defensive', label: 'Defensive' },
  { id: 'endgame', label: 'Endgame' },
];

export const MysteryAndPuzzlesView: React.FC<{ title?: string }> = ({
  title = 'Chess Mystery',
}) => {
  const { profile, recordPuzzleSolved } = useApp();
  const dailyPuzzle = useMemo(() => getDailyPuzzle(), []);
  const todayKey = getDateKey();

  const [themeFilter, setThemeFilter] = useState<PuzzleTheme | 'all'>('all');
  const [selectedPuzzle, setSelectedPuzzle] = useState<PuzzleData>(dailyPuzzle);
  const [fen, setFen] = useState(dailyPuzzle.fen);
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'wrong' | 'solved'>('playing');
  const [hintShown, setHintShown] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  const filteredPuzzles = useMemo(
    () =>
      themeFilter === 'all' ? PUZZLES : PUZZLES.filter((p) => p.theme === themeFilter),
    [themeFilter],
  );

  const loadPuzzle = (pz: PuzzleData) => {
    setSelectedPuzzle(pz);
    setFen(pz.fen);
    setStepIndex(0);
    setStatus('playing');
    setHintShown(false);
    setElapsedSec(0);
    setTimerActive(true);
  };

  useEffect(() => {
    if (!timerActive || status === 'solved') return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [timerActive, status]);

  const handlePuzzleMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    if (status === 'solved') return false;
    const expectedUci = selectedPuzzle.solutionMoves[stepIndex];
    if (!expectedUci) return false;

    const playedUci = `${from}${to}${promotion ?? ''}`;
    const c = new Chess(fen);
    const mv = c.move({ from, to, promotion: promotion ?? (expectedUci.length === 5 ? (expectedUci[4] as PieceSymbol) : undefined) });
    if (!mv) return false;

    const normalizedPlayed = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
    if (normalizedPlayed !== expectedUci) {
      setStatus('wrong');
      playChessSound('puzzle-error', profile.customization.soundEnabled);
      return false;
    }

    // Correct player move
    let nextFen = c.fen();
    let nextStep = stepIndex + 1;

    if (nextStep >= selectedPuzzle.solutionMoves.length) {
      setFen(nextFen);
      setStepIndex(nextStep);
      setStatus('solved');
      playChessSound('puzzle-success', profile.customization.soundEnabled);
      recordPuzzleSolved(selectedPuzzle.id === dailyPuzzle.id, todayKey);
      return true;
    }

    // Auto-play opponent's forced reply
    const replyUci = selectedPuzzle.solutionMoves[nextStep];
    const cReply = new Chess(nextFen);
    const replyMv = cReply.move({
      from: replyUci.slice(0, 2) as Square,
      to: replyUci.slice(2, 4) as Square,
      promotion: (replyUci.slice(4) as PieceSymbol) || undefined,
    });
    if (replyMv) {
      nextFen = cReply.fen();
      nextStep += 1;
    }

    setFen(nextFen);
    setStepIndex(nextStep);
    setStatus('playing');
    playChessSound('move', profile.customization.soundEnabled);

    if (nextStep >= selectedPuzzle.solutionMoves.length) {
      setStatus('solved');
      playChessSound('puzzle-success', profile.customization.soundEnabled);
      recordPuzzleSolved(selectedPuzzle.id === dailyPuzzle.id, todayKey);
    }

    return true;
  };

  const replaySolution = () => {
    const c = new Chess(selectedPuzzle.fen);
    for (const uci of selectedPuzzle.solutionMoves) {
      c.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: (uci.slice(4) as PieceSymbol) || undefined,
      });
    }
    setFen(c.fen());
    setStepIndex(selectedPuzzle.solutionMoves.length);
    setStatus('solved');
  };

  const hintSquare = selectedPuzzle.solutionMoves[stepIndex]?.slice(0, 2);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
            Verified tactical puzzles with forced solution lines · Puzzle Rating{' '}
            <span className="font-mono tabular-nums font-semibold">{profile.puzzleRating}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => loadPuzzle(dailyPuzzle)}
            className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] font-medium"
          >
            Daily Puzzle ({todayKey})
          </button>
        </div>
      </div>

      {/* Theme Filter */}
      <div className="flex flex-wrap gap-1.5">
        {THEME_LABELS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setThemeFilter(t.id);
              const list = t.id === 'all' ? PUZZLES : PUZZLES.filter((p) => p.theme === t.id);
              if (list.length > 0) loadPuzzle(list[0]);
            }}
            className={`px-2.5 py-1 rounded-md border text-xs transition-colors ${
              themeFilter === t.id
                ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                : 'border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <Chessboard2D
            fen={fen}
            orientation={selectedPuzzle.sideToMove}
            boardTheme={profile.customization.boardTheme}
            pieceSet={profile.customization.pieceSet}
            showCoordinates={profile.customization.showCoordinates}
            highlightLegalMoves={profile.customization.highlightLegalMoves}
            interactive={status !== 'solved'}
            playerColor={selectedPuzzle.sideToMove}
            onMove={handlePuzzleMove}
          />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-[#756F63] dark:text-[#9B9386] capitalize">
                  {selectedPuzzle.theme.replace(/-/g, ' ')} · Difficulty {selectedPuzzle.difficulty}
                </div>
                <h2 className="font-display text-lg font-bold">{selectedPuzzle.title}</h2>
                <div className="text-xs font-mono tabular-nums text-[#756F63] mt-0.5">
                  Rating {selectedPuzzle.rating} · {selectedPuzzle.sideToMove === 'w' ? 'White' : 'Black'} to move
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-[#756F63]">
                <Clock className="w-3.5 h-3.5" />
                <span>{elapsedSec}s</span>
              </div>
            </div>

            {status === 'wrong' && (
              <div className="p-3 rounded-md border border-[#9B2226]/40 bg-[#9B2226]/10 text-xs text-[#9B2226] dark:text-[#E05A5A] flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Not the sharpest move here. Try another tactical continuation.</span>
              </div>
            )}

            {status === 'solved' && (
              <div className="p-3.5 rounded-md border border-[#2D6A4F]/40 bg-[#2D6A4F]/10 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#2D6A4F] dark:text-[#52B788]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Puzzle Solved</span>
                </div>
                <p className="text-xs text-[#292720] dark:text-[#F3EBDD]">
                  {selectedPuzzle.explanation}
                </p>
              </div>
            )}

            {hintShown && hintSquare && status !== 'solved' && (
              <div className="p-3 rounded-md bg-[#EAE2D4] dark:bg-[#2B2822] text-xs">
                Hint: Examine the piece on <strong className="font-mono">{hintSquare}</strong>.
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setHintShown(true)}
                disabled={status === 'solved'}
                className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Hint</span>
              </button>
              <button
                type="button"
                onClick={replaySolution}
                className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium"
              >
                Show Solution
              </button>
              <button
                type="button"
                onClick={() => loadPuzzle(selectedPuzzle)}
                className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = filteredPuzzles.findIndex((p) => p.id === selectedPuzzle.id);
                  const next = filteredPuzzles[(idx + 1) % filteredPuzzles.length];
                  if (next) loadPuzzle(next);
                }}
                className="px-3 py-1.5 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold inline-flex items-center gap-1 ml-auto"
              >
                <span>Next Puzzle</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[11px] text-[#9B9386] pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24]">
              Source: {selectedPuzzle.source}
            </div>
          </div>

          {/* Puzzle Selector List */}
          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4">
            <h3 className="font-display text-sm font-semibold mb-2">
              Puzzle Index ({filteredPuzzles.length})
            </h3>
            <div className="max-h-56 overflow-y-auto divide-y divide-[#E6DDCE] dark:divide-[#2F2B24]">
              {filteredPuzzles.map((pz) => (
                <button
                  key={pz.id}
                  type="button"
                  onClick={() => loadPuzzle(pz)}
                  className={`w-full py-2 px-2 text-left flex items-center justify-between text-xs rounded ${
                    selectedPuzzle.id === pz.id
                      ? 'bg-[#EAE2D4] dark:bg-[#2B2822] font-semibold'
                      : 'hover:bg-[#F3EBDD]/60 dark:hover:bg-[#2B2822]/40'
                  }`}
                >
                  <span className="truncate">{pz.title}</span>
                  <span className="font-mono tabular-nums text-[#756F63] shrink-0 ml-2">
                    {pz.rating}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PuzzleRushView: React.FC = () => {
  const { profile, recordPuzzleRushBest } = useApp();

  const [rushMode, setRushMode] = useState<'timed' | 'untimed'>('timed');
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [phase, setPhase] = useState<'setup' | 'running' | 'summary'>('setup');

  const [queue, setQueue] = useState<PuzzleData[]>([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [fen, setFen] = useState(PUZZLES[0].fen);
  const [stepIdx, setStepIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [timeLeftSec, setTimeLeftSec] = useState(180);
  const [wrongFlash, setWrongFlash] = useState(false);

  const currentPuzzle = queue[queueIdx] ?? PUZZLES[0];

  const startRush = () => {
    const pool =
      difficulty === 'all' ? PUZZLES : PUZZLES.filter((p) => p.difficulty === difficulty);
    const ordered = [...pool].sort((a, b) => a.rating - b.rating);
    const list = ordered.length > 0 ? ordered : PUZZLES;
    setQueue(list);
    setQueueIdx(0);
    setFen(list[0].fen);
    setStepIdx(0);
    setScore(0);
    setStrikes(0);
    setTimeLeftSec(180);
    setWrongFlash(false);
    setPhase('running');
  };

  useEffect(() => {
    if (phase !== 'running' || rushMode !== 'timed') return;
    const t = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev <= 1) {
          setPhase('summary');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, rushMode]);

  useEffect(() => {
    if (phase === 'summary' && score > 0) {
      recordPuzzleRushBest(rushMode, score);
    }
  }, [phase, rushMode, score, recordPuzzleRushBest]);

  const advanceNextPuzzle = (nextScore: number) => {
    const nextIdx = queueIdx + 1;
    if (nextIdx >= queue.length) {
      setScore(nextScore);
      setPhase('summary');
      return;
    }
    setScore(nextScore);
    setQueueIdx(nextIdx);
    setFen(queue[nextIdx].fen);
    setStepIdx(0);
    setWrongFlash(false);
  };

  const handleRushMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    if (phase !== 'running') return false;
    const expectedUci = currentPuzzle.solutionMoves[stepIdx];
    const c = new Chess(fen);
    const mv = c.move({
      from,
      to,
      promotion: promotion ?? (expectedUci.length === 5 ? (expectedUci[4] as PieceSymbol) : undefined),
    });
    if (!mv) return false;

    const played = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
    if (played !== expectedUci) {
      // Incorrect moves NEVER count as completion!
      playChessSound('puzzle-error', profile.customization.soundEnabled);
      setWrongFlash(true);
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);
      if (nextStrikes >= 3) {
        setPhase('summary');
      }
      return false;
    }

    setWrongFlash(false);
    let nextFen = c.fen();
    let nextStep = stepIdx + 1;

    if (nextStep >= currentPuzzle.solutionMoves.length) {
      playChessSound('puzzle-success', profile.customization.soundEnabled);
      advanceNextPuzzle(score + 1);
      return true;
    }

    const replyUci = currentPuzzle.solutionMoves[nextStep];
    const cReply = new Chess(nextFen);
    const replyMv = cReply.move({
      from: replyUci.slice(0, 2) as Square,
      to: replyUci.slice(2, 4) as Square,
      promotion: (replyUci.slice(4) as PieceSymbol) || undefined,
    });
    if (replyMv) {
      nextFen = cReply.fen();
      nextStep += 1;
    }

    setFen(nextFen);
    setStepIdx(nextStep);
    playChessSound('move', profile.customization.soundEnabled);

    if (nextStep >= currentPuzzle.solutionMoves.length) {
      playChessSound('puzzle-success', profile.customization.soundEnabled);
      advanceNextPuzzle(score + 1);
    }

    return true;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Puzzle Rush</h1>
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
            Solve each puzzle accurately to advance. Three strikes ends the run.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <span>Best Timed: {profile.puzzleRushBestTimed}</span>
          <span>Best Untimed: {profile.puzzleRushBestUntimed}</span>
        </div>
      </div>

      {phase === 'setup' && (
        <div className="max-w-xl border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold">Mode</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRushMode('timed')}
                className={`px-3.5 py-2 rounded-md border text-xs font-semibold ${
                  rushMode === 'timed'
                    ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                    : 'border-[#D8CDBB] dark:border-[#3B362E]'
                }`}
              >
                Timed (3 Minutes)
              </button>
              <button
                type="button"
                onClick={() => setRushMode('untimed')}
                className={`px-3.5 py-2 rounded-md border text-xs font-semibold ${
                  rushMode === 'untimed'
                    ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                    : 'border-[#D8CDBB] dark:border-[#3B362E]'
                }`}
              >
                Survival (Untimed)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold">Difficulty Tier</div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`px-3 py-1.5 rounded-md border text-xs capitalize ${
                    difficulty === d
                      ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                      : 'border-[#D8CDBB] dark:border-[#3B362E]'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={startRush}
            className="w-full py-2.5 px-4 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>Start Puzzle Rush</span>
          </button>
        </div>
      )}

      {phase === 'running' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <Chessboard2D
              fen={fen}
              orientation={currentPuzzle.sideToMove}
              boardTheme={profile.customization.boardTheme}
              pieceSet={profile.customization.pieceSet}
              showCoordinates={profile.customization.showCoordinates}
              playerColor={currentPuzzle.sideToMove}
              onMove={handleRushMove}
            />
          </div>

          <div className="lg:col-span-5 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded bg-[#F3EBDD] dark:bg-[#2B2822]">
                <div className="text-[11px] text-[#756F63]">Streak</div>
                <div className="font-mono tabular-nums text-xl font-bold">{score}</div>
              </div>
              <div className="p-2.5 rounded bg-[#F3EBDD] dark:bg-[#2B2822]">
                <div className="text-[11px] text-[#756F63]">Strikes</div>
                <div className="font-mono tabular-nums text-xl font-bold text-[#9B2226] dark:text-[#E05A5A]">
                  {strikes}/3
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#F3EBDD] dark:bg-[#2B2822]">
                <div className="text-[11px] text-[#756F63]">Clock</div>
                <div className="font-mono tabular-nums text-xl font-bold">
                  {rushMode === 'timed'
                    ? `${Math.floor(timeLeftSec / 60)}:${String(timeLeftSec % 60).padStart(2, '0')}`
                    : '∞'}
                </div>
              </div>
            </div>

            <div className="text-xs text-[#756F63]">
              Current Puzzle: <strong className="text-[#292720] dark:text-[#F3EBDD]">{currentPuzzle.title}</strong> ({currentPuzzle.rating})
            </div>

            {wrongFlash && (
              <div className="p-2.5 rounded border border-[#9B2226]/40 bg-[#9B2226]/10 text-xs text-[#9B2226] dark:text-[#E05A5A]">
                Incorrect move — strike recorded. Find the exact continuation to advance.
              </div>
            )}

            <button
              type="button"
              onClick={() => setPhase('summary')}
              className="px-3 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs"
            >
              End Run Early
            </button>
          </div>
        </div>
      )}

      {phase === 'summary' && (
        <div className="max-w-lg border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <h2 className="font-display text-lg font-bold">Puzzle Rush Complete</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded bg-[#F3EBDD] dark:bg-[#2B2822]">
              <div className="text-xs text-[#756F63]">Solved Streak</div>
              <div className="font-mono tabular-nums text-2xl font-bold">{score}</div>
            </div>
            <div className="p-3 rounded bg-[#F3EBDD] dark:bg-[#2B2822]">
              <div className="text-xs text-[#756F63]">Personal Best ({rushMode})</div>
              <div className="font-mono tabular-nums text-2xl font-bold">
                {rushMode === 'timed' ? profile.puzzleRushBestTimed : profile.puzzleRushBestUntimed}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startRush}
              className="px-4 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Rush</span>
            </button>
            <button
              type="button"
              onClick={() => setPhase('setup')}
              className="px-4 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium"
            >
              Change Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
