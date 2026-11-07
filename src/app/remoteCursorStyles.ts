import type { Awareness } from 'y-protocols/awareness';

const SAFE_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MAX_LABEL_LENGTH = 24;

/** Dữ liệu từ máy khác gửi tới là không đáng tin: chỉ cho phép màu dạng #rrggbb. */
const toSafeColor = (color: unknown): string => (typeof color === 'string' && SAFE_COLOR_PATTERN.test(color) ? color : '#6b7280');
const toSafeCssText = (text: unknown): string => String(text ?? 'Guest').replace(/[\\"\n\r]/g, '').slice(0, MAX_LABEL_LENGTH);

/**
 * y-monaco gắn class `yRemoteSelection-<clientId>` / `yRemoteSelectionHead-<clientId>` cho con trỏ người khác.
 * Hàm này sinh CSS màu + nhãn tên cho từng người, tự cập nhật khi có người vào/ra/đổi tên.
 */
export function keepRemoteCursorStylesInSync(awareness: Awareness): void {
  const styleElement = document.createElement('style');
  document.head.append(styleElement);

  const renderStyles = (): void => {
    const rules: string[] = [];
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return;
      const user = state.user as { name?: string; color?: string } | undefined;
      if (!user) return;
      const color = toSafeColor(user.color);
      rules.push(
        `.yRemoteSelection-${clientId} { background-color: ${color}33; }`,
        `.yRemoteSelectionHead-${clientId} { border-left: 2px solid ${color}; }`,
        `.yRemoteSelectionHead-${clientId}::after { content: "${toSafeCssText(user.name)}"; background: ${color}; }`,
      );
    });
    styleElement.textContent = rules.join('\n');
  };

  awareness.on('change', renderStyles);
  renderStyles();
}
