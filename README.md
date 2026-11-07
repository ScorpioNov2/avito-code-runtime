# Avito code — P2P collaborative code editor (no backend)

TypeScript + Vite + Monaco. Real-time sync via Yjs + y-webrtc. Code runs 100% in the browser.

## Run

```bash
npm install
npm run fetch-wasm     # downloads ~215 MB of C/C++ and Rust toolchains into public/wasm/ (self-hosted)
npm run dev            # http://localhost:5173
npm run build          # type-check + production build (copies public/wasm into dist/)
```

`npm run fetch-wasm -- clang` or `-- rust` downloads only one toolchain. Files are pinned to exact commits and
verified with SHA-256 (see `scripts/wasm-assets.manifest.json`). Python and JavaScript need no download
(Pyodide's files are fetched from jsDelivr on first Python run).

Click **Create room**, send the copied link to a teammate. To test alone, open the room link in two tabs.

## Language runtimes

| Language | How it runs | First run | Notes |
|----------|-------------|-----------|-------|
| JavaScript | Web Worker | instant | `console.*` -> terminal, top-level `await` works |
| Python | Pyodide in a Web Worker | ~5 s | `input()` not supported |
| C/C++ | clang + wasm-ld (LLVM 8) compiled to wasm, in a Web Worker | downloads ~60 MB (cached) | C++17, libc++, no exceptions, no threads, no `sleep`/`usleep`, stdin is empty. Source is always compiled as C++ |
| Rust | **Miri interpreter** compiled to wasm, in a Web Worker | downloads ~150 MB (cached) | Interprets code (does not compile to machine code), so it is slow. Single file, std only, no stdin. A panic prints an extra "unsupported Miri functionality" message (no unwinding) |
| Java | CheerpJ (JVM in WebAssembly) on the main thread | loads from CheerpJ's CDN | See "Java and licensing". Cannot be stopped once started; stdin is empty |

Why Rust is an interpreter: there is currently no prebuilt, working `rustc` for WebAssembly that can *link* an
executable (the available builds stop at object files). Miri sidesteps linking.

Downloaded files are kept in the browser's Cache Storage. If you replace files in `public/wasm/`,
bump `ASSET_CACHE_VERSION` in `src/languages/toolchains/browserAssetLoader.ts`.

## Java and licensing

CheerpJ's free **Community license does not allow self-hosting**. By default the app therefore loads the runtime from
Leaning Technologies' CDN (`https://cjrtnc.leaningtech.com/5.0/loader.js`), which is free for personal /
non-commercial use. To self-host you need a commercial CheerpJ license; put the files you receive under
`public/wasm/cheerpj/` and set `VITE_CHEERPJ_LOADER_URL=/wasm/cheerpj/loader.js` (see `.env.example`).
Your server must support HTTP Range requests (`python -m http.server` does not).

Java is compiled with the JDK's own `javac` inside CheerpJ, then run through a tiny driver
(`src/languages/toolchains/java/AvitoDriver.java`) that captures stdout/stderr into files for the page to read.

## Signaling server (important)

WebRTC peers need a *signaling server* to find each other (it carries no code, only connection setup).
The public defaults baked into y-webrtc are often offline. Run your own (a free tier on Fly.io / Render /
a small VPS works; see the y-webrtc README) and set it in `.env`:

```
VITE_SIGNALING_URLS=wss://your-signaling-server.example.com
```

Peers behind strict NAT/firewalls may additionally need a TURN server.

## Project layout

```
scripts/fetch-wasm-assets.mjs      downloads + verifies toolchains
src/
  main.ts                          wires everything together
  app/                             UI, collaboration, editor, splitter, terminal, toasts, settings
  languages/
    languagePlugin.ts              the plugin interface
    languageRegistry.ts            registry (plugins/*Plugin.ts are auto-registered)
    languageValidator.ts           detects code written in a language other than the selected runtime
    workerRunnerHost.ts            runs code in a Web Worker, supports Stop
    plugins/                       one file per language
    workers/                       javascript, python, cpp, rust workers
    toolchains/
      clang/                       TypeScript port of wasm-clang (memfs, tar, WASI process, compile+link+run)
      rust/                        Miri runner + vendored WASI shim
      java/                        CheerpJ loader, javac/run orchestration, AvitoDriver.java
```

## Add a language (Open/Closed)

Create `src/languages/plugins/<name>Plugin.ts` and `export default` a `LanguagePlugin`
(id = Monaco language id, starter code, fingerprints, `run`, `stop`). It is picked up automatically via
`import.meta.glob` — no existing file changes. See `THIRD_PARTY_NOTICES.md` for licenses of bundled toolchains.

Shortcuts: `Ctrl/Cmd + Enter` runs (or stops) the code.
