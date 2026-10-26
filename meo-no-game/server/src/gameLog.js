// Hai kênh log: public cho cả bàn, private theo playerId.
// gameLog vẫn giữ dạng string để client/test cũ không vỡ trong giai đoạn chuyển tiếp.
const LIMIT = 50;

function ensure(gameState) {
  if (!gameState) return false;
  if (!Array.isArray(gameState.publicLog)) gameState.publicLog = [];
  if (!Array.isArray(gameState.gameLog)) gameState.gameLog = [];
  if (!gameState.privateLog || typeof gameState.privateLog !== 'object') {
    gameState.privateLog = {};
  }
  if (!Number.isInteger(gameState.logSeq)) gameState.logSeq = 0;
  return true;
}

function trim(list) {
  if (list.length > LIMIT) list.splice(0, list.length - LIMIT);
}

function inferKind(text) {
  const t = String(text);
  if (/💥|nổ tung|bị loại/.test(t)) return 'explosion';
  if (/🚫|Phủ Nhận/.test(t)) return 'nope';
  if (/🃏|rút 1 lá|rút được/.test(t)) return 'draw';
  if (/🐧|cướp|lấy 1 lá úp|trộm/.test(t)) return 'steal';
  if (/🎁|đưa .* cho/.test(t)) return 'favor';
  if (/🔮|Nhìn Tương Lai|Nhìn Thấu|xem .* lá/.test(t)) return 'reveal';
  if (/🔧|Gỡ Bom/.test(t)) return 'defuse';
  if (/💣|Imploding/.test(t)) return 'imploding';
  if (/⚔️|Tấn Công/.test(t)) return 'attack';
  if (/🛡️|phản đòn/.test(t)) return 'reaction';
  if (/🍕|Chia Sẻ|🥊|Hủy Bài/.test(t)) return 'destroy';
  if (/🎂|Tiệc Tùng/.test(t)) return 'party';
  if (/⛽|Nạp Nhiên Liệu/.test(t)) return 'fuel';
  if (/🔀|Xáo Trộn/.test(t)) return 'shuffle';
  if (/☢️|Boom Nguyên Tử/.test(t)) return 'boom';
  if (/🎴|đã chơi/.test(t)) return 'play';
  return 'system';
}

function makeEntry(gameState, text, meta = {}) {
  gameState.logSeq += 1;
  const entry = {
    id: `${Date.now()}-${String(gameState.logSeq).padStart(6, '0')}`,
    ts: Date.now(),
    kind: meta.kind || inferKind(text),
    text: String(text),
  };
  if (Array.isArray(meta.cards) && meta.cards.length > 0) entry.cards = meta.cards;
  return entry;
}

export function initGameLogs(gameState) {
  if (!ensure(gameState)) return gameState;
  gameState.publicLog = [];
  gameState.gameLog = [];
  gameState.privateLog = {};
  gameState.logSeq = 0;
  for (const player of gameState.players || []) {
    gameState.privateLog[player.id] = [];
  }
  return gameState;
}

// audience: 'all' (public) hoặc mảng playerIds (private).
export function addGameLog(gameState, text, audience = 'all', meta = {}) {
  if (!ensure(gameState) || !text) return null;
  const entry = makeEntry(gameState, text, meta);

  if (audience === 'all') {
    gameState.publicLog.push(entry);
    gameState.gameLog.push(entry.text);
    trim(gameState.publicLog);
    trim(gameState.gameLog);
    return entry;
  }

  const ids = Array.isArray(audience) ? audience : [audience];
  for (const id of ids) {
    if (!id) continue;
    if (!gameState.privateLog[id]) gameState.privateLog[id] = [];
    gameState.privateLog[id].push({ ...entry, cards: entry.cards ? [...entry.cards] : undefined });
    trim(gameState.privateLog[id]);
  }
  return entry;
}

export function addPublicLog(gameState, text, meta = {}) {
  return addGameLog(gameState, text, 'all', meta);
}

export function addPrivateLog(gameState, playerIds, text, meta = {}) {
  return addGameLog(gameState, text, playerIds, meta);
}

export function privateLogFor(gameState, playerId) {
  return (gameState?.privateLog?.[playerId] || []).slice(-LIMIT);
}
