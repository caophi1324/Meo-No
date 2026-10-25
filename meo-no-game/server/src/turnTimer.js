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

function pickIndexes(total, count) {
  const pool = Array.from({ length: Math.max(0, total | 0) }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count || 1, pool.length));
}

// Giá trị mặc định hợp lệ cho bot / người hết giờ. Không dùng cho người thật.
export function defaultChoiceValue(choice) {
  if (!choice) return null;
  if (choice.kind === 'search_top5') return choice.cards?.[0]?.id ?? null;
  if (choice.kind === 'revive_cards') {
    return (choice.cards || []).slice(0, choice.count || 2).map(c => c.id);
  }
  if (choice.kind === 'reaction') return 'pass';
  if (choice.kind === 'steal_pick') {
    return Math.floor(Math.random() * Math.max(1, choice.cardCount || 1));
  }
  if (choice.kind === 'discard_half_pick') {
    const ids = (choice.cards || []).map(c => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, Math.min(choice.count || 1, ids.length));
  }
  if (choice.kind === 'destroy_pick' || choice.kind === 'reaction_pick' || choice.kind === 'reveal_pick') {
    return pickIndexes(choice.cardCount || 0, choice.count || 1);
  }
  if (choice.kind === 'party_pick') {
    const list = choice.cards || [];
    return list[Math.floor(Math.random() * list.length)]?.id ?? null;
  }
  if (choice.kind === 'copy_target') {
    const list = choice.cards || [];
    return list[Math.floor(Math.random() * list.length)]?.id ?? null;
  }
  return 0;
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
    return { type: 'choice_response', choiceId: choice.id, value: defaultChoiceValue(choice) };
  }

  return { type: 'draw_card' };
}
