import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../../shared/types';
import { Message } from './Message';

export function MessageList({ messages, loading, onSuggestion }: { messages: ChatMessage[]; loading: boolean; onSuggestion: (text: string) => void }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  return <main className="message-list">
    {messages.length === 0 && <div className="empty-state"><div className="dex-orb">D</div><h2>What can I help with?</h2><p>Ask a question or try one of these quick actions.</p><div className="suggestions"><button onClick={() => onSuggestion('Explain DNS simply')}>Explain a topic</button><button onClick={() => onSuggestion('Check whether Codex is installed')}>Check Codex</button><button onClick={() => onSuggestion('Show system information')}>Show system info</button></div></div>}
    {messages.map((message) => <Message key={message.id} message={message} />)}
    {loading && <div className="thinking"><i /><i /><i /><span>Dex is thinking</span></div>}
    <div ref={end} />
  </main>;
}
