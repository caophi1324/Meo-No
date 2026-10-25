# KẾ HOẠCH CẬP NHẬT — MÈO NỔ (23/10/2026)

> Phiên này **không sửa source code**. Chỉ đọc code, chạy test, viết kế hoạch + prompt.
> File duy nhất được thêm vào repo: tài liệu này.

---

## 0. Kết luận nhanh

| Việc đã chạy | Kết quả |
|---|---|
| `server/npm test` (8 unit test có sẵn) | ✅ 8/8 pass — nhưng chỉ test turn timer, không test luật bài |
| Probe engine tự viết (13 case, ngoài repo) | ⚠️ 7/13 pass — 6 fail đúng vào các lỗi bạn nêu |
| `client/_edge-tests.mjs` (server đang chạy sẵn ở :4000) | ⚠️ 3/5 pass — 1 fail do thiếu validate max timer, 1 fail do test cũ flaky |
| `client/_qa-protocol.mjs` | ❌ Treo > 3 phút, không dùng được |

**9 vấn đề bạn nêu: 7 xác nhận đúng, 1 đúng một phần (Tăng Cường), 1 là thiết kế mới (5 thú).**

---

## 1. TRẬN ĐẤU TEST

### 1.1 Kết quả probe engine (đã chạy thật)

Probe: `C:\Users\GOLDENLAP\AppData\Local\Temp\opencode\probe-meo-no.mjs` (ngoài repo, không phải code dự án).
Dựng 3 người A/B/C, bài xếp tay, gọi thẳng `GameEngine`.

| # | Case | Kỳ vọng | Thực tế | Kết luận |
|---|---|---|---|---|
| 1 | Tấn Công cơ bản | B nhận 2 lượt | 2 | ✅ |
| 2 | A Tấn Công → B Tấn Công ngay | C nhận **4** lượt | 2 | ❌ mất lượt cộng dồn |
| 3 | B đã rút 1 lượt rồi Tấn Công | C nhận **3** lượt | 2 | ❌ |
| 4 | Tấn Công Chỉ Định | đúng 2, không cộng | 2 | ✅ |
| 5 | Imploding Kitten mặt úp | `waitingFor = imploding_place` | `null` | ❌ tự đặt random |
| 6 | Imploding Kitten mặt ngửa | chết, không Gỡ Bom | chết | ✅ |
| 7 | Nạp Nhiên Liệu dùng lần 2 | bị chặn | vẫn chạy | ❌ |
| 8 | Tăng Cường + Tấn Công | 4 lượt | 4 | ✅ |
| 9 | Tăng Cường + Tìm Kiếm | xem 10 lá (thêm 1 lần) | 5 lá | ❌ boost bị nuốt |
| 10 | Siêu Thú Cưng + 1 lá mèo | combo 2 hợp lệ | “Kết hợp không hợp lệ” | ❌ wildcard chỉ đúng ở combo 5 |

### 1.2 Kịch bản trận test 3 người (dùng cho phiên update)

Dựng bài xếp tay, không random. Mỗi dòng là 1 assert.

| # | Người | Hành động | Kỳ vọng | Hiện tại |
|---|---|---|---|---|
| 1 | A | Nhìn Tương Lai | Chỉ A thấy 3 lá; B/C nhận `null` | ✅ |
| 2 | A | Bỏ Lượt | Sang B, không rút | ✅ |
| 3 | B | Tấn Công | C còn 2 lượt | ✅ |
| 4 | C | Tấn Công ngay | A nhận **4** lượt | ❌ 2 |
| 5 | A | Siêu Bỏ Lượt | Hết sạch 4 lượt, sang B | ✅ |
| 6 | B | Rút trúng Imploding mặt úp | Mở modal, lật ngửa, **tự chọn vị trí**, lượt giảm 1 | ❌ auto random |
| 7 | C | Rút trúng Imploding mặt ngửa | Chết ngay, không dùng được Gỡ Bom | ✅ |
| 8 | A | Xin Xỏ | B tự chọn lá đưa | ✅ |
| 9 | B | Trộm Bài | Chọn C → **chọn 1 trong N lá úp** | ❌ random |
| 10 | A | Tăng Cường + Tấn Công | B nhận 4 lượt | ✅ |
| 11 | B | Nạp Nhiên Liệu lần 1 | Trộn bài hạ vào chồng rút, hết lượt | ✅ |
| 12 | C | Nạp Nhiên Liệu lần 2 | Bị chặn | ❌ |
| 13 | A | Combo 2/3/5 thú + Siêu Thú | 2 → cướp blind, 3 → đòi loại, 5 → lấy chồng hạ, Siêu Thú thay lá thiếu | ❌ chưa có thú |
| 14 | A | Rút Exploding Kitten | Gỡ Bom → chọn vị trí | ✅ |
| 15 | B | Nope 1 lần / 2 lần | Lẻ = hủy, chẵn = thi hành | ✅ |

Phần còn lại của bộ bài (Đảo Chiều, Chia Sẻ, Hủy Bài, Thôi Miên, Làm Phiền, Nhân Bản, Hồi Sinh, Boom Nguyên Tử, Siêu Hủy Bài, Trả Đũa, Móc Rác, Sao Chép, Bốc Đáy, Bốc Mọi Vị Trí, Từ Vả, Tấn Công Bản Thân) đi theo cùng khuôn: **setup tay → gọi action → assert state**. Mỗi lá 1 case trong `gameEngine.test.js` (mục 3).

---

## 2. KẾ HOẠCH CẢI TIẾN

### P0 — Luật & luồng đang sai (làm trước, có test)

| # | Vấn đề | File | Cách sửa | Nghiệm thu |
|---|---|---|---|---|
| P0.1 | Tấn Công không cộng dồn | `server/src/cardEffects.js` `handleAttack` | `carried = turnsRemaining > 1 ? turnsRemaining : 0`; `base = fueled ? 3 : 2`; `next = carried + base * (boost ? 2 : 1)` | Probe case 2 = 4, case 3 = 3 |
| P0.2 | Tấn Công Chỉ Định cộng dồn sai (nếu có) | `customPhase3Effects.js:151` | Giữ nguyên `2 × boost`, **không** cộng `carried` | Case 4 vẫn = 2 |
| P0.3 | Imploding tự đặt random | `gameEngine.js:511-521` | Thêm `waitingFor='imploding_place'`, `pendingAction={type:'imploding',card}`; action mới `imploding_place`; chỉ trừ lượt **sau khi** đặt; cờ `faceUp=true` giữ nguyên | Case 6 |
| P0.4 | Imploding mặt ngửa không thấy trên chồng bài | `stateSanitizer.js`, `DrawPile.jsx` | Sanitizer trả `drawPileTop` khi top là imploding face-up; DrawPile render mặt trước + viền đỏ nhấp nháy | Nhìn thấy lá ngửa trên bàn |
| P0.5 | Trộm bài auto random | `cardEffects.js:183, 422` | Đổi thành `setChoice(kind:'steal_pick', targetPlayerId, cardCount)`; xử lý trong `handleChoiceResponse`; timeout/bot chọn random; client hiện N lưng bài | Case 9; không lộ danh tính lá |
| P0.6 | Nạp Nhiên Liệu dùng nhiều lần | `customPhase3Effects.js:299` | Cờ `gameState.napNhienLieuUsed`; chặn lần 2; reset khi `initGame` | Case 12 |
| P0.7 | Tăng Cường xử lý không nhất quán | `shared/cardTypes.js`, `gameEngine.js:183-209`, `GamePage.jsx:255+` | 1 nguồn `BOOSTABLE_TYPES` dùng chung; chỉ cho lá hiệu ứng tức thời; chặn lá nhiều bước (Xin Xỏ, Tìm Kiếm, Đào Bới, Tương Lai, Trộm…) | Case 9; bảng combo trong UI khớp server |
| P0.8 | Timer không có max | `socketHandlers.js:207-212` | Thêm max: lượt ≤ 300s, nope ≤ 30s, tương lai ≤ 60s; client `TimerSettings` cùng giới hạn | `_edge-tests` case SET_TIMERS pass |
| P0.9 | Chữ “🚫 BỊ KHÓA” che mặt bài | `Card.jsx:100-106, 215-221` | Bỏ chữ; giữ làm mờ + viền đỏ + `aria-disabled`; tooltip “Bị Làm Phiền” | Không còn chữ trên lá |

### P1 — 5 loại thú + Siêu Thú

Bộ thú hiện **không tồn tại**; chỉ có 5 mèo + Siêu Thú Cưng. Thêm 5 thú, giữ nguyên bộ mèo.

| Tên | Key | Emoji | Màu chủ đạo | Vai trò |
|---|---|---|---|---|
| Cáo Lửa | `cao_lua` | 🦊 | `#F97316` | Combo 2/3/5 |
| Hổ Vằn | `ho_van` | 🐯 | `#F59E0B` + sọc `#1F2937` | Combo 2/3/5 |
| Chim Ưng | `chim_ung` | 🦅 | `#0EA5E9` | Combo 2/3/5 |
| Cá Chép | `ca_chep` | 🐟 | `#14B8A6` | Combo 2/3/5 |
| Hươu Sao | `huou_sao` | 🦌 | `#84CC16` | Combo 2/3/5 |
| Siêu Thú Cưng | `sieu_thu_cung` | 🧩 | có sẵn | Wildcard |

**Luật combo thú:**
- 2 lá cùng loại (hoặc 1 thú + Siêu Thú) → cướp 1 lá **úp** (người cướp tự chọn).
- 3 lá cùng loại (hoặc 2 + Siêu Thú) → đòi đúng 1 loại bài.
- 5 lá khác loại (tối đa 1 Siêu Thú) → lấy 1 lá từ chồng hạ.
- **Không trộn mèo với thú** trong cùng 1 combo; Siêu Thú chỉ thay cho thú.
- Deck vẫn 150 lá: 5 thú × 4 bản = 20 lá, trừ vào phần bù của Tấn Công.

**Art (theo game-art):** SVG 240×240, nền glow tròn, nét `2.5px`, silhouette đọc được ở 64px, không chữ trong ảnh, mỗi con 1 hue riêng. File: `client/public/cards/{cao-lua,ho-van,chim-ung,ca-chep,huou-sao}.svg`.

**File phải chạm:** `shared/cardTypes.js`, `server/src/constants.js`, `server/src/deckBuilder.js`, `server/src/cardEffects.js`, `client/src/data/cardData.js`, `CardCatalogModal.jsx`, `HomePage.jsx`, `RulesModal.jsx`, `cardSorter.js`, ảnh SVG, test.

### P2 — Animation (landing → lúc chơi)

Hiện trạng: `HomePage` 559 dòng chỉ có 2 cụm `motion`; `GamePage` 1096 dòng **0** chỗ; animation trong ván chỉ có overlay chia bài / rút bài. Xào bài chỉ là chữ, không có hiệu ứng xào.

**Landing**
- Hero: title/subtitle/CTA vào lệch nhau 100ms; 5 lá bài trôi nhẹ (y ±8, 6s loop).
- Scroll: section reveal `whileInView` một lần, stagger 80ms; card fan parallax nhẹ.
- Showcase: hover tilt 3D + lift; focus ring rõ.
- Theme: crossfade nền 300ms.

**Lobby**
- Slot người chơi pop-in (scale 0.9→1, 200ms), badge “Sẵn sàng” nảy 1 lần.

**Trong ván**
- Xào: tách đôi chồng → trộn → úp lại, ~700ms, phát cho cả bàn.
- Chia: mỗi người nhận bài bay từ chồng về đúng avatar, stagger theo ghế (không phải 5 lá giữa bàn như hiện tại).
- Rút: bài bay chồng → tay; chỉ chủ bài thấy mặt trước.
- Đánh: bài bay tay → giữa bàn → chồng hạ.
- Tấn Công: người đánh lao nhẹ về phía mục tiêu + rung màn 120ms + viền đỏ.
- Nope: lá Nope đập lên lá đang chờ + flash; hiện số Nope đã xếp.
- Đổi lượt: banner trượt tên người kế (300ms).
- Imploding: lật bài 600ms, zoom chậm; lá ngửa nằm trên chồng với vòng cảnh báo.
- Nạp Nhiên Liệu: thanh nhiên liệu đầy dần; badge “×3”.
- Combo: các lá đã chọn gom thành quạt, glow, rồi mới chạy hiệu ứng.

**Quy tắc bắt buộc:** chỉ animate `transform`/`opacity`; 150–900ms; không chặn input quá 900ms; `useReducedMotion` bỏ toàn bộ loop; kiểm tra ở 375px.

### P3 — Test & dọn nợ

- Thêm `server/src/gameEngine.test.js`: 15 case ở mục 1.2 + mỗi lá 1 case.
- `_edge-tests.mjs`: bỏ setup random 40 phòng (flaky), dùng state xếp tay; thêm case timer max.
- `_qa-protocol.mjs`: treo — sửa hoặc xoá, thay bằng test unit. Không để script treo trong repo.
- Chạy cuối: `npm test` (server), `npm run build` (client).

---

## 3. PROMPT CHO PHIÊN UPDATE

Dán nguyên khối dưới đây vào phiên mới:

```text
Bối cảnh: repo D:\meow no\meo-no-game — server Node/Express/Socket.IO, client React 18 + Vite + Tailwind + framer-motion. Chạy server: cd server && npm run dev (port 4000). Chạy client: cd client && npm run dev (port 3000). Test: cd server && npm test. KHÔNG commit. KHÔNG thêm dependency. Giữ ponytail ở mức đang bật: sửa tối thiểu, đúng file, không refactor ngoài phạm vi.

Đọc trước: shared/cardTypes.js, server/src/{constants,deckBuilder,cardEffects,customPhase3Effects,gameEngine,stateSanitizer,socketHandlers}.js, client/src/{pages/GamePage.jsx,components/Card.jsx,components/DrawPile.jsx,components/StealCardModal.jsx,components/DefuseModal.jsx,components/CardAnimationOverlay.jsx,components/CardEffectOverlay.jsx,data/cardData.js}, test-report/KE-HOACH-CAP-NHAT.md.

QUYẾT ĐỊNH LUẬT (không tự đổi):
1) Tấn Công: carried = (turnsRemaining > 1 ? turnsRemaining : 0); base = fueled ? 3 : 2; next = carried + base * (boost ? 2 : 1). Ví dụ A đánh B, B đánh ngay → C nhận 4. B đã rút 1 → C nhận 3.
2) Tấn Công Chỉ Định: luôn 2 × (boost?2:1), KHÔNG cộng carried.
3) Imploding Kitten mặt úp: bốc lên → lật faceUp=true → waitingFor='imploding_place' → người bốc tự chọn vị trí (0..drawPile.length) → mới trừ lượt. Mặt ngửa: chết, không Gỡ Bom. Lá ngửa phải hiện trên DrawPile.
4) Trộm Bài và combo 2: chọn người → chọn 1 trong N lá ÚP (không lộ danh tính). Dùng choice kind 'steal_pick' với cardCount; timeout/bot chọn random. Xin Xỏ giữ nguyên (người bị xin tự chọn lá).
5) Nạp Nhiên Liệu (NAP_NHIEN_LIEU): chỉ 1 lần/ván, cờ trong gameState, chặn lần 2. FUEL là lá chết (không có trong deck) — không thêm vào deck, chỉ ghi chú.
6) Tăng Cường: chỉ ghép với lá hiệu ứng tức thời (ATTACK, TAN_CONG_CHI_DINH, TAN_CONG_BAN_THAN, TU_VA, CHIA_SE, HUY_BAI, GIO_GIAI_LAO, HOI_SINH, SIEU_HUY_BAI). Chặn lá nhiều bước (FAVOR, TIM_KIEM, DAO_BOI, BOC_O_DAU_CUNG_DUOC, SEE_THE_FUTURE, ALTER_FUTURE, SHUFFLE, REVERSE, STEAL_CARD, NHAN_BAN, TO_SE_LAY_NO, combo, NOPE, DEFUSE, bom, VUONG_NIEM, TRA_DUA, MOC_RAC, NAP_NHIEN_LIEU). Client và server dùng chung danh sách BOOSTABLE_TYPES.
7) 5 thú mới: cao_lua 🦊 #F97316, ho_van 🐯 #F59E0B, chim_ung 🦅 #0EA5E9, ca_chep 🐟 #14B8A6, huou_sao 🦌 #84CC16. 2 cùng loại (hoặc 1 thú + sieu_thu_cung) → cướp 1 lá úp; 3 → đòi loại; 5 khác loại (tối đa 1 siêu thú) → lấy chồng hạ. Không trộn mèo với thú. 5 × 4 = 20 lá, deck vẫn đúng 150.

NHIỆM VỤ THEO THỨ TỰ:
P0 — sửa luật:
- cardEffects.handleAttack: áp dụng công thức (1), thêm test.
- customPhase3Effects TAN_CONG_CHI_DINH: giữ (2), thêm test.
- Imploding: state + action 'imploding_place' + sanitizer drawPileTop + DrawPile render mặt ngửa + modal đặt bài (tái dùng DefuseModal với mode='imploding', không tiêu Gỡ Bom) + bot/zombie tự đặt.
- Steal pick: server choice 'steal_pick' cho STEAL_CARD và combo 2; client StealCardModal thêm mode='cards' hiện N lưng bài; chọn index; test không lộ bài.
- Nạp Nhiên Liệu: cờ once/game + chặn + test.
- Tăng Cường: BOOSTABLE_TYPES dùng chung; bỏ nhánh boost âm thầm; client combo analyzer khớp; test từng lá.
- SET_TIMERS: max lượt 300s, nope 30s, tương lai 60s (server + TimerSettings).
- Card.jsx: bỏ chữ "BỊ KHÓA" ở cả 2 nhánh, giữ dim + viền đỏ + aria-disabled + title "Bị Làm Phiền".

P1 — 5 thú:
- Thêm type + CARD_META + CARD_DATA + trọng số deck + luật combo + wildcard Siêu Thú + art SVG 240×240 (nền glow, nét 2.5px, silhouette rõ ở 64px, không chữ) + hiện trong catalog/rules/sort.
- Test: combo 2 với wildcard, combo 3, combo 5, mix mèo+thú bị từ chối, deck vẫn 150 lá.

P2 — animation:
- Landing (HomePage + index.css): hero stagger, bài trôi nhẹ, scroll reveal, hover tilt, theme crossfade.
- Lobby: slot pop-in.
- Ván: xào bài thật (tách/trộn/úp), chia bài bay về từng ghế, rút bay về tay, đánh bay ra giữa bàn rồi vào chồng hạ, Tấn Công lao + rung 120ms, Nope đập lên lá đang chờ, banner đổi lượt, Imploding lật 600ms, fuel gauge, combo gom quạt.
- Chỉ transform/opacity, 150–900ms, không chặn input quá 900ms, tôn trọng useReducedMotion, kiểm tra 375px.

P3 — test:
- Tạo server/src/gameEngine.test.js với 15 case ở mục 1.2 của test-report/KE-HOACH-CAP-NHAT.md + mỗi lá 1 case.
- Sửa _edge-tests.mjs: bỏ setup random 40 phòng, dùng state xếp tay; thêm case timer max. _qa-protocol.mjs treo: sửa hoặc xoá.
- Chạy: cd server && npm test; cd client && npm run build.

XONG KHI: npm test xanh toàn bộ (gồm các case ở mục 1.1 và 1.2 của tài liệu); build client không lỗi; không lộ bài đối thủ; deck đúng 150 lá; reduced-motion không chạy animation.
Báo cáo cuối: bảng file đã sửa → thay đổi, kết quả test, và ảnh hưởng tới người chơi cũ.
```

---

## 4. Ghi chú rủi ro

- Đổi luật Tấn Công làm ván dài hơn; bot AI (`botAI.js`) đang giả định 2 lượt, cần đọc `turnsRemaining` thay vì hard-code.
- Thêm `waitingFor='imploding_place'` phải xử lý ở **cả** `findAutoAction` (bot/người mất kết nối) và timeout, nếu không ván treo.
- `steal_pick` là lựa chọn bí mật: không được đưa `cards` vào state; chỉ gửi `cardCount`.
- Xoá script QA cũ có thể mất lịch sử test; giữ file nhưng đánh dấu legacy nếu không sửa kịp.
