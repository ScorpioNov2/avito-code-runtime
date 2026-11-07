import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import typescriptWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Cho Monaco biết nạp worker nào (JS cần worker TypeScript để gợi ý/lỗi cú pháp).
(self as unknown as { MonacoEnvironment: { getWorker(workerId: string, label: string): Worker } }).MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    return label === 'typescript' || label === 'javascript' ? new typescriptWorker() : new editorWorker();
  },
};
