import React, { useEffect, useMemo, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import { ArrowDown, ArrowUp, CheckCircle2, Crown, Lock, Play, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROYALE_STAGES } from '../engine/progression';
import { RoyaleStage } from '../types/chess';
import { useChessEngine } from '../hooks/useChessEngine';
import { Chessboard2D } from '../components/chess/Chessboard2D';
import { ChessClock } from '../components/chess/ChessClock';
import { MoveList } from '../components/chess/MoveList';
import { playChessSound } from '../utils/sound';

export const RoyaleView: React.FC = () => {
  const { profile, recordRoyaleStageWin, recordMatch } = useApp();
  const { isThinking, search, cancelSearch } = useChessEngine();

  const [stages, setStages] = useState<RoyaleStage[]>(ROYALE_STAGES);
  const [activeStage, setActiveStage] = useState<RoyaleStage | null>(null);
  const [fen, setFen] = useState(new Chess().fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [whiteTimeMs, setWhiteTimeMs] = useState(600000);
  const [blackTimeMs, setBlackTimeMs] = useState(600000);
  const [stageResult, setStageResult] = useState<'win' | 'loss' | 'draw' | null>(null);
  const [termination, setTermination] = useState<string | null>(null);

  const chess = useMemo(() => new Chess(fen), [fen]);

  const moveStageOrder = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= stages.length) return;
    const copy = [...stages];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    setStages(copy);
  };

  const startStage = (stage: RoyaleStage) => {
    cancelSearch();
    setActiveStage(stage);
    setFen(new Chess().fen());
    setMoves([]);
    setLastMove(null);
    setWhiteTimeMs(stage.timeControl.initialSeconds * 1000);
    setBlackTimeMs(stage.timeControl.initialSeconds * 1000);
    setStageResult(null);
    setTermination(null);
  };

  const completeStage = (res: 'win' | 'loss' | 'draw', reason: string, finalChess: Chess) => {
    cancelSearch();
    setStageResult(res);
    setTermination(reason);
    playChessSound('game-end', profile.customization.soundEnabled);

    if (!activeStage) return;
    if (res === 'win') {
      recordRoyaleStageWin(activeStage.stage);
    }
    recordMatch({
      id: `royale-${activeStage.stage}-${Date.now()}`,
      timestamp: Date.now(),
      mode: 'royale',
      opponentName: activeStage.botName,
      opponentType: 'ai',
      personalityId: activeStage.personalityId,
      playerColor: 'w',
      result: res,
      termination: reason,
      timeControlLabel: activeStage.timeControl.label,
      pgn: finalChess.history().join(' '),
      finalFen: finalChess.fen(),
      moveCount: finalChess.history().length,
      xpEarned: res === 'win' ? activeStage.xpReward : 20,
      ratingDelta: 0,
    });
  };

  // Clock tick
  useEffect(() => {
    if (!activeStage || stageResult || moves.length === 0) return;
    const t = setInterval(() => {
      const turn = new Chess(fen).turn();
      if (turn === 'w') {
        setWhiteTimeMs((ms) => {
          if (ms <= 250) {
            completeStage('loss', 'Time expired — Bot wins', new Chess(fen));
            return 0;
          }
          return ms - 250;
        });
      } else {
        setBlackTimeMs((ms) => {
          if (ms <= 250) {
            completeStage('win', 'Opponent flagged — Stage cleared!', new Chess(fen));
            return 0;
          }
          return ms - 250;
        });
      }
    }, 250);
    return () => clearInterval(t);
  }, [activeStage, stageResult, moves.length, fen]);

  // Bot turn
  useEffect(() => {
    if (!activeStage || stageResult) return;
    const c = new Chess(fen);
    if (c.turn() !== 'b' || c.isGameOver()) return;

    let cancelled = false;
    search({ fen, personalityId: activeStage.personalityId })
      .then((res) => {
        if (cancelled || !res.bestMoveUci) return;
        const cNext = new Chess(fen);
        const mv = cNext.move({
          from: res.bestMoveUci.slice(0, 2) as Square,
          to: res.bestMoveUci.slice(2, 4) as Square,
          promotion: (res.bestMoveUci.slice(4) as PieceSymbol) || undefined,
        });
        if (!mv) return;
        setBlackTimeMs((ms) => ms + activeStage.timeControl.incrementSeconds * 1000);
        setFen(cNext.fen());
        setMoves((prev) => [...prev, mv.san]);
        setLastMove({ from: mv.from, to: mv.to });
        playChessSound(mv.captured ? 'capture' : 'move', profile.customization.soundEnabled);

        if (cNext.isCheckmate()) {
          completeStage('loss', `Checkmate — ${activeStage.botName} prevails`, cNext);
        } else if (cNext.isDraw()) {
          completeStage('draw', 'Draw — Stage remains open to retry', cNext);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeStage, stageResult, fen, search, profile.customization.soundEnabled]);

  const handlePlayerMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    if (!activeStage || stageResult) return false;
    const c = new Chess(fen);
    if (c.turn() !== 'w') return false;
    const mv = c.move({ from, to, promotion: promotion ?? 'q' });
    if (!mv) return false;

    setWhiteTimeMs((ms) => ms + activeStage.timeControl.incrementSeconds * 1000);
    setFen(c.fen());
    setMoves((prev) => [...prev, mv.san]);
    setLastMove({ from: mv.from, to: mv.to });
    playChessSound(mv.captured ? 'capture' : 'move', profile.customization.soundEnabled);

    if (c.isCheckmate()) {
      completeStage('win', `Checkmate — ${activeStage.title} cleared!`, c);
    } else if (c.isDraw()) {
      completeStage('draw', 'Draw — Retry stage to advance', c);
    }
    return true;
  };

  const royaleGames = profile.matchHistory.filter((m) => m.mode === 'royale');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Chess Royale</h1>
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
            Progressive five-stage challenge ladder with real XP, unlockable titles, and streak tracking.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <span>Stage {profile.royaleStageReached}/5</span>
          <span>Streak {profile.royaleStreak}</span>
          <span>Best {profile.royaleBestStreak}</span>
        </div>
      </div>

      {!activeStage ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-3">
            {stages.map((stage, idx) => {
              const unlocked = stage.stage <= profile.royaleStageReached;
              const cleared = stage.stage < profile.royaleStageReached;
              return (
                <div
                  key={stage.stage}
                  className={`border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    unlocked
                      ? 'border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B]'
                      : 'border-[#E6DDCE] dark:border-[#2F2B24] bg-[#EAE2D4]/40 dark:bg-[#23201B]/40 opacity-75'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {cleared ? (
                        <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] dark:text-[#52B788]" />
                      ) : unlocked ? (
                        <Crown className="w-4 h-4 text-[#B4690E]" />
                      ) : (
                        <Lock className="w-4 h-4 text-[#9B9386]" />
                      )}
                      <h2 className="font-display text-sm font-semibold">{stage.title}</h2>
                    </div>
                    <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
                      {stage.objective}
                    </p>
                    <div className="text-[11px] font-mono tabular-nums text-[#756F63] dark:text-[#9B9386] flex flex-wrap gap-2">
                      <span>Opponent: {stage.botName}</span>
                      <span aria-hidden="true">·</span>
                      <span>Clock: {stage.timeControl.label}</span>
                      <span aria-hidden="true">·</span>
                      <span>Reward: +{stage.xpReward} XP</span>
                      {stage.unlockTitle && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Unlocks Title: {stage.unlockTitle}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label={`Move ${stage.title} up`}
                      onClick={() => moveStageOrder(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${stage.title} down`}
                      onClick={() => moveStageOrder(idx, 1)}
                      disabled={idx === stages.length - 1}
                      className="p-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] disabled:opacity-40"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => startStage(stage)}
                      className="px-3.5 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{cleared ? 'Replay' : 'Challenge'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Royale Session Stats & History */}
          <div className="lg:col-span-4 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
            <h2 className="font-display text-base font-semibold">Challenge History</h2>
            {royaleGames.length === 0 ? (
              <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
                No Royale attempts logged yet. Begin Stage I to start your streak.
              </p>
            ) : (
              <div className="divide-y divide-[#E6DDCE] dark:divide-[#2F2B24]">
                {royaleGames.slice(0, 6).map((g) => (
                  <div key={g.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium">{g.opponentName}</div>
                      <div className="text-[#756F63]">{g.termination}</div>
                    </div>
                    <span className="font-mono font-semibold">
                      {g.result === 'win' ? `+${g.xpEarned} XP` : g.result}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-2.5">
            <ChessClock
              color="b"
              label={activeStage.botName}
              subtitle={activeStage.title}
              timeMs={blackTimeMs}
              isActive={!stageResult && chess.turn() === 'b'}
            />
            <Chessboard2D
              fen={fen}
              boardTheme={profile.customization.boardTheme}
              pieceSet={profile.customization.pieceSet}
              showCoordinates={profile.customization.showCoordinates}
              highlightLegalMoves={profile.customization.highlightLegalMoves}
              interactive={!stageResult}
              playerColor="w"
              lastMove={lastMove}
              onMove={handlePlayerMove}
            />
            <ChessClock
              color="w"
              label={profile.username}
              rating={profile.rating}
              timeMs={whiteTimeMs}
              isActive={!stageResult && chess.turn() === 'w'}
            />
          </div>

          <div className="lg:col-span-5 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold">{activeStage.title}</h2>
              <button
                type="button"
                onClick={() => {
                  cancelSearch();
                  setActiveStage(null);
                }}
                className="text-xs text-[#756F63] underline"
              >
                Back to Ladder
              </button>
            </div>
            <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">{activeStage.objective}</p>
            {isThinking && <p className="text-xs text-[#756F63]">Bot is calculating...</p>}

            {stageResult && (
              <div className="p-3.5 rounded-md bg-[#F3EBDD] dark:bg-[#2B2822] border border-[#D8CDBB] dark:border-[#3B362E] space-y-2">
                <div className="text-sm font-bold">{termination}</div>
                {stageResult === 'win' && (
                  <div className="text-xs text-[#2D6A4F] dark:text-[#52B788] font-medium">
                    Earned +{activeStage.xpReward} XP
                    {activeStage.unlockTitle ? ` · Unlocked title "${activeStage.unlockTitle}"` : ''}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startStage(activeStage)}
                    className="px-3 py-1.5 rounded bg-[#292720] text-[#F3EBDD] text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Stage</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStage(null)}
                    className="px-3 py-1.5 rounded border border-[#D8CDBB] text-xs font-medium"
                  >
                    Ladder Overview
                  </button>
                </div>
              </div>
            )}

            <MoveList moves={moves} />
          </div>
        </div>
      )}
    </div>
  );
};
