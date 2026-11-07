// Port sang TypeScript từ binji/wasm-clang (shared.js), Apache-2.0.
import type { MemFs } from './memFs';

function readCString(bytes: Uint8Array, offset: number, length: number): string {
  let text = '';
  for (let i = offset; i < offset + length && bytes[i] !== 0; i++) text += String.fromCharCode(bytes[i]);
  return text;
}

/** Giải nén file .tar (định dạng ustar kiểu GNU) vào MemFs. */
export function extractTarIntoMemFs(archive: ArrayBuffer, fs: MemFs): void {
  const bytes = new Uint8Array(archive);
  let offset = 0;

  const readText = (length: number): string => {
    const text = readCString(bytes, offset, length);
    offset += length;
    return text;
  };
  const readOctal = (length: number): number => parseInt(readText(length), 8);
  const alignToBlock = (): void => {
    offset = (offset + 511) & ~511;
  };

  while (offset + 512 <= bytes.length) {
    const filename = readText(100);
    readOctal(8); // mode
    readOctal(8); // owner
    readOctal(8); // group
    const size = readOctal(12);
    readOctal(12); // mtime
    readOctal(8); // checksum
    const type = readText(1);
    readText(100); // linkname
    if (readText(8) !== 'ustar  ') break; // hết archive
    offset += 32 + 32 + 8 + 8 + 155; // owner, group, devMajor, devMinor, prefix
    alignToBlock();

    if (type === '0') {
      fs.addFile(filename, bytes.subarray(offset, offset + size));
    } else if (type === '5') {
      fs.addDirectory(filename);
    }
    if (type !== '5') {
      offset += size;
      alignToBlock();
    }
  }
}
