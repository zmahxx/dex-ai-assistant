import type { DexAiConfig, HomeAssistantEntity } from './types.js';

async function request(config: DexAiConfig, path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const headers = new Headers(init.headers);
    if (config.homeAssistantToken) headers.set('Authorization', `Bearer ${config.homeAssistantToken}`);
    if (init.body) headers.set('Content-Type', 'application/json');
    return await fetch(`${config.homeAssistantUrl}${path}`, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHomeStatus(config: DexAiConfig): Promise<Record<string, unknown>> {
  if (!config.homeAssistantToken) {
    try {
      const response = await request(config, '/');
      return { configured: false, online: response.ok, authenticated: false };
    } catch {
      return { configured: false, online: false, authenticated: false };
    }
  }

  try {
    const response = await request(config, '/api/');
    let version: string | undefined;
    if (response.ok) {
      const configResponse = await request(config, '/api/config');
      if (configResponse.ok) {
        const details = await configResponse.json() as Record<string, unknown>;
        if (typeof details.version === 'string') version = details.version;
      }
    }
    return {
      configured: true,
      online: response.ok,
      authenticated: response.ok,
      statusCode: response.status,
      ...(version ? { version } : {}),
    };
  } catch (error) {
    return { configured: true, online: false, authenticated: false, error: error instanceof Error ? error.message : 'Home Assistant is unavailable' };
  }
}

export async function getHomeEntities(config: DexAiConfig): Promise<HomeAssistantEntity[]> {
  if (!config.homeAssistantToken) throw new Error('Home Assistant token is not configured');
  const response = await request(config, '/api/states');
  if (!response.ok) throw new Error(`Home Assistant returned HTTP ${response.status}`);
  const entities = await response.json() as Array<Record<string, unknown>>;
  return entities.map((entity) => {
    const attributes = (entity.attributes ?? {}) as Record<string, unknown>;
    return {
      entityId: String(entity.entity_id),
      state: String(entity.state),
      lastChanged: typeof entity.last_changed === 'string' ? entity.last_changed : undefined,
      friendlyName: typeof attributes.friendly_name === 'string' ? attributes.friendly_name : undefined,
      deviceClass: typeof attributes.device_class === 'string' ? attributes.device_class : undefined,
      unit: typeof attributes.unit_of_measurement === 'string' ? attributes.unit_of_measurement : undefined,
      brightness: typeof attributes.brightness === 'number' ? Math.round((attributes.brightness / 255) * 100) : undefined,
      options: Array.isArray(attributes.options) ? attributes.options.filter((option): option is string => typeof option === 'string') : undefined,
      min: typeof attributes.min === 'number' ? attributes.min : undefined,
      max: typeof attributes.max === 'number' ? attributes.max : undefined,
      step: typeof attributes.step === 'number' ? attributes.step : undefined,
    };
  });
}

export interface LightAction {
  entityId: string;
  action: 'turn_on' | 'turn_off';
  brightness?: number;
}

export function validateLightAction(value: unknown): LightAction {
  if (!value || typeof value !== 'object') throw new Error('Request body must be an object');
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.entityId !== 'string' || !/^light\.[a-z0-9_]+$/.test(candidate.entityId)) {
    throw new Error('entityId must identify a light entity');
  }
  if (candidate.action !== 'turn_on' && candidate.action !== 'turn_off') {
    throw new Error('action must be turn_on or turn_off');
  }
  if (candidate.brightness !== undefined &&
      (!Number.isInteger(candidate.brightness) || Number(candidate.brightness) < 0 || Number(candidate.brightness) > 255)) {
    throw new Error('brightness must be an integer from 0 to 255');
  }
  if (candidate.action === 'turn_off' && candidate.brightness !== undefined) {
    throw new Error('brightness is only valid with turn_on');
  }
  return { entityId: candidate.entityId, action: candidate.action, brightness: candidate.brightness as number | undefined };
}

export async function runLightAction(config: DexAiConfig, action: LightAction): Promise<unknown> {
  if (!config.homeAssistantToken) throw new Error('Home Assistant token is not configured');
  const response = await request(config, `/api/services/light/${action.action}`, {
    method: 'POST',
    body: JSON.stringify({
      entity_id: action.entityId,
      ...(action.brightness === undefined ? {} : { brightness: action.brightness }),
    }),
  });
  if (!response.ok) throw new Error(`Home Assistant returned HTTP ${response.status}`);
  return response.json();
}

export function validateEntityId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(value)) {
    throw new Error('entityId must be a valid Home Assistant entity ID');
  }
  return value;
}

export async function refreshEntity(config: DexAiConfig, entityId: string): Promise<unknown> {
  if (!config.homeAssistantToken) throw new Error('Home Assistant token is not configured');
  const response = await request(config, '/api/services/homeassistant/update_entity', {
    method: 'POST',
    body: JSON.stringify({ entity_id: entityId }),
  });
  if (!response.ok) throw new Error(`Home Assistant returned HTTP ${response.status}`);
  return response.json();
}

export type EntityAction =
  | { entityId: string; domain: 'switch'; action: 'turn_on' | 'turn_off' }
  | { entityId: string; domain: 'select'; action: 'select_option'; option: string }
  | { entityId: string; domain: 'number'; action: 'set_value'; value: number };

export function validateEntityAction(value: unknown): EntityAction {
  if (!value || typeof value !== 'object') throw new Error('Request body must be an object');
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.entityId !== 'string') throw new Error('entityId must be a valid Home Assistant entity ID');
  const domain = candidate.entityId.split('.')[0];
  if (domain === 'switch' && (candidate.action === 'turn_on' || candidate.action === 'turn_off') && /^switch\.[a-z0-9_]+$/.test(candidate.entityId)) {
    return { entityId: candidate.entityId, domain, action: candidate.action };
  }
  if (domain === 'select' && candidate.action === 'select_option' && /^select\.[a-z0-9_]+$/.test(candidate.entityId) && typeof candidate.option === 'string' && candidate.option.length > 0 && candidate.option.length <= 200) {
    return { entityId: candidate.entityId, domain, action: candidate.action, option: candidate.option };
  }
  if (domain === 'number' && candidate.action === 'set_value' && /^number\.[a-z0-9_]+$/.test(candidate.entityId) && typeof candidate.value === 'number' && Number.isFinite(candidate.value)) {
    return { entityId: candidate.entityId, domain, action: candidate.action, value: candidate.value };
  }
  throw new Error('action is not allowed for this entity');
}

export async function runEntityAction(config: DexAiConfig, action: EntityAction): Promise<unknown> {
  if (!config.homeAssistantToken) throw new Error('Home Assistant token is not configured');
  const stateResponse = await request(config, `/api/states/${action.entityId}`);
  if (!stateResponse.ok) throw new Error(`Home Assistant entity returned HTTP ${stateResponse.status}`);
  const state = await stateResponse.json() as { state?: string; attributes?: Record<string, unknown> };
  if (state.state === 'unavailable' || state.state === 'unknown') throw new Error('entityId is unavailable');
  const attributes = state.attributes ?? {};
  if (action.domain === 'select' && (!Array.isArray(attributes.options) || !attributes.options.includes(action.option))) {
    throw new Error('option is not available for this entity');
  }
  if (action.domain === 'number') {
    const min = attributes.min;
    const max = attributes.max;
    const step = attributes.step;
    if (typeof min !== 'number' || typeof max !== 'number' || action.value < min || action.value > max) {
      throw new Error('value is outside the entity range');
    }
    if (typeof step === 'number' && step > 0 && Math.abs((action.value - min) / step - Math.round((action.value - min) / step)) > 1e-6) {
      throw new Error('value does not match the entity step');
    }
  }
  const data = action.domain === 'select'
    ? { entity_id: action.entityId, option: action.option }
    : action.domain === 'number'
      ? { entity_id: action.entityId, value: action.value }
      : { entity_id: action.entityId };
  const response = await request(config, `/api/services/${action.domain}/${action.action}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Home Assistant returned HTTP ${response.status}`);
  return response.json();
}
