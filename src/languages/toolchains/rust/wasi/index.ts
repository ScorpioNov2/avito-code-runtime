// Vendored từ LyonSyonII/rubri (MIT), vốn dựa trên bjorn3/browser_wasi_shim (Apache-2.0 OR MIT).
// Đã bỏ fs_opfs và strace (không dùng). Xem THIRD_PARTY_NOTICES.md.
import WASI, { WASIProcExit } from "./wasi.js";
export { WASI, WASIProcExit };

export { Fd, Inode } from "./fd.js";
export { File, Directory, OpenFile, OpenDirectory, PreopenDirectory, ConsoleStdout } from "./fs_mem.js";
