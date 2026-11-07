import type { LanguagePlugin, RunOutputChannel } from '../languages/languagePlugin';
import { getAllLanguages, getLanguage } from '../languages/languageRegistry';
import { findLanguageMismatch } from '../languages/languageValidator';
import type { TerminalPanel } from './terminalPanel';
import type { ToastNotifier } from './toastNotifier';

export interface RunControllerDependencies {
  getCode(): string;
  getLanguageId(): string;
  terminal: TerminalPanel;
  toast: ToastNotifier;
  runButton: HTMLButtonElement;
}

/** Xử lý nút RUN: kiểm tra -> chạy -> in kết quả. Bấm lần nữa khi đang chạy = dừng. */
export class RunController {
  private activePlugin: LanguagePlugin | null = null;

  constructor(private readonly dependencies: RunControllerDependencies) {}

  async toggleRun(): Promise<void> {
    if (this.activePlugin) {
      this.activePlugin.stop();
      return;
    }
    await this.startRun();
  }

  private async startRun(): Promise<void> {
    const { getCode, getLanguageId, terminal, toast } = this.dependencies;
    const plugin = getLanguage(getLanguageId());
    const code = getCode();

    if (!code.trim()) {
      toast.show({ title: 'Nothing to run', message: 'The editor is empty. Write some code, then press Run.', kind: 'error' });
      return;
    }

    const mismatchedLanguage = findLanguageMismatch(code, plugin, getAllLanguages());
    if (mismatchedLanguage) {
      toast.show({
        title: 'Code doesn’t match the runtime',
        message: `The runtime is set to ${plugin.displayName}, but the code looks like ${mismatchedLanguage.displayName}. Change the language in the bottom bar or fix the code.`,
        kind: 'error',
      });
      return;
    }

    terminal.setVisible(true);
    terminal.clear();
    const output = this.createOutputChannel();
    output.info(`▶ Running ${plugin.displayName}…`);

    this.setRunning(plugin);
    const startedAt = performance.now();
    try {
      await plugin.run(code, output);
    } catch (error) {
      output.stderr(error instanceof Error ? error.message : String(error));
    } finally {
      this.setRunning(null);
      output.info(`Finished in ${Math.round(performance.now() - startedAt)} ms`);
    }
  }

  private createOutputChannel(): RunOutputChannel {
    const { terminal } = this.dependencies;
    return {
      stdout: (line) => terminal.appendLine(line, 'stdout'),
      stderr: (line) => terminal.appendLine(line, 'stderr'),
      info: (line) => terminal.appendLine(line, 'info'),
    };
  }

  private setRunning(plugin: LanguagePlugin | null): void {
    const { runButton } = this.dependencies;
    this.activePlugin = plugin;
    runButton.classList.toggle('is-running', plugin !== null);
    const label = plugin ? 'Stop' : 'Run code';
    runButton.title = label;
    runButton.setAttribute('aria-label', label);
  }
}
