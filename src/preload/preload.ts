import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, ChatMessage, ConfirmationRequest, DexterApi, FirstRunStatus, ToolActivityEvent } from '../shared/types';

const api: DexterApi = {
  chat: {
    send: (message: string) => ipcRenderer.invoke('chat:send', message) as Promise<ChatMessage>,
    newConversation: () => ipcRenderer.invoke('chat:new') as Promise<void>,
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get') as Promise<AppSettings>,
    save: (settings) => ipcRenderer.invoke('settings:save', settings) as Promise<AppSettings>,
    chooseProjectsDirectory: () => ipcRenderer.invoke('settings:choose-directory') as Promise<string | null>,
    getApiKeyStatus: () => ipcRenderer.invoke('settings:api-key-status') as Promise<boolean>,
    saveApiKey: (apiKey) => ipcRenderer.invoke('settings:save-api-key', apiKey) as Promise<void>,
  },
  app: {
    getFirstRunStatus: () => ipcRenderer.invoke('app:first-run-status') as Promise<FirstRunStatus>,
    openSettings: () => ipcRenderer.invoke('app:open-settings') as Promise<void>,
    hideWindow: () => ipcRenderer.invoke('app:hide-window') as Promise<void>,
    onShowSettings: (callback) => { const listener = () => callback(); ipcRenderer.on('app:show-settings', listener); return () => ipcRenderer.removeListener('app:show-settings', listener); },
  },
  confirmations: {
    respond: (id, approved) => ipcRenderer.invoke('confirmation:respond', { id, approved }) as Promise<void>,
    onRequest: (callback) => { const listener = (_event: Electron.IpcRendererEvent, request: ConfirmationRequest) => callback(request); ipcRenderer.on('confirmation:request', listener); return () => ipcRenderer.removeListener('confirmation:request', listener); },
  },
  tools: { onActivity: (callback) => { const listener = (_event: Electron.IpcRendererEvent, activity: ToolActivityEvent) => callback(activity); ipcRenderer.on('tool:activity', listener); return () => ipcRenderer.removeListener('tool:activity', listener); } },
  codex: { cancel: (taskId) => ipcRenderer.invoke('codex:cancel', taskId) as Promise<boolean> },
};

contextBridge.exposeInMainWorld('dexter', api);
