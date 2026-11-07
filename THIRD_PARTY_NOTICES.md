# Third-party notices

This project downloads or vendors the following. Check each project's own license before redistributing.

| Component | Used for | License |
|-----------|----------|---------|
| [binji/wasm-clang](https://github.com/binji/wasm-clang) (`clang`, `lld`, `memfs`, `sysroot.tar`; JS ported to TypeScript in `src/languages/toolchains/clang/`) | C/C++ | Apache-2.0 (binaries are LLVM: Apache-2.0 with LLVM exceptions) |
| [LyonSyonII/rubri](https://github.com/LyonSyonII/rubri) (Miri `.wasm`, std `.rlib`s, and the `wasi/` folder vendored in `src/languages/toolchains/rust/wasi/`) | Rust | MIT |
| [bjorn3/browser_wasi_shim](https://github.com/bjorn3/browser_wasi_shim) (basis of the vendored `wasi/` code) | Rust | Apache-2.0 OR MIT |
| Rust compiler / Miri / std libraries | Rust | MIT OR Apache-2.0 |
| [CheerpJ](https://cheerpj.com) (loaded from Leaning Technologies' CDN; not bundled) | Java | Proprietary. Community license: personal / non-commercial; self-hosting needs a commercial license |
| [Pyodide](https://pyodide.org) | Python | MPL-2.0 |
| Monaco Editor, Yjs, y-webrtc, y-monaco | Editor + sync | MIT |
| [uqr](https://github.com/unjs/uqr) | QR code | MIT |
| Theme palettes (GitHub, Dracula, Monokai, One Dark, Solarized) | Editor themes | Color schemes recreated from the published palettes; not copied from VS Code theme extensions |
