import { GAS_URL } from '../config';

/**
 * Internal helper – POST a JSON payload to the GAS Web App.
 * Uses Content-Type: text/plain to skip CORS preflight.
 * Parses the text response as JSON.
 */
async function gasPost(payload) {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`GAS request failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse GAS response as JSON: ${text.slice(0, 200)}`);
  }
}

/**
 * Fetch all products and customers from the master data sheet.
 * @returns {Promise<{ products: Product[], customers: Customer[] }>}
 */
export async function fetchMasterData() {
  return gasPost({ action: 'GET_MASTER_DATA' });
}

/**
 * Fetch a single customer by ID
 * @param {string} idCustomer
 * @returns {Promise<{ customer: Customer }>}
 */
export async function fetchCustomer(idCustomer) {
  return gasPost({ action: 'GET_CUSTOMER', idCustomer });
}

/**
 * Add a single transaction row.
 * @param {{ idTransaksi: string, idProduk: string, qty: number, idCustomer: string, transaksiPic: string }} params
 * @returns {Promise<{ success: boolean }>}
 */
export async function addTransaction({ idTransaksi, idProduk, qty, idCustomer, transaksiPic }) {
  return gasPost({
    action: 'ADD_TRANSACTION',
    idTransaksi,
    idProduk,
    qty,
    idCustomer,
    transaksiPic,
  });
}

/**
 * Retrieve every cart item for a given customer.
 * @param {string} idCustomer
 * @returns {Promise<{ transactions: Transaction[] }>}
 */
export async function getCustomerCart(idCustomer) {
  return gasPost({
    action: 'GET_CUSTOMER_CART',
    idCustomer,
  });
}

/**
 * Batch-update (edit / delete) multiple cart rows at once.
 * @param {Transaction[]} transactions
 * @returns {Promise<{ success: boolean }>}
 */
export async function batchUpdateCart(transactions) {
  return gasPost({
    action: 'BATCH_UPDATE_CART',
    transactions,
  });
}

/**
 * Batch-add multiple new transaction rows at once.
 * @param {Array<{ idTransaksi: string, idProduk: string, qty: number, idCustomer: string, transaksiPic: string }>} transactions
 * @returns {Promise<{ success: boolean }>}
 */
export async function batchAddTransactions(transactions) {
  return gasPost({
    action: 'BATCH_ADD_TRANSACTIONS',
    transactions,
  });
}
