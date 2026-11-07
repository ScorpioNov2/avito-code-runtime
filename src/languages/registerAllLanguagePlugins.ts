import type { LanguagePlugin } from './languagePlugin';
import { registerLanguage } from './languageRegistry';

// Tự động tìm mọi file plugins/*Plugin.ts => thêm ngôn ngữ mới không cần sửa file này (OCP).
const pluginModules = import.meta.glob<{ default: LanguagePlugin }>('./plugins/*Plugin.ts', { eager: true });

export function registerAllLanguagePlugins(): void {
  Object.values(pluginModules).forEach((pluginModule) => registerLanguage(pluginModule.default));
}
