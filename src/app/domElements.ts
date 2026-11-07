export function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id} in index.html`);
  return element as T;
}

/** Gom mọi phần tử cố định của index.html vào một chỗ. */
export function queryDomElements() {
  return {
    createRoomButton: requireElement<HTMLButtonElement>('create-room-button'),
    createRoomLabel: requireElement<HTMLElement>('create-room-label'),
    toggleTerminalButton: requireElement<HTMLButtonElement>('toggle-terminal-button'),
    runButton: requireElement<HTMLButtonElement>('run-button'),
    settingsButton: requireElement<HTMLButtonElement>('settings-button'),
    workspace: requireElement<HTMLElement>('workspace'),
    editorHost: requireElement<HTMLElement>('editor-host'),
    splitter: requireElement<HTMLElement>('splitter'),
    terminalOutput: requireElement<HTMLElement>('terminal-output'),
    clearTerminalButton: requireElement<HTMLButtonElement>('clear-terminal-button'),
    closeTerminalButton: requireElement<HTMLButtonElement>('close-terminal-button'),
    languageSelect: requireElement<HTMLSelectElement>('language-select'),
    fontSizeInput: requireElement<HTMLInputElement>('font-size-input'),
    decreaseFontButton: requireElement<HTMLButtonElement>('decrease-font-button'),
    increaseFontButton: requireElement<HTMLButtonElement>('increase-font-button'),
    memberList: requireElement<HTMLElement>('member-list'),
    settingsDialog: requireElement<HTMLDialogElement>('settings-dialog'),
    toastContainer: requireElement<HTMLElement>('toast-container'),
  };
}
