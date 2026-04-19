# Cloudflare R2 圖片 CDN（取代 Supabase Storage 存封面）

目標：封面檔放在 **R2**，資料庫只存 **HTTPS 網址**；瀏覽器端已轉 **WebP** 再上傳；顯示時可走 **直連 CDN**（不再經 weserv / Supabase render）。

### 目前專案已建立的 R2 公開網址（可直接用）

根網址：

`https://pub-ce7c60cfbf86416ea5021d2e69486cd1.r2.dev`

請把下面整段貼進 **`.env.local`**（與 **Cloudflare Pages → Environment variables** 中需同步的項對齊）：

```env
# 前端：封面直連 CDN，不經 weserv（二選一即可，建議 HOSTS）
VITE_CDN_COVER_HOSTS=pub-ce7c60cfbf86416ea5021d2e69486cd1.r2.dev
# VITE_CDN_COVER_BASE=https://pub-ce7c60cfbf86416ea5021d2e69486cd1.r2.dev

# 若要 Genre 頁「Upload CDN」按鈕
# VITE_CDN_UPLOAD_ENABLED=true
```

**Pages Function**（Dashboard，非 `VITE_`）：

```env
PUBLIC_ASSETS_BASE=https://pub-ce7c60cfbf86416ea5021d2e69486cd1.r2.dev
SUPABASE_URL=<你的 VITE_SUPABASE_URL>
SUPABASE_ANON_KEY=<與 VITE_SUPABASE_ANON_KEY 相同>
```

**遷移腳本** `MIGRATE_R2_PUBLIC_BASE` 也請用同一個根網址（結尾不要多餘 `/`）。

---

## 你需要在 Cloudflare 做的事（後台操作，無法代你登入）

### A. 建立 R2 Bucket

1. Cloudflare Dashboard → **R2** → **Create bucket**（例如 `mitruyen-covers`）。
2. **公開讀取**：擇一  
   - **R2.dev 子網域**（Bucket → Settings → Public access → Allow），取得類似 `https://pub-xxxxx.r2.dev`；或  
   - 自訂網域（R2 → **Connect Domain**），例如 `https://img.你的網域`。

把最後給使用者看的 **公開根網址** 記下來（不要結尾多餘斜線也可，程式會處理），例如：  
`https://pub-xxxxx.r2.dev`

### B. Cloudflare Pages：綁 R2 + 環境變數

1. **Workers & Pages** → 你的 **Pages 專案**（前端 `dist` 那個）。
2. **Settings** → **Functions** → **R2 bucket bindings**  
   - Variable name 必須是：**`COVERS`**（與 `functions/api/upload-cover.js` 一致）  
   - 選剛才的 bucket。
3. **Settings** → **Environment variables**（Production / Preview 都要）  
   - `PUBLIC_ASSETS_BASE` = 你的公開根網址，例如 `https://pub-xxxxx.r2.dev`  
   - `SUPABASE_URL` = `https://xxx.supabase.co`  
   - `SUPABASE_ANON_KEY` = 與前端相同的 **anon** key（公開金鑰，用來在 Worker 裡驗證 `Authorization: Bearer`）

重新部署一次 Pages。

### C. 前端 Vite 環境變數（建置 / 本地 `.env.local`）

讓 **listCoverUrl** 知道「這個網址已是 CDN 上的 WebP」，不要再用代理縮圖：

```env
VITE_CDN_COVER_HOSTS=pub-xxxxx.r2.dev,img.你的網域
```

或（二選一）用前綴：

```env
VITE_CDN_COVER_BASE=https://pub-xxxxx.r2.dev
```

啟用 **Genre 封面上傳**（需已登入 Supabase）：

```env
VITE_CDN_UPLOAD_ENABLED=true
```

## 上傳流程（已寫在程式裡）

- **Pages Function**：`functions/api/upload-cover.js` → 路由 **`POST /api/upload-cover`**
- 驗證 **Supabase Session**（`Authorization: Bearer <access_token>`）
- 內容為 **WebP bytes**（前端 `imageFileToWebpBlob` 先轉好）
- 寫入 R2 後回傳 `{ url }`，再寫入 `genres.image` 等欄位

本地 `npm run dev` **沒有** Cloudflare Functions，`/api/upload-cover` 會 404；請用 **部署後網站** 測上傳，或使用 `wrangler pages dev`（進階）。

## 把「舊的 Supabase Storage 封面」搬到 R2（選用）

在 **`frontend`** 目錄、本機執行（**不要**把 `MIGRATE_SUPABASE_SERVICE_ROLE` 提交到 Git）：

```bash
# 先填 .env.local：MIGRATE_* 與 MIGRATE_SUPABASE_SERVICE_ROLE
npm run migrate:covers-r2
```

可先乾跑：

```bash
set MIGRATE_DRY_RUN=1
npm run migrate:covers-r2
```

搬完後在 DB 裡的 `cover_url` 會變成 `MIGRATE_R2_PUBLIC_BASE/...`。請務必設定 **`VITE_CDN_COVER_HOSTS`**（或 `VITE_CDN_COVER_BASE`），否則舊邏輯仍可能走 weserv。

## wrangler.toml

專案內 `wrangler.toml` 僅作說明；**R2 綁定以 Pages 後台為準**。若用 Wrangler CLI 部署，再依官方文件補 `[[r2_buckets]]`。

## 安全提醒

- **不要**把 R2 **Secret**、Supabase **service_role** 寫進 `VITE_*` 或前端程式碼。  
- 遷移腳本只用在本機或受信任的 CI，且用 **service role** 僅為批次 `UPDATE novels`。
