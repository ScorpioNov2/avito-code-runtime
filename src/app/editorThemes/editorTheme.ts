import type { editor } from 'monaco-editor';

export interface EditorThemeDefinition {
  /** Id dùng để lưu cấu hình và đăng ký với Monaco. */
  id: string;
  /** Tên hiển thị trong Settings. */
  label: string;
  /** Thứ tự trong danh sách chọn (nhỏ lên trước). */
  sortOrder: number;
  isDark: boolean;
  /** Màu nền / chữ dùng cho phần khung ngoài editor (thanh trên, terminal, thanh dưới). */
  uiBackground: string;
  uiForeground: string;
  /** Dữ liệu theme của Monaco. Không có = theme có sẵn của Monaco (vs, vs-dark, hc-black, hc-light). */
  monacoTheme?: editor.IStandaloneThemeData;
}
