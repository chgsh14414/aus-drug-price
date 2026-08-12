# aus-drug-price
Australian pharmaceutical price lookup tool
# 澳洲藥價查詢工具

這是一個使用 GitHub Pages 發布的瀏覽器端資料合併與藥價查詢工具。

## 功能

- 上傳 CSV、XLSX 或 XLS 檔案
- 依 `li_item_id` 合併兩個檔案
- 搜尋 `drug_name`
- 搜尋 `li_drug_name`
- 搜尋 `li_item_id`
- 顯示 `cmnwlth_price_to_pharmacist`
- 下載合併結果
- 下載搜尋結果
- 顯示配對、未配對及重複 ID 數量

## 必要欄位

### 藥品名稱檔案

至少需要：

- `li_item_id`
- `drug_name` 或 `li_drug_name`

### 價格檔案

至少需要：

- `li_item_id`
- `cmnwlth_price_to_pharmacist`

## Merge 方法

系統以藥品名稱檔案為左表，依 `li_item_id` 執行 Left Join。

如果價格檔中的同一個 `li_item_id` 有多筆資料，系統會保留所有配對結果。

## 資料隱私

所有資料只在使用者的瀏覽器中處理。

本網站不會把使用者選擇的檔案上傳到自訂資料庫或永久儲存。重新整理或關閉網頁後，需要重新選擇檔案。

## 支援格式

- CSV
- XLSX
- XLS

Excel 檔案目前預設讀取第一個工作表。

## 使用方法

1. 上傳含藥名和 `li_item_id` 的藥品檔案。
2. 上傳含價格和 `li_item_id` 的價格檔案。
3. 按下「合併兩個檔案」。
4. 檢查合併摘要。
5. 輸入藥名或 `li_item_id`。
6. 查看 `cmnwlth_price_to_pharmacist`。
7. 視需要下載合併或搜尋結果。

## 注意事項

- 查詢結果應以澳洲官方發布的原始資料為準。
- 若 Excel 標題列不是第一列，目前版本可能無法正確辨識。
- 若需要使用其他工作表，請先將目標工作表移至第一個位置。
- `li_item_id` 會以文字方式處理，以降低前導零遺失的可能性。
