import { arch, freemem, hostname, platform, release, totalmem } from 'node:os';
import { RiskLevel } from '../security/permissions';
import type { DexterTool } from '../agent/toolTypes';

export const getSystemInfoTool: DexterTool = {
  name: 'get_system_info', description: 'Get basic non-sensitive operating system information.', riskLevel: RiskLevel.SAFE,
  inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  async execute() { return { os: `${platform()} ${release()}`, hostname: hostname(), architecture: arch(), memory: { totalBytes: totalmem(), freeBytes: freemem() }, nodeVersion: process.version, workingDirectory: process.cwd() }; },
};
