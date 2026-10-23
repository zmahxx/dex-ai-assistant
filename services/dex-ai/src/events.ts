import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export type EventSource = 'system' | 'docker' | 'home' | 'codex' | 'dexai';
export type EventSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface DexEvent {
  id: string;
  timestamp: number;
  source: EventSource;
  title: string;
  description: string;
  severity: EventSeverity;
  acknowledged: boolean;
}

export class EventStore {
  readonly events: DexEvent[];

  constructor(private readonly file?: string) {
    this.events = this.load();
  }

  private load(): DexEvent[] {
    if (!this.file) return [];
    try {
      const value = JSON.parse(readFileSync(this.file, 'utf8')) as unknown;
      if (!Array.isArray(value)) return [];
      return value.filter((entry): entry is DexEvent =>
        entry !== null && typeof entry === 'object' &&
        typeof entry.id === 'string' && typeof entry.title === 'string' &&
        typeof entry.timestamp === 'number' && typeof entry.description === 'string' &&
        typeof entry.source === 'string' && typeof entry.severity === 'string' &&
        typeof entry.acknowledged === 'boolean',
      ).slice(0, 200);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
  }

  record(event: Omit<DexEvent, 'id' | 'timestamp' | 'acknowledged'>): DexEvent {
    const recorded: DexEvent = {
      ...event,
      id: randomUUID(),
      timestamp: Date.now(),
      acknowledged: false,
    };
    this.events.unshift(recorded);
    if (this.events.length > 200) this.events.length = 200;
    this.persist();
    return recorded;
  }

  private persist(): void {
    if (!this.file) return;
    const temporary = `${this.file}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(this.events), { mode: 0o600 });
    renameSync(temporary, this.file);
  }
}
