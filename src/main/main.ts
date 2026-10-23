import { app, BrowserWindow, screen } from 'electron';
import { parse as parseEnvironment } from 'dotenv';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DesktopAssistant } from './agent/assistant';
import { ToolRegistry } from './agent/toolRegistry';
import { registerIpc, ConfirmationController, emitToolActivity } from './ipc';
import { registerShortcut } from './shortcuts';
import { createTray } from './tray';
import { openUrlTool } from './tools/browser';
import { makeCheckCodexTool, makeRunCodexTaskTool, makeStartCodexProjectTool } from './tools/codex';
import { createDirectoryTool, listDirectoryTool, openFolderTool } from './tools/filesystem';
import { getSystemInfoTool } from './tools/system';
import { CodexService } from './services/codex';
import { ApiKeyService } from './services/apiKey';
import { Logger } from './services/logger';
import { OpenAIService } from './services/openai';
import { SettingsService } from './services/settings';
import { positionWidget, showWidget } from './widgetWindow';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
const currentDirectory = dirname(fileURLToPath(import.meta.url));

app.setName('Dexter');

function loadApiKey(): string {
  if (process.env.OPENAI_API_KEY?.trim()) return 'environment';
  const candidates = app.isPackaged
    ? [join(app.getPath('userData'), '.env'), ...(process.env.APPDATA ? [join(process.env.APPDATA, 'Dexter', '.env')] : []), join(dirname(process.execPath), '.env')]
    : [join(process.cwd(), '.env')];
  for (const path of [...new Set(candidates)]) {
    try {
      const key = parseEnvironment(readFileSync(path)).OPENAI_API_KEY?.trim();
      if (key) { process.env.OPENAI_API_KEY = key; return path; }
    } catch { /* try the next supported location */ }
  }
  return 'not-found';
}

async function bootstrap(): Promise<void> {
  let apiKeySource = loadApiKey();
  const logger = new Logger(app.getPath('logs')); logger.info('Dexter starting');
  const settingsService = new SettingsService(app.getPath('userData'));
  const apiKeys = new ApiKeyService(app.getPath('userData'));
  const encryptedApiKey = await apiKeys.get();
  if (encryptedApiKey) { process.env.OPENAI_API_KEY = encryptedApiKey; apiKeySource = 'windows-secure-storage'; }
  else if (process.env.OPENAI_API_KEY?.trim()) {
    try { await apiKeys.save(process.env.OPENAI_API_KEY); apiKeySource = `${apiKeySource}-migrated-to-secure-storage`; } catch { /* continue with the environment key for this session */ }
  }
  const settings = await settingsService.get();
  mainWindow = new BrowserWindow({
    width: 420, height: 600, resizable: false, show: false,
    frame: false, alwaysOnTop: true, roundedCorners: true,
    backgroundColor: '#0c0b12', title: 'Dexter', autoHideMenuBar: true,
    webPreferences: { preload: join(currentDirectory, '../preload/preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  else await mainWindow.loadFile(join(currentDirectory, '../renderer/index.html'));
  mainWindow.on('close', (event) => { if (!isQuitting) { event.preventDefault(); mainWindow?.hide(); } });
  screen.on('display-metrics-changed', () => { if (mainWindow?.isVisible()) positionWidget(mainWindow); });
  if (!settings.startMinimized) showWidget(mainWindow);

  const codex = new CodexService(); const openai = new OpenAIService(); const registry = new ToolRegistry();
  const codexStatus = await codex.checkInstalled();
  logger.info('First-run dependencies checked', { apiKeyConfigured: openai.isConfigured(), apiKeySource, codexInstalled: codexStatus.installed, codexVersion: codexStatus.version });
  registry.register(listDirectoryTool); registry.register(openFolderTool); registry.register(createDirectoryTool); registry.register(openUrlTool); registry.register(getSystemInfoTool);
  registry.register(makeCheckCodexTool(codex)); registry.register(makeRunCodexTaskTool(codex)); registry.register(makeStartCodexProjectTool(codex));
  const confirmations = new ConfirmationController(mainWindow);
  const assistant = new DesktopAssistant(openai, registry, settingsService, {
    confirm: (tool, input) => confirmations.request(tool, input),
    emitActivity: (toolName, message, status) => mainWindow && emitToolActivity(mainWindow, toolName, message, status),
  });
  const applySettings = async () => { if (mainWindow) registerShortcut((await settingsService.get()).globalShortcut, mainWindow, logger); };
  registerIpc({ window: mainWindow, assistant, settings: settingsService, openai, apiKeys, codex, logger, onSettingsSaved: applySettings }, confirmations);
  createTray(mainWindow, () => { if (!mainWindow) return; showWidget(mainWindow); mainWindow.webContents.send('app:show-settings'); });
  await applySettings();
  mainWindow.on('closed', () => confirmations.cancelAll());
}

app.whenReady().then(bootstrap).catch((error) => { console.error(error); app.quit(); });
app.on('before-quit', () => { isQuitting = true; });
app.on('window-all-closed', () => { /* Tray applications stay running. */ });
app.on('activate', () => { if (mainWindow) showWidget(mainWindow); });
