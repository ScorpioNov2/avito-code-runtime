import type { CheerpJApi } from './javaToolchain';

// Mặc định dùng runtime CheerpJ do Leaning Technologies host (miễn phí cho dự án cá nhân/phi thương mại).
// Muốn TỰ HOST runtime: cần giấy phép thương mại của CheerpJ, rồi đặt VITE_CHEERPJ_LOADER_URL=/wasm/cheerpj/loader.js
const DEFAULT_LOADER_URL = 'https://cjrtnc.leaningtech.com/5.0/loader.js';
const DEFAULT_JAVA_VERSION = 21;

declare global {
  // Các hàm toàn cục do loader.js của CheerpJ định nghĩa.
  var cheerpjInit: (options?: { version?: number }) => Promise<void>;
  var cheerpjRunMain: (className: string, classPath: string, ...args: string[]) => Promise<number>;
  var cheerpOSAddStringFile: (path: string, content: string) => void;
  var cjFileBlob: (path: string) => Promise<Blob>;
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Cannot load the CheerpJ loader from ${url}`));
    document.head.append(script);
  });
}

let apiPromise: Promise<CheerpJApi> | null = null;

/** Nạp CheerpJ vào trang (một lần) và trả về API tối thiểu mà JavaToolchain cần. CheerpJ chạy trên luồng chính. */
export function loadCheerpJApi(): Promise<CheerpJApi> {
  apiPromise ??= (async (): Promise<CheerpJApi> => {
    const loaderUrl = (import.meta.env.VITE_CHEERPJ_LOADER_URL as string | undefined) || DEFAULT_LOADER_URL;
    const javaVersion = Number(import.meta.env.VITE_CHEERPJ_JAVA_VERSION) || DEFAULT_JAVA_VERSION;
    await loadScript(loaderUrl);
    await cheerpjInit({ version: javaVersion });

    return {
      addStringFile: (path, content) => cheerpOSAddStringFile(path, content),
      runMain: (className, classPath, args) => cheerpjRunMain(className, classPath, ...args),
      readTextFile: async (path) => {
        try {
          return await (await cjFileBlob(path)).text();
        } catch {
          return null; // file không tồn tại
        }
      },
    };
  })().catch((error) => {
    apiPromise = null;
    throw error;
  });
  return apiPromise;
}
