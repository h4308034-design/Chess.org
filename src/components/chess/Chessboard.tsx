import React, { Suspense, lazy } from 'react';
import { Chessboard2D, Chessboard2DProps } from './Chessboard2D';
import { BoardMode } from '../../types/chess';

const LazyChessboard3D = lazy(() => import('./Chessboard3D'));

export interface ChessboardProps extends Chessboard2DProps {
  mode?: BoardMode;
}

export const Chessboard: React.FC<ChessboardProps> = ({ mode = '2d', ...props }) => {
  if (mode === '3d' && !props.blindfold && !props.customLegalMovesForSquare) {
    return (
      <Suspense
        fallback={
          <div
            className="w-full aspect-square mx-auto flex items-center justify-center rounded-[6px] border border-[#D8CDBB] dark:border-[#3B362E] bg-[#EAE2D4] dark:bg-[#23201B] text-xs text-[#756F63] dark:text-[#B8B0A2]"
            style={{ maxWidth: `${props.maxSizePx ?? 560}px` }}
          >
            Loading 3D Three.js Chessboard...
          </div>
        }
      >
        <LazyChessboard3D
          fen={props.fen}
          orientation={props.orientation}
          boardTheme={props.boardTheme}
          interactive={props.interactive}
          playerColor={props.playerColor}
          lastMove={props.lastMove}
          highlightLegalMoves={props.highlightLegalMoves}
          onMove={props.onMove}
          maxSizePx={props.maxSizePx}
        />
      </Suspense>
    );
  }

  return <Chessboard2D {...props} />;
};
