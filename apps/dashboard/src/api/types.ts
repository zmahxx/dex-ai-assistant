// Shared Dex-Ai data contracts. Mock and real API implementations both return these.

export type ServiceState = "online" | "degraded" | "offline" | "unknown";
export type Severity = "info" | "success" | "warning" | "critical";
export type EventSource = "system" | "docker" | "home" | "codex" | "dexai";

export interface MetricPoint {
  t: number; // epoch ms
  cpu: number;
  ram: number;
  net: number; // Mbps
  temp: number;
}

export interface SystemStatus {
  hostname: string;
  online: boolean;
  uptimeSeconds: number;
  cpu: number;
  ramUsedGb: number;
  ramTotalGb: number;
  diskUsedTb: number;
  diskTotalTb: number;
  tempC: number;
  apiLatencyMs: number;
  history: MetricPoint[];
}

export interface Service {
  id: string;
  name: string;
  status: ServiceState;
  uptime: string;
  port: number | null;
  responseMs: number | null;
}

export type ContainerState = "running" | "stopped" | "restarting" | "unhealthy";
export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: ContainerState;
  cpu: number | null;
  ramMb: number | null;
  uptime: string;
  ports: string[];
  restartCount: number | null;
  networks: string[];
  volumes: string[];
  env: Record<string, string>;
  logs: string[];
}

export type HomeDeviceType =
  | "light"
  | "switch"
  | "sensor"
  | "climate"
  | "media"
  | "presence"
  | "lock"
  | "camera"
  | "computer"
  | "custom";

export interface HomeEntity {
  entityId: string;
  name: string;
  room: string;
  type: HomeDeviceType;
  state: string; // "on" | "off" | "72" ...
  unit?: string;
  brightness?: number; // 0-100 for lights
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  available: boolean;
  lastUpdated: number;
}

export interface HomeStatus {
  connected: boolean;
  version: string;
  totalEntities: number;
  unavailable: number;
  lightsOn: number;
  activeSwitches: number;
  sensors: number;
}

export interface Room {
  id: string;
  name: string;
  tempF: number;
  summary: { label: string; value: string }[];
}

export type CodexStatus = "running" | "queued" | "completed" | "failed" | "cancelled";
export interface CodexStep {
  label: string;
  state: "done" | "active" | "pending" | "error";
}
export interface CodexTask {
  id: string;
  project: string;
  title: string;
  description: string;
  repository: string;
  status: CodexStatus;
  startedAt: number;
  finishedAt?: number;
  currentStep?: string;
  steps: CodexStep[];
  log: string[];
  filesChanged: string[];
  tests: { passed: number; failed: number } | null;
  result?: string;
  error?: string;
}

export interface CodexProject {
  id: string;
  name: string;
  path: string;
  branch: string;
  gitStatus: "clean" | "dirty" | "ahead";
  lastActivity: number;
  lastTask: string;
  build: "passing" | "failing" | "unknown";
}

export interface DexEvent {
  id: string;
  timestamp: number;
  source: EventSource;
  title: string;
  description: string;
  severity: Severity;
  acknowledged: boolean;
}

export interface ClientStatus {
  id: string;
  name: string;
  kind: "desktop" | "mobile" | "voice-satellite" | "browser";
  online: boolean;
  lastSeen: number;
  version: string;
  ip: string;
}

export interface DexTool {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  calls24h: number;
}

export interface NetworkDevice {
  id: string;
  name: string;
  ip: string;
  mac: string;
  online: boolean;
  latencyMs: number | null;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  lastRun: number | null;
}
