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
- 已移除 Azure Static Web Apps deploy action，改為 GitHub Pages 官方 actions 流程：
- build
- upload artifact
- deploy-pages
- 已不再依賴 Azure deployment token。

### 2.3 OAuth 與 OneDrive 整合
- 已完成 MSAL 初始化、登入、登出、redirect 處理。
- 本機 redirect path 已對齊 `/auth`。
- 已完成 Graph API 讀取 OneDrive 指定資料夾影片。
- 已完成 children 全量重建與 delta 增量同步。
- 已完成串流 URL 補水與快取。
- 已補上舊 PWA / 舊 service worker 清理機制，站台啟動時會嘗試註銷舊 SW 並清理舊 cache。
- 已將 metadata 補正改為快取版本升級機制，不再因缺縮圖 / 片長而每次進站都觸發完整雲端重建。

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
### 2.7 清單排序
- 已完成雲端清單、自訂清單、播放器右側播放清單的獨立排序功能。
- 已支援排序欄位：
- 名稱
- 最後更新日期
- 大小
- 已支援遞增 / 遞減切換。
- 排序設定已保存於 `localStorage`。
- OneDrive track model 已補入 `sizeBytes`，供大小排序使用。

### 2.8 設定與快捷鍵
- 已建立獨立的 `設定` 頁面。
- 已完成快捷鍵啟用開關。
- 已完成快捷鍵自訂編輯與重設。
- 已支援單鍵、`Ctrl`、`Alt`、`Shift` 組合鍵與特殊鍵。
- 設定已保存於 `localStorage`。

### 2.9 帳號顯示
- 右上角帳號區已改為頭像 badge 形式。
- 名稱不常駐顯示，只保留於 title / 無障礙文字。

### 2.10 文件
- 已建立 `Requirement.md`，整合原始需求與目前累積的實作規格。
- 本次已再次同步更新 `Requirement.md` 與 `Plan.md`，反映部署、舊快取清理、排序功能與同步策略修正。

### 2.11 手機版與 PWA 收斂（2026-03-20）
- 已重建可安裝 PWA 基礎：
- `manifest.webmanifest`
- `sw.js`
- Android icon（192 / 512）
- 已加入安裝提示按鈕與 service worker 註冊流程。
- 已優化首次同步流程：優先嘗試 delta 初始化，失敗才回退 children 重建。
- 手機版 `player` 頁面已改為滿版播放優先，控制項改為可收合顯示，降低 UI 覆蓋衝突。
- 手機版播放清單抽屜互動已修正：
- 右上播放清單按鈕固定可點擊，不再被上方區塊攔截。
- 橫向模式抽屜改為滿高側欄，清單改為上下捲動。
- 手機版 `playlist` 頁面已改為：
- 直向上下各半、橫向左右各半。
- 兩區以邊線與底色強化分隔。
- 預設僅顯示清單名稱，需要時可展開工具列。
- 已恢復手機版自訂清單操作能力：
- 新增清單
- 刪除清單
- 設為播放器來源
- 手機頂部區塊已調整：
- 導覽標籤置於上方靠左
- 登入/登出資訊置於上方靠右
- icon 與按鈕尺寸縮小
- 標題顯示規則已調整：
- `player` 頁顯示等待播放或正在播放
- `playlist` 頁顯示固定「播放清單」

## 3. 目前已知待驗證事項
- 需在真實 OneDrive 帳號下確認 `thumbnails` 是否穩定返回；若部分來源仍無縮圖，需決定是否改為本地產生 poster。
- 需以真實帳號驗證片長顯示與實際播放長度在更多影片上的一致性。
- 需驗證 GitHub Pages 新部署流程在實際 repo 設定下可正常發布。
- 需驗證舊 PWA 使用者進入新版後，service worker / cache 清理是否足以讓多數使用者自動更新。
- 需在 Android 裝置上驗證新版 PWA 是否可安裝、可啟動、可更新。
- 需在 Redmi Note 11 Pro 5G 與 Samsung Fold 4 實測手機版版面、觸控與可摺疊寬度切換。
- 需在手機實測以下互動是否穩定：
- `player` 頁控制列收合/展開
- 右上播放清單按鈕點擊與抽屜開關
- 橫向抽屜滿高與上下捲動
- `playlist` 頁清單工具展開後的可用性
- 需在 Chrome / Edge 實測：
- 登入
- 同步
- 播放
- 清單互動
- 全螢幕控制
- 重新整理後狀態恢復

## 4. 後續優先工作
1. 實機驗證 Android 手機版 UI、PWA 安裝流程與不同寬度版面切換。
2. 驗證首次同步在手機上的體感速度是否已改善，必要時再做更進一步的 metadata / thumbnail 延後載入。
3. 實機驗證縮圖、片長與 OneDrive metadata 的穩定性。
4. 驗證 GitHub Pages 新 workflow 與 Pages 設定是否完全對齊。
5. 視驗證結果決定是否補做本地縮圖 / poster 產生機制。
6. 驗證正式部署時的 OAuth redirect URI、靜態站路由 fallback 與實際 Pages URL 是否完全一致。

## 5. 目前狀態
- 已完成一輪手機版 UI 與互動收斂，並完成 PWA 重建與安裝能力接回。
- 現階段重點為 Android 實機驗證、互動細節微調與部署前收斂。

## 5.1 背景排程與縮圖處理（2026-04-29）
- 已新增上方 `排程` 頁籤與 `/schedule` 路由。
- 已新增背景工作清單、狀態摘要與一次處理項目數設定。
- 本機來源匯入已改為先載入檔案資訊，片長與 ffmpeg.wasm 縮圖擷取不阻塞匯入流程。
- 本機縮圖與雲端縮圖下載結果已改存 IndexedDB，避免關閉應用程式後遺失。
- 雲端來源同步後會將可下載縮圖加入背景排程。
- 雲端縮圖下載排程執行時會重新透過 Graph API 取得最新 thumbnails URL，避免舊 URL 授權失效。
- 快捷鍵已新增上方四個頁籤切換，預設 `F1` 到 `F4`，目前順序為播放器、播放清單、設定、排程。
- 快捷鍵已新增音量增加 / 減少、播放速度增加 / 減少，預設未設定。
- 已修正音量與播放速度控制 focus 造成快捷鍵失效的問題。
- 已將影片區滑鼠右鍵改為不展開選項、不觸發播放器功能。
- 已新增排程狀態篩選按鈕，可按等待 / 處理中 / 完成 / 失敗篩選，重複點選回到全部。
- 已調整自訂清單新增名稱驗證：空白使用 `我的清單`，重名與不合法字元會提示。
- 已將全域右鍵改為不做任何事情，僅滑鼠快捷鍵設定時可擷取右鍵。
- 滑鼠快捷鍵設定已支援特殊功能鍵。
- 已補上失敗排程項目點擊重試，會將狀態改回等待中。
- 已修正右鍵快捷鍵：有設定功能時會執行設定動作，但不展開瀏覽器選單。
- 已修正新增來源的錯誤訊息，避免具體錯誤被固定「來源不合法」覆蓋。
- 已避免已成功保存的縮圖再次加入排程，並會直接使用上次成功保存的截圖。
- 已將本機檔案 IndexedDB 保存改為背景排程，避免大量檔案匯入卡在最後，匯入後可先用記憶體檔案直接播放。

## 6. TypeScript / 重構階段規劃（2026-04-11）
1. Phase A（規劃與基礎）
- [x] 定義分階段遷移策略與完成標準。
- [x] 建立 TypeScript 編譯設定（Vite + tsconfig）。

2. Phase B（語言遷移）
- [x] 將 `src` 既有 JS 模組逐步轉為 TS（`config` / `routing` / `player` / `playlist` / `auth` / `graph` / `storage` / `auth-callback` / `app`）。
- [x] 保持功能與 UI 行為不變，先完成可編譯與可執行。

3. Phase C（結構重構，降低 app 巨檔）
- [x] 以 OOP / 職責分離重構 `app`：
- [x] `AppController`（頁面與事件協調）
- [x] `SourceManager`（來源管理與切換）
- [x] `PlaybackController`（播放控制與播放清單協調）
- [x] 將來源存取步驟抽離為模組（`SourceAccessOrchestrator`）。

4. Phase D（來源抽象與本機來源）
- [x] 定義來源抽象介面（OneDrive / Local 共通流程）。
- [x] OneDrive 來源透過來源設定 endpoint 驗證後加入。
- [x] Local 來源支援檔案/資料夾選擇、遞迴選項、允許副檔名過濾。
- [x] 以 `ffmpeg.wasm` 產生本機來源 metadata 與縮圖。

5. Phase E（驗證與收斂）
- [x] `npm run build` / `npm run preview` 驗證。
- [ ] 功能與 UI 回歸檢查（播放器、清單、設定、來源切換、PWA）。
- [x] 更新 `Requirement.md` 與 `Plan.md` 實際完成紀錄。
