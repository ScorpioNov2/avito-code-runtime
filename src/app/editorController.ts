import * as monaco from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';
import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';
import { throttleWithAnimationFrame } from '../utils/frameThrottle';
import type { EditorThemeDefinition } from './editorThemes/editorTheme';

export interface EditorOptions {
  languageId: string;
  theme: string;
  fontSize: number;
}

/** Bọc Monaco Editor: các phần khác của app không cần biết chi tiết API của Monaco. */
export class EditorController {
  private readonly editor: monaco.editor.IStandaloneCodeEditor;
  private readonly requestLayout = throttleWithAnimationFrame(() => this.layoutNow());

  /** Đăng ký các theme tuỳ chỉnh với Monaco. Gọi một lần trước khi tạo editor. */
  static registerThemes(themes: EditorThemeDefinition[]): void {
    for (const theme of themes) {
      if (theme.monacoTheme) monaco.editor.defineTheme(theme.id, theme.monacoTheme);
    }
  }

  constructor(host: HTMLElement, options: EditorOptions) {
    this.editor = monaco.editor.create(host, {
      language: options.languageId,
      theme: options.theme,
      fontSize: options.fontSize,
      automaticLayout: false, // tự gọi layout() để kiểm soát bằng rAF
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      tabSize: 4,
      insertSpaces: true,
      padding: { top: 12 },
      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
    });

    // Đổi cỡ cửa sổ / bật tắt terminal => vẽ lại editor, tối đa 1 lần mỗi frame.
    new ResizeObserver(() => this.requestLayout()).observe(host);
  }

  /** Nối nội dung editor với Y.Text dùng chung để đồng bộ chữ + con trỏ theo thời gian thực. */
  bindToSharedText(sharedText: Y.Text, awareness: Awareness): void {
    const model = this.editor.getModel();
    if (!model) throw new Error('Editor model is not ready.');
    new MonacoBinding(sharedText, model, new Set([this.editor]), awareness);
  }

  setLanguage(languageId: string): void {
    const model = this.editor.getModel();
    if (model) monaco.editor.setModelLanguage(model, languageId);
  }

  setTheme(theme: string): void {
    monaco.editor.setTheme(theme);
  }

  setFontSize(fontSize: number): void {
    this.editor.updateOptions({ fontSize });
  }

  getCode(): string {
    return this.editor.getValue();
  }

  addRunShortcut(handler: () => void): void {
    this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, handler);
  }

  layoutNow(): void {
    this.editor.layout();
  }
}
