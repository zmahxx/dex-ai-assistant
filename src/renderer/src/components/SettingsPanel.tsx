import { useEffect, useRef, useState } from 'react';
import type { AppSettings } from '../../../shared/types';

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AppSettings | null>(null); const [saved, setSaved] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false); const apiKeyInput = useRef<HTMLInputElement>(null);
  useEffect(() => { void Promise.all([window.dexter.settings.get(), window.dexter.settings.getApiKeyStatus()]).then(([nextSettings, configured]) => { setSettings(nextSettings); setApiKeyConfigured(configured); }); }, []);
  if (!settings) return null;
  const change = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => { setSaved(false); setSettings({ ...settings, [key]: value }); };
  const choose = async () => { const value = await window.dexter.settings.chooseProjectsDirectory(); if (value) change('projectsDirectory', value); };
  const save = async () => {
    const apiKey = apiKeyInput.current?.value.trim();
    if (apiKey) { await window.dexter.settings.saveApiKey(apiKey); apiKeyInput.current!.value = ''; setApiKeyConfigured(true); }
    await window.dexter.settings.save(settings); setSaved(true);
  };
  return <div className="modal-backdrop"><section className="modal settings"><button className="close" onClick={onClose}>×</button><p className="eyebrow">Dexter</p><h2>Settings</h2>
    <label>OpenAI API key <span className={apiKeyConfigured ? 'key-ok' : 'key-missing'}>{apiKeyConfigured ? 'Configured' : 'Missing'}</span><input ref={apiKeyInput} type="password" autoComplete="off" placeholder={apiKeyConfigured ? 'Paste a new key to replace it' : 'Paste your API key'} /><small>Encrypted with Windows secure storage. The saved key is never displayed.</small></label>
    <label>OpenAI model<input value={settings.model} onChange={(e) => change('model', e.target.value)} /></label>
    <label>Default projects directory<div className="inline-field"><input value={settings.projectsDirectory} onChange={(e) => change('projectsDirectory', e.target.value)} /><button className="secondary" onClick={choose}>Choose</button></div></label>
    <label>Global shortcut<input value={settings.globalShortcut} onChange={(e) => change('globalShortcut', e.target.value)} /></label>
    <label className="check"><input type="checkbox" checked={settings.startMinimized} onChange={(e) => change('startMinimized', e.target.checked)} /> Start minimized</label>
    <label className="check"><input type="checkbox" checked={settings.startWithWindows} onChange={(e) => change('startWithWindows', e.target.checked)} /> Start with Windows</label>
    <div className="modal-actions">{saved && <span className="saved">Saved</span>}<button className="primary" onClick={save}>Save settings</button></div>
  </section></div>;
}
