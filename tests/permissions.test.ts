import { describe, expect, it } from 'vitest';
import { classifyRisk, RiskLevel } from '../src/main/security/permissions';

describe('permissions', () => {
  it('preserves declared risk for known operations', () => expect(classifyRisk('create_directory', RiskLevel.CONFIRM)).toBe(RiskLevel.CONFIRM));
  it('always blocks prohibited operations', () => expect(classifyRisk('format_drive', RiskLevel.SAFE)).toBe(RiskLevel.BLOCKED));
});
