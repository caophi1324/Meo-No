import { CARD_TYPES, BEAST_CARDS, WILD_BEAST } from '../../../shared/cardTypes.js';
import { CARD_DATA } from '../data/cardData.js';

// Thứ tự ưu tiên theo tính năng của lá bài
const FUNCTION_PRIORITY = {
  [CARD_TYPES.DEFUSE]: 1,           // Cứu mạng quan trọng nhất
  [CARD_TYPES.NOPE]: 2,             // Chặn đòn tức thì
  [CARD_TYPES.ATTACK]: 3,           // Tấn công né rút bài
  [CARD_TYPES.SUPER_SKIP]: 4,       // Thoát chuỗi lượt bị ép
  [CARD_TYPES.SKIP]: 5,             // Bỏ lượt né rút bài
  [CARD_TYPES.REVERSE]: 6,          // Đổi chiều lượt
  [CARD_TYPES.REVERSE_ALT]: 6,      // Đổi chiều lượt
  [CARD_TYPES.STEAL_CARD]: 7,       // Cướp bài
  [CARD_TYPES.SUPER_DESTROY]: 7,    // Hủy bài đối thủ
  [CARD_TYPES.BOOM_ATOMIC]: 9,      // Xào lại bài đã dùng
  [CARD_TYPES.SEE_THE_FUTURE]: 8,   // Soi trước tương lai
  [CARD_TYPES.ALTER_FUTURE]: 9,     // Sắp xếp tương lai
  [CARD_TYPES.SHUFFLE]: 10,         // Xáo bài đổi vận
  [CARD_TYPES.FAVOR]: 11,           // Xin bài đối thủ
  [CARD_TYPES.FUEL]: 12,            // Buff Tấn Công
  [CARD_TYPES.TACO_CAT]: 20,        // Các lá mèo nhóm lại gần nhau
  [CARD_TYPES.CATTERMELON]: 21,
  [CARD_TYPES.HAIRY_POTATO_CAT]: 22,
  [CARD_TYPES.BEARD_CAT]: 23,
  [CARD_TYPES.RAINBOW_CAT]: 24,
  [BEAST_CARDS[0]]: 25,             // 5 thú combo
  [BEAST_CARDS[1]]: 26,
  [BEAST_CARDS[2]]: 27,
  [BEAST_CARDS[3]]: 28,
  [BEAST_CARDS[4]]: 29,
  [WILD_BEAST]: 30,                 // Siêu Thú Cưng gần nhóm thú
  [CARD_TYPES.EXPLODING_KITTEN]: 99,
  [CARD_TYPES.IMPLODING_KITTEN]: 99,
};

export function sortCards(cards = [], sortMode = 'function') {
  const list = [...cards];

  switch (sortMode) {
    case 'function': {
      // Sắp xếp theo nhóm tính năng: Cứu mạng -> Chặn đòn -> Né bài -> Kiểm soát -> Xin bài -> Lá mèo
      return list.sort((a, b) => {
        const pA = FUNCTION_PRIORITY[a.type] || 50;
        const pB = FUNCTION_PRIORITY[b.type] || 50;
        if (pA !== pB) return pA - pB;
        // Nếu cùng loại, giữ nguyên hoặc xếp theo id
        return a.id.localeCompare(b.id);
      });
    }

    case 'combos': {
      // Đếm số lượng mỗi loại bài trên tay
      const counts = {};
      list.forEach((c) => {
        counts[c.type] = (counts[c.type] || 0) + 1;
      });

      // Ưu tiên các lá bài có từ 2 lá trở lên (ghép được combo) lên đầu
      return list.sort((a, b) => {
        const countA = counts[a.type] || 0;
        const countB = counts[b.type] || 0;
        if (countA !== countB) return countB - countA; // Số lượng nhiều hơn lên trước
        const pA = FUNCTION_PRIORITY[a.type] || 50;
        const pB = FUNCTION_PRIORITY[b.type] || 50;
        return pA - pB;
      });
    }

    case 'name': {
      // Sắp xếp theo tên tiếng Việt A-Z
      return list.sort((a, b) => {
        const nameA = CARD_DATA[a.type]?.nameVN || a.nameVN || '';
        const nameB = CARD_DATA[b.type]?.nameVN || b.nameVN || '';
        return nameA.localeCompare(nameB, 'vi');
      });
    }

    case 'none':
    default:
      return list;
  }
}
