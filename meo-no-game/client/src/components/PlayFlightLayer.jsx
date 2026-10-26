import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { CARD_DATA } from '../data/cardData';
import { themedImage, cardBackFor } from '../../../shared/decks.js';
import { flightGeometry, quadraticPoint } from '../utils/animationGeometry';

const FLIGHT_EASE = [.22, .9, .3, 1.05];
const HEAVY = new Set(['attack', 'nope', 'action_cancelled', 'exploding_kitten', 'exploded', 'boom_atomic']);
const SPIN = new Set(['skip', 'super_skip', 'reverse', 'reverse_alt']);
const FUTURE = new Set(['see_the_future', 'alter_future', 'nhin_thau_tuong_lai']);
let lowFrameRate = false;

export default function PlayFlightLayer({ card, cards = [], fromRect, origins = {}, theme = 'default', playerId,
  type = card?.type, targetRect, faceDown = false, transfer = false, onLift, onImpact, onLanded }) {
  const reduceMotion = useReducedMotion();
  const [geometry] = useState(() => flightGeometry(fromRect || origins[card?.id], playerId, targetRect));
  const [landing, setLanding] = useState(false);
  const progress = useMotionValue(reduceMotion ? 1 : 0), scale = useMotionValue(1), opacity = useMotionValue(0);
  const callbacks = useRef({ onLift, onImpact, onLanded });
  callbacks.current = { onLift, onImpact, onLanded };
  const heavy = HEAVY.has(type) || HEAVY.has(card?.type);
  const future = FUTURE.has(type);
  const spin = SPIN.has(type);
  const x = useTransform(progress, t => quadraticPoint(geometry.start.x, geometry.control.x, geometry.end.x, t) - geometry.width / 2);
  const y = useTransform(progress, t => quadraticPoint(geometry.start.y, geometry.control.y, geometry.end.y, t) - geometry.height / 2);
  const rotate = useTransform(progress, t => reduceMotion || spin ? 0 : 8 * Math.sin(Math.PI * t));
  const rotateX = useTransform(progress, t => reduceMotion || spin ? 0 : 12 * Math.sin(Math.PI * t));
  const rotateY = useTransform(progress, t => {
    if (reduceMotion || !spin) return 0;
    return (type === 'reverse' || type === 'reverse_alt' ? 1 : -1) * 180 * t;
  });
  const flightOpacity = useTransform([progress, opacity], ([p, o]) => o * (future ? 1 - .35 * p : 1));
  const info = CARD_DATA[card?.type] || card || {};
  const color = heavy ? '#B9472E' : info.borderColor || '#C9922E';

  useEffect(() => {
    let cancelled = false, impact = false, controls, shake, last = 0, slow = 0, frames = 0;
    const raf = requestAnimationFrame(async () => {
      if (cancelled) return;
      callbacks.current.onLift?.();
      opacity.set(1);
      const hit = () => { if (!impact) { impact = true; callbacks.current.onImpact?.(); } };
      if (reduceMotion) {
        progress.set(1); opacity.set(0);
        controls = animate(opacity, 1, { duration: .12 });
        await controls;
        if (cancelled) return;
        hit();
      } else {
        const duration = transfer ? .38 : future ? .45 : .42;
        const startedAt = performance.now();
        controls = animate(progress, 1, { duration, ease: FLIGHT_EASE,
          onUpdate: p => {
            const now = performance.now();
            if (last) { frames++; if (now - last > 22) slow++; }
            last = now;
            if (now - startedAt >= duration * 930) hit();
          },
        });
        await controls;
        if (cancelled) return;
        hit();
        lowFrameRate = frames > 3 && slow / frames > .2;
        setLanding(true);
        const amp = heavy ? 3 : 2;
        shake = document.querySelector('[data-play-table]')?.animate(
          [{ transform: 'translate(0,0)' }, { transform: `translate(-${amp}px,2px)` }, { transform: `translate(${amp}px,-2px)` }, { transform: 'translate(0,0)' }],
          { duration: heavy ? 150 : 110, easing: 'ease-out' });
        controls = animate(scale, [1, 1.12, 1], { duration: .15, times: [0, .45, 1], ease: [.34, 1.56, .64, 1] });
        await controls;
      }
      if (!cancelled) callbacks.current.onLanded?.();
    });
    return () => { cancelled = true; cancelAnimationFrame(raf); controls?.stop(); shake?.cancel(); };
  }, [reduceMotion, progress, scale, opacity, heavy, future, transfer]);

  const group = cards.length ? cards : [card];
  const particles = lowFrameRate || window.innerWidth < 640 ? 6 : 12;
  return createPortal(
    <div data-play-flight={landing ? 'landing' : 'flight'} aria-hidden="true" className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 60, perspective: 800 }}>
      <motion.div style={{ position: 'absolute', top: 0, left: 0, x, y, scale, rotate, rotateX, rotateY, opacity: flightOpacity, width: geometry.width, height: geometry.height, transformPerspective: 800, willChange: 'transform, opacity' }}>
        {group.map((item, i) => {
          const data = CARD_DATA[item?.type] || item || {};
          const src = faceDown ? cardBackFor(theme) : themedImage(theme === 'lol' && item?.lolImage ? item.lolImage : data.image || cardBackFor(theme), theme);
          return <div key={item?.id || i} className="absolute inset-0 overflow-hidden rounded-[6px] border-2 bg-[var(--paper)]" style={{ borderColor: color, boxShadow: '3px 4px 0 #151A14', transform: `translate(${i * 3}px, ${i * -3}px) rotate(${i * -3}deg)` }}>
            <img src={src} alt="" width={104} height={146} className="h-full w-full object-cover" draggable={false}/>
          </div>;
        })}
        {!reduceMotion && ['reverse', 'reverse_alt'].includes(type) && <span className="absolute -inset-6 flex items-center justify-center text-6xl font-black text-[var(--mustard)]" style={{ textShadow: '2px 2px #151A14' }}>↻ ↺</span>}
      </motion.div>
      {landing && !reduceMotion && <>
        <motion.div className="absolute rounded-lg border-4" style={{ left: geometry.end.x - geometry.width * .7, top: geometry.end.y - geometry.height * .6, width: geometry.width * 1.4, height: geometry.height * 1.2, borderColor: heavy ? '#B9472E' : '#C9922E' }} initial={{ opacity: .85, scale: .8 }} animate={{ opacity: 0, scale: 1.3 }} transition={{ duration: .15 }}/>
        {Array.from({ length: particles }, (_, i) => {
          const angle = i / particles * Math.PI * 2;
          return <motion.i key={i} className="absolute h-1.5 w-1 rounded-sm" style={{ left: geometry.end.x, top: geometry.end.y, background: [color, '#C9922E', '#F4EAD5'][i % 3] }} initial={{ x: 0, y: 0, opacity: 1 }} animate={{ x: Math.cos(angle) * 42, y: Math.sin(angle) * 35, rotate: i * 37, opacity: 0 }} transition={{ duration: .15, ease: 'easeOut' }}/>;
        })}
      </>}
    </div>, document.body);
}
