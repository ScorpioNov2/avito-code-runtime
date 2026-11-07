/** Đọc/ghi bộ nhớ của một instance WebAssembly (tự cập nhật khi memory.grow làm đổi buffer). */
export class MemoryView {
  private bytes: Uint8Array;
  private words: Uint32Array;

  constructor(private readonly memory: WebAssembly.Memory) {
    this.bytes = new Uint8Array(memory.buffer);
    this.words = new Uint32Array(memory.buffer);
  }

  private sync(): void {
    if (this.bytes.buffer !== this.memory.buffer) {
      this.bytes = new Uint8Array(this.memory.buffer);
      this.words = new Uint32Array(this.memory.buffer);
    }
  }

  get buffer(): ArrayBuffer {
    this.sync();
    return this.memory.buffer;
  }

  read8(offset: number): number {
    this.sync();
    return this.bytes[offset];
  }

  read16(offset: number): number {
    this.sync();
    return this.bytes[offset] | (this.bytes[offset + 1] << 8);
  }

  read32(offset: number): number {
    this.sync();
    return this.words[offset >> 2];
  }

  write8(offset: number, value: number): void {
    this.sync();
    this.bytes[offset] = value;
  }

  write16(offset: number, value: number): void {
    this.sync();
    this.bytes[offset] = value & 0xff;
    this.bytes[offset + 1] = (value >> 8) & 0xff;
  }

  write32(offset: number, value: number): void {
    this.sync();
    this.words[offset >> 2] = value;
  }

  write64(offset: number, value: bigint): void {
    this.write32(offset, Number(value & 0xffffffffn));
    this.write32(offset + 4, Number((value >> 32n) & 0xffffffffn));
  }

  read64(offset: number): bigint {
    return BigInt(this.read32(offset)) | (BigInt(this.read32(offset + 4)) << 32n);
  }

  slice(offset: number, length: number): Uint8Array {
    this.sync();
    return this.bytes.slice(offset, offset + length);
  }

  writeBytes(offset: number, data: Uint8Array): void {
    this.sync();
    this.bytes.set(data, offset);
  }

  /** Ghi chuỗi ASCII kết thúc bằng NUL, trả về số byte đã ghi (gồm cả NUL). */
  writeCString(offset: number, text: string): number {
    const encoded = new TextEncoder().encode(text);
    this.writeBytes(offset, encoded);
    this.write8(offset + encoded.length, 0);
    return encoded.length + 1;
  }
}
