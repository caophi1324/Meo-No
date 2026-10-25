import { motion, useReducedMotion } from 'framer-motion';

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

  return (
    <motion.div
      animate={{
        scale: isAttacked ? 1.02 : isCurrentTurn ? 1.05 : 1,
        x: isAttacked && !reduceMotion ? [0, -4, 4, 0] : 0,
      }}
      transition={{ duration: isAttacked ? 0.24 : 0.2 }}
      className={`relative flex flex-col items-center p-2.5 sm:p-3 rounded-2xl transition-all min-w-[95px] sm:min-w-[115px] select-none ${
        !isAlive
          ? 'bg-slate-900/60 border border-red-900/40 opacity-70 filter grayscale'
          : isAttacked
            ? 'bg-gradient-to-b from-red-950/80 via-slate-900/95 to-slate-900 border-2 border-red-500 shadow-xl shadow-red-600/30 attack-blink'
            : isCurrentTurn
              ? 'bg-gradient-to-b from-emerald-950/70 via-slate-900/90 to-slate-900 border-2 border-emerald-400 shadow-xl shadow-emerald-500/20 turn-blink'
              : 'bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 shadow-md backdrop-blur-xs'
      }`}
    >
      {/* Vòng xoay quanh avatar khi đến lượt; bị tấn công thì ưu tiên màu đỏ. */}
      {isCurrentTurn && isAlive && !isAttacked && (
        <motion.div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-emerald-400/60"
          animate={reduceMotion ? undefined : { rotate: 360 }}
          transition={reduceMotion ? undefined : { duration: 8, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Vòng đỏ nhấp nháy khi đang bị tấn công */}
      {isAttacked && isAlive && (
        <div className="pointer-events-none absolute -inset-1 rounded-[1.15rem] border-2 border-red-500/70 animate-ping motion-reduce:animate-none opacity-30" />
      )}

      {/* Nhãn trạng thái trên đầu */}
      {isAttacked && isAlive ? (
        <div className="absolute -top-2 px-2 sm:px-2.5 py-0.5 bg-gradient-to-r from-red-600 to-rose-600 rounded-full text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider shadow-lg animate-pulse border border-red-300 whitespace-nowrap">
          ⚔️ BỊ TẤN CÔNG
        </div>
      ) : isCurrentTurn && isAlive ? (
        <div className="absolute -top-2 px-2 sm:px-2.5 py-0.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full text-[9px] sm:text-[10px] font-black text-slate-950 uppercase tracking-wider shadow-lg border border-emerald-100/80 whitespace-nowrap">
          🎯 ĐANG ĐI
        </div>
      ) : null}

      {/* Huy hiệu nổ tung nếu đã bị loại */}
      {!isAlive && (
        <div className="absolute -top-2 px-2 py-0.5 bg-red-600 rounded-full text-[9px] font-black text-white uppercase tracking-wider shadow-md">
          💥 ĐÃ NỔ
        </div>
      )}

      {/* Khung ngắm khi là mục tiêu của hành động đang chờ */}
      {isTargeted && isAlive && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-rose-400/80 animate-pulse" />
      )}

      {/* Avatar người chơi */}
      <div className="relative mt-1 mb-1">
        <div
          className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl shadow-inner border-2 transition-transform ${
            !isAlive
              ? 'bg-slate-900 border-red-900/60'
              : isAttacked
                ? 'bg-red-500/20 border-red-400 scale-105'
                : isCurrentTurn
                  ? 'bg-emerald-500/20 border-emerald-400 scale-105'
                  : 'bg-slate-700/80 border-slate-600'
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
      <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[85px] sm:max-w-[105px] text-center font-display">
        {player.name}
      </div>

      {/* Hiển thị số lượng bài trên tay với icon lá bài */}
      {isAlive ? (
        <div className="mt-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/60 border border-slate-700 text-[10px] sm:text-xs text-amber-300 font-semibold font-display">
          <span>🂠</span>
          <span>{player.cardCount} lá</span>
        </div>
      ) : (
        <div className="mt-1 text-[10px] text-red-400 font-bold">Bị loại</div>
      )}

      {/* Nhãn Bot / Cảnh báo bị đánh */}
      <div className="flex flex-col items-center gap-0.5 mt-1">
        {isFueled && isAlive && (
          <span className="text-[8px] sm:text-[9px] bg-amber-950 text-amber-200 border border-amber-700 px-1.5 py-0.2 rounded-md font-bold whitespace-nowrap">
            ⛽ Tấn Công ×3
          </span>
        )}
        {isAttacked && isAlive && (
          <span
            className="text-[8px] sm:text-[9px] bg-red-950 text-red-200 border border-red-800 px-1.5 py-0.2 rounded-md font-bold whitespace-nowrap"
            title={attackerName ? `Bị ${attackerName} tấn công` : 'Đang bị tấn công'}
          >
            {attackerName ? `${attackerName} ⚔️` : 'Đang bị ép lượt'}
          </span>
        )}
        {isBot && (
          <span className="text-[8px] sm:text-[9px] bg-sky-950 text-sky-300 border border-sky-800 px-1.5 py-0.2 rounded-md font-bold">
            Bot AI
          </span>
        )}
      </div>
    </motion.div>
  );
}
