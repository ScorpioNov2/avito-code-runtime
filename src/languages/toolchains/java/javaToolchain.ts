import type { RunOutputChannel } from '../../languagePlugin';

/** Phần tối thiểu của CheerpJ mà ta dùng. Tách ra interface để kiểm thử mà không cần trình duyệt. */
export interface CheerpJApi {
  /** Ghi file từ JavaScript, Java chỉ đọc được (mount /str/). */
  addStringFile(path: string, content: string): void;
  /** Chạy `main` của một class. Trả về exit code. */
  runMain(className: string, classPath: string, args: string[]): Promise<number>;
  /** Đọc file Java đã ghi trong /files/. Trả về null nếu không có. */
  readTextFile(path: string): Promise<string | null>;
}

const WORK_ROOT = '/files/avito';
const DRIVER_DIRECTORY = `${WORK_ROOT}/driver`;
const DRIVER_CLASS = 'AvitoDriver';

/** Lọc các dòng stack trace nội bộ của driver/reflection cho dễ đọc. */
const INTERNAL_STACK_LINE = /^\s+at (java\.base\/(jdk\.internal\.reflect|java\.lang\.reflect)|AvitoDriver)/;

interface Segment {
  name: string;
  isPublic: boolean;
  hasMain: boolean;
}

function findClassSegments(source: string): Segment[] {
  const declarations = [...source.matchAll(/\b(public\s+)?(?:(?:final|abstract|sealed|strictfp)\s+)*class\s+([A-Za-z_$][\w$]*)/g)];
  return declarations.map((declaration, index) => {
    const end = declarations[index + 1]?.index ?? source.length;
    const body = source.slice(declaration.index, end);
    return { name: declaration[2], isPublic: Boolean(declaration[1]), hasMain: /\bvoid\s+main\s*\(/.test(body) };
  });
}

/** Tên class chứa `main` và tên file .java phù hợp (javac đòi file trùng tên public class). */
export function detectJavaEntryPoint(source: string): { className: string; fileName: string } {
  const segments = findClassSegments(source);
  const publicClass = segments.find((segment) => segment.isPublic);
  const mainClass = segments.find((segment) => segment.hasMain) ?? publicClass ?? segments[0];
  return {
    className: mainClass?.name ?? 'Main',
    fileName: `${publicClass?.name ?? 'Main'}.java`,
  };
}

function toLines(text: string | null): string[] {
  if (!text) return [];
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
}

/** Biên dịch bằng javac và chạy bằng JVM của CheerpJ, qua một driver nhỏ (AvitoDriver.java). */
export class JavaToolchain {
  private driverReady: Promise<CheerpJApi> | null = null;
  private runCounter = 0;

  constructor(
    private readonly loadApi: () => Promise<CheerpJApi>,
    private readonly driverSource: string,
  ) {}

  async run(source: string, output: RunOutputChannel): Promise<number> {
    const api = await this.getApiWithDriver(output);
    const { className, fileName } = detectJavaEntryPoint(source);

    // Mỗi lần chạy một thư mục riêng, để class cũ không bị chạy nhầm khi lần biên dịch này lỗi.
    this.runCounter += 1;
    const runDirectory = `${WORK_ROOT}/run-${Date.now().toString(36)}-${this.runCounter}`;
    const classesDirectory = `${runDirectory}/classes`;
    const sourcePath = `/str/${fileName}`;
    api.addStringFile(sourcePath, source);

    output.info('Compiling…');
    const compileLogDirectory = `${runDirectory}/compile-log`;
    const compileReturnCode = await api.runMain(DRIVER_CLASS, DRIVER_DIRECTORY, ['compile', classesDirectory, compileLogDirectory, sourcePath]);
    const compileResult = await this.readLogs(api, compileLogDirectory, compileReturnCode);
    toLines(compileResult.stderr).forEach((line) => output.stderr(line.replace(/^\/str\//, '')));
    if (compileResult.exitCode !== 0) {
      output.stderr('Compilation failed.');
      return compileResult.exitCode;
    }

    output.info('Running…');
    const runLogDirectory = `${runDirectory}/run-log`;
    const runReturnCode = await api.runMain(DRIVER_CLASS, `${DRIVER_DIRECTORY}:${classesDirectory}`, ['run', runLogDirectory, className]);
    const runResult = await this.readLogs(api, runLogDirectory, runReturnCode);
    toLines(runResult.stdout).forEach((line) => output.stdout(line));
    toLines(runResult.stderr)
      .filter((line) => !INTERNAL_STACK_LINE.test(line))
      .forEach((line) => output.stderr(line));
    if (runResult.exitCode !== 0) output.info(`Process exited with code ${runResult.exitCode}`);
    return runResult.exitCode;
  }

  /** Nạp CheerpJ và biên dịch driver một lần duy nhất. */
  private getApiWithDriver(output: RunOutputChannel): Promise<CheerpJApi> {
    this.driverReady ??= this.prepare(output).catch((error) => {
      this.driverReady = null; // cho phép thử lại
      throw error;
    });
    return this.driverReady;
  }

  private async prepare(output: RunOutputChannel): Promise<CheerpJApi> {
    output.info('Loading Java runtime (CheerpJ)…');
    const api = await this.loadApi();
    api.addStringFile(`/str/${DRIVER_CLASS}.java`, this.driverSource);
    const returnCode = await api.runMain('com.sun.tools.javac.Main', '', ['-d', DRIVER_DIRECTORY, `/str/${DRIVER_CLASS}.java`]);
    if (returnCode !== 0) throw new Error('Could not compile the Java driver inside CheerpJ.');
    return api;
  }

  private async readLogs(api: CheerpJApi, directory: string, fallbackExitCode: number) {
    const [stdout, stderr, exitText] = await Promise.all(
      ['stdout.txt', 'stderr.txt', 'exit.txt'].map((name) => api.readTextFile(`${directory}/${name}`)),
    );
    // Nếu chương trình tự gọi System.exit thì không có exit.txt, dùng mã trả về của CheerpJ.
    const parsedExitCode = exitText === null ? Number.NaN : Number.parseInt(exitText.trim(), 10);
    return { stdout, stderr, exitCode: Number.isNaN(parsedExitCode) ? fallbackExitCode : parsedExitCode };
  }
}
