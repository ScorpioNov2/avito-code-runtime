import { DEFAULT_EDITOR_THEME_ID, hasEditorTheme } from './editorThemes/editorThemeRegistry';

export interface UserPreferences {
  displayName: string;
  /** Id của theme (xem editorThemes/). */
  editorTheme: string;
  fontSize: number;
  /** Hiện tên người khác trên con trỏ của họ. Tắt đi nếu nhãn tên che mất code đang đọc. */
  showRemoteNames: boolean;
}

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 40;
const MAX_NAME_LENGTH = 24;
const STORAGE_KEY = 'avito-code:preferences';

function createDefaultPreferences(): UserPreferences {
  return {
    displayName: `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
    editorTheme: DEFAULT_EDITOR_THEME_ID, // mặc định: theme sáng giống VS Code
    fontSize: 14,
    showRemoteNames: true,
  };
}

function clampFontSize(value: number, fallback: number): number {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(Number(value)) || fallback));
}

function loadPreferences(): UserPreferences {
  const defaults = createDefaultPreferences();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<UserPreferences>;
    return {
      displayName: typeof saved.displayName === 'string' && saved.displayName.trim() ? saved.displayName.slice(0, MAX_NAME_LENGTH) : defaults.displayName,
      editorTheme: hasEditorTheme(saved.editorTheme) ? saved.editorTheme : defaults.editorTheme,
      fontSize: clampFontSize(saved.fontSize ?? defaults.fontSize, defaults.fontSize),
      showRemoteNames: typeof saved.showRemoteNames === 'boolean' ? saved.showRemoteNames : defaults.showRemoteNames,
    };
  } catch {
    return defaults;
  }
}

/** Cấu hình riêng của từng người (tên, theme, cỡ chữ) — lưu local, không đồng bộ qua phòng. */
export class PreferenceStore {
  private current = loadPreferences();
  private readonly listeners = new Set<(preferences: UserPreferences) => void>();

  constructor() {
    this.persist();
  }

  get value(): UserPreferences {
    return this.current;
  }

  update(changes: Partial<UserPreferences>): void {
    const next = { ...this.current, ...changes };
    next.displayName = next.displayName.trim().slice(0, MAX_NAME_LENGTH) || this.current.displayName;
    next.fontSize = clampFontSize(next.fontSize, this.current.fontSize);
    if (!hasEditorTheme(next.editorTheme)) next.editorTheme = this.current.editorTheme;

    this.current = next;
    this.persist();
    this.listeners.forEach((listener) => listener(next));
  }

  subscribe(listener: (preferences: UserPreferences) => void): void {
    this.listeners.add(listener);
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
    } catch {
      // Trình duyệt chặn localStorage: bỏ qua, app vẫn chạy bình thường.
    }
  }
}
