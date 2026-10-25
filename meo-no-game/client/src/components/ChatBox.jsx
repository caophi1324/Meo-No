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
                m.playerId === playerId ? 'text-emerald-400' : 'text-sky-300'
              }`}
            >
              {m.playerName}:
            </span>{' '}
            <span className="text-slate-200 break-words">{m.message}</span>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-4">Chưa có tin nhắn nào...</div>
        )}
      </div>

      <div className="flex gap-1.5 p-2 border-t border-slate-800">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          maxLength={200}
          placeholder="Nhập tin nhắn..."
          aria-label="Nhập tin nhắn"
          className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
