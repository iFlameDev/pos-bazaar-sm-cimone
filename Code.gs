/**
 * POS System - Google Apps Script Backend
 * 
 * Handles all CRUD operations for the POS application via a single doPost endpoint.
 * Connected to a Google Sheet with 3 tabs: Stok, Customer, Transaksi.
 */

// ============================================================
// ENTRY POINTS
// ============================================================

/**
 * GET endpoint – simple health-check / status message.
 */
function doGet(e) {
  var result = {
    success: true,
    message: "POS Backend is running.",
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * POST endpoint – single entry point for all actions.
 * Expects JSON body with an "action" field.
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;

    var result;

    switch (action) {
      case "GET_MASTER_DATA":
        result = handleGetMasterData();
        break;
      case "ADD_TRANSACTION":
        result = handleAddTransaction(payload);
        break;
      case "GET_CUSTOMER_CART":
        result = handleGetCustomerCart(payload);
        break;
      case "BATCH_UPDATE_CART":
        result = handleBatchUpdateCart(payload);
        break;
      default:
        result = { success: false, error: "Unknown action: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    var errorResult = { success: false, error: err.toString() };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Reads a sheet and converts it to an array of objects.
 *
 * @param {string} sheetName - Name of the sheet tab.
 * @param {Object} keyMap    - Maps header strings to camelCase keys.
 *                             e.g. { "Nama Produk": "namaProduk" }
 * @returns {Object[]} Array of row objects.
 */
function sheetToObjects(sheetName, keyMap) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Sheet '" + sheetName + "' not found.");
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // header only or empty

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Skip completely empty rows
    if (row.every(function(cell) { return cell === "" || cell === null || cell === undefined; })) {
      continue;
    }

    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var header = String(headers[j]).trim();
      var key = keyMap[header] || header;
      obj[key] = row[j];
    }
    rows.push(obj);
  }

  return rows;
}

// ============================================================
// ACTION HANDLERS
// ============================================================

/**
 * GET_MASTER_DATA
 * Reads 'Stok' and 'Customer' sheets, returns products and customers.
 */
function handleGetMasterData() {
  var productKeyMap = {
    "ID": "id",
    "Nama Produk": "namaProduk",
    "Harga": "harga",
    "Kategori": "kategori",
    "Stok Awal": "stokAwal",
    "Stok Sekarang": "stokSekarang"
  };

  var customerKeyMap = {
    "ID": "id",
    "Nama": "nama",
    "Kelas": "kelas",
    "Saldo Awal": "saldoAwal",
    "Saldo Sekarang": "saldoSekarang"
  };

  var products = sheetToObjects("Stok", productKeyMap);
  var customers = sheetToObjects("Customer", customerKeyMap);

  return {
    success: true,
    products: products,
    customers: customers
  };
}

/**
 * ADD_TRANSACTION
 * Appends a new transaction row to the 'Transaksi' sheet.
 * Uses LockService to prevent race conditions.
 */
function handleAddTransaction(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // wait up to 10 seconds

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transaksi");
    if (!sheet) {
      throw new Error("Sheet 'Transaksi' not found.");
    }

    var row = [
      payload.idTransaksi,
      payload.idProduk,
      payload.qty,
      payload.idCustomer,
      payload.transaksiPic,
      "",  // Update PIC (empty on creation)
      ""   // Delete PIC (empty on creation)
    ];

    sheet.appendRow(row);

    return { success: true };

  } catch (err) {
    throw err;
  } finally {
    lock.releaseLock();
  }
}

/**
 * GET_CUSTOMER_CART
 * Returns all non-soft-deleted transactions (Qty > 0) for a given customer.
 */
function handleGetCustomerCart(payload) {
  var idCustomer = payload.idCustomer;

  var transactionKeyMap = {
    "ID Transaksi": "idTransaksi",
    "ID Produk": "idProduk",
    "Qty": "qty",
    "ID Customer": "idCustomer",
    "Transaksi PIC": "transaksiPic",
    "Update PIC": "updatePic",
    "Delete PIC": "deletePic"
  };

  var allTransactions = sheetToObjects("Transaksi", transactionKeyMap);

  var filtered = allTransactions.filter(function(t) {
    return String(t.idCustomer) === String(idCustomer) && Number(t.qty) > 0;
  });

  return {
    success: true,
    transactions: filtered
  };
}

/**
 * BATCH_UPDATE_CART
 * Updates multiple transaction rows in-memory and writes back with setValues().
 * Uses LockService to prevent race conditions.
 *
 * For each transaction in payload.transactions:
 *   - qty > 0  → update Qty cell and Update PIC cell
 *   - qty === 0 → set Qty to 0 and fill Delete PIC (soft delete)
 */
function handleBatchUpdateCart(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transaksi");
    if (!sheet) {
      throw new Error("Sheet 'Transaksi' not found.");
    }

    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { success: true }; // nothing to update
    }

    var headers = data[0];

    // Resolve column indices
    var colIdTransaksi = headers.indexOf("ID Transaksi");
    var colQty = headers.indexOf("Qty");
    var colUpdatePic = headers.indexOf("Update PIC");
    var colDeletePic = headers.indexOf("Delete PIC");

    if (colIdTransaksi === -1 || colQty === -1 || colUpdatePic === -1 || colDeletePic === -1) {
      throw new Error("Transaksi sheet is missing required headers.");
    }

    // Build a lookup of incoming updates keyed by idTransaksi
    var updates = {};
    for (var u = 0; u < payload.transactions.length; u++) {
      var t = payload.transactions[u];
      updates[String(t.idTransaksi)] = t;
    }

    // Walk through all data rows and apply updates
    for (var i = 1; i < data.length; i++) {
      var rowId = String(data[i][colIdTransaksi]);
      if (updates.hasOwnProperty(rowId)) {
        var upd = updates[rowId];
        var newQty = Number(upd.qty);

        data[i][colQty] = newQty;

        if (newQty > 0) {
          // Regular update
          data[i][colUpdatePic] = upd.updatePic || "";
        } else {
          // Soft delete (qty === 0)
          data[i][colDeletePic] = upd.deletePic || "";
        }
      }
    }

    // Write the entire data block back to the sheet
    sheet.getRange(1, 1, data.length, data[0].length).setValues(data);

    return { success: true };

  } catch (err) {
    throw err;
  } finally {
    lock.releaseLock();
  }
}
