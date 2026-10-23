import OpenAI from 'openai';

export class OpenAIService {
  private client: OpenAI | null;

  constructor(apiKey = process.env.OPENAI_API_KEY) { this.client = apiKey ? new OpenAI({ apiKey }) : null; }
  isConfigured(): boolean { return this.client !== null; }
  setApiKey(apiKey: string): void { this.client = new OpenAI({ apiKey: apiKey.trim() }); }

  async createResponse(params: OpenAI.Responses.ResponseCreateParamsNonStreaming): Promise<OpenAI.Responses.Response> {
    if (!this.client) throw new Error('OpenAI API key is missing. Open Dexter Settings, paste an API key, and save.');
    return this.client.responses.create(params);
  }
}
