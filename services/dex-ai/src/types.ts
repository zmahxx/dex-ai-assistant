export interface DexAiConfig {
  host: string;
  port: number;
  token: string;
  allowedOrigins: Set<string>;
  monitoredServices: string[];
  homeAssistantUrl: string;
  homeAssistantToken?: string;
}

export interface HomeAssistantEntity {
  entityId: string;
  state: string;
  lastChanged?: string;
  friendlyName?: string;
  deviceClass?: string;
  unit?: string;
  brightness?: number;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface CodexTask {
  id: string;
  project: string;
  description: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  exitCode?: number;
}
