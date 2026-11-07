import { createPaletteTheme } from '../themePalette';

export default createPaletteTheme(
  { id: 'one-dark', label: 'One Dark', sortOrder: 90, isDark: true },
  {
    background: '#282c34', foreground: '#abb2bf', comment: '#5c6370', string: '#98c379', number: '#d19a66',
    keyword: '#c678dd', type: '#e5c07b', function: '#61afef', constant: '#d19a66', operator: '#56b6c2',
    selection: '#3e4451', lineHighlight: '#2c313c', lineNumber: '#4b5263', cursor: '#528bff',
  },
);
