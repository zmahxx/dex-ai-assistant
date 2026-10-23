import type { RiskLevel } from '../security/permissions';

export interface ToolContext {
  signal?: AbortSignal;
  emitActivity: (message: string, status?: 'running' | 'success' | 'error' | 'cancelled') => void;
}

export interface DexterTool<TInput = Record<string, unknown>> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  riskLevel: RiskLevel;
  confirmationSummary?: (input: TInput) => { title: string; description: string; details: Record<string, unknown> };
  execute(input: TInput, context: ToolContext): Promise<unknown>;
}

export interface ToolExecutionHooks {
  confirm: (tool: DexterTool, input: Record<string, unknown>) => Promise<boolean>;
  emitActivity: (toolName: string, message: string, status: 'running' | 'success' | 'error' | 'cancelled') => void;
}
