// Chỉ gửi cho mỗi người chơi ĐÚNG thông tin họ được phép thấy.
// KHÔNG BAO GIỜ gửi drawPile thô hay bài trên tay người khác.
export function sanitizeStateForPlayer(gameState, playerId) {
  const player = gameState.players.find(p => p.id === playerId);
  const winnerPlayer = gameState.winner
    ? gameState.players.find(p => p.id === gameState.winner)
    : null;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const lastAttack = gameState.lastAttack;

  return {
    roomCode: gameState.roomCode,
    status: gameState.status,
    deckTheme: gameState.deckTheme || 'default',
    myHand: player ? player.hand : [],
    opponents: gameState.players
      .filter(p => p.id !== playerId)
      .map(p => ({
        id: p.id,
        name: p.name,
        cardCount: p.hand ? p.hand.length : 0,
        isAlive: p.isAlive,
        isHost: p.isHost,
        isBot: !!p.isBot,
      })),
    drawPileCount: gameState.drawPile.length,
    drawPileTop:
      gameState.drawPile[0]?.type === 'imploding_kitten' && gameState.drawPile[0]?.faceUp
        ? {
            id: gameState.drawPile[0].id,
            type: gameState.drawPile[0].type,
            nameVN: gameState.drawPile[0].nameVN,
            emoji: gameState.drawPile[0].emoji,
            image: gameState.drawPile[0].image,
            lolImage: gameState.drawPile[0].lolImage,
            lolName: gameState.drawPile[0].lolName,
            lolSkinName: gameState.drawPile[0].lolSkinName,
            faceUp: true,
          }
        : null,
    discardPile: gameState.discardPile,
    currentPlayerId: currentPlayer?.id,
    turnsRemaining: gameState.turnsRemaining,
    isMyTurn: currentPlayer?.id === playerId,
    turnDirection: gameState.direction === -1 ? -1 : 1,
    fueledPlayerId: gameState.fueledPlayerId || null,
    // Ai đang bị ép đi nhiều lượt (Tấn Công) — chỉ công khai khi còn hiệu lực
    attackInfo: gameState.turnsRemaining > 1 && lastAttack
      ? { attackerId: lastAttack.attackerId, targetId: currentPlayer?.id || null, turns: gameState.turnsRemaining }
      : null,
    waitingFor: gameState.waitingFor,
    alterFutureOwner: gameState.alterFuture?.playerId || null,
    // Chỉ người đang sắp xếp mới thấy 3 lá này
    alterFutureCards:
      gameState.waitingFor === 'alter_future' && gameState.alterFuture?.playerId === playerId
        ? gameState.drawPile.slice(0, gameState.alterFuture.cardIds.length).map(c => ({
            id: c.id,
            type: c.type,
            nameVN: c.nameVN,
            emoji: c.emoji,
            lolImage: c.lolImage,
            lolName: c.lolName,
            lolSkinName: c.lolSkinName,
          }))
        : null,
    favorTarget: gameState.favorTarget,
    favorRequester: gameState.favorRequester,
    // Thông tin công khai của cửa sổ Phủ Nhận (popup hiển thị cho mọi người)
    pendingActionType: gameState.pendingAction?.type ?? null,
    pendingActionOwner: gameState.windowOwnerId ?? gameState.pendingAction?.playerId ?? null,
    pendingActionTarget:
      gameState.pendingAction?.targetPlayerId ??
      gameState.pendingAction?.payload?.targetPlayerId ??
      null,
    nopeCount: gameState.nopeCount,
    // Lựa chọn bí mật chỉ gửi cho người phải chọn.
    choice:
      gameState.pendingChoice && gameState.pendingChoice.playerId === playerId
        ? {
            id: gameState.pendingChoice.id,
            kind: gameState.pendingChoice.kind,
            sourceType: gameState.pendingChoice.sourceType,
            targetPlayerId: gameState.pendingChoice.targetPlayerId || null,
            targetName: gameState.pendingChoice.targetName || null,
            count: gameState.pendingChoice.count || 1,
            maxPosition: gameState.pendingChoice.maxPosition ?? null,
            cards: gameState.pendingChoice.cards || null,
            cardCount: gameState.pendingChoice.cardCount ?? null,
          }
        : null,
    choiceOwnerId: gameState.pendingChoice?.playerId || null,
    turnEndsAt: gameState.turnEndsAt || null,
    timers: gameState.timers || null,
    isHost: !!player?.isHost,
    isAlive: player?.isAlive !== false,
    myStats: player?.stats ? { ...player.stats } : null,
    winner: winnerPlayer ? { id: winnerPlayer.id, name: winnerPlayer.name } : null,
    gameLog: (gameState.gameLog || []).slice(-50),
    publicLog: (gameState.publicLog || []).slice(-50),
    myPrivateLog: (gameState.privateLog?.[playerId] || []).slice(-50),
  };
}

// Danh sách người chơi trong phòng chờ — KHÔNG kèm bài trên tay.
export function sanitizeLobbyPlayers(players) {
  return players.map(p => ({
    id: p.id,
    name: p.name,
    isHost: !!p.isHost,
    isBot: !!p.isBot,
  }));
}
