import { BoardThemeId } from '../../types/chess';

export interface BoardThemePalette {
  id: BoardThemeId;
  name: string;
  description: string;
  lightSquare: string;
  darkSquare: string;
  lightCoord: string;
  darkCoord: string;
  selectedSquare: string;
  lastMoveLight: string;
  lastMoveDark: string;
  checkHighlight: string;
  borderFrame: string;
  legalDot: string;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardThemePalette> = {
  ivory: {
    id: 'ivory',
    name: 'Ivory',
    description: 'Warm ivory and muted taupe — the Chess.org signature board.',
    lightSquare: '#F4EDE0',
    darkSquare: '#B7A791',
    lightCoord: '#8C7C67',
    darkCoord: '#F4EDE0',
    selectedSquare: 'rgba(180, 132, 62, 0.45)',
    lastMoveLight: '#E7D8B7',
    lastMoveDark: '#A89472',
    checkHighlight: 'rgba(155, 34, 38, 0.55)',
    borderFrame: '#CBBFA9',
    legalDot: 'rgba(41, 39, 32, 0.25)',
  },
  graphite: {
    id: 'graphite',
    name: 'Graphite',
    description: 'Warm stone and deep charcoal slate for focused study.',
    lightSquare: '#DCD8D0',
    darkSquare: '#6E6B64',
    lightCoord: '#56534C',
    darkCoord: '#DCD8D0',
    selectedSquare: 'rgba(192, 148, 76, 0.45)',
    lastMoveLight: '#CFC7B2',
    lastMoveDark: '#7C745D',
    checkHighlight: 'rgba(175, 42, 46, 0.6)',
    borderFrame: '#58554F',
    legalDot: 'rgba(28, 27, 24, 0.28)',
  },
  slate: {
    id: 'slate',
    name: 'Slate',
    description: 'Cool mineral mist paired with muted blue-gray slate.',
    lightSquare: '#E4E7E8',
    darkSquare: '#76858F',
    lightCoord: '#57646D',
    darkCoord: '#E4E7E8',
    selectedSquare: 'rgba(84, 128, 152, 0.45)',
    lastMoveLight: '#CFDADF',
    lastMoveDark: '#6A8392',
    checkHighlight: 'rgba(165, 40, 44, 0.58)',
    borderFrame: '#64727B',
    legalDot: 'rgba(32, 42, 49, 0.26)',
  },
  'classic-green': {
    id: 'classic-green',
    name: 'Classic Green',
    description: 'Tournament cream and restrained forest sage.',
    lightSquare: '#EEEED2',
    darkSquare: '#6B8860',
    lightCoord: '#506A46',
    darkCoord: '#EEEED2',
    selectedSquare: 'rgba(196, 174, 72, 0.48)',
    lastMoveLight: '#E1E3A9',
    lastMoveDark: '#7C985A',
    checkHighlight: 'rgba(166, 38, 42, 0.6)',
    borderFrame: '#5A7350',
    legalDot: 'rgba(35, 45, 30, 0.26)',
  },
  'warm-sand': {
    id: 'warm-sand',
    name: 'Warm Sand',
    description: 'Sunlit travertine and roasted walnut wood tones.',
    lightSquare: '#F1E3CE',
    darkSquare: '#A67C58',
    lightCoord: '#7D5B3E',
    darkCoord: '#F1E3CE',
    selectedSquare: 'rgba(186, 126, 48, 0.48)',
    lastMoveLight: '#E6CFA7',
    lastMoveDark: '#9A7243',
    checkHighlight: 'rgba(155, 34, 38, 0.58)',
    borderFrame: '#8D6747',
    legalDot: 'rgba(48, 34, 20, 0.26)',
  },
};
