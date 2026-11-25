import { defineConfig } from 'vite';
import { seoPlugin } from './scripts/seoPlugin';

export default defineConfig({
  // Injects SEO meta, Open Graph and JSON-LD into index.html and generates sitemap.xml + robots.txt (text lives in seo.config.ts).
  plugins: [seoPlugin()],
  // simple-peer (dùng bởi y-webrtc) cần biến global trong trình duyệt.
  define: { global: 'globalThis' },
  // Tránh nạp 2 bản yjs / monaco khác nhau (gây lỗi khó hiểu khi đồng bộ).
  resolve: { dedupe: ['yjs', 'monaco-editor'] },
  // Pyodide tự nạp file .wasm của nó, không để Vite pre-bundle.
  optimizeDeps: { exclude: ['pyodide'] },
  // Web Worker dạng ES module để dùng được import trong worker.
  worker: { format: 'es' },
});
