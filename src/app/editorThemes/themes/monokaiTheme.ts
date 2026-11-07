import { createPaletteTheme } from '../themePalette';

export default createPaletteTheme(
  { id: 'monokai', label: 'Monokai', sortOrder: 80, isDark: true },
  {
    background: '#272822', foreground: '#f8f8f2', comment: '#75715e', string: '#e6db74', number: '#ae81ff',
    keyword: '#f92672', type: '#66d9ef', function: '#a6e22e', constant: '#ae81ff', operator: '#f92672',
    selection: '#49483e', lineHighlight: '#3e3d32', lineNumber: '#90908a', cursor: '#f8f8f0',
  },
);
