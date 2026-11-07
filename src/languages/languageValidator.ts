import type { LanguagePlugin } from './languagePlugin';

/** Ngôn ngữ khác phải đạt ít nhất ngần này điểm mới đủ tự tin để chặn chạy. */
const MIN_CONFIDENT_SCORE = 4;
/** ...và phải hơn điểm của ngôn ngữ đang chọn ít nhất ngần này (tránh báo nhầm). */
const MIN_LEAD_OVER_SELECTED = 3;

function scoreCodeAgainst(code: string, plugin: LanguagePlugin): number {
  return plugin.fingerprints.reduce((total, fingerprint) => total + (fingerprint.pattern.test(code) ? fingerprint.weight : 0), 0);
}

/** Trả về ngôn ngữ mà code có vẻ đang viết, nếu nó lệch với runtime đã chọn; ngược lại trả null. */
export function findLanguageMismatch(code: string, selected: LanguagePlugin, allLanguages: LanguagePlugin[]): LanguagePlugin | null {
  const selectedScore = scoreCodeAgainst(code, selected);
  let bestOther: { plugin: LanguagePlugin; score: number } | null = null;

  for (const candidate of allLanguages) {
    if (candidate.id === selected.id) continue;
    const score = scoreCodeAgainst(code, candidate);
    if (!bestOther || score > bestOther.score) bestOther = { plugin: candidate, score };
  }

  const isConfident = bestOther !== null && bestOther.score >= MIN_CONFIDENT_SCORE && bestOther.score >= selectedScore + MIN_LEAD_OVER_SELECTED;
  return isConfident ? bestOther!.plugin : null;
}
