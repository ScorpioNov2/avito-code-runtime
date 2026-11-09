import { throttleWithAnimationFrame } from '../utils/frameThrottle';

const MIN_EDITOR_SIZE_PX = 120;
/** Khớp với `min-width: 150px` của .terminal-pane trong styles.css. */
const MIN_TERMINAL_SIZE_PX = 150;

/**
 * Thanh kéo giữa vùng Code và Terminal.
 * Màn hình rộng: chia trái/phải (kéo ngang). Màn hình hẹp: chia trên/dưới (kéo dọc).
 * Toàn bộ tính toán khi kéo chuột đi qua requestAnimationFrame để giữ ~60 FPS.
 */
export class SplitPane {
  private readonly applyPointerPosition = throttleWithAnimationFrame((clientX: number, clientY: number) => {
    const bounds = this.workspace.getBoundingClientRect();
    const isSideBySide = getComputedStyle(this.workspace).flexDirection === 'row';
    const totalSize = isSideBySide ? bounds.width : bounds.height;
    const distanceFromEnd = isSideBySide ? bounds.right - clientX : bounds.bottom - clientY;
    const terminalSize = Math.min(Math.max(distanceFromEnd, MIN_TERMINAL_SIZE_PX), totalSize - MIN_EDITOR_SIZE_PX);

    this.workspace.style.setProperty('--terminal-size', `${terminalSize}px`);
    this.onResized(); // gọi editor.layout() ngay trong cùng frame
  });

  constructor(
    private readonly workspace: HTMLElement,
    private readonly splitter: HTMLElement,
    private readonly onResized: () => void,
  ) {
    splitter.addEventListener('pointerdown', (event) => this.startDragging(event));
  }

  private startDragging(event: PointerEvent): void {
    event.preventDefault();
    this.splitter.setPointerCapture(event.pointerId);
    document.body.classList.add('is-resizing');

    const handlePointerMove = (moveEvent: PointerEvent): void => this.applyPointerPosition(moveEvent.clientX, moveEvent.clientY);
    const stopDragging = (): void => {
      this.splitter.removeEventListener('pointermove', handlePointerMove);
      this.splitter.removeEventListener('pointerup', stopDragging);
      this.splitter.removeEventListener('pointercancel', stopDragging);
      document.body.classList.remove('is-resizing');
    };

    this.splitter.addEventListener('pointermove', handlePointerMove);
    this.splitter.addEventListener('pointerup', stopDragging);
    this.splitter.addEventListener('pointercancel', stopDragging);
  }
}
