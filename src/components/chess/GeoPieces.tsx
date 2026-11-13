import React from 'react';
import { PieceSetId } from '../../types/chess';

export type AnyPieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p' | 'a' | 'c';

interface ChessPieceProps {
  type: AnyPieceType;
  color: 'w' | 'b';
  pieceSet?: PieceSetId;
  className?: string;
}

export const PIECE_SET_OPTIONS: { id: PieceSetId; name: string; description: string }[] = [
  {
    id: 'geo',
    name: 'CHESS.ORG — GEO SET',
    description: 'Original architectural geometric silhouettes with crisp ivory and charcoal contrast.',
  },
  {
    id: 'classic',
    name: 'Classical Editorial',
    description: 'Refined traditional tournament profiles with balanced proportions.',
  },
  {
    id: 'monolith',
    name: 'Bauhaus Monolith',
    description: 'Ultra-minimalist faceted forms inspired by 1920s geometric chess sets.',
  },
];

export const ChessPieceSvg: React.FC<ChessPieceProps> = ({
  type,
  color,
  pieceSet = 'geo',
  className = 'w-full h-full',
}) => {
  const isWhite = color === 'w';

  if (pieceSet === 'monolith') {
    const fill = isWhite ? '#FAF5EB' : '#25231E';
    const stroke = isWhite ? '#292720' : '#D8CDBB';
    const accent = isWhite ? '#A59882' : '#9B907E';

    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        {type === 'p' && (
          <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="17" y="34" width="14" height="5" rx="1" fill={fill} />
            <polygon points="20,34 22,19 26,19 28,34" fill={fill} />
            <rect x="20.5" y="11" width="7" height="7" rx="1" fill={fill} />
          </g>
        )}
        {type === 'r' && (
          <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="13" y="34" width="22" height="5" rx="1" fill={fill} />
            <rect x="16" y="16" width="16" height="18" fill={fill} />
            <rect x="13" y="9" width="22" height="7" fill={fill} />
            <line x1="20" y1="9" x2="20" y2="13" stroke={accent} strokeWidth="2" />
            <line x1="28" y1="9" x2="28" y2="13" stroke={accent} strokeWidth="2" />
          </g>
        )}
        {type === 'n' && (
          <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="13" y="34" width="22" height="5" rx="1" fill={fill} />
            <polygon points="16,34 18,16 28,9 34,15 27,20 31,34" fill={fill} />
            <circle cx="24" cy="15" r="1.4" fill={accent} stroke="none" />
          </g>
        )}
        {type === 'b' && (
          <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="14" y="34" width="20" height="5" rx="1" fill={fill} />
            <polygon points="17,34 24,10 31,34" fill={fill} />
            <line x1="21" y1="22" x2="27" y2="17" stroke={accent} strokeWidth="2" />
          </g>
        )}
        {type === 'q' && (
          <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="12" y="34" width="24" height="5" rx="1" fill={fill} />
            <polygon points="15,34 13,14 20,21 24,10 28,21 35,14 33,34" fill={fill} />
            <circle cx="24" cy="8.5" r="2" fill={accent} stroke="none" />
          </g>
        )}
        {type === 'k' && (
          <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="12" y="34" width="24" height="5" rx="1" fill={fill} />
            <rect x="16" y="16" width="16" height="18" fill={fill} />
            <line x1="24" y1="6" x2="24" y2="15" stroke={stroke} strokeWidth="2.4" />
            <line x1="19.5" y1="10" x2="28.5" y2="10" stroke={stroke} strokeWidth="2.4" />
          </g>
        )}
        {type === 'a' && (
          <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="13" y="34" width="22" height="5" rx="1" fill={fill} />
            <polygon points="16,34 24,9 32,34" fill={fill} />
            <polygon points="21,21 27,16 27,25" fill={accent} stroke="none" />
          </g>
        )}
        {type === 'c' && (
          <g stroke={stroke} strokeWidth="1.8" strokeLinejoin="round">
            <rect x="13" y="34" width="22" height="5" rx="1" fill={fill} />
            <rect x="16" y="14" width="16" height="20" fill={fill} />
            <polygon points="16,14 24,8 32,14" fill={accent} />
          </g>
        )}
      </svg>
    );
  }

  if (pieceSet === 'classic') {
    const fill = isWhite ? '#FBF7EF' : '#26241F';
    const stroke = isWhite ? '#292720' : '#191714';
    const inner = isWhite ? '#292720' : '#E2D8C7';

    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        {type === 'p' && (
          <g stroke={stroke} strokeWidth="1.7" strokeLinejoin="round">
            <path d="M15 39h18v-3c0-2.5-3-4-5.5-5 1.8-2.2 1.8-6.2-.5-8.5 1.8-1.2 2.5-3.3 1.7-5.3-.8-2-2.8-3.2-4.7-3.2s-3.9 1.2-4.7 3.2c-.8 2-.1 4.1 1.7 5.3-2.3 2.3-2.3 6.3-.5 8.5C18 32 15 33.5 15 36v3z" fill={fill} />
            <line x1="17" y1="36" x2="31" y2="36" stroke={inner} strokeWidth="1.3" />
          </g>
        )}
        {type === 'r' && (
          <g stroke={stroke} strokeWidth="1.7" strokeLinejoin="round">
            <path d="M13 39h22v-3.5l-2.5-2V19l2-2.5V10h-4v3h-4v-3h-5v3h-4v-3h-4v6.5l2 2.5v14.5l-2.5 2V39z" fill={fill} />
            <line x1="16" y1="34" x2="32" y2="34" stroke={inner} strokeWidth="1.3" />
            <line x1="17" y1="19" x2="31" y2="19" stroke={inner} strokeWidth="1.3" />
          </g>
        )}
        {type === 'n' && (
          <g stroke={stroke} strokeWidth="1.7" strokeLinejoin="round">
            <path d="M14 39h20v-3.5c0-2-2-3.5-3.5-4.5 1.5-4.5 3-10.5 1-15.5-1.5-3.5-5-5.5-9-5.5l-1.5-2.5-2 3c-2.5.8-5 3-6.5 5.8l3.5 2.2c1.2-.8 2.6-1 3.8-.5-1.2 2.5-3 4.5-4.8 6.5l2.5 2.5c2-1.2 4-1.8 5.5-1.2-1.8 2.8-5.5 5-7 7.7V39z" fill={fill} />
            <circle cx="20.5" cy="14.5" r="1.3" fill={inner} stroke="none" />
          </g>
        )}
        {type === 'b' && (
          <g stroke={stroke} strokeWidth="1.7" strokeLinejoin="round">
            <circle cx="24" cy="9.5" r="2.3" fill={fill} />
            <path d="M14 39h20v-3c0-2-2.5-3.5-5-4.5 3-3.5 4.2-9 2.2-13.5-1.4-3-4.2-5-7.2-6-3 1-5.8 3-7.2 6-2 4.5-.8 10 2.2 13.5-2.5 1-5 2.5-5 4.5v3z" fill={fill} />
            <line x1="21" y1="24.5" x2="27" y2="18.5" stroke={inner} strokeWidth="1.8" strokeLinecap="round" />
            <line x1="17" y1="35" x2="31" y2="35" stroke={inner} strokeWidth="1.3" />
          </g>
        )}
        {type === 'q' && (
          <g stroke={stroke} strokeWidth="1.7" strokeLinejoin="round">
            <circle cx="11" cy="14" r="2" fill={fill} />
            <circle cx="17.5" cy="10.5" r="2" fill={fill} />
            <circle cx="24" cy="9" r="2.2" fill={fill} />
            <circle cx="30.5" cy="10.5" r="2" fill={fill} />
            <circle cx="37" cy="14" r="2" fill={fill} />
            <path d="M14 39h20l1-5-3-2 4-15.5-6.5 6.5L24 12l-5.5 11L12 16.5l4 15.5-3 2 1 5z" fill={fill} />
            <line x1="16" y1="34" x2="32" y2="34" stroke={inner} strokeWidth="1.3" />
          </g>
        )}
        {type === 'k' && (
          <g stroke={stroke} strokeWidth="1.7" strokeLinejoin="round">
            <line x1="24" y1="6" x2="24" y2="13" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
            <line x1="20.5" y1="9" x2="27.5" y2="9" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M14 39h20v-4c0-2-2-3.5-4.5-4.5 4-3 5.5-8 3.5-12-1.5-3-4.8-4.5-9-4.5s-7.5 1.5-9 4.5c-2 4-.5 9 3.5 12-2.5 1-4.5 2.5-4.5 4.5v4z" fill={fill} />
            <line x1="16" y1="35" x2="32" y2="35" stroke={inner} strokeWidth="1.3" />
          </g>
        )}
        {(type === 'a' || type === 'c') && (
          <g stroke={stroke} strokeWidth="1.7" strokeLinejoin="round">
            <path d="M14 39h20l-2-6V18l-8-8-8 8v15l-2 6z" fill={fill} />
            <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill={inner} stroke="none">
              {type.toUpperCase()}
            </text>
          </g>
        )}
      </svg>
    );
  }

  // DEFAULT: CHESS.ORG — GEO SET
  // Warm Ivory (#FAF5EC) with Charcoal (#292720) edge for White
  // Deep Charcoal (#25231E) with Warm Highlight (#C8BBA4) interior detail for Black
  const bodyFill = isWhite ? '#FAF5EC' : '#25231E';
  const baseAccent = isWhite ? '#EBE1CF' : '#333029';
  const outline = isWhite ? '#292720' : '#141310';
  const detailStroke = isWhite ? '#292720' : '#C8BBA4';

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* KING — Tall commanding geometric silhouette with crisp geometric crown & cross */}
      {type === 'k' && (
        <g>
          {/* Geometric cross finial */}
          <rect x="22.4" y="5" width="3.2" height="8.5" rx="0.6" fill={detailStroke} />
          <rect x="19.2" y="7.5" width="9.6" height="3" rx="0.6" fill={detailStroke} />
          {/* Crown shoulders */}
          <polygon
            points="15,15.5 20.5,12.5 27.5,12.5 33,15.5 30,21.5 18,21.5"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Tapered architectural torso */}
          <polygon
            points="18,21.5 30,21.5 32.5,33.5 15.5,33.5"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Central geometric spine */}
          <line x1="24" y1="15.5" x2="24" y2="31" stroke={detailStroke} strokeWidth="1.4" strokeLinecap="round" />
          {/* Plinth base */}
          <rect
            x="12.5"
            y="33.5"
            width="23"
            height="3.5"
            rx="0.8"
            fill={baseAccent}
            stroke={outline}
            strokeWidth="1.6"
          />
          <rect
            x="11"
            y="37"
            width="26"
            height="4"
            rx="1"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
          />
        </g>
      )}

      {/* QUEEN — Elegant geometric crown with three distinct upper peaks */}
      {type === 'q' && (
        <g>
          {/* Crown spire points */}
          <polygon
            points="12,15 17.5,22 20,12 24,20.5 28,12 30.5,22 36,15 32,33.5 16,33.5"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Delicate crown nodes */}
          <circle cx="12" cy="13.5" r="1.7" fill={bodyFill} stroke={outline} strokeWidth="1.4" />
          <circle cx="20" cy="10.2" r="1.7" fill={bodyFill} stroke={outline} strokeWidth="1.4" />
          <circle cx="28" cy="10.2" r="1.7" fill={bodyFill} stroke={outline} strokeWidth="1.4" />
          <circle cx="36" cy="13.5" r="1.7" fill={bodyFill} stroke={outline} strokeWidth="1.4" />
          <polygon points="24,18 26.2,21.5 24,25 21.8,21.5" fill={detailStroke} />
          {/* Tiered base */}
          <rect
            x="13"
            y="33.5"
            width="22"
            height="3.5"
            rx="0.8"
            fill={baseAccent}
            stroke={outline}
            strokeWidth="1.6"
          />
          <rect
            x="11.5"
            y="37"
            width="25"
            height="4"
            rx="1"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
          />
        </g>
      )}

      {/* ROOK — Strong architectural tower with rectangular battlements */}
      {type === 'r' && (
        <g>
          {/* Battlements */}
          <polygon
            points="13.5,10 17.5,10 17.5,13 21.5,13 21.5,10 26.5,10 26.5,13 30.5,13 30.5,10 34.5,10 34.5,17.5 31.5,19.5 16.5,19.5 13.5,17.5"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Solid architectural shaft */}
          <polygon
            points="16.5,19.5 31.5,19.5 32.5,33.5 15.5,33.5"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Masonry inner line */}
          <line x1="17.5" y1="24" x2="30.5" y2="24" stroke={detailStroke} strokeWidth="1.3" />
          {/* Plinth */}
          <rect
            x="13"
            y="33.5"
            width="22"
            height="3.5"
            rx="0.8"
            fill={baseAccent}
            stroke={outline}
            strokeWidth="1.6"
          />
          <rect
            x="11.5"
            y="37"
            width="25"
            height="4"
            rx="1"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
          />
        </g>
      )}

      {/* BISHOP — Tall pointed mitre with diagonal geometric slit */}
      {type === 'b' && (
        <g>
          <circle cx="24" cy="8.8" r="2.2" fill={bodyFill} stroke={outline} strokeWidth="1.6" />
          <polygon
            points="24,11.2 31.5,21 29.5,31 18.5,31 16.5,21"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Mitre diagonal cut */}
          <line
            x1="20.5"
            y1="23.5"
            x2="27.2"
            y2="17"
            stroke={detailStroke}
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          {/* Collar */}
          <rect
            x="16.5"
            y="31"
            width="15"
            height="2.6"
            rx="0.8"
            fill={baseAccent}
            stroke={outline}
            strokeWidth="1.5"
          />
          <rect
            x="12.5"
            y="33.6"
            width="23"
            height="3.4"
            rx="0.8"
            fill={baseAccent}
            stroke={outline}
            strokeWidth="1.6"
          />
          <rect
            x="11.5"
            y="37"
            width="25"
            height="4"
            rx="1"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
          />
        </g>
      )}

      {/* KNIGHT — Crisp angular faceted horse-head profile */}
      {type === 'n' && (
        <g>
          <polygon
            points="16,33.5 18.5,23 13.5,20.5 15.5,14.5 21.5,9.5 25,7.5 27.5,11 33.5,14.5 34,20.5 28.5,23.5 32.5,33.5"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          {/* Geometric mane facet & eye */}
          <polyline
            points="25,11.5 29.5,16.5 27.5,26"
            fill="none"
            stroke={detailStroke}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon points="19.5,15.5 22,14.5 21,17" fill={detailStroke} />
          {/* Base */}
          <rect
            x="13"
            y="33.5"
            width="22"
            height="3.5"
            rx="0.8"
            fill={baseAccent}
            stroke={outline}
            strokeWidth="1.6"
          />
          <rect
            x="11.5"
            y="37"
            width="25"
            height="4"
            rx="1"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
          />
        </g>
      )}

      {/* PAWN — Shorter faceted crown & tapered geometric pedestal */}
      {type === 'p' && (
        <g>
          <circle
            cx="24"
            cy="16.5"
            r="5"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
          />
          <rect
            x="19"
            y="21.8"
            width="10"
            height="2.4"
            rx="0.8"
            fill={baseAccent}
            stroke={outline}
            strokeWidth="1.5"
          />
          <polygon
            points="19.5,24.2 28.5,24.2 31,34 17,34"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <rect
            x="13.5"
            y="34"
            width="21"
            height="3"
            rx="0.8"
            fill={baseAccent}
            stroke={outline}
            strokeWidth="1.5"
          />
          <rect
            x="12"
            y="37"
            width="24"
            height="4"
            rx="1"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
          />
        </g>
      )}

      {/* ARCHBISHOP (10x10 Variant: Bishop + Knight compound) */}
      {type === 'a' && (
        <g>
          <polygon
            points="24,8 32,18 29,33.5 19,33.5 16,18"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <polygon points="24,13 28,19 24,25 20,19" fill={detailStroke} />
          <rect x="12" y="34" width="24" height="7" rx="1" fill={bodyFill} stroke={outline} strokeWidth="1.7" />
        </g>
      )}

      {/* CHANCELLOR (10x10 Variant: Rook + Knight compound) */}
      {type === 'c' && (
        <g>
          <polygon
            points="15,10 33,10 31,33.5 17,33.5"
            fill={bodyFill}
            stroke={outline}
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <rect x="20" y="15" width="8" height="8" fill={detailStroke} />
          <rect x="12" y="34" width="24" height="7" rx="1" fill={bodyFill} stroke={outline} strokeWidth="1.7" />
        </g>
      )}
    </svg>
  );
};
