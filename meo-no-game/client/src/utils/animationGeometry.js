export function snapshotRect(element) {
  if (!element) return null;
  const r = element.getBoundingClientRect();
  return r.width && r.height ? { left: r.left, top: r.top, width: r.width, height: r.height } : null;
}

export function captureCardOrigins(ids) {
  if (typeof document === 'undefined') return {};
  return Object.fromEntries(ids.map(id => [id, snapshotRect(document.querySelector(`[data-hand] [data-card-id="${CSS.escape(String(id))}"]`))]));
}

export function anchorRect(selector) {
  return typeof document === 'undefined' ? null : snapshotRect(document.querySelector(selector));
}

export function seatRect(playerId) {
  return anchorRect(`[data-player-seat="${CSS.escape(String(playerId))}"]`);
}

export function flightGeometry(fromRect, playerId, targetRect) {
  const w = window.innerWidth, h = window.innerHeight;
  const table = anchorRect('[data-play-table]');
  const target = targetRect || table || { left: w * .25, top: h * .3, width: w * .5, height: h * .3 };
  const source = fromRect || seatRect(playerId) || { left: target.left + target.width / 2 - 40, top: target.top, width: 80, height: 112 };
  const width = Math.min(104, Math.max(64, source.width));
  const height = width * 1.4;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const start = { x: clamp(source.left + source.width / 2, width / 2, w - width / 2), y: clamp(source.top + source.height / 2, height / 2, h - height / 2) };
  const end = { x: clamp(target.left + target.width / 2, width / 2 + 8, w - width / 2 - 8), y: clamp(target.top + target.height / 2, height / 2 + 8, h - height / 2 - 8) };
  const lift = clamp(Math.hypot(end.x - start.x, end.y - start.y) * .3, 60, 120);
  return { start, end, control: { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - lift }, width, height };
}

export const quadraticPoint = (a, b, c, t) => (1-t) ** 2 * a + 2 * (1-t) * t * b + t*t*c;
