export enum RiskLevel {
  SAFE = 'SAFE',
  CONFIRM = 'CONFIRM',
  BLOCKED = 'BLOCKED',
}

const blockedNames = new Set(['format_drive', 'disable_security', 'delete_system_directory', 'elevated_powershell']);

export function classifyRisk(name: string, declared: RiskLevel): RiskLevel {
  return blockedNames.has(name) ? RiskLevel.BLOCKED : declared;
}
