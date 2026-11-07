import type { LanguagePlugin } from '../languagePlugin';
import { WorkerRunnerHost } from '../workerRunnerHost';

// C/C++: giữ worker sống để chỉ tải và biên dịch clang/lld ở lần chạy đầu.
const runnerHost = new WorkerRunnerHost(
  () => new Worker(new URL('../workers/cppWorker.ts', import.meta.url), { type: 'module' }),
  { reuseWorker: true },
);

const cppPlugin: LanguagePlugin = {
  id: 'cpp',
  displayName: 'C/C++',
  starterCode: `// C++ - press Run or Ctrl/Cmd+Enter
#include <iostream>

int main() {
    std::cout << "Hello, Avito code!" << std::endl;
    return 0;
}
`,
  fingerprints: [
    { pattern: /^\s*#\s*include\s*[<"]/m, weight: 4 },
    { pattern: /\bstd::\w+/, weight: 3 },
    { pattern: /\bint\s+main\s*\(/, weight: 3 },
    { pattern: /\b(cout|cin)\s*(<<|>>)/, weight: 3 },
    { pattern: /\busing\s+namespace\s+std\b/, weight: 3 },
    { pattern: /\b(printf|scanf)\s*\(/, weight: 2 },
  ],
  run: (code, output) => runnerHost.run(code, output),
  stop: () => runnerHost.stop(),
};

export default cppPlugin;
