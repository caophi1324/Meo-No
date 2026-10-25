import { useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CARD_DATA } from '../data/cardData';
import useGameStore from '../store/gameStore';
import { themedImage } from '../../../shared/decks.js';

export default function CardAnimationOverlay({ animation, onComplete }) {
  const reduceMotion = useReducedMotion();
  const deckTheme = useGameStore((s) => s.deckTheme);

  useEffect(() => {
    if (!animation) return;

    if (animation.type === 'deal') {
      const t = setTimeout(() => {
        if (onComplete) onComplete();
      }, 900);
      return () => clearTimeout(t);
    }

    if (animation.type === 'draw') {
      const t = setTimeout(() => {
        if (onComplete) onComplete();
      }, 560);
      return () => clearTimeout(t);
    }

    if (animation.type === 'play') {
      const t = setTimeout(() => {
        if (onComplete) onComplete();
      }, 430);
      return () => clearTimeout(t);
    }

    if (animation.type === 'shuffle') {
      const t = setTimeout(() => {
        if (onComplete) onComplete();
      }, 660);
      return () => clearTimeout(t);
    }

    if (animation.type === 'imploding') {
      const t = setTimeout(() => {
        if (onComplete) onComplete();
      }, 600);
      return () => clearTimeout(t);
    }

  }, [animation]);

  if (!animation || reduceMotion) return null;

  const playImage = animation.cardType ? CARD_DATA[animation.cardType]?.image : null;
  const playSrc = playImage ? themedImage(playImage, deckTheme) : '/cards/card-back.svg';
  const implodingSrc = themedImage('/cards/custom/MN001.jpg', deckTheme);

  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
      <AnimatePresence>
        {/* ANIMATION 1: CHIA BÀI (DEALING) */}
        {animation.type === 'deal' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Lớp thông báo hiệu ứng chia bài */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: -40 }}
              animate={{ opacity: 1, scale: 1, y: -60 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute px-5 py-2 rounded-2xl bg-amber-500 text-slate-950 font-black text-sm uppercase tracking-wider font-display shadow-2xl border-2 border-white"
            >
              🎴 ĐANG CHIA BÀI...
            </motion.div>

            {/* 5 lá bài bay lần lượt từ giữa bàn về tay người chơi */}
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={`deal-${i}`}
                initial={{
                  x: 0,
                  y: -60,
                  scale: 0.7,
                  rotate: (i - 2) * 5,
                  opacity: 1,
                }}
                animate={{
                  x: (i - 2) * 75,
                  y: 260,
                  scale: 1,
                  rotate: (i - 2) * 4,
                  opacity: [1, 1, 0.9, 0],
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="absolute"
              >
                <div className="w-22 h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400">
                  <img
                    src="/cards/card-back.svg"
                    alt="Lưng bài"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ANIMATION 1A: ĐÁNH BÀI RA GIỮA BÀN RỒI VÀO CHỒNG HẠ */}
        {animation.type === 'play' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <motion.div
              initial={{ x: 0, y: 220, scale: 0.82, rotate: 8, opacity: 1 }}
              animate={{
                x: [0, 0, 120],
                y: [220, 0, -36],
                scale: [0.82, 1, 0.94],
                rotate: [8, 0, -6],
                opacity: [1, 1, 0],
              }}
              transition={{ duration: 0.42, times: [0, 0.65, 1], ease: 'easeOut' }}
              className="absolute"
            >
              <div className="w-20 h-28 rounded-xl overflow-hidden border-2 border-amber-400 bg-slate-950 shadow-2xl">
                <img src={playSrc} alt="" className="w-full h-full object-cover" />
              </div>
            </motion.div>
          </div>
        )}

        {/* ANIMATION 1B: XÀO BÀI — bắt đầu từ chồng rút */}
        {animation.type === 'shuffle' && (
          <div className="relative w-full h-full flex items-center justify-center">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={`shuffle-${i}`}
                animate={{
                  x: [-120, (i - 1) * 90, (i - 1) * 25, 0],
                  y: [10, (i - 1) * 18, -10, 0],
                  rotate: [-6, (i - 1) * 18, (i - 1) * 5, 0],
                  opacity: [0.9, 1, 1, 0],
                }}
                transition={{ duration: 0.65, times: [0, 0.3, 0.7, 1], ease: 'easeInOut' }}
                className="absolute"
              >
                <div className="w-20 h-28 rounded-xl overflow-hidden shadow-2xl border-2 border-amber-400">
                  <img src="/cards/card-back.svg" alt="" className="w-full h-full object-cover" />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ANIMATION 1C: IMPLODING LẬT MẶT */}
        {animation.type === 'imploding' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <motion.div
              initial={{ rotateY: -90, scale: 0.8, opacity: 0 }}
              animate={{ rotateY: 0, scale: 1, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute w-24 h-36 rounded-xl overflow-hidden border-2 border-sky-400 bg-slate-950"
            >
              <img src={implodingSrc} alt="Imploding Kitten" className="w-full h-full object-cover" />
            </motion.div>
          </div>
        )}

        {/* ANIMATION 2: RÚT BÀI — cung từ chồng bài về tay */}
        {animation.type === 'draw' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <motion.div
              initial={{
                x: -150,
                y: -70,
                scale: 0.82,
                rotate: -6,
                opacity: 1,
              }}
              animate={{
                x: [-150, -40, 120],
                y: [-70, 40, 270],
                scale: [0.82, 1.05, 1.12],
                rotate: [-6, 4, -4],
                opacity: [1, 1, 0],
              }}
              transition={{
                duration: 0.55,
                times: [0, 0.55, 1],
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute"
            >
              <div className="w-24 h-36 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-400 ring-4 ring-orange-500/40">
                <img
                  src="/cards/card-back.svg"
                  alt="Rút bài"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
