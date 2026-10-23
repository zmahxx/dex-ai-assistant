import type { FirstRunStatus } from '../../../shared/types';

export function WelcomeCard({ status, onSettings }: { status: FirstRunStatus; onSettings: () => void }) {
  return <section className="welcome-card"><div><p className="eyebrow">First-run check</p><h2>Welcome to Dexter</h2><p>Dex is ready for local tools. Add an API key to enable conversation and model-directed actions.</p></div><ul><li><i className={status.apiKeyConfigured ? 'ok' : 'missing'} />OpenAI API key <b>{status.apiKeyConfigured ? 'Configured' : 'Missing'}</b></li><li><i className={status.codexInstalled ? 'ok' : 'missing'} />Codex CLI <b>{status.codexInstalled ? status.codexVersion ?? 'Installed' : 'Not found'}</b></li><li><i className="ok" />Projects directory <b title={status.projectsDirectory}>{status.projectsDirectory}</b></li></ul><button className="secondary" onClick={onSettings}>Open settings</button></section>;
}
