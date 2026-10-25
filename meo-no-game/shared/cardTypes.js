export const CARD_TYPES = {
  EXPLODING_KITTEN: 'exploding_kitten',
  IMPLODING_KITTEN: 'imploding_kitten',
  BOOM_ATOMIC: 'boom_atomic',
  DEFUSE: 'defuse',
  ATTACK: 'attack',
  SKIP: 'skip',
  FAVOR: 'favor',
  SHUFFLE: 'shuffle',
  SEE_THE_FUTURE: 'see_the_future',
  NOPE: 'nope',
  REVERSE: 'reverse',
  REVERSE_ALT: 'reverse_alt',
  STEAL_CARD: 'steal_card',
  DAO_BOI: 'dao_boi',
  TIM_KIEM: 'tim_kiem',
  SIEU_HUY_BAI: 'sieu_huy_bai',
  SIEU_THU_CUNG: 'sieu_thu_cung',
  CHIA_SE: 'chia_se',
  GIO_GIAI_LAO: 'gio_giai_lao',
  TAN_CONG_CHI_DINH: 'tan_cong_chi_dinh',
  BOC_DUOI_DAY: 'boc_duoi_day',
  VUONG_NIEM: 'vuong_niem',
  HUY_BAI: 'huy_bai',
  TU_VA: 'tu_va',
  TAN_CONG_BAN_THAN: 'tan_cong_ban_than',
  THOI_MIEN: 'thoi_mien',
  LAM_PHIEN: 'lam_phien',
  NHAN_BAN: 'nhan_ban',
  TO_SE_LAY_NO: 'to_se_lay_no',
  TIEC_TUNG: 'tiec_tung',
  HOI_SINH: 'hoi_sinh',
  NAP_NHIEN_LIEU: 'nap_nhien_lieu',
  BOC_O_DAU_CUNG_DUOC: 'boc_o_dau_cung_duoc',
  TANG_CUONG: 'tang_cuong',
  TRA_DUA: 'tra_dua',
  MOC_RAC: 'moc_rac',
  SAO_CHEP: 'sao_chep',
  NHIN_THAU_TUONG_LAI: 'nhin_thau_tuong_lai',
  CHONG_XAO_BAI: 'chong_xao_bai',
  TIET_LO_TUONG_LAI: 'tiet_lo_tuong_lai',
  SUPER_SKIP: 'super_skip',
  ALTER_FUTURE: 'alter_future',
  FUEL: 'fuel',
  SUPER_DESTROY: 'super_destroy',
  TACO_CAT: 'taco_cat',
  CATTERMELON: 'cattermelon',
  HAIRY_POTATO_CAT: 'hairy_potato_cat',
  BEARD_CAT: 'beard_cat',
  RAINBOW_CAT: 'rainbow_cat',
  CAO_LUA: 'cao_lua',
  HO_VAN: 'ho_van',
  CHIM_UNG: 'chim_ung',
  CA_CHEP: 'ca_chep',
  HUOU_SAO: 'huou_sao',
};

export const CAT_CARDS = [
  CARD_TYPES.TACO_CAT,
  CARD_TYPES.CATTERMELON,
  CARD_TYPES.HAIRY_POTATO_CAT,
  CARD_TYPES.BEARD_CAT,
  CARD_TYPES.RAINBOW_CAT,
];

export const BEAST_CARDS = [
  CARD_TYPES.CAO_LUA,
  CARD_TYPES.HO_VAN,
  CARD_TYPES.CHIM_UNG,
  CARD_TYPES.CA_CHEP,
  CARD_TYPES.HUOU_SAO,
];

export const WILD_BEAST = CARD_TYPES.SIEU_THU_CUNG;
export const PET_CARDS = [...CAT_CARDS, ...BEAST_CARDS, WILD_BEAST];

// Các lá được phép ghép với Tăng Cường. Chỉ hiệu ứng tức thời.
export const BOOSTABLE_TYPES = [
  CARD_TYPES.ATTACK,
  CARD_TYPES.TAN_CONG_CHI_DINH,
  CARD_TYPES.TAN_CONG_BAN_THAN,
  CARD_TYPES.TU_VA,
  CARD_TYPES.CHIA_SE,
  CARD_TYPES.HUY_BAI,
  CARD_TYPES.GIO_GIAI_LAO,
  CARD_TYPES.HOI_SINH,
  CARD_TYPES.SIEU_HUY_BAI,
];

// Trả về { size, family } cho combo thú/mèo hợp lệ, hoặc null.
// Không trộn mèo với thú. Siêu Thú Cưng là wildcard của thú, tối đa 1 lá.
export function getPetCombo(types = []) {
  if (!Array.isArray(types) || types.length < 2) return null;

  const isCat = t => CAT_CARDS.includes(t);
  const isBeast = t => BEAST_CARDS.includes(t);
  const isWild = t => t === WILD_BEAST;

  if (types.every(isCat)) {
    if (types.length === 2 && types[0] === types[1]) return { size: 2, family: 'cat' };
    if (types.length === 3 && types.every(t => t === types[0])) return { size: 3, family: 'cat' };
    if (types.length === 5 && new Set(types).size === 5) return { size: 5, family: 'cat' };
    return null;
  }

  if (!types.every(t => isBeast(t) || isWild(t))) return null;
  const wilds = types.filter(isWild).length;
  if (wilds > 1) return null;
  const base = types.filter(t => !isWild(t));
  const distinct = new Set(base);

  if (types.length === 2) {
    if (wilds === 1 && base.length === 1) return { size: 2, family: 'beast' };
    if (wilds === 0 && base.length === 2 && distinct.size === 1) return { size: 2, family: 'beast' };
    return null;
  }

  if (types.length === 3) {
    if (wilds === 1 && base.length === 2 && distinct.size === 1) return { size: 3, family: 'beast' };
    if (wilds === 0 && base.length === 3 && distinct.size === 1) return { size: 3, family: 'beast' };
    return null;
  }

  if (types.length === 5) {
    if (distinct.size !== base.length) return null;
    if (wilds === 1 && base.length === 4) return { size: 5, family: 'beast' };
    if (wilds === 0 && base.length === 5 && distinct.size === 5) return { size: 5, family: 'beast' };
    return null;
  }

  return null;
}

export const BOMB_TYPES = [
  CARD_TYPES.EXPLODING_KITTEN,
  CARD_TYPES.IMPLODING_KITTEN,
  CARD_TYPES.BOOM_ATOMIC,
];

export const ACTION_CARDS = [
  CARD_TYPES.ATTACK,
  CARD_TYPES.SKIP,
  CARD_TYPES.FAVOR,
  CARD_TYPES.SHUFFLE,
  CARD_TYPES.SEE_THE_FUTURE,
  CARD_TYPES.NOPE,
  CARD_TYPES.REVERSE,
  CARD_TYPES.REVERSE_ALT,
  CARD_TYPES.STEAL_CARD,
  CARD_TYPES.DAO_BOI,
  CARD_TYPES.TIM_KIEM,
  CARD_TYPES.SIEU_HUY_BAI,
  CARD_TYPES.SIEU_THU_CUNG,
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
  CARD_TYPES.SUPER_SKIP,
  CARD_TYPES.ALTER_FUTURE,
  CARD_TYPES.FUEL,
  CARD_TYPES.SUPER_DESTROY,
  CARD_TYPES.BOOM_ATOMIC,
];
