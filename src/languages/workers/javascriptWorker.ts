import type { WorkerMessage, WorkerRequest } from '../workerProtocol';

const post = (message: WorkerMessage): void => self.postMessage(message);

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return value.stack ?? value.message;
  try {
    if (typeof value !== 'object' || value === null) return String(value);
    // Gọn trên một dòng nếu đủ ngắn (giống console của Node), dài thì mới xuống dòng.
    const compact = JSON.stringify(value);
    return compact.length <= 80 ? compact : JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const formatArguments = (args: unknown[]): string => args.map(formatValue).join(' ');

// Chuyển console.* thành output của terminal.
console.log = (...args: unknown[]) => post({ type: 'stdout', text: formatArguments(args) });
console.info = console.log;
console.debug = console.log;
console.warn = (...args: unknown[]) => post({ type: 'stderr', text: formatArguments(args) });
console.error = console.warn;

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (code: string) => () => Promise<unknown>;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    // Bọc trong async function để dùng được top-level await.
    await new AsyncFunction(event.data.code)();
  } catch (error) {
    post({ type: 'stderr', text: formatValue(error) });
  } finally {
    post({ type: 'finished' });
  }
};
