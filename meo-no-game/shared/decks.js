// Deck themes change artwork only; card rules and deck composition stay identical.
export const DECK_THEMES = [
  {
    id: 'default',
    name: 'Bộ mặc định',
    description: 'Ảnh bài gốc',
    preview: '/cards/custom/MN006.jpg',
  },
  {
    id: 'anime',
    name: 'Bộ Anime',
    description: 'Tranh anime',
    preview: '/cards/anime/MN006.jpg',
  },
  {
    id: 'lol',
    name: 'Liên Minh',
    description: 'Tướng Liên Minh Huyền Thoại',
    preview: '/cards/lol/Ahri.jpg',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    description: 'Sắp ra mắt',
    icon: '🎃',
    comingSoon: true,
  },
  {
    id: 'hh3d',
    name: 'HH3D',
    description: 'Sắp ra mắt',
    icon: '🐉',
    comingSoon: true,
  },
];

export const DECK_THEME_IDS = DECK_THEMES.filter((theme) => !theme.comingSoon).map(
  (theme) => theme.id
);
export const DEFAULT_DECK_THEME = 'default';

const ANIME_EXTRA_IMAGES = {
  '/cards/cao-lua.svg': '/cards/anime/beasts/cao-lua.jpg',
  '/cards/ho-van.svg': '/cards/anime/beasts/ho-van.jpg',
  '/cards/chim-ung.svg': '/cards/anime/beasts/chim-ung.jpg',
  '/cards/ca-chep.svg': '/cards/anime/beasts/ca-chep.jpg',
  '/cards/huou-sao.svg': '/cards/anime/beasts/huou-sao.jpg',
};

// Ảnh tĩnh (preview/lobby) cho theme LMHT; trong ván dùng card.lolImage riêng từng lá.
const LOL_PREVIEW_IMAGES = {
  '/cards/custom/MN006.jpg': '/cards/lol/Ahri.jpg',
  '/cards/custom/MN003.jpg': '/cards/lol/Garen.jpg',
  '/cards/custom/MN012.jpg': '/cards/lol/Jinx.jpg',
  '/cards/custom/MN022.jpg': '/cards/lol/Lux.jpg',
  '/cards/cao-lua.svg': '/cards/lol/Darius.jpg',
};

export function themedImage(image, theme) {
  if (!image) return image;
  if (theme === 'lol') return LOL_PREVIEW_IMAGES[image] || image;
  if (theme !== 'anime') return image;
  // shortcut: every /cards/custom/MNxxx.jpg needs an anime twin; add both when adding cards.
  if (image.startsWith('/cards/custom/MN')) {
    return image.replace('/cards/custom/', '/cards/anime/');
  }
  return ANIME_EXTRA_IMAGES[image] || image;
}
