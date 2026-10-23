import { mkdir, readdir, stat } from 'node:fs/promises';
import { shell } from 'electron';
import { z } from 'zod';
import { RiskLevel } from '../security/permissions';
import { validateAbsolutePath } from '../security/validation';
import type { DexterTool } from '../agent/toolTypes';

const pathInput = z.object({ path: z.string().min(1) }).strict();

export const listDirectoryTool: DexterTool<{ path: string }> = {
  name: 'list_directory', description: 'List the immediate contents of a directory with basic metadata. Never recursive.', riskLevel: RiskLevel.SAFE,
  inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Absolute directory path' } }, required: ['path'], additionalProperties: false },
  async execute(raw) {
    const { path } = pathInput.parse(raw); const safePath = validateAbsolutePath(path);
    const entries = await readdir(safePath, { withFileTypes: true });
    const limited = entries.slice(0, 250);
    const result = await Promise.all(limited.map(async (entry) => {
      const fullPath = `${safePath}\\${entry.name}`;
      const details = await stat(fullPath);
      return { name: entry.name, type: entry.isDirectory() ? 'directory' : 'file', size: entry.isFile() ? details.size : undefined, modified: details.mtime.toISOString() };
    }));
    return { path: safePath, entries: result, truncated: entries.length > limited.length };
  },
};

export const openFolderTool: DexterTool<{ path: string }> = {
  name: 'open_folder', description: 'Open an existing directory in Windows File Explorer.', riskLevel: RiskLevel.SAFE,
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false },
  async execute(raw) {
    const { path } = pathInput.parse(raw); const safePath = validateAbsolutePath(path);
    const info = await stat(safePath); if (!info.isDirectory()) throw new Error('The path is not a directory.');
    const result = await shell.openPath(safePath); if (result) throw new Error(result);
    return { opened: safePath };
  },
};

export const createDirectoryTool: DexterTool<{ path: string }> = {
  name: 'create_directory', description: 'Create one new directory. Requires user confirmation.', riskLevel: RiskLevel.CONFIRM,
  inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'], additionalProperties: false },
  confirmationSummary: (input) => ({ title: 'Create directory?', description: `Dex wants to create ${input.path}`, details: { path: input.path } }),
  async execute(raw) {
    const { path } = pathInput.parse(raw); const safePath = validateAbsolutePath(path);
    try { await stat(safePath); throw new Error('A file or directory already exists at that path.'); } catch (error) {
      if (error instanceof Error && error.message.startsWith('A file')) throw error;
    }
    await mkdir(safePath); return { created: safePath };
  },
};
