# Deploy Mi Truyện frontend to Cloudflare Pages + CDN

我無法替你登入 Cloudflare 或代填密碼／Token；請只在 **Cloudflare Dashboard** 與 **CI 密文** 裡使用憑證，**不要**把 API Token、密碼貼到聊天或 Git。

## 你需要自己做什麼（概要）

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**（或 **Direct Upload** 上傳 `dist`）。
2. 選你的 Git 倉庫與分支。
3. **Build settings**（Monorepo 時很重要）：
   - **Root directory（根目錄）**：`novel-platform/frontend`（若倉庫根就是 frontend 則留空或 `.`）
   - **Build command**：`npm ci` 或 `npm install`，然後 `npm run build`
   - **Build output directory**：`dist`
4. **Environment variables**（在 Pages 專案 → Settings → Environment variables）至少加上與本地 `.env` 相同的：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - 選填：`VITE_SITE_URL` / `SITE_ORIGIN`（你的正式網域，例如 `https://mitruyen.me`）
   - 選填：`PRERENDER_NOVEL_IDS` 或 `PRERENDER_NOVEL_LIMIT`（見下方）
5. 儲存後重新部署一次（讓帶環境變數的 build 跑完）。

## 預渲染（小說介紹頁靜態 HTML）

建置腳本會在 `vite build` 之後執行 `scripts/prerenderNovelIntro.mjs`。在 **Cloudflare Pages 的 Build 環境**裡同樣要設：

- `PRERENDER_NOVEL_IDS=1,2,3` **或**
- `PRERENDER_NOVEL_LIMIT=30`

並確保有 `VITE_SUPABASE_*`，否則預渲染會跳過（不影響整體建置成功）。

## 自訂網域與 CDN

1. Pages 專案 → **Custom domains** → 綁你的網域（例如 `mitruyen.me`）。
2. 依指示在 **DNS** 加 `CNAME`（或依 Cloudflare 指示）。
3. 網域在 Cloudflare 且 **Proxy 開啟（橘雲）** 時，靜態資源會走 Cloudflare 邊緣快取（CDN）；無需把任何「CDN 密鑰」貼給我。

## 專案內已包含

- `public/_redirects`：未命中實體檔案時回退到 `index.html`（React Router）；已預渲染的 `dist/truyen/<id>/index.html` 仍優先由平台當靜態檔提供（行為依平台：通常先找檔案再套用 redirect）。

## 我不需要你提供給「任何人」的資訊

- Global API Key、Account 密碼、**完整** API Token 字串  
若你要除錯建置，可只貼 **錯誤訊息文字**（遮掉專案 ID／Token），或說明「Root directory 設成什麼、output 是否為 `dist`」。

## 我需要你口頭提供的（非機密）

- 倉庫是 **monorepo** 還是 **只有 frontend 一層**（決定 Root directory）。
- 想用 **Git 連 Pages** 還是 **手動上傳** `dist`。

以上即可對照設定；無須把 Cloudflare 帳號交給第三方。
