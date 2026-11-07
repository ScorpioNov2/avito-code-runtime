import type { LanguagePlugin } from '../languagePlugin';
import { JavaToolchain } from '../toolchains/java/javaToolchain';
import { createBrowserJavaRuntime } from '../toolchains/java/teavmRuntime';

// Java: javac + TeaVM biên dịch sang WebAssembly ngay trong trình duyệt (thư viện tự chạy trong Web Worker).
const toolchain = new JavaToolchain(createBrowserJavaRuntime);

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
    await toolchain.run(code, output);
  },
  stop: () => toolchain.stop(),
};

export default javaPlugin;
