import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { AnimationSpeed, BoardThemeId, PieceSetId } from '../../types/chess';
import { BOARD_THEMES } from './BoardThemes';
import { ChessPieceSvg } from './GeoPieces';

export interface Chessboard2DProps {
  fen: string;
  orientation?: 'w' | 'b';
  boardTheme?: BoardThemeId;
  pieceSet?: PieceSetId;
  showCoordinates?: boolean;
  highlightLegalMoves?: boolean;
  animationSpeed?: AnimationSpeed;
  interactive?: boolean;
  playerColor?: 'w' | 'b' | 'both';
  lastMove?: { from: string; to: string } | null;
  blindfold?: boolean;
  customLegalMovesForSquare?: (sq: Square) => { to: Square; isCapture?: boolean; isSpecial?: boolean }[];
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => boolean | void;
  maxSizePx?: number;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const Chessboard2D: React.FC<Chessboard2DProps> = ({
  fen,
  orientation = 'w',
  boardTheme = 'ivory',
  pieceSet = 'geo',
  showCoordinates = true,
  highlightLegalMoves = true,
  animationSpeed = 'normal',
  interactive = true,
  playerColor = 'both',
  lastMove = null,
  blindfold = false,
  customLegalMovesForSquare,
  onMove,
  maxSizePx = 560,
}) => {
  const palette = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.ivory;
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<Square | null>(null);
  const [isDraggingVisual, setIsDraggingVisual] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: 'w' | 'b';
  } | null>(null);

  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const wasSelectedBeforeDownRef = useRef(false);

  const chess = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const boardMatrix = useMemo(() => chess.board(), [chess]);
  const turn = chess.turn();
  const inCheck = chess.inCheck();

  const checkSquare = useMemo(() => {
    if (!inCheck) return null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = boardMatrix[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          return `${FILES[c]}${8 - r}` as Square;
        }
      }
    }
    return null;
  }, [inCheck, boardMatrix, turn]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return new Map<Square, { isCapture: boolean; isSpecial?: boolean }>();
    const map = new Map<Square, { isCapture: boolean; isSpecial?: boolean }>();
    if (customLegalMovesForSquare) {
      for (const m of customLegalMovesForSquare(selectedSquare)) {
        map.set(m.to, { isCapture: Boolean(m.isCapture), isSpecial: m.isSpecial });
      }
      return map;
    }
    const moves = chess.moves({ square: selectedSquare, verbose: true }) as Move[];
    for (const m of moves) {
      map.set(m.to, { isCapture: Boolean(m.captured) });
    }
    return map;
  }, [chess, selectedSquare, customLegalMovesForSquare]);

  const canControlPiece = useCallback(
    (pieceColor: 'w' | 'b') => {
      if (!interactive) return false;
      if (playerColor === 'both') return pieceColor === turn;
      return pieceColor === playerColor && pieceColor === turn;
    },
    [interactive, playerColor, turn],
  );

  const attemptMove = useCallback(
    (from: Square, to: Square) => {
      if (!onMove) return;
      const piece = chess.get(from);
      if (!piece) return;

      // Check promotion
      const isPromo =
        piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPromo && !customLegalMovesForSquare) {
        const legal = chess.moves({ square: from, verbose: true }) as Move[];
        if (legal.some((m) => m.to === to && m.promotion)) {
          setPendingPromotion({ from, to, color: piece.color });
          return;
        }
      }

      onMove(from, to);
      setSelectedSquare(null);
    },
    [chess, onMove, customLegalMovesForSquare],
  );

  const handleSquareClick = (sq: Square) => {
    if (!interactive || pendingPromotion) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (selectedSquare) {
      if (selectedSquare === sq) {
        if (wasSelectedBeforeDownRef.current) {
          setSelectedSquare(null);
        }
        wasSelectedBeforeDownRef.current = false;
        return;
      }
      if (legalTargets.has(sq)) {
        attemptMove(selectedSquare, sq);
        wasSelectedBeforeDownRef.current = false;
        return;
      }
    }

    const piece = chess.get(sq);
    if (piece && canControlPiece(piece.color)) {
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
    wasSelectedBeforeDownRef.current = false;
  };

  const getSquareFromPointer = (clientX: number, clientY: number): Square | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) return null;

    const colIdx = Math.floor((relX / rect.width) * 8);
    const rowIdx = Math.floor((relY / rect.height) * 8);
    const file = orientation === 'w' ? FILES[colIdx] : FILES[7 - colIdx];
    const rank = orientation === 'w' ? RANKS[rowIdx] : RANKS[7 - rowIdx];
    return `${file}${rank}` as Square;
  };

  const handlePointerDown = (e: React.PointerEvent, sq: Square) => {
    if (!interactive || pendingPromotion || e.button !== 0) return;
    const piece = chess.get(sq);
    if (!piece || !canControlPiece(piece.color)) {
      wasSelectedBeforeDownRef.current = false;
      return;
    }

    wasSelectedBeforeDownRef.current = selectedSquare === sq;
    setSelectedSquare(sq);
    setDraggingFrom(sq);
    setIsDraggingVisual(false);
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    dragMovedRef.current = false;
    setDragPos({ x: e.clientX, y: e.clientY });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic pointer events without pointerId
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingFrom || !pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    if (!dragMovedRef.current && Math.hypot(dx, dy) > 5) {
      dragMovedRef.current = true;
      setIsDraggingVisual(true);
    }
    if (dragMovedRef.current) {
      setDragPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingFrom) return;
    if (dragMovedRef.current) {
      const targetSq = getSquareFromPointer(e.clientX, e.clientY);
      if (targetSq && targetSq !== draggingFrom && legalTargets.has(targetSq)) {
        attemptMove(draggingFrom, targetSq);
        suppressClickRef.current = true;
      }
    }
    setDraggingFrom(null);
    setIsDraggingVisual(false);
    setDragPos(null);
    pointerStartRef.current = null;
    dragMovedRef.current = false;
  };

  const displayRows = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const displayCols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const transitionMs =
    animationSpeed === 'instant'
      ? 'duration-0'
      : animationSpeed === 'fast'
        ? 'duration-100'
        : animationSpeed === 'smooth'
          ? 'duration-300'
          : 'duration-150';

  const draggedPiece = isDraggingVisual && draggingFrom ? chess.get(draggingFrom) : null;

  return (
    <div
      className="relative w-full select-none mx-auto"
      style={{ maxWidth: `${maxSizePx}px` }}
      data-testid="chessboard-2d"
    >
      <div
        ref={boardRef}
        className="relative grid grid-cols-8 grid-rows-8 aspect-square w-full overflow-hidden rounded-[6px] border"
        style={{ borderColor: palette.borderFrame }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {displayRows.map((r, visualRowIdx) =>
          displayCols.map((c, visualColIdx) => {
            const sq = `${FILES[c]}${8 - r}` as Square;
            const isLight = (r + c) % 2 === 0;
            const piece = boardMatrix[r][c];
            const isSelected = selectedSquare === sq;
            const isLastMove = lastMove?.from === sq || lastMove?.to === sq;
            const isCheck = checkSquare === sq;
            const legalInfo = highlightLegalMoves ? legalTargets.get(sq) : undefined;

            let bg = isLight ? palette.lightSquare : palette.darkSquare;
            if (isLastMove) {
              bg = isLight ? palette.lastMoveLight : palette.lastMoveDark;
            }

            const coordColor = isLight ? palette.lightCoord : palette.darkCoord;
            const showRankLabel = showCoordinates && visualColIdx === 0;
            const showFileLabel = showCoordinates && visualRowIdx === 7;
            const isDraggingThis = isDraggingVisual && draggingFrom === sq;

            return (
              <button
                key={sq}
                type="button"
                aria-label={`Square ${sq}${piece ? ` ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''}`}
                data-square={sq}
                onClick={() => handleSquareClick(sq)}
                onPointerDown={(e) => handlePointerDown(e, sq)}
                className={`relative flex items-center justify-center p-0 m-0 border-0 focus-visible:outline-2 focus-visible:outline-[#292720] focus-visible:z-20 touch-none transition-colors ${transitionMs}`}
                style={{ backgroundColor: bg }}
              >
                {isSelected && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{ backgroundColor: palette.selectedSquare }}
                  />
                )}
                {isCheck && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle, ${palette.checkHighlight} 0%, transparent 75%)`,
                    }}
                  />
                )}

                {showRankLabel && (
                  <span
                    className="absolute top-0.5 left-1 text-[10px] font-mono font-semibold leading-none pointer-events-none"
                    style={{ color: coordColor }}
                  >
                    {8 - r}
                  </span>
                )}
                {showFileLabel && (
                  <span
                    className="absolute bottom-0.5 right-1 text-[10px] font-mono font-semibold leading-none pointer-events-none"
                    style={{ color: coordColor }}
                  >
                    {FILES[c]}
                  </span>
                )}

                {/* Piece */}
                {piece && !blindfold && !isDraggingThis && (
                  <div className="w-[84%] h-[84%] pointer-events-none z-10">
                    <ChessPieceSvg type={piece.type} color={piece.color} pieceSet={pieceSet} />
                  </div>
                )}

                {/* Legal move indicators */}
                {legalInfo && !piece && (
                  <span
                    className="w-[26%] h-[26%] rounded-full pointer-events-none z-10"
                    style={{
                      backgroundColor: legalInfo.isSpecial ? 'rgba(180, 105, 14, 0.55)' : palette.legalDot,
                    }}
                  />
                )}
                {legalInfo && piece && (
                  <span
                    className="absolute inset-[6%] rounded-full border-[3px] pointer-events-none z-10"
                    style={{
                      borderColor: legalInfo.isSpecial ? 'rgba(180, 105, 14, 0.65)' : palette.legalDot,
                    }}
                  />
                )}
              </button>
            );
          }),
        )}

        {/* Promotion modal */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-30 bg-[#292720]/45 flex items-center justify-center p-4">
            <div className="bg-[#FFFFFF] dark:bg-[#23201B] border border-[#D8CDBB] dark:border-[#3B362E] rounded-lg p-3 flex flex-col gap-2">
              <p className="text-xs font-medium text-[#756F63] dark:text-[#B8B0A2] text-center">
                Promote pawn
              </p>
              <div className="flex items-center gap-2">
                {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((promo) => (
                  <button
                    key={promo}
                    type="button"
                    aria-label={`Promote to ${promo}`}
                    onClick={() => {
                      onMove?.(pendingPromotion.from, pendingPromotion.to, promo);
                      setPendingPromotion(null);
                      setSelectedSquare(null);
                    }}
                    className="w-12 h-12 p-1.5 rounded-md border border-[#D8CDBB] dark:border-[#3B362E] bg-[#F3EBDD] dark:bg-[#2B2822] hover:bg-[#EAE2D4] dark:hover:bg-[#35312A] transition-colors"
                  >
                    <ChessPieceSvg type={promo} color={pendingPromotion.color} pieceSet={pieceSet} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPendingPromotion(null)}
                  className="px-2.5 py-2 text-xs text-[#756F63] hover:text-[#292720] dark:hover:text-[#F3EBDD]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating dragged piece */}
      {draggingFrom && dragPos && draggedPiece && !blindfold && (
        <div
          className="fixed pointer-events-none z-50 w-14 h-14 -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          <ChessPieceSvg type={draggedPiece.type} color={draggedPiece.color} pieceSet={pieceSet} />
        </div>
      )}
    </div>
  );
};
