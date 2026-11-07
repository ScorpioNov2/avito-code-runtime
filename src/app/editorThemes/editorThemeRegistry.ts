import { builtInEditorThemes } from './builtInEditorThemes';
import type { EditorThemeDefinition } from './editorTheme';

export const DEFAULT_EDITOR_THEME_ID = 'vs';

// Tự động nạp mọi file themes/*Theme.ts: thêm theme mới chỉ cần tạo file mới (OCP).
const themeModules = import.meta.glob<{ default: EditorThemeDefinition }>('./themes/*Theme.ts', { eager: true });

const allThemes = [...builtInEditorThemes, ...Object.values(themeModules).map((themeModule) => themeModule.default)].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

const themesById = new Map<string, EditorThemeDefinition>();
for (const theme of allThemes) {
  if (themesById.has(theme.id)) throw new Error(`Duplicate editor theme id "${theme.id}"`);
  themesById.set(theme.id, theme);
}

export function getAllEditorThemes(): EditorThemeDefinition[] {
  return allThemes;
}

export function hasEditorTheme(themeId: unknown): themeId is string {
  return typeof themeId === 'string' && themesById.has(themeId);
}

/** Trả về theme theo id; id lạ (ví dụ cấu hình cũ) thì dùng theme mặc định. */
export function getEditorTheme(themeId: string): EditorThemeDefinition {
  return themesById.get(themeId) ?? themesById.get(DEFAULT_EDITOR_THEME_ID)!;
}
