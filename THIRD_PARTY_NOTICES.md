# Third-party notices

This project downloads or vendors the following. Check each project's own license before redistributing.

| Component | Used for | License |
|-----------|----------|---------|
| [binji/wasm-clang](https://github.com/binji/wasm-clang) (`clang`, `lld`, `memfs`, `sysroot.tar`; JS ported to TypeScript in `src/languages/toolchains/clang/`) | C/C++ | Apache-2.0 (binaries are LLVM: Apache-2.0 with LLVM exceptions) |
| [LyonSyonII/rubri](https://github.com/LyonSyonII/rubri) (Miri `.wasm`, std `.rlib`s, and the `wasi/` folder vendored in `src/languages/toolchains/rust/wasi/`) | Rust | MIT |
| [bjorn3/browser_wasi_shim](https://github.com/bjorn3/browser_wasi_shim) (basis of the vendored `wasi/` code) | Rust | Apache-2.0 OR MIT |
| Rust compiler / Miri / std libraries | Rust | MIT OR Apache-2.0 |
| [live-codes/java](https://github.com/live-codes/java) (`@live-codes/java-wasm`: javac + TeaVM compiled to WebAssembly, built on [Vsprocessing/teavm-javac](https://github.com/Vsprocessing/teavm-javac) and [TeaVM](https://teavm.org)) | Java | Apache-2.0; the bundled javac comes from OpenJDK (GPLv2 with Classpath Exception), see the package's own `THIRD-PARTY-NOTICES.md` |
| [Pyodide](https://pyodide.org) | Python | MPL-2.0 |
| Monaco Editor, Yjs, y-webrtc, y-monaco | Editor + sync | MIT |
| [uqr](https://github.com/unjs/uqr) | QR code | MIT |
| Theme palettes (GitHub, Dracula, Monokai, One Dark, Solarized) | Editor themes | Color schemes recreated from the published palettes; not copied from VS Code theme extensions |

Modification notice (Apache-2.0): `worker-java.js` from live-codes/java is modified at download time by `scripts/patches/javaStreamOutput.mjs` so that stdout/stderr are streamed line by line.
