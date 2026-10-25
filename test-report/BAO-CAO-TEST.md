# 🧪 BÁO CÁO KIỂM THỬ — MÈO NỔ (meo-no-game)

- **Ngày test:** 17/10/2026 (~16:55–17:15)
- **Người test:** AI agent (OpenCode v2.0.32) + skill `agent-browser` 0.39.1 (Chrome 155 headless CDP)
- **Đối tượng:** `D:\meow no\meo-no-game` — server Express + Socket.IO (@4000), client React + Vite (@3000)
- **Phương pháp:**
  1. Smoke test UI thật qua trình duyệt (2 phiên agent-browser độc lập)
  2. Đọc toàn bộ mã nguồn server/client/shared
  3. Script mô phỏng người chơi thật qua socket.io: `client\_qa-protocol.mjs` (4 phiên + probe bảo mật + probe DoS)
  4. Đối chiếu ma trận sự kiện socket (emit ↔ listen) và grep dead code
  5. Chụp màn hình 1280px + responsive 375×667

> **KẾT LUẬN NHANH: ❌ KHÔNG THỂ CHƠI END-TO-END Ở TRẠNG THÁI HIỆN TẠI.**
> 3 lỗi chặn (blocker), trong đó **1 lỗi làm server sập ngay khi bấm "BẮT ĐẦU GAME"**.
> Theo quy tắc QA (dừng khi gặp lỗi chặn cứng), phần game-play đầy đủ **chưa thể kiểm thử runtime** — nhưng toàn bộ nguyên nhân đã được rà soát tĩnh và ghi đủ bên dưới.
> **Không có dòng code sản phẩm nào bị sửa trong lúc test.** Server đã được khởi động lại sau crash.

---

## 1. Bảng tổng hợp phát hiện

| # | Mức | Lỗi | Trạng thái bằng chứng |
|---|-----|-----|------------------------|
| B1 | 🔴 CHẶN | Server crash khi bắt đầu game — `ReferenceError: CONFIG is not defined` (deckBuilder.js) | ✅ Đã tái hiện runtime (stack trace) |
| B2 | 🔴 CHẶN | UI không bao giờ điều hướng Home→Lobby và Lobby→Game | ✅ Đã tái hiện trên trình duyệt |
| B3 | 🔴 CHẶN | Kiến trúc: mỗi trang tạo 1 socket mới → mất danh tính phòng khi chuyển trang/reload | ✅ Đã tái hiện (log server + lobby 0 người) |
| B4 | 🟠 CAO | Nope "hủy hành động" xử lý sai: lá bị 1 nope vẫn được thi hành khi hết cửa sổ | 🔍 Phân tích tĩnh (bị chặn bởi B1) |
| B5 | 🟠 CAO | 3 nhánh broadcast lẫn trạng thái cá nhân → LỘ tay bài cả phòng + desync UI | 🔍 Phân tích tĩnh (bị chặn bởi B1) |
| B6 | 🟠 CAO | "Bỏ Lượt" không kết thúc lượt; "Tấn Công" không cho người kế 2 lượt | 🔍 Phân tích tĩnh (bị chặn bởi B1) |
| B7 | 🟠 CAO | "Nhìn Tương Lai": không gửi kết quả cho người chơi; top-3 lá bị phát cho TẤT CẢ (lộ tin) | 🔍 Tĩnh + ma trận sự kiện |
| B8 | 🟠 CAO | "Xin Bài": UI gửi `targetPlayerId: undefined` → lỗi; không có UI giao bài; server không emit `favor_request` | 🔍 Tĩnh + ma trận sự kiện |
| B9 | 🟠 CAO | Combo mèo: UI không chọn được mục tiêu; `steal_result` bị client bỏ qua; handler `steal_choose` dùng cả bàn tay thay vì lá đã chọn | 🔍 Tĩnh |
| B10 | 🟠 CAO | `defuse_place` không validate ngữ cảnh → TypeError = **sập server (DoS)** | 🔍 Tĩnh (probe chưa chạy được vì B1) |
| B11 | 🟡 VỪA | **12 components = dead code** — không file nào được import; GamePage viết lại inline thiếu modal | ✅ grep: 0 kết quả import |
| B12 | 🟡 VỪA | `INITIAL_HAND_SIZE = 4` (5 lá/người) ≠ guide (7+1 = 8 lá) | ✅ Code |
| B13 | 🟡 VỪA | Reconnect chưa hoạt động: `player_reconnected` không bao giờ phát; reload/chuyển trang = bị xóa khỏi phòng sau 60s | 🔍 Tĩnh + log |
| B14 | 🟡 VỪA | `start_game` không kiểm tra trạng thái → bấm lại giữa ván = chia bài lại từ đầu | 🔍 Tĩnh |
| B15 | 🟡 VỪA | Tên người thắng hiển thị "undefined" (sanitizer gửi `winner` = id; UI đọc `winner.name`) | 🔍 Tĩnh |
| B16 | 🟢 THẤP | Nope popup hiện cả cho người vừa đánh lá; không có đếm ngược; nút không kiểm tra sở hữu lá | 🔍 Tĩnh |
| B17 | 🟢 THẤP | Modal Gỡ Bom: ô nhập vị trí không hoạt động (luôn gửi 0); nút "Hủy" không làm gì | ✅ Code |
| B18 | 🟢 THẤP | `store.playerId` luôn `null` (đọc `socket.id` trước khi connect) | ✅ Tái hiện (state browser) |
| B19 | 🟢 THẤP | `toggleSelectCard` nhận object nhưng so sánh id → khó bỏ chọn lá | 🔍 Tĩnh |
| B20 | 🟢 THẤP | Rút bài khi cả chồng rút + chồng hạ đều rỗng → crash tiềm ẩn (`drawnCard` undefined) | 🔍 Tĩnh |
| B21 | 🟢 THẤP | "Xáo Trộn" không có cửa sổ Nope; "Phủ Nhận" dùng được ngoài cửa sổ (vẫn trừ bài) | 🔍 Tĩnh |

---

## 2. Chi tiết 3 lỗi CHẶN

### B1 — 💥 Server crash khi bắt đầu game (nghiêm trọng nhất)
- **Hiện tượng:** bấm "🚀 BẮT ĐẦU GAME" → toàn bộ client nhận "transport close"; tiến trình server thoát (code 1).
- **Stack trace thật:**
  ```
  ReferenceError: CONFIG is not defined
      at dealCards (file:.../server/src/deckBuilder.js:42:25)
      at GameEngine.initGame (.../gameEngine.js:15:33)
      at Socket.<anonymous> (.../socketHandlers.js:44:32)
  ```
- **Nguyên nhân:** `deckBuilder.js` import `{ CARD_COUNTS, CARD_META }` từ `constants.js` nhưng dùng `CONFIG.INITIAL_HAND_SIZE` mà **không import `CONFIG`**.
- **Ảnh hưởng:** Không ván nào có thể bắt đầu → mọi luồng phía sau chưa từng chạy thật (đây là gốc rễ khiến nhiều lỗi khác "ẩn").
- **Sửa đề xuất:** thêm `CONFIG` vào import; đặt `INITIAL_HAND_SIZE: 7` theo guide (kèm B12); thêm guard số người 2–6 trong `dealCards`.
- **Bằng chứng:** `server-crash-log.txt` (đã lưu).

### B2 — 🧭 UI không điều hướng (đi tới đâu cũng đứng yên)
- `HomePage.jsx`: có `const navigate = useNavigate()` nhưng **không gọi ở bất kỳ đâu**; sau khi tạo phòng, store đã có `roomCode` nhưng URL vẫn `http://localhost:3000/` (kiểm chứng runtime: `roomCode = "WNW0S"`, `lobbyPlayers = 1`, URL không đổi).
- `LobbyPage.jsx`: cũng không gọi `navigate`; **không có cơ chế chuyển sang `/game/:code`** khi ván bắt đầu (server cũng không emit `game_start`; client không lắng nghe trạng thái `playing` để chuyển trang).
- **Hệ quả:** người dùng thật không thể vào phòng chờ/vào bàn chơi qua UI.
- **Sửa đề xuất:** 
  - HomePage: `useEffect(() => { if (roomCode) navigate('/lobby/' + roomCode) }, [roomCode])`
  - LobbyPage: khi nhận state có `status === 'playing'` → `navigate('/game/' + roomCode)` (đăng ký listener từ socket dùng chung).
- **Bằng chứng:** output test (URL không đổi + state store) + code refs trên.

### B3 — 🔌 Mỗi trang tạo 1 socket mới (lỗi kiến trúc hệ thống)
- `useSocket()` gọi `io(SOCKET_URL)` trong `useEffect` của **từng trang**; unmount thì `socket.disconnect()` (useSocket.js:12–15, 53–55). HomePage, LobbyPage, GamePage đều gọi hook này → mỗi lần chuyển trang là "thành người chơi mới".
- **Hệ quả dây chuyền:** tham gia phòng bằng socket A → chuyển trang → socket A chết → (a) server coi bạn là người đã mất kết nối; (b) kiểm tra "chỉ chủ phòng" thất bại; (c) không nhận được `game_state_update` (server emit theo `p.id`).
- **Kiểm chứng runtime:** log server tăng dòng "Người chơi kết nối" mỗi lần mở trang; vào thẳng `/lobby/WNW0S` → hiện "Người chơi (0/5)" dù phòng đang có người.
- **Sửa đề xuất:** tạo `client/src/socket.js` — module singleton `export const socket = io(...)`; đăng ký **toàn bộ** listeners 1 lần (App/Provider); các trang dùng chung các hàm emit; thay `useSocket` bằng hook đọc từ singleton; thêm `socket.on('connect', ...)` để cập nhật `playerId` (kèm fix B18).
- **Bằng chứng:** `03-lobby-truc-tiep-url.png`, log server, code refs.

---

## 3. Chi tiết các lỗi CAO (đã phân tích tĩnh)

### B4 — Nope resolve sai parity
- Khi lá bị nope 1 lần (`nopeCount = 1`) mà không ai nope tiếp, cả **nhánh timer 5 giây** (socketHandlers.js:79–87, 173–182) lẫn **nhánh nope_pass** (199–200) đều gọi `executePendingAction` → **hành động bị nope vẫn được thi hành**; không nơi nào gọi `cancelPendingAction` (hàm này đã viết sẵn nhưng không được dùng khi lẻ).
- **Sửa:** tại cả 3 điểm resolve: `nopeCount % 2 === 1` → `cancelPendingAction` (trả bài về tay người đánh); chẵn → `executePendingAction`.

### B5 — Broadcast lẫn trạng thái cá nhân (lộ tay bài)
- 3 vị trí phát `game_state_update` **đã sanitize cho 1 người** nhưng **broadcast toàn phòng**: socketHandlers.js:82, :176, :200 (`io.to(roomCode).emit(..., sanitizeStateForPlayer(gs, socket.id))`).
- Mọi người trong phòng nhận `myHand` của người thao tác → **vừa lộ thông tin, vừa desync UI** ở mọi thao tác đi qua cửa sổ nope.
- **Sửa:** lặp theo `room.players.forEach(p => io.to(p.id).emit(..., sanitize(gs, p.id)))` như các nhánh thường.

### B6 — Bỏ Lượt / Tấn Công không kết thúc lượt
- `handleSkip`: chỉ `turnsRemaining -= 1`, **không `nextTurn`** → server vẫn gửi `your_turn` cho chính người vừa đánh (index chưa đổi) → muốn thoát lượt phải tự rút bài.
- `handleAttack`: `turnsRemaining += 2` trên state của chính mình rồi cũng không `nextTurn`; khi người sau rút bài, `nextTurn` **reset `turnsRemaining = 1`** → hiệu ứng Tấn Công mất hoàn toàn.
- **Sửa:** Skip → kết thúc lượt + chuyển người kế; Attack → kết thúc lượt + gán `turnsRemaining = 2` **cho người kế** (chốt quy ước 2 người chơi theo guide); sửa `nextTurn` để không ghi đè giá trị vừa gán.

### B7 — Nhìn Tương Lai: vừa không xem được, vừa lộ top-3
- Server **không bao giờ emit** `see_future_result` (client có nghe — vô dụng). Kết quả top-3 nằm trong `card_played` **broadcast toàn phòng** (socketHandlers.js:93).
- **Sửa:** emit `see_future_result` riêng cho người chơi (`io.to(playerId)`); loại `cards` khỏi payload broadcast.

### B8 — Xin Bài (Favor) không chơi được
- UI gửi `targetPlayerId: undefined` (GamePage.jsx:76–85) → server báo "Người chơi mục tiêu không tồn tại".
- Không có màn hình chọn đối thủ và màn hình giao bài (`favor_give` chưa nối UI); server không emit `favor_request`.
- **Sửa:** thêm bước chọn mục tiêu khi đánh Favor (và Combo); modal giao bài cho người bị xin; server emit `favor_request` cho target.

### B9 — Combo mèo / cướp bài
- UI: không chọn được mục tiêu (như B8); `steal_result` server có phát nhưng client không nghe → không hiển thị kết quả.
- Server: handler `steal_choose` (socketHandlers.js:223–255) dùng **độ dài cả bàn tay** (`currentPlayer.hand.length`) để quyết định combo 2/3/5 lá — sai logic, cần truyền đúng các lá đã chọn.
- **Sửa:** thống nhất luồng chọn lá combo → chọn mục tiêu → server validate đúng bộ lá; phát `steal_result` và hiển thị.

### B10 — 💣 DoS: `defuse_place` ngoài ngữ cảnh làm sập server
- `placeExplodingKitten` (gameEngine.js:237–254) truy cập `gameState.pendingAction.card` mà không kiểm tra `pendingAction` tồn tại/đúng loại/đúng người. Người chơi chỉ cần **đang giữ 1 lá Gỡ Bom** và gửi lệnh sai thời điểm → **TypeError → sập tiến trình server** (cùng lớp lỗi với B1).
- **Sửa:** validate `pendingAction?.type === 'defuse' && pendingAction.playerId === playerId`; validate `position` (số, clamp); trả lỗi thay vì throw; cân nhắc bọc try/catch an toàn cho toàn bộ handler socket.
- **Ghi chú:** probe runtime (mục T6 của script) sẽ chạy ở đợt re-test sau khi sửa B1.

---

## 4. Những phần HOẠT ĐỘNG TỐT (điểm sáng)

- ✅ Hạ tầng chạy ổn định: Express + Socket.IO + Vite khởi động sạch, log rõ ràng.
- ✅ Quản lý phòng cơ bản đúng: tạo phòng trả mã; join sai mã bị chặn; **người không phải chủ phòng không start được** (2 mục này đã PASS runtime trước khi crash).
- ✅ Chặn thao tác server-side được thiết kế đủ: kiểm tra lượt, kiểm tra sở hữu lá, kiểm tra thành viên phòng (đọc code — logic hợp lý).
- ✅ `stateSanitizer` (luồng thường) đúng hướng: đối thủ chỉ lộ `cardCount`; chỉ gửi `drawPileCount`; `gameLog` cắt 20 dòng — **trừ 3 điểm broadcast sai (B5)** và winner id (B15).
- ✅ Bộ bài 56 lá chuẩn (4 Mèo Nổ, 6 Gỡ Bom, 5 Nope, đủ 5 loại mèo…); logic chia bài (Mèo Nổ = số người − 1) đúng.
- ✅ UI render đẹp: trang chủ + phòng chờ đúng theme tối/cam, bố cục gọn; **responsive 375×667 đạt**; đủ **14 SVG** lá bài.
- ✅ Code tổ chức tốt về cấu trúc (engine / effects / deck / sanitizer tách bạch) — nền tảng sửa nhanh.

---

## 5. Chưa có so với guide (để đợt bổ sung sau)

- ❌ Bước 10 — Bot AI (`server/src/botAI.js`) và nút "Chơi với máy".
- ❌ `ChatBox.jsx`, `RulesModal.jsx` (mục 7.13/7.14 guide).
- ❌ Âm thanh (mục 9.6), font Fredoka/Nunito, hiệu ứng nâng cao.
- ❌ 12 components **dead code** chưa được nối vào GamePage: Card, CardHand, DefuseModal, DiscardPile, DrawPile, GameBoard, GameLog, GameOverModal, NopePopup, PlayerSlot, SeeTheFutureModal, StealCardModal (B11).
- ⏳ Bộ luật đầy đủ (combo 3 lá đòi bài cụ thể, combo 5 lá lấy từ chồng hạ, Tấn Công 2 lượt…) — chờ re-test sau fix.

---

## 6. Kế hoạch khắc phục đề xuất

### Giai đoạn 1 — "Chơi được end-to-end" (ưu tiên)
1. **B1 + B12:** import `CONFIG`; `INITIAL_HAND_SIZE: 7`; guard số người 2–6.
2. **B3:** socket singleton + đăng ký listeners một chỗ; cập nhật `playerId` theo sự kiện `connect` (kèm B18).
3. **B2:** điều hướng Home→Lobby→Game (+ chuyển trang khi `status === 'playing'`).
4. **B4, B5, B6, B7:** sửa luật Nope / broadcast per-player / Skip–Attack / phát `see_future_result` + bỏ lộ top-3.
5. **B8, B9:** luồng chọn mục tiêu & giao bài (Favor/Combo) + hiển thị `steal_result`.
6. **B10, B14, B15, B20:** validate an toàn chống crash + guard nhỏ.
7. **B16–B19:** chỉnh nhỏ UI (defuse input, nope popup, toggleSelectCard…).

### Giai đoạn 2 — Hoàn thiện theo guide
8. Nối 12 components vào GamePage theo thiết kế guide (GameBoard, CardHand, modal…).
9. ChatBox + RulesModal + nút "Chơi với máy" + Bot AI (Bước 10, kèm luật chống gian lận đã ghi trong guide).
10. Âm thanh/font/hiệu ứng; dọn dead code sau khi nối.

### Kiểm thử lại sau khi sửa
- Chạy lại `node client\_qa-protocol.mjs` (script đã nằm sẵn, tự chấm PASS/FAIL theo luật — gồm cả probe DoS T6).
- Kịch bản browser 3 phiên thật (mở rộng từ đợt này) + chụp ảnh bàn chơi.
- Chạy checklist cuối trong `HUONG-DAN-THUC-HIEN.md`.

---

## 7. Phụ lục — bằng chứng

| File | Nội dung |
|------|----------|
| `01-trang-chu.png` | Trang chủ @1280px |
| `03-lobby-truc-tiep-url.png` | Vào thẳng `/lobby/WNW0S` → "Người chơi (0/5)" (minh chứng B3) |
| `04-home-375px.png`, `05-lobby-375px.png` | Responsive 375×667 đạt |
| `protocol-output.txt` | Kết quả script protocol (dừng tại crash B1) |
| `server-crash-log.txt` | Stack trace `CONFIG is not defined` (B1) |
| `client\_qa-protocol.mjs` | Script tái sử dụng cho đợt re-test |
| `ab-core.md` | Hướng dẫn agent-browser dùng trong đợt test này |

**Đính chính kỹ thuật:** dòng "T1.2 lobby đủ 3 người" báo FAIL trong `protocol-output.txt` là **lỗi race của chính script test** (sự kiện `lobby_update` của bước tạo phòng bị hàm `once` bắt trước), **không phải lỗi sản phẩm**. Các dòng FAIL phía sau đều là hệ quả trực tiếp của B1 (server đã chết giữa chừng). Script sẽ được chỉnh lại trong lần chạy re-test.
