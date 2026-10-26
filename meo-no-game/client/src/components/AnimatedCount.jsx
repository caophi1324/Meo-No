import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

export default function AnimatedCount({ value }) {
  const node = useRef(null), displayed = useRef(value);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const controls = animate(displayed.current, value, { duration: reduceMotion ? 0 : .2, ease: 'easeOut', onUpdate: v => {
      displayed.current = v;
      if (node.current) node.current.textContent = String(Math.round(v));
    } });
    return () => controls.stop();
  }, [value, reduceMotion]);
  return <span className="tabular-nums"><span ref={node} aria-hidden="true">{value}</span><span className="sr-only">{value}</span></span>;
}
