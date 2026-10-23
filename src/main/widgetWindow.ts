import { screen, type BrowserWindow } from 'electron';

const EDGE_GAP = 16;

export function positionWidget(window: BrowserWindow): void {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { x, y, width, height } = display.workArea;
  const windowBounds = window.getBounds();
  const windowWidth = Math.min(windowBounds.width, Math.max(360, width - EDGE_GAP * 2));
  const windowHeight = Math.min(windowBounds.height, Math.max(420, height - EDGE_GAP * 2));
  if (windowWidth !== windowBounds.width || windowHeight !== windowBounds.height) {
    window.setSize(windowWidth, windowHeight, false);
  }
  window.setPosition(
    Math.round(x + EDGE_GAP),
    Math.round(Math.max(y + EDGE_GAP, y + height - windowHeight - EDGE_GAP)),
  );
}

export function showWidget(window: BrowserWindow): void {
  positionWidget(window);
  if (!window.isVisible()) window.show();
  window.focus();
}

export function toggleWidget(window: BrowserWindow): void {
  if (window.isVisible()) window.hide();
  else showWidget(window);
}
