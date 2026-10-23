import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export class Logger {
  private filePath: string;

  constructor(logDirectory: string) {
    this.filePath = join(logDirectory, 'dexter.log');
    void mkdir(logDirectory, { recursive: true });
  }

  info(message: string, context?: Record<string, unknown>): void { void this.write('INFO', message, context); }
  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? { name: error.name, message: error.message } : undefined;
    void this.write('ERROR', message, detail);
  }

  private async write(level: string, message: string, context?: Record<string, unknown>): Promise<void> {
    const safe = context ? JSON.stringify(context, (_key, value) => /sk-|bearer|token/i.test(String(value)) ? '[REDACTED]' : value) : '';
    await appendFile(this.filePath, `${new Date().toISOString()} [${level}] ${message} ${safe}\n`).catch(() => undefined);
  }
}
