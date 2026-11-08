import type { WorkerMessage, WorkerRequest } from '../workerProtocol';

const post = (message: WorkerMessage): void => self.postMessage(message);

/** Số dòng đầu của hàm bọc (`async function anonymous(\n) {\n`) nằm trước code người dùng. */
const WRAPPER_LINE_COUNT = 2;

/**
 * Làm stack trace dễ đọc: frame thuộc code người dùng đổi thành "line X, col Y" (theo đúng số dòng họ thấy
 * trong editor), frame nội bộ của worker bị bỏ. Trình duyệt khác Chrome có định dạng khác nên giữ nguyên dòng lạ.
 */
function cleanStack(stack: string): string {
  const userFrame = /^\s*at (?:(\S+) )?\(?eval at .*<anonymous>:(\d+):(\d+)\)?$/;
  return stack
    .split('\n')
    .flatMap((line) => {
      const match = userFrame.exec(line);
      if (match) {
        const [, functionName, lineNumber, column] = match;
        const position = `line ${Number(lineNumber) - WRAPPER_LINE_COUNT}, col ${column}`;
        return [functionName && functionName !== 'eval' ? `    at ${functionName} (${position})` : `    at ${position}`];
      }
      return /javascriptWorker|worker_file/.test(line) ? [] : [line];
    })
    .join('\n');
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value instanceof Error) return cleanStack(value.stack ?? value.message);
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

// ---------------------------------------------------------------------------------------------
// Chờ tác vụ bất đồng bộ. Giống Node: chương trình chỉ kết thúc khi không còn timer / fetch nào đang chờ.
// (Trình duyệt không cho biết "event loop đã rỗng chưa", nên ta tự đếm các tác vụ đang chờ.)
// ---------------------------------------------------------------------------------------------
let pendingTaskCount = 0;
let notifyWhenIdle: (() => void) | null = null;
let hasFinished = false;

const nativeSetTimeout = self.setTimeout.bind(self);
const nativeSetInterval = self.setInterval.bind(self);
const nativeClearTimeout = self.clearTimeout.bind(self);
const nativeClearInterval = self.clearInterval.bind(self);

function finish(): void {
  if (hasFinished) return;
  hasFinished = true;
  post({ type: 'finished' });
}

function startTask(): void {
  pendingTaskCount += 1;
}

function endTask(): void {
  pendingTaskCount -= 1;
  if (pendingTaskCount === 0) notifyWhenIdle?.();
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return typeof (value as PromiseLike<unknown> | null)?.then === 'function';
}

/** Đếm một promise là "đang chờ" cho tới khi nó xong (không đổi promise mà code người dùng nhận được). */
function trackPromise(promise: PromiseLike<unknown>): void {
  startTask();
  promise.then(endTask, endTask);
}

/** Lỗi không bắt trong callback của timer: giống Node, in lỗi rồi dừng chương trình. */
function reportUncaughtError(error: unknown): void {
  post({ type: 'stderr', text: `Uncaught ${formatValue(error)}` });
  finish();
}

function runCallback(callback: unknown, args: unknown[]): void {
  try {
    const result = typeof callback === 'function' ? callback(...args) : undefined;
    if (isThenable(result)) trackPromise(result); // callback async: chờ cả phần sau await
  } catch (error) {
    reportUncaughtError(error);
  }
}

// Các timer còn đang tính là "chờ" (setTimeout chưa chạy, setInterval chưa bị clear).
const activeTimerIds = new Set<number>();

self.setTimeout = ((callback: unknown, delay?: number, ...args: unknown[]) => {
  startTask();
  const timerId = nativeSetTimeout(() => {
    activeTimerIds.delete(timerId);
    runCallback(callback, args); // chạy trước, để timer mới được tạo trong callback tăng bộ đếm trước khi ta giảm
    endTask();
  }, delay);
  activeTimerIds.add(timerId);
  return timerId;
}) as unknown as typeof setTimeout;

self.setInterval = ((callback: unknown, delay?: number, ...args: unknown[]) => {
  startTask();
  const timerId = nativeSetInterval(() => runCallback(callback, args), delay);
  activeTimerIds.add(timerId);
  return timerId;
}) as unknown as typeof setInterval;

function clearTimer(timerId: number | undefined): void {
  if (timerId !== undefined && activeTimerIds.delete(timerId)) endTask();
  nativeClearTimeout(timerId);
  nativeClearInterval(timerId);
}
self.clearTimeout = clearTimer as typeof clearTimeout;
self.clearInterval = clearTimer as typeof clearInterval;

const nativeFetch = self.fetch.bind(self);
self.fetch = ((...args: Parameters<typeof fetch>) => {
  const request = nativeFetch(...args);
  trackPromise(request);
  return request;
}) as typeof fetch;

// Đọc body của response (.json(), .text()...) cũng là việc bất đồng bộ cần chờ.
for (const method of ['json', 'text', 'arrayBuffer', 'blob', 'formData'] as const) {
  const original = Response.prototype[method] as (this: Response) => Promise<unknown>;
  Object.defineProperty(Response.prototype, method, {
    configurable: true,
    writable: true,
    value(this: Response) {
      const reading = original.call(this);
      trackPromise(reading);
      return reading;
    },
  });
}

self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  post({ type: 'stderr', text: `Uncaught (in promise) ${formatValue(event.reason)}` });
};

/** Chờ tới khi hết tác vụ đang chờ. Mỗi lần kiểm tra lại sau một lượt macrotask để các promise vừa xong kịp chạy tiếp. */
async function waitUntilIdle(): Promise<void> {
  for (;;) {
    if (pendingTaskCount > 0) await new Promise<void>((resolve) => (notifyWhenIdle = resolve));
    await new Promise<void>((resolve) => nativeSetTimeout(resolve, 0));
    if (pendingTaskCount === 0) return;
  }
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (code: string) => () => Promise<unknown>;

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    // Bọc trong async function để dùng được top-level await.
    await new AsyncFunction(event.data.code)();
    await waitUntilIdle();
    // Sự kiện "unhandledrejection" được trình duyệt phát ra trễ hơn một chút; chờ để lỗi kịp được in trước khi kết thúc.
    await new Promise<void>((resolve) => nativeSetTimeout(resolve, 15));
  } catch (error) {
    // Lỗi ở phần chạy chính: dừng ngay, không chờ các timer còn lại (giống Node).
    post({ type: 'stderr', text: formatValue(error) });
  } finally {
    finish();
  }
};
