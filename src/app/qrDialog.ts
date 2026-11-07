import { renderSVG } from 'uqr';
import { requireElement } from './domElements';

/** Popup hiện mã QR của link phòng (tạo bằng thư viện uqr). */
export class QrDialog {
  private readonly qrContainer = requireElement<HTMLElement>('qr-code');
  private readonly linkText = requireElement<HTMLElement>('qr-link');
  private readonly copyButton = requireElement<HTMLButtonElement>('qr-copy-button');
  private readonly closeButton = requireElement<HTMLButtonElement>('qr-close-button');

  constructor(
    private readonly dialog: HTMLDialogElement,
    onCopyLink: () => void,
  ) {
    this.closeButton.addEventListener('click', () => this.dialog.close());
    this.copyButton.addEventListener('click', onCopyLink);
    // Bấm ra vùng tối bên ngoài thì đóng (nội dung nằm trong .dialog__content nên bấm vào popup không bị tính).
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close();
    });
  }

  open(link: string): void {
    // Luôn đen trên nền trắng (kể cả theme tối) để điện thoại quét được dễ nhất.
    const svgText = renderSVG(link, { ecc: 'M', border: 2, blackColor: '#000000', whiteColor: '#ffffff' });
    const svgElement = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
    this.qrContainer.replaceChildren(svgElement);
    this.linkText.textContent = link;
    this.dialog.showModal();
  }
}
