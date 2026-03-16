# Browser Player AI

純前端影片播放器，使用 Microsoft OAuth 與 Microsoft Graph 從 OneDrive 讀取 mp4 影片，無需後端。

## 本機開發

```bash
npm install
npm run dev
```

- 開發網址：`http://localhost:4200`
- OAuth 回呼網址：`http://localhost:4200/auth`
- 頁面路由：`/player`、`/playlist`，不使用 `/#/`

正式打包：

```bash
npm run build
```

打包後輸出在 `dist/`。

GitHub Pages 部署時，`404.html` 會負責把 `/player`、`/playlist` 這類直接進入的路由倒回主入口，再由前端還原成乾淨網址。

## 目前設定檔

主要設定在 `[src/config.js](./src/config.js)`：

- `auth.clientId`：Azure App Registration 的 Application (client) ID
- `auth.tenantId`：租戶 ID 或 `common` / `consumers` / `organizations`
- `auth.scopes`：目前使用 `User.Read`、`Files.Read`、`Files.Read.All`
- `auth.redirectPath`：目前為 `/auth`
- `graph.childrenEndpoint`：目標 OneDrive 資料夾的 Graph children API

## Azure App Registration 設定

1. 到 Azure Portal 建立或開啟 App Registration。
2. 在 `Authentication` 新增 `Single-page application (SPA)` redirect URI。
3. 本機開發至少加入：
   - `http://localhost:4200/auth`
4. 若要部署到正式網址，也要加入對應的：
   - `https://你的網域/auth`
5. 在 `API permissions` 加入 Microsoft Graph delegated permissions：
   - `User.Read`
   - `Files.Read`
   - `Files.Read.All`
6. 若租戶或帳號類型有限制，確認 `Supported account types` 與 `src/config.js` 的 `authority` / `tenantId` 一致。

## OneDrive 資料夾設定

`graph.childrenEndpoint` 需要指向你要掃描的資料夾，例如：

```text
https://graph.microsoft.com/v1.0/drives/{driveId}/items/{itemId}/children
```

可用 Graph Explorer 或你自己的工具先找到：

- `driveId`
- 目標資料夾的 `itemId`

目前程式會：

- 從該資料夾開始掃描 mp4
- 依設定遞迴子資料夾
- 保存 deltaLink、資料夾 cTag 與上次同步時間
- 在需要播放時補抓實際下載串流網址

## 部署注意事項

- 靜態站台必須能提供 `/auth` 對應到 `auth/index.html`。
- GitHub Pages 路由回復依賴 `404.html`，播放器頁面可直接使用 `/player`、`/playlist`。
- `/auth` 不走 SPA 路由，`404.html` 會特別轉到 `auth/index.html`，保留 OAuth callback 參數。
- 瀏覽器通常要求使用者先互動後才能自動播放影片。
- Graph `@microsoft.graph.downloadUrl` 具時效性，程式已內建過期後重新補抓。

## 驗證清單

1. 進入首頁後應自動導向 `/auth` 完成登入。
2. 登入成功後應回到首頁並自動同步 OneDrive mp4 清單。
3. 可以播放、暫停、切歌、調整音量與速度。
4. 重整頁面後，播放偏好與播放位置應從 `localStorage` 恢復。
5. 登出後，雲端清單、播放器來源與同步快取應被清空。
