// Port sang TypeScript từ binji/wasm-clang (shared.js), Apache-2.0. Xem THIRD_PARTY_NOTICES.md.
import { MemoryView } from './memoryView';

const ESUCCESS = 0;

interface MemFsExports {
  memory: WebAssembly.Memory;
  init(): void;
  GetPathBuf(): number;
  AddDirectoryNode(pathLength: number): void;
  AddFileNode(pathLength: number, size: number): number;
  GetFileNodeAddress(inode: number): number;
  GetFileNodeSize(inode: number): number;
  FindNode(pathLength: number): number;
}

export interface MemFsHooks {
  /** fd = 1 (stdout) hoặc 2 (stderr) của chương trình đang chạy. */
  onHostWrite: (fd: number, bytes: Uint8Array) => void;
}

/**
 * Hệ thống file trong RAM do một module wasm (`memfs.wasm`) cung cấp.
 * clang, lld và chương trình người dùng đều gọi các hàm fd_ và path_ của nó thay vì file thật.
 */
export class MemFs {
  readonly exports: MemFsExports;
  private readonly memory: MemoryView;
  private hostMemory: MemoryView | null = null;

  private constructor(
    instance: WebAssembly.Instance,
    private readonly hooks: MemFsHooks,
  ) {
    this.exports = instance.exports as unknown as MemFsExports;
    this.memory = new MemoryView(this.exports.memory);
  }

  static async create(module: WebAssembly.Module, hooks: MemFsHooks): Promise<MemFs> {
    let created: MemFs | null = null;
    const withFs = <T>(action: (fs: MemFs) => T): T => action(created!);

    const env = {
      abort: () => {
        throw new Error('memfs aborted');
      },
      host_write: (fd: number, iovs: number, iovsLength: number, writtenOut: number) =>
        withFs((fs) => fs.hostWrite(fd, iovs, iovsLength, writtenOut)),
      // stdin luôn ở trạng thái hết dữ liệu (EOF).
      host_read: (_fd: number, _iovs: number, _iovsLength: number, readOut: number) =>
        withFs((fs) => {
          fs.hostMemory!.write32(readOut, 0);
          return ESUCCESS;
        }),
      memfs_log: () => {},
      copy_out: (hostDestination: number, memfsSource: number, size: number) =>
        withFs((fs) => {
          fs.hostMemory!.writeBytes(hostDestination, fs.memory.slice(memfsSource, size));
        }),
      copy_in: (memfsDestination: number, hostSource: number, size: number) =>
        withFs((fs) => {
          fs.memory.writeBytes(memfsDestination, fs.hostMemory!.slice(hostSource, size));
        }),
    };

    const instance = await WebAssembly.instantiate(module, { env });
    created = new MemFs(instance, hooks);
    created.exports.init();
    return created;
  }

  /** Gắn bộ nhớ của module đang chạy (clang/lld/chương trình) để memfs đọc-ghi trực tiếp. */
  attachHostMemory(memory: MemoryView): void {
    this.hostMemory = memory;
  }

  addDirectory(path: string): void {
    this.memory.writeBytes(this.exports.GetPathBuf(), new TextEncoder().encode(path));
    this.exports.AddDirectoryNode(path.length);
  }

  addFile(path: string, contents: Uint8Array): void {
    this.memory.writeBytes(this.exports.GetPathBuf(), new TextEncoder().encode(path));
    const inode = this.exports.AddFileNode(path.length, contents.length);
    this.memory.writeBytes(this.exports.GetFileNodeAddress(inode), contents);
  }

  /** Trả về bản sao nội dung file (an toàn kể cả khi memfs cấp phát thêm bộ nhớ sau đó). */
  readFile(path: string): Uint8Array {
    this.memory.writeBytes(this.exports.GetPathBuf(), new TextEncoder().encode(path));
    const inode = this.exports.FindNode(path.length);
    return this.memory.slice(this.exports.GetFileNodeAddress(inode), this.exports.GetFileNodeSize(inode));
  }

  private hostWrite(fd: number, iovs: number, iovsLength: number, writtenOut: number): number {
    const host = this.hostMemory!;
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (let i = 0; i < iovsLength; i++) {
      const buffer = host.read32(iovs);
      const length = host.read32(iovs + 4);
      iovs += 8;
      chunks.push(host.slice(buffer, length));
      total += length;
    }
    host.write32(writtenOut, total);

    const merged = new Uint8Array(total);
    let position = 0;
    for (const chunk of chunks) {
      merged.set(chunk, position);
      position += chunk.length;
    }
    this.hooks.onHostWrite(fd, merged);
    return ESUCCESS;
  }
}
