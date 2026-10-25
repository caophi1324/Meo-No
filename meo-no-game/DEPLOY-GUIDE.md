# 🚀 Hướng dẫn Deploy Mèo Nổ

> **Tóm tắt:** Server → Railway | Client → Vercel

---

## Bước 1 — Deploy Server lên Railway

### 1.1 Chuẩn bị repo

Đảm bảo `meo-no-game/` đã được push lên GitHub (cần cả `server/` và `shared/` trong cùng repo).

```
meo-no-game/
├── shared/      ← server cần file này
└── server/
    ├── src/
    ├── railway.toml
    └── package.json
```

### 1.2 Tạo project trên Railway

1. Vào [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Chọn repo của bạn
3. Railway hỏi **"Root Directory"** → nhập: `meo-no-game/server`

> [!IMPORTANT]
> Phải set Root Directory là `meo-no-game/server`, không phải root repo.  
> File `railway.toml` trong `server/` sẽ được Railway đọc tự động.

### 1.3 Set biến môi trường trên Railway

Vào **Variables** tab, thêm:

| Key | Value |
|---|---|
| `PORT` | `4000` (Railway sẽ override bằng PORT của họ — để mặc định) |
| `CORS_ORIGINS` | `https://your-app.vercel.app` ← điền sau khi có URL Vercel |

### 1.4 Lấy URL server

Sau khi deploy xong, vào **Settings → Networking → Generate Domain**.  
URL dạng: `https://meo-no-game-server.up.railway.app`

---

## Bước 2 — Deploy Client lên Vercel

### 2.1 Tạo project trên Vercel

1. Vào [vercel.com](https://vercel.com) → **Add New Project** → Import GitHub repo
2. Vercel hỏi **"Root Directory"** → nhập: `meo-no-game/client`
3. Framework preset: **Vite** (Vercel tự detect)

### 2.2 Set biến môi trường trên Vercel

Vào **Settings → Environment Variables**, thêm:

| Key | Value |
|---|---|
| `VITE_SOCKET_URL` | `https://meo-no-game-server.up.railway.app` ← URL Railway ở Bước 1.4 |

> [!WARNING]
> Biến Vite **BẮT BUỘC** phải có prefix `VITE_` mới được bundle vào client.

### 2.3 Deploy

Click **Deploy**. Vercel sẽ chạy `vite build` và serve `dist/`.

File `vercel.json` trong `client/` đã cấu hình sẵn SPA fallback — React Router sẽ hoạt động đúng.

---

## Bước 3 — Cập nhật CORS trên Railway

Sau khi có URL Vercel (vd: `https://meo-no.vercel.app`):

1. Quay lại Railway → **Variables**
2. Sửa `CORS_ORIGINS` = `https://meo-no.vercel.app`
3. Railway tự restart server

---

## Kiểm tra

- Truy cập URL Vercel → trang home load được ✅
- Tạo phòng → lobby hiển thị ✅
- Kiểm tra Railway logs không có lỗi CORS ✅

---

## Sơ đồ

```
Browser
  │  HTTPS (React SPA)
  ▼
Vercel CDN  (client/dist)
  │  WebSocket wss://
  ▼
Railway Server  (server/src/index.js)
  │  import ../../shared/
  ▼
shared/cardTypes.js, events.js, decks.js
```

---

## Ghi chú dev local

```bash
# Terminal 1 — chạy server
cd meo-no-game/server
node src/index.js

# Terminal 2 — chạy client  
cd meo-no-game/client
npm run dev
# Proxy /socket.io → localhost:4000 tự động (không cần VITE_SOCKET_URL)
```
