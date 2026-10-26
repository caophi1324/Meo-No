const wait = ms => new Promise(r => setTimeout(r, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
export async function runBurst() {
  const review = window.animationReview;
  review.reset(); review.soundEffects.muted = true;
  const started = [], completed = [];
  let maxQueue = 0, maxLayers = 0;
  const unsub = review.store.subscribe((s, prev) => {
    maxQueue = Math.max(maxQueue, s.effectQueue.length);
    if (s.cardEffect?.effectId !== prev.cardEffect?.effectId) {
      if (s.cardEffect) started.push(s.cardEffect.effectId);
      if (prev.cardEffect) completed.push(prev.cardEffect.effectId);
    }
  });
  const tick = setInterval(() => { maxLayers = Math.max(maxLayers, document.querySelectorAll('[data-play-flight]').length); }, 16);
  try {
    for (const ids of [['review-0'], ['review-1'], ['review-2'], ['review-4', 'review-5']]) {
      review.playCards(ids); await wait(140);
    }
    const until = performance.now() + 9500;
    while (review.store.getState().cardEffect && performance.now() < until) await wait(40);
    const s = review.store.getState();
    assert(!s.cardEffect && s.effectQueue.length === 0, 'queue stuck');
    assert(started.length === 4 && completed.length === 4, 'lost or duplicated presentation');
    assert(s.playedPresentations.every(p => p.accepted && p.resolved && p.landed), 'incomplete receipt');
    assert(maxLayers === 1, 'overlapping flight layers');
    assert(review.soundEffects.activeVoices.size === 0, 'audio voice leak');
    return { started, completed, maxQueue, maxLayers, cards: s.playedPresentations.map(p => p.cardIds), muted: true, pass: true };
  } finally { unsub(); clearInterval(tick); }
}

export async function reducedMotionCheck() {
  assert(matchMedia('(prefers-reduced-motion: reduce)').matches, 'reduced-motion not enabled');
  const review = window.animationReview;
  review.reset(); review.soundEffects.muted = true;
  review.playCards(['review-0']);
  const transforms = [], tableTransforms = []; let particles = 0;
  const end = performance.now() + 1900;
  while (performance.now() < end) {
    const flight = document.querySelector('[data-play-flight]');
    if (flight && Number(getComputedStyle(flight.firstElementChild).opacity) > .01) {
      transforms.push(getComputedStyle(flight.firstElementChild).transform);
      particles = Math.max(particles, flight.querySelectorAll('i').length);
    }
    tableTransforms.push(getComputedStyle(document.querySelector('[data-play-table]')).transform);
    await wait(16);
  }
  assert(particles === 0, 'reduced-motion particles');
  assert(new Set(transforms).size <= 1, 'reduced-motion flight translated or rotated');
  assert(tableTransforms.every(t => t === 'none'), 'reduced-motion table shook');
  assert(!review.store.getState().cardEffect, 'reduced-motion queue stuck');
  return { pass: true, samples: transforms.length, uniqueTransforms: [...new Set(transforms)], particles, tableTransforms: [...new Set(tableTransforms)] };
}

export async function cancellationCheck() {
  const review = window.animationReview;
  review.reset(); review.soundEffects.muted = false;
  review.playCards(['review-0']); await wait(100);
  review.store.getState().clearEffects();
  await wait(600);
  assert(document.querySelectorAll('[data-play-flight]').length === 0, 'orphaned flight after reset');
  assert(review.soundEffects.activeVoices.size === 0, 'sound still alive after reset');
  return { pass: true, remainingVoices: review.soundEffects.activeVoices.size };
}
