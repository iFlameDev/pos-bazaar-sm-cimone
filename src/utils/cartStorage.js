/**
 * Offline Cart Storage Utility
 * Manages per-customer shopping carts in localStorage.
 * Cart items are merged: same productId = combined qty.
 */

const CART_PREFIX = 'pos_cart_';

function getCartKey(customerId) {
  return `${CART_PREFIX}${customerId}`;
}

/**
 * Get all cart items for a customer.
 * @param {string} customerId
 * @returns {{ productId: string, qty: number, addedAt: string }[]}
 */
export function getCart(customerId) {
  try {
    const raw = localStorage.getItem(getCartKey(customerId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Add a product to the cart. If it already exists, merge (add qty).
 * @param {string} customerId
 * @param {string} productId
 * @param {number} qty
 */
export function addToCart(customerId, productId, qty) {
  const cart = getCart(customerId);
  const existing = cart.find((item) => item.productId === productId);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      productId,
      qty,
      addedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(getCartKey(customerId), JSON.stringify(cart));
}

/**
 * Update the qty of a specific product in the cart.
 * If qty <= 0, removes the item.
 * @param {string} customerId
 * @param {string} productId
 * @param {number} qty
 */
export function updateCartItem(customerId, productId, qty) {
  let cart = getCart(customerId);

  if (qty <= 0) {
    cart = cart.filter((item) => item.productId !== productId);
  } else {
    const existing = cart.find((item) => item.productId === productId);
    if (existing) {
      existing.qty = qty;
    }
  }

  localStorage.setItem(getCartKey(customerId), JSON.stringify(cart));
}

/**
 * Remove a product from the cart entirely.
 * @param {string} customerId
 * @param {string} productId
 */
export function removeFromCart(customerId, productId) {
  const cart = getCart(customerId).filter((item) => item.productId !== productId);
  localStorage.setItem(getCartKey(customerId), JSON.stringify(cart));
}

/**
 * Change the variant (productId) of an existing cart item.
 * @param {string} customerId
 * @param {string} oldProductId
 * @param {string} newProductId
 */
export function changeCartItemVariant(customerId, oldProductId, newProductId) {
  let cart = getCart(customerId);
  const oldItem = cart.find((item) => item.productId === oldProductId);
  
  if (oldItem) {
    const qty = oldItem.qty;
    cart = cart.filter((item) => item.productId !== oldProductId);
    
    const existingNew = cart.find((item) => item.productId === newProductId);
    if (existingNew) {
      existingNew.qty += qty;
    } else {
      cart.push({ productId: newProductId, qty, addedAt: new Date().toISOString() });
    }
    localStorage.setItem(getCartKey(customerId), JSON.stringify(cart));
  }
}

/**
 * Clear the entire cart for a customer.
 * @param {string} customerId
 */
export function clearCart(customerId) {
  localStorage.removeItem(getCartKey(customerId));
}

/**
 * Get total number of items in the cart.
 * @param {string} customerId
 * @returns {number}
 */
export function getCartItemCount(customerId) {
  return getCart(customerId).reduce((sum, item) => sum + item.qty, 0);
}

/**
 * Get total cost of items in the cart.
 * @param {string} customerId
 * @param {Object[]} products - Array of product objects with id and harga
 * @returns {number}
 */
export function getCartTotal(customerId, products) {
  const cart = getCart(customerId);
  return cart.reduce((sum, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return sum + (prod ? item.qty * prod.harga : 0);
  }, 0);
}
