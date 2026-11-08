import * as monaco from 'monaco-editor';
import { MonacoBinding } from 'y-monaco';
import type { Awareness } from 'y-protocols/awareness';
import type * as Y from 'yjs';

const INTEGRITY_CHECK_DELAY_MS = 400;
const MIN_MS_BETWEEN_RESYNCS = 1000;

/**
 * Nối model Monaco với Y.Text dùng chung (qua y-monaco), kèm hai lớp bảo vệ chống lệch nội dung.
 *
 * 1) LUÔN dùng "\n" (LF) làm kiểu xuống dòng. Yjs đếm vị trí theo LF, còn Monaco mặc định dùng CRLF trên Windows
 *    và y-monaco chỉ gọi setValue khi văn bản khác nhau, nên người vào phòng lúc tài liệu còn trống sẽ giữ CRLF.
 *    Khi đó mỗi dòng làm lệch 1 ký tự: chữ của người khác chui vào sai chỗ và con trỏ hiện sai vị trí.
 * 2) Tự kiểm tra: nếu editor vẫn lệch so với tài liệu dùng chung vì lý do nào khác, nạp lại editor từ tài liệu
 *    (tài liệu dùng chung là bản đúng, vì mọi thay đổi cục bộ đã được ghi vào đó ngay lập tức).
 */
export class SharedTextBinding {
  private readonly binding: MonacoBinding;
  private integrityTimer = 0;
  private lastResyncAt = 0;

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly model: monaco.editor.ITextModel,
    private readonly sharedText: Y.Text,
    awareness: Awareness,
  ) {
    // Chưa nối thì model chưa gắn với Yjs, đổi kiểu xuống dòng ở đây không ảnh hưởng ai.
    model.setEOL(monaco.editor.EndOfLineSequence.LF);
    this.binding = new MonacoBinding(sharedText, model, new Set([editor]), awareness);
    // y-monaco có thể đã setValue (và đưa EOL về mặc định của nền tảng, ví dụ khi văn bản chưa có dòng nào).
    this.forceLineFeed();

    model.onDidChangeContent(() => this.scheduleIntegrityCheck());
    sharedText.observe(() => this.scheduleIntegrityCheck());
    this.scheduleIntegrityCheck();
  }

  /**
   * Chạy thao tác lên model mà KHÔNG ghi ngược vào Yjs. y-monaco bỏ qua mọi sự kiện xảy ra khi mutex của nó đang khoá.
   * (Đổi EOL trong Monaco phát ra một sự kiện "thay toàn bộ nội dung"; nếu để lọt vào Yjs, mọi người sẽ bị nhân đôi chữ.)
   */
  private withoutSyncing(action: () => void): void {
    this.binding.mux(action);
  }

  private forceLineFeed(): void {
    this.withoutSyncing(() => this.model.setEOL(monaco.editor.EndOfLineSequence.LF));
  }

  private scheduleIntegrityCheck(): void {
    window.clearTimeout(this.integrityTimer);
    // Chỉ kiểm tra khi đã yên một lúc, để không chen vào lúc đang gõ hoặc đang nhận hàng loạt thay đổi.
    this.integrityTimer = window.setTimeout(() => this.verifyEditorMatchesSharedText(), INTEGRITY_CHECK_DELAY_MS);
  }

  private verifyEditorMatchesSharedText(): void {
    const sharedValue = this.sharedText.toString();
    if (sharedValue.includes('\r')) {
      // Máy chạy bản cũ (còn lỗi CRLF) có thể ghi "\r" vào tài liệu. Editor không bao giờ chứa "\r", nên xoá nó khỏi tài liệu.
      this.removeCarriageReturns(sharedValue);
      return;
    }

    const editorValue = this.model.getValue(monaco.editor.EndOfLinePreference.LF);
    if (editorValue === sharedValue && this.model.getEOL() === '\n') return;

    const now = Date.now();
    if (now - this.lastResyncAt < MIN_MS_BETWEEN_RESYNCS) {
      console.error('[avito-code] The editor keeps diverging from the shared document; not resyncing again.');
      return;
    }
    this.lastResyncAt = now;
    console.warn('[avito-code] The editor diverged from the shared document; resyncing it.');
    this.resyncEditor(sharedValue);
  }

  private resyncEditor(sharedValue: string): void {
    const selections = this.editor.getSelections();
    this.withoutSyncing(() => {
      this.model.setValue(sharedValue);
      this.model.setEOL(monaco.editor.EndOfLineSequence.LF);
    });
    if (selections) this.editor.setSelections(selections);
  }

  private removeCarriageReturns(sharedValue: string): void {
    const positions = [...sharedValue.matchAll(/\r/g)].map((match) => match.index);
    // Editor đã chuẩn hoá về "\n" nên không cần sửa lại; chỉ làm tài liệu dùng chung khớp với editor.
    this.withoutSyncing(() => {
      this.sharedText.doc?.transact(() => {
        for (let i = positions.length - 1; i >= 0; i--) this.sharedText.delete(positions[i], 1);
      });
    });
  }
}
