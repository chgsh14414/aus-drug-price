"use strict";

/*
  澳洲藥價查詢工具
  所有檔案都只在使用者瀏覽器內處理。
*/

// 儲存目前的資料
let drugRows = [];
let priceRows = [];
let mergedRows = [];
let currentSearchResults = [];

let selectedDrugFile = null;
let selectedPriceFile = null;

// 頁面元素
const drugFileInput = document.getElementById("drugFile");
const priceFileInput = document.getElementById("priceFile");

const drugFileInfo = document.getElementById("drugFileInfo");
const priceFileInfo = document.getElementById("priceFileInfo");

const mergeButton = document.getElementById("mergeButton");
const statusMessage = document.getElementById("statusMessage");

const summarySection = document.getElementById("summarySection");
const searchSection = document.getElementById("searchSection");

const drugRowCount = document.getElementById("drugRowCount");
const priceRowCount = document.getElementById("priceRowCount");
const mergedRowCount = document.getElementById("mergedRowCount");
const matchedRowCount = document.getElementById("matchedRowCount");
const unmatchedRowCount = document.getElementById("unmatchedRowCount");
const duplicateIdCount = document.getElementById("duplicateIdCount");

const mergeWarning = document.getElementById("mergeWarning");

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const clearSearchButton = document.getElementById("clearSearchButton");

const resultSummary = document.getElementById("resultSummary");
const resultTableHead = document.getElementById("resultTableHead");
const resultTableBody = document.getElementById("resultTableBody");
const noResults = document.getElementById("noResults");

const downloadMergedButton = document.getElementById(
  "downloadMergedButton"
);

const downloadSearchButton = document.getElementById(
  "downloadSearchButton"
);

// 搜尋結果表格優先顯示的欄位
const preferredDisplayColumns = [
  "li_item_id",
  "drug_name",
  "li_drug_name",
  "brand_name",
  "strength",
  "form",
  "pack_size",
  "cmnwlth_price_to_pharmacist"
];

// 欄位可能出現的別名
const columnAliases = {
  li_item_id: [
    "li_item_id",
    "li item id",
    "item_id",
    "item id"
  ],
  drug_name: [
    "drug_name",
    "drug name"
  ],
  li_drug_name: [
    "li_drug_name",
    "li drug name"
  ],
  cmnwlth_price_to_pharmacist: [
    "cmnwlth_price_to_pharmacist",
    "cmnwlth price to pharmacist",
    "commonwealth_price_to_pharmacist",
    "commonwealth price to pharmacist"
  ]
};

// 監聽檔案選擇
drugFileInput.addEventListener("change", function (event) {
  selectedDrugFile = event.target.files[0] || null;

  updateSelectedFileInformation(
    selectedDrugFile,
    drugFileInfo,
    "藥品檔案"
  );

  resetMergedData();
});

priceFileInput.addEventListener("change", function (event) {
  selectedPriceFile = event.target.files[0] || null;

  updateSelectedFileInformation(
    selectedPriceFile,
    priceFileInfo,
    "價格檔案"
  );

  resetMergedData();
});

// 按下 Merge
mergeButton.addEventListener("click", mergeUploadedFiles);

// 搜尋
searchButton.addEventListener("click", runSearch);

searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    runSearch();
  }
});

// 清除搜尋
clearSearchButton.addEventListener("click", clearSearch);

// 下載
downloadMergedButton.addEventListener("click", function () {
  if (mergedRows.length === 0) {
    showStatus("目前沒有可以下載的合併資料。", "error");
    return;
  }

  downloadRowsAsCsv(
    mergedRows,
    createTimestampedFilename("australian_drug_price_merged")
  );
});

downloadSearchButton.addEventListener("click", function () {
  if (currentSearchResults.length === 0) {
    showStatus("目前沒有可以下載的查詢結果。", "error");
    return;
  }

  downloadRowsAsCsv(
    currentSearchResults,
    createTimestampedFilename("australian_drug_price_search")
  );
});

/**
 * 更新已選擇檔案的資訊。
 */
function updateSelectedFileInformation(file, element, label) {
  if (!file) {
    element.textContent = "尚未選擇檔案";
    return;
  }

  const size = formatFileSize(file.size);

  element.textContent =
    `${label}：${file.name}，檔案大小：${size}`;
}

/**
 * 合併使用者上傳的兩個檔案。
 */
async function mergeUploadedFiles() {
  if (!selectedDrugFile || !selectedPriceFile) {
    showStatus(
      "請先選擇藥品名稱檔案和價格檔案，再執行合併。",
      "error"
    );
    return;
  }

  try {
    setMergeButtonLoading(true);

    showStatus(
      "正在讀取與檢查檔案，請稍候...",
      "info"
    );

    // 讀取兩個檔案
    const [rawDrugRows, rawPriceRows] = await Promise.all([
      readUploadedFile(selectedDrugFile),
      readUploadedFile(selectedPriceFile)
    ]);

    if (rawDrugRows.length === 0) {
      throw new Error("藥品名稱檔案沒有可讀取的資料列。");
    }

    if (rawPriceRows.length === 0) {
      throw new Error("價格檔案沒有可讀取的資料列。");
    }

    // 標準化欄位名稱與 li_item_id
    drugRows = normalizeRows(rawDrugRows);
    priceRows = normalizeRows(rawPriceRows);

    // 檢查必要欄位
    validateRequiredColumns(drugRows, priceRows);

    // 執行 Left Join
    const mergeResult = leftJoinDrugAndPriceData(
      drugRows,
      priceRows
    );

    mergedRows = mergeResult.rows;
    currentSearchResults = [];

    updateSummary({
      drugCount: drugRows.length,
      priceCount: priceRows.length,
      mergedCount: mergedRows.length,
      matchedDrugCount: mergeResult.matchedDrugCount,
      unmatchedDrugCount: mergeResult.unmatchedDrugCount,
      duplicatePriceIdCount: mergeResult.duplicatePriceIds.length
    });

    showMergeWarnings(mergeResult);

    summarySection.classList.remove("hidden");
    searchSection.classList.remove("hidden");

    downloadMergedButton.disabled = false;

    clearSearch();

    showStatus(
      `合併完成。藥品檔共 ${formatNumber(drugRows.length)} 筆，` +
      `成功配對 ${formatNumber(mergeResult.matchedDrugCount)} 筆藥品資料，` +
      `未配對 ${formatNumber(mergeResult.unmatchedDrugCount)} 筆。`,
      "success"
    );

    // 移動到摘要區
    summarySection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    console.error(error);

    showStatus(
      error.message || "讀取或合併檔案時發生錯誤。",
      "error"
    );
  } finally {
    setMergeButtonLoading(false);
  }
}

/**
 * 依據副檔名讀取 CSV、XLSX 或 XLS。
 */
function readUploadedFile(file) {
  const extension = getFileExtension(file.name);

  if (extension === "csv") {
    return readCsvFile(file);
  }

  if (extension === "xlsx" || extension === "xls") {
    return readExcelFile(file);
  }

  return Promise.reject(
    new Error(
      `不支援 .${extension || "未知"} 格式。` +
      "請上傳 CSV、XLSX 或 XLS 檔案。"
    )
  );
}

/**
 * 使用 Papa Parse 讀取 CSV。
 */
function readCsvFile(file) {
  return new Promise(function (resolve, reject) {
    if (typeof Papa === "undefined") {
      reject(
        new Error(
          "CSV 讀取元件尚未載入。請確認網路連線後重新整理頁面。"
        )
      );
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: function (header) {
        return normalizeColumnName(header);
      },
      complete: function (results) {
        if (results.errors && results.errors.length > 0) {
          const seriousErrors = results.errors.filter(function (item) {
            return item.code !== "TooFewFields";
          });

          if (seriousErrors.length > 0) {
            console.warn("CSV parsing warnings:", seriousErrors);
          }
        }

        const rows = removeCompletelyEmptyRows(results.data || []);
        resolve(rows);
      },
      error: function (error) {
        reject(
          new Error(
            `無法讀取 CSV 檔案：${error.message || "未知錯誤"}`
          )
        );
      }
    });
  });
}

/**
 * 使用 SheetJS 讀取 Excel。
 * 第一版預設讀取第一個工作表。
 */
function readExcelFile(file) {
  return new Promise(function (resolve, reject) {
    if (typeof XLSX === "undefined") {
      reject(
        new Error(
          "Excel 讀取元件尚未載入。請確認網路連線後重新整理頁面。"
        )
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = function (event) {
      try {
        const arrayBuffer = event.target.result;

        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
          cellDates: false,
          raw: false
        });

        if (!workbook.SheetNames.length) {
          throw new Error("Excel 檔案中找不到工作表。");
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false
        });

        resolve(removeCompletelyEmptyRows(rows));
      } catch (error) {
        reject(
          new Error(
            `無法讀取 Excel 檔案：${error.message || "未知錯誤"}`
          )
        );
      }
    };

    reader.onerror = function () {
      reject(new Error("瀏覽器無法讀取所選擇的 Excel 檔案。"));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * 標準化整份資料。
 */
function normalizeRows(rows) {
  return rows.map(function (originalRow) {
    const normalizedRow = {};

    Object.entries(originalRow).forEach(function ([key, value]) {
      const normalizedKey = normalizeColumnName(key);

      if (!normalizedKey) {
        return;
      }

      const canonicalKey = resolveCanonicalColumnName(normalizedKey);

      // 如果欄位名稱重複，保留第一個非空值
      if (
        Object.prototype.hasOwnProperty.call(
          normalizedRow,
          canonicalKey
        ) &&
        !isEmptyValue(normalizedRow[canonicalKey])
      ) {
        return;
      }

      normalizedRow[canonicalKey] = normalizeCellValue(value);
    });

    if (
      Object.prototype.hasOwnProperty.call(
        normalizedRow,
        "li_item_id"
      )
    ) {
      normalizedRow.li_item_id = normalizeItemId(
        normalizedRow.li_item_id
      );
    }

    return normalizedRow;
  });
}

/**
 * 將欄位名稱轉成適合程式處理的格式。
 */
function normalizeColumnName(name) {
  return String(name ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[\/\\-]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * 將欄位別名轉成正式欄位名稱。
 */
function resolveCanonicalColumnName(normalizedName) {
  for (const [canonicalName, aliases] of Object.entries(
    columnAliases
  )) {
    const normalizedAliases = aliases.map(normalizeColumnName);

    if (normalizedAliases.includes(normalizedName)) {
      return canonicalName;
    }
  }

  return normalizedName;
}

/**
 * 清理儲存格的值。
 */
function normalizeCellValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).trim();
}

/**
 * 以文字保存 li_item_id。
 */
function normalizeItemId(value) {
  return String(value ?? "")
    .trim()
    .replace(/\.0$/, "");
}

/**
 * 確認必要欄位存在。
 */
function validateRequiredColumns(normalizedDrugRows, normalizedPriceRows) {
  const drugColumns = collectAllColumns(normalizedDrugRows);
  const priceColumns = collectAllColumns(normalizedPriceRows);

  if (!drugColumns.includes("li_item_id")) {
    throw new Error(
      "藥品名稱檔案中找不到 li_item_id 欄位。" +
      "請確認是否上傳正確檔案，以及標題列是否位於第一列。"
    );
  }

  if (!priceColumns.includes("li_item_id")) {
    throw new Error(
      "價格檔案中找不到 li_item_id 欄位。" +
      "請確認是否上傳正確檔案，以及標題列是否位於第一列。"
    );
  }

  const hasDrugName =
    drugColumns.includes("drug_name") ||
    drugColumns.includes("li_drug_name");

  if (!hasDrugName) {
    throw new Error(
      "藥品名稱檔案中找不到 drug_name 或 li_drug_name 欄位。"
    );
  }

  if (
    !priceColumns.includes("cmnwlth_price_to_pharmacist")
  ) {
    throw new Error(
      "價格檔案中找不到 cmnwlth_price_to_pharmacist 欄位。"
    );
  }

  const validDrugItemIds = normalizedDrugRows.filter(function (row) {
    return !isEmptyValue(row.li_item_id);
  });

  const validPriceItemIds = normalizedPriceRows.filter(function (row) {
    return !isEmptyValue(row.li_item_id);
  });

  if (validDrugItemIds.length === 0) {
    throw new Error("藥品名稱檔案的 li_item_id 全部都是空白。");
  }

  if (validPriceItemIds.length === 0) {
    throw new Error("價格檔案的 li_item_id 全部都是空白。");
  }
}

/**
 * 收集資料中的所有欄位。
 */
function collectAllColumns(rows) {
  const columns = new Set();

  rows.slice(0, 1000).forEach(function (row) {
    Object.keys(row).forEach(function (key) {
      columns.add(key);
    });
  });

  return Array.from(columns);
}

/**
 * 依 li_item_id 執行 Left Join。
 */
function leftJoinDrugAndPriceData(normalizedDrugRows, normalizedPriceRows) {
  const priceMap = new Map();

  normalizedPriceRows.forEach(function (priceRow) {
    const itemId = normalizeItemId(priceRow.li_item_id);

    if (!itemId) {
      return;
    }

    if (!priceMap.has(itemId)) {
      priceMap.set(itemId, []);
    }

    priceMap.get(itemId).push(priceRow);
  });

  const duplicatePriceIds = [];

  priceMap.forEach(function (rows, itemId) {
    if (rows.length > 1) {
      duplicatePriceIds.push({
        li_item_id: itemId,
        count: rows.length
      });
    }
  });

  const outputRows = [];
  let matchedDrugCount = 0;
  let unmatchedDrugCount = 0;

  normalizedDrugRows.forEach(function (drugRow) {
    const itemId = normalizeItemId(drugRow.li_item_id);
    const matches = itemId ? priceMap.get(itemId) : undefined;

    if (matches && matches.length > 0) {
      matchedDrugCount += 1;

      matches.forEach(function (priceRow) {
        outputRows.push(
          mergeTwoRows(drugRow, priceRow)
        );
      });
    } else {
      unmatchedDrugCount += 1;

      outputRows.push({
        ...drugRow,
        cmnwlth_price_to_pharmacist:
          drugRow.cmnwlth_price_to_pharmacist ?? "",
        _merge_status: "unmatched"
      });
    }
  });

  return {
    rows: outputRows,
    matchedDrugCount,
    unmatchedDrugCount,
    duplicatePriceIds
  };
}

/**
 * 合併單筆藥品與價格資料。
 * 兩個檔案若有同名欄位，優先保留價格檔非空值。
 */
function mergeTwoRows(drugRow, priceRow) {
  const merged = {
    ...drugRow
  };

  Object.entries(priceRow).forEach(function ([key, value]) {
    if (
      key === "li_item_id" &&
      !isEmptyValue(merged.li_item_id)
    ) {
      return;
    }

    if (!isEmptyValue(value) || isEmptyValue(merged[key])) {
      merged[key] = value;
    }
  });

  merged.li_item_id = normalizeItemId(drugRow.li_item_id);
  merged._merge_status = "matched";

  return merged;
}

/**
 * 執行藥名與 item ID 搜尋。
 */
function runSearch() {
  if (mergedRows.length === 0) {
    showStatus(
      "請先上傳並合併兩個檔案。",
      "error"
    );
    return;
  }

  const query = normalizeSearchText(searchInput.value);

  if (!query) {
    currentSearchResults = [];
    renderSearchResults([]);
    resultSummary.textContent = "請輸入藥名或 li_item_id。";
    downloadSearchButton.disabled = true;
    return;
  }

  const queryTokens = query
    .split(/\s+/)
    .filter(Boolean);

  currentSearchResults = mergedRows.filter(function (row) {
    const searchableValues = [
      row.li_item_id,
      row.drug_name,
      row.li_drug_name
    ];

    const searchableText = normalizeSearchText(
      searchableValues
        .filter(function (value) {
          return !isEmptyValue(value);
        })
        .join(" ")
    );

    return queryTokens.every(function (token) {
      return searchableText.includes(token);
    });
  });

  // 依藥名與 item ID 排序
  currentSearchResults.sort(function (a, b) {
    const nameA = String(
      a.drug_name || a.li_drug_name || ""
    );

    const nameB = String(
      b.drug_name || b.li_drug_name || ""
    );

    const nameComparison = nameA.localeCompare(
      nameB,
      "en",
      { sensitivity: "base" }
    );

    if (nameComparison !== 0) {
      return nameComparison;
    }

    return String(a.li_item_id || "").localeCompare(
      String(b.li_item_id || ""),
      "en",
      { numeric: true }
    );
  });

  renderSearchResults(currentSearchResults);

  resultSummary.textContent =
    `搜尋「${searchInput.value.trim()}」，` +
    `找到 ${formatNumber(currentSearchResults.length)} 筆結果。`;

  downloadSearchButton.disabled =
    currentSearchResults.length === 0;
}

/**
 * 正規化搜尋文字。
 */
function normalizeSearchText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * 顯示搜尋結果。
 */
function renderSearchResults(rows) {
  resultTableHead.innerHTML = "";
  resultTableBody.innerHTML = "";

  if (rows.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }

  noResults.classList.add("hidden");

  const displayColumns = determineDisplayColumns(rows);

  const headerRow = document.createElement("tr");

  displayColumns.forEach(function (column) {
    const th = document.createElement("th");
    th.textContent = formatColumnLabel(column);
    headerRow.appendChild(th);
  });

  resultTableHead.appendChild(headerRow);

  /*
    為避免一次把數萬筆資料全部畫到網頁，
    畫面最多顯示前 1,000 筆。
    下載功能仍會下載完整搜尋結果。
  */
  const displayRows = rows.slice(0, 1000);

  displayRows.forEach(function (row) {
    const tr = document.createElement("tr");

    displayColumns.forEach(function (column) {
      const td = document.createElement("td");
      const value = row[column];

      if (column === "cmnwlth_price_to_pharmacist") {
        td.classList.add("price-cell");
      }

      if (isEmptyValue(value)) {
        td.textContent = "無資料";
        td.classList.add("empty-value");
      } else {
        td.textContent = String(value);
      }

      tr.appendChild(td);
    });

    resultTableBody.appendChild(tr);
  });

  if (rows.length > 1000) {
    resultSummary.textContent +=
      " 為維持網頁效能，畫面只顯示前 1,000 筆，" +
      "下載結果會包含全部資料。";
  }
}

/**
 * 決定搜尋結果要顯示哪些欄位。
 */
function determineDisplayColumns(rows) {
  const availableColumns = collectAllColumns(rows);

  const preferredColumns = preferredDisplayColumns.filter(
    function (column) {
      return availableColumns.includes(column);
    }
  );

  // 確保價格欄位一定優先顯示
  if (
    availableColumns.includes("cmnwlth_price_to_pharmacist") &&
    !preferredColumns.includes("cmnwlth_price_to_pharmacist")
  ) {
    preferredColumns.push("cmnwlth_price_to_pharmacist");
  }

  /*
    若實際檔案沒有常見的 strength、form 等欄位，
    補上其他非內部欄位，最多顯示 10 欄。
  */
  const additionalColumns = availableColumns.filter(function (column) {
    return (
      !preferredColumns.includes(column) &&
      !column.startsWith("_")
    );
  });

  return [
    ...preferredColumns,
    ...additionalColumns
  ].slice(0, 10);
}

/**
 * 將程式欄位名稱轉成較友善的顯示名稱。
 */
function formatColumnLabel(column) {
  const labels = {
    li_item_id: "li_item_id",
    drug_name: "drug_name",
    li_drug_name: "li_drug_name",
    brand_name: "brand_name",
    strength: "strength",
    form: "form",
    pack_size: "pack_size",
    cmnwlth_price_to_pharmacist:
      "cmnwlth_price_to_pharmacist"
  };

  return labels[column] || column;
}

/**
 * 更新資料摘要。
 */
function updateSummary(summary) {
  drugRowCount.textContent = formatNumber(summary.drugCount);
  priceRowCount.textContent = formatNumber(summary.priceCount);
  mergedRowCount.textContent = formatNumber(summary.mergedCount);

  matchedRowCount.textContent = formatNumber(
    summary.matchedDrugCount
  );

  unmatchedRowCount.textContent = formatNumber(
    summary.unmatchedDrugCount
  );

  duplicateIdCount.textContent = formatNumber(
    summary.duplicatePriceIdCount
  );
}

/**
 * 顯示 Merge 警告。
 */
function showMergeWarnings(mergeResult) {
  const warnings = [];

  if (mergeResult.unmatchedDrugCount > 0) {
    warnings.push(
      `有 ${formatNumber(mergeResult.unmatchedDrugCount)} 筆藥品資料` +
      "無法在價格檔中找到相同的 li_item_id。"
    );
  }

  if (mergeResult.duplicatePriceIds.length > 0) {
    warnings.push(
      `價格檔中有 ${formatNumber(
        mergeResult.duplicatePriceIds.length
      )} 個重複的 li_item_id。` +
      "系統已保留所有配對結果，因此合併後筆數可能增加。"
    );
  }

  if (warnings.length === 0) {
    mergeWarning.textContent = "";
    mergeWarning.classList.add("hidden");
    return;
  }

  mergeWarning.textContent = warnings.join("\n");
  mergeWarning.classList.remove("hidden");
}

/**
 * 清除搜尋結果。
 */
function clearSearch() {
  searchInput.value = "";
  currentSearchResults = [];

  resultTableHead.innerHTML = "";
  resultTableBody.innerHTML = "";

  resultSummary.textContent =
    mergedRows.length > 0
      ? "資料已完成合併，請輸入藥名或 li_item_id。"
      : "尚未搜尋";

  noResults.classList.add("hidden");
  downloadSearchButton.disabled = true;
}

/**
 * 更換檔案後清除先前的 Merge 結果。
 */
function resetMergedData() {
  drugRows = [];
  priceRows = [];
  mergedRows = [];
  currentSearchResults = [];

  summarySection.classList.add("hidden");
  searchSection.classList.add("hidden");

  downloadMergedButton.disabled = true;
  downloadSearchButton.disabled = true;

  statusMessage.classList.add("hidden");
}

/**
 * 下載資料為 CSV。
 */
function downloadRowsAsCsv(rows, filename) {
  if (typeof Papa === "undefined") {
    showStatus(
      "CSV 元件尚未載入，請確認網路連線後重新整理。",
      "error"
    );
    return;
  }

  const cleanedRows = rows.map(function (row) {
    const cleaned = {};

    Object.entries(row).forEach(function ([key, value]) {
      if (!key.startsWith("_")) {
        cleaned[key] = value ?? "";
      }
    });

    return cleaned;
  });

  const csvContent = Papa.unparse(cleanedRows, {
    quotes: false,
    newline: "\r\n"
  });

  // 加入 UTF-8 BOM，讓 Excel 正確顯示中文
  const blob = new Blob(
    ["\uFEFF", csvContent],
    {
      type: "text/csv;charset=utf-8;"
    }
  );

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

/**
 * 建立有日期時間的檔案名稱。
 */
function createTimestampedFilename(prefix) {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");

  return `${prefix}_${year}${month}${day}_${hour}${minute}.csv`;
}

/**
 * 移除完全空白的資料列。
 */
function removeCompletelyEmptyRows(rows) {
  return rows.filter(function (row) {
    return Object.values(row).some(function (value) {
      return !isEmptyValue(value);
    });
  });
}

/**
 * 判斷值是否為空。
 */
function isEmptyValue(value) {
  return (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  );
}

/**
 * 顯示狀態訊息。
 */
function showStatus(message, type) {
  statusMessage.textContent = message;

  statusMessage.className =
    `status-message status-${type}`;

  statusMessage.classList.remove("hidden");
}

/**
 * 顯示檔案處理中的狀態。
 */
function setMergeButtonLoading(isLoading) {
  mergeButton.disabled = isLoading;

  mergeButton.textContent = isLoading
    ? "正在合併..."
    : "合併兩個檔案";
}

/**
 * 取得副檔名。
 */
function getFileExtension(filename) {
  const parts = String(filename).toLowerCase().split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts.pop();
}

/**
 * 格式化檔案大小。
 */
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 格式化數字。
 */
function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-TW");
}
