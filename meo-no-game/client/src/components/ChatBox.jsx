import { useEffect, useRef, useState } from 'react';

// Phần chat thuần bên trong GameSidePanel; panel lo phần mở/đóng và vị trí.
export default function ChatBox({ messages = [], onSend, playerId }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const handleSend = () => {
    const msg = text.trim();
    if (!msg) return;
    onSend(msg);
    setText('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.map((m) => (
          <div key={m.id} className="text-xs leading-snug">
            <span
              className={`font-bold ${
                m.playerId === playerId ? 'text-[var(--oxblood)]' : 'text-[#1F5A7A]'
              }`}
            >
              {m.playerName}:
            </span>{' '}
            <span className="text-[var(--ink)] break-words">{m.message}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-xs text-[var(--ink-soft)] text-center py-4">Chưa có tin nhắn nào...</div>
        )}
      </div>

      <div className="flex gap-1.5 p-2 border-t-2 border-[var(--ink)]">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          maxLength={200}
          placeholder="Nhập tin nhắn..."
          aria-label="Nhập tin nhắn"
          className="landing-input min-w-0 flex-1 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="landing-btn landing-btn--ink px-3 py-1.5 text-xs"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
