import { createPaletteTheme } from '../themePalette';

export default createPaletteTheme(
  { id: 'solarized-dark', label: 'Solarized Dark', sortOrder: 100, isDark: true },
  {
    background: '#002b36', foreground: '#839496', comment: '#586e75', string: '#2aa198', number: '#d33682',
    keyword: '#859900', type: '#b58900', function: '#268bd2', constant: '#cb4b16', operator: '#859900',
    selection: '#073642', lineHighlight: '#073642', lineNumber: '#586e75', cursor: '#d30102',
  },
);
