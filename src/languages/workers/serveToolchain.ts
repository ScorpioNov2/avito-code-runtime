import type { RunOutputChannel } from '../languagePlugin';
import type { WorkerMessage, WorkerRequest } from '../workerProtocol';

/** Dựng vòng lặp nhận code -> chạy -> trả output, dùng chung cho các worker của toolchain nặng. */
export function serveToolchain(runCode: (code: string, output: RunOutputChannel) => Promise<unknown>): void {
  const post = (message: WorkerMessage): void => self.postMessage(message);
  const output: RunOutputChannel = {
    stdout: (text) => post({ type: 'stdout', text }),
    stderr: (text) => post({ type: 'stderr', text }),
    info: (text) => post({ type: 'info', text }),
  };

  self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    try {
      await runCode(event.data.code, output);
    } catch (error) {
      post({ type: 'stderr', text: error instanceof Error ? error.message : String(error) });
    } finally {
      post({ type: 'finished' });
    }
  };
}
