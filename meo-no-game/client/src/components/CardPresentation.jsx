import { useCallback, useEffect, useRef, useState } from 'react';
import PlayFlightLayer from './PlayFlightLayer';
import CardEffectOverlay, { EFFECT_META } from './CardEffectOverlay';
import { soundEffects } from '../utils/soundEffects';
import { seatRect } from '../utils/animationGeometry';
import useGameStore from '../store/gameStore';

function Presentation({ effect, players }) {
  const [stage, setStage] = useState(effect.flight ? 'flight' : effect.transfer ? 'transfer' : 'effect');
  const latest = useRef(effect); latest.current = effect;
  const audio = useRef([]), timers = useRef(new Set()), cancelled = useRef(false);
  const soundStarted = useRef(false);
  const play = useCallback((name, ...args) => {
    const handle = soundEffects.playTracked(name, ...args); audio.current.push(handle); return handle;
  }, []);
  const impact = useCallback(() => {
    if (soundStarted.current) return;
    soundStarted.current = true;
    const current = latest.current;
    if (current.motionKind === 'draw') return;
    play('playSlam');
    let resolveCue;
    const cue = { done: new Promise(resolve => { resolveCue = resolve; }), cancel: () => resolveCue() };
    audio.current.push(cue);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      if (!cancelled.current) play(EFFECT_META[current.type]?.sound || 'playCard').done.then(resolveCue);
      else resolveCue();
    }, 50); // Deliberate audio cue offset, NOT a completion timer.
    timers.current.add(timer);
  }, [play]);
  const finish = useCallback(async () => {
    // Overlay lasts 1250ms, longer than the scheduled 50ms cue. A flight-only
    // presentation lands after 150ms, so its cue has also started before this.
    await Promise.all(audio.current.map(handle => handle.done));
    if (!cancelled.current) useGameStore.getState().completeEffect(effect.effectId);
  }, [effect.effectId]);
  const landed = useCallback(() => {
    useGameStore.getState().markEffectLanded(effect.effectId);
    const current = useGameStore.getState().cardEffect;
    if (current?.effectId !== effect.effectId) return;
    if (current.transfer) setStage('transfer');
    else if (current.showEffect) setStage('effect');
    else finish();
  }, [effect.effectId, finish]);

  useEffect(() => {
    cancelled.current = false;
    // Recovery only: visual callbacks + AudioNode.onended are the normal path.
    const watchdog = setTimeout(() => useGameStore.getState().completeEffect(effect.effectId), 10000);
    return () => { cancelled.current = true; clearTimeout(watchdog); timers.current.forEach(clearTimeout); timers.current.clear(); audio.current.forEach(handle => handle.cancel()); };
  }, [effect.effectId]);

  useEffect(() => {
    if (stage !== 'effect' || soundStarted.current || effect.silent) return;
    const frame = requestAnimationFrame(() => { soundStarted.current = true; play(EFFECT_META[effect.type]?.sound || 'playCard'); });
    return () => cancelAnimationFrame(frame);
  }, [stage, effect.type, effect.silent, play]);

  if (stage === 'flight') return <PlayFlightLayer key="play" card={effect.cards?.[0]} cards={effect.cards} origins={effect.origins} theme={effect.theme} playerId={effect.playerId} type={effect.flightType || effect.type}
    fromRect={effect.fromRect} targetRect={effect.motionKind === 'draw' ? seatRect(effect.playerId) : undefined} faceDown={effect.motionKind === 'draw'}
    onLift={() => { play(effect.motionKind === 'draw' ? 'playDraw' : 'playClick'); play('playWhoosh', effect.motionKind === 'draw' ? 0 : .04); }} onImpact={impact} onLanded={landed}/>;
  if (stage === 'transfer') return <PlayFlightLayer key="transfer" card={null} faceDown transfer playerId={effect.from} targetRect={seatRect(effect.to)} theme={effect.theme}
    onLift={() => play('playWhoosh')} onImpact={() => {}} onLanded={() => setStage('effect')}/>;
  return <CardEffectOverlay effect={effect} players={players} managedAudio onDone={finish}/>;
}

export default function CardPresentation({ players }) {
  const effect = useGameStore(s => s.cardEffect);
  return effect ? <Presentation key={effect.effectId} effect={effect} players={players}/> : null;
}
