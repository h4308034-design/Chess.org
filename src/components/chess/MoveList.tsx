import React, { useEffect, useRef } from 'react';

interface MoveListProps {
  moves: string[];
  activePly?: number; // 0 = initial position, 1 = after 1st white half-move, etc.
  onSelectPly?: (ply: number) => void;
  maxHeightClass?: string;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  activePly,
  onSelectPly,
  maxHeightClass = 'max-h-64',
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current && activePly === undefined) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length, activePly]);

  if (moves.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-[#9B9386] dark:text-[#857D70] border border-[#E6DDCE] dark:border-[#2F2B24] rounded-md bg-[#FFFFFF]/50 dark:bg-[#23201B]/50">
        No moves played yet.
      </div>
    );
  }

  const pairs: { moveNumber: number; white: string; black?: string; whitePly: number; blackPly?: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
      whitePly: i + 1,
      blackPly: moves[i + 1] ? i + 2 : undefined,
    });
  }

  return (
    <div
      ref={scrollRef}
      className={`overflow-y-auto border border-[#E6DDCE] dark:border-[#2F2B24] rounded-md bg-[#FFFFFF] dark:bg-[#23201B] ${maxHeightClass}`}
    >
      <div className="divide-y divide-[#E6DDCE]/70 dark:divide-[#2F2B24]">
        {pairs.map((row) => (
          <div key={row.moveNumber} className="grid grid-cols-[38px_1fr_1fr] text-xs font-mono tabular-nums">
            <span className="px-2 py-1.5 text-[#9B9386] dark:text-[#857D70] bg-[#EAE2D4]/45 dark:bg-[#2B2822]/45 border-r border-[#E6DDCE]/70 dark:border-[#2F2B24]">
              {row.moveNumber}.
            </span>
            <button
              type="button"
              onClick={() => onSelectPly?.(row.whitePly)}
              disabled={!onSelectPly}
              className={`text-left px-2.5 py-1.5 transition-colors ${
                activePly === row.whitePly
                  ? 'bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] font-semibold'
                  : onSelectPly
                    ? 'hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822] text-[#292720] dark:text-[#F3EBDD]'
                    : 'text-[#292720] dark:text-[#F3EBDD]'
              }`}
            >
              {row.white}
            </button>
            {row.black ? (
              <button
                type="button"
                onClick={() => row.blackPly && onSelectPly?.(row.blackPly)}
                disabled={!onSelectPly}
                className={`text-left px-2.5 py-1.5 transition-colors ${
                  activePly === row.blackPly
                    ? 'bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714] font-semibold'
                    : onSelectPly
                      ? 'hover:bg-[#EAE2D4] dark:hover:bg-[#2B2822] text-[#292720] dark:text-[#F3EBDD]'
                      : 'text-[#292720] dark:text-[#F3EBDD]'
                }`}
              >
                {row.black}
              </button>
            ) : (
              <span className="px-2.5 py-1.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
