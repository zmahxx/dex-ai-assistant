import type { DexAiConfig } from './types.js';

function parsePort(value: string | undefined): number {
  const port = Number(value ?? '8787');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DEX_AI_PORT must be an integer between 1 and 65535');
  }
  return port;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): DexAiConfig {
  const token = env.DEX_AI_TOKEN ?? '';
  if (token.length < 32) {
    throw new Error('DEX_AI_TOKEN must contain at least 32 characters');
  }

  const homeAssistantUrl = (env.HOME_ASSISTANT_URL ?? 'http://127.0.0.1:8123').replace(/\/$/, '');
  const allowedOrigins = new Set(
    (env.DEX_AI_ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const monitoredServices = (env.DEX_AI_MONITORED_SERVICES ?? 'docker.service,ssh.service,nginx.service,smbd.service,login-monitor.service,minecraft.service')
    .split(',')
    .map((service) => service.trim())
    .filter(Boolean);

  return {
    host: env.DEX_AI_HOST ?? '127.0.0.1',
    port: parsePort(env.DEX_AI_PORT),
    token,
    allowedOrigins,
    monitoredServices,
    homeAssistantUrl,
    homeAssistantToken: env.HOME_ASSISTANT_TOKEN || undefined,
  };
}

