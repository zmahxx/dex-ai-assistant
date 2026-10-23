import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { listen } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const address = await listen(config);
  logger.info('service_started', {
    host: address.host,
    port: address.port,
    homeAssistantConfigured: Boolean(config.homeAssistantToken),
  });
}

main().catch((error) => {
  logger.error('startup_failed', { message: error instanceof Error ? error.message : 'Unknown startup error' });
  process.exitCode = 1;
});
