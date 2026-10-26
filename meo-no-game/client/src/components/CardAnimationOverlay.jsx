import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import useGameStore from '../store/gameStore';
import { cardBackFor, themedImage } from '../../../shared/decks.js';
import { anchorRect, flightGeometry } from '../utils/animationGeometry';

function MeasuredAnimation({ animation, onComplete, theme }) {
  const reduceMotion = useReducedMotion();
  const done = useRef(onComplete); done.current = onComplete;
  const completed = useRef(false);
  const [geometry] = useState(() => flightGeometry(anchorRect('[data-draw-pile]'), null, anchorRect('[data-hand]')));
  const count = animation.type === 'deal' ? 5 : animation.type === 'shuffle' ? 3 : 1;
  const duration = animation.type === 'deal' ? .54 : animation.type === 'draw' ? .56 : animation.type === 'shuffle' ? .66 : .6;
  const complete = () => { if (!completed.current) { completed.current = true; done.current?.(); } };
  return createPortal(<div aria-hidden="true" className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
    {Array.from({ length: reduceMotion ? 1 : count }, (_, i) => <motion.div key={i}
      className="absolute overflow-hidden rounded-[6px] border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[3px_3px_0_var(--hard-shadow)]"
      style={{ left: 0, top: 0, width: geometry.width, height: geometry.height }}
      initial={{ x: geometry.start.x - geometry.width / 2, y: geometry.start.y - geometry.height / 2, opacity: 0, rotate: 0 }}
      animate={reduceMotion ? { opacity: [0, 1, 0] } : {
        x: [geometry.start.x - geometry.width / 2, geometry.control.x - geometry.width / 2, geometry.end.x - geometry.width / 2 + (i - (count - 1) / 2) * 16],
        y: [geometry.start.y - geometry.height / 2, geometry.control.y, geometry.end.y - geometry.height / 2],
        rotate: [-6, 8, 0], rotateY: animation.type === 'imploding' ? [-90, 0, 0] : 0,
        opacity: [0, 1, 1, 0],
      }}
      transition={{ duration: reduceMotion ? .12 : duration, delay: reduceMotion ? 0 : i * .09, ease: [.22, .9, .3, 1] }}
      onAnimationComplete={reduceMotion || i === count - 1 ? complete : undefined}>
      <img src={animation.type === 'imploding' ? themedImage('/cards/custom/MN001.jpg', theme) : cardBackFor(theme)} alt="" width={104} height={146} className="w-full h-full object-cover"/>
    </motion.div>)}
  </div>, document.body);
}

export default function CardAnimationOverlay({ animation, onComplete }) {
  const theme = useGameStore(s => s.deckTheme);
  // All play motions are owned by CardPresentation, including optimistic plays.
  return animation && animation.type !== 'play' ? <MeasuredAnimation key={animation.id || animation.type} animation={animation} theme={theme} onComplete={onComplete}/> : null;
}
