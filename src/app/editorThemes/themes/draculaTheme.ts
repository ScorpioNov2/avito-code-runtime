import { createPaletteTheme } from '../themePalette';

export default createPaletteTheme(
  { id: 'dracula', label: 'Dracula', sortOrder: 70, isDark: true },
  {
    background: '#282a36', foreground: '#f8f8f2', comment: '#6272a4', string: '#f1fa8c', number: '#bd93f9',
    keyword: '#ff79c6', type: '#8be9fd', function: '#50fa7b', constant: '#bd93f9', operator: '#ff79c6',
    selection: '#44475a', lineHighlight: '#44475a66', lineNumber: '#6272a4', cursor: '#f8f8f0',
  },
);
