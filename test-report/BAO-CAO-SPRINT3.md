# BÁO CÁO — SPRINT 3: CHỌN BÀI TỪ TAY NGƯỜI KHÁC + MẶT ANIME

Ngày: 25/10/2026. Không commit.

## Kết quả kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| `server/npm test` | **39/39 pass** (30 test cũ + 9 test mới) |
| `client/npm run build` | **pass** (chỉ còn warning bundle >500 kB) |
| `client/node _smoke.mjs` | **pass** (đủ art 2 theme + create/join/start/draw) |
| Ảnh anime | **40/40** file `MN001–MN040.jpg`, đúng **1400×1960**, >30 KB |

## Đã sửa

### A1. Chia Sẻ — victim tự chọn
- `customPhase3Effects.js`: sau Nope, tạo choice `discard_half_pick` cho **victim**, gửi đúng hand của victim, `count = min(hand, ceil(hand/2) × boost)`.
- `gameEngine.js`: xử lý choice, validate đủ số lá/không trùng/không có trên tay, bỏ các lá đã chọn vào discard.
- `turnTimer.js` + `gameActions.js`: bot/timeout chọn random hợp lệ.
- Client dùng `ChoiceModal` (multi-select chính tay mình).

### A2. Hủy Bài — attacker tự chọn lá úp
- `customPhase3Effects.js`: tạo choice `destroy_pick` cho attacker, chỉ gửi `cardCount`, không gửi danh tính lá.
- `gameEngine.js`: validate index đủ/không trùng/trong range; splice đúng vị trí sang discard.
- Boost x2 chọn 4 lá (hoặc hết tay).
- Client hiện lưới lá úp, chọn nhiều rồi xác nhận.

### A3. Móc Rác / Trả Đũa — reaction_pick
- Giữ bước 1: victim chọn lá phản đòn hoặc bỏ qua.
- Bước 2 mới: victim nhận `reaction_pick`, tự chọn 2 lá úp từ tay thief; server chuyển đúng 2 lá, lá phản đòn vào discard.
- Tôn trọng Vương Niệm của thief; nếu bị chặn thì không mở picker.
- Đã nối cho: Trộm Bài, combo 2 (qua `steal_pick`), combo 3, Sao Chép copy hành động trộm, Nhân Bản / Tớ Sẽ Lấy Nó.
- Thêm hiệu ứng/âm thanh `reaction_steal` trong `CardEffectOverlay` (một event một âm thanh).

### A4. Text UI
- Bỏ chữ “random/ngẫu nhiên” ở Trộm Bài, Hủy Bài, Móc Rác/Trả Đũa, Giờ Giải Lao, Tiệc Tùng.
- Mô tả mới nằm trong `cardData.js`, `customPhase3Data.js`, `customCards.js`; effect vẫn tra được trong inspector/catalog.

### A5. Sao Chép
- Bỏ fallback random target.
- Nếu target cũ không hợp lệ: mở choice `copy_target` cho người chơi chọn; bot/timeout chọn random hợp lệ.
- Hỗ trợ cả action cần target thường, FAVOR và SUPER_DESTROY.

### A5. Tiệc Tùng — từng người tự chọn
- `customPhase3Effects.js`: dựng hàng đợi từ người đánh theo chiều lượt; mỗi người nhận choice `party_pick` với chính tay mình, chọn 1 lá úp lên đầu `drawPile`.
- `gameEngine.js`: xử lý tuần tự, lưu `pendingParty` phía server (không gửi ra client), tự chuyển người kế; hết hàng đợi thì trả lượt.
- Bot/timeout chọn random 1 lá hợp lệ.

### A5. Giờ Giải Lao — người đánh tự chọn lá để xem
- Bỏ random 3 lá. Người đánh nhận choice `reveal_pick` với `cardCount` của mục tiêu, chọn đúng 3 lá úp (boost x2 chọn 6).
- Server chỉ trả danh tính 3 lá đã chọn cho người đánh qua `see_the_future`/`SEE_FUTURE_RESULT`; mục tiêu không thấy lá nào bị xem.
- Không lấy bài khỏi tay mục tiêu; chỉ xem.

### B. Nạp Nhiên Liệu
- `deckBuilder.js`: luôn đúng **1 lá/ván** cho 2–5 người; phần dư dồn sang Tấn Công, tổng vẫn 150.
- Cờ `napNhienLieuUsed` giữ nguyên.

### C. Mặt bài anime
- `tools/make-anime-cards.ps1`: render 1400×1960, JPEG quality 90, chỉ còn **ảnh full-bleed + một tên ở trên cùng** (scrim tối, tối đa 2 dòng).
- Bỏ subtitle, effect, pill category, mã MN, chữ MÈO NỔ khỏi mặt ảnh.
- Đã tái tạo 40 ảnh từ cache gốc (`-ReuseCache`), không đổi bộ default, không đụng 5 ảnh thú.
- `Card.jsx`: bỏ dòng `shortTip` dưới ảnh; header chỉ còn một tên; effect vẫn ở inspector/catalog.
- Nguồn cache có ảnh nhỏ hơn 1400×1960 được upscale bicubic; không chạy Real-ESRGAN/waifu2x (không thêm dependency/model).

### D. Bộ Liên Minh (mới)
- Thêm theme `lol` vào `shared/decks.js`; chọn được trong lobby như default/anime.
- `tools/make-lol-cards.ps1`: tải **150 ảnh loading art của skin** (không dùng skin mặc định) từ Data Dragon vào `client/public/cards/lol/` (~7.7 MB) và sinh `shared/lolChampions.js`.
- Chọn skin theo bậc cao nhất từ CommunityDragon (`Transcendent > Mythic > Legendary > Epic`), ưu tiên không legacy rồi mới nhất; 5 tướng thú được ghim skin cao cấp.
- 5 lá thú cố định: Cáo Lửa → **Ahri** (Risen Legend), Hổ Vằn → **Nasus** (Infernal), Chim Ưng → **Teemo** (Omega Squad), Cá Chép → **Yuumi** (Prestige Cyber Cat), Hươu Sao → **Lillia** (Petals of Spring). Mọi bản sao cùng loại dùng chung một ảnh.
- 130 lá còn lại nhận 130 tướng/skin khác nhau (không trùng 5 tướng thú); `deckBuilder.js` gán `lolImage`, `lolName`, `lolSkinName`.
- `Card.jsx`: tiêu đề lá thú là tên tướng; các lá khác giữ tên chức năng, phụ đề là tên skin; emoji thú đổi theo tướng (🦊🐺🦡🐱🦌).
- `socketHandlers.js`: đổi `nameVN` của lá thú sang tên tướng khi theme `lol` để game log không còn hiện tên con vật cũ.
- Preview lobby và ảnh Nope dùng mapping tĩnh (`Ahri`, `Garen`, `Jinx`, `Lux`, `Darius`).
- Ảnh loading 308×560, CSS cover/crop; không upscale, không thêm dependency.
- Lưu ý: art tướng thuộc Riot Games, dùng cho mục đích cá nhân/fan; không affiliate.

## Chưa làm / rủi ro

- Chưa chạy tay 2 trình duyệt thật cho luồng Móc Rác / Tiệc Tùng / Giờ Giải Lao và theme Liên Minh; engine + UI đã có test/compile nhưng nên smoke tay một ván.
- Cấu trúc `shared/` cho Vercel vẫn như cũ (client import `../../../shared`); chưa gộp/copy trong sprint này.
- Bundle client tăng nhẹ (514 kB) do thêm UI choice; warning >500 kB vẫn còn.
