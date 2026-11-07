import type { LanguagePlugin, RunOutputChannel } from '../languagePlugin';
import { loadCheerpJApi } from '../toolchains/java/cheerpjRuntime';
import avitoDriverSource from '../toolchains/java/AvitoDriver.java?raw';
import { JavaToolchain } from '../toolchains/java/javaToolchain';

// Java chạy bằng CheerpJ ngay trên luồng chính (không đặt trong Web Worker được), nên không thể dừng giữa chừng.
const toolchain = new JavaToolchain(loadCheerpJApi, avitoDriverSource);
let activeOutput: RunOutputChannel | null = null;

const javaPlugin: LanguagePlugin = {
  id: 'java',
  displayName: 'Java',
  starterCode: `// Java - press Run or Ctrl/Cmd+Enter
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Avito code!");
    }
}
`,
  fingerprints: [
    { pattern: /\bSystem\.out\.print(ln)?\s*\(/, weight: 4 },
    { pattern: /\bpublic\s+(static\s+)?(class|void|int)\b/, weight: 3 },
    { pattern: /\bString\s*\[\]\s*\w+/, weight: 2 },
    { pattern: /^\s*import\s+javax?\./m, weight: 3 },
  ],
  async run(code, output) {
    activeOutput = output;
    try {
      await toolchain.run(code, output);
    } finally {
      activeOutput = null;
    }
  },
  stop() {
    activeOutput?.info('Java cannot be stopped once started. Reload the page to cancel.');
  },
};

export default javaPlugin;
