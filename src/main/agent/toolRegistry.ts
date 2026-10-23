import { classifyRisk, RiskLevel } from '../security/permissions';
import type { DexterTool, ToolExecutionHooks } from './toolTypes';

export class ToolRegistry {
  private readonly tools = new Map<string, DexterTool>();

  register<TInput extends Record<string, unknown>>(tool: DexterTool<TInput>): void {
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool as unknown as DexterTool);
  }

  get(name: string): DexterTool | undefined { return this.tools.get(name); }
  list(): DexterTool[] { return [...this.tools.values()]; }

  definitions(): Array<Record<string, unknown>> {
    return this.list().filter((tool) => classifyRisk(tool.name, tool.riskLevel) !== RiskLevel.BLOCKED).map((tool) => ({
      type: 'function', name: tool.name, description: tool.description, parameters: tool.inputSchema, strict: true,
    }));
  }

  async execute(name: string, input: Record<string, unknown>, hooks: ToolExecutionHooks): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    const risk = classifyRisk(tool.name, tool.riskLevel);
    if (risk === RiskLevel.BLOCKED) throw new Error(`Dexter blocks the ${name} operation.`);
    if (risk === RiskLevel.CONFIRM && !(await hooks.confirm(tool, input))) throw new Error('Operation cancelled by user.');
    hooks.emitActivity(name, `Running ${name}…`, 'running');
    try {
      const result = await tool.execute(input, { emitActivity: (message, status = 'running') => hooks.emitActivity(name, message, status) });
      hooks.emitActivity(name, `${name} completed.`, 'success');
      return result;
    } catch (error) {
      hooks.emitActivity(name, error instanceof Error ? error.message : `${name} failed.`, 'error');
      throw error;
    }
  }
}
