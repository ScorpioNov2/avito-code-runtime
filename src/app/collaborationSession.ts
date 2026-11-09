import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { Awareness } from 'y-protocols/awareness';

export interface RoomMember {
  clientId: number;
  name: string;
  color: string;
  isMe: boolean;
}

const ROOM_URL_PARAM = 'room';
const ROOM_ID_PATTERN = /^[\w-]{4,64}$/;
const MEMBER_COLORS = ['#6b3fa0', '#b4413a', '#1f7a5a', '#2563eb', '#b45309', '#0e7490', '#9d174d', '#4d5b0c'];

// Signaling server tuỳ chỉnh (xem README). Để trống = dùng server mặc định của y-webrtc.
const customSignalingUrls: string[] = ((import.meta.env.VITE_SIGNALING_URLS as string | undefined) ?? '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

/**
 * Một phiên làm việc: tài liệu Yjs dùng chung (code + cấu hình phòng) và danh sách thành viên.
 * Ban đầu chạy "solo" (chưa kết nối ai). Khi tạo/vào phòng thì gắn y-webrtc vào đúng tài liệu đó.
 */
export class CollaborationSession {
  readonly document = new Y.Doc();
  readonly sharedCode = this.document.getText('code');
  /** Cấu hình dùng chung của phòng, hiện có: `language`. */
  readonly sharedSettings = this.document.getMap<string>('settings');
  readonly awareness = new Awareness(this.document);

  private provider: WebrtcProvider | null = null;
  private roomId: string | null = null;
  private lastMembersKey = '';

  constructor(displayName: string) {
    this.awareness.setLocalStateField('user', {
      name: displayName,
      color: MEMBER_COLORS[this.awareness.clientID % MEMBER_COLORS.length],
    });
  }

  static readRoomIdFromUrl(): string | null {
    const roomId = new URLSearchParams(window.location.hash.slice(1)).get(ROOM_URL_PARAM);
    return roomId && ROOM_ID_PATTERN.test(roomId) ? roomId : null;
  }

  /** Lấy Room ID từ thứ người dùng nhập: ID trần, link phòng đầy đủ, hoặc chuỗi `room=<id>`. Không hợp lệ thì trả null. */
  static parseRoomId(input: string): string | null {
    const text = input.trim();
    if (ROOM_ID_PATTERN.test(text)) return text;
    const match = /(?:^|[#?&])room=([\w-]{4,64})(?![\w-])/.exec(text);
    return match ? match[1] : null;
  }

  static buildRoomLink(roomId: string): string {
    return `${window.location.origin}${window.location.pathname}#${ROOM_URL_PARAM}=${roomId}`;
  }

  get currentRoomId(): string | null {
    return this.roomId;
  }

  joinRoom(roomId: string): void {
    if (this.provider) return;
    this.roomId = roomId;
    this.provider = new WebrtcProvider(`avito-code:${roomId}`, this.document, {
      awareness: this.awareness,
      ...(customSignalingUrls.length > 0 ? { signaling: customSignalingUrls } : {}),
    });
  }

  /** Tạo phòng mới (giữ nguyên code đang viết) và ghi Room ID lên URL để chia sẻ. */
  createRoom(): string {
    const randomBytes = crypto.getRandomValues(new Uint8Array(6));
    const roomId = Array.from(randomBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    this.joinRoom(roomId);
    window.history.replaceState(null, '', CollaborationSession.buildRoomLink(roomId));
    return roomId;
  }

  setLocalName(name: string): void {
    const currentUser = this.awareness.getLocalState()?.user as { name: string; color: string } | undefined;
    this.awareness.setLocalStateField('user', { ...currentUser, name });
  }

  getMembers(): RoomMember[] {
    const members: RoomMember[] = [];
    this.awareness.getStates().forEach((state, clientId) => {
      const user = state.user as { name?: string; color?: string } | undefined;
      if (!user?.name) return;
      members.push({ clientId, name: user.name, color: user.color ?? MEMBER_COLORS[0], isMe: clientId === this.awareness.clientID });
    });
    return members.sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.clientId - b.clientId);
  }

  /** Gọi listener khi danh sách thành viên (tên/màu/người vào-ra) thay đổi; bỏ qua cập nhật con trỏ. */
  onMembersChanged(listener: (members: RoomMember[]) => void): void {
    const notifyIfChanged = (): void => {
      const members = this.getMembers();
      const key = JSON.stringify(members);
      if (key === this.lastMembersKey) return;
      this.lastMembersKey = key;
      listener(members);
    };
    this.awareness.on('change', notifyIfChanged);
    notifyIfChanged();
  }
}
