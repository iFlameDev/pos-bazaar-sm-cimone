import { useState, useEffect, useCallback, useRef } from 'react';
import PicModal from './components/PicModal';
import CustomerSelect from './components/CustomerSelect';
import SelfServiceLogin from './components/SelfServiceLogin';
import ProductSelect from './components/ProductSelect';
import QtyPopup from './components/QtyPopup';
import CartView from './components/CartView';
import PurchasedView from './components/PurchasedView';
import ScanView from './components/ScanView';
import Ornaments from './components/Ornaments';
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
  clearCart,
  getCartItemCount,
  getCartTotal,
  changeCartItemVariant,
} from './utils/cartStorage';
import { triggerConfetti } from './utils/confetti';
import useLocalStorage from './hooks/useLocalStorage';

export default function App() {
  // ── Workflow step: 1=customer, 2=product, 3=cart, 4=purchased, 5=scan ──
  const [step, setStep] = useState(1);
  const [route, setRoute] = useState({ path: '/', searchParams: new URLSearchParams() });

  // ── Mode Selection ──
  const [appMode, setAppMode] = useLocalStorage('pos_app_mode', 'scan');

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

  const preloadImages = useCallback((products) => {
    if (!products) return;
    products.forEach((p) => {
      if (p.gambarUrl) {
        const img = new Image();
        img.src = p.gambarUrl;
      }
    });
  }, []);

  const loadMasterData = useCallback(
    async (forceRefresh = false) => {
      try {
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          const cached = getCachedMasterData();
          if (cached) {
            setMasterData(cached);
            preloadImages(cached.products);
            return cached;
          }
        }

        setLoading(true);
        const data = await fetchMasterData();
        setMasterData(data);
        setCachedMasterData(data);
        preloadImages(data.products);
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

  // Show PIC modal on first load if name is missing and in cashier mode
  useEffect(() => {
    if (route.path === '/cashier' && !picName) setShowPicModal(true);
  }, [route.path, picName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hash routing listener
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '') || '/';
      const [path, search] = hash.split('?');
      setRoute({ path, searchParams: new URLSearchParams(search || '') });
    };
    
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Enforce default mode based on route
  useEffect(() => {
    if (route.path === '/') {
      setAppMode('variant');
    } else if (route.path === '/cashier') {
      // Set default to flat mode for cashier (unless they change it later)
      setAppMode('scan');
    }
  }, [route.path, setAppMode]);

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
  const handleProductClick = useCallback((product) => {
    setPendingProduct(product);
    setShowQtyPopup(true);
  }, []);

  /** Qty confirmed – add to offline cart */
  const handleQtyConfirm = useCallback(
    (qty, selectedVariant) => {
      if (!selectedCustomer) return;

      const productToAdd = selectedVariant || pendingProduct;

      addToCart(selectedCustomer.id, productToAdd.id, qty);
      setCartVersion((v) => v + 1);

      showToast(`${productToAdd.namaProduk} ×${qty} ditambahkan ke keranjang`);
      triggerConfetti();
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
      transaksiPic: route.path === '/cashier' ? picName : 'Self-Service',
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

    // Go back to product select
    setStep(2);
    showToast('Transaksi berhasil disimpan!');
    triggerConfetti();
  }, [selectedCustomer, picName, showToast, route.path]);

  /** Open cart view */
  const handleOpenCart = useCallback(() => setStep(3), []);

  /** Open purchased view */
  const handleOpenPurchased = useCallback(() => setStep(4), []);

  /** Open scan view */
  const handleOpenScan = useCallback(() => setStep(5), []);

  /** Cart → back to products */
  const handleCartBack = useCallback(() => setStep(2), []);

  /** Purchased → back to products */
  const handlePurchasedBack = useCallback(() => setStep(2), []);

  /** Purchased saved successfully */
  const handlePurchasedSaved = useCallback(async (delta) => {
    setStep(2);
    showToast('Perubahan berhasil disimpan!');
    
    // Update local master data (no API re-fetch, fixes bug where balance reverts)
    setMasterData((prev) => {
      const newCustomers = prev.customers.map((c) => {
        if (c.id === selectedCustomer?.id) {
          return { ...c, saldoSekarang: c.saldoSekarang - delta };
        }
        return c;
      });

      const newData = { ...prev, customers: newCustomers };
      setCachedMasterData(newData);
      return newData;
    });
  }, [showToast, selectedCustomer]);

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
    <div className="relative min-h-screen bg-transparent">
      <Ornaments />
      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-[60] toast-enter">
          <div
            className={`
              px-5 py-3 rounded-xl shadow-2xl backdrop-blur-lg border text-sm font-medium
              ${
                toast.type === 'error'
                  ? 'bg-carnival-peach text-white border-carnival-peach/30'
                  : 'bg-carnival-green/20 border-carnival-green/30 text-carnival-green'
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

      {/* ── Step 1: Customer Select / Login ── */}
      {step === 1 && route.path === '/cashier' && (
        <CustomerSelect
          customers={masterData.customers}
          loading={loading}
          refreshing={refreshing}
          onSelectCustomer={handleSelectCustomer}
          onEditPic={handleEditPic}
          onRefreshData={handleRefreshData}
          picName={picName}
          filterKelas={route.searchParams.get('kelas')}
        />
      )}
      
      {step === 1 && route.path !== '/cashier' && (
        <SelfServiceLogin
          customers={masterData.customers}
          onLogin={handleSelectCustomer}
        />
      )}

      {/* ── Step 2: Product Select ── */}
      {step === 2 && selectedCustomer && (
        <>
          <ProductSelect
            products={masterData.products}
            customer={currentCustomer}
            currentBalance={currentBalance}
            cartDelta={cartTotal > 0 ? -cartTotal : 0}
            onProductClick={handleProductClick}
            onOpenCart={handleOpenCart}
            onOpenPurchased={handleOpenPurchased}
            onOpenScan={handleOpenScan}
            cartItemCount={cartItemCount}
            mode={appMode}
            isCustomerMode={route.path !== '/cashier'}
            onToggleMode={() => setAppMode(m => m === 'scan' ? 'variant' : 'scan')}
            onBack={() => {
              setStep(1);
              setSelectedCustomer(null);
            }}
          />

          {/* Qty Popup Overlay */}
          {showQtyPopup && pendingProduct && (
            <QtyPopup
              product={pendingProduct}
              currentBalance={currentBalance}
              mode={appMode}
              onConfirm={handleQtyConfirm}
              onCancel={() => {
                setShowQtyPopup(false);
                setPendingProduct(null);
              }}
            />
          )}
        </>
      )}

      {/* ── Step 3: Cart View (Offline Cart) ── */}
      {step === 3 && selectedCustomer && (
        <CartView
          cartItems={cartItems}
          products={masterData.products}
          customer={currentCustomer}
          currentBalance={currentBalance}
          cartDelta={cartTotal > 0 ? -cartTotal : 0}
          picName={picName}
          mode={appMode}
          onUpdateQty={handleCartUpdateQty}
          onRemoveItem={handleCartRemoveItem}
          onChangeVariant={handleCartChangeVariant}
          onSave={handleSaveCart}
          onBack={handleCartBack}
          onShowToast={showToast}
        />
      )}

      {/* ── Step 4: Purchased View (Server Transactions) ── */}
      {step === 4 && selectedCustomer && (
        <PurchasedView
          customer={currentCustomer}
          products={masterData.products}
          picName={picName}
          mode={appMode}
          onBack={handlePurchasedBack}
          onSaved={handlePurchasedSaved}
          onShowToast={showToast}
        />
      )}
      {/* ── Step 5: Scan View ── */}
      {step === 5 && selectedCustomer && (
        <ScanView
          products={masterData.products}
          customer={currentCustomer}
          currentBalance={currentBalance}
          cartDelta={cartTotal > 0 ? -cartTotal : 0}
          cartItemCount={cartItemCount}
          onBack={() => setStep(2)}
          onOpenCart={handleOpenCart}
          onOpenPurchased={handleOpenPurchased}
          onAddToCart={(product, qty) => {
            addToCart(selectedCustomer.id, product.id, qty);
            setCartVersion((v) => v + 1);
            showToast(`${product.namaProduk} ×${qty} ditambahkan ke keranjang`);
            triggerConfetti();
          }}
        />
      )}
    </div>
  );
}
