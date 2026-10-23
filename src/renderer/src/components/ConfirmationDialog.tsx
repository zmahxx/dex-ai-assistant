import type { ConfirmationRequest } from '../../../shared/types';

export function ConfirmationDialog({ request, onRespond }: { request: ConfirmationRequest; onRespond: (approved: boolean) => void }) {
  return <div className="modal-backdrop"><section className="modal confirmation"><div className="warning-icon">!</div><p className="eyebrow">Permission required</p><h2>{request.title}</h2><p>{request.description}</p><dl>{Object.entries(request.details).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl><div className="modal-actions"><button className="secondary" onClick={() => onRespond(false)}>Cancel</button><button className="primary" onClick={() => onRespond(true)}>Allow once</button></div></section></div>;
}
