import type { LanguagePlugin } from '../languagePlugin';
import { WorkerRunnerHost } from '../workerRunnerHost';

// Python: giữ worker sống để chỉ nạp Pyodide ở lần chạy đầu tiên.
const runnerHost = new WorkerRunnerHost(
  () => new Worker(new URL('../workers/pythonWorker.ts', import.meta.url), { type: 'module' }),
  { reuseWorker: true },
);

const pythonPlugin: LanguagePlugin = {
  id: 'python',
  displayName: 'Python',
  starterCode: `# Python (Pyodide) - press Run or Ctrl/Cmd+Enter
def greet(name: str) -> str:
    return f"Hello, {name}!"


print(greet("Avito code"))
`,
  fingerprints: [
    { pattern: /^\s*def\s+\w+\s*\(.*\)\s*(->\s*[^:]+)?:\s*$/m, weight: 4 },
    { pattern: /^\s*(elif|except)\b.*:\s*$/m, weight: 3 },
    { pattern: /^\s*(for\s+\w+\s+in\s+.+|while\s+.+|if\s+.+|else|try|with\s+.+):\s*$/m, weight: 2 },
    { pattern: /^\s*from\s+[\w.]+\s+import\s+\w+/m, weight: 3 },
    { pattern: /^\s*import\s+[\w.]+(\s+as\s+\w+)?\s*$/m, weight: 2 },
    { pattern: /\b(True|False|None)\b/, weight: 1 },
    { pattern: /^\s*print\s*\(/m, weight: 1 },
  ],
  run: (code, output) => runnerHost.run(code, output),
  stop: () => runnerHost.stop(),
};

export default pythonPlugin;
