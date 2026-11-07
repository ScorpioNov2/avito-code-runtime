import { createPaletteTheme } from '../themePalette';

export default createPaletteTheme(
  { id: 'github-dark', label: 'GitHub Dark', sortOrder: 50, isDark: true },
  {
    background: '#0d1117', foreground: '#c9d1d9', comment: '#8b949e', string: '#a5d6ff', number: '#79c0ff',
    keyword: '#ff7b72', type: '#ffa657', function: '#d2a8ff', constant: '#79c0ff', operator: '#ff7b72',
    selection: '#1f3a5f', lineHighlight: '#161b22', lineNumber: '#6e7681', cursor: '#58a6ff',
  },
);
