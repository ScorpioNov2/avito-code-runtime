import type { EditorThemeDefinition } from './editorTheme';

/** Bốn theme có sẵn trong Monaco: chỉ cần khai báo id và màu cho phần khung ngoài. */
export const builtInEditorThemes: EditorThemeDefinition[] = [
  { id: 'vs-dark', label: 'Visual Studio Dark', sortOrder: 10, isDark: true, uiBackground: '#1e1e1e', uiForeground: '#d4d4d4' },
  { id: 'vs', label: 'Visual Studio', sortOrder: 20, isDark: false, uiBackground: '#ffffff', uiForeground: '#1f2937' },
  { id: 'hc-black', label: 'High Contrast Dark', sortOrder: 30, isDark: true, uiBackground: '#000000', uiForeground: '#ffffff' },
  { id: 'hc-light', label: 'High Contrast Light', sortOrder: 40, isDark: false, uiBackground: '#ffffff', uiForeground: '#292929' },
];
