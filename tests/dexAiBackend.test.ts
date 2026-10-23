import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tokensEqual } from '../services/dex-ai/src/auth.js';
import { loadConfig } from '../services/dex-ai/src/config.js';
import { decodeDockerLogs, validateDockerAction } from '../services/dex-ai/src/docker.js';
import { EventStore } from '../services/dex-ai/src/events.js';
import { validateEntityAction, validateEntityId, validateLightAction } from '../services/dex-ai/src/homeAssistant.js';

describe('Dex-Ai backend security boundaries', () => {
  it('requires a strong API token', () => {
    expect(() => loadConfig({ DEX_AI_TOKEN: 'short' })).toThrow(/at least 32/);
  });

  it('compares complete tokens', () => {
    const token = 'a'.repeat(64);
    expect(tokensEqual(token, token)).toBe(true);
    expect(tokensEqual(`${token}x`, token)).toBe(false);
    expect(tokensEqual('b'.repeat(64), token)).toBe(false);
  });

  it('allows only strict light entity actions', () => {
    expect(validateLightAction({ entityId: 'light.office_lamp', action: 'turn_on', brightness: 120 }))
      .toEqual({ entityId: 'light.office_lamp', action: 'turn_on', brightness: 120 });
    expect(() => validateLightAction({ entityId: 'switch.server', action: 'turn_off' })).toThrow(/light entity/);
    expect(() => validateLightAction({ entityId: 'light.office', action: 'turn_on', brightness: 999 })).toThrow(/0 to 255/);
  });

  it('validates entity IDs used by the safe refresh action', () => {
    expect(validateEntityId('weather.forecast_home')).toBe('weather.forecast_home');
    expect(() => validateEntityId('../configuration.yaml')).toThrow(/valid Home Assistant entity ID/);
  });

  it('limits Docker actions to container IDs and an explicit allow-list', () => {
    expect(validateDockerAction('1234567890ab', 'restart')).toBe('restart');
    expect(() => validateDockerAction('home-assistant', 'restart')).toThrow(/Container ID/);
    expect(() => validateDockerAction('1234567890ab', 'delete')).toThrow(/Docker action/);
  });

  it('validates switch, select, and numeric action shapes', () => {
    expect(validateEntityAction({ entityId: 'switch.office', action: 'turn_on' }))
      .toEqual({ entityId: 'switch.office', domain: 'switch', action: 'turn_on' });
    expect(validateEntityAction({ entityId: 'select.mode', action: 'select_option', option: 'Auto' }))
      .toEqual({ entityId: 'select.mode', domain: 'select', action: 'select_option', option: 'Auto' });
    expect(validateEntityAction({ entityId: 'number.level', action: 'set_value', value: 2.5 }))
      .toEqual({ entityId: 'number.level', domain: 'number', action: 'set_value', value: 2.5 });
    expect(() => validateEntityAction({ entityId: 'switch.office', action: 'set_value', value: 1 })).toThrow(/not allowed/);
    expect(() => validateEntityAction({ entityId: 'number.level', action: 'set_value', value: Infinity })).toThrow(/not allowed/);
  });

  it('decodes Docker multiplexed logs without header bytes', () => {
    const line = Buffer.from('2026-10-06T00:00:00Z started\n');
    const header = Buffer.alloc(8);
    header[0] = 1;
    header.writeUInt32BE(line.length, 4);
    expect(decodeDockerLogs(Buffer.concat([header, line]))).toEqual(['2026-10-06T00:00:00Z started']);
  });

  it('keeps event history across store restarts without growing beyond the retention limit', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dex-ai-events-'));
    try {
      const file = join(directory, 'events.json');
      const store = new EventStore(file);
      for (let index = 0; index < 205; index += 1) {
        store.record({ source: 'system', title: `Event ${index}`, description: 'Test', severity: 'info' });
      }
      expect(new EventStore(file).events).toHaveLength(200);
      expect(JSON.parse(readFileSync(file, 'utf8'))[0].title).toBe('Event 204');
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
