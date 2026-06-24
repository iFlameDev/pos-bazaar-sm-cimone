/**
 * Master Data Cache Utility
 * Caches product and customer data in localStorage.
 * Cache expires at midnight (00:00) each day.
 */

const CACHE_KEY_PRODS = 'pos_products_cache';
const CACHE_KEY_CUSTS = 'pos_customers_cache';

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}

function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached.expiresAt && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    return null;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    const cacheEntry = {
      data,
      expiresAt: getNextMidnight(),
      cachedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  } catch (err) {
    console.warn('Failed to cache:', err);
  }
}

export function getCachedProducts() {
  return getCache(CACHE_KEY_PRODS);
}

export function getCachedCustomers() {
  return getCache(CACHE_KEY_CUSTS);
}

export function setCachedProducts(products) {
  setCache(CACHE_KEY_PRODS, products);
}

export function setCachedCustomers(customers) {
  setCache(CACHE_KEY_CUSTS, customers);
}

export function clearMasterDataCache() {
  localStorage.removeItem(CACHE_KEY_PRODS);
  localStorage.removeItem(CACHE_KEY_CUSTS);
}

export function updateCachedProductStock(productId, qtyReduction) {
  const prods = getCachedProducts();
  if (!prods) return;
  const p = prods.find((x) => x.id === productId);
  if (p) {
    p.stokSekarang = Math.max(0, p.stokSekarang - qtyReduction);
    setCachedProducts(prods);
  }
}

export function updateCachedCustomerBalance(customerId, amountReduction) {
  const custs = getCachedCustomers();
  if (!custs) return;
  const c = custs.find((x) => x.id === customerId);
  if (c) {
    c.saldoSekarang -= amountReduction;
    setCachedCustomers(custs);
  }
}
