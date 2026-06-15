import { useState, useEffect, useCallback, useRef } from 'react';
import PicModal from './components/PicModal';
import CustomerSelect from './components/CustomerSelect';
import ProductSelect from './components/ProductSelect';
import QtyPopup from './components/QtyPopup';
import CartView from './components/CartView';
import PurchasedView from './components/PurchasedView';
import { fetchMasterData, fetchCustomer, batchAddTransactions } from './utils/api';
import { APP_NAME } from './config';
import {
  getCachedMasterData,
  setCachedMasterData,
  clearMasterDataCache,
  updateCachedProductStock,
  updateCachedCustomerBalance,
} from './utils/cacheStorage';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  changeCartItemVariant,
  clearCart,
  getCartItemCount,
  getCartTotal,
} from './utils/cartStorage';
import useLocalStorage from './hooks/useLocalStorage';

export default function App() {
  // ── Workflow step: 1=customer, 2=product, 3=cart, 4=purchased ──
  const [step, setStep] = useState(1);

  // ── PIC (Person In Charge) ──
  const [picName, setPicName] = useLocalStorage('pos_pic_name', '');
  const [showPicModal, setShowPicModal] = useState(false);

  // ── Customer & master data ──
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [masterData, setMasterData] = useState({ products: [], customers: [] });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Product selection / qty popup ──
  const [showQtyPopup, setShowQtyPopup] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);

  // ── Cart state (triggers re-render) ──
  const [cartVersion, setCartVersion] = useState(0);


  // ── Toast notification ──
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // ───────────────────── Helpers ─────────────────────

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadMasterData = useCallback(
    async (forceRefresh = false) => {
      try {
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          const cached = getCachedMasterData();
          if (cached) {
            setMasterData(cached);
            return cached;
          }
        }

        setLoading(true);
        const data = await fetchMasterData();
        setMasterData(data);
        setCachedMasterData(data);
        return data;
      } catch (err) {
        console.error('Failed to load master data:', err);
        showToast('Gagal memuat data. Coba lagi.', 'error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  // ───────────────────── Effects ─────────────────────

  // Set document title from config
  useEffect(() => {
    document.title = APP_NAME;
  }, []);

  // Show PIC modal on first load if name is missing
  useEffect(() => {
    if (!picName) setShowPicModal(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch master data on mount
  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // ───────────────────── Handlers ─────────────────────

  /** Refresh data (clear cache + re-fetch) */
  const handleRefreshData = useCallback(async () => {
    setRefreshing(true);
    clearMasterDataCache();
    await loadMasterData(true);
    setRefreshing(false);
    showToast('Data berhasil diperbarui');
  }, [loadMasterData, showToast]);

  const syncCustomer = useCallback(async (id) => {
    try {
      const data = await fetchCustomer(id);
      setMasterData((prev) => {
        const newCustomers = prev.customers.map(c => 
          c.id === data.id ? data : c
        );
        const newData = { ...prev, customers: newCustomers };
        setCachedMasterData(newData);
        return newData;
      });
    } catch(err) {
      console.error('Failed to sync customer:', err);
    }
  }, []);



  /** Step 1 → 2: customer selected */
  const handleSelectCustomer = useCallback(
    (customer) => {
      setSelectedCustomer(customer);
      setStep(2);
      setCartVersion((v) => v + 1);
      // Fetch customer balance strictly once during transition from Step 1 -> 2
      syncCustomer(customer.id);
    },
    [syncCustomer]
  );

  /** Product card clicked – prepare qty popup */
  const handleProductClick = useCallback((productGroup) => {
    setPendingProduct(productGroup);
    setShowQtyPopup(true);
  }, []);

  /** Qty confirmed – add to offline cart */
  const handleQtyConfirm = useCallback(
    (qty, selectedProduct) => {
      if (!pendingProduct || !selectedCustomer || !selectedProduct) return;

      addToCart(selectedCustomer.id, selectedProduct.id, qty);
      setCartVersion((v) => v + 1);

      const varianText = selectedProduct.varian ? ` (${selectedProduct.varian})` : '';
      showToast(`${selectedProduct.namaProduk}${varianText} ×${qty} ditambahkan ke keranjang`);
      setShowQtyPopup(false);
      setPendingProduct(null);
    },
    [pendingProduct, selectedCustomer, showToast]
  );

  /** Save cart – batch add transactions to server */
  const handleSaveCart = useCallback(async () => {
    if (!selectedCustomer) return;

    const cartItems = getCart(selectedCustomer.id);
    if (cartItems.length === 0) return;

    // Build transaction array
    const transactions = cartItems.map((item) => ({
      idTransaksi: crypto.randomUUID(),
      idProduk: item.productId,
      qty: item.qty,
      idCustomer: selectedCustomer.id,
      transaksiPic: picName,
    }));

    await batchAddTransactions(transactions);

    // Update local master data (no API re-fetch)
    setMasterData((prev) => {
      const newProducts = prev.products.map((p) => {
        const cartItem = cartItems.find((ci) => ci.productId === p.id);
        if (cartItem) {
          return { ...p, stokSekarang: Math.max(0, p.stokSekarang - cartItem.qty) };
        }
        return p;
      });

      const totalCost = cartItems.reduce((sum, ci) => {
        const prod = prev.products.find((p) => p.id === ci.productId);
        return sum + (prod ? ci.qty * prod.harga : 0);
      }, 0);

      const newCustomers = prev.customers.map((c) => {
        if (c.id === selectedCustomer.id) {
          return { ...c, saldoSekarang: c.saldoSekarang - totalCost };
        }
        return c;
      });

      const newData = { products: newProducts, customers: newCustomers };
      setCachedMasterData(newData);
      return newData;
    });

    // Also update cache directly for each item
    cartItems.forEach((ci) => {
      updateCachedProductStock(ci.productId, ci.qty);
    });

    // Clear offline cart
    clearCart(selectedCustomer.id);
    setCartVersion((v) => v + 1);

    // Update purchased count
    setPurchasedItemCount((prev) => prev + cartItems.length);

    // Go back to product select
    setStep(2);
    showToast('Transaksi berhasil disimpan!');
  }, [selectedCustomer, picName, showToast]);

  /** Open cart view */
  const handleOpenCart = useCallback(() => setStep(3), []);

  /** Open purchased view */
  const handleOpenPurchased = useCallback(() => setStep(4), []);

  /** Cart → back to products */
  const handleCartBack = useCallback(() => setStep(2), []);

  /** Purchased → back to products */
  const handlePurchasedBack = useCallback(() => setStep(2), []);

  /** Purchased saved successfully */
  const handlePurchasedSaved = useCallback(async () => {
    setStep(2);
    showToast('Perubahan berhasil disimpan!');
    // Refresh master data since server state changed (stok/saldo)
    await loadMasterData(true);
  }, [showToast, loadMasterData]);

  /** Edit PIC name */
  const handleEditPic = useCallback(() => setShowPicModal(true), []);

  /** Handle cart item qty update */
  const handleCartUpdateQty = useCallback(
    (productId, qty) => {
      if (!selectedCustomer) return;
      updateCartItem(selectedCustomer.id, productId, qty);
      setCartVersion((v) => v + 1);
    },
    [selectedCustomer]
  );

  /** Handle cart item removal */
  const handleCartRemoveItem = useCallback(
    (productId) => {
      if (!selectedCustomer) return;
      removeFromCart(selectedCustomer.id, productId);
      setCartVersion((v) => v + 1);
    },
    [selectedCustomer]
  );

  /** Handle cart item variant change */
  const handleCartChangeVariant = useCallback(
    (oldProductId, newProductId) => {
      if (!selectedCustomer) return;
      changeCartItemVariant(selectedCustomer.id, oldProductId, newProductId);
      setCartVersion((v) => v + 1);
    },
    [selectedCustomer]
  );

  // ───────────────────── Derived state ─────────────────────

  const currentCustomer =
    masterData.customers.find((c) => c.id === selectedCustomer?.id) || selectedCustomer;

  const cartItems = selectedCustomer ? getCart(selectedCustomer.id) : [];
  const cartItemCount = selectedCustomer ? getCartItemCount(selectedCustomer.id) : 0;
  const cartTotal = selectedCustomer
    ? getCartTotal(selectedCustomer.id, masterData.products)
    : 0;

  const currentBalance = currentCustomer ? currentCustomer.saldoSekarang - cartTotal : 0;

  // Force re-read of cart on cartVersion changes
  void cartVersion;

  // ───────────────────── Render ─────────────────────

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] toast-enter">
          <div
            className={`
              px-5 py-3 rounded-xl shadow-2xl backdrop-blur-lg border text-sm font-medium
              ${
                toast.type === 'error'
                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
              }
            `}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* ── PIC Modal ── */}
      {showPicModal && (
        <PicModal
          isOpen={true}
          defaultName={picName}
          onSave={(name) => {
            setPicName(name);
            setShowPicModal(false);
          }}
        />
      )}

      {/* ── Step 1: Customer Select ── */}
      {step === 1 && (
        <CustomerSelect
          customers={masterData.customers}
          loading={loading}
          refreshing={refreshing}
          onSelectCustomer={handleSelectCustomer}
          onEditPic={handleEditPic}
          onRefreshData={handleRefreshData}
          picName={picName}
        />
      )}

      {/* ── Step 2: Product Select ── */}
      <div className={step === 2 && selectedCustomer ? 'block' : 'hidden'}>
        {selectedCustomer && (
          <>
            <ProductSelect
              products={masterData.products}
              customer={currentCustomer}
              currentBalance={currentBalance}
              cartDelta={cartTotal > 0 ? -cartTotal : 0}
              onProductClick={handleProductClick}
              onOpenCart={handleOpenCart}
              onOpenPurchased={handleOpenPurchased}
              cartItemCount={cartItemCount}
              onBack={() => {
                setStep(1);
                setSelectedCustomer(null);
              }}
            />

            {/* Qty Popup Overlay */}
            {showQtyPopup && pendingProduct && (
              <QtyPopup
                productGroup={pendingProduct}
                currentBalance={currentBalance}
                onConfirm={handleQtyConfirm}
                onCancel={() => {
                  setShowQtyPopup(false);
                  setPendingProduct(null);
                }}
              />
            )}
          </>
        )}
      </div>

      {/* ── Step 3: Cart View (Offline Cart) ── */}
      {step === 3 && selectedCustomer && (
        <CartView
          cartItems={cartItems}
          products={masterData.products}
          customer={currentCustomer}
          currentBalance={currentBalance}
          cartDelta={cartTotal > 0 ? -cartTotal : 0}
          picName={picName}
          onUpdateQty={handleCartUpdateQty}
          onRemoveItem={handleCartRemoveItem}
          onChangeVariant={handleCartChangeVariant}
          onSave={handleSaveCart}
          onBack={handleCartBack}
        />
      )}

      {/* ── Step 4: Purchased View (Server Transactions) ── */}
      {step === 4 && selectedCustomer && (
        <PurchasedView
          customer={currentCustomer}
          products={masterData.products}
          picName={picName}
          onBack={handlePurchasedBack}
          onSaved={handlePurchasedSaved}
        />
      )}
    </div>
  );
}
