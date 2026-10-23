import { randomUUID } from 'node:crypto';
import { app, dialog, ipcMain, type BrowserWindow } from 'electron';
import { z } from 'zod';
import type { ConfirmationRequest, ToolActivityEvent } from '../shared/types';
import type { DesktopAssistant } from './agent/assistant';
import type { DexterTool } from './agent/toolTypes';
import type { CodexService } from './services/codex';
import type { ApiKeyService } from './services/apiKey';
import type { Logger } from './services/logger';
import type { OpenAIService } from './services/openai';
import type { SettingsService } from './services/settings';
import { showWidget } from './widgetWindow';

const settingsSchema = z.object({
  model: z.string().min(1).max(100), projectsDirectory: z.string().min(1), globalShortcut: z.string().min(1).max(100),
  startMinimized: z.boolean(), startWithWindows: z.boolean(),
}).strict();

export interface IpcDependencies {
  window: BrowserWindow; assistant: DesktopAssistant; settings: SettingsService; openai: OpenAIService;
  apiKeys: ApiKeyService; codex: CodexService; logger: Logger; onSettingsSaved: () => Promise<void>;
}

export class ConfirmationController {
  private pending = new Map<string, (approved: boolean) => void>();
  constructor(private window: BrowserWindow) {}
  request(tool: DexterTool, input: Record<string, unknown>): Promise<boolean> {
    const id = randomUUID(); const summary = tool.confirmationSummary?.(input) ?? { title: `Allow ${tool.name}?`, description: 'Dex wants to perform this action.', details: input };
    const request: ConfirmationRequest = { id, toolName: tool.name, ...summary };
    this.window.webContents.send('confirmation:request', request);
    return new Promise((resolve) => this.pending.set(id, resolve));
  }
  respond(id: string, approved: boolean): void { const resolve = this.pending.get(id); if (!resolve) return; this.pending.delete(id); resolve(approved); }
  cancelAll(): void { for (const resolve of this.pending.values()) resolve(false); this.pending.clear(); }
}

export function registerIpc(deps: IpcDependencies, confirmations: ConfirmationController): void {
  ipcMain.handle('chat:send', async (_event, raw: unknown) => {
    const message = z.string().min(1).max(30_000).parse(raw);
    try { return await deps.assistant.send(message); } catch (error) { deps.logger.error('Assistant request failed', error); throw error; }
  });
  ipcMain.handle('chat:new', () => deps.assistant.resetConversation());
  ipcMain.handle('settings:get', () => deps.settings.get());
  ipcMain.handle('settings:save', async (_event, raw: unknown) => {
    const settings = settingsSchema.parse(raw); await deps.settings.save(settings);
    app.setLoginItemSettings({ openAtLogin: settings.startWithWindows }); await deps.onSettingsSaved(); return settings;
  });
  ipcMain.handle('settings:choose-directory', async () => {
    const result = await dialog.showOpenDialog(deps.window, { properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : result.filePaths[0] ?? null;
  });
  ipcMain.handle('settings:api-key-status', () => deps.openai.isConfigured());
  ipcMain.handle('settings:save-api-key', async (_event, raw: unknown) => {
    const apiKey = z.string().trim().min(20).max(1_000).parse(raw);
    await deps.apiKeys.save(apiKey); deps.openai.setApiKey(apiKey);
  });
  ipcMain.handle('app:first-run-status', async () => {
    const [settings, codex] = await Promise.all([deps.settings.get(), deps.codex.checkInstalled()]);
    return { apiKeyConfigured: deps.openai.isConfigured(), codexInstalled: codex.installed, codexVersion: codex.version, projectsDirectory: settings.projectsDirectory };
  });
  ipcMain.handle('app:open-settings', () => { showWidget(deps.window); deps.window.webContents.send('app:show-settings'); });
  ipcMain.handle('app:hide-window', () => deps.window.hide());
  ipcMain.handle('confirmation:respond', (_event, raw: unknown) => { const response = z.object({ id: z.string().uuid(), approved: z.boolean() }).parse(raw); confirmations.respond(response.id, response.approved); });
  ipcMain.handle('codex:cancel', (_event, raw: unknown) => deps.codex.cancelTask(z.string().uuid().parse(raw)));
}

export function emitToolActivity(window: BrowserWindow, toolName: string, message: string, status: ToolActivityEvent['status']): void {
  window.webContents.send('tool:activity', { id: randomUUID(), toolName, message, status } satisfies ToolActivityEvent);
}
