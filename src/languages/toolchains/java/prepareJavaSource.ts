/**
 * Engine Java (teavm-javac) luôn biên dịch code thành file `Main.java`, nên javac sẽ từ chối
 * một class `public` có tên khác `Main`. Hàm này gỡ chữ `public` khỏi các kiểu top-level như vậy
 * (thay bằng khoảng trắng nên số dòng và cột không đổi) và tìm class chứa `main`.
 */
export interface PreparedJavaSource {
  source: string;
  mainClass: string;
}

interface TopLevelType {
  name: string;
  isPublic: boolean;
  start: number;
  end: number;
  publicKeywordIndex: number;
}

/** Thay nội dung comment và chuỗi/ký tự bằng khoảng trắng (giữ nguyên độ dài) để regex không bị đánh lừa. */
function blankOutCommentsAndLiterals(source: string): string {
  const chars = source.split('');
  const blank = (from: number, to: number): void => {
    for (let i = from; i < to; i++) if (chars[i] !== '\n') chars[i] = ' ';
  };

  let i = 0;
  while (i < source.length) {
    const rest = source.slice(i, i + 3);
    if (rest.startsWith('//')) {
      const end = source.indexOf('\n', i);
      const stop = end === -1 ? source.length : end;
      blank(i, stop);
      i = stop;
    } else if (rest.startsWith('/*')) {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
    } else if (rest === '"""') {
      const end = source.indexOf('"""', i + 3);
      const stop = end === -1 ? source.length : end + 3;
      blank(i, stop);
      i = stop;
    } else if (source[i] === '"' || source[i] === "'") {
      const quote = source[i];
      let j = i + 1;
      while (j < source.length && source[j] !== quote && source[j] !== '\n') j += source[j] === '\\' ? 2 : 1;
      blank(i, Math.min(j + 1, source.length));
      i = j + 1;
    } else {
      i++;
    }
  }
  return chars.join('');
}

function findTopLevelTypes(clean: string): TopLevelType[] {
  // depthBefore[i] = độ sâu ngoặc nhọn ngay trước ký tự i.
  const depthBefore = new Array<number>(clean.length + 1).fill(0);
  let depth = 0;
  for (let i = 0; i < clean.length; i++) {
    depthBefore[i] = depth;
    if (clean[i] === '{') depth++;
    else if (clean[i] === '}') depth = Math.max(0, depth - 1);
  }
  depthBefore[clean.length] = depth;

  const types: TopLevelType[] = [];
  const declaration = /\b((?:(?:public|abstract|final|sealed|strictfp)\s+)*)(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of clean.matchAll(declaration)) {
    const start = match.index;
    if (depthBefore[start] !== 0) continue; // class lồng nhau, bỏ qua

    const openBrace = clean.indexOf('{', start);
    if (openBrace === -1) continue;
    let end = openBrace;
    while (end < clean.length && depthBefore[end + 1] !== 0) end++;

    const publicInModifiers = /\bpublic\b/.exec(match[1]);
    types.push({
      name: match[3],
      isPublic: publicInModifiers !== null,
      start,
      end: end + 1,
      publicKeywordIndex: publicInModifiers ? start + publicInModifiers.index : -1,
    });
  }
  return types;
}

export function prepareJavaSource(source: string): PreparedJavaSource {
  const clean = blankOutCommentsAndLiterals(source);
  const types = findTopLevelTypes(clean);

  const typeWithMain = types.find((type) => /\bvoid\s+main\s*\(/.test(clean.slice(type.start, type.end)));
  const mainClass = (typeWithMain ?? types.find((type) => type.isPublic) ?? types[0])?.name ?? 'Main';

  let prepared = source;
  for (const type of types) {
    if (type.isPublic && type.name !== 'Main') {
      prepared = `${prepared.slice(0, type.publicKeywordIndex)}      ${prepared.slice(type.publicKeywordIndex + 'public'.length)}`;
    }
  }
  return { source: prepared, mainClass };
}
