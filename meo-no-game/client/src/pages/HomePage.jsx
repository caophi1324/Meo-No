import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';
import useGameStore from '../store/gameStore';
import RulesModal from '../components/RulesModal';
import CardCatalogModal from '../components/CardCatalogModal';
import Card from '../components/Card';
import { CARD_TYPES } from '../../../shared/cardTypes.js';
import { CARD_DATA } from '../data/cardData';
import { soundEffects } from '../utils/soundEffects';

const FOCUS = 'landing-focus';

const FEATURES = [
  { value: '2–5', label: 'người mỗi phòng' },
  { value: 'Tùy chỉnh', label: 'thời gian Nope' },
  { value: '1–4', label: 'bot tham chiến' },
  { value: '45', label: 'loại bài' },
];

const STEPS = [
  {
    title: 'Chơi bài',
    body: 'Tấn công, bỏ lượt, xin bài, cướp bài hoặc hô Nope trong cửa sổ Nope. Bạn được chơi bao nhiêu lá tùy thích.',
  },
  {
    title: 'Rút một lá',
    body: 'Rút bài để kết thúc lượt. Cầu mong lá tiếp theo không phải Mèo Nổ. Nếu có Gỡ Bom, bạn vẫn còn cơ hội.',
  },
  {
    title: 'Sống sót',
    body: 'Dùng Gỡ Bom để nhét Mèo Nổ lại vào chồng bài. Ai trụ lại cuối cùng sẽ thắng cả bàn.',
  },
];

const SHOWCASE = [
  CARD_TYPES.EXPLODING_KITTEN,
  CARD_TYPES.IMPLODING_KITTEN,
  CARD_TYPES.DEFUSE,
  CARD_TYPES.NOPE,
  CARD_TYPES.ATTACK,
  CARD_TYPES.SKIP,
  CARD_TYPES.STEAL_CARD,
  CARD_TYPES.REVERSE,
];

const NEW_CARDS = [
  CARD_TYPES.IMPLODING_KITTEN,
  CARD_TYPES.BOOM_ATOMIC,
  CARD_TYPES.STEAL_CARD,
  CARD_TYPES.REVERSE_ALT,
  CARD_TYPES.ALTER_FUTURE,
];

const CARD_TILT = [-6, 3, -2, 5, -4, 2, -3, 4];
const CARD_LIFT = [10, 0, 6, -4, 8, 0, 6, 10];
const HERO_CARDS = [
  CARD_TYPES.EXPLODING_KITTEN,
  CARD_TYPES.IMPLODING_KITTEN,
  CARD_TYPES.DEFUSE,
];

function CatMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 20 7.5 8.5l11.3 5.8h10.4L40.5 8.5l-2 11.5v9.4c0 7-6.3 12.1-14.5 12.1S9.5 36.4 9.5 29.4V20Z" />
      <circle cx="18" cy="27" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="30" cy="27" r="1.4" fill="currentColor" stroke="none" />
      <path d="M19.5 34c2.8 1.8 6.2 1.8 9 0" />
      <path d="M24 30.5v2" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 7 7 0 1 0 20.5 14.5Z" />
    </svg>
  );
}

function VolumeIcon({ muted = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" />
      {muted ? (
        <path d="m17 9 4 6M21 9l-4 6" />
      ) : (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8.5 8.5 0 0 1 0 12" />
        </>
      )}
    </svg>
  );
}

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [botCount, setBotCount] = useState(1);
  const [botDifficulty, setBotDifficulty] = useState('normal');
  const [showRules, setShowRules] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [isMuted, setIsMuted] = useState(soundEffects.isMuted());
  const [theme, setTheme] = useState(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.getAttribute('data-landing-theme') === 'dark' ? 'dark' : 'light';
  });
  const reduceMotion = useReducedMotion();

  const { createRoom, joinRoom } = useSocket();
  const navigate = useNavigate();

  const roomCode = useGameStore((s) => s.roomCode);
  const lobbyPlayers = useGameStore((s) => s.lobbyPlayers);

  // Dọn trạng thái cũ khi về trang chủ.
  useEffect(() => {
    useGameStore.getState().resetGame();
  }, []);

  // Ghi theme vào <html>, localStorage và meta để reload không nháy.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const next = theme === 'dark' ? 'dark' : 'light';
    const root = document.documentElement;
    root.setAttribute('data-landing-theme', next);
    root.style.colorScheme = next;
    try {
      localStorage.setItem('meo-no-theme', next);
    } catch {
      // Trình duyệt chặn localStorage thì chỉ áp dụng cho phiên hiện tại.
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', next === 'dark' ? '#101C17' : '#F4EAD5');
    const metaScheme = document.querySelector('meta[name="color-scheme"]');
    if (metaScheme) metaScheme.setAttribute('content', next === 'dark' ? 'dark' : 'light');
  }, [theme]);

  // Tự chuyển sang phòng chờ khi tạo/vào phòng thành công.
  useEffect(() => {
    if (roomCode && lobbyPlayers.length > 0) {
      navigate(`/lobby/${roomCode}`);
    }
  }, [roomCode, lobbyPlayers.length, navigate]);

  const requireName = () => {
    const name = playerName.trim();
    if (!name) {
      useGameStore.getState().pushToast('Vui lòng nhập tên của bạn trước nhé!');
      document.getElementById('player-name')?.focus();
      return null;
    }
    useGameStore.getState().setPlayerName(name);
    return name;
  };

  const handleCreateRoom = () => {
    soundEffects.playClick();
    const name = requireName();
    if (!name) return;
    createRoom(name);
  };

  const handleJoinRoom = () => {
    soundEffects.playClick();
    const name = requireName();
    if (!name) return;
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length !== 5) {
      useGameStore.getState().pushToast('Mã phòng phải có đúng 5 ký tự!');
      return;
    }
    useGameStore.getState().setRoomCode(code);
    joinRoom(code, name);
  };

  const handlePlayBot = () => {
    soundEffects.playCard();
    const name = requireName();
    if (!name) return;
    createRoom(name, { mode: 'bot', botCount, botDifficulty });
  };

  const handleToggleMute = () => {
    const next = soundEffects.toggleMute();
    setIsMuted(next);
  };

  const handleToggleTheme = () => {
    soundEffects.playClick();
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const openRules = () => {
    soundEffects.playClick();
    setShowRules(true);
  };

  const reveal = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };
  const inView = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.45, ease: 'easeOut' },
      };
  const beat = reduceMotion ? 0 : 0.08;

  return (
    <div id="top" className="landing-root relative min-h-screen overflow-x-hidden">
      <header className="landing-header sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#top" className={`landing-logo ${FOCUS}`}>
            <span className="landing-mark">
              <CatMark />
            </span>
            <span className="leading-none">
              <span className="landing-logo-title font-display">MÈO NỔ</span>
              <span className="landing-logo-sub">ONLINE</span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Điều hướng trang chủ">
            <a href="#how" className={`landing-nav-link ${FOCUS}`}>
              Cách chơi
            </a>
            <a href="#cards" className={`landing-nav-link ${FOCUS}`}>
              Bộ bài
            </a>
            <button type="button" onClick={openRules} className={`landing-nav-link ${FOCUS}`}>
              Luật chơi
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleTheme}
              className={`landing-icon-btn ${FOCUS}`}
              title="Chuyển nền sáng/tối"
              aria-label="Chuyển nền sáng/tối"
              aria-pressed={theme === 'dark'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              onClick={handleToggleMute}
              className={`landing-icon-btn ${FOCUS}`}
              title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            >
              <VolumeIcon muted={isMuted} />
            </button>
            <a href="#play" className={`landing-btn landing-btn--ink hidden px-4 py-2 text-xs sm:inline-flex ${FOCUS}`}>
              Vào bàn
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-24">
          <div aria-hidden="true" className="landing-felt-wash" />

          <div className="relative z-10">
            <motion.span {...reveal} transition={{ duration: 0.5, ease: 'easeOut' }} className="landing-stamp">
              Board game online cho 2–5 người
            </motion.span>

            <motion.h1
              {...reveal}
              transition={{ duration: 0.55, ease: 'easeOut', delay: beat }}
              className="landing-headline mt-6 max-w-2xl font-display"
            >
              Rút một lá.
              <br />
              Giữ bình tĩnh.
              <br />
              <span className="landing-highlight">Đừng nổ.</span>
            </motion.h1>

            <motion.p
              {...reveal}
              transition={{ duration: 0.55, ease: 'easeOut', delay: beat * 2 }}
              className="landing-lede mt-7 max-w-xl"
            >
              Chơi bài, phủ nhận đối thủ và cầu mong lá tiếp theo không phải Mèo Nổ. Một ván vài
              phút, nhưng đủ để cả bàn im lặng.
            </motion.p>

            <motion.div
              {...reveal}
              transition={{ duration: 0.55, ease: 'easeOut', delay: beat * 3 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <a href="#play" className={`landing-btn landing-btn--oxblood ${FOCUS}`}>
                Vào bàn chơi
              </a>
              <button type="button" onClick={openRules} className={`landing-btn landing-btn--paper ${FOCUS}`}>
                Đọc luật trong 2 phút
              </button>
            </motion.div>

            <motion.div
              {...reveal}
              transition={{ duration: 0.55, ease: 'easeOut', delay: beat * 4 }}
              className="mt-7 flex flex-wrap gap-2"
            >
              <span className="landing-tag">Không cần tải app</span>
              <span className="landing-tag">Có bot</span>
              <span className="landing-tag">5 giây Phủ Nhận</span>
            </motion.div>
          </div>

          <motion.div
            id="play"
            className="relative z-10 scroll-mt-28"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: reduceMotion ? 0 : 0.12 }}
          >
            <div aria-hidden="true" className="pointer-events-none relative z-10 mb-6 hidden h-28 items-center justify-center lg:flex">
              {HERO_CARDS.map((type, i) => (
                <motion.div
                  key={`hero-${type}`}
                  className="absolute"
                  style={{ x: (i - 1) * 48, rotate: (i - 1) * 6 }}
                  animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
                  transition={
                    reduceMotion
                      ? undefined
                      : { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }
                  }
                >
                  <Card card={{ id: `hero-${type}`, type }} size="small" />
                </motion.div>
              ))}
            </div>

            <div className="landing-panel p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="landing-overline">Phiếu vào bàn</span>
                  <h2 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">
                    Sẵn sàng vào bàn?
                  </h2>
                  <p className="landing-muted mt-1 text-sm">Tạo phòng, rủ bạn, hoặc thử sức với máy.</p>
                </div>
                <span className="landing-stamp hidden shrink-0 sm:inline-block">No. 01</span>
              </div>

              <div className="mt-6">
                <label htmlFor="player-name" className="landing-label">
                  Biệt danh của bạn
                </label>
                <input
                  id="player-name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  autoComplete="nickname"
                  placeholder="Nhập biệt danh mèo cưng..."
                  className="landing-input mt-1.5"
                />
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                className={`landing-btn landing-btn--oxblood mt-4 w-full ${FOCUS}`}
              >
                Tạo phòng mới
              </button>

              <div className="landing-rule my-5">
                <span>HOẶC VÀO BẰNG MÃ</span>
              </div>

              <div className="flex gap-2">
                <input
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().slice(0, 5))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleJoinRoom();
                  }}
                  placeholder="MÃ PHÒNG"
                  aria-label="Mã phòng"
                  className="landing-input min-w-0 flex-1 text-center font-display tracking-[0.2em]"
                />
                <button type="button" onClick={handleJoinRoom} className={`landing-btn landing-btn--ink shrink-0 ${FOCUS}`}>
                  Vào
                </button>
              </div>

              <div className="landing-bot-sheet mt-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="landing-overline">Đấu với máy</span>
                  <span className="landing-muted text-[11px] font-semibold">Chọn 1–4 bot</span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setBotCount(n);
                      }}
                      className={`landing-tab ${botCount === n ? 'is-active' : ''} ${FOCUS}`}
                    >
                      {n} bot
                    </button>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[
                    ['easy', 'Dễ'],
                    ['normal', 'Vừa'],
                    ['hard', 'Khó'],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setBotDifficulty(key);
                      }}
                      className={`landing-tab ${botDifficulty === key ? 'is-active' : ''} ${FOCUS}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handlePlayBot}
                  className={`landing-btn landing-btn--mustard mt-3 w-full text-sm ${FOCUS}`}
                >
                  Bắt đầu với bot
                </button>
              </div>

              <button
                type="button"
                onClick={openRules}
                className={`landing-btn landing-btn--paper mt-4 w-full text-xs ${FOCUS}`}
              >
                Hướng dẫn & luật chơi chi tiết
              </button>
            </div>
          </motion.div>
        </section>

        <motion.section {...inView} aria-label="Thông số trò chơi" className="landing-stats border-y-2">
          <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-6 md:grid-cols-4">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.label}
                className={`landing-stat px-4 py-6 sm:px-8 ${
                  i % 2 === 1 ? 'border-l' : ''
                } ${i >= 2 ? 'border-t md:border-t-0' : ''} ${i > 0 ? 'md:border-l' : ''}`}
              >
                <div className="landing-stat-value font-display">{feature.value}</div>
                <div className="landing-muted mt-1 text-xs font-semibold">{feature.label}</div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section {...inView} id="how" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 sm:px-6 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <span className="landing-stamp">Cách chơi</span>
              <h2 className="landing-h2 mt-5 max-w-md font-display">
                Luật đơn giản.
                <br />
                Bàn chơi thì không.
              </h2>
              <p className="landing-muted mt-5 max-w-md text-sm leading-relaxed sm:text-base">
                Bạn không cần nhớ cả bộ bài. Chỉ cần nhớ ba điều: đừng rút trúng Mèo Nổ, đừng tin
                nụ cười của người bên cạnh, và luôn để dành một lá Phủ Nhận.
              </p>
              <button type="button" onClick={openRules} className={`landing-btn landing-btn--paper mt-7 ${FOCUS}`}>
                Đọc luật đầy đủ
              </button>
            </div>

            <div className="landing-rulebook">
              {STEPS.map((step, i) => (
                <div key={step.title} className="landing-step grid grid-cols-[auto_1fr] gap-5 py-6 sm:grid-cols-[4.5rem_1fr]">
                  <div className="landing-step-number font-display">0{i + 1}</div>
                  <div>
                    <h3 className="font-display text-xl font-bold">{step.title}</h3>
                    <p className="landing-muted mt-1.5 max-w-xl text-sm leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section {...inView} id="cards" className="landing-deck scroll-mt-24 border-t-2 py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <span className="landing-stamp">Bộ bài</span>
                <h2 className="landing-h2 mt-5 font-display">Không chỉ có mèo.</h2>
              </div>
              <div className="max-w-sm">
                <p className="landing-muted text-sm leading-relaxed">
                  45 loại bài, từ phòng thủ, tấn công đến phá bài. Mỗi ván xáo lại, nên không ai biết
                  lá tiếp theo là gì.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setShowCatalog(true);
                  }}
                  className={`landing-btn landing-btn--paper mt-3 text-xs ${FOCUS}`}
                >
                  Xem bộ bài custom
                </button>
              </div>
            </div>

            <div className="landing-felt mt-9">
              <div className="landing-card-row">
                {SHOWCASE.map((type, i) => (
                  <motion.div
                    key={type}
                    className="landing-card"
                    initial={{ rotate: CARD_TILT[i], y: CARD_LIFT[i] }}
                    animate={{ rotate: CARD_TILT[i], y: CARD_LIFT[i] }}
                    whileHover={
                      reduceMotion
                        ? undefined
                        : { rotate: 0, rotateX: 4, rotateY: -4, y: -7 }
                    }
                    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                    style={{ transformPerspective: 800 }}
                  >
                    <Card card={{ id: `landing-${type}`, type }} size="normal" />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="landing-overline">Vừa thêm</span>
              {NEW_CARDS.map((type) => (
                <span key={type} className="landing-chip">
                  {CARD_DATA[type].nameVN}
                </span>
              ))}
            </div>
          </div>
        </motion.section>

        <section className="px-4 pb-20 sm:px-6">
          <div className="landing-cta mx-auto max-w-6xl px-6 py-12 text-center sm:px-12 sm:py-16">
            <p className="landing-cta-kicker">Bàn chơi đang chờ</p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Bàn chơi đang chờ.
            </h2>
            <p className="landing-cta-copy mx-auto mt-3 max-w-xl text-sm sm:text-base">
              2–5 người. Không cần tải app. Chỉ cần một người dám rút trước.
            </p>
            <a href="#play" className={`landing-btn landing-btn--ink mt-7 ${FOCUS}`}>
              Chọn chỗ ngồi
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            <span className="font-display font-bold">MÈO NỔ</span> là board game online cho những
            buổi tối không ai chịu nhường.
          </p>
          <div className="flex gap-5">
            <button type="button" onClick={openRules} className={`landing-footer-link ${FOCUS}`}>
              Luật chơi
            </button>
            <a href="#top" className={`landing-footer-link ${FOCUS}`}>
              Lên đầu
            </a>
          </div>
        </div>
      </footer>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showCatalog && <CardCatalogModal onClose={() => setShowCatalog(false)} />}
    </div>
  );
}
