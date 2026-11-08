import './styles.css';
import './app/monacoEnvironment';
import { CollaborationSession } from './app/collaborationSession';
import { queryDomElements } from './app/domElements';
import { EditorController } from './app/editorController';
import { applyChromeTheme } from './app/chromeTheme';
import { getAllEditorThemes, getEditorTheme } from './app/editorThemes/editorThemeRegistry';
import { QrDialog } from './app/qrDialog';
import { keepRemoteCursorStylesInSync } from './app/remoteCursorStyles';
import { RunController } from './app/runController';
import { SettingsDialog } from './app/settingsDialog';
import { SplitPane } from './app/splitPane';
import { StatusBar } from './app/statusBar';
import { TerminalPanel } from './app/terminalPanel';
import { ToastNotifier } from './app/toastNotifier';
import { PreferenceStore } from './app/userPreferences';
import { DEFAULT_LANGUAGE_ID, getAllLanguages, getLanguage, hasLanguage } from './languages/languageRegistry';
import { registerAllLanguagePlugins } from './languages/registerAllLanguagePlugins';

registerAllLanguagePlugins();

const dom = queryDomElements();
const preferences = new PreferenceStore();
const session = new CollaborationSession(preferences.value.displayName);
const toast = new ToastNotifier(dom.toastContainer);

// Vào bằng link có Room ID => kết nối phòng. Không có => bắt đầu solo với code mẫu Python.
const roomIdFromUrl = CollaborationSession.readRoomIdFromUrl();
if (roomIdFromUrl) {
  session.joinRoom(roomIdFromUrl);
} else {
  seedNewDocument();
}

function getSharedLanguageId(): string {
  const languageId = session.sharedSettings.get('language');
  return languageId && hasLanguage(languageId) ? languageId : DEFAULT_LANGUAGE_ID;
}

function seedNewDocument(): void {
  const defaultLanguage = getLanguage(DEFAULT_LANGUAGE_ID);
  session.document.transact(() => {
    session.sharedSettings.set('language', defaultLanguage.id);
    session.sharedCode.insert(0, defaultLanguage.starterCode);
  });
}

// ---- Editor + đồng bộ ----
EditorController.registerThemes(getAllEditorThemes());
const editor = new EditorController(dom.editorHost, {
  languageId: getSharedLanguageId(),
  theme: preferences.value.editorTheme,
  fontSize: preferences.value.fontSize,
});
editor.bindToSharedText(session.sharedCode, session.awareness);
keepRemoteCursorStylesInSync(session.awareness);

// ---- Terminal + thanh kéo ----
const terminal = new TerminalPanel(dom.workspace, dom.terminalOutput, (isVisible) => {
  dom.toggleTerminalButton.classList.toggle('is-active', isVisible);
  dom.toggleTerminalButton.setAttribute('aria-pressed', String(isVisible));
});
new SplitPane(dom.workspace, dom.splitter, () => editor.layoutNow());

// ---- Thanh trạng thái ----
const statusBar = new StatusBar(dom, {
  // Chỉ ghi vào cấu hình dùng chung; mọi máy (kể cả máy này) đổi ngôn ngữ qua observer bên dưới.
  onLanguageChosen: (languageId) => session.sharedSettings.set('language', languageId),
  onFontSizeChosen: (fontSize) => preferences.update({ fontSize }),
});
statusBar.setLanguages(getAllLanguages());

function applySharedLanguage(): void {
  const languageId = getSharedLanguageId();
  editor.setLanguage(languageId);
  statusBar.setSelectedLanguage(languageId);
}
session.sharedSettings.observe(applySharedLanguage);
applySharedLanguage();

function applyPreferences(): void {
  const { editorTheme, fontSize, displayName, showRemoteNames } = preferences.value;
  const theme = getEditorTheme(editorTheme);
  editor.setTheme(theme.id);
  applyChromeTheme(theme);
  editor.setFontSize(fontSize);
  statusBar.setFontSize(fontSize);
  session.setLocalName(displayName);
  document.body.classList.toggle('hide-remote-names', !showRemoteNames);
}
preferences.subscribe(applyPreferences);
applyPreferences();

session.onMembersChanged((members) => statusBar.renderMembers(members));

// ---- Nút bấm ----
const settingsDialog = new SettingsDialog(dom.settingsDialog, preferences);
const runController = new RunController({
  getCode: () => editor.getCode(),
  getLanguageId: getSharedLanguageId,
  terminal,
  toast,
  runButton: dom.runButton,
});

function refreshRoomUi(): void {
  const roomId = session.currentRoomId;
  dom.createRoomButton.hidden = roomId !== null;
  dom.roomInfo.hidden = roomId === null;
  if (roomId) {
    dom.roomName.textContent = `Room ${roomId.slice(0, 6)}`;
    dom.roomName.title = `Room ID: ${roomId}`;
  }
}

async function copyRoomLink(): Promise<void> {
  const roomId = session.currentRoomId;
  if (!roomId) return;
  const roomLink = CollaborationSession.buildRoomLink(roomId);
  try {
    await navigator.clipboard.writeText(roomLink);
    toast.show({ title: 'Room link copied', message: 'Send it to a teammate to code together.', kind: 'success' });
  } catch {
    toast.show({ title: 'Room link', message: roomLink, kind: 'info', durationMs: 15000 });
  }
}

const qrDialog = new QrDialog(dom.qrDialog, () => void copyRoomLink());

dom.createRoomButton.addEventListener('click', () => {
  session.createRoom();
  refreshRoomUi();
  void copyRoomLink();
});
dom.copyLinkButton.addEventListener('click', () => void copyRoomLink());
dom.showQrButton.addEventListener('click', () => {
  const roomId = session.currentRoomId;
  if (roomId) qrDialog.open(CollaborationSession.buildRoomLink(roomId));
});
dom.toggleTerminalButton.addEventListener('click', () => terminal.toggle());
dom.closeTerminalButton.addEventListener('click', () => terminal.setVisible(false));
dom.clearTerminalButton.addEventListener('click', () => terminal.clear());
dom.runButton.addEventListener('click', () => void runController.toggleRun());
dom.settingsButton.addEventListener('click', () => settingsDialog.open());
editor.addRunShortcut(() => void runController.toggleRun());
window.addEventListener('hashchange', () => window.location.reload());

refreshRoomUi();
