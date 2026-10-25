# PROMPT — CẬP NHẬT MÈO NỔ (SPRINT 2: VISUAL / MOTION / MOBILE)

Bạn là kỹ sư frontend + game UI. Làm việc trong repo `D:\meow no\meo-no-game` — server Node/Express/Socket.IO, client React 18 + Vite + Tailwind v4 + framer-motion. Đây là pass cải tiến trải nghiệm web, **không đổi luật chơi**.

Nguồn yêu cầu: `D:\meow no\DANH-GIA-VA-CAI-TIEN-MEO-NO.md` — đọc **Phần 1–4 và Phần 6**, bỏ qua Phần 5. Báo cáo được viết trước khi code hiện tại hoàn tất một phần lớn Sprint 1, nên **không được tin các mục “bug chặn” của báo cáo mà phải kiểm chứng**.

---

## 0. KIỂM CHỨNG TRƯỚC KHI SỬA

Chạy baseline:

```powershell
cd "D:\meow no\meo-no-game\server"
npm test

cd "D:\meow no\meo-no-game\client"
npm run build
```

Kết quả đã kiểm chứng ngày 24/10/2026:

- `server/npm test`: **30/30 pass**.
- `client/npm run build`: **pass** (chỉ còn warning bundle >500 kB).
- `client/_qa-protocol.mjs`: treo >3 phút — **không dùng**.
- `client/_edge-tests.mjs`: 3/5 — lỗi do kịch bản cũ/flaky, không phải bug sản phẩm.

Nếu port 4000 đang bận, chạy server test ở port khác:

```powershell
$env:PORT=4100; npm run dev
```

---

## 1. TRẠNG THÁI ĐÃ KIỂM CHỨNG — KHÔNG SỬA LẠI

Các mục sau **đã đúng trong code hiện tại**. Chỉ sửa nếu test hoặc flow thực tế chứng minh có regression.

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| `start_game` gửi thiếu `roomCode` | ✅ Đã đúng | `useSocket.startGame(roomCode)` gửi `{ roomCode }`; `socketHandlers` đọc `payload.roomCode` |
| `join_room` thiếu `room_joined` | ✅ Không còn là bug | Client dùng `lobby_update`; `HomePage` tự navigate khi `lobbyPlayers.length > 0`; không listener nào chờ `room_joined` |
| Nope parity (lẻ hủy / chẵn thi hành) | ✅ Đã đúng | `gameEngine.handleNope` + test “Nope lẻ hủy, Nope chẵn thi hành” |
| Broadcast lộ tay bài | ✅ Đã đúng | `broadcastStates` gửi `sanitizeStateForPlayer` riêng từng socket; test sanitizer |
| Skip/Attack không chuyển lượt | ✅ Đã đúng | `handleSkip` / `handleAttack` + test “Bỏ Lượt kết thúc lượt và không rút bài” |
| Tấn Công không cộng dồn | ✅ Đã đúng | `cardEffects.handleAttack` có `carried`; test “đánh ngay nhận 4, đã rút 1 nhận 3” |
| Tấn Công Chỉ Định cộng dồn sai | ✅ Đã đúng | `customPhase3Effects` luôn `2 × boost`; test riêng |
| Imploding Kitten tự đặt random | ✅ Đã đúng | `waitingFor = 'imploding_place'`, `placeImplodingKitten`, modal, `DrawPile.topCard`; test |
| Trộm bài auto random | ✅ Đã đúng | choice `steal_pick`, modal `mode="cards"`, không lộ danh tính lá; test |
| Nạp Nhiên Liệu dùng nhiều lần | ✅ Đã đúng | cờ `napNhienLieuUsed`; test “chỉ dùng 1 lần mỗi ván” |
| Tăng Cường xử lý sai | ✅ Đã đúng | `BOOSTABLE_TYPES` dùng chung; test chặn lá nhiều bước |
| 5 loại thú + Siêu Thú | ✅ Đã có | `BEAST_CARDS` (cáo/hổ/chim/cá/hươu), `getPetCombo`, 5 × 4 = 20 lá, deck 150; art SVG + anime JPG |
| Theme anime | ✅ Đã có | `shared/decks.js` + 40 ảnh `client/public/cards/anime/MN001–040.jpg` + 5 beast JPG; selector trong `LobbyPage` |
| Chữ “🚫 BỊ KHÓA” che mặt bài | ✅ Đã bỏ | `Card.jsx` chỉ còn dim + viền đỏ + `title="Bị Làm Phiền"` + `aria-disabled` |
| Winner hiển thị `undefined` | ✅ Đã đúng | sanitizer trả `winner: { id, name }`; `GamePage` đọc `winner.name` |

**Kết luận:** Sprint 1 của báo cáo đã xong. Không làm lại các mục trên. Không thêm event `ROOM_JOINED` nếu không có flow thực tế cần nó.

**Không đụng vào:**
- `SET_TIMERS` hiện chỉ validate số dương, không có trần cứng. Đây là thiết kế hiện tại (test “Timer chỉ yêu cầu số dương, không còn trần cứng”). Không thêm max trừ khi được yêu cầu riêng.
- Luật Tấn Công, Imploding, Nạp Nhiên Liệu, Tăng Cường, combo thú.
- `gameEngine.test.js` — giữ xanh 30/30.

**Khoảng trống đã biết, không bắt buộc trong pass này:** F5 khi đang ở phòng chờ có thể mất ghế (disconnect ở lobby bị xóa ngay, không giữ 60 giây như trong ván). Nếu sửa được rẻ thì làm; nếu không, ghi vào báo cáo cuối. Không phá reconnect trong ván.

---

## 2. QUY TẮC BẤT BIẾN

1. **Không thêm dependency.** Đặc biệt **không thêm Howler.js**. Dùng `client/src/utils/soundEffects.js` (Web Audio procedural) làm nguồn âm thanh duy nhất.
2. **Không đổi luật, không đổi protocol** nếu không cần cho UI. Không thêm event mới khi event cũ đủ dùng.
3. **Không bịa dữ liệu**: không “live counter” giả, không rating giả, không video gameplay giả. Nếu muốn live count, phải lấy từ server thật; nếu không, bỏ qua.
4. **Không vẽ art theme mới trong pass này.** Anime đã có; Halloween/HH3D là sprint riêng. Chỉ thêm tile “Sắp ra mắt” nếu UI đã hỗ trợ disabled, không thêm ảnh giả/404.
5. **Privacy:** không gửi `hand`, `drawPile`, danh tính lá úp cho người khác. Chỉ `drawPileTop` khi là Imploding mặt ngửa.
6. **Motion:** chỉ animate `transform` / `opacity`; 150–900ms; không chặn input quá 900ms; tôn trọng `useReducedMotion` và `prefers-reduced-motion`; không loop vô hạn ngoài landing.
7. **Accessibility:** giữ focus ring, `aria-label`, `aria-disabled`, thao tác bàn phím; không dùng màu làm tín hiệu duy nhất.
8. **Không commit**, không đổi file ngoài phạm vi, không refactor lớn.

---

## 3. VIỆC PHẢI LÀM

### 3.1 Landing page — giữ thiết kế, thêm chuyển động

**Hiện trạng:** `HomePage.jsx` đã có thiết kế landing mới (hero, stats, how-to, showcase, CTA, light/dark theme), nhưng chỉ có 2 cụm `motion`; hero chưa có visual lá bài; chưa có scroll reveal/3D tilt.

**File:** `client/src/pages/HomePage.jsx`, `client/src/index.css`.

**Làm:**
- **Hero visual:** thêm một cụm 3–5 lá bài (dùng component `Card`, lấy từ `SHOWCASE`) ở bên phải hero trên desktop, phía sau/trên CTA ở mobile. Wrapper `aria-hidden="true"` vì chỉ trang trí. Float nhẹ `y: [0, -8, 0]`, 6s, stagger 0.12–0.18s; tắt khi reduced motion.
- **Hero stagger:** title → lede → CTA → tags, mỗi phần lệch 70–90ms.
- **Scroll reveal:** stats, how-to, showcase, CTA dùng `whileInView` + `viewport={{ once: true, amount: 0.2 }}`, `y: 18 → 0`, 400–500ms. Không cần thư viện mới.
- **Showcase 3D tilt:** hover/focus lá bài trong `.landing-card-row`: `rotateX/rotateY` tối đa 8°, lift 6–8px, `transformPerspective: 800`; reset khi rời chuột/blur. Giữ float CSS hiện có (`.landing-card`).
- **Theme crossfade:** thêm transition 250–300ms cho background/color/border của `.landing-root` khi đổi light/dark; không transition toàn bộ `*`.
- **Không làm:** live counter giả, rating giả, video/GIF demo (không có asset). Nếu muốn “social proof”, chỉ dùng dữ liệu thật từ server và phải được duyệt riêng.

**Nghiệm thu:** 375px và 1280px không overlap; hero fan không che CTA/nút; scroll reveal chạy một lần; focus ring vẫn rõ; reduced motion không có loop.

---

### 3.2 Trong ván — chuyển động vật lý, không thêm overlay trùng

**Hiện trạng:** `GamePage.jsx` (1131 dòng) có **0** tham chiếu `motion.`; đang dựa vào CSS (`turn-blink`, `attack-blink`, `banner-slide`, `fuel-fill`, `imploding-flip`) và 2 overlay:
- `CardAnimationOverlay.jsx`: deal / draw / play / shuffle / imploding.
- `CardEffectOverlay.jsx`: attack / skip / favor / shuffle / see future / steal / reverse / fuel / super destroy / NOPE / exploded.
Đã có âm thanh, screen shake, DrawPile mặt ngửa, modal đặt Imploding. **Không viết lại các phần đã có.**

**File:** `client/src/components/CardAnimationOverlay.jsx`, `CardEffectOverlay.jsx`, `SeeTheFutureModal.jsx`, `GamePage.jsx`, `DrawPile.jsx`, `index.css`.

**Làm (chỉ phần còn thiếu):**
- **Rút bài:** sửa overlay `draw` để bay theo cung từ vùng chồng bài (trái/giữa) về phía tay người chơi (dưới), 400–600ms; dùng card back; chỉ người rút thấy overlay này (overlay là local, không broadcast).
- **Đánh bài:** nếu event `cardEffect` có `cardType`/`type` của lá đã đánh, hiển thị mặt lá đó (dùng `CARD_DATA` + `themedImage`); nếu không có dữ liệu, giữ card back. Bay từ tay ra giữa bàn rồi vào chồng hạ, ~350–450ms.
- **Xào bài:** overlay hiện có; chỉnh để bắt đầu từ vị trí chồng bài, 600–700ms, 3 lá tách → trộn → úp.
- **Tấn Công:** giữ `attack-blink` + screen shake 120ms; thêm một “lunge” nhẹ của avatar người đánh về phía mục tiêu (nếu rẻ), không rung cả bàn lâu.
- **Nope:** giữ stamp `NOPE!` trong `CardEffectOverlay`; nếu thêm lá slam thì đặt đúng lên lá đang chờ, 250–350ms. Không double sound với `NopePopup`.
- **Mèo Nổ / Boom:** thêm build-up 2–3 nhịp (scale/opacity) rồi burst; có thể dùng `canvas-confetti` đã cài (không thêm dep) với số hạt nhỏ, hoặc particle CSS. Tổng ≤900ms; screen shake 120ms.
- **Đổi lượt:** banner hiện có (`banner-slide`, key theo `currentPlayerId`) — kiểm tra và chỉnh nội dung “Lượt của X” + “còn N lượt” khi bị Tấn Công; không thay bằng overlay mới.
- **Nhìn Tương Lai:** `SeeTheFutureModal` hiện static; thêm 3 lá lật lần lượt (stagger 80ms, 400–500ms) + backlight tím; vẫn đóng được bằng bàn phím.
- **Combo:** khi combo hợp lệ, pulse nhẹ vùng lá đã chọn (đã có lift); không cần overlay mới.
- **Imploding:** giữ nguyên; đảm bảo `DrawPile` render mặt ngửa + nhãn “Mặt ngửa” và modal đặt bài vẫn hoạt động.

**Quy tắc:** một event chỉ phát một âm thanh; audit `CardAnimationOverlay` và `CardEffectOverlay` để tránh double. Không animate `width/height/top/left`; không block input.

---

### 3.3 Mobile & layout 4–5 người

**Hiện trạng:** `CardHand.jsx` dùng `flex-wrap`; với 15–20 lá, tay bài chiếm nhiều hàng, che bàn chơi trên mobile. `GameBoard` chia 2 cột; 4 đối thủ thành 2×2.

**File:** `client/src/components/CardHand.jsx`, `GamePage.jsx`, `GameBoard.jsx`, `PlayerSlot.jsx`, `index.css`.

**Làm:**
- **Tay bài mobile (<640px):** một hàng ngang scroll (`flex-nowrap overflow-x-auto snap-x`), lá `small`/`tiny`, `shrink-0`; thêm fade mép trái/phải; **không wrap thành 5 hàng**.
- **Thanh hành động:** sticky trong khay bài hoặc cố định đáy màn hình, có `backdrop-blur`, `env(safe-area-inset-bottom)`, nút ≥44px.
- **Giới hạn chiều cao tay bài:** khoảng 36–40vh; vẫn thấy chồng rút/chồng hạ và ít nhất 2 đối thủ.
- **Sort bar:** thu gọn trên mobile (select hoặc icon), không chiếm 2 hàng.
- **GameBoard:** 4 đối thủ ở 375px không tràn ngang; giảm gap/min-width nếu cần.
- **Header:** giữ mã phòng + icon; ẩn bớt label chữ trên mobile (đã có một phần).
- **Tùy chọn:** nút fullscreen dùng Fullscreen API; nếu làm, có `aria-label`, xử lý `fullscreenchange`, không bắt buộc.
- **Không** đổi bố cục desktop đang ổn.

**Nghiệm thu:** 375×667, phòng 5 người (4 bot), tay 20 lá: không scroll ngang cấp trang; vẫn thấy chồng rút + chồng hạ; chọn/đánh/rút được; không che nút Thoát/Cài đặt.

---

### 3.4 Âm thanh — mở rộng engine có sẵn

**Hiện trạng:** `soundEffects.js` có ~12 cue procedural (draw, card, explosion, defuse, nope, victory, attack, skip, favor, shuffle, future, cat, reverse, fuel, destroy, click). Mute lưu `localStorage`; chưa có nhạc nền.

**File:** `client/src/utils/soundEffects.js`, `CardEffectOverlay.jsx`, `GamePage.jsx` (nếu cần).

**Làm:**
- **Không thêm Howler.** Thêm cue còn thiếu bằng `tone()`/oscillator:
  - `playBoomBuild()` — 2–3 tick ngắn trước nổ.
  - `playNopeSlam()` — “bzzt” + thud ngắn.
  - `playBeast()` — growl/chirp cho combo thú.
  - Các cue đã có (`playFuel`, `playDestroy`, `playVictory`, `playDefuse`) giữ nguyên.
- **Audit:** một event một âm thanh; không chồng explosion + nope + card cùng lúc.
- **Nhạc nền (tùy chọn, không bắt buộc):** nếu làm, procedural ambient loop rất nhỏ, chỉ bắt đầu sau gesture đầu tiên, tôn trọng mute, lưu trạng thái; không autoplay. Nếu không làm, ghi rõ “chưa có BGM” trong báo cáo cuối.
- **Không** dùng file audio ngoài repo; không fetch remote.

**Nghiệm thu:** mute tắt tất cả; refresh vẫn nhớ mute; không lỗi console; không có tiếng trước khi người dùng click.

---

### 3.5 Theme — chỉ preview, không vẽ art mới

**Hiện trạng:** `shared/decks.js` có `default` + `anime`; anime đã đủ 40 lá + 5 beast; `LobbyPage` có selector; `Card`/`DrawPile` dùng `themedImage`.

**Làm (tùy chọn, không phải điều kiện nghiệm thu):**
- Thêm tile `Halloween` và `HH3D` dạng `comingSoon: true` vào selector nếu UI hỗ trợ disabled; hiển thị “Sắp ra mắt”, không có ảnh giả/404.
- **Không** thêm 40 ảnh Halloween trong pass này. Nếu được duyệt riêng, dùng `tools/make-anime-cards.ps1` làm mẫu, tạo đủ 40 + 5 beast, validate tất cả file tồn tại trước khi thêm theme id.
- Không đụng logic `themedImage` cho anime.

**Nghiệm thu:** `default` ↔ `anime` vẫn đổi đúng preview trong lobby và ảnh trong ván; tile coming-soon không click được; không 404.

---

### 3.6 Dọn test cũ & thêm smoke test

**Hiện trạng:** `_qa-protocol.mjs` treo; `_edge-tests.mjs` flaky. Không được để lại script treo trong repo.

**Làm:**
- Chạy lại `server/npm test` (30/30) và `client/npm run build`.
- **Sửa hoặc xóa** `client/_qa-protocol.mjs` và `client/_edge-tests.mjs`.
- Nếu viết lại, tạo **một** smoke test deterministic (ví dụ `client/_smoke.mjs`):
  - Spawn server ở port riêng (`PORT=4100`) bằng `child_process`, chờ ready.
  - 2 client socket: create → join → start → nhận `GAME_STATE_UPDATE`.
  - Assert: cả 2 thấy `status: 'playing'`; state của người này không chứa `myHand`/`hand` của người kia; `drawPile` không có trong state.
  - Rút 1 lá: `drawPileCount` giảm ở cả 2.
  - Guest disconnect → `REJOIN` với id cũ → nhận lại state (nếu giữ test reconnect).
  - Timeout rõ ràng (5–8s) cho mọi `waitFor`; cleanup server + `process.exit`.
- Không dùng vòng lặp 40 phòng random; không phụ thuộc thứ tự chia bài ngẫu nhiên.
- Không thêm test framework client.

**Manual matrix** (ghi pass/fail vào `test-report/`):

| # | Flow | Kỳ vọng |
|---|---|---|
| T1 | Kết nối server | socket.id hợp lệ |
| T2 | Tạo phòng (có/không bot) | nhận mã phòng, lobby cập nhật |
| T3 | Join bằng mã | guest vào lobby, host thấy guest |
| T4 | Start game | cả 2 vào bàn, không lỗi “Phòng không tồn tại” |
| T5 | Rút bài | lượt chuyển, bài vào tay người rút |
| T6 | Timer | đếm ngược, hết giờ auto-action |
| T7 | Đối thủ | chỉ thấy số lá, không thấy tên lá |
| T8 | Tấn Công cộng dồn | A→B, B→C ngay: C nhận 4 |
| T9 | Imploding úp | lật ngửa, tự chọn vị trí, lượt trừ sau khi đặt |
| T10 | Trộm bài / combo 2 | chọn người → chọn 1 trong N lá úp |
| T11 | Nạp Nhiên Liệu | lần 2 bị chặn |
| T12 | Combo thú | 2/3/5 đúng; Siêu Thú thay thế; không trộn mèo |
| T13 | Theme | default/anime đổi đúng; coming-soon không lỗi |
| T14 | Reconnect trong ván | F5 giữ bài/lượt |
| T15 | Winner | hiện tên, không “undefined” |
| T16 | Mobile 375px / reduced motion | không tràn, không loop |

---

## 4. ĐIỀU KIỆN HOÀN THÀNH

- `cd server && npm test` → **30/30 pass** (không được giảm).
- `cd client && npm run build` → pass.
- Không thêm dependency; `package.json` không đổi.
- Không lộ bài đối thủ/drawPile; `drawPileTop` chỉ cho Imploding mặt ngửa.
- Landing + lobby + trong ván có motion mới; `prefers-reduced-motion` tắt loop/float.
- 375px: không scroll ngang cấp trang; tay bài không chiếm quá ~40vh; nút ≥44px.
- Không có âm thanh trước gesture đầu tiên; mute hoạt động toàn app.
- Không còn script test treo vô hạn.
- Không commit.

---

## 5. BÁO CÁO CUỐI

Trả về:

1. Bảng **file đã sửa → thay đổi** (ngắn).
2. Kết quả `npm test` + `npm run build`.
3. Kết quả manual matrix T1–T16 (pass/fail, ghi chú).
4. Những gì **cố ý không làm**: Howler/BGM, art Halloween, live counter/video, thay đổi luật.
5. Rủi ro còn lại: mobile performance, lobby F5, script test cũ (nếu chưa xóa).

Nếu phải chọn giữa “thêm hiệu ứng đẹp” và “ván chơi ổn định”, chọn **ổn định**.
