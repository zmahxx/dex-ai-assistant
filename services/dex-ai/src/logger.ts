type LogLevel = 'info' | 'warn' | 'error';

function write(level: LogLevel, event: string, details: Record<string, unknown> = {}): void {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...details });
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else console.log(entry);
}

export const logger = {
  info: (event: string, details?: Record<string, unknown>) => write('info', event, details),
  warn: (event: string, details?: Record<string, unknown>) => write('warn', event, details),
  error: (event: string, details?: Record<string, unknown>) => write('error', event, details),
};
