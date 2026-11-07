import type { LanguagePlugin } from './languagePlugin';

export const DEFAULT_LANGUAGE_ID = 'python';

const pluginsById = new Map<string, LanguagePlugin>();

export function registerLanguage(plugin: LanguagePlugin): void {
  if (pluginsById.has(plugin.id)) {
    throw new Error(`Language "${plugin.id}" is already registered.`);
  }
  pluginsById.set(plugin.id, plugin);
}

export function hasLanguage(languageId: string): boolean {
  return pluginsById.has(languageId);
}

export function getLanguage(languageId: string): LanguagePlugin {
  const plugin = pluginsById.get(languageId);
  if (!plugin) throw new Error(`Language "${languageId}" is not registered.`);
  return plugin;
}

export function getAllLanguages(): LanguagePlugin[] {
  return [...pluginsById.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
