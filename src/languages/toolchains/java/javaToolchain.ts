import type { RunOutputChannel } from '../../languagePlugin';
import { prepareJavaSource } from './prepareJavaSource';

export interface JavaProgressEvent {
  stage: string;
  detail: string;
}

/** Phần của @live-codes/java-wasm (javac + TeaVM chạy bằng WebAssembly) mà ta dùng. */
export interface JavaRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  /** javac: nguồn -> class */
  compileMs?: number;
  /** TeaVM: class -> WebAssembly */
  generateMs?: number;
  /** chạy chương trình (không có nghĩa là không biên dịch được nếu thiếu giá trị này) */
  runMs?: number;
}

export interface JavaRuntime {
  run(source: string, options?: { input?: string; mainClass?: string }): Promise<JavaRunResult>;
  /** Nhận sự kiện tiến trình. Bản worker đã patch (scripts/patches/javaStreamOutput.mjs) gửi từng dòng stdout/stderr qua đây. */
  on(event: 'progress', listener: (event: JavaProgressEvent) => void): () => void;
  destroy(): void;
}

export type JavaRuntimeFactory = () => Promise<JavaRuntime>;

/**
 * Output của chương trình Java đến theo hai đường: từng dòng ngay khi chương trình in (stream), và toàn bộ văn bản
 * khi chương trình kết thúc. Lớp này in dòng stream ngay, rồi khi xong chỉ in PHẦN CÒN THIẾU của kết quả cuối
 * (ví dụ dòng cuối không có \n), nên không bao giờ in trùng.
 */
export class StreamedOutput {
  private received = '';
  private pendingLine = '';

  constructor(private readonly emitLine: (line: string) => void) {}

  push(chunk: string): void {
    this.received += chunk;
    this.pendingLine += chunk;
    const lines = this.pendingLine.split('\n');
    this.pendingLine = lines.pop() ?? '';
    lines.forEach((line) => this.emitLine(line.replace(/\r$/, '')));
  }

  /** Gọi khi chạy xong, với toàn bộ văn bản mà engine trả về. */
  finish(finalText: string): void {
    const continuesStream = finalText.startsWith(this.received);
    const remainder = continuesStream ? this.pendingLine + finalText.slice(this.received.length) : finalText;
    this.pendingLine = '';
    if (remainder !== '') remainder.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').forEach((line) => this.emitLine(line));
  }

  /** Gọi khi bị dừng giữa chừng: in nốt phần dòng dang dở. */
  flushPending(): void {
    if (this.pendingLine !== '') this.emitLine(this.pendingLine);
    this.pendingLine = '';
  }
}

/** Biên dịch và chạy Java trong một Web Worker do thư viện tự quản lý. */
export class JavaToolchain {
  private runtimePromise: Promise<JavaRuntime> | null = null;
  private cancelCurrentRun: (() => void) | null = null;

  constructor(private readonly createRuntime: JavaRuntimeFactory) {}

  /** Trả về exit code của chương trình (hoặc 1 nếu biên dịch lỗi / bị dừng). */
  async run(source: string, output: RunOutputChannel): Promise<number> {
    const runtime = await this.getRuntime(output);
    const { source: preparedSource, mainClass } = prepareJavaSource(source);

    const streams = {
      stdout: new StreamedOutput((line) => output.stdout(line)),
      stderr: new StreamedOutput((line) => output.stderr(line)),
    };
    const stopListening = runtime.on('progress', ({ stage, detail }) => {
      if (stage === 'stdout' || stage === 'stderr') streams[stage].push(detail);
    });

    let outcome: JavaRunResult | 'stopped';
    try {
      outcome = await new Promise<JavaRunResult | 'stopped'>((resolve) => {
        this.cancelCurrentRun = () => resolve('stopped');
        runtime.run(preparedSource, { mainClass }).then(resolve, (error: unknown) =>
          resolve({ ok: false, stdout: '', stderr: error instanceof Error ? error.message : String(error), exitCode: 1 }),
        );
      });
    } finally {
      stopListening();
      this.cancelCurrentRun = null;
    }

    if (outcome === 'stopped') {
      streams.stdout.flushPending();
      streams.stderr.flushPending();
      output.info('Execution stopped.');
      return 1;
    }

    streams.stdout.finish(outcome.stdout);
    streams.stderr.finish(outcome.stderr);

    const didNotCompile = !outcome.ok && outcome.runMs === undefined;
    if (didNotCompile) {
      output.stderr('Compilation failed.');
    } else if (outcome.exitCode !== 0) {
      output.info(`Process exited with code ${outcome.exitCode}`);
    }
    return outcome.exitCode;
  }

  /** Tắt hẳn worker (cách duy nhất để ngắt chương trình đang lặp vô hạn); lần chạy sau sẽ nạp lại ~1 giây. */
  stop(): void {
    if (!this.cancelCurrentRun) return;
    const runtimePromise = this.runtimePromise;
    this.runtimePromise = null;
    void runtimePromise?.then((runtime) => runtime.destroy());
    this.cancelCurrentRun();
  }

  private getRuntime(output: RunOutputChannel): Promise<JavaRuntime> {
    if (!this.runtimePromise) {
      output.info('Loading Java toolchain (first run downloads ~8 MB)…');
      this.runtimePromise = this.createRuntime().catch((error) => {
        this.runtimePromise = null; // cho phép thử lại, ví dụ sau khi chạy npm run fetch-wasm
        throw error;
      });
    }
    return this.runtimePromise;
  }
}
