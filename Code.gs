/**
 * Background Sync Script - Supabase <-> Google Sheets
 * Run this function via Time-Driven Triggers (Every 1 Minute)
 */

var SUPABASE_URL = "https://nxtwjlseuackxexspfoe.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54dHdqbHNldWFja3hleHNwZm9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2MjE2NTYsImV4cCI6MjA5NzE5NzY1Nn0.U0AIsIxXp6NlDIw6rnhBQ6TKHmNIl-P52ZDzAFo5tFk";

function triggerSync() {
  syncMasterDataToSupabase();
  syncTransactionsToSheet();
}

function syncMasterDataToSupabase() {
  var products = sheetToObjects("Stok", {
    "ID": "id",
    "Nama Produk": "namaProduk",
    "Varian": "varian",
    "Harga": "harga",
    "Kategori": "kategori",
    "Stok Awal": "stokAwal",
    "Stok Sekarang": "stokSekarang"
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

function syncTransactionsToSheet() {
  var response = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/transactions?is_synced=eq.false", {
    method: "get",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": "Bearer " + SUPABASE_KEY
    }
  });
  
  var transactions = JSON.parse(response.getContentText());
  
  if (!transactions || transactions.length === 0) return;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transaksi");
  if (!sheet) return;

  var rows = [];
  var idsToUpdate = [];

  for (var i = 0; i < transactions.length; i++) {
    var t = transactions[i];
    rows.push([
      t.idTransaksi,
      t.idProduk,
      t.qty,
      t.idCustomer,
      t.transaksiPic,
      "",
      ""
    ]);
    idsToUpdate.push(t.idTransaksi);
  }

  var lastRow = Math.max(sheet.getLastRow(), 1);
  sheet.getRange(lastRow + 1, 1, rows.length, 7).setValues(rows);

  // Split IDs into chunks of 100 to avoid too long URLs
  var chunkSize = 100;
  for (var i = 0; i < idsToUpdate.length; i += chunkSize) {
    var chunk = idsToUpdate.slice(i, i + chunkSize);
    var url = SUPABASE_URL + "/rest/v1/transactions?idTransaksi=in.(" + chunk.join(",") + ")";
    
    UrlFetchApp.fetch(url, {
      method: "patch",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      payload: JSON.stringify({ is_synced: true }),
      muteHttpExceptions: true
    });
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
