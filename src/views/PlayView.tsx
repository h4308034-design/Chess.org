import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, PieceSymbol, Square } from 'chess.js';
import {
  Box,
  Cpu,
  Flag,
  Globe,
  Handshake,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AI_PERSONALITIES, PERSONALITY_LIST, STANDARD_TIME_CONTROLS } from '../engine/personalities';
import { BoardMode, PersonalityId, TimeControl } from '../types/chess';
import { useChessEngine } from '../hooks/useChessEngine';
import { Chessboard } from '../components/chess/Chessboard';
import { ChessClock } from '../components/chess/ChessClock';
import { MoveList } from '../components/chess/MoveList';
import { CapturedPieces } from '../components/chess/CapturedPieces';
import { EvalBar } from '../components/chess/EvalBar';
import { playChessSound } from '../utils/sound';
import { calculateRatingDelta } from '../engine/progression';

export type PlaySubMode = 'quick' | 'ai' | 'online' | 'local' | 'custom';

interface OnlineRoomPayload {
  roomId: string;
  timeControlLabel: string;
  initialMs: number;
  incrementMs: number;
  fen: string;
  pgn: string;
  moves: string[];
  turn: 'w' | 'b';
  white: { clientId: string; username: string; rating: number; connected: boolean } | null;
  black: { clientId: string; username: string; rating: number; connected: boolean } | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  status: 'waiting' | 'active' | 'finished';
  winner: 'w' | 'b' | 'draw' | null;
  termination: string | null;
  drawOfferBy: 'w' | 'b' | null;
  rematchRequests: { w: boolean; b: boolean };
}

export const PlayView: React.FC<{ initialMode: PlaySubMode }> = ({ initialMode }) => {
  const { profile, recordMatch, openGameReview, clientId } = useApp();
  const { isThinking, engineError, isFallbackMode, search, cancelSearch } = useChessEngine();

  const [mode, setMode] = useState<PlaySubMode>(initialMode);
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Setup state
  const [selectedTc, setSelectedTc] = useState<TimeControl>(STANDARD_TIME_CONTROLS[6]); // 10+0
  const [customMinutes, setCustomMinutes] = useState(10);
  const [customIncrement, setCustomIncrement] = useState(5);
  const [customFen, setCustomFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [customFenError, setCustomFenError] = useState<string | null>(null);
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityId>('casual');
  const [preferredColor, setPreferredColor] = useState<'w' | 'b' | 'random'>('w');
  const [boardMode, setBoardMode] = useState<BoardMode>(profile.customization.defaultBoardMode);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [showEvalBar, setShowEvalBar] = useState<boolean>(profile.customization.evaluationBarVisible);

  // Local/AI active match state
  const [gameActive, setGameActive] = useState(false);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [fen, setFen] = useState(new Chess().fen());
  const [moves, setMoves] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [whiteTimeMs, setWhiteTimeMs] = useState(600000);
  const [blackTimeMs, setBlackTimeMs] = useState(600000);
  const [clockPaused, setClockPaused] = useState(false);
  const [gameResult, setGameResult] = useState<{
    winner: 'w' | 'b' | 'draw';
    termination: string;
    pgn: string;
  } | null>(null);
  const [evalState, setEvalState] = useState<{ cp: number; mate: number | null }>({ cp: 15, mate: null });
  const [drawOfferedLocal, setDrawOfferedLocal] = useState(false);

  // Online multiplayer WebSocket state
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);
  const [onlineQueueing, setOnlineQueueing] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomPayload | null>(null);
  const onlineRecordedRef = useRef<string | null>(null);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const activeTimeControl: TimeControl = useMemo(() => {
    if (mode === 'custom') {
      return {
        id: 'custom',
        label: `${customMinutes}+${customIncrement}`,
        category: 'custom',
        initialSeconds: Math.max(1, customMinutes) * 60,
        incrementSeconds: Math.max(0, customIncrement),
      };
    }
    return selectedTc;
  }, [mode, customMinutes, customIncrement, selectedTc]);

  const finishLocalGame = useCallback(
    (winner: 'w' | 'b' | 'draw', termination: string, finalChess: Chess) => {
      cancelSearch();
      setGameActive(false);
      const pgn = finalChess.history().map((s, idx) => (idx % 2 === 0 ? `${idx / 2 + 1}. ${s}` : s)).join(' ');
      setGameResult({ winner, termination, pgn });
      playChessSound('game-end', profile.customization.soundEnabled);

      const isAi = mode === 'ai' || mode === 'quick' || (mode === 'custom' && selectedPersonality !== null);
      const pResult: 'win' | 'loss' | 'draw' =
        winner === 'draw' ? 'draw' : winner === playerColor ? 'win' : 'loss';
      const oppName =
        mode === 'local'
          ? 'Local Opponent'
          : `${AI_PERSONALITIES[selectedPersonality].name} Bot`;
      const oppRating = 900 + AI_PERSONALITIES[selectedPersonality].skillLevel * 55;
      const ratingDelta = mode === 'local' ? 0 : calculateRatingDelta(profile.rating, oppRating, pResult);
      const xpEarned = pResult === 'win' ? 50 : pResult === 'draw' ? 25 : 15;

      recordMatch({
        id: `match-${Date.now()}`,
        timestamp: Date.now(),
        mode: mode === 'quick' ? 'ai' : mode === 'local' ? 'local' : mode === 'custom' ? 'custom' : 'ai',
        opponentName: oppName,
        opponentType: mode === 'local' ? 'human-local' : 'ai',
        personalityId: mode === 'local' ? undefined : selectedPersonality,
        playerColor,
        result: pResult,
        termination,
        timeControlLabel: activeTimeControl.label,
        pgn,
        finalFen: finalChess.fen(),
        moveCount: finalChess.history().length,
        xpEarned,
        ratingDelta,
      });
      void isAi;
    },
    [
      cancelSearch,
      profile.customization.soundEnabled,
      profile.rating,
      mode,
      selectedPersonality,
      playerColor,
      recordMatch,
      activeTimeControl.label,
    ],
  );

  // Local / AI clock interval
  useEffect(() => {
    if (!gameActive || gameResult || clockPaused || moves.length === 0) return;
    const interval = setInterval(() => {
      const turn = new Chess(fen).turn();
      if (turn === 'w') {
        setWhiteTimeMs((prev) => {
          if (prev <= 250) {
            finishLocalGame('b', 'Black wins on time', new Chess(fen));
            return 0;
          }
          return prev - 250;
        });
      } else {
        setBlackTimeMs((prev) => {
          if (prev <= 250) {
            finishLocalGame('w', 'White wins on time', new Chess(fen));
            return 0;
          }
          return prev - 250;
        });
      }
    }, 250);
    return () => clearInterval(interval);
  }, [gameActive, gameResult, clockPaused, moves.length, fen, finishLocalGame]);

  // Trigger AI move when it's AI's turn
  useEffect(() => {
    if (mode === 'online' || mode === 'local' || !gameActive || gameResult) return;
    const c = new Chess(fen);
    if (c.turn() === playerColor || c.isGameOver()) return;

    let cancelled = false;
    const startThink = Date.now();
    search({
      fen,
      personalityId: selectedPersonality,
    })
      .then((res) => {
        if (cancelled || !res.bestMoveUci) return;
        const elapsed = Date.now() - startThink;
        const cNext = new Chess(fen);
        const mv = cNext.move({
          from: res.bestMoveUci.slice(0, 2) as Square,
          to: res.bestMoveUci.slice(2, 4) as Square,
          promotion: (res.bestMoveUci.slice(4) as PieceSymbol) || undefined,
        });
        if (!mv) return;

        // Deduct think time & add increment
        const incMs = activeTimeControl.incrementSeconds * 1000;
        if (mv.color === 'w') setWhiteTimeMs((t) => Math.max(0, t - elapsed + incMs));
        else setBlackTimeMs((t) => Math.max(0, t - elapsed + incMs));

        setFen(cNext.fen());
        setMoves((prev) => [...prev, mv.san]);
        setLastMove({ from: mv.from, to: mv.to });
        setEvalState({ cp: res.evalCp, mate: res.mateIn });

        if (cNext.inCheck()) playChessSound('check', profile.customization.soundEnabled);
        else if (mv.captured) playChessSound('capture', profile.customization.soundEnabled);
        else if (mv.flags.includes('k') || mv.flags.includes('q'))
          playChessSound('castle', profile.customization.soundEnabled);
        else playChessSound('move', profile.customization.soundEnabled);

        if (cNext.isCheckmate()) {
          finishLocalGame(mv.color, `Checkmate — ${mv.color === 'w' ? 'White' : 'Black'} wins`, cNext);
        } else if (cNext.isStalemate()) {
          finishLocalGame('draw', 'Draw by stalemate', cNext);
        } else if (cNext.isInsufficientMaterial()) {
          finishLocalGame('draw', 'Draw by insufficient material', cNext);
        } else if (cNext.isThreefoldRepetition()) {
          finishLocalGame('draw', 'Draw by threefold repetition', cNext);
        } else if (cNext.isDraw()) {
          finishLocalGame('draw', 'Draw by 50-move rule', cNext);
        }
      })
      .catch(() => {
        // search cancelled
      });

    return () => {
      cancelled = true;
    };
  }, [
    mode,
    gameActive,
    gameResult,
    fen,
    playerColor,
    selectedPersonality,
    search,
    activeTimeControl.incrementSeconds,
    profile.customization.soundEnabled,
    finishLocalGame,
  ]);

  const startLocalOrAiMatch = (overrideFen?: string) => {
    cancelSearch();
    let startFen = overrideFen ?? new Chess().fen();
    if (mode === 'custom') {
      try {
        const test = new Chess(customFen.trim());
        startFen = test.fen();
        setCustomFenError(null);
      } catch {
        setCustomFenError('Invalid FEN string. Check piece placement and turn fields.');
        return;
      }
    }

    const assignedColor: 'w' | 'b' =
      preferredColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : preferredColor;
    setPlayerColor(assignedColor);
    setOrientation(mode === 'local' ? 'w' : assignedColor);
    setFen(startFen);
    setMoves([]);
    setLastMove(null);
    setWhiteTimeMs(activeTimeControl.initialSeconds * 1000);
    setBlackTimeMs(activeTimeControl.initialSeconds * 1000);
    setGameResult(null);
    setClockPaused(false);
    setDrawOfferedLocal(false);
    setEvalState({ cp: 15, mate: null });
    setGameActive(true);
  };

  const handleLocalOrAiMove = (from: Square, to: Square, promotion?: PieceSymbol): boolean => {
    if (!gameActive || gameResult) return false;
    const c = new Chess(fen);
    if (mode !== 'local' && c.turn() !== playerColor) return false;

    const mv = c.move({ from, to, promotion: promotion ?? 'q' });
    if (!mv) return false;

    const incMs = activeTimeControl.incrementSeconds * 1000;
    if (mv.color === 'w') setWhiteTimeMs((t) => t + incMs);
    else setBlackTimeMs((t) => t + incMs);

    setFen(c.fen());
    setMoves((prev) => [...prev, mv.san]);
    setLastMove({ from: mv.from, to: mv.to });
    setDrawOfferedLocal(false);

    if (c.inCheck()) playChessSound('check', profile.customization.soundEnabled);
    else if (mv.captured) playChessSound('capture', profile.customization.soundEnabled);
    else if (mv.flags.includes('k') || mv.flags.includes('q'))
      playChessSound('castle', profile.customization.soundEnabled);
    else playChessSound('move', profile.customization.soundEnabled);

    if (c.isCheckmate()) {
      finishLocalGame(mv.color, `Checkmate — ${mv.color === 'w' ? 'White' : 'Black'} wins`, c);
    } else if (c.isStalemate()) {
      finishLocalGame('draw', 'Draw by stalemate', c);
    } else if (c.isInsufficientMaterial()) {
      finishLocalGame('draw', 'Draw by insufficient material', c);
    } else if (c.isThreefoldRepetition()) {
      finishLocalGame('draw', 'Draw by threefold repetition', c);
    } else if (c.isDraw()) {
      finishLocalGame('draw', 'Draw by 50-move rule', c);
    }
    return true;
  };

  // WebSocket connection for Online Multiplayer
  useEffect(() => {
    if (mode !== 'online') return;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      setWsError(null);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'room_state') {
          const room = msg.room as OnlineRoomPayload;
          setOnlineRoom(room);
          setOnlineQueueing(false);
          if (room.black?.clientId === clientId) setOrientation('b');
          else setOrientation('w');

          if (room.status === 'finished' && onlineRecordedRef.current !== `${room.roomId}-${room.moves.length}`) {
            onlineRecordedRef.current = `${room.roomId}-${room.moves.length}`;
            const myColor: 'w' | 'b' = room.black?.clientId === clientId ? 'b' : 'w';
            const opp = myColor === 'w' ? room.black : room.white;
            const res: 'win' | 'loss' | 'draw' =
              room.winner === 'draw' ? 'draw' : room.winner === myColor ? 'win' : 'loss';
            recordMatch({
              id: `online-${room.roomId}-${Date.now()}`,
              timestamp: Date.now(),
              mode: 'online',
              opponentName: opp?.username ?? 'Online Opponent',
              opponentType: 'human-online',
              playerColor: myColor,
              result: res,
              termination: room.termination ?? 'Completed',
              timeControlLabel: room.timeControlLabel,
              pgn: room.pgn,
              finalFen: room.fen,
              moveCount: room.moves.length,
              xpEarned: res === 'win' ? 65 : res === 'draw' ? 30 : 15,
              ratingDelta: calculateRatingDelta(profile.rating, opp?.rating ?? 1200, res),
            });
          }
        } else if (msg.type === 'queued') {
          setOnlineQueueing(true);
        } else if (msg.type === 'queue_cancelled') {
          setOnlineQueueing(false);
        } else if (msg.type === 'error') {
          setWsError(msg.message);
        }
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      setWsConnected(false);
    };
    ws.onerror = () => {
      setWsError('Unable to reach multiplayer WebSocket server.');
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [mode, clientId, profile.rating, recordMatch]);

  // Smooth client-side interpolation for active online room clocks between 250ms server broadcasts
  useEffect(() => {
    if (mode !== 'online' || !onlineRoom || onlineRoom.status !== 'active' || onlineRoom.moves.length === 0) return;
    const t = setInterval(() => {
      setOnlineRoom((prev) => {
        if (!prev || prev.status !== 'active' || prev.moves.length === 0) return prev;
        return {
          ...prev,
          whiteTimeMs: prev.turn === 'w' ? Math.max(0, prev.whiteTimeMs - 200) : prev.whiteTimeMs,
          blackTimeMs: prev.turn === 'b' ? Math.max(0, prev.blackTimeMs - 200) : prev.blackTimeMs,
        };
      });
    }, 200);
    return () => clearInterval(t);
  }, [mode, onlineRoom?.status, onlineRoom?.moves.length, onlineRoom?.turn]);

  const sendWs = (payload: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setWsError('Connecting to server... Please wait a moment.');
      return;
    }
    wsRef.current.send(JSON.stringify({ ...payload, clientId }));
  };

  // RENDER ONLINE MULTIPLAYER
  if (mode === 'online') {
    const myOnlineColor: 'w' | 'b' =
      onlineRoom?.black?.clientId === clientId ? 'b' : 'w';

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Online Multiplayer</h1>
            <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
              Server-authoritative WebSocket matches with real opponents and synchronized clocks.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className={wsConnected ? 'text-[#2D6A4F] dark:text-[#52B788]' : 'text-[#B4690E]'}>
              {wsConnected ? 'WebSocket Connected' : 'Connecting...'}
            </span>
          </div>
        </div>

        {wsError && (
          <div className="p-3 rounded-md border border-[#9B2226]/40 bg-[#9B2226]/10 text-xs text-[#9B2226] dark:text-[#E05A5A]">
            {wsError}
          </div>
        )}

        {!onlineRoom ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Matchmaking */}
            <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#756F63]" />
                <h2 className="font-display text-base font-semibold">Live Matchmaking Queue</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {STANDARD_TIME_CONTROLS.map((tc) => (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => setSelectedTc(tc)}
                    className={`py-2 px-2.5 rounded-md border text-xs font-mono tabular-nums font-medium transition-colors ${
                      selectedTc.id === tc.id
                        ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                        : 'border-[#D8CDBB] dark:border-[#3B362E] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
              {onlineQueueing ? (
                <div className="p-3 rounded-md bg-[#EAE2D4] dark:bg-[#2B2822] flex items-center justify-between gap-2 text-xs">
                  <span>Searching for opponent on {selectedTc.label}...</span>
                  <button
                    type="button"
                    onClick={() => sendWs({ type: 'cancel_queue' })}
                    className="px-2.5 py-1 rounded border border-[#D8CDBB] dark:border-[#3B362E] font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    sendWs({
                      type: 'quick_match',
                      username: profile.username,
                      rating: profile.rating,
                      timeControlLabel: selectedTc.label,
                      initialSeconds: selectedTc.initialSeconds,
                      incrementSeconds: selectedTc.incrementSeconds,
                    })
                  }
                  className="w-full py-2.5 px-4 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-sm font-semibold"
                >
                  Find Online Opponent ({selectedTc.label})
                </button>
              )}
            </section>

            {/* Private Room & Invitation */}
            <section className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#756F63]" />
                <h2 className="font-display text-base font-semibold">Match Invitation Room</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  sendWs({
                    type: 'create_room',
                    username: profile.username,
                    rating: profile.rating,
                    color: preferredColor === 'b' ? 'b' : 'w',
                    timeControlLabel: selectedTc.label,
                    initialSeconds: selectedTc.initialSeconds,
                    incrementSeconds: selectedTc.incrementSeconds,
                  })
                }
                className="w-full py-2.5 px-4 rounded-md border border-[#292720] dark:border-[#D8CDBB] text-sm font-semibold hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822] transition-colors"
              >
                Create Invite Room ({selectedTc.label})
              </button>

              <div className="pt-3 border-t border-[#E6DDCE] dark:border-[#2F2B24] space-y-2">
                <label htmlFor="join-room-input" className="block text-xs font-medium text-[#756F63]">
                  Join with 6-character room code
                </label>
                <div className="flex gap-2">
                  <input
                    id="join-room-input"
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. X7K9M2"
                    className="flex-1 px-3 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] font-mono text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      sendWs({
                        type: 'join_room',
                        roomId: joinRoomCode,
                        username: profile.username,
                        rating: profile.rating,
                      })
                    }
                    className="px-4 py-2 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-sm font-semibold"
                  >
                    Join
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-2.5">
              <ChessClock
                color={orientation === 'w' ? 'b' : 'w'}
                label={
                  (orientation === 'w' ? onlineRoom.black?.username : onlineRoom.white?.username) ??
                  'Waiting for opponent...'
                }
                rating={orientation === 'w' ? onlineRoom.black?.rating : onlineRoom.white?.rating}
                subtitle="Human Online Opponent"
                timeMs={orientation === 'w' ? onlineRoom.blackTimeMs : onlineRoom.whiteTimeMs}
                isActive={onlineRoom.status === 'active' && onlineRoom.turn !== orientation}
              />
              <Chessboard
                mode={boardMode}
                fen={onlineRoom.fen}
                orientation={orientation}
                boardTheme={profile.customization.boardTheme}
                pieceSet={profile.customization.pieceSet}
                showCoordinates={profile.customization.showCoordinates}
                highlightLegalMoves={profile.customization.highlightLegalMoves}
                animationSpeed={profile.customization.animationSpeed}
                interactive={onlineRoom.status === 'active'}
                playerColor={myOnlineColor}
                onMove={(from, to, promotion) => {
                  sendWs({
                    type: 'make_move',
                    roomId: onlineRoom.roomId,
                    from,
                    to,
                    promotion: promotion ?? undefined,
                  });
                }}
              />
              <ChessClock
                color={orientation}
                label={
                  (orientation === 'w' ? onlineRoom.white?.username : onlineRoom.black?.username) ??
                  profile.username
                }
                rating={orientation === 'w' ? onlineRoom.white?.rating : onlineRoom.black?.rating}
                subtitle="You"
                timeMs={orientation === 'w' ? onlineRoom.whiteTimeMs : onlineRoom.blackTimeMs}
                isActive={onlineRoom.status === 'active' && onlineRoom.turn === orientation}
              />
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#756F63]">Room Code</div>
                    <div className="font-mono text-lg font-bold tracking-wider">
                      {onlineRoom.roomId}
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-[#756F63]">
                    {onlineRoom.timeControlLabel} · {onlineRoom.status}
                  </span>
                </div>

                {onlineRoom.status === 'waiting' && (
                  <p className="text-xs text-[#756F63] dark:text-[#B8B0A2]">
                    Share room code <strong className="font-mono">{onlineRoom.roomId}</strong> with another player (or open a second tab) to start the match.
                  </p>
                )}

                {onlineRoom.drawOfferBy && onlineRoom.drawOfferBy !== myOnlineColor && onlineRoom.status === 'active' && (
                  <div className="p-3 rounded-md bg-[#EAE2D4] dark:bg-[#2B2822] flex items-center justify-between gap-2 text-xs">
                    <span>Opponent offers a draw.</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => sendWs({ type: 'accept_draw', roomId: onlineRoom.roomId })}
                        className="px-2.5 py-1 rounded bg-[#292720] text-[#F3EBDD] font-medium"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => sendWs({ type: 'decline_draw', roomId: onlineRoom.roomId })}
                        className="px-2.5 py-1 rounded border border-[#D8CDBB]"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {onlineRoom.status === 'finished' && (
                  <div className="p-3 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] space-y-2">
                    <div className="text-sm font-semibold">{onlineRoom.termination}</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => sendWs({ type: 'request_rematch', roomId: onlineRoom.roomId })}
                        className="px-3 py-1.5 rounded bg-[#292720] text-[#F3EBDD] text-xs font-semibold"
                      >
                        Rematch
                      </button>
                      <button
                        type="button"
                        onClick={() => openGameReview(onlineRoom.pgn)}
                        className="px-3 py-1.5 rounded border border-[#D8CDBB] text-xs font-medium"
                      >
                        Analyze in Chess Detective
                      </button>
                    </div>
                  </div>
                )}

                <MoveList moves={onlineRoom.moves} />

                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24]">
                  <button
                    type="button"
                    onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                    className="px-2.5 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardMode((m) => (m === '2d' ? '3d' : '2d'))}
                    className="px-2.5 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs inline-flex items-center gap-1.5"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>{boardMode === '2d' ? '3D View' : '2D View'}</span>
                  </button>
                  {onlineRoom.status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() => sendWs({ type: 'offer_draw', roomId: onlineRoom.roomId })}
                        className="px-2.5 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs inline-flex items-center gap-1.5"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Offer Draw</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => sendWs({ type: 'resign', roomId: onlineRoom.roomId })}
                        className="px-2.5 py-1.5 rounded border border-[#9B2226]/40 text-[#9B2226] dark:text-[#E05A5A] text-xs inline-flex items-center gap-1.5"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        <span>Resign</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setOnlineRoom(null)}
                    className="px-2.5 py-1.5 rounded text-xs text-[#756F63] ml-auto"
                  >
                    Leave Room
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER SETUP OR ACTIVE ARENA FOR QUICK / AI / LOCAL / CUSTOM
  const modeTitle =
    mode === 'quick'
      ? 'Quick Play'
      : mode === 'ai'
        ? 'Play vs AI'
        : mode === 'local'
          ? 'Local Multiplayer'
          : 'Custom Game';

  const topColor: 'w' | 'b' = orientation === 'w' ? 'b' : 'w';
  const bottomColor: 'w' | 'b' = orientation;
  const topLabel =
    mode === 'local'
      ? topColor === 'w'
        ? 'Player 1 (White)'
        : 'Player 2 (Black)'
      : topColor === playerColor
        ? profile.username
        : `${AI_PERSONALITIES[selectedPersonality].name} Bot`;
  const bottomLabel =
    mode === 'local'
      ? bottomColor === 'w'
        ? 'Player 1 (White)'
        : 'Player 2 (Black)'
      : bottomColor === playerColor
        ? profile.username
        : `${AI_PERSONALITIES[selectedPersonality].name} Bot`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{modeTitle}</h1>
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
            Full standard chess rules powered by chess.js · {boardMode.toUpperCase()} Board
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBoardMode((m) => (m === '2d' ? '3d' : '2d'))}
            className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{boardMode === '2d' ? 'Switch to 3D' : 'Switch to 2D'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowEvalBar((v) => !v)}
            className="px-3 py-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] text-xs font-medium"
          >
            {showEvalBar ? 'Hide Eval' : 'Show Eval'}
          </button>
        </div>
      </div>

      {!gameActive && !gameResult ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Setup Panel */}
          <div className="lg:col-span-7 border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-5">
            {/* Time Control */}
            <div>
              <h2 className="font-display text-sm font-semibold mb-2.5">Time Control</h2>
              {mode === 'custom' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="custom-min" className="block text-xs text-[#756F63] mb-1">
                      Minutes per side
                    </label>
                    <input
                      id="custom-min"
                      type="number"
                      min={1}
                      max={120}
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(Number(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="custom-inc" className="block text-xs text-[#756F63] mb-1">
                      Increment (seconds)
                    </label>
                    <input
                      id="custom-inc"
                      type="number"
                      min={0}
                      max={60}
                      value={customIncrement}
                      onChange={(e) => setCustomIncrement(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] font-mono text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {(['bullet', 'blitz', 'rapid', 'classical'] as const).map((cat) => (
                    <div key={cat} className="flex flex-wrap items-center gap-2">
                      <span className="w-20 text-xs font-medium capitalize text-[#756F63] dark:text-[#9B9386]">
                        {cat}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {STANDARD_TIME_CONTROLS.filter((t) => t.category === cat).map((tc) => (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={() => setSelectedTc(tc)}
                            className={`px-3 py-1.5 rounded-md border text-xs font-mono tabular-nums font-medium transition-colors ${
                              selectedTc.id === tc.id
                                ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                                : 'border-[#D8CDBB] dark:border-[#3B362E] hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822]'
                            }`}
                          >
                            {tc.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom FEN */}
            {mode === 'custom' && (
              <div>
                <label htmlFor="custom-fen" className="block text-xs font-semibold mb-1.5">
                  Starting Position (FEN)
                </label>
                <input
                  id="custom-fen"
                  value={customFen}
                  onChange={(e) => setCustomFen(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD]/50 dark:bg-[#191714] font-mono text-xs"
                />
                {customFenError && (
                  <p className="mt-1 text-xs text-[#9B2226] dark:text-[#E05A5A]">{customFenError}</p>
                )}
              </div>
            )}

            {/* AI Personality Selector */}
            {mode !== 'local' && (
              <div>
                <h2 className="font-display text-sm font-semibold mb-2.5">AI Personality</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERSONALITY_LIST.map((p) => {
                    const active = selectedPersonality === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPersonality(p.id)}
                        className={`text-left p-3 rounded-md border transition-colors ${
                          active
                            ? 'border-[#292720] bg-[#EAE2D4]/80 dark:border-[#F3EBDD] dark:bg-[#2B2822]'
                            : 'border-[#E6DDCE] dark:border-[#353028] hover:border-[#B7A791]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{p.name}</span>
                          <span className="text-[11px] font-mono text-[#756F63] dark:text-[#9B9386]">
                            Lv {p.skillLevel}
                          </span>
                        </div>
                        <div className="text-xs text-[#756F63] dark:text-[#B8B0A2] mt-0.5">
                          {p.tagline}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 p-3 rounded-md bg-[#F3EBDD]/70 dark:bg-[#2B2822]/70 border border-[#E6DDCE] dark:border-[#353028] text-xs space-y-1">
                  <div className="font-semibold">
                    {AI_PERSONALITIES[selectedPersonality].name} ·{' '}
                    <span className="font-mono text-[#756F63] dark:text-[#B8B0A2]">
                      {AI_PERSONALITIES[selectedPersonality].engineStrengthLabel}
                    </span>
                  </div>
                  <p className="text-[#756F63] dark:text-[#B8B0A2]">
                    {AI_PERSONALITIES[selectedPersonality].description}
                  </p>
                </div>
              </div>
            )}

            {/* Color Selection */}
            {mode !== 'local' && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold">Play as:</span>
                {(['w', 'random', 'b'] as const).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setPreferredColor(col)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-medium capitalize ${
                      preferredColor === col
                        ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                        : 'border-[#D8CDBB] dark:border-[#3B362E]'
                    }`}
                  >
                    {col === 'w' ? 'White' : col === 'b' ? 'Black' : 'Random'}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => startLocalOrAiMatch()}
              className="w-full py-3 px-5 rounded-md bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Start {activeTimeControl.label} Match
            </button>
          </div>

          {/* Preview Board */}
          <div className="lg:col-span-5">
            <Chessboard
              mode={boardMode}
              fen={mode === 'custom' ? customFen : new Chess().fen()}
              boardTheme={profile.customization.boardTheme}
              pieceSet={profile.customization.pieceSet}
              showCoordinates={profile.customization.showCoordinates}
              interactive={false}
              maxSizePx={440}
            />
          </div>
        </div>
      ) : (
        /* Active Match View */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 flex items-center justify-center gap-3">
            {showEvalBar && boardMode === '2d' && (
              <EvalBar evalCp={evalState.cp} mateIn={evalState.mate} orientation={orientation} />
            )}

            <div className="flex-1 max-w-[560px] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <ChessClock
                    color={topColor}
                    label={topLabel}
                    rating={topColor === playerColor || mode === 'local' ? profile.rating : undefined}
                    subtitle={
                      mode !== 'local' && topColor !== playerColor
                        ? AI_PERSONALITIES[selectedPersonality].engineStrengthLabel
                        : undefined
                    }
                    timeMs={topColor === 'w' ? whiteTimeMs : blackTimeMs}
                    isActive={gameActive && !clockPaused && chess.turn() === topColor}
                  />
                </div>
              </div>
              <CapturedPieces fen={fen} perspectiveColor={topColor} pieceSet={profile.customization.pieceSet} />

              <Chessboard
                mode={boardMode}
                fen={fen}
                orientation={orientation}
                boardTheme={profile.customization.boardTheme}
                pieceSet={profile.customization.pieceSet}
                showCoordinates={profile.customization.showCoordinates}
                highlightLegalMoves={profile.customization.highlightLegalMoves}
                animationSpeed={profile.customization.animationSpeed}
                interactive={gameActive && !gameResult}
                playerColor={mode === 'local' ? 'both' : playerColor}
                lastMove={lastMove}
                onMove={handleLocalOrAiMove}
              />

              <CapturedPieces fen={fen} perspectiveColor={bottomColor} pieceSet={profile.customization.pieceSet} />
              <ChessClock
                color={bottomColor}
                label={bottomLabel}
                rating={bottomColor === playerColor || mode === 'local' ? profile.rating : undefined}
                timeMs={bottomColor === 'w' ? whiteTimeMs : blackTimeMs}
                isActive={gameActive && !clockPaused && chess.turn() === bottomColor}
              />
            </div>
          </div>

          {/* Right Match Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold">
                  {chess.inCheck()
                    ? 'Check!'
                    : gameResult
                      ? gameResult.termination
                      : `${chess.turn() === 'w' ? 'White' : 'Black'} to move`}
                </div>
                <span className="text-xs font-mono tabular-nums text-[#756F63]">
                  {activeTimeControl.label}
                </span>
              </div>

              {isThinking && (
                <div className="px-3 py-2 rounded-md bg-[#EAE2D4] dark:bg-[#2B2822] text-xs flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{AI_PERSONALITIES[selectedPersonality].name} is calculating...</span>
                  </span>
                  <button
                    type="button"
                    onClick={cancelSearch}
                    className="underline text-[11px]"
                  >
                    Stop
                  </button>
                </div>
              )}

              {(engineError || isFallbackMode) && (
                <div className="px-3 py-2 rounded-md border border-[#B4690E]/40 text-[11px] text-[#B4690E] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{engineError ?? 'Running synchronous fallback engine.'}</span>
                </div>
              )}

              {gameResult && (
                <div className="p-3.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] space-y-2.5">
                  <div className="font-display font-bold text-sm">{gameResult.termination}</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startLocalOrAiMatch()}
                      className="px-3 py-1.5 rounded bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Rematch</span>
                    </button>
                    {gameResult.pgn && (
                      <button
                        type="button"
                        onClick={() => openGameReview(gameResult.pgn)}
                        className="px-3 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs font-medium"
                      >
                        Review in Chess Detective
                      </button>
                    )}
                  </div>
                </div>
              )}

              <MoveList moves={moves} />

              {/* Game Controls */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24]">
                <button
                  type="button"
                  onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                  className="px-2.5 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Flip</span>
                </button>

                {mode === 'local' && gameActive && (
                  <button
                    type="button"
                    onClick={() => setClockPaused((p) => !p)}
                    className="px-2.5 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs inline-flex items-center gap-1.5"
                  >
                    {clockPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{clockPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                )}

                {gameActive && !gameResult && (
                  <>
                    {mode === 'local' && !drawOfferedLocal && (
                      <button
                        type="button"
                        onClick={() => setDrawOfferedLocal(true)}
                        className="px-2.5 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs inline-flex items-center gap-1.5"
                      >
                        <Handshake className="w-3.5 h-3.5" />
                        <span>Offer Draw</span>
                      </button>
                    )}
                    {mode === 'local' && drawOfferedLocal && (
                      <button
                        type="button"
                        onClick={() => finishLocalGame('draw', 'Draw by agreement', chess)}
                        className="px-2.5 py-1.5 rounded bg-[#2D6A4F] text-[#FFFFFF] text-xs font-medium"
                      >
                        Accept Draw
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        finishLocalGame(
                          mode === 'local'
                            ? chess.turn() === 'w'
                              ? 'b'
                              : 'w'
                            : playerColor === 'w'
                              ? 'b'
                              : 'w',
                          'Resignation',
                          chess,
                        )
                      }
                      className="px-2.5 py-1.5 rounded border border-[#9B2226]/40 text-[#9B2226] dark:text-[#E05A5A] text-xs inline-flex items-center gap-1.5"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Resign</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    cancelSearch();
                    setGameActive(false);
                    setGameResult(null);
                  }}
                  className="px-2.5 py-1.5 rounded text-xs text-[#756F63] ml-auto"
                >
                  New Setup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
