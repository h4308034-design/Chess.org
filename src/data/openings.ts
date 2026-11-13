import { OpeningData } from '../types/chess';

export const OPENINGS: OpeningData[] = [
  {
    id: 'ruy-lopez',
    eco: 'C60',
    name: 'Ruy Lopez (Spanish Opening)',
    family: 'King’s Pawn Game (1.e4 e5)',
    description:
      'One of the oldest and richest openings in chess history. White develops swiftly and puts indirect pressure on Black’s central e5 pawn via the c6 knight.',
    startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    mainLine: [
      {
        san: 'e4',
        evalCp: 25,
        annotation: 'Claims central space and opens diagonals for the Queen and light-squared Bishop.',
        candidates: [
          { san: 'e4', evalCp: 25, note: 'Sharp central control' },
          { san: 'd4', evalCp: 28, note: 'Solid Queen’s Pawn alternative' },
          { san: 'c4', evalCp: 18, note: 'English flank control' },
        ],
      },
      {
        san: 'e5',
        evalCp: 22,
        annotation: 'Black mirrors White’s central claim and contests the d4 square.',
        candidates: [
          { san: 'e5', evalCp: 22, note: 'Classical symmetrical reply' },
          { san: 'c5', evalCp: 20, note: 'Sicilian Defense — asymmetrical' },
          { san: 'e6', evalCp: 28, note: 'French Defense — solid chain' },
        ],
      },
      {
        san: 'Nf3',
        evalCp: 28,
        annotation: 'Develops with tempo by attacking the undefended e5 pawn.',
        candidates: [
          { san: 'Nf3', evalCp: 28, note: 'Most principled developing move' },
          { san: 'Nc3', evalCp: 12, note: 'Vienna Game' },
        ],
      },
      {
        san: 'Nc6',
        evalCp: 25,
        annotation: 'Defends e5 naturally while developing a minor piece toward the center.',
        candidates: [
          { san: 'Nc6', evalCp: 25, note: 'Standard classical defense' },
          { san: 'Nf6', evalCp: 26, note: 'Petrov Defense — counterattack e4' },
        ],
      },
      {
        san: 'Bb5',
        evalCp: 32,
        annotation: 'Defines the Ruy Lopez: pins or threatens the defender of e5 and prepares kingside castling.',
        candidates: [
          { san: 'Bb5', evalCp: 32, note: 'Ruy Lopez — enduring strategic pressure' },
          { san: 'Bc4', evalCp: 22, note: 'Italian Game — targeting f7' },
          { san: 'd4', evalCp: 18, note: 'Scotch Game — immediate central break' },
        ],
      },
      {
        san: 'a6',
        evalCp: 30,
        annotation: 'Morphy Defense: questions the Bishop immediately without committing central pawns.',
        candidates: [
          { san: 'a6', evalCp: 30, note: 'Morphy Defense (most popular)' },
          { san: 'Nf6', evalCp: 32, note: 'Berlin Defense — rock-solid endgame focus' },
        ],
      },
      {
        san: 'Ba4',
        evalCp: 31,
        annotation: 'Preserves the Spanish Bishop along the a4-e8 diagonal.',
      },
      {
        san: 'Nf6',
        evalCp: 28,
        annotation: 'Develops the kingside Knight and counterattacks White’s e4 pawn.',
      },
    ],
    variations: [
      {
        name: 'Berlin Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'],
        note: 'Solid championship weapon leading to complex queenless middlegames.',
      },
      {
        name: 'Exchange Variation',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Bxc6', 'dxc6'],
        note: 'Trades the Bishop to damage Black’s queenside structure in exchange for the Bishop pair.',
      },
    ],
  },
  {
    id: 'sicilian-najdorf',
    eco: 'B90',
    name: 'Sicilian Defense (Najdorf)',
    family: 'Semi-Open Game (1.e4 c5)',
    description:
      'The premier asymmetrical counterattacking system against 1.e4. Black trades a flank c-pawn for White’s central d-pawn and fights for dynamic queenside play.',
    startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    mainLine: [
      {
        san: 'e4',
        evalCp: 25,
        annotation: 'Establishes central presence.',
      },
      {
        san: 'c5',
        evalCp: 22,
        annotation: 'Asymmetrically contests the d4 square and avoids symmetrical pawn structures.',
        candidates: [
          { san: 'c5', evalCp: 22, note: 'Dynamic imbalance' },
          { san: 'e5', evalCp: 24, note: 'Open Game' },
        ],
      },
      {
        san: 'Nf3',
        evalCp: 26,
        annotation: 'Prepares the d4 central break.',
      },
      {
        san: 'd6',
        evalCp: 28,
        annotation: 'Supports e5 and keeps White’s pieces out of e5.',
      },
      {
        san: 'd4',
        evalCp: 32,
        annotation: 'Opens the center to create active piece play.',
      },
      {
        san: 'cxd4',
        evalCp: 30,
        annotation: 'Gives Black a half-open c-file for future Rook pressure.',
      },
      {
        san: 'Nxd4',
        evalCp: 30,
        annotation: 'Centralizes the Knight.',
      },
      {
        san: 'Nf6',
        evalCp: 28,
        annotation: 'Attacks e4 immediately, forcing Nc3.',
      },
      {
        san: 'Nc3',
        evalCp: 30,
        annotation: 'Defends e4 and reinforces d5.',
      },
      {
        san: 'a6',
        evalCp: 32,
        annotation: 'The Najdorf hallmark: prevents Bb5/Nb5 and prepares ...e5 or ...b5 expansion.',
      },
    ],
    variations: [
      {
        name: 'English Attack',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3'],
        note: 'White castles queenside and launches a g4-h4 pawn storm.',
      },
      {
        name: 'Dragon Setup',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'],
        note: 'Fianchettoes the dark-squared Bishop onto the long h8-a1 diagonal.',
      },
    ],
  },
  {
    id: 'queens-gambit',
    eco: 'D30',
    name: "Queen's Gambit Declined",
    family: "Queen's Pawn Game (1.d4 d5)",
    description:
      'A foundational classical duel for central control. White offers the c4 wing pawn to deflect Black’s central d5 pawn.',
    startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    mainLine: [
      {
        san: 'd4',
        evalCp: 28,
        annotation: 'Controls e5 and c5 while opening the dark-squared Bishop’s path.',
      },
      {
        san: 'd5',
        evalCp: 25,
        annotation: 'Stakes an equal share of the center and prevents White from playing e4.',
      },
      {
        san: 'c4',
        evalCp: 30,
        annotation: 'Attacks Black’s d5 anchor from the flank.',
        candidates: [
          { san: 'c4', evalCp: 30, note: "Queen's Gambit — highest pressure" },
          { san: 'Bf4', evalCp: 16, note: 'London System — solid structure' },
        ],
      },
      {
        san: 'e6',
        evalCp: 28,
        annotation: 'Reinforces d5 with a pawn and opens the dark-squared Bishop, accepting a slightly passive light-squared Bishop.',
        candidates: [
          { san: 'e6', evalCp: 28, note: "Queen's Gambit Declined" },
          { san: 'c6', evalCp: 26, note: 'Slav Defense — keeps c8 Bishop free' },
          { san: 'dxc4', evalCp: 34, note: "Queen's Gambit Accepted" },
        ],
      },
      {
        san: 'Nc3',
        evalCp: 30,
        annotation: 'Increases pressure on d5 and supports a future e4 advance.',
      },
      {
        san: 'Nf6',
        evalCp: 28,
        annotation: 'Develops naturally and controls e4.',
      },
    ],
    variations: [
      {
        name: 'Slav Defense',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4'],
        note: 'Supports d5 with c6 so the c8 Bishop can develop outside the pawn chain.',
      },
      {
        name: 'Tarrasch Defense',
        moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'c5'],
        note: 'Active central counterplay accepting an isolated Queen’s pawn for piece activity.',
      },
    ],
  },
  {
    id: 'italian-game',
    eco: 'C50',
    name: 'Italian Game (Giuoco Piano)',
    family: 'King’s Pawn Game (1.e4 e5)',
    description:
      'Direct classical development aiming the Bishop straight at f7 while preparing c3 and d4 for central dominance.',
    startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    mainLine: [
      { san: 'e4', evalCp: 25, annotation: 'Opens central lines.' },
      { san: 'e5', evalCp: 22, annotation: 'Matches central space.' },
      { san: 'Nf3', evalCp: 28, annotation: 'Attacks e5.' },
      { san: 'Nc6', evalCp: 25, annotation: 'Defends e5.' },
      {
        san: 'Bc4',
        evalCp: 24,
        annotation: 'Targets the vulnerable f7 square and controls the a2-g8 diagonal.',
      },
      {
        san: 'Bc5',
        evalCp: 22,
        annotation: 'Giuoco Piano: symmetrically eyes f2 and controls d4.',
      },
      {
        san: 'c3',
        evalCp: 25,
        annotation: 'Prepares a broad d4 pawn center.',
      },
      {
        san: 'Nf6',
        evalCp: 22,
        annotation: 'Counterattacks e4 before White consolidates.',
      },
    ],
    variations: [
      {
        name: 'Two Knights Defense',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5'],
        note: 'Sharp tactical struggle over the f7 square.',
      },
      {
        name: 'Evans Gambit',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'b4', 'Bxb4', 'c3'],
        note: 'Sacrifices the b4 pawn for rapid central build-up and open diagonals.',
      },
    ],
  },
  {
    id: 'french-defense',
    eco: 'C00',
    name: 'French Defense',
    family: 'Semi-Open Game (1.e4 e6)',
    description:
      'A resilient counterattacking defense where Black builds a sturdy d5-e6 chain and immediately challenges White’s pawn center with ...c5.',
    startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    mainLine: [
      { san: 'e4', evalCp: 25, annotation: 'Claims the center.' },
      { san: 'e6', evalCp: 28, annotation: 'Prepares ...d5 with pawn support.' },
      { san: 'd4', evalCp: 32, annotation: 'Establishes the classic two-pawn center.' },
      { san: 'd5', evalCp: 30, annotation: 'Strikes directly at White’s e4 pawn.' },
      {
        san: 'Nc3',
        evalCp: 32,
        annotation: 'Defends e4 while developing a queenside piece.',
        candidates: [
          { san: 'Nc3', evalCp: 32, note: 'Classical main line' },
          { san: 'Nd2', evalCp: 26, note: 'Tarrasch Variation — avoids Bb4 pin' },
          { san: 'e5', evalCp: 20, note: 'Advance Variation — locks the center' },
        ],
      },
      {
        san: 'Bb4',
        evalCp: 30,
        annotation: 'Winawer Variation: pins the c3 Knight and renews pressure on e4.',
      },
    ],
    variations: [
      {
        name: 'Advance Variation',
        moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6'],
        note: 'Fixed pawn chains leading to sharp flank attacks on opposite wings.',
      },
    ],
  },
];
