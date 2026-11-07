import type { JavaRuntime, JavaRuntimeFactory } from './javaToolchain';

interface JavaWasmGlobal {
  createRuntime(options: { baseUrl: string }): Promise<JavaRuntime>;
}

declare global {
  // File java-wasm.iife.js tự gán biến toàn cục này.
  var JavaWasm: JavaWasmGlobal | undefined;
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Missing Java toolchain. Run "npm run fetch-wasm" to download it into public/wasm/.'));
    document.head.append(script);
  });
}

/** Nạp @live-codes/java-wasm từ public/wasm/java/ (tự host) và tạo runtime. */
export const createBrowserJavaRuntime: JavaRuntimeFactory = async () => {
  const baseUrl = new URL(`${import.meta.env.BASE_URL}wasm/java/`, document.baseURI).href;
  if (!globalThis.JavaWasm) await loadScript(`${baseUrl}java-wasm.iife.js`);
  if (!globalThis.JavaWasm) throw new Error('Java toolchain loaded but JavaWasm is not defined.');
  return globalThis.JavaWasm.createRuntime({ baseUrl });
};
