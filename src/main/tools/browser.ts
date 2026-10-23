import { shell } from 'electron';
import { z } from 'zod';
import { RiskLevel } from '../security/permissions';
import { validateHttpUrl } from '../security/validation';
import type { DexterTool } from '../agent/toolTypes';

export const openUrlTool: DexterTool<{ url: string }> = {
  name: 'open_url', description: 'Open an http or https URL in the default browser.', riskLevel: RiskLevel.SAFE,
  inputSchema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'], additionalProperties: false },
  async execute(raw) { const { url } = z.object({ url: z.string() }).strict().parse(raw); const safe = validateHttpUrl(url); await shell.openExternal(safe); return { opened: safe }; },
};
