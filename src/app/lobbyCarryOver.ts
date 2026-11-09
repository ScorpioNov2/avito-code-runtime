const STORAGE_KEY = 'avito-code:lobby-carry-over';

export interface LobbyCarryOver {
  code: string;
  languageId: string;
}

/** Khi rời phòng, trang tải lại để về sảnh sạch; code đang có được giữ lại cho lần mở sảnh kế tiếp (chỉ trong tab này). */
export function saveLobbyCarryOver(value: LobbyCarryOver): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Trình duyệt chặn sessionStorage: sảnh sẽ dùng code mẫu.
  }
}

/** Lấy (và xoá) code đã giữ lại, nếu có. Chỉ dùng được một lần. */
export function takeLobbyCarryOver(): LobbyCarryOver | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<LobbyCarryOver>) : null;
    return typeof parsed?.code === 'string' && typeof parsed.languageId === 'string' ? { code: parsed.code, languageId: parsed.languageId } : null;
  } catch {
    return null;
  }
}
