import type { EditorThemeDefinition } from './editorThemes/editorTheme';

/**
 * Đổi màu phần khung ngoài editor (thanh trên, terminal, thanh dưới, popup) theo theme đang chọn.
 * styles.css tự suy ra các màu phụ (viền, nền nhạt...) từ --bg và --text.
 */
export function applyChromeTheme(theme: EditorThemeDefinition): void {
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--bg', theme.uiBackground);
  rootStyle.setProperty('--text', theme.uiForeground);
  rootStyle.colorScheme = theme.isDark ? 'dark' : 'light';
}
