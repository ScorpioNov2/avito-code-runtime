/** Kênh in kết quả ra terminal của người bấm RUN. */
export interface RunOutputChannel {
  stdout(line: string): void;
  stderr(line: string): void;
  info(line: string): void;
}

/** "Dấu vân tay" cú pháp: pattern khớp thì cộng `weight` điểm cho ngôn ngữ đó. */
export interface LanguageFingerprint {
  pattern: RegExp;
  weight: number;
}

/**
 * Mỗi ngôn ngữ = 1 plugin. Muốn thêm ngôn ngữ mới chỉ cần tạo file
 * `src/languages/plugins/<tên>Plugin.ts` và `export default` một LanguagePlugin.
 */
export interface LanguagePlugin {
  /** Trùng với language id của Monaco (python, javascript, cpp, java, rust...). */
  readonly id: string;
  readonly displayName: string;
  readonly starterCode: string;
  /** Dùng để phát hiện code viết sai ngôn ngữ so với runtime đang chọn. */
  readonly fingerprints: readonly LanguageFingerprint[];
  run(code: string, output: RunOutputChannel): Promise<void>;
  stop(): void;
}
