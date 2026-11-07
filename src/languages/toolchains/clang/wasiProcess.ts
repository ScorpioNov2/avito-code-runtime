// Port tối giản sang TypeScript từ binji/wasm-clang (shared.js), Apache-2.0.
import type { MemFs } from './memFs';
import { MemoryView } from './memoryView';

const ESUCCESS = 0;
const CLOCK_REALTIME = 0;

class ProcessExit extends Error {
  constructor(readonly code: number) {
    super(`process exited with code ${code}`);
  }
}

/**
 * Chạy một module WASI (clang, wasm-ld hoặc chương trình đã biên dịch) với memfs làm hệ thống file.
 * Trả về exit code; các lỗi khác (ví dụ trap của wasm) được ném ra ngoài.
 */
export async function runWasiProcess(module: WebAssembly.Module, memfs: MemFs, args: string[]): Promise<number> {
  const environment = ['USER=avito'];
  let memory!: MemoryView;

  const wasiImports = {
    proc_exit: (code: number): never => {
      throw new ProcessExit(code);
    },

    environ_sizes_get: (countOut: number, sizeOut: number): number => {
      memory.write64(countOut, BigInt(environment.length));
      memory.write64(sizeOut, BigInt(environment.reduce((sum, entry) => sum + entry.length + 1, 0)));
      return ESUCCESS;
    },
    environ_get: (pointers: number, buffer: number): number => {
      for (const entry of environment) {
        memory.write32(pointers, buffer);
        pointers += 4;
        buffer += memory.writeCString(buffer, entry);
      }
      memory.write32(pointers, 0);
      return ESUCCESS;
    },

    args_sizes_get: (countOut: number, sizeOut: number): number => {
      memory.write64(countOut, BigInt(args.length));
      memory.write64(sizeOut, BigInt(args.reduce((sum, arg) => sum + arg.length + 1, 0)));
      return ESUCCESS;
    },
    args_get: (pointers: number, buffer: number): number => {
      for (const arg of args) {
        memory.write32(pointers, buffer);
        pointers += 4;
        buffer += memory.writeCString(buffer, arg);
      }
      memory.write32(pointers, 0);
      return ESUCCESS;
    },

    random_get: (buffer: number, length: number): number => {
      const randomBytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) randomBytes[i] = (Math.random() * 256) | 0;
      memory.writeBytes(buffer, randomBytes);
      return ESUCCESS;
    },

    clock_time_get: (clockId: number, _precision: bigint, timeOut: number): number => {
      const nowNanoseconds =
        clockId === CLOCK_REALTIME ? BigInt(Date.now()) * 1_000_000n : BigInt(Math.round(performance.now() * 1e6));
      memory.write64(timeOut, nowNanoseconds);
      return ESUCCESS;
    },

    // sleep/usleep cần poll_oneoff; bản wasm-clang này chưa hỗ trợ (và thiếu compiler-rt để link sleep).
    poll_oneoff: (): never => {
      throw new Error('poll_oneoff (sleep) is not supported in this runtime');
    },
  };

  // memfs cung cấp các hàm fd_* / path_*; ghi đè lên bản của mình (giống wasm-clang gốc).
  const wasi_unstable = Object.assign({}, wasiImports, memfs.exports) as unknown as WebAssembly.ModuleImports;
  const instance = await WebAssembly.instantiate(module, { wasi_unstable, env: {} });
  memory = new MemoryView(instance.exports.memory as WebAssembly.Memory);
  memfs.attachHostMemory(memory);

  try {
    (instance.exports._start as () => void)();
    return 0;
  } catch (error) {
    if (error instanceof ProcessExit) return error.code;
    throw error;
  }
}
