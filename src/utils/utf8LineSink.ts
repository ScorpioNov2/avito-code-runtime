/** Nhận byte thô (có thể cắt giữa ký tự UTF-8), gom thành từng dòng chữ hoàn chỉnh. */
export class Utf8LineSink {
  private decoder = new TextDecoder('utf-8');
  private pendingText = '';

  constructor(private readonly onLine: (line: string) => void) {}

  write(bytes: Uint8Array): void {
    this.pendingText += this.decoder.decode(bytes, { stream: true });
    const lines = this.pendingText.split('\n');
    this.pendingText = lines.pop() ?? '';
    lines.forEach((line) => this.onLine(line.replace(/\r$/, '')));
  }

  /** Đẩy nốt phần chưa kết thúc bằng xuống dòng (ví dụ printf không có \n). */
  flush(): void {
    this.pendingText += this.decoder.decode();
    if (this.pendingText) this.onLine(this.pendingText);
    this.pendingText = '';
    this.decoder = new TextDecoder('utf-8');
  }
}
