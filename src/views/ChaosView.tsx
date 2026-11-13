import React, { useEffect, useMemo, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import { Flame, RefreshCw, Shuffle, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  CHAOS_MODIFIERS,
  ChaosGameState,
  applyChaosSpecialMove,
  generateDeterministicChaosEvent,
  getChaosMovesForSquare,
} from '../engine/chaosEngine';
import { useChessEngine } from '../hooks/useChessEngine';
import { Chessboard2D } from '../components/chess/Chessboard2D';
import { MoveList } from '../components/chess/MoveList';
import { playChessSound } from '../utils/sound';

type ChaosModeType = 'quick' | 'random' | 'custom';
type ChaosOpponentType = 'ai' | 'friend';

export const ChaosView: React.FC = () => {
  const { profile, recordMatch } = useApp();
  const { isThinking, search, cancelSearch } = useChessEngine();

  const [preset, setPreset] = useState<ChaosModeType>('quick');
  const [opponent, setOpponent] = useState<ChaosOpponentType>('ai');
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([
    'pawn-sidestep',
    'king-knight-leap',
    'chaos-events',
  ]);
  const [rulesConfirmed, setRulesConfirmed] = useState(false);

  const [chaosState, setChaosState] = useState<ChaosGameState>({
    fen: new Chess().fen(),
    activeModifiers: ['pawn-sidestep', 'king-knight-leap', 'chaos-events'],
    seed: 202611,
    turnCount: 0,
    whiteKingLeapUsed: false,
    blackKingLeapUsed: false,
    currentEvent: null,
    eventLog: [],
  });
  const [moves, setMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [resultText, setResultText] = useState<string | null>(null);

  const chess = useMemo(() => new Chess(chaosState.fen), [chaosState.fen]);

  const applyPreset = (type: ChaosModeType) => {
    setPreset(type);
    if (type === 'quick') {
      setSelectedModifiers(['pawn-sidestep', 'king-knight-leap', 'chaos-events']);
    } else if (type === 'random') {
      const shuffled = [...CHAOS_MODIFIERS].sort(() => Math.random() - 0.5);
      setSelectedModifiers(shuffled.slice(0, 3).map((m) => m.id));
    }
  };

  const toggleModifier = (id: string) => {
    setPreset('custom');
    setSelectedModifiers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const startChaosGame = () => {
    cancelSearch();
    const seed = Math.floor(Math.random() * 900000) + 100000;
    const mods = selectedModifiers.length > 0 ? selectedModifiers : ['chaos-events'];
    setChaosState({
      fen: new Chess().fen(),
      activeModifiers: mods,
      seed,
      turnCount: 0,
      whiteKingLeapUsed: false,
      blackKingLeapUsed: false,
      currentEvent: null,
      eventLog: [],
    });
    setMoves([]);
    setLastMove(null);
    setResultText(null);
    setRulesConfirmed(true);
  };

  // AI response in Chaos vs AI
  useEffect(() => {
    if (!rulesConfirmed || opponent !== 'ai' || resultText) return;
    const c = new Chess(chaosState.fen);
    if (c.turn() !== 'b' || c.isGameOver()) return;

    let cancelled = false;
    search({ fen: chaosState.fen, personalityId: 'aggressive', depth: 2, maxTimeMs: 400 })
      .then((res) => {
        if (cancelled || !res.bestMoveUci) return;
        const cNext = new Chess(chaosState.fen);
        const mv = cNext.move({
          from: res.bestMoveUci.slice(0, 2) as Square,
          to: res.bestMoveUci.slice(2, 4) as Square,
          promotion: (res.bestMoveUci.slice(4) as PieceSymbol) || undefined,
        });
        if (!mv) return;

        const nextTurnCount = chaosState.turnCount + 1;
        const fullMove = Math.ceil(nextTurnCount / 2);
        const evt = chaosState.activeModifiers.includes('chaos-events')
          ? generateDeterministicChaosEvent(fullMove, chaosState.seed)
          : null;

        setChaosState((prev) => ({
          ...prev,
          fen: cNext.fen(),
          turnCount: nextTurnCount,
          currentEvent: evt,
          eventLog: evt ? [...prev.eventLog, evt] : prev.eventLog,
        }));
        setMoves((prev) => [...prev, mv.san]);
        setLastMove({ from: mv.from, to: mv.to });
        playChessSound(mv.captured ? 'capture' : 'move', profile.customization.soundEnabled);

        if (cNext.isCheckmate()) {
          setResultText('Checkmate — Chaos AI wins!');
          recordMatch({
            id: `chaos-${Date.now()}`,
            timestamp: Date.now(),
            mode: 'chaos',
            opponentName: 'Chaos Bot',
            opponentType: 'ai',
            playerColor: 'w',
            result: 'loss',
            termination: 'Checkmate (Chaos)',
            timeControlLabel: 'Chaos',
            pgn: [...moves, mv.san].join(' '),
            finalFen: cNext.fen(),
            moveCount: moves.length + 1,
            xpEarned: 20,
            ratingDelta: 0,
          });
        } else if (cNext.isDraw()) {
          setResultText('Draw in Chess Chaos');
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [
    rulesConfirmed,
    opponent,
    resultText,
    chaosState,
    search,
    profile.customization.soundEnabled,
    moves,
    recordMatch,
  ]);

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    if (!rulesConfirmed || resultText) return false;
    if (opponent === 'ai' && chess.turn() !== 'w') return false;

    const options = getChaosMovesForSquare(chaosState, from);
    const special = options.find((o) => o.to === to && o.isChaosSpecial);

    if (special) {
      const updated = applyChaosSpecialMove(chaosState, special);
      setChaosState(updated);
      setMoves((prev) => [...prev, special.san]);
      setLastMove({ from, to });
      playChessSound('castle', profile.customization.soundEnabled);
      return true;
    }

    const cNext = new Chess(chaosState.fen);
    const mv = cNext.move({ from, to, promotion: promotion ?? 'q' });
    if (!mv) return false;

    const nextTurnCount = chaosState.turnCount + 1;
    const fullMove = Math.ceil(nextTurnCount / 2);
    const evt =
      chaosState.activeModifiers.includes('chaos-events') && cNext.turn() === 'w'
        ? generateDeterministicChaosEvent(fullMove, chaosState.seed)
        : null;

    setChaosState((prev) => ({
      ...prev,
      fen: cNext.fen(),
      turnCount: nextTurnCount,
      currentEvent: evt ?? prev.currentEvent,
      eventLog: evt ? [...prev.eventLog, evt] : prev.eventLog,
    }));
    setMoves((prev) => [...prev, mv.san]);
    setLastMove({ from: mv.from, to: mv.to });
    playChessSound(mv.captured ? 'capture' : 'move', profile.customization.soundEnabled);

    if (cNext.isCheckmate()) {
      const winText = `Checkmate — ${mv.color === 'w' ? 'White' : 'Black'} wins!`;
      setResultText(winText);
      recordMatch({
        id: `chaos-${Date.now()}`,
        timestamp: Date.now(),
        mode: 'chaos',
        opponentName: opponent === 'ai' ? 'Chaos Bot' : 'Local Friend',
        opponentType: opponent === 'ai' ? 'ai' : 'human-local',
        playerColor: 'w',
        result: mv.color === 'w' ? 'win' : 'loss',
        termination: 'Checkmate (Chaos)',
        timeControlLabel: 'Chaos',
        pgn: [...moves, mv.san].join(' '),
        finalFen: cNext.fen(),
        moveCount: moves.length + 1,
        xpEarned: mv.color === 'w' ? 55 : 20,
        ratingDelta: 0,
      });
    } else if (cNext.isDraw()) {
      setResultText('Draw in Chess Chaos');
    }

    return true;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Chess Chaos</h1>
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
            Experimental rule modifiers and deterministic board events — isolated from standard chess.
          </p>
        </div>
        {rulesConfirmed && (
          <button
            type="button"
            onClick={() => {
              cancelSearch();
              setRulesConfirmed(false);
            }}
            className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium"
          >
            Configure Rules
          </button>
        )}
      </div>

      {!rulesConfirmed ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-5">
            <div>
              <h2 className="font-display text-sm font-semibold mb-2">Chaos Configuration</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('quick')}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                    preset === 'quick'
                      ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                      : 'border-[#D8CDBB] dark:border-[#3B362E]'
                  }`}
                >
                  Quick Chaos
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('random')}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium inline-flex items-center gap-1.5 ${
                    preset === 'random'
                      ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                      : 'border-[#D8CDBB] dark:border-[#3B362E]'
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Random Rules</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreset('custom')}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                    preset === 'custom'
                      ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                      : 'border-[#D8CDBB] dark:border-[#3B362E]'
                  }`}
                >
                  Custom Chaos
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Opponent:</span>
              <button
                type="button"
                onClick={() => setOpponent('ai')}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                  opponent === 'ai'
                    ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                    : 'border-[#D8CDBB] dark:border-[#3B362E]'
                }`}
              >
                Chaos vs AI
              </button>
              <button
                type="button"
                onClick={() => setOpponent('friend')}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium ${
                  opponent === 'friend'
                    ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                    : 'border-[#D8CDBB] dark:border-[#3B362E]'
                }`}
              >
                Friend vs Friend
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-display text-sm font-semibold">Active Rule Modifiers</h3>
              <div className="space-y-2">
                {CHAOS_MODIFIERS.map((mod) => {
                  const checked = selectedModifiers.includes(mod.id);
                  return (
                    <label
                      key={mod.id}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        checked
                          ? 'border-[#292720] bg-[#EAE2D4]/70 dark:border-[#D8CDBB] dark:bg-[#2B2822]'
                          : 'border-[#E6DDCE] dark:border-[#353028]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModifier(mod.id)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-semibold">{mod.name}</div>
                        <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
                          {mod.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={startChaosGame}
              className="w-full py-2.5 px-4 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4" />
              <span>Start Chess Chaos Match</span>
            </button>
          </div>

          <div className="lg:col-span-5 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3">
            <h2 className="font-display text-base font-semibold">Pre-Game Rules Overview</h2>
            <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
              Special Chaos moves appear highlighted in amber on the board when you select an eligible piece. Every board event is deterministic, clearly announced, and logged in the match event feed.
            </p>
            <ul className="space-y-1.5 text-xs list-disc pl-4">
              {selectedModifiers.map((id) => {
                const mod = CHAOS_MODIFIERS.find((m) => m.id === id);
                return mod ? (
                  <li key={id}>
                    <strong>{mod.name}:</strong> {mod.description}
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <Chessboard2D
              fen={chaosState.fen}
              boardTheme={profile.customization.boardTheme}
              pieceSet={profile.customization.pieceSet}
              showCoordinates={profile.customization.showCoordinates}
              highlightLegalMoves={profile.customization.highlightLegalMoves}
              interactive={!resultText}
              playerColor={opponent === 'ai' ? 'w' : 'both'}
              lastMove={lastMove}
              customLegalMovesForSquare={(sq) =>
                getChaosMovesForSquare(chaosState, sq).map((m) => ({
                  to: m.to,
                  isCapture: Boolean(chess.get(m.to)),
                  isSpecial: m.isChaosSpecial,
                }))
              }
              onMove={handleMove}
            />
          </div>

          <div className="lg:col-span-5 space-y-4">
            {chaosState.currentEvent && (
              <div className="p-3.5 rounded-md border border-[#B4690E]/50 bg-[#B4690E]/10 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B4690E] dark:text-[#E09F3E]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Active Board Event · Turn {chaosState.currentEvent.turnNumber}</span>
                </div>
                <div className="text-sm font-semibold">{chaosState.currentEvent.name}</div>
                <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
                  {chaosState.currentEvent.description}
                </p>
              </div>
            )}

            <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">
                  {resultText ?? `${chess.turn() === 'w' ? 'White' : 'Black'} to move`}
                </span>
                <span className="font-mono text-[#756F63]">Seed #{chaosState.seed}</span>
              </div>

              {isThinking && (
                <div className="text-xs text-[#756F63]">Chaos AI is choosing a move...</div>
              )}

              {resultText && (
                <button
                  type="button"
                  onClick={startChaosGame}
                  className="w-full py-2 rounded-md bg-[#292720] text-[#F3EBDD] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Play Chaos Again</span>
                </button>
              )}

              <MoveList moves={moves} maxHeightClass="max-h-52" />

              {chaosState.eventLog.length > 0 && (
                <div className="pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24] space-y-1.5">
                  <div className="text-xs font-semibold">Event Log</div>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-[#756F63] dark:text-[#B8B0A2]">
                    {chaosState.eventLog.map((ev) => (
                      <div key={ev.id}>
                        <span className="font-mono">T{ev.turnNumber}:</span>{' '}
                        <strong className="text-[#292720] dark:text-[#F3EBDD]">{ev.name}</strong> —{' '}
                        {ev.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
