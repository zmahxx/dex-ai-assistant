import http from 'node:http';

interface DockerContainer {
  Id: string;
  Names?: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports?: Array<{ IP?: string; PrivatePort: number; PublicPort?: number; Type: string }>;
}

interface DockerStats {
  cpu_stats?: {
    cpu_usage?: { total_usage?: number; percpu_usage?: number[] };
    system_cpu_usage?: number;
    online_cpus?: number;
  };
  precpu_stats?: {
    cpu_usage?: { total_usage?: number };
    system_cpu_usage?: number;
  };
  memory_stats?: { usage?: number; stats?: { inactive_file?: number } };
}

interface DockerInspect {
  RestartCount?: number;
  NetworkSettings?: { Networks?: Record<string, unknown> };
  Mounts?: Array<{ Source?: string; Destination?: string; Type?: string }>;
}

function dockerRequest(path: string, method = 'GET'): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = http.request({ socketPath: '/var/run/docker.sock', path, method, timeout: 15_000 }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error(`Docker returned HTTP ${response.statusCode ?? 'unknown'}`));
          return;
        }
        if (!body) { resolve(null); return; }
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error('Docker returned invalid JSON')); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('Docker request timed out')));
    request.on('error', reject);
    request.end();
  });
}

function dockerTextRequest(path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const request = http.request({ socketPath: '/var/run/docker.sock', path, timeout: 15_000 }, (response) => {
      const chunks: Buffer[] = [];
      let length = 0;
      response.on('data', (chunk: Buffer) => {
        length += chunk.length;
        if (length > 1_048_576) {
          request.destroy(new Error('Docker log response exceeds 1 MiB'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error(`Docker returned HTTP ${response.statusCode ?? 'unknown'}`));
          return;
        }
        resolve(Buffer.concat(chunks));
      });
    });
    request.on('timeout', () => request.destroy(new Error('Docker request timed out')));
    request.on('error', reject);
    request.end();
  });
}

export function decodeDockerLogs(buffer: Buffer): string[] {
  if (buffer.length < 8 || ![1, 2, 3].includes(buffer[0] ?? 0) || buffer.subarray(1, 4).some((byte) => byte !== 0)) {
    return buffer.toString('utf8').split('\n').filter(Boolean);
  }
  const frames: string[] = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    if (offset + 8 + size > buffer.length) break;
    frames.push(buffer.subarray(offset + 8, offset + 8 + size).toString('utf8'));
    offset += 8 + size;
  }
  return frames.join('').split('\n').filter(Boolean);
}

function cpuPercent(stats: DockerStats): number | null {
  const cpuDelta = (stats.cpu_stats?.cpu_usage?.total_usage ?? 0) - (stats.precpu_stats?.cpu_usage?.total_usage ?? 0);
  const systemDelta = (stats.cpu_stats?.system_cpu_usage ?? 0) - (stats.precpu_stats?.system_cpu_usage ?? 0);
  const cores = stats.cpu_stats?.online_cpus ?? stats.cpu_stats?.cpu_usage?.percpu_usage?.length ?? 1;
  if (cpuDelta <= 0 || systemDelta <= 0) return null;
  return Number(((cpuDelta / systemDelta) * cores * 100).toFixed(2));
}

function memoryMb(stats: DockerStats): number | null {
  if (stats.memory_stats?.usage === undefined) return null;
  const workingSet = Math.max(0, stats.memory_stats.usage - (stats.memory_stats.stats?.inactive_file ?? 0));
  return Math.round(workingSet / 1024 / 1024);
}

export async function getDockerLogs(containerId: string, tail = 100): Promise<string[]> {
  if (!/^[a-f0-9]{12,64}$/.test(containerId)) throw new Error('Container ID is invalid');
  const safeTail = Math.min(500, Math.max(1, Math.floor(tail)));
  const bytes = await dockerTextRequest(`/containers/${containerId}/logs?stdout=1&stderr=1&timestamps=1&tail=${safeTail}`);
  return decodeDockerLogs(bytes);
}

export type DockerAction = 'start' | 'stop' | 'restart';

export function validateDockerAction(containerId: string, action: string): DockerAction {
  if (!/^[a-f0-9]{12,64}$/.test(containerId)) throw new Error('Container ID is invalid');
  if (action !== 'start' && action !== 'stop' && action !== 'restart') throw new Error('Docker action is invalid');
  return action;
}

export async function runDockerAction(containerId: string, action: DockerAction): Promise<Record<string, unknown>> {
  const suffix = action === 'start' ? 'start' : `${action}?t=10`;
  await dockerRequest(`/containers/${containerId}/${suffix}`, 'POST');
  return { ok: true, containerId, action };
}

export async function getDockerStatus(): Promise<Record<string, unknown>> {
  try {
    const containers = await dockerRequest('/containers/json?all=1') as DockerContainer[];
    return {
      online: true,
      containers: await Promise.all(containers.map(async (container) => {
        const [stats, inspect] = await Promise.all([
          container.State === 'running'
            ? dockerRequest(`/containers/${container.Id}/stats?stream=false`).catch(() => null) as Promise<DockerStats | null>
            : Promise.resolve(null),
          dockerRequest(`/containers/${container.Id}/json`).catch(() => null) as Promise<DockerInspect | null>,
        ]);
        return {
          id: container.Id.slice(0, 12),
          names: (container.Names ?? []).map((name) => name.replace(/^\//, '')),
          image: container.Image,
          state: container.State,
          status: container.Status,
          createdAt: new Date(container.Created * 1000).toISOString(),
          cpuPercent: stats ? cpuPercent(stats) : null,
          memoryMb: stats ? memoryMb(stats) : null,
          restartCount: inspect?.RestartCount ?? null,
          networks: Object.keys(inspect?.NetworkSettings?.Networks ?? {}),
          volumes: (inspect?.Mounts ?? []).map((mount) => `${mount.Type ?? 'mount'}:${mount.Destination ?? mount.Source ?? 'unknown'}`),
          ports: (container.Ports ?? []).map((port) => port.PublicPort
            ? `${port.IP || '0.0.0.0'}:${port.PublicPort}->${port.PrivatePort}/${port.Type}`
            : `${port.PrivatePort}/${port.Type}`),
        };
      })),
    };
  } catch (error) {
    return { online: false, containers: [], error: error instanceof Error ? error.message : 'Docker is unavailable' };
  }
}
