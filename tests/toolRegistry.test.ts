import { describe, expect, it, vi } from 'vitest';
import { ToolRegistry } from '../src/main/agent/toolRegistry';
import { RiskLevel } from '../src/main/security/permissions';

describe('ToolRegistry', () => {
  it('looks up and executes a safe tool', async () => {
    const registry = new ToolRegistry();
    registry.register({ name: 'echo', description: 'echo', riskLevel: RiskLevel.SAFE, inputSchema: { type: 'object' }, execute: async (input) => input });
    expect(registry.get('echo')?.name).toBe('echo');
    await expect(registry.execute('echo', { value: 2 }, { confirm: vi.fn(), emitActivity: vi.fn() })).resolves.toEqual({ value: 2 });
  });
  it('requires confirmation before executing confirm tools', async () => {
    const execute = vi.fn(async () => 'done'); const registry = new ToolRegistry();
    registry.register({ name: 'change', description: 'change', riskLevel: RiskLevel.CONFIRM, inputSchema: {}, execute });
    await expect(registry.execute('change', {}, { confirm: async () => false, emitActivity: vi.fn() })).rejects.toThrow('cancelled');
    expect(execute).not.toHaveBeenCalled();
  });
});
