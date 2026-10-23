import { randomUUID } from 'node:crypto';
import type OpenAI from 'openai';
import type { ChatMessage } from '../../shared/types';
import type { SettingsService } from '../services/settings';
import type { OpenAIService } from '../services/openai';
import type { ToolRegistry } from './toolRegistry';
import type { DexterTool } from './toolTypes';
import { SYSTEM_PROMPT } from './systemPrompt';

interface AssistantHooks {
  confirm: (tool: DexterTool, input: Record<string, unknown>) => Promise<boolean>;
  emitActivity: (toolName: string, message: string, status: 'running' | 'success' | 'error' | 'cancelled') => void;
}

export class DesktopAssistant {
  private conversation: OpenAI.Responses.ResponseInput = [];
  constructor(private openai: OpenAIService, private registry: ToolRegistry, private settings: SettingsService, private hooks: AssistantHooks) {}

  resetConversation(): void {
    this.conversation = [];
  }

  async send(userText: string): Promise<ChatMessage> {
    if (!userText.trim()) throw new Error('Message cannot be empty.');
    const settings = await this.settings.get();
    const conversation: OpenAI.Responses.ResponseInput = [
      ...this.conversation,
      { role: 'user', content: userText.trim() },
    ];
    const tools = this.registry.definitions() as unknown as OpenAI.Responses.Tool[];
    let response = await this.openai.createResponse({
      model: settings.model,
      instructions: SYSTEM_PROMPT,
      input: conversation,
      tools,
      store: false,
    });

    for (let round = 0; round < 8; round += 1) {
      const calls = response.output.filter((item) => item.type === 'function_call');
      conversation.push(...response.output as OpenAI.Responses.ResponseInputItem[]);
      if (calls.length === 0) {
        this.conversation = conversation;
        return { id: randomUUID(), role: 'assistant', content: response.output_text || 'Done.', timestamp: new Date().toISOString() };
      }
      const outputs: OpenAI.Responses.ResponseInputItem.FunctionCallOutput[] = [];
      for (const call of calls) {
        let input: Record<string, unknown> = {};
        try { input = JSON.parse(call.arguments) as Record<string, unknown>; } catch { /* invalid input is returned to the model */ }
        try {
          const result = await this.registry.execute(call.name, input, this.hooks);
          outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ ok: true, result }) });
        } catch (error) {
          outputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Tool failed.' }) });
        }
      }
      conversation.push(...outputs);
      response = await this.openai.createResponse({
        model: settings.model,
        instructions: SYSTEM_PROMPT,
        input: conversation,
        tools,
        store: false,
      });
    }
    throw new Error('Dex reached the tool-call safety limit for this request.');
  }
}
