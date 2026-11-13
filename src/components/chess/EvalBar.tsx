import React from 'react';

interface EvalBarProps {
  evalCp: number; // White's perspective
  mateIn?: number | null;
  orientation?: 'w' | 'b';
}

export const EvalBar: React.FC<EvalBarProps> = ({
  evalCp,
  mateIn = null,
  orientation = 'w',
}) => {
  // Sigmoid mapping of centipawns to 5%-95% white height
  const whitePct =
    mateIn !== null
      ? mateIn > 0
        ? 98
        : 2
      : Math.max(4, Math.min(96, 50 + 46 * (2 / (1 + Math.exp(-0.004 * evalCp)) - 1)));

  const displayLabel =
    mateIn !== null
      ? `M${Math.abs(mateIn)}`
      : `${evalCp >= 0 ? '+' : ''}${(evalCp / 100).toFixed(1)}`;

  const whiteAtBottom = orientation === 'w';

  return (
    <div
      className="flex flex-col items-center gap-1 shrink-0"
      aria-label={`Engine evaluation ${displayLabel}`}
    >
      <div className="relative w-6 h-[320px] sm:h-[420px] rounded-[4px] overflow-hidden border border-[#D8CDBB] dark:border-[#3B362E] bg-[#292720] flex flex-col">
        {whiteAtBottom ? (
          <>
            <div
              className="w-full bg-[#292720] transition-all duration-300"
              style={{ height: `${100 - whitePct}%` }}
            />
            <div
              className="w-full bg-[#FAF5EC] transition-all duration-300"
              style={{ height: `${whitePct}%` }}
            />
          </>
        ) : (
          <>
            <div
              className="w-full bg-[#FAF5EC] transition-all duration-300"
              style={{ height: `${whitePct}%` }}
            />
            <div
              className="w-full bg-[#292720] transition-all duration-300"
              style={{ height: `${100 - whitePct}%` }}
            />
          </>
        )}
      </div>
      <span className="text-[11px] font-mono tabular-nums font-semibold text-[#292720] dark:text-[#F3EBDD]">
        {displayLabel}
      </span>
    </div>
  );
};
