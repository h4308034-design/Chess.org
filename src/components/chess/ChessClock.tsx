import React from 'react';

interface ChessClockProps {
  timeMs: number;
  isActive: boolean;
  label: string;
  rating?: number;
  subtitle?: string;
  color: 'w' | 'b';
}

export function formatClockMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (clamped < 10000) {
    const tenths = Math.floor((clamped % 1000) / 100);
    return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const ChessClock: React.FC<ChessClockProps> = ({
  timeMs,
  isActive,
  label,
  rating,
  subtitle,
  color,
}) => {
  const isLowTime = timeMs > 0 && timeMs < 20000;

  return (
    <div
      className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md border transition-colors ${
        isActive
          ? 'bg-[#FFFFFF] dark:bg-[#23201B] border-[#292720] dark:border-[#C8BBA4]'
          : 'bg-[#EAE2D4]/70 dark:bg-[#2B2822]/60 border-[#D8CDBB] dark:border-[#3B362E]'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`w-3.5 h-3.5 rounded-[3px] border shrink-0 ${
            color === 'w'
              ? 'bg-[#FAF5EC] border-[#292720]'
              : 'bg-[#25231E] border-[#756F63]'
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-[#292720] dark:text-[#F3EBDD] truncate">
              {label}
            </span>
            {typeof rating === 'number' && (
              <span className="text-xs font-mono tabular-nums text-[#756F63] dark:text-[#B8B0A2]">
                ({rating})
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-[#756F63] dark:text-[#9B9386] truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div
        className={`px-3 py-1 rounded-[4px] font-mono text-base font-semibold tabular-nums tracking-tight shrink-0 ${
          isLowTime && isActive
            ? 'bg-[#9B2226] text-[#F3EBDD]'
            : isActive
              ? 'bg-[#292720] text-[#F3EBDD] dark:bg-[#F3EBDD] dark:text-[#191714]'
              : 'bg-[#DFD5C5] text-[#5D574C] dark:bg-[#1E1C18] dark:text-[#9B9386]'
        }`}
      >
        {formatClockMs(timeMs)}
      </div>
    </div>
  );
};
