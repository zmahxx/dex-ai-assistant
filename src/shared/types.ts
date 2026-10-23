export type MessageRole = 'user' | 'assistant' | 'tool' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  toolName?: string;
  status?: 'running' | 'success' | 'error' | 'cancelled';
}

export interface AppSettings {
  model: string;
  projectsDirectory: string;
  globalShortcut: string;
  startMinimized: boolean;
  startWithWindows: boolean;
}

export interface FirstRunStatus {
  apiKeyConfigured: boolean;
  codexInstalled: boolean;
  codexVersion?: string;
  projectsDirectory: string;
}

export interface ConfirmationRequest {
  id: string;
  toolName: string;
  title: string;
  description: string;
  details: Record<string, unknown>;
}

export interface ToolActivityEvent {
  id: string;
  toolName: string;
  message: string;
  status: 'running' | 'success' | 'error' | 'cancelled';
}

export interface DexterApi {
  chat: { send(message: string): Promise<ChatMessage>; newConversation(): Promise<void> };
  settings: {
    get(): Promise<AppSettings>;
    save(settings: AppSettings): Promise<AppSettings>;
    chooseProjectsDirectory(): Promise<string | null>;
    getApiKeyStatus(): Promise<boolean>;
    saveApiKey(apiKey: string): Promise<void>;
  };
  app: {
    getFirstRunStatus(): Promise<FirstRunStatus>;
    openSettings(): Promise<void>;
    hideWindow(): Promise<void>;
    onShowSettings(callback: () => void): () => void;
  };
  confirmations: {
    respond(id: string, approved: boolean): Promise<void>;
    onRequest(callback: (request: ConfirmationRequest) => void): () => void;
  };
  tools: { onActivity(callback: (event: ToolActivityEvent) => void): () => void };
  codex: { cancel(taskId: string): Promise<boolean> };
}
