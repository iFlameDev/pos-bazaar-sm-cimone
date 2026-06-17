/**
 * Background Sync Script - Supabase <-> Google Sheets
 * Run this function via Time-Driven Triggers (Every 1 Minute)
 */

var SUPABASE_URL = "https://nxtwjlseuackxexspfoe.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dHdqbHNldWFja3hleHNwZm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MjE2NTYsImV4cCI6MjA5NzE5NzY1Nn0.U0AIsIxXp6NlDIw6rnhBQ6TKHmNIl-P52ZDzAFo5tFk";

/**
 * 1. Webhook Entry Point
 * Dipanggil oleh Supabase saat ada transaksi baru, diubah, atau dihapus
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Tunggu antrean sampai 10 detik agar tidak tabrakan

    var payload = JSON.parse(e.postData.contents);
    var type = payload.type; // "INSERT", "UPDATE", "DELETE"
    var record = payload.record;
    var oldRecord = payload.old_record;
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transaksi");
    if (!sheet) throw new Error("Sheet Transaksi tidak ditemukan");

    if (type === "INSERT" && record) {
      sheet.appendRow([
        record.idTransaksi,
        record.idProduk,
        record.qty,
        record.idCustomer,
        record.transaksiPic,
        "", // Update PIC
        ""  // Delete PIC
      ]);
    } 
    else if (type === "UPDATE" && record) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === record.idTransaksi) {
          sheet.getRange(i + 1, 3).setValue(record.qty); // Kolom ke-3 adalah qty
          break;
        }
      }
    }
    else if (type === "DELETE" && oldRecord) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] === oldRecord.idTransaksi) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 2. Event-Driven Sync (Debounce)
 * Harus di-set sebagai "Installable Trigger" (On edit) di menu Triggers Apps Script
 */
function handleSheetEdit(e) {
  if (!e || !e.source) return;
  var sheetName = e.source.getActiveSheet().getName();
  
  // Hanya pedulikan perubahan di tab Stok atau Customer
  if (sheetName !== "Stok" && sheetName !== "Customer") {
    return;
  }

  var triggerName = "delayedSyncMasterData";

  // Hapus semua trigger "delayedSyncMasterData" yang sudah ada (reset alarm)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === triggerName) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Buat alarm baru 1 menit (60000ms) ke depan
  ScriptApp.newTrigger(triggerName)
    .timeBased()
    .after(60 * 1000)
    .create();
}

/**
 * 3. Eksekutor Master Data
 * Dieksekusi 1 menit setelah Anda selesai mengedit (berhenti mengetik)
 */
function delayedSyncMasterData() {
  syncMasterDataToSupabase();
}

function syncMasterDataToSupabase() {
  var products = sheetToObjects("Stok", {
    "ID": "id",
    "Nama Produk": "namaProduk",
    "Varian": "varian",
    "Harga": "harga",
    "Kategori": "kategori",
    "Stok Awal": "stokAwal",
    "Stok Sekarang": "stokSekarang",
    "Gambar URL": "gambarUrl"
  });

  var customers = sheetToObjects("Customer", {
    "ID": "id",
    "Nama": "nama",
    "Kelas": "kelas",
    "Saldo Awal": "saldoAwal",
    "Saldo Sekarang": "saldoSekarang"
  });

  // Supabase REST API requires numerics for numeric columns. We should ensure they are parsed.
  products = products.map(function(p) {
    p.harga = Number(p.harga) || 0;
    p.stokAwal = Number(p.stokAwal) || 0;
    p.stokSekarang = Number(p.stokSekarang) || 0;
    p.id = String(p.id);
    return p;
  });

  customers = customers.map(function(c) {
    c.saldoAwal = Number(c.saldoAwal) || 0;
    c.saldoSekarang = Number(c.saldoSekarang) || 0;
    c.id = String(c.id);
    return c;
  });

  if (products.length > 0) {
    supabaseUpsert("products", products);
  }

  if (customers.length > 0) {
    supabaseUpsert("customers", customers);
  }
}



function supabaseUpsert(tableName, data) {
  var url = SUPABASE_URL + "/rest/v1/" + tableName;
  
  var options = {
    method: "post",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates"
    },
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  Logger.log("Upsert " + tableName + ": " + response.getContentText());
}

function sheetToObjects(sheetName, keyMap) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
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

function syncTransactionsFromSupabase() {
  var url = SUPABASE_URL + "/rest/v1/transaksi?select=*&order=created_at.asc";
  
  var options = {
    method: "get",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };
  
  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log("Error fetching transactions: " + response.getContentText());
    return;
  }
  
  var data = JSON.parse(response.getContentText());
  if (data.length === 0) return;
  
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transaksi");
  if (!sheet) return;
  
  var existingData = sheet.getDataRange().getValues();
  var existingMap = {};
  for (var i = 1; i < existingData.length; i++) {
    existingMap[existingData[i][0]] = i;
  }
  
  var newRows = [];
  for (var j = 0; j < data.length; j++) {
    var record = data[j];
    var rowIndex = existingMap[record.idTransaksi];
    
    if (rowIndex !== undefined) {
      if (existingData[rowIndex][2] !== record.qty) {
        sheet.getRange(rowIndex + 1, 3).setValue(record.qty);
      }
    } else {
      newRows.push([
        record.idTransaksi,
        record.idProduk,
        record.qty,
        record.idCustomer,
        record.transaksiPic,
        "",
        ""
      ]);
      existingMap[record.idTransaksi] = existingData.length + newRows.length - 1;
    }
  }
  
  if (newRows.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
  
  Logger.log("Sync complete. Added " + newRows.length + " rows.");
}
