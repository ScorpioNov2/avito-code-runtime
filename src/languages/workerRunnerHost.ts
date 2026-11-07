import type { RunOutputChannel } from './languagePlugin';
import type { WorkerMessage, WorkerRequest } from './workerProtocol';

interface WorkerRunnerOptions {
  /** true: giữ worker sống giữa các lần chạy (Python giữ Pyodide đã nạp). false: mỗi lần chạy một worker mới. */
  reuseWorker: boolean;
}

/** Chạy code trong Web Worker, chuyển tiếp output, hỗ trợ dừng (terminate) bất cứ lúc nào. */
export class WorkerRunnerHost {
  private worker: Worker | null = null;
  private cancelCurrentRun: (() => void) | null = null;

  constructor(
    private readonly createWorker: () => Worker,
    private readonly options: WorkerRunnerOptions,
  ) {}

  run(code: string, output: RunOutputChannel): Promise<void> {
    return new Promise((resolve) => {
      const worker = this.worker ?? this.createWorker();
      this.worker = worker;

      const finish = (): void => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        this.cancelCurrentRun = null;
        if (!this.options.reuseWorker) this.discardWorker();
        resolve();
      };

      const handleMessage = (event: MessageEvent<WorkerMessage>): void => {
        const message = event.data;
        if (message.type === 'finished') {
          finish();
          return;
        }
        output[message.type](message.text);
      };

      const handleError = (event: ErrorEvent): void => {
        output.stderr(event.message || 'The runtime crashed.');
        this.discardWorker();
        finish();
      };

      this.cancelCurrentRun = () => {
        output.info('Execution stopped.');
        this.discardWorker();
        finish();
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage({ code } satisfies WorkerRequest);
    });
  }

  stop(): void {
    this.cancelCurrentRun?.();
  }

  private discardWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
