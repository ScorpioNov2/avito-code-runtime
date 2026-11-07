export const EDITOR_THEMES = [
  { id: 'vs', label: 'Light (vs)' },
  { id: 'vs-dark', label: 'Dark (vs-dark)' },
  { id: 'hc-black', label: 'High contrast dark (hc-black)' },
  { id: 'hc-light', label: 'High contrast light (hc-light)' },
] as const;

export type EditorThemeName = (typeof EDITOR_THEMES)[number]['id'];

export interface UserPreferences {
  displayName: string;
  editorTheme: EditorThemeName;
  fontSize: number;
}

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 40;
const MAX_NAME_LENGTH = 24;
const STORAGE_KEY = 'avito-code:preferences';

export function isDarkTheme(theme: EditorThemeName): boolean {
  return theme === 'vs-dark' || theme === 'hc-black';
}

function isEditorThemeName(value: unknown): value is EditorThemeName {
  return EDITOR_THEMES.some((theme) => theme.id === value);
}

function createDefaultPreferences(): UserPreferences {
  return {
    displayName: `Guest-${Math.floor(1000 + Math.random() * 9000)}`,
    editorTheme: 'vs', // mặc định: theme sáng giống VS Code
    fontSize: 14,
  };
}

function loadPreferences(): UserPreferences {
  const defaults = createDefaultPreferences();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<UserPreferences>;
    return {
      displayName: typeof saved.displayName === 'string' && saved.displayName.trim() ? saved.displayName.slice(0, MAX_NAME_LENGTH) : defaults.displayName,
      editorTheme: isEditorThemeName(saved.editorTheme) ? saved.editorTheme : defaults.editorTheme,
      fontSize: Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Number(saved.fontSize) || defaults.fontSize)),
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
    next.fontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(Number(next.fontSize)) || this.current.fontSize));
    if (!isEditorThemeName(next.editorTheme)) next.editorTheme = this.current.editorTheme;

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
