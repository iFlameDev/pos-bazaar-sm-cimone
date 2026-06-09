# POS System — Deployment Guide

Complete instructions for setting up and deploying the POS application.

---

## 1. Google Sheets Setup

### 1.1 Create a New Google Sheet

Go to [sheets.new](https://sheets.new) and create a new spreadsheet. Rename it (e.g., **"POS Database"**).

### 1.2 Create the Required Sheets (Tabs)

Create **3 sheets** with these exact names and headers:

#### Sheet 1: `Stok`

| Column | Header |
|--------|--------|
| A | ID |
| B | Nama Produk |
| C | Harga |
| D | Kategori |
| E | Stok Awal |
| F | Stok Sekarang |

#### Sheet 2: `Customer`

| Column | Header |
|--------|--------|
| A | ID |
| B | Nama |
| C | Kelas |
| D | Saldo Awal |
| E | Saldo Sekarang |

#### Sheet 3: `Transaksi`

| Column | Header |
|--------|--------|
| A | ID Transaksi |
| B | ID Produk |
| C | Qty |
| D | ID Customer |
| E | Transaksi PIC |
| F | Update PIC |
| G | Delete PIC |

> [!IMPORTANT]
> Headers must match **exactly** (including spaces and capitalisation). The backend relies on these names to map columns.

---

### 1.3 Array Formulas for Computed Columns

These formulas auto-calculate stock and balance based on the `Transaksi` sheet. Place them in row **2** of the respective columns.

#### `Stok Sekarang` (Column F of `Stok`, cell `F2`)

This formula calculates: **Stok Awal − SUM(Qty sold for that product)**

```
=MAP(A2:A, E2:E, LAMBDA(prodId, stokAwal,
  IF(prodId="", "",
    LET(
      totalSold, SUMPRODUCT(
        (Transaksi!B:B = prodId) * (Transaksi!C:C)
      ),
      stokAwal - totalSold
    )
  )
))
```

#### `Saldo Sekarang` (Column E of `Customer`, cell `E2`)

This formula calculates: **Saldo Awal − SUM(Qty × Product Price for that customer)**

```
=MAP(A2:A, D2:D, LAMBDA(custId, saldoAwal,
  IF(custId="", "",
    LET(
      totalSpent, SUMPRODUCT(
        (Transaksi!D:D = custId) *
        (Transaksi!C:C) *
        IFERROR(VLOOKUP(Transaksi!B:B, Stok!A:C, 3, FALSE), 0)
      ),
      saldoAwal - totalSpent
    )
  )
))
```

> [!NOTE]
> These are **array formulas** — paste them only in row 2. They will automatically expand to cover all data rows below. Do **not** paste them in every row.

---

## 2. Google Apps Script Setup

### 2.1 Open the Script Editor

1. In your Google Sheet, go to **Extensions → Apps Script**.
2. This opens the Apps Script editor in a new tab.

### 2.2 Paste the Backend Code

1. Delete any existing code in `Code.gs`.
2. Copy the entire contents of the `Code.gs` file from this project and paste it in.
3. Click **Save** (💾) or press `Ctrl + S`.

### 2.3 Deploy as Web App

1. Click **Deploy → New deployment**.
2. Click the ⚙️ gear icon next to "Select type" and choose **Web app**.
3. Configure:
   - **Description**: `POS Backend v1.0`
   - **Execute as**: `Me` (your Google account)
   - **Who has access**: `Anyone` (so the frontend can call it without auth)
4. Click **Deploy**.
5. **Copy the Web App URL** — you will need this for the frontend.

> [!WARNING]
> Choosing "Anyone" means the endpoint is publicly accessible. For production use, consider adding an API key check in `doPost()`.

### 2.4 Updating the Deployment

After making changes to `Code.gs`:

1. Click **Deploy → Manage deployments**.
2. Click the ✏️ edit icon on your deployment.
3. Under **Version**, select **New version**.
4. Click **Deploy**.

> [!CAUTION]
> You must create a **new version** each time you update the code. Simply saving the script does **NOT** update the live web app.

---

## 3. Frontend Configuration

### 3.1 Set the GAS URL

In your frontend source code, find the API configuration (typically in `src/config.js` or at the top of `src/App.jsx`) and update the `GAS_URL` constant:

```js
// Replace with your actual deployed Web App URL
const GAS_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
```

### 3.2 Install Dependencies

```bash
npm install
```

### 3.3 Run in Development Mode

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

---

## 4. Building & Deploying the Frontend

### 4.1 Production Build

```bash
npm run build
```

This generates optimised static files in the `dist/` folder.

### 4.2 Preview the Build Locally

```bash
npm run preview
```

### 4.3 Deploy to Hosting

The `dist/` folder can be deployed to any static hosting service:

| Service | Command |
|---------|---------|
| **Vercel** | `npx vercel --prod` |
| **Netlify** | Drag & drop `dist/` to Netlify dashboard |
| **GitHub Pages** | Push `dist/` to `gh-pages` branch |
| **Firebase Hosting** | `firebase deploy` (after `firebase init`) |
| **Cloudflare Pages** | Connect repo, set build output to `dist` |

---

## 5. Testing the Backend

You can test the backend independently using `curl` or any HTTP client:

```bash
# Health check
curl "YOUR_WEB_APP_URL"

# Get master data
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"action": "GET_MASTER_DATA"}'

# Add a transaction
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "ADD_TRANSACTION",
    "idTransaksi": "TXN001",
    "idProduk": "P001",
    "qty": 2,
    "idCustomer": "C001",
    "transaksiPic": "cashier1"
  }'

# Get customer cart
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{"action": "GET_CUSTOMER_CART", "idCustomer": "C001"}'
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Sheet 'Stok' not found` | Check that sheet tab names match exactly (case-sensitive) |
| CORS errors | GAS web apps handle CORS automatically; ensure you deployed with "Anyone" access |
| Stale data after code change | Create a **new version** in Manage Deployments |
| Lock timeout errors | Reduce concurrent requests or increase `waitLock` timeout |
| Formula errors (`#REF!`, `#N/A`) | Ensure `Transaksi` sheet exists and has the correct headers |
