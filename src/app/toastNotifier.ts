export type ToastKind = 'error' | 'success' | 'info';

export interface ToastOptions {
  title: string;
  message: string;
  kind?: ToastKind;
  durationMs?: number;
}

/** Thông báo tự làm (thay cho alert()): bo góc, có nút đóng, tự ẩn. */
export class ToastNotifier {
  constructor(private readonly container: HTMLElement) {}

  show({ title, message, kind = 'info', durationMs = kind === 'error' ? 9000 : 4000 }: ToastOptions): void {
    const toast = document.createElement('div');
    toast.className = `toast toast--${kind}`;
    toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');

    const body = document.createElement('div');
    body.className = 'toast__body';
    const titleElement = document.createElement('strong');
    titleElement.textContent = title;
    const messageElement = document.createElement('p');
    messageElement.textContent = message; // textContent: không bao giờ chèn HTML
    body.append(titleElement, messageElement);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'toast__close';
    closeButton.setAttribute('aria-label', 'Dismiss');
    closeButton.textContent = '×';

    const dismiss = (): void => {
      toast.classList.add('toast--leaving');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
      window.setTimeout(() => toast.remove(), 500); // phòng khi người dùng tắt animation
    };
    closeButton.addEventListener('click', dismiss);

    toast.append(body, closeButton);
    this.container.append(toast);
    window.setTimeout(dismiss, durationMs);
  }
}
