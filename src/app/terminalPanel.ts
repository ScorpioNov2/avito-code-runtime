export type TerminalLineKind = 'stdout' | 'stderr' | 'info';

const OPEN_CLASS = 'workspace--terminal-open';
const MAX_LINES = 5000;

/** Vùng hiển thị kết quả chạy code (terminal). Chỉ hiện trên máy của người bấm RUN. */
export class TerminalPanel {
  constructor(
    private readonly workspace: HTMLElement,
    private readonly outputElement: HTMLElement,
    private readonly onVisibilityChange: (isVisible: boolean) => void,
  ) {}

  get isVisible(): boolean {
    return this.workspace.classList.contains(OPEN_CLASS);
  }

  setVisible(isVisible: boolean): void {
    this.workspace.classList.toggle(OPEN_CLASS, isVisible);
    this.onVisibilityChange(isVisible);
  }

  toggle(): void {
    this.setVisible(!this.isVisible);
  }

  clear(): void {
    this.outputElement.replaceChildren();
  }

  appendLine(text: string, kind: TerminalLineKind): void {
    const shouldStickToBottom = this.outputElement.scrollHeight - this.outputElement.scrollTop - this.outputElement.clientHeight < 40;

    const line = document.createElement('div');
    line.className = `terminal-line terminal-line--${kind}`;
    line.textContent = text;
    this.outputElement.append(line);

    // Giới hạn số dòng để vòng lặp in vô hạn không làm trình duyệt hết bộ nhớ.
    while (this.outputElement.childElementCount > MAX_LINES) this.outputElement.firstElementChild?.remove();
    if (shouldStickToBottom) this.outputElement.scrollTop = this.outputElement.scrollHeight;
  }
}
