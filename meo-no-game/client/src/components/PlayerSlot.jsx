import { motion, useReducedMotion } from 'framer-motion';
import AnimatedCount from './AnimatedCount';
import useGameStore from '../store/gameStore';
import { cardBackFor } from '../../../shared/decks.js';

export default function PlayerSlot({
  player,
  isCurrentTurn = false,
  isAttacked = false,
  isTargeted = false,
  isFueled = false,
  attackerName = '',
}) {
  const isAlive = !!player.isAlive;
  const isBot = !!player.isBot;
  const isHost = !!player.isHost;
  const reduceMotion = useReducedMotion();
  const theme = useGameStore(s => s.deckTheme);

  return (
    <motion.div
      animate={{
        scale: isAttacked ? 1.02 : isCurrentTurn ? 1.05 : 1,
        x: isAttacked && !reduceMotion ? [0, -4, 4, 0] : 0,
      }}
      transition={{ duration: isAttacked ? 0.24 : 0.2 }}
      className={`game-player relative flex flex-col items-center p-2.5 sm:p-3 transition-all min-w-[95px] sm:min-w-[115px] select-none ${
        !isAlive
          ? 'game-player--dead'
          : isAttacked
            ? 'game-player--attacked'
            : isCurrentTurn
              ? 'game-player--turn'
              : ''
      }`}
    >
      {/* Vòng xoay quanh avatar khi đến lượt; bị tấn công thì ưu tiên màu đỏ. */}
      {isCurrentTurn && isAlive && !isAttacked && (
        <motion.div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-[var(--mustard)]/70"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={reduceMotion ? undefined : { duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Vòng đỏ nhấp nháy khi đang bị tấn công */}
      {isAttacked && isAlive && (
        <div className="pointer-events-none absolute -inset-1 rounded-[6px] border-2 border-[var(--oxblood)]/60 opacity-40" />
      )}

      {/* Nhãn trạng thái trên đầu */}
      {isAttacked && isAlive ? (
        <div className="absolute -top-2.5 px-2 sm:px-2.5 py-0.5 bg-[var(--oxblood)] border-2 border-[var(--ink)] rounded-[3px] text-[9px] sm:text-[10px] font-black text-[var(--paper)] uppercase tracking-wider shadow-[2px_2px_0_var(--hard-shadow)] whitespace-nowrap">
          ⚔️ BỊ TẤN CÔNG
        </div>
      ) : isCurrentTurn && isAlive ? (
        <div className="absolute -top-2.5 px-2 sm:px-2.5 py-0.5 bg-[var(--mustard)] border-2 border-[var(--ink)] rounded-[3px] text-[9px] sm:text-[10px] font-black text-[var(--ink)] uppercase tracking-wider shadow-[2px_2px_0_var(--hard-shadow)] whitespace-nowrap">
          🎯 ĐANG ĐI
        </div>
      ) : null}

      {/* Huy hiệu nổ tung nếu đã bị loại */}
      {!isAlive && (
        <div className="absolute -top-2.5 px-2 py-0.5 bg-[var(--ink)] border-2 border-[var(--ink)] rounded-[3px] text-[9px] font-black text-[var(--paper)] uppercase tracking-wider shadow-[2px_2px_0_var(--hard-shadow)]">
          💥 ĐÃ NỔ
        </div>
      )}

      {/* Khung ngắm khi là mục tiêu của hành động đang chờ */}
      {isTargeted && isAlive && (
        <div className="pointer-events-none absolute inset-0 rounded-[4px] border-2 border-dashed border-[var(--oxblood)]/80" />
      )}

      {/* Avatar người chơi */}
      <div className="relative mt-1 mb-1">
        <div
          className={`w-11 h-11 sm:w-13 sm:h-13 rounded-[4px] flex items-center justify-center text-2xl sm:text-3xl border-2 transition-transform shadow-[2px_2px_0_var(--hard-shadow)] ${
            !isAlive
              ? 'bg-[var(--paper-2)] border-[var(--ink-soft)] opacity-70'
              : isAttacked
                ? 'bg-[#E9C7C1] border-[var(--oxblood)] scale-105'
                : isCurrentTurn
                  ? 'bg-[var(--mustard)] border-[var(--ink)] scale-105'
                  : 'bg-[var(--paper-2)] border-[var(--ink)]'
          }`}
        >
          {isBot ? '🤖' : !isAlive ? '💀' : '🐱'}
        </div>

        {/* Vương miện chủ phòng */}
        {isHost && (
          <span
            className="absolute -top-2 -right-1.5 text-xs filter drop-shadow"
            title="Chủ phòng"
          >
            👑
          </span>
        )}
      </div>

      {/* Tên người chơi */}
      <div className="text-xs sm:text-sm font-bold text-[var(--ink)] truncate max-w-[85px] sm:max-w-[105px] text-center font-display">
        {player.name}
      </div>

      {/* Hiển thị số lượng bài trên tay với icon lá bài */}
      {isAlive ? (
        <div className="landing-chip mt-1"><img className="mr-1 h-6 w-4 rounded-sm sm:hidden" src={cardBackFor(theme)} alt=""/><AnimatedCount value={player.cardCount}/> lá</div>
      ) : (
        <div className="mt-1 text-[10px] text-[var(--oxblood)] font-bold">Bị loại</div>
      )}

      {/* Nhãn Bot / Cảnh báo bị đánh */}
      <div className="flex flex-col items-center gap-1 mt-1">
        {isFueled && isAlive && (
          <span className="text-[8px] sm:text-[9px] bg-[var(--paper-2)] text-[var(--ink)] border-2 border-[var(--ink)] px-1.5 py-0.2 rounded-[2px] font-bold whitespace-nowrap">
            ⛽ Tấn Công ×3
          </span>
        )}
        {isAttacked && isAlive && (
          <span
            className="text-[8px] sm:text-[9px] bg-[#F3D8D2] text-[var(--oxblood)] border-2 border-[var(--oxblood)] px-1.5 py-0.2 rounded-[2px] font-bold whitespace-nowrap"
            title={attackerName ? `Bị ${attackerName} tấn công` : 'Đang bị tấn công'}
          >
            {attackerName ? `${attackerName} ⚔️` : 'Đang bị ép lượt'}
          </span>
        )}
        {isBot && (
          <span className="text-[8px] sm:text-[9px] bg-[#DDE7EC] text-[#1F5A7A] border-2 border-[var(--ink)] px-1.5 py-0.2 rounded-[2px] font-bold">
            Bot AI
          </span>
        )}
      </div>
    </motion.div>
  );
}
