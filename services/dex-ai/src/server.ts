import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { isAuthorized } from './auth.js';
import { EventStore, type DexEvent } from './events.js';
import { getDockerLogs, getDockerStatus, runDockerAction, validateDockerAction } from './docker.js';
import { getHomeEntities, getHomeStatus, refreshEntity, runEntityAction, runLightAction, validateEntityAction, validateEntityId, validateLightAction } from './homeAssistant.js';
import { logger } from './logger.js';
import { getServices, getSystemStatus } from './system.js';
import type { CodexTask, DexAiConfig } from './types.js';

const tasks: CodexTask[] = [];
const eventStore = new EventStore(process.env.DEX_AI_EVENTS_FILE);
function recordEvent(event: Omit<DexEvent, 'id' | 'timestamp' | 'acknowledged'>): void {
  try {
    eventStore.record(event);
  } catch (error) {
    logger.error('event_persist_failed', { message: error instanceof Error ? error.message : 'Unknown error' });
  }
}
recordEvent({
  source: 'dexai',
  title: 'Dex-Ai backend started',
  description: 'Monitoring and dashboard APIs are online.',
  severity: 'success',
});

function sendJson(response: ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  response.end(body);
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > 16_384) throw new Error('Request body exceeds 16 KiB');
    chunks.push(buffer);
  }
  if (chunks.length === 0) throw new Error('Request body is required');
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('Request body must contain valid JSON');
  }
}

function applyCors(request: IncomingMessage, response: ServerResponse, config: DexAiConfig): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (!config.allowedOrigins.has(origin)) return false;
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  return true;
}

function startEventStream(request: IncomingMessage, response: ServerResponse): void {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  response.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const status = await getSystemStatus();
      response.write(`event: system.status\ndata: ${JSON.stringify(status)}\n\n`);
    } catch (error) {
      logger.warn('event_stream_sample_failed', { message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      running = false;
    }
  }, 5_000);
  const close = () => clearInterval(timer);
  request.on('close', close);
  response.on('close', close);
}

export function createDexAiServer(config: DexAiConfig) {
  return createServer(async (request, response) => {
    const startedAt = Date.now();
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    response.on('finish', () => logger.info('request_completed', {
      method,
      path: url.pathname,
      statusCode: response.statusCode,
      durationMs: Date.now() - startedAt,
    }));

    if (!applyCors(request, response, config)) {
      sendJson(response, 403, { error: 'Origin is not allowed' });
      return;
    }
    if (method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (method === 'GET' && url.pathname === '/health') {
      sendJson(response, 200, { status: 'ok', service: 'dex-ai', version: '0.1.0', uptimeSeconds: Math.floor(process.uptime()) });
      return;
    }
    if (!url.pathname.startsWith('/api/') || !isAuthorized(request, config.token)) {
      logger.warn('authentication_failed', { method, path: url.pathname, remoteAddress: request.socket.remoteAddress });
      sendJson(response, 401, { error: 'Unauthorized' });
      return;
    }

    try {
      if (method === 'GET' && url.pathname === '/api/system/status') {
        sendJson(response, 200, await getSystemStatus());
      } else if (method === 'GET' && url.pathname === '/api/system/services') {
        sendJson(response, 200, { services: await getServices(config.monitoredServices) });
      } else if (method === 'GET' && url.pathname === '/api/system/docker') {
        sendJson(response, 200, await getDockerStatus());
      } else if (method === 'GET' && /^\/api\/docker\/[a-f0-9]{12,64}\/logs$/.test(url.pathname)) {
        const containerId = url.pathname.split('/')[3] ?? '';
        const requestedTail = Number(url.searchParams.get('tail') ?? 100);
        const tail = Number.isFinite(requestedTail) ? requestedTail : 100;
        sendJson(response, 200, { logs: await getDockerLogs(containerId, tail) });
      } else if (method === 'POST' && url.pathname.startsWith('/api/docker/')) {
        const match = /^\/api\/docker\/([a-f0-9]{12,64})\/(start|stop|restart)$/.exec(url.pathname);
        if (!match?.[1] || !match[2]) throw new Error('Docker action path is invalid');
        const action = validateDockerAction(match[1], match[2]);
        const result = await runDockerAction(match[1], action);
        logger.warn('docker_action', { containerId: match[1], action });
        recordEvent({
          source: 'docker',
          title: `Container ${action} completed`,
          description: `Docker accepted ${action} for ${match[1].slice(0, 12)}.`,
          severity: action === 'stop' ? 'warning' : 'success',
        });
        sendJson(response, 200, result);
      } else if (method === 'GET' && url.pathname === '/api/home/status') {
        sendJson(response, 200, await getHomeStatus(config));
      } else if (method === 'GET' && url.pathname === '/api/home/entities') {
        sendJson(response, 200, { entities: await getHomeEntities(config) });
      } else if (method === 'POST' && url.pathname === '/api/home/actions/light') {
        const action = validateLightAction(await readJson(request));
        const result = await runLightAction(config, action);
        logger.info('home_light_action', { entityId: action.entityId, action: action.action });
        recordEvent({
          source: 'home',
          title: `Light ${action.action === 'turn_on' ? 'turned on' : 'turned off'}`,
          description: action.entityId,
          severity: 'success',
        });
        sendJson(response, 200, { ok: true, result });
      } else if (method === 'POST' && url.pathname === '/api/home/actions/entity') {
        const action = validateEntityAction(await readJson(request));
        const result = await runEntityAction(config, action);
        logger.info('home_entity_action', { entityId: action.entityId, action: action.action });
        recordEvent({ source: 'home', title: 'Entity action completed', description: `${action.entityId}: ${action.action}`, severity: 'success' });
        sendJson(response, 200, { ok: true, result });
      } else if (method === 'POST' && url.pathname === '/api/home/actions/refresh-entity') {
        const body = await readJson(request) as Record<string, unknown>;
        const entityId = validateEntityId(body.entityId);
        const result = await refreshEntity(config, entityId);
        logger.info('home_entity_refreshed', { entityId });
        recordEvent({
          source: 'home',
          title: 'Entity refreshed',
          description: entityId,
          severity: 'info',
        });
        sendJson(response, 200, { ok: true, result });
      } else if (method === 'GET' && url.pathname === '/api/tasks') {
        sendJson(response, 200, { tasks });
      } else if (method === 'GET' && url.pathname === '/api/events/history') {
        sendJson(response, 200, { events: eventStore.events });
      } else if (method === 'GET' && url.pathname === '/api/events') {
        startEventStream(request, response);
      } else {
        sendJson(response, 404, { error: 'Not found' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      const isInputError = message.startsWith('Request body') || message.startsWith('entityId') || message.startsWith('action') || message.startsWith('brightness') || message.startsWith('option') || message.startsWith('value') || message.startsWith('Container ID') || message.startsWith('Docker action');
      const isMissingConfiguration = message.includes('token is not configured');
      logger.error('request_failed', { method, path: url.pathname, message });
      sendJson(response, isInputError ? 400 : isMissingConfiguration ? 503 : 502, { error: message });
    }
  });
}

export async function listen(config: DexAiConfig): Promise<{ host: string; port: number }> {
  const server = createDexAiServer(config);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, () => resolve());
  });
  const address = server.address() as AddressInfo;
  return { host: address.address, port: address.port };
}
