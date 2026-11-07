/** Trả về nội dung file wasm/tar đã được tự host (đường dẫn tương đối trong public/wasm/). */
export type AssetLoader = (relativePath: string) => Promise<ArrayBuffer>;

/** Biên dịch một file .wasm thành module, dùng lại giữa các lần chạy. */
export async function compileWasmAsset(loadAsset: AssetLoader, relativePath: string): Promise<WebAssembly.Module> {
  return WebAssembly.compile(await loadAsset(relativePath));
}
