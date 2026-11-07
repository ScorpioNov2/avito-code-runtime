import { requireElement } from './domElements';
import { EDITOR_THEMES, type EditorThemeName, type PreferenceStore } from './userPreferences';

/** Popup Settings: nhập tên hiển thị + chọn theme của Monaco. */
export class SettingsDialog {
  private readonly form = requireElement<HTMLFormElement>('settings-form');
  private readonly nameInput = requireElement<HTMLInputElement>('settings-name-input');
  private readonly themeSelect = requireElement<HTMLSelectElement>('settings-theme-select');
  private readonly cancelButton = requireElement<HTMLButtonElement>('settings-cancel-button');

  constructor(
    private readonly dialog: HTMLDialogElement,
    private readonly preferences: PreferenceStore,
  ) {
    this.themeSelect.replaceChildren(...EDITOR_THEMES.map((theme) => new Option(theme.label, theme.id)));
    this.cancelButton.addEventListener('click', () => this.dialog.close());
    // form method="dialog" tự đóng popup sau khi submit.
    this.form.addEventListener('submit', () => {
      this.preferences.update({
        displayName: this.nameInput.value,
        editorTheme: this.themeSelect.value as EditorThemeName,
      });
    });
  }

  open(): void {
    const { displayName, editorTheme } = this.preferences.value;
    this.nameInput.value = displayName;
    this.themeSelect.value = editorTheme;
    this.dialog.showModal();
  }
}
