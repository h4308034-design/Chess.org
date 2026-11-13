import React, { useMemo, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { HISTORICAL_GAMES } from '../data/historicalGames';
import { HistoricalGame } from '../types/chess';
import { Chessboard2D } from '../components/chess/Chessboard2D';
import { playChessSound } from '../utils/sound';

export const TimeMachineView: React.FC = () => {
  const { profile } = useApp();
  const [selectedGame, setSelectedGame] = useState<HistoricalGame>(HISTORICAL_GAMES[0]);
  const [ply, setPly] = useState(0);

  // Alternate user exploration state (clearly distinguished from historical record)
  const [exploringAlt, setExploringAlt] = useState(false);
  const [altFen, setAltFen] = useState('');
  const [altMoves, setAltMoves] = useState<string[]>([]);

  const historicalTimeline = useMemo(() => {
    const c = new Chess();
    const frames: { fen: string; lastMove: { from: string; to: string } | null; annotation?: string }[] = [
      { fen: c.fen(), lastMove: null, annotation: 'Starting position.' },
    ];
    for (const m of selectedGame.moves) {
      const mv = c.move(m.san);
      if (!mv) break;
      frames.push({
        fen: c.fen(),
        lastMove: { from: mv.from, to: mv.to },
        annotation: m.annotation,
      });
    }
    return frames;
  }, [selectedGame]);

  const currentFrame = historicalTimeline[Math.min(ply, historicalTimeline.length - 1)];
  const activeFen = exploringAlt ? altFen : currentFrame.fen;

  const selectHistoricalGame = (g: HistoricalGame) => {
    setSelectedGame(g);
    setPly(0);
    setExploringAlt(false);
    setAltMoves([]);
  };

  const jumpToPly = (targetPly: number) => {
    const clamped = Math.max(0, Math.min(historicalTimeline.length - 1, targetPly));
    setPly(clamped);
    setExploringAlt(false);
    setAltMoves([]);
  };

  const handleAlternateMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    const c = new Chess(activeFen);
    const mv = c.move({ from, to, promotion: promotion ?? 'q' });
    if (!mv) return false;
    setExploringAlt(true);
    setAltFen(c.fen());
    setAltMoves((prev) => [...prev, mv.san]);
    playChessSound(mv.captured ? 'capture' : 'move', profile.customization.soundEnabled);
    return true;
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Chess Time Machine</h1>
        <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
          Step through verified historical games and branch into your own alternate variations without altering the historical record.
        </p>
      </div>

      {/* Historical Game Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {HISTORICAL_GAMES.map((g) => {
          const active = g.id === selectedGame.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => selectHistoricalGame(g)}
              className={`text-left p-4 rounded-lg border transition-colors ${
                active
                  ? 'border-[#292720] bg-[#FFFFFF] dark:border-[#F3EBDD] dark:bg-[#23201B]'
                  : 'border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF]/60 dark:bg-[#23201B]/60 hover:bg-[#FFFFFF]'
              }`}
            >
              <div className="text-xs font-mono text-[#756F63] dark:text-[#9B9386]">
                {g.year} · {g.eco} · {g.result}
              </div>
              <div className="font-display font-bold text-sm mt-0.5">{g.title}</div>
              <div className="text-xs text-[#756F63] dark:text-[#B8B0A2] mt-0.5 truncate">
                {g.white} vs {g.black}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Board + Playback Controls */}
        <div className="lg:col-span-7 space-y-3">
          <Chessboard2D
            fen={activeFen}
            boardTheme={profile.customization.boardTheme}
            pieceSet={profile.customization.pieceSet}
            showCoordinates={profile.customization.showCoordinates}
            lastMove={exploringAlt ? null : currentFrame.lastMove}
            interactive={true}
            playerColor="both"
            onMove={handleAlternateMove}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B]">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Jump to start"
                onClick={() => jumpToPly(0)}
                className="p-2 rounded hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Previous move"
                onClick={() => jumpToPly(ply - 1)}
                className="p-2 rounded hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next move"
                onClick={() => jumpToPly(ply + 1)}
                className="p-2 rounded hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Jump to final move"
                onClick={() => jumpToPly(historicalTimeline.length - 1)}
                className="p-2 rounded hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs font-mono tabular-nums text-[#756F63]">
              Move {ply} / {selectedGame.moves.length}
            </div>
          </div>
        </div>

        {/* Metadata, Annotations & Alternate Exploration */}
        <div className="lg:col-span-5 space-y-4">
          {exploringAlt && (
            <div className="p-4 rounded-lg border border-[#B4690E]/50 bg-[#B4690E]/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#B4690E] dark:text-[#E09F3E] inline-flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>User Exploration Branch (Not Historical Record)</span>
                </span>
                <button
                  type="button"
                  onClick={() => jumpToPly(ply)}
                  className="px-2.5 py-1 rounded bg-[#292720] text-[#F3EBDD] text-xs font-medium inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Return to Game</span>
                </button>
              </div>
              <div className="text-xs font-mono">
                Your line from ply {ply}: {altMoves.join(' ')}
              </div>
              {selectedGame.moves[ply] && (
                <div className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
                  Actual historical continuation was{' '}
                  <strong className="font-mono">{selectedGame.moves[ply].san}</strong>.
                </div>
              )}
            </div>
          )}

          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-3">
            <div>
              <h2 className="font-display text-lg font-bold">{selectedGame.title}</h2>
              <div className="text-xs text-[#756F63] dark:text-[#9B9386] mt-0.5">
                {selectedGame.event} ({selectedGame.year}) · {selectedGame.opening} ({selectedGame.eco}) · Result {selectedGame.result}
              </div>
            </div>

            <p className="text-xs text-[#595347] dark:text-[#B8B0A2]">{selectedGame.summary}</p>

            {currentFrame.annotation && !exploringAlt && (
              <div className="p-3 rounded-md bg-[#F3EBDD] dark:bg-[#2B2822] text-xs">
                <strong>Note:</strong> {currentFrame.annotation}
              </div>
            )}

            {/* Move list */}
            <div className="max-h-48 overflow-y-auto border border-[#E6DDCE] dark:border-[#2F2B24] rounded-md p-2 flex flex-wrap gap-1 font-mono text-xs">
              {selectedGame.moves.map((m, i) => {
                const moveNum = i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : '';
                const isCurrent = !exploringAlt && ply === i + 1;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => jumpToPly(i + 1)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      isCurrent
                        ? 'bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] font-semibold'
                        : 'hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]'
                    }`}
                  >
                    {moveNum} {m.san}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24] space-y-2 text-xs">
              <div>
                <strong>White:</strong> {selectedGame.whiteBio}
              </div>
              <div>
                <strong>Black:</strong> {selectedGame.blackBio}
              </div>
              <div className="text-[11px] text-[#9B9386]">Source: {selectedGame.source}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
