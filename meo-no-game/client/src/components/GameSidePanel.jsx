import { useState } from 'react';
import ChatBox from './ChatBox';
import GameLog from './GameLog';

const MIN_WIDTH = 280;
const MAX_WIDTH = 480;
const STEP = 40;
const DEFAULT_WIDTH = 340;

function readWidth() {
  try {
    const saved = Number(localStorage.getItem('meono_panel_width'));
    if (Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= MAX_WIDTH) return saved;
  } catch {
    /* bỏ qua */
  }
  return DEFAULT_WIDTH;
}

function readSide() {
  try {
    return localStorage.getItem('meono_panel_side') === 'left' ? 'left' : 'right';
  } catch {
    return 'right';
  }
}

export default function GameSidePanel({
  open,
  onClose,
  messages = [],
  logs = [],
  playerId,
  onSend,
}) {
  const [side, setSide] = useState(readSide);
  const [width, setWidth] = useState(readWidth);
  const maxWidth =
    typeof window === 'undefined' ? MAX_WIDTH : Math.min(MAX_WIDTH, Math.floor(window.innerWidth * 0.92));
  const effectiveWidth = Math.min(width, maxWidth);

  if (!open) return null;

  const changeSide = () => {
    const next = side === 'left' ? 'right' : 'left';
    setSide(next);
    try {
      localStorage.setItem('meono_panel_side', next);
    } catch {
      /* bỏ qua */
    }
  };

  const changeWidth = (delta) => {
    const next = Math.min(maxWidth, Math.max(MIN_WIDTH, effectiveWidth + delta));
    setWidth(next);
    try {
      localStorage.setItem('meono_panel_width', String(next));
    } catch {
      /* bỏ qua */
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Đóng bảng trò chuyện và diễn biến"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-black/60 backdrop-blur-sm lg:hidden"
      />

      <aside
        aria-label="Trò chuyện và diễn biến"
        style={{ width: `${effectiveWidth}px` }}
        className={`fixed inset-y-0 z-50 flex max-w-[92vw] flex-col overflow-hidden border-slate-700 bg-slate-950/98 shadow-2xl backdrop-blur-xl lg:sticky lg:top-3 lg:z-20 lg:h-[calc(100vh-5.5rem)] lg:max-w-none lg:self-start lg:rounded-2xl lg:border ${
          side === 'left' ? 'left-0 border-r lg:order-first' : 'right-0 border-l lg:order-last'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-black text-white">
              💬 Bàn bên lề
            </div>
            <div className="truncate text-[10px] font-semibold text-slate-500">
              Trò chuyện &amp; diễn biến
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={changeSide}
              title={side === 'left' ? 'Chuyển sang bên phải' : 'Chuyển sang bên trái'}
              aria-label={side === 'left' ? 'Chuyển sang bên phải' : 'Chuyển sang bên trái'}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-black text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            >
              {side === 'left' ? '⇥' : '⇤'}
            </button>

            <div className="flex h-8 items-center rounded-lg border border-slate-700 bg-slate-800">
              <button
                type="button"
                onClick={() => changeWidth(-STEP)}
                disabled={effectiveWidth <= MIN_WIDTH}
                title="Thu nhỏ bảng"
                aria-label="Thu nhỏ bảng"
                className="flex h-full w-7 items-center justify-center text-base font-black text-slate-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                −
              </button>
              <span className="w-8 text-center text-[9px] font-bold tabular-nums text-slate-500">
                {effectiveWidth}
              </span>
              <button
                type="button"
                onClick={() => changeWidth(STEP)}
                disabled={effectiveWidth >= maxWidth}
                title="Phóng to bảng"
                aria-label="Phóng to bảng"
                className="flex h-full w-7 items-center justify-center text-base font-black text-slate-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              title="Đóng bảng"
              aria-label="Đóng bảng"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between px-3 pt-2.5 pb-1.5">
            <span className="text-[10px] font-black tracking-[0.16em] text-slate-500">
              📜 DIỄN BIẾN
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-slate-500">
              {logs.length}
            </span>
          </div>
          <div className="min-h-[120px] flex-1 px-2 pb-2">
            <GameLog logs={logs} fill />
          </div>
        </div>

        <div className="flex h-60 shrink-0 flex-col border-t border-slate-800 bg-slate-900/40">
          <div className="shrink-0 px-3 py-2">
            <span className="text-[10px] font-black tracking-[0.16em] text-slate-500">
              💬 TRÒ CHUYỆN
            </span>
          </div>
          <ChatBox messages={messages} onSend={onSend} playerId={playerId} />
        </div>
      </aside>
    </>
  );
}
