import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import type { AppSettings } from '../../shared/types';

export async function defaultProjectsDirectory(): Promise<string> {
  const preferred = 'D:\\Projects';
  try { await access(preferred, constants.W_OK); return preferred; } catch { return join(homedir(), 'Documents', 'AI Projects'); }
}

export class SettingsService {
  private readonly filePath: string;
  constructor(userDataDirectory: string) { this.filePath = join(userDataDirectory, 'settings.json'); }

  async defaults(): Promise<AppSettings> {
    return {
      model: 'gpt-5.5',
      projectsDirectory: await defaultProjectsDirectory(),
      globalShortcut: 'Control+Space',
      startMinimized: false,
      startWithWindows: false,
    };
  }

  async get(): Promise<AppSettings> {
    const defaults = await this.defaults();
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<AppSettings>;
      return { ...defaults, ...parsed };
    } catch { return defaults; }
  }

  async save(settings: AppSettings): Promise<AppSettings> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(settings, null, 2), { encoding: 'utf8', mode: 0o600 });
    return settings;
  }
}
