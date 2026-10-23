import type { ChatMessage } from '../../../shared/types';

export function Message({ message }: { message: ChatMessage }) {
  const label = message.role === 'assistant' ? 'Dex' : message.role === 'user' ? 'You' : message.role === 'error' ? 'Error' : message.toolName ?? 'Tool';
  return <article className={`message ${message.role}`}>
    <div className="message-meta"><span>{label}</span><time>{new Date(message.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>
    <div className="message-content">{message.content}</div>
  </article>;
}
