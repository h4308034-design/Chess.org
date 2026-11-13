import React, { useEffect, useMemo, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OPENINGS } from '../data/openings';
import { GUESS_ELO_CASES } from '../data/guessEloGames';
import { OpeningData } from '../types/chess';
import { useChessEngine } from '../hooks/useChessEngine';
import { Chessboard2D } from '../components/chess/Chessboard2D';
import { MoveList } from '../components/chess/MoveList';
import { playChessSound } from '../utils/sound';

// 1. OPENING LAB
export const OpeningLabView: React.FC = () => {
  const { profile, recordOpeningExplored, toggleFavoriteOpening } = useApp();
  const [selectedOpening, setSelectedOpening] = useState<OpeningData>(OPENINGS[0]);
  const [activeMoves, setActiveMoves] = useState<string[]>(
    OPENINGS[0].mainLine.map((m) => m.san),
  );
  const [ply, setPly] = useState(0);
  const [activeVariationName, setActiveVariationName] = useState('Main Line');

  useEffect(() => {
    recordOpeningExplored(selectedOpening.id);
  }, [selectedOpening.id, recordOpeningExplored]);

  const fen = useMemo(() => {
    const c = new Chess(selectedOpening.startingFen);
    for (let i = 0; i < ply; i++) {
      if (!activeMoves[i]) break;
      c.move(activeMoves[i]);
    }
    return c.fen();
  }, [selectedOpening.startingFen, activeMoves, ply]);

  const selectOpening = (op: OpeningData) => {
    setSelectedOpening(op);
    setActiveMoves(op.mainLine.map((m) => m.san));
    setActiveVariationName('Main Line');
    setPly(0);
  };

  const currentNode =
    activeVariationName === 'Main Line' && ply > 0 ? selectedOpening.mainLine[ply - 1] : null;
  const isFavorited = profile.favoriteOpenings.includes(selectedOpening.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Opening Lab</h1>
        <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
          Study classical opening lines with ECO classification, move-by-move annotations, and candidate evaluation scores.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 space-y-2">
          {OPENINGS.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => selectOpening(op)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedOpening.id === op.id
                  ? 'border-[#292720] bg-[#FFFFFF] dark:border-[#F3EBDD] dark:bg-[#23201B]'
                  : 'border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF]/60 dark:bg-[#23201B]/60'
              }`}
            >
              <div className="text-[11px] font-mono text-[#756F63]">{op.eco}</div>
              <div className="text-sm font-semibold">{op.name}</div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-5 space-y-3">
          <Chessboard2D
            fen={fen}
            boardTheme={profile.customization.boardTheme}
            pieceSet={profile.customization.pieceSet}
            showCoordinates={profile.customization.showCoordinates}
            interactive={false}
          />

          <div className="flex items-center justify-between p-2.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B]">
            <button
              type="button"
              onClick={() => setPly((p) => Math.max(0, p - 1))}
              disabled={ply === 0}
              className="px-3 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs inline-flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="text-xs font-mono tabular-nums">
              {activeVariationName} · Ply {ply}/{activeMoves.length}
            </span>
            <button
              type="button"
              onClick={() => setPly((p) => Math.min(activeMoves.length, p + 1))}
              disabled={ply >= activeMoves.length}
              className="px-3 py-1.5 rounded bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-medium inline-flex items-center gap-1 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-mono text-[#756F63]">
                ECO {selectedOpening.eco} · {selectedOpening.family}
              </div>
              <h2 className="font-display text-lg font-bold">{selectedOpening.name}</h2>
            </div>
            <button
              type="button"
              aria-label={isFavorited ? 'Remove favorite opening' : 'Save favorite opening'}
              onClick={() => toggleFavoriteOpening(selectedOpening.id)}
              className={`p-2 rounded-md border ${
                isFavorited
                  ? 'bg-[#292720] text-[#F3EBDD] border-[#292720]'
                  : 'border-[#D8CDBB] dark:border-[#3B362E]'
              }`}
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#595347] dark:text-[#B8B0A2]">
            {selectedOpening.description}
          </p>

          {currentNode && (
            <div className="p-3 rounded-md bg-[#F3EBDD] dark:bg-[#2B2822] space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-mono font-semibold">
                <span>Move: {currentNode.san}</span>
                <span>Eval: {currentNode.evalCp >= 0 ? '+' : ''}{(currentNode.evalCp / 100).toFixed(2)}</span>
              </div>
              <p>{currentNode.annotation}</p>
              {currentNode.candidates && (
                <div className="pt-1.5 border-t border-[#D8CDBB] dark:border-[#3B362E] space-y-1">
                  <div className="font-semibold">Candidate Moves:</div>
                  {currentNode.candidates.map((cand) => (
                    <div key={cand.san} className="flex items-center justify-between">
                      <span className="font-mono font-medium">
                        {cand.san} — {cand.note}
                      </span>
                      <span className="font-mono tabular-nums text-[#756F63]">
                        +{(cand.evalCp / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="text-xs font-semibold">Lines & Variations</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveMoves(selectedOpening.mainLine.map((m) => m.san));
                  setActiveVariationName('Main Line');
                  setPly(1);
                }}
                className={`px-2.5 py-1 rounded border text-xs ${
                  activeVariationName === 'Main Line'
                    ? 'bg-[#292720] text-[#F3EBDD] border-[#292720]'
                    : 'border-[#D8CDBB] dark:border-[#3B362E]'
                }`}
              >
                Main Line
              </button>
              {selectedOpening.variations.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => {
                    setActiveMoves(v.moves);
                    setActiveVariationName(v.name);
                    setPly(v.moves.length);
                  }}
                  className={`px-2.5 py-1 rounded border text-xs ${
                    activeVariationName === v.name
                      ? 'bg-[#292720] text-[#F3EBDD] border-[#292720]'
                      : 'border-[#D8CDBB] dark:border-[#3B362E]'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
          </div>

          <MoveList moves={activeMoves} activePly={ply} onSelectPly={setPly} maxHeightClass="max-h-40" />
        </div>
      </div>
    </div>
  );
};

// 2. BLINDFOLD CHESS
export const BlindfoldChessView: React.FC = () => {
  const { profile, recordMatch } = useApp();
  const { isThinking, search, cancelSearch } = useChessEngine();

  const [fen, setFen] = useState(new Chess().fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [peekEnabled, setPeekEnabled] = useState(false);
  const [peeksUsed, setPeeksUsed] = useState(0);
  const [sanInput, setSanInput] = useState('');
  const [sanError, setSanError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const chess = useMemo(() => new Chess(fen), [fen]);

  useEffect(() => {
    if (resultMsg || chess.turn() !== 'b' || chess.isGameOver()) return;
    let cancelled = false;
    search({ fen, personalityId: 'beginner', depth: 1, maxTimeMs: 300 })
      .then((res) => {
        if (cancelled || !res.bestMoveUci) return;
        const c = new Chess(fen);
        const mv = c.move({
          from: res.bestMoveUci.slice(0, 2) as Square,
          to: res.bestMoveUci.slice(2, 4) as Square,
          promotion: (res.bestMoveUci.slice(4) as PieceSymbol) || undefined,
        });
        if (!mv) return;
        setFen(c.fen());
        setMoves((prev) => [...prev, mv.san]);
        playChessSound('move', profile.customization.soundEnabled);
        if (c.isCheckmate()) {
          setResultMsg('Checkmate — AI wins');
        } else if (c.isDraw()) {
          setResultMsg('Draw');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fen, chess, resultMsg, search, profile.customization.soundEnabled]);

  const submitPlayerMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    if (resultMsg || chess.turn() !== 'w') return false;
    const c = new Chess(fen);
    const mv = c.move({ from, to, promotion: promotion ?? 'q' });
    if (!mv) return false;
    setFen(c.fen());
    setMoves((prev) => [...prev, mv.san]);
    setSanError(null);
    playChessSound('move', profile.customization.soundEnabled);
    if (c.isCheckmate()) {
      setResultMsg('Checkmate — You won in Blindfold mode!');
      recordMatch({
        id: `blindfold-${Date.now()}`,
        timestamp: Date.now(),
        mode: 'blindfold',
        opponentName: 'Beginner Bot (Blindfold)',
        opponentType: 'ai',
        playerColor: 'w',
        result: 'win',
        termination: 'Checkmate',
        timeControlLabel: 'Blindfold',
        pgn: [...moves, mv.san].join(' '),
        finalFen: c.fen(),
        moveCount: moves.length + 1,
        xpEarned: 75,
        ratingDelta: 0,
      });
    }
    return true;
  };

  const handleSanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resultMsg || chess.turn() !== 'w') return;
    const c = new Chess(fen);
    try {
      const mv = c.move(sanInput.trim());
      if (!mv) {
        setSanError('Illegal or unrecognized SAN move (e.g. e4, Nf3, O-O).');
        return;
      }
      setFen(c.fen());
      setMoves((prev) => [...prev, mv.san]);
      setSanInput('');
      setSanError(null);
      playChessSound('move', profile.customization.soundEnabled);
    } catch {
      setSanError('Invalid SAN notation.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Blindfold Chess</h1>
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
            Visualize the position from move notation alone. Enter SAN moves or click squares on the hidden board.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!peekEnabled) setPeeksUsed((p) => p + 1);
              setPeekEnabled((v) => !v);
            }}
            className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] text-xs font-medium inline-flex items-center gap-1.5"
          >
            {peekEnabled ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{peekEnabled ? 'Hide Pieces' : `Peek (${peeksUsed})`}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              cancelSearch();
              setFen(new Chess().fen());
              setMoves([]);
              setPeeksUsed(0);
              setResultMsg(null);
            }}
            className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <Chessboard2D
            fen={fen}
            boardTheme={profile.customization.boardTheme}
            pieceSet={profile.customization.pieceSet}
            showCoordinates={true}
            blindfold={!peekEnabled}
            interactive={!resultMsg}
            playerColor="w"
            onMove={submitPlayerMove}
          />
        </div>

        <div className="lg:col-span-5 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
          <div className="text-xs font-semibold">
            {resultMsg ?? (isThinking ? 'Opponent is thinking...' : 'White to move (Blindfold)')}
          </div>

          <form onSubmit={handleSanSubmit} className="space-y-2">
            <label htmlFor="blindfold-san" className="block text-xs text-[#756F63]">
              Enter move in algebraic notation (e.g. e4, Nf3, Bc4)
            </label>
            <div className="flex gap-2">
              <input
                id="blindfold-san"
                value={sanInput}
                onChange={(e) => setSanInput(e.target.value)}
                placeholder="e4"
                className="flex-1 px-3 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] font-mono text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold"
              >
                Play
              </button>
            </div>
            {sanError && <p className="text-xs text-[#9B2226]">{sanError}</p>}
          </form>

          <MoveList moves={moves} />
        </div>
      </div>
    </div>
  );
};

// 3. GUESS THE ELO
export const GuessTheEloView: React.FC = () => {
  const { profile } = useApp();
  const [caseIdx, setCaseIdx] = useState(0);
  const [ply, setPly] = useState(6);
  const [guessElo, setGuessElo] = useState(1200);
  const [submitted, setSubmitted] = useState(false);

  const currentCase = GUESS_ELO_CASES[caseIdx];

  const { moves, fen } = useMemo(() => {
    const c = new Chess();
    c.loadPgn(currentCase.pgn);
    const hist = c.history();
    const replay = new Chess();
    const clampedPly = Math.min(ply, hist.length);
    for (let i = 0; i < clampedPly; i++) replay.move(hist[i]);
    return { moves: hist, fen: replay.fen() };
  }, [currentCase, ply]);

  const diff = Math.abs(guessElo - currentCase.actualElo);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Guess the Elo</h1>
        <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
          Inspect move quality, opening discipline, and tactical awareness to estimate the players' rating tier.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-3">
          <Chessboard2D
            fen={fen}
            boardTheme={profile.customization.boardTheme}
            pieceSet={profile.customization.pieceSet}
            interactive={false}
          />
          <div className="flex items-center justify-between p-2.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B]">
            <button
              type="button"
              onClick={() => setPly((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs"
            >
              Prev Move
            </button>
            <span className="text-xs font-mono tabular-nums">
              Ply {Math.min(ply, moves.length)} / {moves.length}
            </span>
            <button
              type="button"
              onClick={() => setPly((p) => Math.min(moves.length, p + 1))}
              className="px-3 py-1.5 rounded bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-medium"
            >
              Next Move
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
          <div>
            <div className="text-xs text-[#756F63]">
              Case {caseIdx + 1} of {GUESS_ELO_CASES.length} · {currentCase.timeControl}
            </div>
            <h2 className="font-display text-lg font-bold">{currentCase.title}</h2>
            <div className="text-xs text-[#756F63]">{currentCase.opening}</div>
          </div>

          <MoveList moves={moves} activePly={ply} onSelectPly={setPly} maxHeightClass="max-h-44" />

          <div className="space-y-2 pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24]">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="elo-slider" className="font-semibold inline-flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Your Rating Estimate</span>
              </label>
              <span className="font-mono tabular-nums text-base font-bold">{guessElo}</span>
            </div>
            <input
              id="elo-slider"
              type="range"
              min={400}
              max={2200}
              step={20}
              value={guessElo}
              disabled={submitted}
              onChange={(e) => setGuessElo(Number(e.target.value))}
              className="w-full accent-[#292720]"
            />

            {!submitted ? (
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="w-full py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold"
              >
                Submit Rating Guess
              </button>
            ) : (
              <div className="p-3.5 rounded-md bg-[#F3EBDD] dark:bg-[#2B2822] space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono font-bold">
                  <span>Actual Tier: {currentCase.actualElo}</span>
                  <span>
                    Off by {diff} ({diff <= 150 ? 'Accurate!' : diff <= 300 ? 'Close' : 'Off target'})
                  </span>
                </div>
                <p className="text-[#595347] dark:text-[#B8B0A2]">{currentCase.breakdown}</p>
                <button
                  type="button"
                  onClick={() => {
                    setCaseIdx((i) => (i + 1) % GUESS_ELO_CASES.length);
                    setPly(6);
                    setSubmitted(false);
                  }}
                  className="w-full py-2 rounded-md bg-[#292720] text-[#F3EBDD] text-xs font-semibold"
                >
                  Next Game Case
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
