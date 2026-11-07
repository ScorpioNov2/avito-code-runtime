import type { LanguagePlugin } from '../languagePlugin';
import { WorkerRunnerHost } from '../workerRunnerHost';

// JavaScript: mỗi lần chạy một Web Worker mới, nên biến cũ không bị giữ lại.
const runnerHost = new WorkerRunnerHost(
  () => new Worker(new URL('../workers/javascriptWorker.ts', import.meta.url), { type: 'module' }),
  { reuseWorker: false },
);

const javascriptPlugin: LanguagePlugin = {
  id: 'javascript',
  displayName: 'JavaScript',
  starterCode: `// JavaScript (Web Worker) - press Run or Ctrl/Cmd+Enter
const greet = (name) => \`Hello, \${name}!\`;

console.log(greet('Avito code'));
`,
  fingerprints: [
    { pattern: /\bconsole\.(log|error|warn|info)\s*\(/, weight: 4 },
    { pattern: /^\s*(const|let|var)\s+(?!mut\b)[\w${[]/m, weight: 3 },
    { pattern: /\bfunction\s*\w*\s*\(/, weight: 3 },
    { pattern: /=>/, weight: 2 },
    { pattern: /===|!==/, weight: 2 },
  ],
  run: (code, output) => runnerHost.run(code, output),
  stop: () => runnerHost.stop(),
};

export default javascriptPlugin;
