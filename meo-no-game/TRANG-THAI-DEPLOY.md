# 📋 Tóm tắt tiến độ Deploy Mèo Nổ

## Kiến trúc
- **Client** (React + Vite) → Vercel
- **Server** (Express + Socket.IO) → Render.com
- **`shared/`** được Vite bundle vào client, server dùng relative path

---

## Đã làm xong ✅

### File đã tạo/sửa trong repo
| File | Nội dung |
|---|---|
| `meo-no-game/client/vercel.json` | SPA fallback routing cho React Router |
| `meo-no-game/client/.env.example` | Template: `VITE_SOCKET_URL=https://xxx.onrender.com` |
| `meo-no-game/client/vite.config.js` | Proxy chỉ bật khi dev local |
| `meo-no-game/server/railway.toml` | Config Railway (dự phòng) |
| `meo-no-game/server/.env.example` | Template: `CORS_ORIGINS=...` |
| `meo-no-game/server/src/index.js` | Thêm `GET /health` endpoint |
| `meo-no-game/DEPLOY-GUIDE.md` | Hướng dẫn deploy đầy đủ |
| `render.yaml` | Config Render.com |

Tất cả đã được **push lên GitHub** (`caophi1324/Meo-No`, commit `4a1e152`)

---

## Đang dở dang ⚠️

### Render (Server) — chưa rõ trạng thái
- Đã kết nối repo GitHub bằng tài khoản Render mới
- Config cần điền:
  - Root Directory: `meo-no-game/server`
  - Build Command: `npm install`
  - Start Command: `node src/index.js`
  - Env var: `CORS_ORIGINS=https://your-vercel-app.vercel.app`
- **Chưa biết URL server** (dạng `https://xxx.onrender.com`)

### Vercel (Client) — gần xong
- Đã deploy nhưng bị lỗi Output Directory có dấu cách thừa: `"dist "` → phải sửa thành `"dist"`
- **Cần fix:** Settings → Build & Output Settings → Output Directory → sửa `dist ` thành `dist` → Redeploy
- Env var `VITE_SOCKET_URL` chưa điền URL Render thật

---

## Việc cần làm tiếp theo

1. **Render**: Đợi build xong → lấy URL `https://xxx.onrender.com`
2. **Vercel**: Sửa Output Directory `dist ` → `dist` → Redeploy
3. **Vercel**: Cập nhật `VITE_SOCKET_URL` = URL Render thật → Redeploy
4. **Render**: Cập nhật `CORS_ORIGINS` = URL Vercel thật → Save

---

## Lưu ý quan trọng

> Render free tier **ngủ sau 15 phút** không dùng → lần đầu vào game chờ ~30 giây để server wake up. Bình thường!

## Biến môi trường quan trọng

| Nơi | Key | Value |
|---|---|---|
| Vercel | `VITE_SOCKET_URL` | URL Render (vd: `https://meo-no-server.onrender.com`) |
| Render | `CORS_ORIGINS` | URL Vercel (vd: `https://meo-no.vercel.app`) |
