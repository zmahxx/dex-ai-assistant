import { safeStorage } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export class ApiKeyService {
  private readonly filePath: string;
  constructor(userDataDirectory: string) { this.filePath = join(userDataDirectory, 'openai-key.bin'); }

  async get(): Promise<string | undefined> {
    try {
      if (!safeStorage.isEncryptionAvailable()) return undefined;
      return safeStorage.decryptString(await readFile(this.filePath)).trim() || undefined;
    } catch { return undefined; }
  }

  async save(apiKey: string): Promise<void> {
    const key = apiKey.trim();
    if (!key) throw new Error('API key cannot be empty.');
    if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows secure storage is not available.');
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, safeStorage.encryptString(key), { mode: 0o600 });
  }
}
