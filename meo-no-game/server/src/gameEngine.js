import { CARD_TYPES, BOOSTABLE_TYPES, getPetCombo } from '../../shared/cardTypes.js';
import { createDeck, shuffleDeck, dealCards } from './deckBuilder.js';
import * as cardEffects from './cardEffects.js';
import { advanceTurn, setChoice } from './cardEffects.js';
import { CUSTOM_PHASE3_EFFECTS, openPartyChoice } from './customPhase3Effects.js';

const NOPEABLE_TYPES = [
  CARD_TYPES.ATTACK,
  CARD_TYPES.SKIP,
  CARD_TYPES.FAVOR,
  CARD_TYPES.SHUFFLE,
  CARD_TYPES.SEE_THE_FUTURE,
  CARD_TYPES.REVERSE,
  CARD_TYPES.REVERSE_ALT,
  CARD_TYPES.STEAL_CARD,
  CARD_TYPES.SUPER_SKIP,
  CARD_TYPES.ALTER_FUTURE,
  CARD_TYPES.FUEL,
  CARD_TYPES.SUPER_DESTROY,
  CARD_TYPES.DAO_BOI,
  CARD_TYPES.TIM_KIEM,
  CARD_TYPES.CHIA_SE,
  CARD_TYPES.GIO_GIAI_LAO,
  CARD_TYPES.TAN_CONG_CHI_DINH,
  CARD_TYPES.BOC_DUOI_DAY,
  CARD_TYPES.VUONG_NIEM,
  CARD_TYPES.HUY_BAI,
  CARD_TYPES.TU_VA,
  CARD_TYPES.TAN_CONG_BAN_THAN,
  CARD_TYPES.THOI_MIEN,
  CARD_TYPES.LAM_PHIEN,
  CARD_TYPES.NHAN_BAN,
  CARD_TYPES.TO_SE_LAY_NO,
  CARD_TYPES.TIEC_TUNG,
  CARD_TYPES.HOI_SINH,
  CARD_TYPES.NAP_NHIEN_LIEU,
  CARD_TYPES.BOC_O_DAU_CUNG_DUOC,
  CARD_TYPES.TANG_CUONG,
  CARD_TYPES.TRA_DUA,
  CARD_TYPES.MOC_RAC,
  CARD_TYPES.SAO_CHEP,
  CARD_TYPES.NHIN_THAU_TUONG_LAI,
  CARD_TYPES.CHONG_XAO_BAI,
  CARD_TYPES.TIET_LO_TUONG_LAI,
];

const TARGET_REQUIRED_TYPES = new Set([
  CARD_TYPES.STEAL_CARD,
  CARD_TYPES.TAN_CONG_CHI_DINH,
  CARD_TYPES.CHIA_SE,
  CARD_TYPES.GIO_GIAI_LAO,
  CARD_TYPES.HUY_BAI,
  CARD_TYPES.THOI_MIEN,
  CARD_TYPES.LAM_PHIEN,
  CARD_TYPES.NHAN_BAN,
  CARD_TYPES.TO_SE_LAY_NO,
]);

const TARGET_NEEDS_HAND = new Set([
  CARD_TYPES.STEAL_CARD,
  CARD_TYPES.CHIA_SE,
  CARD_TYPES.GIO_GIAI_LAO,
  CARD_TYPES.HUY_BAI,
  CARD_TYPES.THOI_MIEN,
  CARD_TYPES.LAM_PHIEN,
  CARD_TYPES.NHAN_BAN,
  CARD_TYPES.TO_SE_LAY_NO,
]);

const NON_NOPEABLE_ACTION_TYPES = new Set([
  CARD_TYPES.SIEU_HUY_BAI,
]);



export class GameEngine {
  constructor(players) {
    this.players = players;
    this.gameState = null;
  }

  initGame(players) {
    this.players = players;
    const deck = createDeck(players.length);
    const shuffledDeck = shuffleDeck(deck);
    const { hands, drawPile } = dealCards(shuffledDeck, players.length);

    players.forEach((p, i) => {
      p.hand = hands[i] || [];
      p.isAlive = true;
      p.removed = false;
      p.stats = { cardsPlayed: 0, nopes: 0, eliminated: false };
    });

    this.gameState = {
      roomCode: null,
      status: 'playing',
      players,
      drawPile,
      discardPile: [],
      currentPlayerIndex: 0,
      turnsRemaining: 1,
      direction: 1,
      fueledPlayerId: null,
      alterFuture: null,
      waitingFor: null,
      pendingAction: null,
      nopeCount: 0,
      nopePassed: [],
      windowOwnerId: null,
      favorTarget: null,
      favorRequester: null,
      lastAttack: null,
      winner: null,
      turnEndsAt: null,
      gameLog: [],
      pendingChoice: null,
      pendingParty: null,
      napNhienLieuUsed: false,
    };
    return this.gameState;
  }

  addLog(message) {
    if (!this.gameState) return;
    this.gameState.gameLog.push(message);
    if (this.gameState.gameLog.length > 200) this.gameState.gameLog.shift();
  }

  validateMove(gameState, playerId) {
    if (!gameState || gameState.status !== 'playing') return false;
    const current = gameState.players[gameState.currentPlayerIndex];
    return !!current && current.id === playerId && current.isAlive;
  }

  isBusy(gameState) {
    return gameState.waitingFor !== null || !!gameState.pendingAction;
  }

  // ========== CHƠI BÀI ==========
  playCard(gameState, playerId, cardIds, payload = {}) {
    if (!this.validateMove(gameState, playerId)) {
      return { gameState, response: { error: 'Không phải lượt của bạn' } };
    }
    if (this.isBusy(gameState)) {
      return { gameState, response: { error: 'Đang chờ xử lý hành động khác — hãy hoàn tất trước' } };
    }
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return { gameState, response: { error: 'Người chơi không tồn tại' } };

    for (const id of cardIds) {
      if (!player.hand.some(c => c.id === id)) {
        return { gameState, response: { error: 'Bạn không có lá bài này trên tay' } };
      }
    }

    const cards = [];
    for (const id of cardIds) {
      const idx = player.hand.findIndex(c => c.id === id);
      cards.push(player.hand.splice(idx, 1)[0]);
    }
    const restore = () => cards.forEach(c => player.hand.push(c));

    if (cards.some(c => c.disabled)) {
      restore();
      return { gameState, response: { error: 'Lá bài này đang bị Làm Phiền — không thể dùng' } };
    }

    // ---- Tăng Cường: đánh kèm đúng 1 lá khác ----
    let boost = false;
    let boostBase = null;
    if (cardIds.length === 2) {
      const boostIndex = cards.findIndex(c => c.type === CARD_TYPES.TANG_CUONG);
      if (boostIndex !== -1) {
        boostBase = cards[1 - boostIndex];
        if (!BOOSTABLE_TYPES.includes(boostBase.type)) {
          restore();
          return { gameState, response: { error: 'Tăng Cường không thể đánh kèm lá này' } };
        }
        boost = true;
      }
    }

    if (boost) {
      const t = boostBase.type;
      if (t === CARD_TYPES.FAVOR) {
        const target = gameState.players.find(p => p.id === payload.targetPlayerId);
        if (!target || !target.isAlive || target.id === playerId || target.hand.length === 0) {
          restore();
          return { gameState, response: { error: 'Cần chọn người để Xin Bài' } };
        }
      }
      if (TARGET_REQUIRED_TYPES.has(t)) {
        const target = gameState.players.find(p => p.id === payload.targetPlayerId);
        const needsHand = TARGET_NEEDS_HAND.has(t);
        if (!target || !target.isAlive || target.id === playerId || (needsHand && target.hand.length === 0)) {
          restore();
          return { gameState, response: { error: 'Cần chọn đối thủ hợp lệ' } };
        }
      }
      if (t === CARD_TYPES.SUPER_DESTROY) {
        const target = gameState.players.find(p => p.id === payload.targetPlayerId);
        if (!target || !target.isAlive || target.id === playerId || target.hand.length === 0) {
          restore();
          return { gameState, response: { error: 'Cần chọn đối thủ để Siêu Hủy Bài' } };
        }
        if (!payload.requestedCardType) {
          restore();
          return { gameState, response: { error: 'Chưa chọn loại bài muốn hủy' } };
        }
      }
      if (t === CARD_TYPES.FUEL && gameState.fueledPlayerId === playerId) {
        restore();
        return { gameState, response: { error: 'Bạn đã nạp nhiên liệu rồi' } };
      }
      if (t === CARD_TYPES.ALTER_FUTURE && gameState.drawPile.length === 0) {
        restore();
        return { gameState, response: { error: 'Chồng bài rút đang trống' } };
      }
    }

    // ---- kiểm tra combo mèo/thú (2 / 3 / 5 lá, không trộn loại) ----
    const types = cards.map(c => c.type);
    const petCombo = !boost && cardIds.length > 1 ? getPetCombo(types) : null;
    let comboSize = petCombo?.size || 0;
    if (!boost && cardIds.length > 1) {
      if (comboSize === 0) {
        restore();
        return { gameState, response: { error: 'Kết hợp lá bài không hợp lệ' } };
      }
      if (comboSize === 2 || comboSize === 3) {
        const target = gameState.players.find(p => p.id === payload.targetPlayerId);
        if (!target || !target.isAlive || target.id === playerId) {
          restore();
          return { gameState, response: { error: 'Cần chọn đối thủ hợp lệ' } };
        }
        if (target.hand.length === 0) {
          restore();
          return { gameState, response: { error: 'Đối thủ không còn lá bài nào' } };
        }
      }
      if (comboSize === 3 && !payload.requestedCardType) {
        restore();
        return { gameState, response: { error: 'Chưa chọn loại bài muốn đòi' } };
      }
      if (comboSize === 5) {
        if (gameState.discardPile.length === 0) {
          restore();
          return { gameState, response: { error: 'Chồng bài hạ đang trống' } };
        }
        if (payload.discardPickId && !gameState.discardPile.some(c => c.id === payload.discardPickId)) {
          restore();
          return { gameState, response: { error: 'Lá chọn không có trong chồng bài hạ' } };
        }
      }
    } else if (!boost) {
      // ---- lá đơn ----
      const t = cards[0].type;
      if (t === CARD_TYPES.DEFUSE) {
        restore();
        return { gameState, response: { error: 'Không thể chủ động chơi Gỡ Bom' } };
      }
      if (t === CARD_TYPES.EXPLODING_KITTEN || t === CARD_TYPES.IMPLODING_KITTEN) {
        restore();
        return { gameState, response: { error: 'Không thể chơi bom từ tay' } };
      }
      if (t === CARD_TYPES.NOPE) {
        restore();
        return { gameState, response: { error: 'Lá Phủ Nhận chỉ dùng được khi có cửa sổ Phủ Nhận' } };
      }
      if (t === CARD_TYPES.VUONG_NIEM) {
        restore();
        return { gameState, response: { error: 'Vương Niệm chỉ cần giữ trên tay để bảo vệ' } };
      }
      if (t === CARD_TYPES.CHONG_XAO_BAI) {
        restore();
        return { gameState, response: { error: 'Chống Xào Bài chỉ dùng khi có cửa sổ Nope' } };
      }
      if (t === CARD_TYPES.TANG_CUONG) {
        restore();
        return { gameState, response: { error: 'Tăng Cường phải đánh chung với đúng 1 lá khác' } };
      }
      if (t === CARD_TYPES.TRA_DUA || t === CARD_TYPES.MOC_RAC) {
        restore();
        return { gameState, response: { error: 'Lá này chỉ dùng khi bạn vừa bị cướp bài' } };
      }
      if (t === CARD_TYPES.FAVOR) {
        const target = gameState.players.find(p => p.id === payload.targetPlayerId);
        if (!target || !target.isAlive || target.id === playerId) {
          restore();
          return { gameState, response: { error: 'Cần chọn người để Xin Bài' } };
        }
        if (target.hand.length === 0) {
          restore();
          return { gameState, response: { error: 'Người đó không còn lá bài nào' } };
        }
      }
      if (TARGET_REQUIRED_TYPES.has(t)) {
        const target = gameState.players.find(p => p.id === payload.targetPlayerId);
        const needsHand = TARGET_NEEDS_HAND.has(t);
        if (!target || !target.isAlive || target.id === playerId || (needsHand && target.hand.length === 0)) {
          restore();
          return { gameState, response: { error: 'Cần chọn đối thủ hợp lệ' } };
        }
      }
      if (t === CARD_TYPES.SUPER_DESTROY) {
        const target = gameState.players.find(p => p.id === payload.targetPlayerId);
        if (!target || !target.isAlive || target.id === playerId) {
          restore();
          return { gameState, response: { error: 'Cần chọn đối thủ để Siêu Hủy Bài' } };
        }
        if (target.hand.length === 0) {
          restore();
          return { gameState, response: { error: 'Đối thủ không còn lá bài nào' } };
        }
        if (!payload.requestedCardType) {
          restore();
          return { gameState, response: { error: 'Chưa chọn loại bài muốn hủy' } };
        }
      }
      if (t === CARD_TYPES.FUEL && gameState.fueledPlayerId === playerId) {
        restore();
        return { gameState, response: { error: 'Bạn đã nạp nhiên liệu rồi — hãy dùng Tấn Công trước' } };
      }
      if (t === CARD_TYPES.NAP_NHIEN_LIEU && gameState.napNhienLieuUsed) {
        restore();
        return { gameState, response: { error: 'Nạp Nhiên Liệu chỉ được dùng 1 lần mỗi ván' } };
      }
      if (t === CARD_TYPES.ALTER_FUTURE && gameState.drawPile.length === 0) {
        restore();
        return { gameState, response: { error: 'Chồng bài rút đang trống' } };
      }
      if (
        [CARD_TYPES.DAO_BOI, CARD_TYPES.TIM_KIEM, CARD_TYPES.BOC_O_DAU_CUNG_DUOC].includes(t) &&
        gameState.drawPile.length === 0
      ) {
        restore();
        return { gameState, response: { error: 'Chồng bài rút đang trống' } };
      }
      if (
        t === CARD_TYPES.HOI_SINH &&
        !gameState.players.some(p => !p.isAlive && p.hand?.length > 0)
      ) {
        restore();
        return { gameState, response: { error: 'Không có người chơi bị loại nào còn bài' } };
      }
      if (t === CARD_TYPES.SAO_CHEP) {
        const previous = cardEffects.previousAlivePlayer(gameState);
        if (!previous?.lastAction || previous.lastAction.type === CARD_TYPES.SAO_CHEP) {
          restore();
          return { gameState, response: { error: 'Chưa có lá bài nào để Sao Chép' } };
        }
      }
    }

    cards.forEach(c => gameState.discardPile.push(c));
    if (player.stats) player.stats.cardsPlayed += cards.length;
    this.addLog(`🎴 ${player.name} đã chơi ${cards.map(c => c.nameVN || c.type).join(' + ')}`);

    const actionCard = boost ? boostBase : cards[0];
    const actionType = comboSize > 0 ? 'cat_combo' : actionCard.type;
    const isNopeable = comboSize > 0 || NOPEABLE_TYPES.includes(actionCard.type);
    const boostCard = boost ? cards.find(c => c.type === CARD_TYPES.TANG_CUONG) : null;

    if (!isNopeable && NON_NOPEABLE_ACTION_TYPES.has(actionCard.type)) {
      gameState.pendingAction = {
        type: actionType,
        playerId,
        cardIds: [...cardIds],
        payload: { ...payload },
        ...(boost ? { boost: true, boostCardId: boostCard?.id } : {}),
      };
      return this.executePendingAction(gameState);
    }

    if (isNopeable) {
      gameState.pendingAction = {
        type: actionType,
        comboSize,
        playerId,
        cardIds: [...cardIds],
        payload: { ...payload },
        ...(boost ? { boost: true, boostCardId: boostCard?.id } : {}),
      };
      // Mục tiêu công khai để UI hiện đúng người sắp bị đánh
      if (actionCard.type === CARD_TYPES.ATTACK) {
        gameState.pendingAction.targetPlayerId = cardEffects.nextAlivePlayer(gameState)?.id || null;
      } else if (payload.targetPlayerId) {
        gameState.pendingAction.targetPlayerId = payload.targetPlayerId;
      }
      gameState.waitingFor = 'nope';
      gameState.nopeCount = 0;
      gameState.nopePassed = [];
      gameState.windowOwnerId = playerId;

      return {
        gameState,
        response: {
          type: 'nope_window',
          playerId,
          action: gameState.pendingAction.type,
          comboSize,
          boosted: boost,
          cardIds: [...cardIds],
        },
      };
    }

    // lá mèo đơn lẻ — không hiệu ứng, chỉ hạ bài
    return {
      gameState,
      response: {
        type: 'card_played',
        playerId,
        cardIds: [...cardIds],
        cardType: actionCard.type,
      },
    };
  }

  // ========== RÚT BÀI ==========
  drawCard(gameState, playerId) {
    if (!this.validateMove(gameState, playerId)) {
      return { gameState, response: { error: 'Không phải lượt của bạn' } };
    }
    if (this.isBusy(gameState)) {
      return { gameState, response: { error: 'Đang chờ xử lý hành động khác — hãy hoàn tất trước' } };
    }
    const player = gameState.players.find(p => p.id === playerId);

    // cứu cánh: chồng rút hết thì xáo lại bài từ chồng hạ
    if (gameState.drawPile.length === 0) {
      const recyclable = gameState.discardPile.filter(c => c.type !== CARD_TYPES.EXPLODING_KITTEN);
      if (recyclable.length > 0) {
        gameState.discardPile = gameState.discardPile.filter(c => c.type === CARD_TYPES.EXPLODING_KITTEN);
        gameState.drawPile = shuffleDeck(recyclable);
        this.addLog('♻️ Chồng bài rút đã hết — xáo lại bài cũ từ chồng hạ!');
      } else {
        return { gameState, response: { error: 'Chồng bài rút đã hết!' } };
      }
    }

    const drawnCard = gameState.drawPile.shift();

    if (drawnCard.type === CARD_TYPES.BOOM_ATOMIC) {
      const kittens = [
        ...gameState.drawPile.filter(c => c.type === CARD_TYPES.EXPLODING_KITTEN),
        ...gameState.discardPile.filter(c => c.type === CARD_TYPES.EXPLODING_KITTEN),
      ];
      gameState.drawPile = [
        ...kittens,
        ...shuffleDeck(gameState.drawPile.filter(c => c.type !== CARD_TYPES.EXPLODING_KITTEN)),
      ];
      gameState.discardPile = gameState.discardPile.filter(
        c => c.type !== CARD_TYPES.EXPLODING_KITTEN
      );
      this.addLog(
        `☢️ ${player.name} bốc Boom Nguyên Tử — tất cả Exploding Kitten lên đầu chồng bài!`
      );
      // Boom Nguyên Tử bị hủy, không vào tay/chồng bài; kết thúc lượt ngay.
      gameState.turnsRemaining = 0;
      advanceTurn(gameState, 1);
      return {
        gameState,
        response: { type: 'boom_atomic', playerId, playerName: player.name },
      };
    }

    if (drawnCard.type === CARD_TYPES.IMPLODING_KITTEN && !drawnCard.faceUp) {
      drawnCard.faceUp = true;
      gameState.waitingFor = 'imploding_place';
      gameState.pendingAction = { type: 'imploding', playerId, card: drawnCard };
      this.addLog(`💣 ${player.name} đã lật ngửa Imploding Kitten và phải chọn vị trí đặt lại.`);
      return {
        gameState,
        response: {
          type: 'imploding_flipped',
          playerId,
          playerName: player.name,
          card: { id: drawnCard.id, type: drawnCard.type, nameVN: drawnCard.nameVN, emoji: drawnCard.emoji, image: drawnCard.image, lolImage: drawnCard.lolImage, lolName: drawnCard.lolName, faceUp: true },
        },
      };
    }

    if (drawnCard.type === CARD_TYPES.IMPLODING_KITTEN) {
      player.isAlive = false;
      if (player.stats) player.stats.eliminated = true;
      gameState.discardPile.push(drawnCard);
      this.addLog(`💥 ${player.name} bốc phải Imploding Kitten mặt ngửa và bị loại!`);
      const winner = this.checkWin(gameState);
      if (winner) {
        gameState.status = 'finished';
        gameState.winner = winner.id;
        gameState.waitingFor = null;
        gameState.pendingAction = null;
        return {
          gameState,
          response: {
            type: 'exploded',
            playerId,
            playerName: player.name,
            gameOver: true,
            winner: { id: winner.id, name: winner.name },
          },
        };
      }
      gameState.turnsRemaining = 1;
      advanceTurn(gameState, 1);
      return {
        gameState,
        response: { type: 'exploded', playerId, playerName: player.name, gameOver: false },
      };
    }

    if (drawnCard.type === CARD_TYPES.EXPLODING_KITTEN) {
      const defuseIndex = player.hand.findIndex(
        c => c.type === CARD_TYPES.DEFUSE && !c.disabled
      );
      if (defuseIndex === -1) {
        // 💥 NỔ
        player.isAlive = false;
        if (player.stats) player.stats.eliminated = true;
        // Lá Exploding Kitten bị loại khỏi ván, không vào chồng bài hạ.
        this.addLog(`💥 ${player.name} đã nổ tung và bị loại!`);
        const winner = this.checkWin(gameState);
        if (winner) {
          gameState.status = 'finished';
          gameState.winner = winner.id;
          gameState.waitingFor = null;
          gameState.pendingAction = null;
          return {
            gameState,
            response: {
              type: 'exploded',
              playerId,
              playerName: player.name,
              gameOver: true,
              winner: { id: winner.id, name: winner.name },
            },
          };
        }
        gameState.turnsRemaining = 1;
        advanceTurn(gameState, 1);
        return { gameState, response: { type: 'exploded', playerId, playerName: player.name, gameOver: false } };
      }
      // có Gỡ Bom → chờ chọn vị trí
      gameState.waitingFor = 'defuse_place';
      gameState.pendingAction = { type: 'defuse', playerId, card: drawnCard };
      return { gameState, response: { type: 'exploding_kitten_defuse', playerId, playerName: player.name } };
    }

    const stealerId = player.pendingStealBy;
    let reactionStealer = null;
    if (stealerId) {
      player.pendingStealBy = null;
      const stealer = gameState.players.find(p => p.id === stealerId && p.isAlive);
      if (stealer && cardEffects.takeVuongNiem(gameState, player)) {
        player.hand.push(drawnCard);
        this.addLog(`👑 ${player.name} đã dùng Vương Niệm để chặn lá bị cướp.`);
      } else if (stealer) {
        stealer.hand.push(drawnCard);
        reactionStealer = stealer;
        this.addLog(`🐻 ${stealer.name} đã cướp lá ${player.name} vừa rút.`);
      } else {
        player.hand.push(drawnCard);
      }
    } else {
      player.hand.push(drawnCard);
    }
    this.addLog(`🃏 ${player.name} đã rút 1 lá.`);
    gameState.turnsRemaining -= 1;
    if (gameState.turnsRemaining <= 0) {
      advanceTurn(gameState, 1);
    }
    if (reactionStealer) {
      cardEffects.offerReaction(gameState, player, reactionStealer);
    }
    return { gameState, response: { type: 'drew_card', playerId } };
  }

  // ========== ĐẶT MÈO NỔ (sau Gỡ Bom) ==========
  placeExplodingKitten(gameState, playerId, position) {
    const pa = gameState.pendingAction;
    if (!pa || pa.type !== 'defuse' || pa.playerId !== playerId) {
      return { gameState, response: { error: 'Không có Mèo Nổ nào đang chờ gỡ' } };
    }
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return { gameState, response: { error: 'Người chơi không tồn tại' } };

    const defuseIdx = player.hand.findIndex(
      c => c.type === CARD_TYPES.DEFUSE && !c.disabled
    );
    if (defuseIdx === -1) return { gameState, response: { error: 'Bạn không có lá Gỡ Bom nào' } };
    const ekCard = pa.card;
    if (!ekCard) return { gameState, response: { error: 'Lỗi trạng thái — thiếu lá Mèo Nổ' } };

    const [defuseCard] = player.hand.splice(defuseIdx, 1);
    gameState.discardPile.push(defuseCard);

    let pos = Number(position);
    if (!Number.isFinite(pos)) pos = 0;
    pos = Math.floor(Math.max(0, Math.min(pos, gameState.drawPile.length)));
    gameState.drawPile.splice(pos, 0, ekCard);
    this.addLog(`🔧 ${player.name} đã Gỡ Bom và nhét Mèo Nổ vào vị trí ${pos + 1}.`);

    gameState.waitingFor = null;
    gameState.pendingAction = null;

    // lá Mèo Nổ vẫn tính là lượt rút của người chơi
    gameState.turnsRemaining -= 1;
    if (gameState.turnsRemaining <= 0) {
      advanceTurn(gameState, 1);
    }
    return { gameState, response: { type: 'defuse_placed', playerId } };
  }

  // ========== ĐẶT IMPLODING KITTEN SAU KHI LẬT NGỬA ==========
  placeImplodingKitten(gameState, playerId, position) {
    const pa = gameState.pendingAction;
    if (!pa || pa.type !== 'imploding' || pa.playerId !== playerId) {
      return { gameState, response: { error: 'Không có Imploding Kitten nào đang chờ đặt' } };
    }
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return { gameState, response: { error: 'Người chơi không tồn tại' } };
    const card = pa.card;
    if (!card) return { gameState, response: { error: 'Lỗi trạng thái — thiếu lá Imploding Kitten' } };

    let pos = Number(position);
    if (!Number.isFinite(pos)) pos = 0;
    pos = Math.floor(Math.max(0, Math.min(pos, gameState.drawPile.length)));
    gameState.drawPile.splice(pos, 0, card);

    gameState.waitingFor = null;
    gameState.pendingAction = null;
    this.addLog(`💣 ${player.name} đã đặt Imploding Kitten ngửa vào vị trí ${pos + 1}.`);

    gameState.turnsRemaining -= 1;
    if (gameState.turnsRemaining <= 0) advanceTurn(gameState, 1);
    return { gameState, response: { type: 'imploding_placed', playerId } };
  }

  // ========== CỬA SỔ PHỦ NHẬN ==========
  handleNope(gameState, playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) return { gameState, response: { error: 'Người chơi không hợp lệ' } };
    if (gameState.waitingFor !== 'nope' || !gameState.pendingAction) {
      return { gameState, response: { error: 'Hiện không có hành động nào để Phủ Nhận' } };
    }
    const nopeIdx = player.hand.findIndex(
      c =>
        !c.disabled &&
        (c.type === CARD_TYPES.NOPE ||
          (c.type === CARD_TYPES.CHONG_XAO_BAI && gameState.pendingAction?.type === CARD_TYPES.SHUFFLE))
    );
    if (nopeIdx === -1) return { gameState, response: { error: 'Bạn không có lá Phủ Nhận' } };

    const [nopeCard] = player.hand.splice(nopeIdx, 1);
    gameState.discardPile.push(nopeCard);
    if (player.stats) player.stats.nopes += 1;
    gameState.nopeCount += 1;
    gameState.nopePassed = [];
    gameState.windowOwnerId = playerId;

    this.addLog(`🚫 ${player.name} đã Phủ Nhận!`);

    if (gameState.nopeCount % 2 === 0) {
      // chẵn → hành động gốc được thi hành
      return this.resolveNope(gameState);
    }
    // lẻ → hành động đang bị chặn, mở cửa sổ mới cho chuỗi Phủ Nhận
    return {
      gameState,
      response: {
        type: 'nope_window',
        playerId,
        action: gameState.pendingAction.type,
        nopeCount: gameState.nopeCount,
      },
    };
  }

  handleNopePass(gameState, playerId) {
    if (gameState.waitingFor !== 'nope' || !gameState.pendingAction) {
      return { gameState, response: { error: 'Hiện không có cửa sổ Phủ Nhận' } };
    }
    const player = gameState.players.find(p => p.id === playerId);
    if (!player || !player.isAlive) return { gameState, response: { error: 'Người chơi không hợp lệ' } };

    if (!gameState.nopePassed.includes(playerId)) gameState.nopePassed.push(playerId);

    const eligible = gameState.players
      .filter(p => p.isAlive && p.id !== gameState.windowOwnerId)
      .map(p => p.id);
    const allPassed = eligible.length === 0 || eligible.every(id => gameState.nopePassed.includes(id));

    if (allPassed) {
      return this.resolveNope(gameState);
    }
    return { gameState, response: { type: 'nope_wait', playerId } };
  }

  // Kết thúc cửa sổ Phủ Nhận: lẻ → hủy hành động, chẵn → thi hành
  resolveNope(gameState) {
    if (!gameState.pendingAction) {
      return { gameState, response: { type: 'noop' } };
    }
    if (gameState.nopeCount % 2 === 1) {
      return this.cancelPendingAction(gameState);
    }
    return this.executePendingAction(gameState);
  }

  executePendingAction(gameState) {
    const pa = gameState.pendingAction;
    gameState.waitingFor = null;
    gameState.pendingAction = null;
    gameState.nopeCount = 0;
    gameState.nopePassed = [];
    gameState.windowOwnerId = null;
    if (!pa) return { gameState, response: { error: 'Không có hành động nào đang chờ' } };

    // Tăng Cường: chạy hiệu ứng gốc 2 lần nếu lượt chưa bị đổi.
    if (pa.boost) {
      const basePa = {
        ...pa,
        boost: false,
        payload: { ...(pa.payload || {}), boostMultiplier: 2 },
        cardIds: (pa.cardIds || []).filter(id => id !== pa.boostCardId),
      };
      if (BOOSTABLE_TYPES.includes(basePa.type)) {
        return this.runAction(gameState, basePa);
      }
      const beforeIndex = gameState.currentPlayerIndex;
      const first = this.runAction(gameState, basePa);
      if (
        first.response?.error ||
        gameState.status !== 'playing' ||
        gameState.waitingFor ||
        gameState.pendingAction ||
        gameState.currentPlayerIndex !== beforeIndex
      ) {
        return first;
      }
      const second = this.runAction(gameState, basePa);
      if (second.response?.error) return first;
      return {
        gameState,
        response: {
          ...second.response,
          boosted: true,
          boostType: basePa.type,
        },
      };
    }

    return this.runAction(gameState, pa);
  }

  runAction(gameState, pa) {
    const actor = gameState.players.find(p => p.id === pa.playerId);
    if (actor) {
      actor.lastAction = {
        type: pa.type,
        payload: { ...(pa.payload || {}) },
        cardType: pa.cardType || pa.type,
      };
    }

    switch (pa.type) {
      case 'cat_combo':
        return cardEffects.handleCatCombo(gameState, pa.playerId, pa.cardIds, pa.payload);
      case CARD_TYPES.ATTACK:
        return cardEffects.handleAttack(gameState, pa.playerId, pa.payload || {});
      case CARD_TYPES.SKIP:
        return cardEffects.handleSkip(gameState, pa.playerId);
      case CARD_TYPES.SHUFFLE:
        return cardEffects.handleShuffle(gameState, pa.playerId);
      case CARD_TYPES.SEE_THE_FUTURE:
        return cardEffects.handleSeeTheFuture(gameState, pa.playerId);
      case CARD_TYPES.FAVOR:
        return cardEffects.handleFavor(gameState, pa.playerId, pa.payload?.targetPlayerId);
      case CARD_TYPES.REVERSE:
      case CARD_TYPES.REVERSE_ALT:
        return cardEffects.handleReverse(gameState, pa.playerId);
      case CARD_TYPES.STEAL_CARD:
        return cardEffects.handleStealCard(gameState, pa.playerId, pa.payload?.targetPlayerId);
      case CARD_TYPES.BOOM_ATOMIC:
        return cardEffects.handleBoomAtomic(gameState, pa.playerId);
      case CARD_TYPES.SUPER_SKIP:
        return cardEffects.handleSuperSkip(gameState, pa.playerId);
      case CARD_TYPES.ALTER_FUTURE:
        return cardEffects.handleAlterFuture(gameState, pa.playerId);
      case CARD_TYPES.FUEL:
        return cardEffects.handleFuel(gameState, pa.playerId);
      case CARD_TYPES.SUPER_DESTROY:
        return cardEffects.handleSuperDestroy(
          gameState,
          pa.playerId,
          pa.payload?.targetPlayerId,
          pa.payload?.requestedCardType
        );
      case CARD_TYPES.SAO_CHEP: {
        const previous = cardEffects.previousAlivePlayer(gameState);
        const last = previous?.lastAction;
        if (!last || last.type === CARD_TYPES.SAO_CHEP || last.type === 'cat_combo') {
          return { gameState, response: { error: 'Chưa có lá bài nào để Sao Chép' } };
        }
        const payload = { ...(last.payload || {}) };
        const needsTarget =
          TARGET_REQUIRED_TYPES.has(last.type) ||
          last.type === CARD_TYPES.FAVOR ||
          last.type === CARD_TYPES.SUPER_DESTROY;
        if (needsTarget) {
          const needsHand =
            TARGET_NEEDS_HAND.has(last.type) ||
            last.type === CARD_TYPES.FAVOR ||
            last.type === CARD_TYPES.SUPER_DESTROY;
          const candidates = gameState.players.filter(
            p => p.isAlive && p.id !== pa.playerId && (!needsHand || p.hand.length > 0)
          );
          const currentTarget = candidates.find(p => p.id === payload.targetPlayerId);
          if (!currentTarget) {
            if (candidates.length === 0) {
              return { gameState, response: { error: 'Không có mục tiêu hợp lệ để Sao Chép' } };
            }
            setChoice(gameState, {
              playerId: pa.playerId,
              kind: 'copy_target',
              sourceType: CARD_TYPES.SAO_CHEP,
              count: 1,
              cards: candidates.map(p => ({ id: p.id, name: p.name })),
              copyAction: { type: last.type, payload: { ...payload } },
            });
            gameState.gameLog.push(`🐊 ${actor?.name || 'Người chơi'} đang chọn mục tiêu để Sao Chép ${last.type}.`);
            return { gameState, response: { type: 'choice_request', playerId: pa.playerId } };
          }
          payload.targetPlayerId = currentTarget.id;
        }
        gameState.gameLog.push(`🐊 Người chơi đã Sao Chép hiệu ứng ${last.type}.`);
        return this.runAction(gameState, {
          type: last.type,
          playerId: pa.playerId,
          cardIds: [],
          payload,
          copying: true,
        });
      }
      default: {
        const custom = CUSTOM_PHASE3_EFFECTS[pa.type];
        if (custom) return custom(gameState, pa.playerId, pa.payload);
        return { gameState, response: { type: 'card_played', playerId: pa.playerId, cardIds: pa.cardIds } };
      }
    }
  }

  cancelPendingAction(gameState) {
    const pa = gameState.pendingAction;
    gameState.waitingFor = null;
    gameState.pendingAction = null;
    gameState.nopeCount = 0;
    gameState.nopePassed = [];
    gameState.windowOwnerId = null;
    if (!pa) return { gameState, response: { error: 'Không có hành động nào đang chờ' } };

    const player = gameState.players.find(p => p.id === pa.playerId);
    if (player) {
      // Lá đã đánh và bị Nope vẫn nằm trong chồng bài hạ (mất khỏi tay).
      this.addLog(`🚫 Hành động của ${player.name} đã bị Phủ Nhận hoàn toàn!`);
    }
    return { gameState, response: { type: 'action_cancelled', playerId: pa.playerId, cardIds: pa.cardIds } };
  }

  // ========== LỰA CHỌN BÍ MẬT (Đào Bới / Tìm Kiếm / Làm Phiền / Hồi Sinh) ==========
  handleChoiceResponse(gameState, playerId, choiceId, value) {
    const choice = gameState.pendingChoice;
    if (!choice || choice.playerId !== playerId || (choiceId && choice.id !== choiceId)) {
      return { gameState, response: { error: 'Lựa chọn không hợp lệ hoặc đã hết hạn' } };
    }
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return { gameState, response: { error: 'Người chơi không tồn tại' } };

    const fail = message => ({ gameState, response: { error: message } });

    if (choice.kind === 'position_dao_boi') {
      const top = gameState.drawPile.shift();
      if (!top) return fail('Chồng bài rút đang trống');
      const pos = Math.max(0, Math.min(Number(value) || 0, gameState.drawPile.length));
      gameState.drawPile.splice(pos, 0, top);
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      gameState.gameLog.push(`🔎 ${player.name} đã đặt lại lá trên cùng ở vị trí ${pos + 1}.`);
      return { gameState, response: { type: 'choice_resolved', playerId } };
    }

    if (choice.kind === 'position_draw') {
      const index = Number(value);
      if (!Number.isInteger(index) || index < 0 || index >= gameState.drawPile.length) {
        return fail('Vị trí bốc không hợp lệ');
      }
      const [card] = gameState.drawPile.splice(index, 1);
      gameState.drawPile.unshift(card);
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      return this.drawCard(gameState, playerId);
    }

    if (choice.kind === 'search_top5') {
      const chosen = (choice.cards || []).find(c => c.id === value);
      if (!chosen) return fail('Lá bài không nằm trong 5 lá đã xem');
      const rest = choice.cards.filter(c => c.id !== value);
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      gameState.drawPile = shuffleDeck([...gameState.drawPile, ...rest]);
      if (['exploding_kitten', 'imploding_kitten', 'boom_atomic'].includes(chosen.type)) {
        gameState.drawPile.unshift(chosen);
        return this.drawCard(gameState, playerId);
      }
      player.hand.push(chosen);
      gameState.gameLog.push(`🔎 ${player.name} đã chọn ${chosen.nameVN} từ 5 lá trên cùng.`);
      return { gameState, response: { type: 'choice_resolved', playerId } };
    }

    if (choice.kind === 'disable_card') {
      const target = gameState.players.find(p => p.id === choice.targetPlayerId);
      const index = Number(value);
      if (!target || !Number.isInteger(index) || index < 0 || index >= target.hand.length) {
        return fail('Lá bài muốn vô hiệu hóa không hợp lệ');
      }
      const card = target.hand[index];
      card.disabled = true;
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      gameState.gameLog.push(`🐱 ${player.name} đã vô hiệu hóa 1 lá của ${target.name} trong lượt tới.`);
      return { gameState, response: { type: 'choice_resolved', playerId } };
    }

    if (choice.kind === 'revive_cards') {
      const ids = Array.isArray(value) ? [...new Set(value.map(String))] : [String(value)];
      const wanted = ids.slice(0, choice.count || 2);
      if (wanted.length !== (choice.count || 2)) return fail(`Phải chọn đủ ${choice.count || 2} lá`);
      for (const id of wanted) {
        if (!(choice.cards || []).some(c => c.id === id)) return fail('Lá hồi sinh không hợp lệ');
      }
      const picked = [];
      for (const id of wanted) {
        const owner = gameState.players.find(p => p.hand?.some(c => c.id === id));
        const idx = owner?.hand.findIndex(c => c.id === id) ?? -1;
        if (!owner || idx === -1) return fail('Lá hồi sinh không còn tồn tại');
        picked.push({ owner, idx, card: owner.hand[idx] });
      }
      for (const item of picked) {
        const freshIndex = item.owner.hand.findIndex(c => c.id === item.card.id);
        if (freshIndex !== -1) item.owner.hand.splice(freshIndex, 1);
        delete item.card.disabled;
        player.hand.push(item.card);
      }
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      gameState.gameLog.push(`🌱 ${player.name} đã hồi sinh ${picked.length} lá từ người đã loại.`);
      return { gameState, response: { type: 'choice_resolved', playerId } };
    }

    if (choice.kind === 'discard_half_pick') {
      const needed = choice.count || 1;
      const ids = Array.isArray(value) ? [...new Set(value.map(String))] : [];
      if (ids.length !== needed) return fail(`Phải chọn đủ ${needed} lá`);
      const indexes = [];
      for (const id of ids) {
        const idx = player.hand.findIndex(c => c.id === id);
        if (idx === -1) return fail('Lá bài không có trên tay');
        indexes.push(idx);
      }
      indexes.sort((a, b) => b - a).forEach(idx => {
        gameState.discardPile.push(player.hand.splice(idx, 1)[0]);
      });
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      gameState.gameLog.push(`🍕 ${player.name} đã tự hủy ${ids.length} lá.`);
      return { gameState, response: { type: 'choice_resolved', playerId } };
    }

    if (choice.kind === 'party_pick') {
      const id = String(Array.isArray(value) ? value[0] : value);
      const idx = player.hand.findIndex(c => c.id === id);
      if (idx === -1) return fail('Lá bài không có trên tay');
      const [card] = player.hand.splice(idx, 1);
      gameState.drawPile.unshift(card);
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      if (gameState.pendingParty) gameState.pendingParty.index += 1;
      gameState.gameLog.push(`🎂 ${player.name} đã úp 1 lá lên đầu chồng bài.`);
      return openPartyChoice(gameState);
    }

    if (choice.kind === 'reveal_pick') {
      const target = gameState.players.find(p => p.id === choice.targetPlayerId);
      if (!target) return fail('Người chơi mục tiêu không tồn tại');
      const needed = choice.count || 1;
      const raw = Array.isArray(value) ? value : [value];
      const indexes = raw.map(Number);
      if (
        indexes.length !== needed ||
        new Set(indexes).size !== indexes.length ||
        indexes.some(i => !Number.isInteger(i) || i < 0 || i >= target.hand.length)
      ) {
        return fail(`Phải chọn đủ ${needed} lá úp hợp lệ`);
      }
      const cards = indexes.map(i => target.hand[i]).map(cardEffects.cardView);
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      gameState.gameLog.push(`👁️ ${player.name} đã xem ${needed} lá úp của ${target.name}.`);
      return {
        gameState,
        response: {
          type: 'see_the_future',
          forPlayer: playerId,
          sourceType: CARD_TYPES.GIO_GIAI_LAO,
          cards,
        },
      };
    }

    if (choice.kind === 'destroy_pick' || choice.kind === 'reaction_pick') {
      const target = gameState.players.find(p => p.id === choice.targetPlayerId);
      if (!target) return fail('Người chơi mục tiêu không tồn tại');
      const needed = choice.count || 1;
      const raw = Array.isArray(value) ? value : [value];
      const indexes = raw.map(Number);
      if (
        indexes.length !== needed ||
        new Set(indexes).size !== indexes.length ||
        indexes.some(i => !Number.isInteger(i) || i < 0 || i >= target.hand.length)
      ) {
        return fail(`Phải chọn đủ ${needed} lá úp hợp lệ`);
      }
      indexes.sort((a, b) => b - a);
      if (choice.kind === 'destroy_pick') {
        indexes.forEach(idx => gameState.discardPile.push(target.hand.splice(idx, 1)[0]));
      } else {
        indexes.forEach(idx => player.hand.push(target.hand.splice(idx, 1)[0]));
      }
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      const verb = choice.kind === 'destroy_pick' ? 'hủy' : 'cướp lại';
      gameState.gameLog.push(`🛡️ ${player.name} đã ${verb} ${needed} lá úp từ ${target.name}.`);
      return {
        gameState,
        response:
          choice.kind === 'destroy_pick'
            ? { type: 'choice_resolved', playerId }
            : { type: 'reaction_steal', playerId, targetPlayerId: target.id, stolen: needed },
      };
    }

    if (choice.kind === 'copy_target') {
      const targetId = String(value);
      const allowed = (choice.cards || []).some(c => c.id === targetId);
      const copy = choice.copyAction;
      if (!allowed || !copy) return fail('Mục tiêu Sao Chép không hợp lệ');
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      return this.runAction(gameState, {
        type: copy.type,
        playerId,
        cardIds: [],
        payload: { ...copy.payload, targetPlayerId: targetId },
        copying: true,
      });
    }

    if (choice.kind === 'steal_pick') {
      const target = gameState.players.find(p => p.id === choice.targetPlayerId);
      const index = Number(value);
      if (!target || !Number.isInteger(index) || index < 0 || index >= target.hand.length) {
        return fail('Lá úp muốn lấy không hợp lệ');
      }
      const [card] = target.hand.splice(index, 1);
      player.hand.push(card);
      gameState.pendingChoice = null;
      gameState.waitingFor = null;
      gameState.gameLog.push(`🐾 ${player.name} đã lấy 1 lá úp từ ${target.name}.`);
      cardEffects.offerReaction(gameState, target, player);
      return {
        gameState,
        response: { type: 'steal_random', from: target.id, to: player.id },
      };
    }

    if (choice.kind === 'reaction') {
      const thief = gameState.players.find(p => p.id === choice.thiefId);
      if (!thief) {
        gameState.pendingChoice = null;
        gameState.waitingFor = null;
        return { gameState, response: { type: 'choice_resolved', playerId } };
      }
      if (value === 'pass') {
        gameState.pendingChoice = null;
        gameState.waitingFor = null;
        gameState.gameLog.push(`🛡️ ${player.name} không phản đòn.`);
        return { gameState, response: { type: 'choice_resolved', playerId } };
      }
      const idx = player.hand.findIndex(
        c => c.id === value && [CARD_TYPES.TRA_DUA, CARD_TYPES.MOC_RAC].includes(c.type) && !c.disabled
      );
      if (idx === -1) return fail('Bạn không có lá phản đòn hợp lệ');
      const [reactionCard] = player.hand.splice(idx, 1);
      gameState.discardPile.push(reactionCard);

      if (cardEffects.takeVuongNiem(gameState, thief)) {
        gameState.pendingChoice = null;
        gameState.waitingFor = null;
        gameState.gameLog.push(`👑 ${thief.name} đã chặn phản đòn của ${player.name}.`);
        return {
          gameState,
          response: { type: 'reaction_steal', playerId, targetPlayerId: thief.id, stolen: 0, blocked: true },
        };
      }

      const count = Math.min(2, thief.hand.length);
      if (count === 0) {
        gameState.pendingChoice = null;
        gameState.waitingFor = null;
        return { gameState, response: { type: 'reaction_steal', playerId, targetPlayerId: thief.id, stolen: 0 } };
      }
      setChoice(gameState, {
        playerId: player.id,
        kind: 'reaction_pick',
        sourceType: reactionCard.type,
        targetPlayerId: thief.id,
        targetName: thief.name,
        cardCount: thief.hand.length,
        count,
      });
      gameState.gameLog.push(`🛡️ ${player.name} phản đòn và đang chọn ${count} lá úp từ ${thief.name}.`);
      return { gameState, response: { type: 'choice_request', playerId: player.id } };
    }

    return fail('Loại lựa chọn không được hỗ trợ');
  }

  // ========== NHẬN BÀI TỪ XIN BÀI ==========
  handleFavorGive(gameState, playerId, cardId) {
    return cardEffects.handleFavorGive(gameState, playerId, cardId);
  }

  // ========== SẮP XẾP 3 LÁ TƯƠNG LAI ==========
  handleAlterFutureSubmit(gameState, playerId, order) {
    return cardEffects.handleAlterFutureSubmit(gameState, playerId, order);
  }

  // ========== KIỂM TRA THẮNG ==========
  checkWin(gameState) {
    const alive = gameState.players.filter(p => p.isAlive);
    if (alive.length === 1) return alive[0];
    return null;
  }
}
