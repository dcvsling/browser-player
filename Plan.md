# Browser Player AI - Plan

## 1. 目前定位
- 本專案為純前端影片播放器，來源為 OneDrive。
- 技術棧為 HTML / CSS / JavaScript + Vite。
- OAuth 採 MSAL Public Client + PKCE。
- 目前需求基準文件已整理至 `Requirement.md`。

## 2. 已完成項目

### 2.1 基礎建置
- 已建立 `package.json`、`vite.config.js`。
- 已可使用：
- `npm run dev`
- `npm run build`
- `npm run preview`
- 已確認 `index.html`、`auth/index.html`、`404.html` 可正確輸出至 `dist/`。

### 2.2 路由與部署
- 已改用 History API，不使用 hash route。
- 已支援：
- `/player`
- `/playlist`
- `/settings`
- 已加入 `404.html` fallback，支援 GitHub Pages 類型的靜態部署回復路由。
- Azure Static Web Apps workflow 已改為部署目前 Vite build 的 `dist/`。

### 2.3 OAuth 與 OneDrive 整合
- 已完成 MSAL 初始化、登入、登出、redirect 處理。
- 本機 redirect path 已對齊 `/auth`。
- 已完成 Graph API 讀取 OneDrive 指定資料夾影片。
- 已完成 children 全量重建與 delta 增量同步。
- 已完成串流 URL 補水與快取。

### 2.4 播放器
- 已完成自訂播放器控制列。
- 已完成：
- 播放 / 暫停
- 上一部 / 下一部
- 倒退 10 秒 / 快轉 10 秒
- 進度條
- 音量 / 靜音
- 播放速度
- 隨機 / 循環
- 播放清單抽屜
- 自訂全螢幕
- 全螢幕 idle 自動隱藏控制項
- 播放器控制已整合在播放器 overlay 內，不再在播放器下方放獨立功能列。
- 全部可見控制按鈕已改為 Material Symbols Rounded icon。

### 2.5 清單與互動
- 已完成雲端清單、自訂清單、播放器右側播放清單。
- 清單頁已改為整頁不捲動，左右清單各自獨立捲動。
- 清單高度已改為自動撐滿剩餘空間。
- 已完成自訂清單建立、刪除、切換、設為播放器來源。
- 已完成以下互動規則：
- 雲端清單在清單頁只做加入到目前自訂清單
- 已加入時不再移除
- 自訂清單整列點擊為移除
- 自訂清單右側重複的 `-` 按鈕已移除
- 播放器右側播放清單整列點擊為播放

### 2.6 清單顯示模式
- 雲端清單、自訂清單、播放器右側播放清單皆已支援：
- 文字模式
- 縮圖模式
- 三個清單的檢視模式已改為各自獨立保存，不再共用。
- 縮圖模式已改為多欄卡片排列，不是一列一個。
- 清單項目已加入片長顯示。
- 影片 metadata 載入後，片長會回寫到快取中以提高準確性。
- 已補上 Graph `thumbnails` 與 metadata 取得流程；舊快取若缺少縮圖或片長，會強制重建 metadata。
- 清單排序功能尚未實作，目前已確認需求需支援名稱 / 最後更新日期 / 大小，且可遞增 / 遞減排序。

### 2.7 設定與快捷鍵
- 已建立獨立的 `設定` 頁面。
- 已完成快捷鍵啟用開關。
- 已完成快捷鍵自訂編輯與重設。
- 已支援單鍵、`Ctrl`、`Alt`、`Shift` 組合鍵與特殊鍵。
- 設定已保存於 `localStorage`。

### 2.8 帳號顯示
- 右上角帳號區已改為頭像 badge 形式。
- 名稱不常駐顯示，只保留於 title / 無障礙文字。

### 2.9 文件
- 已建立 `Requirement.md`，整合原始需求與目前累積的實作規格。
- 本次已同步更新 `Plan.md`，反映截至目前的實際進度。

## 3. 目前已知待驗證事項
- 需在真實 OneDrive 帳號下確認 `thumbnails` 是否穩定返回；若部分來源仍無縮圖，需決定是否改為本地產生 poster。
- 需以真實帳號驗證片長顯示與實際播放長度在更多影片上的一致性。
- 需在 Chrome / Edge 實測：
- 登入
- 同步
- 播放
- 清單互動
- 全螢幕控制
- 重新整理後狀態恢復

## 4. 後續優先工作
1. 實機驗證縮圖、片長與 OneDrive metadata 的穩定性。
2. 補上清單排序功能，支援名稱 / 最後更新日期 / 大小，以及遞增 / 遞減。
3. 視驗證結果決定是否補做本地縮圖 / poster 產生機制。
4. 驗證正式部署時的 Azure redirect URI 與靜態站路由 fallback 是否完全一致。

## 5. 目前狀態
- 功能開發已達可用階段，現階段重點轉為真實帳號資料驗證與部署前收斂。
