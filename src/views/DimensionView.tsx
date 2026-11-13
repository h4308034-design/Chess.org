import React, { useMemo, useState } from 'react';
import { RefreshCw, Sliders } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  DimensionBoardState,
  DimensionVariantId,
  VARIANT_PIECE_NAMES,
  VariantPiece,
  VariantPieceType,
  VariantSquareCoord,
  coordToAlgebraic,
  createCustomDimensionBoard,
  createGrand10x10Board,
  createMini4x4Board,
  getLegalVariantMoves,
  makeVariantMove,
  validateCustomBoard,
} from '../engine/variantEngine';
import { BOARD_THEMES } from '../components/chess/BoardThemes';
import { ChessPieceSvg } from '../components/chess/GeoPieces';
import { playChessSound } from '../utils/sound';

export const DimensionView: React.FC = () => {
  const { profile } = useApp();
  const palette = BOARD_THEMES[profile.customization.boardTheme] ?? BOARD_THEMES.ivory;

  const [variant, setVariant] = useState<DimensionVariantId>('mini-4x4');
  const [boardState, setBoardState] = useState<DimensionBoardState>(() => createMini4x4Board());
  const [selected, setSelected] = useState<VariantSquareCoord | null>(null);

  // Custom Board Editor state
  const [editingCustom, setEditingCustom] = useState(false);
  const [customRows, setCustomRows] = useState(6);
  const [customCols, setCustomCols] = useState(6);
  const [brushPiece, setBrushPiece] = useState<VariantPiece | 'erase'>({ type: 'p', color: 'w' });
  const [customError, setCustomError] = useState<string | null>(null);

  const legalMoves = useMemo(() => getLegalVariantMoves(boardState), [boardState]);
  const selectedTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      legalMoves
        .filter((m) => m.from.r === selected.r && m.from.c === selected.c)
        .map((m) => `${m.to.r},${m.to.c}`),
    );
  }, [legalMoves, selected]);

  const selectVariant = (id: DimensionVariantId) => {
    setVariant(id);
    setSelected(null);
    setEditingCustom(false);
    setCustomError(null);
    if (id === 'mini-4x4') setBoardState(createMini4x4Board());
    else if (id === 'grand-10x10') setBoardState(createGrand10x10Board());
    else setBoardState(createCustomDimensionBoard(customRows, customCols));
  };

  const handleSquareClick = (r: number, c: number) => {
    if (editingCustom) {
      const nextGrid = boardState.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
      nextGrid[r][c] = brushPiece === 'erase' ? null : { ...brushPiece };
      setBoardState({ ...boardState, grid: nextGrid });
      setCustomError(null);
      return;
    }

    if (boardState.winner) return;

    if (selected) {
      if (selected.r === r && selected.c === c) {
        setSelected(null);
        return;
      }
      if (selectedTargets.has(`${r},${c}`)) {
        const next = makeVariantMove(boardState, selected, { r, c });
        if (next) {
          setBoardState(next);
          setSelected(null);
          playChessSound('move', profile.customization.soundEnabled);
          return;
        }
      }
    }

    const piece = boardState.grid[r][c];
    if (piece && piece.color === boardState.turn) {
      setSelected({ r, c });
    } else {
      setSelected(null);
    }
  };

  const applyCustomDimensions = (r: number, c: number) => {
    setCustomRows(r);
    setCustomCols(c);
    setBoardState(createCustomDimensionBoard(r, c));
    setCustomError(null);
  };

  const startCustomMatch = () => {
    const check = validateCustomBoard(boardState);
    if (!check.valid) {
      setCustomError(check.error ?? 'Invalid board configuration.');
      return;
    }
    setCustomError(null);
    setEditingCustom(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Chess Dimension</h1>
          <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
            Experimental non-standard board dimensions using an independent variant rules adapter.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'mini-4x4', label: '4×4 Mini Chess' },
              { id: 'grand-10x10', label: '10×10 Grand Chess' },
              { id: 'custom', label: 'Custom Board' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectVariant(item.id)}
              className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                variant === item.id
                  ? 'bg-[#292720] text-[#F3EBDD] border-[#292720] dark:bg-[#F3EBDD] dark:text-[#191714]'
                  : 'border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Variant Grid */}
        <div className="lg:col-span-7 flex justify-center">
          <div
            className="w-full max-w-[560px] grid border rounded-[6px] overflow-hidden select-none"
            style={{
              gridTemplateColumns: `repeat(${boardState.cols}, minmax(0, 1fr))`,
              borderColor: palette.borderFrame,
            }}
            data-testid="dimension-board"
          >
            {boardState.grid.map((row, r) =>
              row.map((cell, c) => {
                const isLight = (r + c) % 2 === 0;
                const isSelected = selected?.r === r && selected?.c === c;
                const isLegal = selectedTargets.has(`${r},${c}`);
                const coord = coordToAlgebraic(r, c, boardState.rows);

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    aria-label={`Dimension square ${coord}${cell ? ` ${cell.color === 'w' ? 'White' : 'Black'} ${VARIANT_PIECE_NAMES[cell.type]}` : ''}`}
                    onClick={() => handleSquareClick(r, c)}
                    className="relative aspect-square flex items-center justify-center p-0 border-0 focus-visible:outline-2 focus-visible:outline-[#292720]"
                    style={{
                      backgroundColor: isLight ? palette.lightSquare : palette.darkSquare,
                    }}
                  >
                    {isSelected && (
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{ backgroundColor: palette.selectedSquare }}
                      />
                    )}
                    {r === boardState.rows - 1 && (
                      <span
                        className="absolute bottom-0.5 right-0.5 text-[9px] font-mono leading-none pointer-events-none"
                        style={{ color: isLight ? palette.lightCoord : palette.darkCoord }}
                      >
                        {String.fromCharCode(97 + c)}
                      </span>
                    )}
                    {cell && (
                      <div className="w-[82%] h-[82%] z-10 pointer-events-none">
                        <ChessPieceSvg
                          type={cell.type}
                          color={cell.color}
                          pieceSet={profile.customization.pieceSet}
                        />
                      </div>
                    )}
                    {isLegal && !cell && (
                      <span
                        className="w-[26%] h-[26%] rounded-full z-10 pointer-events-none"
                        style={{ backgroundColor: palette.legalDot }}
                      />
                    )}
                    {isLegal && cell && (
                      <span
                        className="absolute inset-[7%] rounded-full border-[3px] z-10 pointer-events-none"
                        style={{ borderColor: palette.legalDot }}
                      />
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        {/* Variant Rules & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#23201B] rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold">
                  {variant === 'mini-4x4'
                    ? '4×4 Mini Chess'
                    : variant === 'grand-10x10'
                      ? '10×10 Grand Chess'
                      : `Custom ${boardState.rows}×${boardState.cols} Board`}
                </h2>
                <p className="text-xs text-[#756F63] dark:text-[#9B9386]">
                  {boardState.terminationReason ??
                    `${boardState.turn === 'w' ? 'White' : 'Black'} to move · Local 2-Player`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => selectVariant(variant)}
                className="px-2.5 py-1.5 rounded border border-[#D8CDBB] dark:border-[#3B362E] text-xs inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {variant === 'custom' && (
              <div className="p-3.5 rounded-md bg-[#F3EBDD]/70 dark:bg-[#2B2822]/70 border border-[#E6DDCE] dark:border-[#353028] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold inline-flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Board Builder</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => (editingCustom ? startCustomMatch() : setEditingCustom(true))}
                    className="px-2.5 py-1 rounded bg-[#292720] text-[#F3EBDD] text-xs font-medium"
                  >
                    {editingCustom ? 'Validate & Play' : 'Edit Pieces'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="block">
                    <span className="text-[#756F63]">Rows (4–10)</span>
                    <input
                      type="number"
                      min={4}
                      max={10}
                      value={customRows}
                      onChange={(e) => applyCustomDimensions(Number(e.target.value) || 6, customCols)}
                      className="mt-1 w-full px-2 py-1 rounded border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#191714] font-mono"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[#756F63]">Cols (4–10)</span>
                    <input
                      type="number"
                      min={4}
                      max={10}
                      value={customCols}
                      onChange={(e) => applyCustomDimensions(customRows, Number(e.target.value) || 6)}
                      className="mt-1 w-full px-2 py-1 rounded border border-[#D8CDBB] dark:border-[#3B362E] bg-[#FFFFFF] dark:bg-[#191714] font-mono"
                    />
                  </label>
                </div>

                {editingCustom && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-[#756F63]">
                      Click squares to place selected piece:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(['w', 'b'] as const).map((col) =>
                        (['k', 'q', 'r', 'b', 'n', 'p', 'a', 'c'] as VariantPieceType[]).map(
                          (type) => (
                            <button
                              key={`${col}-${type}`}
                              type="button"
                              onClick={() => setBrushPiece({ type, color: col })}
                              title={`${col === 'w' ? 'White' : 'Black'} ${VARIANT_PIECE_NAMES[type]}`}
                              className={`w-8 h-8 p-1 rounded border ${
                                brushPiece !== 'erase' &&
                                brushPiece.type === type &&
                                brushPiece.color === col
                                  ? 'border-[#292720] bg-[#EAE2D4]'
                                  : 'border-[#D8CDBB] bg-[#FFFFFF]'
                              }`}
                            >
                              <ChessPieceSvg type={type} color={col} pieceSet={profile.customization.pieceSet} />
                            </button>
                          ),
                        ),
                      )}
                      <button
                        type="button"
                        onClick={() => setBrushPiece('erase')}
                        className={`px-2 py-1 rounded border text-xs ${
                          brushPiece === 'erase'
                            ? 'border-[#292720] bg-[#EAE2D4] font-semibold'
                            : 'border-[#D8CDBB] bg-[#FFFFFF]'
                        }`}
                      >
                        Erase
                      </button>
                    </div>
                  </div>
                )}

                {customError && (
                  <p className="text-xs text-[#9B2226] dark:text-[#E05A5A]">{customError}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold text-[#756F63] dark:text-[#9B9386]">
                Rules & Movement
              </h3>
              <ul className="space-y-1 text-xs text-[#595347] dark:text-[#B8B0A2] list-disc pl-4">
                {boardState.rulesSummary.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-[#E6DDCE] dark:border-[#2F2B24]">
              <div className="text-xs font-semibold mb-1.5">Variant Move History</div>
              {boardState.moveHistory.length === 0 ? (
                <p className="text-xs text-[#9B9386]">No moves played yet.</p>
              ) : (
                <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5 font-mono text-xs">
                  {boardState.moveHistory.map((m, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-[#EAE2D4]/70 dark:bg-[#2B2822]">
                      {idx + 1}. {m}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
