// Dex-Ai API layer. The browser talks to the dashboard's same-origin proxy;
// production credentials stay in the server-side systemd environment.
import type {
  Automation,
  ClientStatus,
  CodexProject,
  CodexTask,
  DexEvent,
  DexTool,
  DockerContainer,
  HomeDeviceType,
  HomeEntity,
  HomeStatus,
  MetricPoint,
  NetworkDevice,
  Room,
  Service,
  ServiceState,
  SystemStatus,
} from "./types";

const MAX_HISTORY_POINTS = 96;
const metricHistory: MetricPoint[] = [];

export function getApiBaseUrl(): string {
  return (import.meta.env["VITE_DEX_API_URL"] as string | undefined) ?? "/backend";
}

interface RawSystemStatus {
  hostname: string;
  uptimeSeconds: number;
  cpu: { usedPercent: number; loadAverage: number[] };
  memory: { totalBytes: number; usedBytes: number; availableBytes: number; usedPercent: number };
  disks: Array<{
    path: string;
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    usedPercent: number;
  }>;
  temperatureCelsius: number | null;
  network?: { addresses?: Array<{ name: string; address: string; family: string }> };
}

interface RawService {
  id: string;
  loadState: string;
  activeState: string;
  subState: string;
  unitFileState: string;
}

interface RawDockerContainer {
  id: string;
  names: string[];
  image: string;
  state: string;
  status: string;
  createdAt: string;
  cpuPercent?: number | null;
  memoryMb?: number | null;
  restartCount?: number | null;
  networks?: string[];
  volumes?: string[];
  ports?: string[];
}

interface RawEntity {
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

interface RawTask {
  id: string;
  project: string;
  description: string;
  status: CodexTask["status"];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  output?: string;
  exitCode?: number;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl().replace(/\/$/, "")}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    if (res.status === 401)
      throw new Error("The dashboard proxy could not authenticate with Dex-Ai.");
    throw new Error(`Dex-Ai API ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  http<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
const gib = (bytes: number) => Number((bytes / 1024 ** 3).toFixed(1));
const tib = (bytes: number) => Number((bytes / 1024 ** 4).toFixed(2));

function serviceState(service: RawService): ServiceState {
  if (service.activeState === "active" && service.subState === "running") return "online";
  if (service.activeState === "active") return "degraded";
  if (service.loadState === "not-found") return "unknown";
  return "offline";
}

function servicePort(id: string): number | null {
  if (id === "ssh.service") return 22;
  if (id === "nginx.service") return 80;
  if (id === "smbd.service") return 445;
  if (id === "dex-ai.service") return 8787;
  return null;
}

function entityType(entityId: string): HomeDeviceType {
  const domain = entityId.split(".")[0];
  if (domain === "light") return "light";
  if (domain === "switch") return "switch";
  if (domain === "sensor") return "sensor";
  if (domain === "climate" || domain === "weather") return "climate";
  if (domain === "media_player") return "media";
  if (domain === "person" || domain === "binary_sensor") return "presence";
  if (domain === "lock") return "lock";
  if (domain === "camera") return "camera";
  return "custom";
}

function mapEntity(entity: RawEntity): HomeEntity {
  return {
    entityId: entity.entityId,
    name: entity.friendlyName ?? entity.entityId,
    room: "Unassigned",
    type: entityType(entity.entityId),
    state: entity.state,
    available: entity.state !== "unavailable" && entity.state !== "unknown",
    lastUpdated: entity.lastChanged ? Date.parse(entity.lastChanged) : Date.now(),
    ...(entity.unit ? { unit: entity.unit } : {}),
    ...(entity.brightness === undefined ? {} : { brightness: entity.brightness }),
    ...(entity.options ? { options: entity.options } : {}),
    ...(entity.min === undefined ? {} : { min: entity.min }),
    ...(entity.max === undefined ? {} : { max: entity.max }),
    ...(entity.step === undefined ? {} : { step: entity.step }),
  };
}

async function systemStatus(): Promise<SystemStatus> {
  const started = Date.now();
  const raw = await http<RawSystemStatus>("/api/system/status");
  const disk = raw.disks[0] ?? { usedBytes: 0, totalBytes: 0 };
  metricHistory.push({
    t: Date.now(),
    cpu: raw.cpu.usedPercent,
    ram: raw.memory.usedPercent,
    net: 0,
    temp: raw.temperatureCelsius ?? 0,
  });
  if (metricHistory.length > MAX_HISTORY_POINTS)
    metricHistory.splice(0, metricHistory.length - MAX_HISTORY_POINTS);
  return {
    hostname: raw.hostname,
    online: true,
    uptimeSeconds: raw.uptimeSeconds,
    cpu: raw.cpu.usedPercent,
    ramUsedGb: gib(raw.memory.usedBytes),
    ramTotalGb: gib(raw.memory.totalBytes),
    diskUsedTb: tib(disk.usedBytes),
    diskTotalTb: tib(disk.totalBytes),
    tempC: raw.temperatureCelsius ?? 0,
    apiLatencyMs: Date.now() - started,
    history: [...metricHistory],
  };
}

async function services(): Promise<Service[]> {
  const raw = await http<{ services: RawService[] }>("/api/system/services");
  return raw.services.map((service) => ({
    id: service.id,
    name: service.id
      .replace(/\.service$/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    status: serviceState(service),
    uptime: service.subState === "running" ? "running" : service.subState,
    port: servicePort(service.id),
    responseMs: null,
  }));
}

async function containers(): Promise<DockerContainer[]> {
  const raw = await http<{ online: boolean; containers: RawDockerContainer[] }>(
    "/api/system/docker",
  );
  return raw.containers.map((container) => ({
    id: container.id,
    name: container.names[0] ?? container.id,
    image: container.image,
    status:
      container.state === "running"
        ? container.status.toLowerCase().includes("unhealthy")
          ? "unhealthy"
          : "running"
        : container.state === "restarting"
          ? "restarting"
          : "stopped",
    cpu: container.cpuPercent ?? null,
    ramMb: container.memoryMb ?? null,
    uptime: container.status,
    ports: container.ports ?? [],
    restartCount: container.restartCount ?? null,
    networks: container.networks ?? [],
    volumes: container.volumes ?? [],
    env: {},
    logs: [],
  }));
}

async function entities(): Promise<HomeEntity[]> {
  const raw = await http<{ entities: RawEntity[] }>("/api/home/entities");
  return raw.entities.map(mapEntity);
}

async function homeStatus(): Promise<HomeStatus> {
  const [status, allEntities] = await Promise.all([
    http<{ configured: boolean; online: boolean; authenticated: boolean; version?: string }>(
      "/api/home/status",
    ),
    entities(),
  ]);
  return {
    connected: status.online && status.authenticated,
    version: status.version ?? (status.authenticated ? "Connected" : "Unavailable"),
    totalEntities: allEntities.length,
    unavailable: allEntities.filter((entity) => !entity.available).length,
    lightsOn: allEntities.filter((entity) => entity.type === "light" && entity.state === "on")
      .length,
    activeSwitches: allEntities.filter(
      (entity) => entity.type === "switch" && entity.state === "on",
    ).length,
    sensors: allEntities.filter((entity) => entity.type === "sensor").length,
  };
}

interface DexApi {
  health: () => Promise<unknown>;
  systemStatus: () => Promise<SystemStatus>;
  services: () => Promise<Service[]>;
  containers: () => Promise<DockerContainer[]>;
  homeStatus: () => Promise<HomeStatus>;
  rooms: () => Promise<Room[]>;
  entities: () => Promise<HomeEntity[]>;
  automations: () => Promise<Automation[]>;
  tasks: () => Promise<CodexTask[]>;
  projects: () => Promise<CodexProject[]>;
  events: () => Promise<DexEvent[]>;
  clients: () => Promise<ClientStatus[]>;
  tools: () => Promise<DexTool[]>;
  network: () => Promise<NetworkDevice[]>;
  containerAction: (id: string, action: "start" | "stop" | "restart") => Promise<unknown>;
  containerLogs: (id: string) => Promise<string[]>;
  homeService: (
    entityId: string,
    patch: { state?: string; brightness?: number },
  ) => Promise<unknown>;
  entityAction: (body: Record<string, unknown>) => Promise<unknown>;
  cancelTask: (id: string) => Promise<unknown>;
  createTask: (description: string) => Promise<unknown>;
  acknowledgeEvent: (id: string) => Promise<unknown>;
}

async function automations(): Promise<Automation[]> {
  const all = await entities();
  return all
    .filter((entity) => entity.entityId.startsWith("automation."))
    .map((entity) => ({
      id: entity.entityId,
      name: entity.name,
      trigger: "Managed by Home Assistant",
      enabled: entity.state === "on",
      lastRun: entity.lastUpdated,
    }));
}

async function network(): Promise<NetworkDevice[]> {
  const raw = await http<RawSystemStatus>("/api/system/status");
  return (raw.network?.addresses ?? []).map((address) => ({
    id: `${address.name}-${address.address}`,
    name: address.name,
    ip: address.address,
    mac: "Not exposed",
    online: true,
    latencyMs: null,
  }));
}

async function tasks(): Promise<CodexTask[]> {
  const raw = await http<{ tasks: RawTask[] }>("/api/tasks");
  return raw.tasks.map((task) => ({
    id: task.id,
    project: task.project,
    title: task.description,
    description: task.description,
    repository: task.project,
    status: task.status,
    startedAt: Date.parse(task.startedAt ?? task.createdAt),
    ...(task.completedAt ? { finishedAt: Date.parse(task.completedAt) } : {}),
    ...(task.status === "running" ? { currentStep: "Running" } : {}),
    steps: [],
    log: task.output ? task.output.split("\n") : [],
    filesChanged: [],
    tests: null,
    ...(task.output ? { result: task.output } : {}),
    ...(task.exitCode !== undefined && task.exitCode !== 0
      ? { error: `Process exited with code ${task.exitCode}` }
      : {}),
  }));
}

export const api: DexApi = {
  health: () => http("/health"),
  systemStatus,
  services,
  containers,
  homeStatus,
  rooms: async () => [] as Room[],
  entities,
  automations,
  tasks,
  projects: async () => [] as CodexProject[],
  events: async () => (await http<{ events: DexEvent[] }>("/api/events/history")).events,
  clients: async () => [] as ClientStatus[],
  tools: async () => [] as DexTool[],
  network,
  containerAction: (id, action) => post(`/api/docker/${encodeURIComponent(id)}/${action}`),
  containerLogs: async (id) =>
    (await http<{ logs: string[] }>(`/api/docker/${encodeURIComponent(id)}/logs?tail=120`)).logs,
  homeService: (entityId, patch) =>
    post("/api/home/actions/light", {
      entityId,
      action: patch.state === "off" ? "turn_off" : "turn_on",
      ...(patch.brightness === undefined
        ? {}
        : { brightness: Math.round(patch.brightness * 2.55) }),
    }),
  entityAction: (body) => post("/api/home/actions/entity", body),
  cancelTask: async () => {
    throw new Error("Codex task cancellation is not available yet.");
  },
  createTask: async () => {
    throw new Error("Codex task creation is not available yet.");
  },
  acknowledgeEvent: async () => {
    throw new Error("Event acknowledgement is not available yet.");
  },
};

export interface LiveDexEvent {
  event: string;
  data: unknown;
}

export async function openLiveStream(
  signal: AbortSignal,
  onEvent: (event: LiveDexEvent) => void,
): Promise<void> {
  const response = await fetch(`${getApiBaseUrl().replace(/\/$/, "")}/api/events`, {
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!response.ok || !response.body)
    throw new Error(`Dex-Ai event stream returned HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const frames = pending.split("\n\n");
    pending = frames.pop() ?? "";
    for (const frame of frames) {
      let event = "message";
      const data: string[] = [];
      for (const line of frame.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trim());
      }
      if (!data.length) continue;
      try {
        onEvent({ event, data: JSON.parse(data.join("\n")) });
      } catch {
        /* Ignore malformed server frames. */
      }
    }
  }
}
