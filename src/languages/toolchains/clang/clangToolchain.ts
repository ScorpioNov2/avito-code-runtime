import type { RunOutputChannel } from '../../languagePlugin';
import { Utf8LineSink } from '../../../utils/utf8LineSink';
import { compileWasmAsset, type AssetLoader } from '../types';
import { MemFs, type MemFsHooks } from './memFs';
import { extractTarIntoMemFs } from './tarArchive';
import { runWasiProcess } from './wasiProcess';

const SOURCE_FILE = 'main.cpp';
const OBJECT_FILE = 'main.o';
const PROGRAM_FILE = 'main.wasm';
const STACK_SIZE_BYTES = 1024 * 1024;

const CLANG_COMMON_ARGS = [
  '-disable-free',
  '-isysroot', '/',
  '-internal-isystem', '/include/c++/v1',
  '-internal-isystem', '/include',
  '-internal-isystem', '/lib/clang/8.0.1/include',
  '-ferror-limit', '19',
  '-fmessage-length', '80',
];

interface ClangSession {
  fs: MemFs;
  hooks: MemFsHooks;
  moduleCache: Map<string, Promise<WebAssembly.Module>>;
}

/** Biên dịch (clang) -> liên kết (wasm-ld) -> chạy C/C++ hoàn toàn trong trình duyệt. */
export class ClangToolchain {
  private sessionPromise: Promise<ClangSession> | null = null;

  constructor(private readonly loadAsset: AssetLoader) {}

  /** Trả về exit code của chương trình (hoặc của bước biên dịch/liên kết nếu thất bại). */
  async compileAndRun(source: string, output: RunOutputChannel): Promise<number> {
    const session = await this.getSession(output);
    const stdoutSink = new Utf8LineSink((line) => output.stdout(line));
    const stderrSink = new Utf8LineSink((line) => output.stderr(line));
    session.hooks.onHostWrite = (fd, bytes) => (fd === 2 ? stderrSink : stdoutSink).write(bytes);

    const flushSinks = (): void => {
      stdoutSink.flush();
      stderrSink.flush();
    };

    try {
      output.info('Compiling…');
      session.fs.addFile(SOURCE_FILE, new TextEncoder().encode(source));
      const compileExitCode = await this.runTool(session, 'clang.wasm', [
        'clang', '-cc1', '-emit-obj', ...CLANG_COMMON_ARGS, '-std=c++17', '-O2', '-o', OBJECT_FILE, '-x', 'c++', SOURCE_FILE,
      ]);
      flushSinks();
      if (compileExitCode !== 0) {
        output.stderr('Compilation failed.');
        return compileExitCode;
      }

      output.info('Linking…');
      const linkExitCode = await this.runTool(session, 'lld.wasm', [
        'wasm-ld', '--no-threads', '--export-dynamic', '-z', `stack-size=${STACK_SIZE_BYTES}`,
        '-Llib/wasm32-wasi', 'lib/wasm32-wasi/crt1.o', OBJECT_FILE, '-lc', '-lc++', '-lc++abi', '-o', PROGRAM_FILE,
      ]);
      flushSinks();
      if (linkExitCode !== 0) {
        output.stderr('Linking failed.');
        return linkExitCode;
      }

      output.info('Running…');
      // readFile trả về bản sao riêng, nên .buffer chính xác là nội dung file.
      const program = await WebAssembly.compile(session.fs.readFile(PROGRAM_FILE).buffer as ArrayBuffer);
      let programExitCode: number;
      try {
        programExitCode = await runWasiProcess(program, session.fs, [PROGRAM_FILE]);
      } catch (error) {
        flushSinks();
        output.stderr(`Runtime error: ${error instanceof Error ? error.message : String(error)}`);
        return 1;
      }
      flushSinks();
      if (programExitCode !== 0) output.info(`Process exited with code ${programExitCode}`);
      return programExitCode;
    } finally {
      session.hooks.onHostWrite = () => {};
    }
  }

  private getSession(output: RunOutputChannel): Promise<ClangSession> {
    this.sessionPromise ??= this.createSession(output).catch((error) => {
      this.sessionPromise = null; // cho phép thử lại, ví dụ sau khi chạy npm run fetch-wasm
      throw error;
    });
    return this.sessionPromise;
  }

  private async createSession(output: RunOutputChannel): Promise<ClangSession> {
    output.info('Loading C/C++ toolchain (first run downloads ~60 MB, then it is cached)…');
    const [memfsModule, sysrootArchive] = await Promise.all([
      compileWasmAsset(this.loadAsset, 'clang/memfs.wasm'),
      this.loadAsset('clang/sysroot.tar'),
    ]);
    const hooks: MemFsHooks = { onHostWrite: () => {} };
    const fs = await MemFs.create(memfsModule, hooks);
    extractTarIntoMemFs(sysrootArchive, fs);
    return { fs, hooks, moduleCache: new Map() };
  }

  private async runTool(session: ClangSession, wasmName: string, args: string[]): Promise<number> {
    let modulePromise = session.moduleCache.get(wasmName);
    if (!modulePromise) {
      modulePromise = compileWasmAsset(this.loadAsset, `clang/${wasmName}`);
      session.moduleCache.set(wasmName, modulePromise);
    }
    return runWasiProcess(await modulePromise, session.fs, args);
  }
}
