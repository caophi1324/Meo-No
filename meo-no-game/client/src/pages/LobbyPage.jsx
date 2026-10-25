import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import useGameStore from '../store/gameStore';
import RulesModal from '../components/RulesModal';
import TimerSettings from '../components/TimerSettings';
import { soundEffects } from '../utils/soundEffects';
import { DECK_THEMES, themedImage } from '../../../shared/decks.js';

const CAT_AVATARS = ['🐱', '😺', '😸', '😻', '🐈'];
const DECK_PREVIEW = [
  '/cards/custom/MN006.jpg',
  '/cards/custom/MN003.jpg',
  '/cards/custom/MN012.jpg',
  '/cards/custom/MN022.jpg',
  '/cards/cao-lua.svg',
];

export default function LobbyPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { startGame, addBot, setTimers, setDeckTheme, leaveRoom } = useSocket();

  const playerId = useGameStore((s) => s.playerId);
  const lobbyPlayers = useGameStore((s) => s.lobbyPlayers);
  const gameState = useGameStore((s) => s.gameState);
  const connectionLost = useGameStore((s) => s.connectionLost);
  const lobbyTimers = useGameStore((s) => s.lobbyTimers);
  const deckTheme = useGameStore((s) => s.deckTheme);
  const [botDifficulty, setBotDifficulty] = useState('normal');
  const [showRules, setShowRules] = useState(false);

  // đồng bộ mã phòng từ URL vào store (F5 vẫn giữ danh tính)
  useEffect(() => {
    if (roomCode && useGameStore.getState().roomCode !== roomCode) {
      useGameStore.getState().setRoomCode(roomCode);
    }
  }, [roomCode]);

  // khi chủ phòng bắt đầu → tất cả vào bàn chơi
  useEffect(() => {
    if (gameState?.status === 'playing') {
      soundEffects.playDraw();
      navigate(`/game/${roomCode}`);
    }
  }, [gameState?.status, roomCode, navigate]);

  const me = lobbyPlayers.find((p) => p.id === playerId);
  const isHost = !!me?.isHost;
  const canStart = lobbyPlayers.length >= 2 && !connectionLost;

  const handleCopyCode = async () => {
    soundEffects.playClick();
    try {
      await navigator.clipboard.writeText(roomCode);
      useGameStore.getState().pushToast('📋 Đã sao chép mã phòng: ' + roomCode);
    } catch {
      useGameStore.getState().pushToast('Mã phòng: ' + roomCode);
    }
  };

  const handleStart = () => {
    soundEffects.playVictory();
    startGame(roomCode);
  };

  const handleAddBot = () => {
    soundEffects.playClick();
    addBot(roomCode, botDifficulty);
  };

  const handleLeave = () => {
    soundEffects.playClick();
    leaveRoom(roomCode);
    navigate('/');
  };

  const handleDeckTheme = (themeId) => {
    if (!isHost || themeId === deckTheme) return;
    soundEffects.playClick();
    setDeckTheme(roomCode, themeId);
  };

  const slots = Array.from({ length: 5 }, (_, i) => lobbyPlayers[i] || null);

  return (
    <div className="landing-root min-h-screen">
      <header className="landing-header">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
          <button type="button" onClick={handleLeave} className="landing-logo text-left">
            <span className="landing-mark text-xl">🐱</span>
            <span className="leading-none">
              <span className="landing-logo-title font-display">MÈO NỔ</span>
              <span className="landing-logo-sub">PHÒNG CHỜ</span>
            </span>
          </button>
          <button
            type="button"
            onClick={handleLeave}
            className="landing-btn landing-btn--paper px-3 py-2 text-xs"
          >
            ← Rời phòng
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="landing-stamp">Sẵn sàng vào bàn</span>
            <h1 className="landing-h2 mt-4 font-display">Phòng chờ thi đấu</h1>
            <p className="landing-muted mt-2 text-sm">
              Chia sẻ mã phòng cho bạn bè (tối đa 5 người cùng chơi).
            </p>
          </div>

          <div className="landing-panel px-5 py-4 text-center sm:min-w-64">
            <div className="landing-overline">Mã phòng</div>
            <div className="font-display text-3xl font-black tracking-[0.25em] text-[var(--oxblood)]">
              {roomCode}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="landing-btn landing-btn--ink mt-2 w-full px-3 py-1.5 text-xs"
            >
              Sao chép mã
            </button>
          </div>
        </div>

        <section className="mt-9">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              Người chơi ({lobbyPlayers.length}/5)
            </h2>
            <span className="landing-muted text-xs">
              {isHost ? 'Bạn là chủ phòng' : 'Đang chờ chủ phòng bắt đầu...'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {slots.map((p, i) =>
              p ? (
                <div
                  key={p.id}
                  className={`lobby-seat flex flex-col items-center p-3 text-center ${
                    p.id === playerId ? 'is-me' : ''
                  }`}
                >
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded border-2 border-[var(--ink)] bg-[var(--paper)] text-2xl shadow-[2px_2px_0_var(--hard-shadow)]">
                    {p.isBot ? '🤖' : CAT_AVATARS[i % CAT_AVATARS.length]}
                  </div>
                  <div className="max-w-full truncate font-display text-sm font-bold">{p.name}</div>
                  {p.id === playerId && (
                    <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--oxblood)]">
                      (Bạn)
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {p.isHost && (
                      <span className="rounded-sm border border-[var(--ink)] bg-[var(--mustard)] px-1.5 py-0.5 text-[9px] font-black text-[var(--ink)]">
                        👑 Chủ phòng
                      </span>
                    )}
                    {p.isBot && (
                      <span className="rounded-sm border border-[var(--ink)] bg-[var(--ink)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--paper)]">
                        Bot AI
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  key={`empty-${i}`}
                  className="lobby-seat is-empty flex min-h-32 flex-col items-center justify-center p-3 text-center"
                >
                  <div className="text-2xl opacity-40">❓</div>
                  <div className="landing-muted mt-1 text-xs font-medium">Đang chờ...</div>
                </div>
              )
            )}
          </div>
        </section>

        <section className="mt-8 grid items-start gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="landing-bot-sheet">
            <span className="landing-overline">Bộ bài</span>
            <h2 className="mt-1 font-display text-xl font-bold">Chọn hình cho ván này</h2>
            <p className="landing-muted mt-1 text-xs">
              Luật chơi giữ nguyên, chỉ đổi hình minh họa.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {DECK_THEMES.map((deck) =>
                deck.comingSoon ? (
                  <div
                    key={deck.id}
                    aria-disabled="true"
                    className="landing-tab pointer-events-none flex cursor-not-allowed items-center gap-2 border-dashed p-2 text-left opacity-60"
                  >
                    <span className="flex h-14 w-10 shrink-0 items-center justify-center rounded-sm border border-dashed border-current text-xl">
                      {deck.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-black">{deck.name}</span>
                      <span className="block text-[10px] opacity-70">Sắp ra mắt</span>
                    </span>
                  </div>
                ) : (
                  <button
                    key={deck.id}
                    type="button"
                    disabled={!isHost || connectionLost}
                    aria-pressed={deckTheme === deck.id}
                    onClick={() => handleDeckTheme(deck.id)}
                    className={`landing-tab flex items-center gap-2 p-2 text-left ${
                      deckTheme === deck.id ? 'is-active' : ''
                    } ${!isHost ? 'cursor-default opacity-70' : ''}`}
                  >
                    <img
                      src={deck.preview}
                      alt=""
                      className="h-14 w-10 shrink-0 rounded-sm border border-current object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-black">{deck.name}</span>
                      <span className="block text-[10px] opacity-70">{deck.description}</span>
                    </span>
                  </button>
                )
              )}
            </div>

            {!isHost && (
              <p className="landing-muted mt-2 text-[10px]">Chủ phòng chọn bộ bài.</p>
            )}

            <div className="mt-4 flex items-end gap-2 overflow-hidden">
              {DECK_PREVIEW.map((image) => (
                <img
                  key={image}
                  src={themedImage(image, deckTheme)}
                  alt=""
                  className="h-20 w-14 shrink-0 rounded-sm border border-[var(--line)] object-cover shadow-[2px_2px_0_var(--hard-shadow)]"
                />
              ))}
            </div>
            <p className="landing-muted mt-2 text-[10px]">Xem trước bộ đang chọn</p>
          </div>

          <div className="landing-panel p-5">
            {isHost ? (
              <div className="space-y-4">
                <div>
                  <span className="landing-overline">Cài đặt thời gian</span>
                  <div className="mt-2">
                    <TimerSettings
                      values={lobbyTimers}
                      tone="paper"
                      onApply={(timers) => setTimers(roomCode, timers)}
                    />
                  </div>
                </div>

                <div className="rounded border-2 border-[var(--ink)] bg-[var(--paper-2)] p-3">
                  <span className="landing-overline">Đấu với máy</span>
                  <div className="mt-2 flex items-center gap-2">
                    <select
                      value={botDifficulty}
                      onChange={(e) => setBotDifficulty(e.target.value)}
                      className="landing-input min-w-0 flex-1 py-2 text-xs"
                    >
                      <option value="easy">😺 Bot Dễ</option>
                      <option value="normal">😼 Bot Thường</option>
                      <option value="hard">😾 Bot Khó</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddBot}
                      disabled={lobbyPlayers.length >= 5 || connectionLost}
                      className="landing-btn landing-btn--mustard shrink-0 px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ➕ Thêm bot
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!canStart}
                  className="landing-btn landing-btn--oxblood w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connectionLost
                    ? '⚠️ ĐANG KẾT NỐI LẠI...'
                    : canStart
                      ? '🚀 Bắt đầu chiến đấu'
                      : '⏳ Cần ít nhất 2 người chơi'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setShowRules(true);
                  }}
                  className="landing-btn landing-btn--paper w-full py-2 text-xs"
                >
                  📖 Xem lại luật chơi
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="py-4 font-display text-lg font-bold">
                  Đang chờ chủ phòng bắt đầu ván chơi...
                </div>
                <div className="landing-muted text-xs">
                  ⏱ Lượt <strong>{lobbyTimers.turnTimeLimit}s</strong> · Nope{' '}
                  <strong>{lobbyTimers.nopeWindowTime}s</strong> · Tương lai{' '}
                  <strong>{lobbyTimers.alterFutureTime}s</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setShowRules(true);
                  }}
                  className="landing-btn landing-btn--paper w-full py-2 text-xs"
                >
                  📖 Xem luật chơi
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
