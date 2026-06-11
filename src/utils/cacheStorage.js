/**
 * Master Data Cache Utility
 * Caches product and customer data in localStorage.
 * Cache expires at midnight (00:00) each day.
 */

const CACHE_KEY = 'pos_master_data_cache';

/**
 * Calculate the next midnight timestamp.
 * @returns {number} Unix timestamp of next 00:00
 */
function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

/**
 * Check if cached master data is still valid.
 * @returns {boolean}
 */
export function isCacheValid() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const cached = JSON.parse(raw);
    return cached.expiresAt && Date.now() < cached.expiresAt;
  } catch {
    return false;
  }
}

/**
 * Get cached master data if valid.
 * @returns {{ products: Object[], customers: Object[] } | null}
 */
export function getCachedMasterData() {
  try {
    if (!isCacheValid()) return null;
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    return { products: cached.products, customers: cached.customers };
  } catch {
    return null;
  }
}

/**
 * Save master data to cache with midnight expiry.
 * @param {{ products: Object[], customers: Object[] }} data
 */
export function setCachedMasterData(data) {
  try {
    const cacheEntry = {
      products: data.products,
      customers: data.customers,
      expiresAt: getNextMidnight(),
      cachedAt: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (err) {
    console.warn('Failed to cache master data:', err);
  }
}

/**
 * Clear the master data cache (used by refresh button).
 */
export function clearMasterDataCache() {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Update a specific product's stock in the cached data.
 * @param {string} productId
 * @param {number} qtyReduction - Amount to subtract from stokSekarang
 */
export function updateCachedProductStock(productId, qtyReduction) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw);
    const product = cached.products.find((p) => p.id === productId);
    if (product) {
      product.stokSekarang = Math.max(0, product.stokSekarang - qtyReduction);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (err) {
    console.warn('Failed to update cached stock:', err);
  }
}

/**
 * Update a specific customer's balance in the cached data.
 * @param {string} customerId
 * @param {number} amountReduction - Amount to subtract from saldoSekarang
 */
export function updateCachedCustomerBalance(customerId, amountReduction) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw);
    const customer = cached.customers.find((c) => c.id === customerId);
    if (customer) {
      customer.saldoSekarang -= amountReduction;
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (err) {
    console.warn('Failed to update cached balance:', err);
  }
}
