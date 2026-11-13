import React, { useMemo } from 'react';
import { Chess, PieceSymbol } from 'chess.js';
import { PieceSetId } from '../../types/chess';
import { ChessPieceSvg } from './GeoPieces';

interface CapturedPiecesProps {
  fen: string;
  perspectiveColor: 'w' | 'b'; // captures BY this color (i.e. opponent pieces missing)
  pieceSet?: PieceSetId;
}

const START_COUNTS: Record<Exclude<PieceSymbol, 'k'>, number> = {
  q: 1,
  r: 2,
  b: 2,
  n: 2,
  p: 8,
};

const WEIGHTS: Record<Exclude<PieceSymbol, 'k'>, number> = {
  q: 9,
  r: 5,
  b: 3,
  n: 3,
  p: 1,
};

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  fen,
  perspectiveColor,
  pieceSet = 'geo',
}) => {
  const { capturedList, materialAdvantage } = useMemo(() => {
    const enemyColor: 'w' | 'b' = perspectiveColor === 'w' ? 'b' : 'w';
    const currentCounts: Record<'w' | 'b', Record<Exclude<PieceSymbol, 'k'>, number>> = {
      w: { q: 0, r: 0, b: 0, n: 0, p: 0 },
      b: { q: 0, r: 0, b: 0, n: 0, p: 0 },
    };

    try {
      const chess = new Chess(fen);
      for (const row of chess.board()) {
        for (const cell of row) {
          if (cell && cell.type !== 'k') {
            currentCounts[cell.color][cell.type]++;
          }
        }
      }
    } catch {
      return { capturedList: [] as Exclude<PieceSymbol, 'k'>[], materialAdvantage: 0 };
    }

    const list: Exclude<PieceSymbol, 'k'>[] = [];
    const order: Exclude<PieceSymbol, 'k'>[] = ['q', 'r', 'b', 'n', 'p'];
    for (const type of order) {
      const missing = Math.max(0, START_COUNTS[type] - currentCounts[enemyColor][type]);
      for (let i = 0; i < missing; i++) list.push(type);
    }

    const myMat = order.reduce((acc, t) => acc + currentCounts[perspectiveColor][t] * WEIGHTS[t], 0);
    const oppMat = order.reduce((acc, t) => acc + currentCounts[enemyColor][t] * WEIGHTS[t], 0);

    return {
      capturedList: list,
      materialAdvantage: myMat - oppMat,
    };
  }, [fen, perspectiveColor]);

  const enemyColor: 'w' | 'b' = perspectiveColor === 'w' ? 'b' : 'w';

  return (
    <div className="flex items-center gap-1 min-h-[22px] px-1">
      <div className="flex items-center -space-x-1">
        {capturedList.map((type, idx) => (
          <div key={`${type}-${idx}`} className="w-4 h-4">
            <ChessPieceSvg type={type} color={enemyColor} pieceSet={pieceSet} />
          </div>
        ))}
      </div>
      {materialAdvantage > 0 && (
        <span className="text-[11px] font-mono tabular-nums font-medium text-[#756F63] dark:text-[#B8B0A2] ml-1">
          +{materialAdvantage}
        </span>
      )}
    </div>
  );
};
