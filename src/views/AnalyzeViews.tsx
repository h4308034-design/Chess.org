import React, { useEffect, useMemo, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Cpu,
  FileCode2,
  FlipVertical,
  Info,
  Play,
  RotateCcw,
  SearchCheck,
  Sparkles,
  Square as StopIcon,
  XCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  analyzePgnGameAsync,
  DEFAULT_ANALYSIS_CRITERIA,
  GameReviewSummary,
} from '../engine/analysisEngine';
import { useChessEngine } from '../hooks/useChessEngine';
import { EngineSearchResult } from '../engine/chessEngine';
import { Chessboard } from '../components/chess/Chessboard';
import { EvalBar } from '../components/chess/EvalBar';
import { MoveList } from '../components/chess/MoveList';
import { AnalyzedMove, BoardMode, MoveClassification } from '../types/chess';
import { playChessSound } from '../utils/sound';

const SAMPLE_ANALYSIS_GAMES: { id: string; title: string; subtitle: string; pgn: string }[] = [
  {
    id: 'opera-1858',
    title: 'The Opera Game (Morphy, 1858)',
    subtitle: 'Classical tactical sacrifice & rapid development',
    pgn: `[Event "Paris Opera Consultation"]
[Site "Paris FRA"]
[Date "1858.??.??"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  },
  {
    id: 'legal-mate',
    title: 'Légal’s Trap Miniature',
    subtitle: 'Classic Queen sacrifice leading to minor-piece checkmate',
    pgn: `[Event "Paris Café"]
[White "Kermur Sire de Légal"]
[Black "Saint Brie"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5 Bxd1 6. Bxf7+ Ke7 7. Nd5# 1-0`,
  },
  {
    id: 'tactical-blunder-study',
    title: 'Fork & Back-Rank Study',
    subtitle: 'Short instructional game illustrating Accuracy vs Blunder swings',
    pgn: `[Event "Chess.org Study"]
[White "Study White"]
[Black "Study Black"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 O-O 8. c3 d5 9. exd5 Nxd5 10. Nxe5 Nxe5 11. Rxe5 Nf6 12. d4 Bd6 13. Re1 Ng4 14. h3 Qh4 15. Qf3 Nxf2 16. Qxf2 Bg3 17. Qxf7+ Rxf7 18. Re8# 1-0`,
  },
];

function classificationStyle(c: MoveClassification): {
  label: string;
  textClass: string;
  badgeBg: string;
  symbol: string;
} {
  switch (c) {
    case 'Brilliant':
      return {
        label: 'Brilliant',
        textClass: 'text-[#2D5E40] dark:text-[#7AC496] font-semibold',
        badgeBg: 'bg-[#2D5E40]/12 dark:bg-[#7AC496]/15',
        symbol: '!!',
      };
    case 'Best':
      return {
        label: 'Best',
        textClass: 'text-[#2D5E40] dark:text-[#7AC496] font-medium',
        badgeBg: 'bg-[#2D5E40]/10 dark:bg-[#7AC496]/12',
        symbol: '★',
      };
    case 'Excellent':
      return {
        label: 'Excellent',
        textClass: 'text-[#3C684C] dark:text-[#86C49C]',
        badgeBg: 'bg-[#3C684C]/8 dark:bg-[#86C49C]/10',
        symbol: '!',
      };
    case 'Book':
      return {
        label: 'Book',
        textClass: 'text-[#6A5C48] dark:text-[#CBBBA0]',
        badgeBg: 'bg-[#EAE2D4] dark:bg-[#2B2822]',
        symbol: 'Bk',
      };
    case 'Good':
      return {
        label: 'Good',
        textClass: 'text-[#5A554B] dark:text-[#B8B0A2]',
        badgeBg: 'bg-[#EAE2D4]/60 dark:bg-[#2B2822]/70',
        symbol: '·',
      };
    case 'Inaccuracy':
      return {
        label: 'Inaccuracy',
        textClass: 'text-[#8F651E] dark:text-[#D9AA57]',
        badgeBg: 'bg-[#8F651E]/12 dark:bg-[#D9AA57]/15',
        symbol: '?!',
      };
    case 'Mistake':
      return {
        label: 'Mistake',
        textClass: 'text-[#A25021] dark:text-[#E28A55] font-medium',
        badgeBg: 'bg-[#A25021]/12 dark:bg-[#E28A55]/15',
        symbol: '?',
      };
    case 'Missed Win':
    case 'Missed Mate':
      return {
        label: c,
        textClass: 'text-[#962D2D] dark:text-[#E07A7A] font-medium',
        badgeBg: 'bg-[#962D2D]/12 dark:bg-[#E07A7A]/15',
        symbol: '⊘',
      };
    case 'Blunder':
      return {
        label: 'Blunder',
        textClass: 'text-[#8B2323] dark:text-[#E36D6D] font-semibold',
        badgeBg: 'bg-[#8B2323]/14 dark:bg-[#E36D6D]/18',
        symbol: '??',
      };
  }
}

function formatEval(cp: number, mate?: number | null): string {
  if (mate !== null && mate !== undefined) {
    return `${mate > 0 ? '+' : '-'}M${Math.abs(mate)}`;
  }
  const pawns = cp / 100;
  return `${pawns >= 0 ? '+' : ''}${pawns.toFixed(2)}`;
}

// ============================================================================
// GAME REVIEW & CHESS DETECTIVE
// ============================================================================
export const GameReviewAndDetectiveView: React.FC<{ isDetective?: boolean }> = ({
  isDetective = false,
}) => {
  const { profile, reviewPgn } = useApp();

  const initialPgn = useMemo(() => {
    if (reviewPgn && reviewPgn.trim()) return reviewPgn;
    if (profile.matchHistory.length > 0 && profile.matchHistory[0].pgn.trim()) {
      return profile.matchHistory[0].pgn;
    }
    return SAMPLE_ANALYSIS_GAMES[0].pgn;
  }, [reviewPgn, profile.matchHistory]);

  const [pgnInput, setPgnInput] = useState<string>(initialPgn);
  const [summary, setSummary] = useState<GameReviewSummary | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<{ done: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPly, setSelectedPly] = useState<number>(0);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [boardMode, setBoardMode] = useState<BoardMode>('2d');
  const [compareBeforeAfter, setCompareBeforeAfter] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const analysisRunIdRef = React.useRef(0);

  const runAnalysis = async (sourcePgn: string) => {
    setErrorMsg(null);
    if (!sourcePgn.trim()) {
      setErrorMsg('Please paste a valid PGN or select a game to analyze.');
      return;
    }
    const runId = ++analysisRunIdRef.current;
    setIsAnalyzing(true);
    setAnalysisProgress(null);
    try {
      const res = await analyzePgnGameAsync(
        sourcePgn,
        DEFAULT_ANALYSIS_CRITERIA,
        (done, total) => {
          if (analysisRunIdRef.current === runId) {
            setAnalysisProgress({ done, total });
          }
        },
        () => analysisRunIdRef.current !== runId,
      );
      if (analysisRunIdRef.current !== runId) return;
      if (res.moves.length === 0) {
        setErrorMsg('The provided PGN contains no playable moves.');
        setSummary(null);
      } else {
        setSummary(res);
        setSelectedPly(res.moves.length);
      }
    } catch (err) {
      if (analysisRunIdRef.current !== runId) return;
      setErrorMsg(err instanceof Error ? err.message : 'Unable to parse PGN.');
      setSummary(null);
    } finally {
      if (analysisRunIdRef.current === runId) {
        setIsAnalyzing(false);
        setAnalysisProgress(null);
      }
    }
  };

  useEffect(() => {
    setPgnInput(initialPgn);
    void runAnalysis(initialPgn);
    return () => {
      analysisRunIdRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPgn]);

  const activeMove: AnalyzedMove | null = useMemo(() => {
    if (!summary || selectedPly <= 0) return null;
    return summary.moves[selectedPly - 1] ?? null;
  }, [summary, selectedPly]);

  const displayedFen = useMemo(() => {
    if (!summary) return new Chess().fen();
    if (selectedPly === 0) return summary.moves[0]?.fenBefore ?? new Chess().fen();
    if (compareBeforeAfter && activeMove) return activeMove.fenBefore;
    return activeMove?.fenAfter ?? new Chess().fen();
  }, [summary, selectedPly, compareBeforeAfter, activeMove]);

  const lastMoveSquares = useMemo(() => {
    if (!activeMove || compareBeforeAfter) return null;
    return {
      from: activeMove.uci.slice(0, 2) as Square,
      to: activeMove.uci.slice(2, 4) as Square,
    };
  }, [activeMove, compareBeforeAfter]);

  const currentEvalCp = useMemo(() => {
    if (!activeMove) return 20;
    return compareBeforeAfter ? activeMove.evalBeforeCp : activeMove.evalAfterCp;
  }, [activeMove, compareBeforeAfter]);

  const currentMate = useMemo(() => {
    if (!activeMove) return null;
    return compareBeforeAfter ? activeMove.mateBefore ?? null : activeMove.mateAfter ?? null;
  }, [activeMove, compareBeforeAfter]);

  const movePairs = useMemo(() => {
    if (!summary) return [];
    const rows: { moveNumber: number; white?: AnalyzedMove; black?: AnalyzedMove }[] = [];
    for (let i = 0; i < summary.moves.length; i += 2) {
      rows.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: summary.moves[i],
        black: summary.moves[i + 1],
      });
    }
    return rows;
  }, [summary]);

  const keyClasses: MoveClassification[] = [
    'Brilliant',
    'Best',
    'Excellent',
    'Good',
    'Inaccuracy',
    'Mistake',
    'Blunder',
    'Missed Win',
    'Missed Mate',
  ];

  return (
    <div className="space-y-5">
      {/* Header & Source Picker */}
      <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[#756F63] dark:text-[#9B9386]">
              {isDetective ? <Sparkles className="w-3.5 h-3.5" /> : <SearchCheck className="w-3.5 h-3.5" />}
              <span>{isDetective ? 'Chess Detective · Move-by-Move Audit' : 'Game Review'}</span>
            </div>
            <h2 className="font-display text-xl font-bold text-[#292720] dark:text-[#F3EBDD] mt-0.5">
              {isDetective ? 'Tactical Forensics & Move Classification' : 'Post-Game Evaluation & Accuracy'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCriteria((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] text-xs font-medium text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4] dark:hover:bg-[#35312A]"
            >
              <Info className="w-3.5 h-3.5" />
              <span>{showCriteria ? 'Hide Criteria' : 'Classification Criteria'}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-[#756F63] dark:text-[#B8B0A2] leading-relaxed">
          Evaluates every ply using a local depth-{DEFAULT_ANALYSIS_CRITERIA.depth} + quiescence search.
          Shallow local search surfaces tactical swings, missed mates, and sound material sacrifices accurately,
          without claiming tournament grandmaster or mathematical certainty.
        </p>

        {showCriteria && (
          <div className="border border-[#E6DDCE] dark:border-[#2F2B24] rounded-md bg-[#F3EBDD]/60 dark:bg-[#191714]/60 p-3.5 text-xs space-y-1.5 text-[#292720] dark:text-[#F3EBDD]">
            <p className="font-semibold">Documented Classification Thresholds</p>
            <p className="text-[#756F63] dark:text-[#B8B0A2]">
              <strong>Brilliant (!!):</strong> Must match the top engine move (within 0.15 pawns), sacrifice net
              material verified 1 ply deeper, occur in a non-trivial position (&lt; +5.50), and beat the second-best
              move by at least +0.60 pawns or deliver check/capture.
            </p>
            <p className="text-[#756F63] dark:text-[#B8B0A2]">
              <strong>Best / Excellent / Good:</strong> 0–0.10, ≤0.30, and &lt;0.55 pawn loss respectively.
              <strong className="ml-2">Inaccuracy / Mistake / Blunder:</strong> ≥0.55, ≥1.30, and ≥2.80 pawn loss.
            </p>
          </div>
        )}

        {/* Quick Game Loaders */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {profile.matchHistory.slice(0, 3).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setPgnInput(m.pgn);
                runAnalysis(m.pgn);
              }}
              className="px-2.5 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] text-xs font-medium text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4] dark:hover:bg-[#35312A]"
            >
              My Match vs {m.opponentName} ({m.result})
            </button>
          ))}
          {SAMPLE_ANALYSIS_GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                setPgnInput(g.pgn);
                runAnalysis(g.pgn);
              }}
              className="px-2.5 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#191714] text-xs text-[#756F63] dark:text-[#B8B0A2] hover:text-[#292720] dark:hover:text-[#F3EBDD] hover:bg-[#EAE2D4]/50 dark:hover:bg-[#2B2822]"
            >
              {g.title}
            </button>
          ))}
        </div>

        {/* Custom PGN Box */}
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={pgnInput}
            onChange={(e) => setPgnInput(e.target.value)}
            rows={2}
            aria-label="PGN input for game review"
            placeholder="Paste any standard chess PGN here..."
            className="flex-1 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] px-3 py-2 text-xs font-mono text-[#292720] dark:text-[#F3EBDD] focus:outline-none focus:ring-1 focus:ring-[#292720] dark:focus:ring-[#F3EBDD]"
          />
          <button
            type="button"
            onClick={() => void runAnalysis(pgnInput)}
            disabled={isAnalyzing}
            className="px-4 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold hover:opacity-90 disabled:opacity-50 shrink-0"
          >
            {isAnalyzing
              ? analysisProgress
                ? `Analyzing ${analysisProgress.done}/${analysisProgress.total}...`
                : 'Analyzing...'
              : 'Analyze PGN'}
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-[#8B2323] dark:text-[#E36D6D] bg-[#8B2323]/10 px-3 py-2 rounded-md border border-[#8B2323]/25">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Main Board + Inspector */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 items-start">
          {/* Board Column */}
          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 font-mono tabular-nums text-[#756F63] dark:text-[#B8B0A2]">
                <span>Ply {selectedPly}/{summary.moves.length}</span>
                <span>·</span>
                <span>Eval {formatEval(currentEvalCp, currentMate)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {activeMove && (
                  <button
                    type="button"
                    onClick={() => setCompareBeforeAfter((v) => !v)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      compareBeforeAfter
                        ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                        : 'border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] text-[#292720] dark:text-[#F3EBDD]'
                    }`}
                  >
                    {compareBeforeAfter ? 'Showing: Before Move' : 'Compare Before Move'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setBoardMode((m) => (m === '2d' ? '3d' : '2d'))}
                  className="px-2.5 py-1 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
                >
                  {boardMode.toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                  aria-label="Flip board"
                  className="p-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
                >
                  <FlipVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              {profile.customization.evaluationBarVisible && (
                <EvalBar evalCp={currentEvalCp} mateIn={currentMate} orientation={orientation} />
              )}
              <div className="flex-1 min-w-0">
                <Chessboard
                  mode={boardMode}
                  fen={displayedFen}
                  orientation={orientation}
                  boardTheme={profile.customization.boardTheme}
                  pieceSet={profile.customization.pieceSet}
                  showCoordinates={profile.customization.showCoordinates}
                  interactive={false}
                  lastMove={lastMoveSquares}
                  maxSizePx={480}
                />
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedPly(0)}
                disabled={selectedPly === 0}
                aria-label="First position"
                className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40 hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedPly((p) => Math.max(0, p - 1))}
                disabled={selectedPly === 0}
                aria-label="Previous move"
                className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40 hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedPly((p) => Math.min(summary.moves.length, p + 1))}
                disabled={selectedPly >= summary.moves.length}
                aria-label="Next move"
                className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40 hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedPly(summary.moves.length)}
                disabled={selectedPly >= summary.moves.length}
                aria-label="Last move"
                className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40 hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Panel: Accuracy, Selected Move Detective Breakdown & Move List */}
          <div className="space-y-4">
            {/* Accuracy Header */}
            <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[#756F63] dark:text-[#9B9386]">White Accuracy</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-[#292720] dark:text-[#F3EBDD]">
                  {summary.whiteAccuracy.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[#756F63] dark:text-[#9B9386]">Black Accuracy</p>
                <p className="font-mono tabular-nums text-2xl font-bold text-[#292720] dark:text-[#F3EBDD]">
                  {summary.blackAccuracy.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Active Move Forensics Card */}
            <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-2.5">
              {activeMove ? (
                <>
                  {(() => {
                    const st = classificationStyle(activeMove.classification);
                    return (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono tabular-nums text-sm font-bold text-[#292720] dark:text-[#F3EBDD]">
                            {activeMove.moveNumber}
                            {activeMove.color === 'w' ? '.' : '...'} {activeMove.san}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${st.badgeBg} ${st.textClass}`}>
                            {st.symbol} {st.label}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-xs text-[#756F63] dark:text-[#9B9386]">
                          Loss {(activeMove.cpLoss / 100).toFixed(2)}
                        </span>
                      </div>
                    );
                  })()}

                  <p className="text-xs text-[#756F63] dark:text-[#B8B0A2] leading-relaxed">
                    {activeMove.reason}
                  </p>

                  {/* Before vs After Evaluation Comparison */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-xs border-t border-[#E6DDCE] dark:border-[#2F2B24]">
                    <div>
                      <span className="block text-[11px] text-[#9B9386]">Before</span>
                      <span className="font-mono tabular-nums font-semibold text-[#292720] dark:text-[#F3EBDD]">
                        {formatEval(activeMove.evalBeforeCp, activeMove.mateBefore)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#9B9386]">After</span>
                      <span className="font-mono tabular-nums font-semibold text-[#292720] dark:text-[#F3EBDD]">
                        {formatEval(activeMove.evalAfterCp, activeMove.mateAfter)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-[#9B9386]">Engine Best</span>
                      <span className="font-mono tabular-nums font-semibold text-[#2D5E40] dark:text-[#7AC496]">
                        {activeMove.bestMoveSan || '—'}
                      </span>
                    </div>
                  </div>

                  {activeMove.pvSan.length > 0 && (
                    <div className="text-[11px] font-mono text-[#756F63] dark:text-[#9B9386] pt-1">
                      Line: {activeMove.pvSan.slice(0, 6).join(' ')}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
                  Starting position. Select any move below to inspect engine evaluation and before/after swings.
                </p>
              )}
            </div>

            {/* Interactive Annotated Move List */}
            <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg overflow-hidden">
              <div className="px-3.5 py-2 border-b border-[#E6DDCE] dark:border-[#2F2B24] bg-[#EAE2D4]/45 dark:bg-[#2B2822]/45 text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
                Move-by-Move Breakdown
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-[#E6DDCE]/70 dark:divide-[#2F2B24]">
                {movePairs.map((row) => (
                  <div
                    key={row.moveNumber}
                    className="grid grid-cols-[36px_1fr_1fr] text-xs font-mono tabular-nums"
                  >
                    <span className="px-2 py-1.5 text-[#9B9386] bg-[#EAE2D4]/30 dark:bg-[#2B2822]/30 border-r border-[#E6DDCE]/70 dark:border-[#2F2B24]">
                      {row.moveNumber}.
                    </span>
                    {row.white && (
                      <button
                        type="button"
                        onClick={() => setSelectedPly(row.white!.ply)}
                        className={`flex items-center justify-between px-2.5 py-1.5 text-left transition-colors ${
                          selectedPly === row.white.ply
                            ? 'bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] font-semibold'
                            : 'hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822] text-[#292720] dark:text-[#F3EBDD]'
                        }`}
                      >
                        <span>{row.white.san}</span>
                        <span
                          className={
                            selectedPly === row.white.ply
                              ? 'opacity-90'
                              : classificationStyle(row.white.classification).textClass
                          }
                        >
                          {classificationStyle(row.white.classification).symbol}
                        </span>
                      </button>
                    )}
                    {row.black ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPly(row.black!.ply)}
                        className={`flex items-center justify-between px-2.5 py-1.5 text-left transition-colors ${
                          selectedPly === row.black.ply
                            ? 'bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] font-semibold'
                            : 'hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822] text-[#292720] dark:text-[#F3EBDD]'
                        }`}
                      >
                        <span>{row.black.san}</span>
                        <span
                          className={
                            selectedPly === row.black.ply
                              ? 'opacity-90'
                              : classificationStyle(row.black.classification).textClass
                          }
                        >
                          {classificationStyle(row.black.classification).symbol}
                        </span>
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Classification Distribution Table */}
            <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg overflow-hidden">
              <div className="px-3.5 py-2 border-b border-[#E6DDCE] dark:border-[#2F2B24] text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
                Classification Totals
              </div>
              <div className="divide-y divide-[#E6DDCE]/60 dark:divide-[#2F2B24] text-xs">
                {keyClasses.map((cls) => {
                  const wCount = summary.counts.w[cls];
                  const bCount = summary.counts.b[cls];
                  if (wCount === 0 && bCount === 0 && !['Best', 'Inaccuracy', 'Mistake', 'Blunder', 'Brilliant'].includes(cls)) {
                    return null;
                  }
                  const st = classificationStyle(cls);
                  return (
                    <div key={cls} className="grid grid-cols-[1fr_56px_56px] items-center px-3.5 py-1.5">
                      <span className={st.textClass}>
                        {st.symbol} {st.label}
                      </span>
                      <span className="font-mono tabular-nums text-right text-[#292720] dark:text-[#F3EBDD]">
                        {wCount}
                      </span>
                      <span className="font-mono tabular-nums text-right text-[#756F63] dark:text-[#B8B0A2]">
                        {bCount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ENGINE ANALYSIS SANDBOX
// ============================================================================
export const EngineAnalysisView: React.FC = () => {
  const { profile } = useApp();
  const { isThinking, engineError, isFallbackMode, search, cancelSearch } = useChessEngine();

  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [fenInput, setFenInput] = useState<string>(() => new Chess().fen());
  const [fenError, setFenError] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [boardMode, setBoardMode] = useState<BoardMode>('2d');
  const [searchDepth, setSearchDepth] = useState<number>(3);
  const [autoAnalyze, setAutoAnalyze] = useState<boolean>(true);
  const [result, setResult] = useState<EngineSearchResult | null>(null);

  const currentFen = chess.fen();

  const triggerEngineSearch = async (targetFen: string, depthVal: number) => {
    try {
      const res = await search({
        fen: targetFen,
        personalityId: 'grandmaster',
        depth: depthVal,
        maxTimeMs: depthVal >= 4 ? 1200 : 650,
      });
      setResult(res);
    } catch {
      // cancelled or error handled by hook
    }
  };

  useEffect(() => {
    setFenInput(currentFen);
    if (autoAnalyze && !chess.isGameOver()) {
      triggerEngineSearch(currentFen, searchDepth);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFen, searchDepth, autoAnalyze]);

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    const copy = new Chess(chess.fen());
    const mv = copy.move({ from, to, promotion: promotion ?? 'q' });
    if (!mv) return false;
    setChess(copy);
    setMoves((prev) => [...prev, mv.san]);
    setLastMove({ from, to });
    if (profile.customization.soundEnabled) {
      playChessSound(copy.isCheck() ? 'check' : mv.captured ? 'capture' : 'move');
    }
    return true;
  };

  const handleApplyFen = () => {
    setFenError(null);
    try {
      const loaded = new Chess(fenInput.trim());
      setChess(loaded);
      setMoves([]);
      setLastMove(null);
    } catch {
      setFenError('Invalid FEN string. Check piece placement and turn fields.');
    }
  };

  const handleUndo = () => {
    const copy = new Chess(chess.fen());
    if (moves.length === 0) return;
    const replay = new Chess();
    const nextMoves = moves.slice(0, -1);
    for (const san of nextMoves) replay.move(san);
    setChess(replay);
    setMoves(nextMoves);
    setLastMove(null);
    void copy;
  };

  const handleReset = () => {
    cancelSearch();
    const fresh = new Chess();
    setChess(fresh);
    setMoves([]);
    setLastMove(null);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 items-start">
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
              <Cpu className="w-4 h-4" />
              <span>Engine Analysis Board</span>
              {isFallbackMode && <span className="text-[#9B9386] font-normal">(Fallback)</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBoardMode((m) => (m === '2d' ? '3d' : '2d'))}
                className="px-2.5 py-1 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                {boardMode.toUpperCase()}
              </button>
              <button
                type="button"
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                aria-label="Flip board"
                className="p-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <FlipVertical className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleUndo}
                disabled={moves.length === 0}
                className="px-2.5 py-1 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs disabled:opacity-40 hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
                aria-label="Reset board"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <EvalBar
              evalCp={result?.evalCp ?? 0}
              mateIn={result?.mateIn ?? null}
              orientation={orientation}
            />
            <div className="flex-1 min-w-0">
              <Chessboard
                mode={boardMode}
                fen={currentFen}
                orientation={orientation}
                boardTheme={profile.customization.boardTheme}
                pieceSet={profile.customization.pieceSet}
                showCoordinates={profile.customization.showCoordinates}
                highlightLegalMoves={profile.customization.highlightLegalMoves}
                interactive={!chess.isGameOver()}
                lastMove={lastMove}
                onMove={handleMove}
                maxSizePx={480}
              />
            </div>
          </div>
        </div>

        {/* Engine Controls & Candidate Lines */}
        <div className="space-y-4">
          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-[#292720] dark:text-[#F3EBDD]">
                  Local Alpha-Beta Worker
                </h2>
                <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
                  {isThinking
                    ? 'Calculating candidate lines...'
                    : result
                      ? `Depth ${result.depth} · ${result.nodes.toLocaleString()} nodes`
                      : 'Ready for position'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isThinking ? (
                  <button
                    type="button"
                    onClick={cancelSearch}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#8B2323] text-[#FAF5EC] text-xs font-semibold"
                  >
                    <StopIcon className="w-3 h-3" />
                    <span>Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => triggerEngineSearch(currentFen, searchDepth)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold"
                  >
                    <Play className="w-3 h-3" />
                    <span>Evaluate</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#E6DDCE] dark:border-[#2F2B24]">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#756F63] dark:text-[#9B9386]">Depth:</span>
                {[2, 3, 4].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSearchDepth(d)}
                    className={`px-2 py-1 rounded text-xs font-mono tabular-nums border ${
                      searchDepth === d
                        ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                        : 'border-[#D8CDBB] dark:border-[#3B362E] text-[#292720] dark:text-[#F3EBDD]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-[#292720] dark:text-[#F3EBDD] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAnalyze}
                  onChange={(e) => setAutoAnalyze(e.target.checked)}
                  className="accent-[#292720]"
                />
                <span>Auto-evaluate moves</span>
              </label>
            </div>

            {engineError && (
              <p className="text-xs text-[#8B2323] dark:text-[#E36D6D]">{engineError}</p>
            )}

            {/* Top Candidate Moves */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#9B9386]">
                Top Candidate Moves
              </p>
              {result && result.topMoves.length > 0 ? (
                <div className="divide-y divide-[#E6DDCE]/70 dark:divide-[#2F2B24] border border-[#E6DDCE] dark:border-[#2F2B24] rounded-md">
                  {result.topMoves.slice(0, 3).map((cand, idx) => (
                    <button
                      key={cand.uci}
                      type="button"
                      onClick={() => {
                        const from = cand.uci.slice(0, 2) as Square;
                        const to = cand.uci.slice(2, 4) as Square;
                        const promo = cand.uci.slice(4) as 'q' | 'r' | 'b' | 'n' | undefined;
                        handleMove(from, to, promo || undefined);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#EAE2D4]/70 dark:hover:bg-[#2B2822] text-left"
                    >
                      <span className="font-mono font-semibold text-[#292720] dark:text-[#F3EBDD]">
                        {idx + 1}. {cand.san}
                      </span>
                      <span className="font-mono tabular-nums text-[#756F63] dark:text-[#B8B0A2]">
                        {formatEval(cand.evalCp)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9B9386]">No legal continuations available.</p>
              )}

              {result && result.pvSan.length > 0 && (
                <div className="pt-1 text-xs font-mono text-[#756F63] dark:text-[#B8B0A2]">
                  PV: {result.pvSan.join(' ')}
                </div>
              )}
            </div>
          </div>

          {/* FEN Loader */}
          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-2">
            <label className="block text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
              Position FEN
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fenInput}
                onChange={(e) => setFenInput(e.target.value)}
                className="flex-1 min-w-0 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] px-2.5 py-1.5 text-xs font-mono text-[#292720] dark:text-[#F3EBDD]"
              />
              <button
                type="button"
                onClick={handleApplyFen}
                className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] text-xs font-semibold text-[#292720] dark:text-[#F3EBDD] hover:bg-[#EAE2D4]"
              >
                Load
              </button>
            </div>
            {fenError && (
              <p className="text-xs text-[#8B2323] dark:text-[#E36D6D] flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>{fenError}</span>
              </p>
            )}
          </div>

          <MoveList moves={moves} maxHeightClass="max-h-48" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PGN EXPLORER
// ============================================================================
export const PgnExplorerView: React.FC = () => {
  const { profile, openGameReview } = useApp();
  const [pgnText, setPgnText] = useState(SAMPLE_ANALYSIS_GAMES[0].pgn);
  const [ply, setPly] = useState(0);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [copiedType, setCopiedType] = useState<'fen' | 'pgn' | null>(null);

  const parsed = useMemo(() => {
    try {
      const loader = new Chess();
      loader.loadPgn(pgnText);
      const headers = loader.getHeaders();
      const history = loader.history({ verbose: true });
      const fens: string[] = [];
      const replay = new Chess();
      fens.push(replay.fen());
      for (const m of history) {
        replay.move(m);
        fens.push(replay.fen());
      }
      return {
        error: null as string | null,
        headers,
        moves: history.map((m) => m.san),
        history,
        fens,
      };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Unable to parse PGN.',
        headers: {} as Record<string, string>,
        moves: [] as string[],
        history: [],
        fens: [new Chess().fen()],
      };
    }
  }, [pgnText]);

  const safePly = Math.min(ply, Math.max(0, parsed.fens.length - 1));
  const currentFen = parsed.fens[safePly] ?? new Chess().fen();
  const lastMove =
    safePly > 0 && parsed.history[safePly - 1]
      ? {
          from: parsed.history[safePly - 1].from as Square,
          to: parsed.history[safePly - 1].to as Square,
        }
      : null;

  const copyText = (text: string, kind: 'fen' | 'pgn') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedType(kind);
    setTimeout(() => setCopiedType(null), 1800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5 items-start">
      <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#292720] dark:text-[#F3EBDD]">
            <FileCode2 className="w-4 h-4" />
            <span>PGN Board Preview</span>
          </div>
          <button
            type="button"
            onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
            aria-label="Flip board"
            className="p-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
          >
            <FlipVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        <Chessboard
          mode="2d"
          fen={currentFen}
          orientation={orientation}
          boardTheme={profile.customization.boardTheme}
          pieceSet={profile.customization.pieceSet}
          showCoordinates={profile.customization.showCoordinates}
          interactive={false}
          lastMove={lastMove}
          maxSizePx={480}
        />

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPly(0)}
            disabled={safePly === 0}
            className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setPly((p) => Math.max(0, p - 1))}
            disabled={safePly === 0}
            className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono tabular-nums text-xs px-2 text-[#756F63] dark:text-[#B8B0A2]">
            {safePly} / {parsed.moves.length}
          </span>
          <button
            type="button"
            onClick={() => setPly((p) => Math.min(parsed.moves.length, p + 1))}
            disabled={safePly >= parsed.moves.length}
            className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setPly(parsed.moves.length)}
            disabled={safePly >= parsed.moves.length}
            className="p-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[#292720] dark:text-[#F3EBDD]">
              PGN Source & Tags
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyText(currentFen, 'fen')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                {copiedType === 'fen' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'fen' ? 'Copied FEN' : 'Copy FEN'}</span>
              </button>
              <button
                type="button"
                onClick={() => copyText(pgnText, 'pgn')}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                {copiedType === 'pgn' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedType === 'pgn' ? 'Copied PGN' : 'Copy PGN'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={pgnText}
            onChange={(e) => {
              setPgnText(e.target.value);
              setPly(0);
            }}
            rows={7}
            className="w-full rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] p-3 text-xs font-mono text-[#292720] dark:text-[#F3EBDD]"
          />

          {parsed.error ? (
            <p className="text-xs text-[#8B2323] dark:text-[#E36D6D]">{parsed.error}</p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
                <span className="font-semibold text-[#292720] dark:text-[#F3EBDD]">
                  {parsed.headers.White ?? 'White'} vs {parsed.headers.Black ?? 'Black'}
                </span>
                {parsed.headers.Result && <span> · {parsed.headers.Result}</span>}
              </div>
              <button
                type="button"
                onClick={() => openGameReview(pgnText)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Inspect in Chess Detective</span>
              </button>
            </div>
          )}
        </div>

        <MoveList
          moves={parsed.moves}
          activePly={safePly}
          onSelectPly={(p) => setPly(p)}
          maxHeightClass="max-h-60"
        />
      </div>
    </div>
  );
};
