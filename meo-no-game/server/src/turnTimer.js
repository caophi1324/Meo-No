// Chọn người cần bị timeout và hành động tự động tương ứng.
// Tách khỏi timer để test được mà không cần socket/io.
const OWN_TIMER_STATES = new Set(['nope', 'alter_future']);

export function getTurnTimeoutPlan(room) {
  const gs = room?.engine?.gameState;
  if (!gs || gs.status !== 'playing' || gs.winner) return null;
  if (OWN_TIMER_STATES.has(gs.waitingFor)) return null;

  let actorId = null;
  if (gs.waitingFor === 'defuse_place' || gs.waitingFor === 'imploding_place') {
    actorId = gs.pendingAction?.playerId || null;
  } else if (gs.waitingFor === 'favor_give') {
    actorId = gs.favorTarget || null;
  } else if (gs.waitingFor === 'choice') {
    actorId = gs.pendingChoice?.playerId || null;
  } else if (gs.waitingFor === null && !gs.pendingAction) {
    actorId = gs.players[gs.currentPlayerIndex]?.id || null;
  } else {
    return null;
  }

  if (!actorId) return null;
  const actor = gs.players.find(p => p.id === actorId);
  if (!actor || actor.removed || actor.isBot) return null;

  return { actorId, waitingFor: gs.waitingFor || 'turn' };
}

export function getTimeoutAction(gameState, actorId) {
  if (!gameState) return null;

  if (gameState.waitingFor === 'defuse_place') {
    const max = Math.max(0, gameState.drawPile?.length || 0);
    return { type: 'defuse_place', position: Math.floor(Math.random() * (max + 1)) };
  }

  if (gameState.waitingFor === 'imploding_place') {
    const max = Math.max(0, gameState.drawPile?.length || 0);
    return { type: 'imploding_place', position: Math.floor(Math.random() * (max + 1)) };
  }

  if (gameState.waitingFor === 'favor_give') {
    const actor = gameState.players.find(p => p.id === actorId);
    const card = actor?.hand?.[0];
    return card ? { type: 'favor_give', cardId: card.id } : null;
  }

  if (gameState.waitingFor === 'choice' && gameState.pendingChoice) {
    const choice = gameState.pendingChoice;
    let value = 0;
    if (choice.kind === 'search_top5') value = choice.cards?.[0]?.id ?? null;
    else if (choice.kind === 'revive_cards') {
      value = (choice.cards || []).slice(0, choice.count || 2).map(c => c.id);
    } else if (choice.kind === 'steal_pick') {
      value = Math.floor(Math.random() * Math.max(1, choice.cardCount || 1));
    } else if (choice.kind === 'reaction') value = 'pass';
    return { type: 'choice_response', choiceId: choice.id, value };
  }

  return { type: 'draw_card' };
}
