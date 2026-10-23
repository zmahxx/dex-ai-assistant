import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

export function ChatInput({ onSend, disabled, focusSignal }: { onSend: (text: string) => void; disabled: boolean; focusSignal: number }) {
  const [value, setValue] = useState('');
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textarea.current?.focus(); }, [focusSignal]);
  useEffect(() => {
    if (!textarea.current) return;
    textarea.current.style.height = 'auto';
    textarea.current.style.height = `${Math.min(textarea.current.scrollHeight, 130)}px`;
    textarea.current.style.overflowY = textarea.current.scrollHeight > 130 ? 'auto' : 'hidden';
  }, [value]);
  const submit = () => { const text = value.trim(); if (!text || disabled) return; setValue(''); onSend(text); };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } };
  return <footer className="composer-wrap"><div className="composer"><textarea ref={textarea} aria-label="Message Dex" value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={onKeyDown} placeholder="Ask Dex anything…" rows={1} disabled={disabled} /><button onClick={submit} disabled={disabled || !value.trim()} aria-label="Send">↑</button></div><p>Enter to send · Shift+Enter for a new line · Chats clear when you start a new chat or close Dexter</p></footer>;
}
