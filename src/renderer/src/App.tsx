import { useEffect, useState } from 'react';
import type { ChatMessage, ConfirmationRequest, FirstRunStatus, ToolActivityEvent } from '../../shared/types';
import { ChatInput } from './components/ChatInput';
import { ConfirmationDialog } from './components/ConfirmationDialog';
import { MessageList } from './components/MessageList';
import { SettingsPanel } from './components/SettingsPanel';
import { WelcomeCard } from './components/WelcomeCard';

const message = (role: ChatMessage['role'], content: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({ id: crypto.randomUUID(), role, content, timestamp: new Date().toISOString(), ...extra });

export function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [loading, setLoading] = useState(false);
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(null); const [settingsOpen, setSettingsOpen] = useState(false);
  const [status, setStatus] = useState<FirstRunStatus | null>(null);
  useEffect(() => {
    void window.dexter.app.getFirstRunStatus().then(setStatus);
    const offConfirm = window.dexter.confirmations.onRequest(setConfirmation);
    const offActivity = window.dexter.tools.onActivity((activity: ToolActivityEvent) => setMessages((current) => [...current, message('tool', activity.message, { toolName: activity.toolName, status: activity.status })]));
    const offSettings = window.dexter.app.onShowSettings(() => setSettingsOpen(true));
    return () => { offConfirm(); offActivity(); offSettings(); };
  }, []);
  const send = async (text: string) => {
    setMessages((current) => [...current, message('user', text)]); setLoading(true);
    try { const reply = await window.dexter.chat.send(text); setMessages((current) => [...current, reply]); }
    catch (error) { setMessages((current) => [...current, message('error', error instanceof Error ? error.message : 'Dex could not complete that request.')]); }
    finally { setLoading(false); }
  };
  const newConversation = async () => {
    if (loading) return;
    await window.dexter.chat.newConversation();
    setMessages([]);
    setComposerFocusSignal((signal) => signal + 1);
  };
  const respond = async (approved: boolean) => { if (!confirmation) return; await window.dexter.confirmations.respond(confirmation.id, approved); setConfirmation(null); };
  const showWelcome = status && !status.apiKeyConfigured && messages.length === 0;
  return <div className="app-shell"><header><div className="brand"><div className="brand-mark">D</div><div><h1>Dexter</h1><span><i />Ready</span></div></div><div className="header-actions"><button className="new-chat-button" onClick={() => void newConversation()} disabled={loading} aria-label="Start a new chat">＋ <span>New chat</span></button><button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings">⚙</button><button className="icon-button" onClick={() => void window.dexter.app.hideWindow()} aria-label="Hide Dexter" title="Hide">—</button></div></header>
    {showWelcome && <WelcomeCard status={status} onSettings={() => setSettingsOpen(true)} />}
    <MessageList messages={messages} loading={loading} onSuggestion={(text) => void send(text)} /><ChatInput key={composerFocusSignal} onSend={send} disabled={loading} focusSignal={composerFocusSignal} />
    {confirmation && <ConfirmationDialog request={confirmation} onRespond={(approved) => void respond(approved)} />}{settingsOpen && <SettingsPanel onClose={() => { setSettingsOpen(false); void window.dexter.app.getFirstRunStatus().then(setStatus); }} />}
  </div>;
}
