import type { LanguagePlugin } from '../languagePlugin';
import { WorkerRunnerHost } from '../workerRunnerHost';

// Rust: giữ worker sống để chỉ tải Miri và thư viện chuẩn ở lần chạy đầu.
const runnerHost = new WorkerRunnerHost(
  () => new Worker(new URL('../workers/rustWorker.ts', import.meta.url), { type: 'module' }),
  { reuseWorker: true },
);

const rustPlugin: LanguagePlugin = {
  id: 'rust',
  displayName: 'Rust',
  starterCode: `// Rust - press Run or Ctrl/Cmd+Enter
fn main() {
    println!("Hello, Avito code!");
}
`,
  fingerprints: [
    { pattern: /\bfn\s+\w+\s*(<[^>]*>)?\s*\(/, weight: 4 },
    { pattern: /\b(println|print|format|vec)!\s*[(\[]/, weight: 4 },
    { pattern: /\blet\s+mut\b/, weight: 3 },
    { pattern: /^\s*use\s+std::/m, weight: 3 },
    { pattern: /\bimpl\s+\w+/, weight: 2 },
  ],
  run: (code, output) => runnerHost.run(code, output),
  stop: () => runnerHost.stop(),
};

export default rustPlugin;
