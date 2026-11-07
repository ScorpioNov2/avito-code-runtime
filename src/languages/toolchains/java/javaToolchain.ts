import type { RunOutputChannel } from '../../languagePlugin';
import { prepareJavaSource } from './prepareJavaSource';

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
  destroy(): void;
}

export type JavaRuntimeFactory = () => Promise<JavaRuntime>;

function toLines(text: string): string[] {
  return text === '' ? [] : text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
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

    const outcome = await new Promise<JavaRunResult | 'stopped'>((resolve) => {
      this.cancelCurrentRun = () => resolve('stopped');
      runtime.run(preparedSource, { mainClass }).then(resolve, (error: unknown) =>
        resolve({ ok: false, stdout: '', stderr: error instanceof Error ? error.message : String(error), exitCode: 1 }),
      );
    });
    this.cancelCurrentRun = null;

    if (outcome === 'stopped') {
      output.info('Execution stopped.');
      return 1;
    }

    toLines(outcome.stdout).forEach((line) => output.stdout(line));
    toLines(outcome.stderr).forEach((line) => output.stderr(line));

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
