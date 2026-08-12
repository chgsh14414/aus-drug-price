# 澳洲藥價查詢工具

本工具以 GitHub Pages 建置，提供澳洲藥價資料的合併、去重、查詢及下載功能。

網站同時提供以下兩種使用方式：

1. **現有合併藥價資料**：直接查詢 GitHub repository 中已發布的共享版本。
2. **自行上傳及更新查詢**：上傳指定的兩個來源檔案，在瀏覽器中完成合併、去重及查詢。

---

## 網站功能

### 1. 現有合併藥價資料

網頁開啟後，系統會自動讀取：

```text
data/version.json
data/latest.csv
```

共享版本區塊會顯示：

- 共享版本
- 最後更新日期
- 共享資料筆數
- 藥價搜尋欄位
- 下載原始全部合併檔
- 下載查詢結果

所有使用者會查詢同一份 GitHub 內的現有合併藥價資料。

### 2. 自行上傳及更新查詢

若現有合併藥價資料尚未更新，或需要查詢其他月份，可在網頁下方自行上傳來源檔案。

需要上傳：

```text
items.csv
item-dispensing-rule-relationships.csv
```

網站也支援以下檔案格式：

- CSV
- XLSX
- XLS

Excel 檔案目前預設讀取第一個工作表。

---

## 必要欄位

### 藥品名稱檔案 `items.csv`

至少需要包含：

```text
li_item_id
drug_name 或 li_drug_name
```

### 價格檔案 `item-dispensing-rule-relationships.csv`

至少需要包含：

```text
li_item_id
cmnwlth_price_to_pharmacist
```

---

## 合併與去重規則

網站採用以下處理順序：

1. 以藥品名稱檔案 `items.csv` 為左表。
2. 使用 `li_item_id` 執行 Left Join。
3. 完成合併後，再依 `li_item_id` 去除重複資料。
4. 若同一個 `li_item_id` 在合併結果中出現多次，保留第一次出現的資料列。
5. 未在價格檔中找到對應資料的藥品仍會保留，價格欄位顯示為空白。

資料合併摘要會顯示：

- 藥品檔原始筆數
- 價格檔原始筆數
- 去重前合併筆數
- 最終 unique ID 筆數
- 成功配對 unique ID
- 未配對 unique ID
- 合併後移除的重複列數

---

## 查詢功能

現有合併版本與自行上傳版本皆可搜尋以下欄位：

```text
li_item_id
drug_name
brand_name
```

搜尋功能：

- 不分英文大小寫
- 支援部分文字搜尋
- 可按搜尋按鈕執行
- 可在搜尋框按 Enter 執行
- 畫面最多顯示前 1,000 筆結果
- 下載查詢結果時會包含所有符合資料

例如：

```text
atorvastatin
lipitor
12345
```

---

## 下載功能

### 下載原始全部合併檔

下載目前區塊使用的完整資料：

- 現有合併藥價資料區塊：下載 GitHub 共享版本
- 自行合併結果區塊：下載本次合併及去重後的完整結果

### 下載查詢結果

只下載目前搜尋條件所找到的資料。

### 檔名日期

所有下載檔案都會依使用者電腦的當下日期，在檔名最後加入：

```text
YYYYMMDD
```

例如：

```text
australian_drug_price_shared_20260812.csv
australian_drug_price_shared_search_20260812.csv
australian_drug_price_unique_20260812.csv
australian_drug_price_search_20260812.csv
```

---

## Repository 結構

GitHub repository 應維持以下結構：

```text
aus-drug-price/
├── index.html
├── README.md
└── data/
    ├── latest.csv
    └── version.json
```

### `index.html`

包含網頁介面、樣式、檔案讀取、合併、去重、搜尋及下載功能。

### `data/latest.csv`

目前提供給所有使用者查詢的最新共享合併檔。

### `data/version.json`

記錄共享資料的版本資訊與 CSV 檔名。

---

## 第一次發布共享版本

### 步驟 1：產生正式合併檔

1. 開啟 GitHub Pages 網站。
2. 在「自行上傳及更新查詢」區塊上傳 `items.csv`。
3. 上傳 `item-dispensing-rule-relationships.csv`。
4. 按下「合併兩個檔案」。
5. 檢查資料合併摘要。
6. 在「查詢自行合併結果」區塊按下「下載原始全部合併檔」。

下載檔名會類似：

```text
australian_drug_price_unique_20260812.csv
```

### 步驟 2：重新命名共享檔案

將下載的完整合併檔重新命名為：

```text
latest.csv
```

### 步驟 3：更新 GitHub 中的 CSV

進入 repository 的：

```text
data/
```

刪除或覆蓋舊的：

```text
latest.csv
```

再上傳新版 `latest.csv`。

### 步驟 4：更新版本資訊

編輯：

```text
data/version.json
```

範例：

```json
{
  "active": true,
  "version": "2026-08",
  "updatedDate": "2026-08-12",
  "source": "Australian pharmaceutical pricing files",
  "file": "latest.csv"
}
```

欄位說明：

- `active`：设为 `true` 代表啟用共享版本
- `version`：網頁顯示的資料版本
- `updatedDate`：共享資料最後更新日期
- `source`：資料來源說明
- `file`：共享 CSV 的檔名，建議固定使用 `latest.csv`

JSON 內容不能包含註解，最後一個欄位後方不能有多餘逗號。

---

## 每月更新流程

每月由指定維護者執行：

1. 下載最新的澳洲藥價來源檔案。
2. 在網站的「自行上傳及更新查詢」區塊完成合併。
3. 檢查合併摘要及未配對資料。
4. 下載完整合併結果。
5. 將檔案重新命名為 `latest.csv`。
6. 覆蓋 GitHub 中的 `data/latest.csv`。
7. 更新 `data/version.json` 的 `version` 與 `updatedDate`。
8. Commit changes。
9. 等待 GitHub Pages deployment 完成。
10. 重新整理網站並確認共享版本、日期與資料筆數。

不需要每月修改 `index.html`。

---

## 確認共享檔案是否成功發布

假設網站網址為：

```text
https://你的GitHub帳號.github.io/aus-drug-price/
```

共享版本資訊網址為：

```text
https://你的GitHub帳號.github.io/aus-drug-price/data/version.json
```

共享 CSV 網址為：

```text
https://你的GitHub帳號.github.io/aus-drug-price/data/latest.csv
```

更新後請確認 GitHub repository 的：

```text
Actions → pages build and deployment
```

顯示綠色勾勾，再使用以下方式重新整理網站：

```text
Ctrl + F5
```

---

## 資料處理與隱私

### 現有合併版本

共享版本存放在公開 GitHub repository，任何知道網址的人均可能存取 `data/latest.csv`。

請勿將以下資料放入共享 CSV：

- 個人資料
- 公司機密資料
- 客戶資料
- 未公開商業資訊

### 自行上傳版本

使用者自行選擇的 CSV 或 Excel 檔案只會在目前瀏覽器頁面中處理：

- 不會自動上傳到 GitHub
- 不會自動覆蓋共享版本
- 不會永久儲存在網站
- 重新整理或關閉頁面後，需要重新上傳

---

## 常見問題

### 網頁顯示找不到 `data/version.json`

請確認 repository 中存在：

```text
data/version.json
```

並確認 GitHub Pages 發布來源為：

```text
main branch
/ (root)
```

### 網頁顯示共享版本尚未發布

請確認 `version.json` 中：

```json
"active": true
```

### 網頁找不到 `latest.csv`

請確認：

- 檔案位於 `data/latest.csv`
- 檔名大小寫完全正確
- `version.json` 的 `file` 為 `latest.csv`
- GitHub Pages deployment 已完成

### 系統找不到必要欄位

請確認來源檔案的標題列位於第一列，且包含指定欄位名稱。

### Excel 無法正確讀取

目前 Excel 預設讀取第一個工作表。請將正式資料工作表移至最左側後再上傳。

### 網頁按鈕沒有反應

網站使用以下外部 JavaScript 元件：

- Papa Parse
- SheetJS

若公司網路封鎖 `cdn.jsdelivr.net`，CSV 或 Excel 功能可能無法載入。

---

## 使用提醒

本工具僅用於協助整理及查詢公開的澳洲藥價資料。查詢結果應以澳洲官方發布的原始資料為準。
