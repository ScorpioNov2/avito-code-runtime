import { CollaborationSession } from './collaborationSession';
import { requireElement } from './domElements';

/** Bấm ra vùng tối bên ngoài thì đóng (nội dung nằm trong .dialog__content nên bấm vào popup không bị tính). */
function closeOnBackdropClick(dialog: HTMLDialogElement): void {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

/** Popup nhập Room ID (hoặc dán link) để vào một phòng có sẵn, dùng ở sảnh chờ. */
export class JoinRoomDialog {
  private readonly form = requireElement<HTMLFormElement>('join-form');
  private readonly input = requireElement<HTMLInputElement>('join-room-input');
  private readonly error = requireElement<HTMLElement>('join-room-error');
  private readonly cancelButton = requireElement<HTMLButtonElement>('join-cancel-button');

  constructor(
    private readonly dialog: HTMLDialogElement,
    onJoin: (roomId: string) => void,
  ) {
    closeOnBackdropClick(dialog);
    this.cancelButton.addEventListener('click', () => this.dialog.close());
    this.input.addEventListener('input', () => this.showError(null));
    // form method="dialog" tự đóng popup sau khi submit; nếu ID sai thì chặn lại để người dùng sửa.
    this.form.addEventListener('submit', (event) => {
      const roomId = CollaborationSession.parseRoomId(this.input.value);
      if (!roomId) {
        event.preventDefault();
        this.showError('That is not a valid room ID. Paste the room ID or the full room link.');
        return;
      }
      onJoin(roomId);
    });
  }

  open(): void {
    this.input.value = '';
    this.showError(null);
    this.dialog.showModal();
    this.input.focus();
  }

  private showError(message: string | null): void {
    this.error.textContent = message ?? '';
    this.error.hidden = message === null;
    this.input.setAttribute('aria-invalid', String(message !== null));
  }
}

/** Popup hỏi xác nhận trước khi rời phòng. Mặc định focus vào "Stay" để không lỡ tay rời phòng. */
export class LeaveRoomDialog {
  private readonly stayButton = requireElement<HTMLButtonElement>('leave-stay-button');
  private readonly confirmButton = requireElement<HTMLButtonElement>('leave-confirm-button');

  constructor(
    private readonly dialog: HTMLDialogElement,
    onConfirm: () => void,
  ) {
    closeOnBackdropClick(dialog);
    this.stayButton.addEventListener('click', () => this.dialog.close());
    this.confirmButton.addEventListener('click', () => {
      this.dialog.close();
      onConfirm();
    });
  }

  open(): void {
    this.dialog.showModal();
    this.stayButton.focus();
  }
}
