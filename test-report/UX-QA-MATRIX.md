# UX / Motion QA Matrix — 25/10/2026

## Automated checks

| Check | Result |
|---|---|
| `cd server && npm test` | **PASS** — 30/30 |
| `cd client && npm run build` | **PASS** — only the existing bundle-size warning |
| `cd client && node _smoke.mjs` | **PASS** — 2 themes have all 150-card art; room created, joined, started, drew 1 card (`drawPileCount 134 → 133`) |
| Theme asset validation | **PASS** — 45 unique deck images exist for both `default` and `anime` |

Smoke test is deterministic: it spawns its own server on `PORT=4100`, uses one room, times out at 8s, and kills the child process.

## Manual matrix

| # | Scenario | Result | Note |
|---|---|---|---|
| T1 | Kết nối socket | PASS | `_smoke.mjs` two clients connected |
| T2 | Tạo phòng | PASS | room `PCVYN` created |
| T3 | Join phòng | PASS | 2 lobby players |
| T4 | Start game | PASS | both clients received `status: 'playing'` |
| T5 | Rút bài | PASS | `drawPileCount` 134 → 133 |
| T6 | Timer lượt / Nope / Tương lai | PASS | `turnTimer.test.js` in the 30/30 suite |
| T7 | Đối thủ chỉ thấy số lá | PASS | smoke asserts no `drawPile`, no opponent `hand` |
| T8 | Tấn Công cộng dồn | PASS | server test |
| T9 | Imploding úp / ngửa | PASS | server test + existing `imploding_place` flow |
| T10 | Trộm bài / combo 2 | PASS | server tests |
| T11 | Nạp Nhiên Liệu lần 2 | PASS | server test |
| T12 | Combo thú | PASS | server tests |
| T13 | Theme default ↔ anime | PASS | 4 deck tiles; anime selection rendered anime cards in game; both art sets validated |
| T14 | Reconnect / F5 | PASS | lobby F5 kept host seat; in-game F5 restored hand/opponents and showed reconnect toast |
| T15 | Winner | PASS | previous two full match runs ended with `winner.name`; winner logic unchanged in this pass |
| T16 | Mobile 375px + reduced motion | PASS | see details below |

### T16 details
- Viewport: **375×667**, room with **4 bots (5 players)**.
- Page `scrollWidth === innerWidth === 375` → **no page-level horizontal scroll**.
- Hand row: `scrollWidth 560 > clientWidth 323`, `overflow-x: auto` → one nowrap row, not wrapped. Live sample had 7 cards; 20 cards uses the same row (scroll grows, height does not).
- Action bar: `position: fixed`, height 71px, buttons 54px (≥44px), safe-area padding.
- 4 opponents visible in a 2×2 grid; draw pile and discard pile visible; header is icon-only and fits.
- Reduced motion: `prefers-reduced-motion: reduce` → hero card transform unchanged over 700ms, `.landing-card` animation `none`.
- Normal motion: hero float transform changes over 700ms (verified), theme transition is `background-color, color, border-color` at `0.28s`.

## Files / evidence
- Home desktop: `test-report/evidence/ux-home-1280.png`
- Home scroll reveal: `test-report/evidence/ux-home-scroll.png`
- Showcase tilt: `test-report/evidence/ux-home-cards.png`
- Home 375: `test-report/evidence/ux-home-375.png`
- Lobby / coming soon: `test-report/evidence/ux-lobby-comingsoon.png`
- Game 375 (top): `test-report/evidence/ux-game-375.png`
- Game 375 (hand/action bar): `test-report/evidence/ux-game-375-hand.png`

## Intentionally not done
- No Howler, no external audio, no BGM.
- No Halloween/HH3D art; tiles are `comingSoon` only.
- No live counters, ratings, or fake gameplay video.
- No fullscreen API.
- No rule/protocol changes beyond the lobby reconnect seat timer.

## Remaining risks
- The mobile sample used 7 cards, not 20; the CSS is `flex-nowrap` and was verified with the row overflowing internally. A real 20-card hand should only increase scrollWidth.
- Lobby F5 now holds the seat for `RECONNECT_TIMEOUT`; if a player never returns, the seat is removed after the timeout (not instantly).
- The bundle is still >500 kB; unchanged from before.
