import { describe, expect, it } from 'vitest';
import { SettingsService } from '../src/main/services/settings';

describe('settings defaults', () => {
  it('provides safe usable defaults', async () => {
    const settings = await new SettingsService('Z:\\definitely-missing-dexter-test').defaults();
    expect(settings.model).toBeTruthy(); expect(settings.globalShortcut).toBe('Control+Space'); expect(settings.projectsDirectory).toBeTruthy(); expect(settings.startWithWindows).toBe(false);
  });
});
