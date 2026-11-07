import { createPaletteTheme } from '../themePalette';

export default createPaletteTheme(
  { id: 'solarized-light', label: 'Solarized Light', sortOrder: 110, isDark: false },
  {
    background: '#fdf6e3', foreground: '#657b83', comment: '#93a1a1', string: '#2aa198', number: '#d33682',
    keyword: '#859900', type: '#b58900', function: '#268bd2', constant: '#cb4b16', operator: '#859900',
    selection: '#eee8d5', lineHighlight: '#eee8d5', lineNumber: '#93a1a1', cursor: '#657b83',
  },
);
