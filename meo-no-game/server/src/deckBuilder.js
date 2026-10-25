import { v4 as uuidv4 } from 'uuid';
import { CARD_TYPES, BOMB_TYPES, BEAST_CARDS } from '../../shared/cardTypes.js';
import { CARD_META, CONFIG } from './constants.js';

const PHASE2_WEIGHTS = {
  [CARD_TYPES.ATTACK]: 20,
  [CARD_TYPES.SKIP]: 18,
  [CARD_TYPES.FAVOR]: 16,
  [CARD_TYPES.SHUFFLE]: 14,
  [CARD_TYPES.NOPE]: 16,
  [CARD_TYPES.REVERSE]: 14,
  [CARD_TYPES.REVERSE_ALT]: 12,
  [CARD_TYPES.ALTER_FUTURE]: 12,
  [CARD_TYPES.STEAL_CARD]: 18,
  [CARD_TYPES.DAO_BOI]: 8,
  [CARD_TYPES.TIM_KIEM]: 6,
  [CARD_TYPES.SIEU_HUY_BAI]: 4,
  [CARD_TYPES.SIEU_THU_CUNG]: 4,
  [CARD_TYPES.CHIA_SE]: 5,
  [CARD_TYPES.GIO_GIAI_LAO]: 6,
  [CARD_TYPES.TAN_CONG_CHI_DINH]: 8,
  [CARD_TYPES.BOC_DUOI_DAY]: 8,
  [CARD_TYPES.VUONG_NIEM]: 4,
  [CARD_TYPES.HUY_BAI]: 6,
  [CARD_TYPES.TU_VA]: 6,
  [CARD_TYPES.TAN_CONG_BAN_THAN]: 5,
  [CARD_TYPES.THOI_MIEN]: 5,
  [CARD_TYPES.LAM_PHIEN]: 5,
  [CARD_TYPES.NHAN_BAN]: 4,
  [CARD_TYPES.TO_SE_LAY_NO]: 4,
  [CARD_TYPES.TIEC_TUNG]: 4,
  [CARD_TYPES.HOI_SINH]: 3,
  [CARD_TYPES.NAP_NHIEN_LIEU]: 4,
  [CARD_TYPES.BOC_O_DAU_CUNG_DUOC]: 6,
  [CARD_TYPES.TANG_CUONG]: 4,
  [CARD_TYPES.TRA_DUA]: 4,
  [CARD_TYPES.MOC_RAC]: 4,
  [CARD_TYPES.SAO_CHEP]: 4,
  [CARD_TYPES.NHIN_THAU_TUONG_LAI]: 5,
  [CARD_TYPES.CHONG_XAO_BAI]: 3,
  [CARD_TYPES.TIET_LO_TUONG_LAI]: 3,
};

export function getDeckCounts(playerCount) {
  const counts = {
    [CARD_TYPES.EXPLODING_KITTEN]: Math.max(1, playerCount - 1),
    [CARD_TYPES.IMPLODING_KITTEN]: 1,
    [CARD_TYPES.BOOM_ATOMIC]: 1,
    [CARD_TYPES.DEFUSE]: playerCount + 1,
  };

  // 5 thú × 4 bản = 20 lá, lấy từ phần bù của Tấn Công.
  for (const type of BEAST_CARDS) counts[type] = 4;

  const targetOther =
    150 - Object.values(counts).reduce((sum, n) => sum + n, 0);
  const totalWeight = Object.values(PHASE2_WEIGHTS).reduce((sum, n) => sum + n, 0);
  let assigned = 0;

  for (const [type, weight] of Object.entries(PHASE2_WEIGHTS)) {
    counts[type] = Math.max(1, Math.round((weight / totalWeight) * targetOther));
    assigned += counts[type];
  }

  // Bù chênh lệch vào Tấn Công để luôn đúng 150 lá.
  counts[CARD_TYPES.ATTACK] += targetOther - assigned;
  return counts;
}

export function createDeck(playerCount = 4) {
  const deck = [];
  for (const [type, count] of Object.entries(getDeckCounts(playerCount))) {
    for (let i = 0; i < count; i++) {
      const meta = CARD_META[type];
      if (!meta) throw new Error(`Thiếu CARD_META cho ${type}`);
      deck.push({
        id: uuidv4(),
        type,
        nameVN: meta.nameVN,
        descriptionVN: meta.descriptionVN,
        emoji: meta.emoji,
        image: meta.image,
        ...(type === CARD_TYPES.IMPLODING_KITTEN ? { faceUp: false } : {}),
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealCards(deck, numPlayers) {
  const bombs = deck.filter(c => BOMB_TYPES.includes(c.type));
  const defuses = deck.filter(c => c.type === CARD_TYPES.DEFUSE);
  const otherCards = deck.filter(
    c => !BOMB_TYPES.includes(c.type) && c.type !== CARD_TYPES.DEFUSE
  );

  const hands = [];
  const remainingOther = shuffleDeck([...otherCards]);
  const handSize = numPlayers >= 5 ? CONFIG.INITIAL_HAND_SIZE_5P : CONFIG.INITIAL_HAND_SIZE;

  for (let i = 0; i < numPlayers; i++) {
    const playerHand = [];
    for (let j = 0; j < handSize; j++) {
      if (remainingOther.length > 0) playerHand.push(remainingOther.shift());
    }
    playerHand.push(defuses[i] || defuses[0]);
    hands.push(playerHand);
  }

  const remainingDefuses = defuses.slice(numPlayers);
  const newDrawPile = shuffleDeck([
    ...remainingOther,
    ...bombs,
    ...remainingDefuses,
  ]);

  return { hands, drawPile: newDrawPile };
}
