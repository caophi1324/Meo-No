// Presentation only: never delays or mutates authoritative game state.
let sequence = 0;
export const nextPresentationId = () => `presentation-${++sequence}`;
export const effectTypeForCard = type => ({
  favor: 'favor_request', nope: 'action_cancelled', chong_xao_bai: 'action_cancelled',
  nhin_thau_tuong_lai: 'see_the_future', nap_nhien_lieu: 'fuel',
  tan_cong_chi_dinh: 'attack', tan_cong_ban_than: 'attack',
}[type] || type);

export function appendPresentation(state, item) {
  return state.cardEffect
    ? { effectQueue: [...state.effectQueue, item] }
    : { cardEffect: item };
}

export function finishPresentation(state, id) {
  if (state.cardEffect?.effectId !== id) return {};
  return { cardEffect: state.effectQueue[0] || null, effectQueue: state.effectQueue.slice(1) };
}

export function playPresentation(state, cards, playerId, origins = {}, key = nextPresentationId()) {
  const effectId = key;
  const item = {
    effectId, actionId: key, playerId, type: effectTypeForCard(cards[0]?.type), flightType: effectTypeForCard(cards[0]?.type),
    cards: cards.map(card => ({ ...card })), origins, theme: state.deckTheme,
    flight: true, showEffect: false, phase: 'flight',
  };
  const receipt = { actionId: key, playerId, cardIds: cards.map(c => c.id), type: item.type, accepted: false, resolved: false, landed: false };
  return { ...appendPresentation(state, item), playedPresentations: [...state.playedPresentations.slice(-99), receipt] };
}

export function receiveEffect(state, payload) {
  const actor = payload.playerId || payload.forPlayer || payload.requester || payload.to;
  const receipt = state.playedPresentations.find(p => !p.resolved &&
    (!actor || p.playerId === actor) &&
    (payload.cardIds?.length ? payload.cardIds.every(id => p.cardIds.includes(id)) :
      p.type === payload.type || (p.type === 'reverse_alt' && payload.type === 'reverse') ||
      (p.type === 'steal_card' && payload.type === 'steal_random') ||
      (p.cardIds.length > 1 && ['steal_random', 'steal_specific', 'steal_discard'].includes(payload.type)) ||
      payload.type === 'action_cancelled'));
  const playedPresentations = receipt ? state.playedPresentations.map(p => p === receipt ? { ...p, resolved: true } : p) : state.playedPresentations;
  const transfer = ['favor_give', 'steal_random', 'steal_specific', 'steal_discard'].includes(payload.type) && !!payload.to && payload.success !== false;
  const update = item => ({ ...item, ...payload, effectId: item.effectId, actionId: item.actionId, showEffect: true, transfer });
  if (receipt && state.cardEffect?.actionId === receipt.actionId && state.cardEffect.phase !== 'effect') {
    return { cardEffect: update(state.cardEffect), playedPresentations };
  }
  if (receipt && state.effectQueue.some(p => p.actionId === receipt.actionId)) {
    return { effectQueue: state.effectQueue.map(item => item.actionId === receipt.actionId ? update(item) : item), playedPresentations };
  }
  const item = { ...payload, effectId: nextPresentationId(), actionId: receipt?.actionId,
    theme: state.deckTheme, flight: false, showEffect: true, phase: 'effect',
    silent: !!receipt && payload.type !== 'action_cancelled',
    transfer,
  };
  return { ...appendPresentation(state, item), playedPresentations };
}

export function observePlayedCards(state, next, origins = {}) {
  const prev = state.gameState;
  if (!prev || prev.status !== 'playing' || next.roomCode !== prev.roomCode) return {};
  const previousIds = new Set((prev.discardPile || []).map(c => c.id));
  const added = (next.discardPile || []).filter(c => !previousIds.has(c.id));
  if (!added.length) return {};
  const knownLogs = new Set((prev.publicLog || []).map(l => l.id));
  const playLog = (next.publicLog || []).filter(l => !knownLogs.has(l.id) &&
    (l.kind === 'play' || /^🎴 .* đã chơi /.test(l.text || '') || /^🚫 .* đã Phủ Nhận /.test(l.text || '') || l.kind === 'nope')).at(-1);
  const pending = state.playedPresentations.find(p => !p.accepted && p.cardIds.every(id => added.some(c => c.id === id)));
  if (pending) return { playedPresentations: state.playedPresentations.map(p => p === pending ? { ...p, accepted: true } : p) };
  if (!playLog) return {};
  // The existing protocol publishes full discarded cards and the previous turn/Nope owner.
  // Never inspect opponents' hidden hands or infer hidden card identities.
  const isNope = added.some(c => ['nope', 'chong_xao_bai'].includes(c.type));
  const localRemoved = (prev.myHand || []).some(c => added.some(a => a.id === c.id));
  const nopeActor = [...(prev.opponents || []), { id: state.playerId, name: state.playerName }]
    .find(p => (playLog.text || '').startsWith(`🚫 ${p.name} đã Phủ Nhận `))?.id;
  const actor = localRemoved ? state.playerId : isNope
    ? nopeActor || next.pendingActionOwner || prev.pendingActionOwner
    : prev.currentPlayerId;
  const cards = isNope ? added.filter(c => ['nope', 'chong_xao_bai'].includes(c.type)) : added;
  if (!cards.length) return {};
  const patch = playPresentation(state, cards, actor, origins);
  patch.playedPresentations = patch.playedPresentations.map(p => p.actionId === (patch.cardEffect || patch.effectQueue.at(-1)).actionId ? { ...p, accepted: true } : p);
  return patch;
}
