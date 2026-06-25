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
import { APP_NAME } from './config';
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
import { fetchCustomer, batchAddTransactions, fetchProductsData, fetchCustomersData } from './utils/api';
import useLocalStorage from './hooks/useLocalStorage';
import {
  getCachedProducts,
  getCachedCustomers,
  setCachedProducts,
  setCachedCustomers,
  clearMasterDataCache,
  updateCachedProductStock,
  updateCachedCustomerBalance,
} from './utils/cacheStorage';

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
  const [selectedCustomer, setSelectedCustomer] = useLocalStorage('pos_selected_customer', null);
  const [masterData, setMasterData] = useState({ parentProducts: [], variantProducts: [], customers: [] });
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

  const loadDataForRoute = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      let prods = null;
      let custs = null;

      if (!forceRefresh) {
        prods = getCachedProducts();
        if (route.path === '/cashier') {
          custs = getCachedCustomers();
        }
      }

      const promises = [];
      const fetchProds = !prods;
      const fetchCusts = route.path === '/cashier' && !custs;

      if (fetchProds) promises.push(fetchProductsData().then(p => { prods = p; setCachedProducts(p); }));
      if (fetchCusts) promises.push(fetchCustomersData().then(c => { custs = c; setCachedCustomers(c); }));

      if (promises.length > 0) {
        await Promise.all(promises);
      }

      const rawProds = prods || [];
      const isParent = (p) => (p.id && String(p.id).toUpperCase().startsWith('PRN-')) || (p.varian && p.varian.toUpperCase() === 'PARENT-000');
      
      const rawParents = rawProds.filter(isParent);
      const variants = rawProds.filter(p => !isParent(p));

      const parentProducts = rawParents.map(parent => {
        const childVariants = variants.filter(v => v.namaProduk === parent.namaProduk);
        const fallbackPrice = childVariants.find(v => Number(v.harga) > 0)?.harga || 0;
        const totalStock = childVariants.reduce((sum, v) => sum + (Number(v.stokSekarang) || 0), 0);
        const realCategory = childVariants.find(v => v.kategori)?.kategori || parent.kategori;
        return {
          ...parent,
          harga: fallbackPrice,
          stokSekarang: totalStock,
          kategori: realCategory,
          variants: childVariants
        };
      });

      setMasterData({ parentProducts, variantProducts: variants, customers: custs || [] });
      if (prods) preloadImages(prods);

    } catch (err) {
      console.error('Failed to load data:', err);
      showToast('Gagal memuat data. Coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [route.path, preloadImages, showToast]);

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

  // Fetch master data when entering step 1
  useEffect(() => {
    if (step === 1) {
      loadDataForRoute();
    }
  }, [step, loadDataForRoute]);

  // Auto-login session check
  useEffect(() => {
    if (selectedCustomer && step === 1) {
      setStep(2);
    }
  }, [selectedCustomer, step]);

  // ───────────────────── Handlers ─────────────────────

  /** Refresh data */
  const handleRefreshData = useCallback(async () => {
    setRefreshing(true);
    clearMasterDataCache();
    await loadDataForRoute(true);
    setRefreshing(false);
    showToast('Data berhasil diperbarui');
  }, [loadDataForRoute, showToast]);

  const syncCustomer = useCallback(async (id) => {
    try {
      const data = await fetchCustomer(id);
      setSelectedCustomer((prev) => (prev?.id === data.id ? data : prev));
      setMasterData((prev) => {
        const exists = prev.customers.some(c => c.id === data.id);
        const newCustomers = exists 
          ? prev.customers.map(c => c.id === data.id ? data : c)
          : [...prev.customers, data];
        if (route.path === '/cashier') {
          setCachedCustomers(newCustomers);
        }
        return { ...prev, customers: newCustomers };
      });
    } catch(err) {
      console.error('Failed to sync customer:', err);
    }
  }, [setSelectedCustomer, route.path]);

  /** Step 1 → 2: customer selected */
  const handleSelectCustomer = useCallback(
    (customer) => {
      setSelectedCustomer(customer);
      setStep(2);
      setCartVersion((v) => v + 1);
      
      if (route.path === '/cashier') {
        // Fetch customer balance strictly once during transition from Step 1 -> 2
        syncCustomer(customer.id);
      } else {
        // Self service already fetched fresh customer data during 'Check', just inject it
        setMasterData((prev) => {
          const exists = prev.customers.some(c => c.id === customer.id);
          const newCustomers = exists 
            ? prev.customers.map(c => c.id === customer.id ? customer : c)
            : [...prev.customers, customer];
          return { ...prev, customers: newCustomers };
        });
      }
    },
    [syncCustomer, route.path]
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

    let computedTotalCost = 0;

    // Update local master data (no API re-fetch)
    setMasterData((prev) => {
      const newVariants = prev.variantProducts.map((p) => {
        const cartItem = cartItems.find((ci) => ci.productId === p.id);
        if (cartItem) {
          return { ...p, stokSekarang: Math.max(0, p.stokSekarang - cartItem.qty) };
        }
        return p;
      });

      const newParents = prev.parentProducts.map(parent => {
        const childVariants = newVariants.filter(v => v.namaProduk === parent.namaProduk);
        const totalStock = childVariants.reduce((sum, v) => sum + (Number(v.stokSekarang) || 0), 0);
        return { ...parent, stokSekarang: totalStock, variants: childVariants };
      });

      const totalCost = cartItems.reduce((sum, ci) => {
        const prod = prev.variantProducts.find((p) => p.id === ci.productId);
        return sum + (prod ? ci.qty * prod.harga : 0);
      }, 0);
      
      computedTotalCost = totalCost;

      const newCustomers = prev.customers.map((c) => {
        if (c.id === selectedCustomer.id) {
          return { ...c, saldoSekarang: c.saldoSekarang - totalCost };
        }
        return c;
      });

      const newData = { parentProducts: newParents, variantProducts: newVariants, customers: newCustomers };
      return newData;
    });

    setSelectedCustomer((prev) => ({
      ...prev,
      saldoSekarang: prev.saldoSekarang - computedTotalCost,
    }));

    // Also update cache directly for each item
    cartItems.forEach((ci) => {
      updateCachedProductStock(ci.productId, ci.qty);
    });
    updateCachedCustomerBalance(selectedCustomer.id, computedTotalCost);

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
  const handlePurchasedSaved = useCallback(async (delta, changedItems) => {
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

      const newVariants = prev.variantProducts.map((p) => {
        if (changedItems) {
          const change = changedItems.find(ci => ci.idProduk === p.id);
          if (change) {
            return { ...p, stokSekarang: p.stokSekarang + change.stockDelta };
          }
        }
        return p;
      });

      const newParents = prev.parentProducts.map(parent => {
        const childVariants = newVariants.filter(v => v.namaProduk === parent.namaProduk);
        const totalStock = childVariants.reduce((sum, v) => sum + (Number(v.stokSekarang) || 0), 0);
        return { ...parent, stokSekarang: totalStock, variants: childVariants };
      });

      const newData = { parentProducts: newParents, variantProducts: newVariants, customers: newCustomers };
      // Note: setCachedProducts wants the flat array if we reload it later, but we can combine them back for cache
      setCachedProducts([...newParents, ...newVariants]);
      setCachedCustomers(newCustomers);
      return newData;
    });

    setSelectedCustomer((prev) => ({
      ...prev,
      saldoSekarang: prev.saldoSekarang - delta,
    }));
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
    ? getCartTotal(selectedCustomer.id, masterData.variantProducts)
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
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] pointer-events-none w-max max-w-[90vw]">
          <div className="toast-enter">
            <div
              className={`
                px-6 py-3 rounded-full shadow-2xl backdrop-blur-lg border text-sm font-medium text-center
                ${
                  toast.type === 'error'
                    ? 'bg-carnival-peach/95 text-white border-carnival-peach/30'
                    : 'bg-slate-800/95 text-white border-slate-700/50'
                }
              `}
            >
              {toast.message}
            </div>
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
            parentProducts={masterData.parentProducts}
            variantProducts={masterData.variantProducts}
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
          products={masterData.variantProducts}
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
          products={masterData.variantProducts}
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
          products={masterData.variantProducts}
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
