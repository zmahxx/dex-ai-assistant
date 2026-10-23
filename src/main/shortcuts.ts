import { globalShortcut, type BrowserWindow } from 'electron';
import type { Logger } from './services/logger';
import { toggleWidget } from './widgetWindow';

export function registerShortcut(accelerator: string, window: BrowserWindow, logger: Logger): boolean {
  globalShortcut.unregisterAll();
  const registered = globalShortcut.register(accelerator, () => toggleWidget(window));
  if (!registered) logger.error('Could not register global shortcut', new Error(accelerator));
  return registered;
}
