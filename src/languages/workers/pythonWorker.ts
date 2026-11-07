import { loadPyodide, version, type PyodideInterface } from 'pyodide';
import type { WorkerMessage, WorkerRequest } from '../workerProtocol';

const post = (message: WorkerMessage): void => self.postMessage(message);

// Asset của Pyodide (~10MB) tải từ CDN đúng phiên bản với gói npm đã cài.
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;

let pyodidePromise: Promise<PyodideInterface> | null = null;

/** Chỉ nạp Pyodide một lần; các lần chạy sau dùng lại. */
function getPyodide(): Promise<PyodideInterface> {
  pyodidePromise ??= (async () => {
    post({ type: 'info', text: 'Loading Python runtime (first run only)…' });
    const pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    pyodide.setStdout({ batched: (text) => post({ type: 'stdout', text }) });
    pyodide.setStderr({ batched: (text) => post({ type: 'stderr', text }) });
    return pyodide;
  })().catch((error) => {
    pyodidePromise = null; // cho phép thử lại nếu mạng lỗi
    throw error;
  });
  return pyodidePromise;
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  try {
    const pyodide = await getPyodide();
    // Mỗi lần chạy dùng namespace mới để biến của lần trước không rò sang lần sau.
    const freshGlobals = pyodide.globals.get('dict')();
    try {
      await pyodide.runPythonAsync(event.data.code, { globals: freshGlobals });
    } finally {
      freshGlobals.destroy();
    }
  } catch (error) {
    post({ type: 'stderr', text: error instanceof Error ? error.message : String(error) });
  } finally {
    post({ type: 'finished' });
  }
};
