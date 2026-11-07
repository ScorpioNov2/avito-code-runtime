// Chạy Rust bằng Miri (trình thông dịch MIR) đã biên dịch ra WebAssembly. Cách làm theo LyonSyonII/rubri (MIT).
// Lưu ý: đây là THÔNG DỊCH chứ không biên dịch ra mã máy nên chậm; không hỗ trợ crate ngoài và stdin.
import type { RunOutputChannel } from '../../languagePlugin';
import { Utf8LineSink } from '../../../utils/utf8LineSink';
import { compileWasmAsset, type AssetLoader } from '../types';
import { ConsoleStdout, Directory, Fd, File, PreopenDirectory, WASI } from './wasi/index';

const MIRI_WASM_PATH = 'rust/miri.wasm';
const SYSROOT_DIRECTORY = 'rust/sysroot';
const TARGET_TRIPLE = 'x86_64-unknown-linux-gnu';

/** Phải khớp với danh sách file trong scripts/wasm-assets.manifest.json (nhóm "rust"). */
const SYSROOT_LIBRARY_FILES = [
  'libaddr2line-b8754aeb03c02354.rlib', 'libadler-05c3545f6cd12159.rlib', 'liballoc-0dab879bc41cd6bd.rlib',
  'libcfg_if-c7fd2cef50341546.rlib', 'libcompiler_builtins-a99947d020d809d6.rlib', 'libcore-4b8e8a815d049db3.rlib',
  'libgetopts-bbb75529e85d129d.rlib', 'libgimli-598847d27d7a3cbf.rlib', 'libhashbrown-d2ff91fdf93cacb2.rlib',
  'liblibc-dc63949c664c3fce.rlib', 'libmemchr-2d3a423be1a6cb96.rlib', 'libminiz_oxide-b109506a0ccc4c6a.rlib',
  'libobject-7b48def7544c748b.rlib', 'libpanic_abort-c93441899b93b849.rlib', 'libpanic_unwind-11d9ba05b60bf694.rlib',
  'libproc_macro-1a7f7840bb9983dc.rlib', 'librustc_demangle-59342a335246393d.rlib',
  'librustc_std_workspace_alloc-552b185085090ff6.rlib', 'librustc_std_workspace_core-5d8a121daa7eeaa9.rlib',
  'librustc_std_workspace_std-97f43841ce452f7d.rlib', 'libstd-bdedb7706a556da2.rlib', 'libstd-bdedb7706a556da2.so',
  'libstd_detect-cca21eebc4281add.rlib', 'libsysroot-f654e185be3ffebd.rlib', 'libtest-f06fa3fbc201c558.rlib',
  'libunicode_width-19a0dcd589fa0877.rlib', 'libunwind-747b693f90af9445.rlib',
];

/** Tắt các kiểm tra tốn thời gian của Miri (không báo UB, chỉ chạy code) để nhanh hơn. */
const MIRI_ARGS = [
  'miri', '--sysroot', '/sysroot', 'main.rs', '--target', TARGET_TRIPLE,
  '-Zmir-opt-level=3', '-Zmiri-ignore-leaks', '-Zmiri-permissive-provenance', '-Zmiri-preemption-rate=0',
  '-Zmiri-disable-alignment-check', '-Zmiri-disable-data-race-detector', '-Zmiri-disable-stacked-borrows',
  '-Zmiri-disable-validation', '-Zmir-emit-retag=false', '-Zmiri-disable-isolation', '-Zmiri-panic-on-unsupported',
  '--color=never',
];

/** stdin luôn trống. */
class EmptyStdin extends Fd {}

interface MiriSession {
  miriModule: WebAssembly.Module;
  sysroot: PreopenDirectory;
}

export class MiriToolchain {
  private sessionPromise: Promise<MiriSession> | null = null;

  constructor(private readonly loadAsset: AssetLoader) {}

  /** Trả về exit code (0 = thành công). */
  async run(source: string, output: RunOutputChannel): Promise<number> {
    const session = await this.getSession(output);
    const stdoutSink = new Utf8LineSink((line) => output.stdout(line));
    const stderrSink = new Utf8LineSink((line) => output.stderr(line));

    const root = new PreopenDirectory('/', [['main.rs', new File(new TextEncoder().encode(source))]]);
    const fds = [
      new EmptyStdin(),
      new ConsoleStdout((bytes) => stdoutSink.write(bytes)),
      new ConsoleStdout((bytes) => stderrSink.write(bytes)),
      new PreopenDirectory('/tmp', []),
      session.sysroot,
      root,
    ];
    const wasi = new WASI(MIRI_ARGS, [], fds, { debug: false });

    // Miri đòi hỏi "thread-spawn"; ở đây chạy luồng con ngay tại chỗ (đồng bộ) như rubri.
    let nextThreadId = 1;
    let instance: WebAssembly.Instance | null = null;
    const imports: WebAssembly.Imports = {
      env: { memory: new WebAssembly.Memory({ initial: 256, maximum: 4096, shared: false }) },
      wasi: {
        'thread-spawn': (startArgument: number): number => {
          const threadId = nextThreadId++;
          (instance!.exports.wasi_thread_start as (id: number, arg: number) => void)(threadId, startArgument);
          return threadId;
        },
      },
      wasi_snapshot_preview1: wasi.wasiImport as unknown as WebAssembly.ModuleImports,
    };

    output.info('Interpreting with Miri…');
    try {
      instance = await WebAssembly.instantiate(session.miriModule, imports);
      const exitCode = wasi.start(instance as unknown as Parameters<WASI['start']>[0]);
      stdoutSink.flush();
      stderrSink.flush();
      if (exitCode !== 0) output.info(`Process exited with code ${exitCode}`);
      return exitCode;
    } catch (error) {
      stdoutSink.flush();
      stderrSink.flush();
      output.stderr(`Runtime error: ${error instanceof Error ? error.message : String(error)}`);
      return 1;
    }
  }

  private getSession(output: RunOutputChannel): Promise<MiriSession> {
    this.sessionPromise ??= this.createSession(output).catch((error) => {
      this.sessionPromise = null; // cho phép thử lại, ví dụ sau khi chạy npm run fetch-wasm
      throw error;
    });
    return this.sessionPromise;
  }

  private async createSession(output: RunOutputChannel): Promise<MiriSession> {
    output.info('Loading Rust (Miri) toolchain (first run downloads ~150 MB, then it is cached)…');
    const [miriModule, libraries] = await Promise.all([
      compileWasmAsset(this.loadAsset, MIRI_WASM_PATH),
      Promise.all(
        SYSROOT_LIBRARY_FILES.map(async (fileName) => [fileName, new File(await this.loadAsset(`${SYSROOT_DIRECTORY}/${fileName}`))] as [string, File]),
      ),
    ]);

    const sysroot = new PreopenDirectory('/sysroot', [
      ['lib', new Directory([
        ['rustlib', new Directory([
          ['wasm32-wasi', new Directory([['lib', new Directory([])]])],
          [TARGET_TRIPLE, new Directory([['lib', new Directory(libraries)]])],
        ])],
      ])],
    ]);
    return { miriModule, sysroot };
  }
}
