import type { EditorThemeDefinition } from './editorTheme';

/** Bảng màu rút gọn; mọi màu là hex 6 ký tự (#rrggbb), riêng lineHighlight có thể có thêm kênh alpha. */
export interface ThemePalette {
  background: string;
  foreground: string;
  comment: string;
  string: string;
  number: string;
  keyword: string;
  type: string;
  function: string;
  constant: string;
  operator: string;
  selection: string;
  lineHighlight: string;
  lineNumber: string;
  cursor: string;
}

export interface ThemeMeta {
  id: string;
  label: string;
  sortOrder: number;
  isDark: boolean;
}

const withoutHash = (color: string): string => color.replace('#', '');

/** Dựng theme Monaco đầy đủ (màu cú pháp + giao diện editor) từ một bảng màu. */
export function createPaletteTheme(meta: ThemeMeta, palette: ThemePalette): EditorThemeDefinition {
  const rule = (token: string, color: string, fontStyle?: string) => ({ token, foreground: withoutHash(color), ...(fontStyle ? { fontStyle } : {}) });

  return {
    ...meta,
    uiBackground: palette.background,
    uiForeground: palette.foreground,
    monacoTheme: {
      base: meta.isDark ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: withoutHash(palette.foreground), background: withoutHash(palette.background) },
        rule('comment', palette.comment, 'italic'),
        rule('string', palette.string),
        rule('regexp', palette.string),
        rule('string.escape', palette.constant),
        rule('number', palette.number),
        rule('keyword', palette.keyword),
        rule('tag', palette.keyword),
        rule('type', palette.type),
        rule('annotation', palette.type),
        rule('predefined', palette.function),
        rule('attribute.name', palette.function),
        rule('constant', palette.constant),
        rule('operator', palette.operator),
        rule('delimiter', palette.foreground),
      ],
      colors: {
        'editor.background': palette.background,
        'editor.foreground': palette.foreground,
        'editor.lineHighlightBackground': palette.lineHighlight,
        'editor.selectionBackground': palette.selection,
        'editor.inactiveSelectionBackground': `${palette.selection.slice(0, 7)}88`,
        'editorCursor.foreground': palette.cursor,
        'editorLineNumber.foreground': palette.lineNumber,
        'editorLineNumber.activeForeground': palette.foreground,
        'editorIndentGuide.background1': `${palette.foreground}22`,
        'editorIndentGuide.activeBackground1': `${palette.foreground}55`,
        'editorWidget.background': palette.background,
        'editorSuggestWidget.background': palette.background,
        'scrollbarSlider.background': `${palette.foreground}33`,
        'scrollbarSlider.hoverBackground': `${palette.foreground}55`,
      },
    },
  };
}
