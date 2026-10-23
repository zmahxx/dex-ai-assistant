import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { hostname, loadavg, networkInterfaces, totalmem, freemem, uptime } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface CpuTimes {
  idle: number;
  total: number;
}

async function readCpuTimes(): Promise<CpuTimes> {
  const stat = await fs.readFile('/proc/stat', 'utf8');
  const fields = stat.split('\n')[0]?.trim().split(/\s+/).slice(1).map(Number) ?? [];
  const idle = (fields[3] ?? 0) + (fields[4] ?? 0);
  return { idle, total: fields.reduce((sum, value) => sum + value, 0) };
}

async function getCpuPercent(): Promise<number> {
  const before = await readCpuTimes();
  await new Promise((resolve) => setTimeout(resolve, 120));
  const after = await readCpuTimes();
  const totalDelta = after.total - before.total;
  const idleDelta = after.idle - before.idle;
  return totalDelta > 0 ? Number((((totalDelta - idleDelta) / totalDelta) * 100).toFixed(1)) : 0;
}

async function getTemperatureCelsius(): Promise<number | null> {
  try {
    const zones = await fs.readdir('/sys/class/thermal');
    for (const zone of zones.filter((entry) => entry.startsWith('thermal_zone'))) {
      try {
        const value = Number((await fs.readFile(`/sys/class/thermal/${zone}/temp`, 'utf8')).trim());
        if (Number.isFinite(value) && value > 0) return Number((value / 1000).toFixed(1));
      } catch {
        // Try the next sensor.
      }
    }
  } catch {
    // Temperature is optional on hardware without exposed thermal zones.
  }
  return null;
}

async function getDiskStatus(path = '/'): Promise<Record<string, number | string>> {
  const stats = await fs.statfs(path);
  const totalBytes = Number(stats.blocks) * Number(stats.bsize);
  const availableBytes = Number(stats.bavail) * Number(stats.bsize);
  const usedBytes = totalBytes - availableBytes;
  return {
    path,
    totalBytes,
    usedBytes,
    availableBytes,
    usedPercent: totalBytes > 0 ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0,
  };
}

export async function getSystemStatus(): Promise<Record<string, unknown>> {
  const totalMemory = totalmem();
  const freeMemory = freemem();
  const interfaces = networkInterfaces();
  const addresses = Object.entries(interfaces).flatMap(([name, entries]) =>
    (entries ?? [])
      .filter((entry) => !entry.internal)
      .map((entry) => ({ name, address: entry.address, family: entry.family })),
  );

  const [cpuPercent, temperatureCelsius, rootDisk] = await Promise.all([
    getCpuPercent(),
    getTemperatureCelsius(),
    getDiskStatus('/'),
  ]);

  return {
    hostname: hostname(),
    uptimeSeconds: Math.floor(uptime()),
    cpu: { usedPercent: cpuPercent, loadAverage: loadavg() },
    memory: {
      totalBytes: totalMemory,
      usedBytes: totalMemory - freeMemory,
      availableBytes: freeMemory,
      usedPercent: Number((((totalMemory - freeMemory) / totalMemory) * 100).toFixed(1)),
    },
    disks: [rootDisk],
    temperatureCelsius,
    network: { addresses },
  };
}

export async function getServices(serviceNames: string[]): Promise<Array<Record<string, string>>> {
  return Promise.all(serviceNames.map(async (serviceName) => {
    try {
      const { stdout } = await execFileAsync('/usr/bin/systemctl', [
        'show', serviceName, '--no-pager',
        '--property=Id', '--property=LoadState', '--property=ActiveState',
        '--property=SubState', '--property=UnitFileState',
      ], { timeout: 3_000 });
      const values = Object.fromEntries(stdout.trim().split('\n').map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }));
      return {
        id: values.Id || serviceName,
        loadState: values.LoadState || 'unknown',
        activeState: values.ActiveState || 'unknown',
        subState: values.SubState || 'unknown',
        unitFileState: values.UnitFileState || 'unknown',
      };
    } catch {
      return { id: serviceName, loadState: 'unknown', activeState: 'unknown', subState: 'unknown', unitFileState: 'unknown' };
    }
  }));
}
