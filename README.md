# 澳洲藥價查詢工具：彈性顯示重複 li_item_id 版本

本工具以 GitHub Pages 建置，提供澳洲藥價資料的共享查詢、自行上傳合併、搜尋及 CSV 下載功能。

## 開啟查詢工具

[開啟澳洲藥價查詢工具](https://chgsh14414.github.io/aus-drug-price/)

請將上方連結替換成實際的 GitHub Pages 網址。

## 網站功能

### 1. 現有合併藥價資料

網站會自動載入：

```text
data/version.json
data/latest.csv
```

查詢資料為現有合併資料(版本如頁面所示)。

查詢欄位：

```text
li_item_id
drug_name
brand_name
```

查詢區塊提供：

- 搜尋
- 勾選「查詢畫面僅顯示 unique li_item_id」
- 下載原始全部合併檔
- 下載查詢結果

### 2. 自行上傳及更新查詢

來源檔案可從 [澳洲 PBS 網站](https://www.pbs.gov.au/browse/publications) 取得。

需要上傳：

```text
items.csv
item-dispensing-rule-relationships.csv
```

支援格式：

- CSV
- XLSX
- XLS

Excel 檔案預設讀取第一個工作表。

## 必要欄位

### 藥品名稱檔案 `items.csv`

```text
li_item_id
drug_name 或 li_drug_name
```

### 價格檔案 `item-dispensing-rule-relationships.csv`

```text
li_item_id
cmnwlth_price_to_pharmacist
```

## 合併規則

1. 以 `items.csv` 為左表。
2. 依 `li_item_id` 執行 Left Join。
3. 若價格檔或藥品檔包含重複 `li_item_id`，合併結果可能產生多筆配對。
4. 合併完成後不刪除重複資料列。
5. 未配對到價格的藥品資料仍會保留，價格欄位為空白。

## 合併摘要

自行上傳合併後會顯示：

- 藥品檔原始筆數
- 價格檔原始筆數
- 合併後總筆數
- unique `li_item_id` 數
- 有重複 ID 的額外資料列數
- 成功配對資料列數
- 未配對資料列數

「有重複 ID 的額外資料列」計算方式為：

```text
合併後總筆數 - 依 li_item_id 保留第一筆後的筆數
```

## 查詢畫面的去重複選項

### 未勾選

顯示所有符合搜尋條件的資料列，包括重複 `li_item_id`。

### 已勾選

網頁畫面僅顯示每個 `li_item_id` 第一次出現的資料列。

這項勾選：

- 只影響畫面顯示
- 不會刪除資料
- 不會改變完整合併檔下載內容
- 不會改變查詢結果下載內容

畫面會同時顯示：

- 原始搜尋結果筆數
- 目前畫面顯示筆數

## 下載規則

### 下載原始全部合併檔

下載完整底層資料，保留所有重複 `li_item_id`。

### 下載查詢結果

下載所有符合搜尋條件的原始資料列，同樣保留重複 `li_item_id`。即使畫面勾選 unique ID，下載內容仍不會去重。

下載檔名會加上使用者當下日期：

```text
australian_drug_price_shared_YYYYMMDD.csv
australian_drug_price_shared_search_YYYYMMDD.csv
australian_drug_price_unique_YYYYMMDD.csv
australian_drug_price_search_YYYYMMDD.csv
```

其中既有檔名中的 `unique` 僅為延續舊版檔名相容性，本版本下載內容仍保留重複 ID。若需要，也可在 `index.html` 中將檔名前綴改為 `australian_drug_price_merged`。

## 注意事項

- 查詢結果應以澳洲 PBS 官方原始資料為準。
- 如果同一個 `li_item_id` 的多筆資料內容不同，勾選 unique ID 時只顯示第一筆；請取消勾選以檢查全部內容。
- 網站使用 Papa Parse 與 SheetJS 的 jsDelivr CDN。若公司網路封鎖 CDN，CSV 或 Excel 功能可能無法載入。
