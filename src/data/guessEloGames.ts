export interface GuessEloCase {
  id: string;
  title: string;
  pgn: string;
  actualElo: number;
  timeControl: string;
  opening: string;
  clues: string[];
  breakdown: string;
}

export const GUESS_ELO_CASES: GuessEloCase[] = [
  {
    id: 'elo-case-1',
    title: 'Foolhardy Flank Push',
    actualElo: 780,
    timeControl: '10+0 Rapid',
    opening: 'Irregular Opening',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 h6 4. Nc3 a6 5. d3 Bc5 6. O-O d6 7. Be3 Bxe3 8. fxe3 Nf6 9. d4 exd4 10. exd4 O-O 11. e5 dxe5 12. dxe5 Qxd1 13. Raxd1 Ng4 14. Rfe1',
    clues: [
      'Notice the early flank pawn pushes (3...h6, 4...a6) without central justification.',
      'Both sides castle safely before trading queens in the center.',
      'Black develops the knight into an active outpost on g4.',
    ],
    breakdown:
      'Around 750–850 Elo: players know basic castling and development, but spend early tempi on unnecessary rim pawn moves (h6/a6) rather than contesting the center.',
  },
  {
    id: 'elo-case-2',
    title: 'Sharp Italian Skirmish',
    actualElo: 1420,
    timeControl: '5+0 Blitz',
    opening: 'Italian Game (Giuoco Piano)',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Nce7 11. O-O O-O 12. Rfe1 c6 13. Ne4',
    clues: [
      'Book theory through move 8 (c3, d4, Bb4+, Bd2, d5 central break).',
      'Clean recapture coordination and central outpost play.',
      'Consistent piece placement toward the d4/e4/c5 squares.',
    ],
    breakdown:
      'Around 1400 Elo: solid knowledge of Italian Game theory (6...Bb4+ 7.Bd2 Bxd2+ 8.Nbxd2 d5!), sensible recaptures, and timely castling.',
  },
  {
    id: 'elo-case-3',
    title: 'Premature Queen Raid',
    actualElo: 550,
    timeControl: '3+2 Blitz',
    opening: 'Wayward Queen Attack',
    pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 g6 4. Qf3 Nf6 5. d3 Nd4 6. Qd1 d5 7. exd5 Nxd5 8. c3 Nc6 9. Qf3 Be6',
    clues: [
      'Early 2.Qh5 Scholar’s Mate attempt.',
      'Black defends accurately with 3...g6 and 4...Nf6.',
      'White’s Queen gets chased back to d1 after losing multiple tempi.',
    ],
    breakdown:
      'Around 500–650 Elo: classic Wayward Queen opening on White’s side, though Black shows decent defensive awareness against the immediate mate threat.',
  },
  {
    id: 'elo-case-4',
    title: "Queen's Gambit Structure",
    actualElo: 1780,
    timeControl: '15+10 Rapid',
    opening: "Queen's Gambit Declined",
    pgn: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7 7. Rc1 c6 8. Bd3 dxc4 9. Bxc4 Nd5 10. Bxe7 Qxe7 11. O-O Nxc3 12. Rxc3 e5',
    clues: [
      'Classical Capablanca freeing maneuver (9...Nd5 10.Bxe7 Qxe7 11...Nxc3 12...e5!).',
      'Disciplined Rook placement on c1 before moving the f1 Bishop.',
      'Zero wasted pawn moves; purposeful central break with ...e5.',
    ],
    breakdown:
      'Around 1750–1850 Elo: demonstrates genuine positional understanding of the QGD Capablanca freeing plan and patient move-order finesse (7.Rc1 waiting for ...dxc4).',
  },
];
