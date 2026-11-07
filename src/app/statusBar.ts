import type { LanguagePlugin } from '../languages/languagePlugin';
import type { RoomMember } from './collaborationSession';

export interface StatusBarElements {
  languageSelect: HTMLSelectElement;
  fontSizeInput: HTMLInputElement;
  decreaseFontButton: HTMLButtonElement;
  increaseFontButton: HTMLButtonElement;
  memberList: HTMLElement;
}

export interface StatusBarHandlers {
  onLanguageChosen(languageId: string): void;
  onFontSizeChosen(fontSize: number): void;
}

/** Thanh dưới cùng: chọn ngôn ngữ, cỡ chữ, danh sách người đang trong phòng. */
export class StatusBar {
  constructor(
    private readonly elements: StatusBarElements,
    handlers: StatusBarHandlers,
  ) {
    const { languageSelect, fontSizeInput, decreaseFontButton, increaseFontButton } = elements;
    const currentFontSize = (): number => Number(fontSizeInput.value) || 14;

    languageSelect.addEventListener('change', () => handlers.onLanguageChosen(languageSelect.value));
    decreaseFontButton.addEventListener('click', () => handlers.onFontSizeChosen(currentFontSize() - 1));
    increaseFontButton.addEventListener('click', () => handlers.onFontSizeChosen(currentFontSize() + 1));
    fontSizeInput.addEventListener('change', () => handlers.onFontSizeChosen(currentFontSize()));
  }

  setLanguages(languages: LanguagePlugin[]): void {
    this.elements.languageSelect.replaceChildren(...languages.map((language) => new Option(language.displayName, language.id)));
  }

  setSelectedLanguage(languageId: string): void {
    this.elements.languageSelect.value = languageId;
  }

  setFontSize(fontSize: number): void {
    this.elements.fontSizeInput.value = String(fontSize);
  }

  renderMembers(members: RoomMember[]): void {
    const chips = members.map((member) => {
      const chip = document.createElement('span');
      chip.className = 'member-chip';
      chip.style.backgroundColor = member.color;
      chip.textContent = member.isMe ? `${member.name} (me)` : member.name;
      return chip;
    });
    this.elements.memberList.replaceChildren(...chips);
  }
}
