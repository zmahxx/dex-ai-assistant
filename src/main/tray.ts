import { Menu, nativeImage, Tray, type BrowserWindow } from 'electron';
import { showWidget, toggleWidget } from './widgetWindow';

const traySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="#7c5cff"/><path d="M8 8h7c7 0 10 3 10 8s-3 8-10 8H8V8zm6 4v8h2c3 0 5-1 5-4s-2-4-5-4h-2z" fill="white"/></svg>`;

export function createTray(window: BrowserWindow, openSettings: () => void): Tray {
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(traySvg).toString('base64')}`).resize({ width: 20, height: 20 });
  const tray = new Tray(icon); tray.setToolTip('Dexter');
  const toggle = () => toggleWidget(window);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Dexter', click: () => showWidget(window) },
    { label: 'Settings', click: openSettings },
    { type: 'separator' }, { label: 'Quit', role: 'quit' },
  ]));
  tray.on('click', toggle); return tray;
}
