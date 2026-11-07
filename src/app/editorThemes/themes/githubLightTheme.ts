import { createPaletteTheme } from '../themePalette';

export default createPaletteTheme(
  { id: 'github-light', label: 'GitHub Light', sortOrder: 60, isDark: false },
  {
    background: '#ffffff', foreground: '#24292f', comment: '#6e7781', string: '#0a3069', number: '#0550ae',
    keyword: '#cf222e', type: '#953800', function: '#8250df', constant: '#0550ae', operator: '#cf222e',
    selection: '#add6ff', lineHighlight: '#f6f8fa', lineNumber: '#8c959f', cursor: '#0969da',
  },
);
