import { useState, useEffect, useCallback, useRef } from 'react';
import { ShoppingCart } from 'lucide-react';
import PicModal from './components/PicModal';
import CustomerSelect from './components/CustomerSelect';
import ProductSelect from './components/ProductSelect';
import QtyPopup from './components/QtyPopup';
import CartView from './components/CartView';
import { fetchMasterData, addTransaction, getCustomerCart } from './utils/api';
import useLocalStorage from './hooks/useLocalStorage';

export default function App() {
  // ── Workflow step: 1=customer, 2=product, 4=cart ──
  const [step, setStep] = useState(1);

  // ── PIC (Person In Charge) ──
  const [picName, setPicName] = useLocalStorage('pos_pic_name', '');
  const [showPicModal, setShowPicModal] = useState(false);

  // ── Customer & master data ──
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [masterData, setMasterData] = useState({ products: [], customers: [] });
  const [masterDataLoaded, setMasterDataLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Product selection / qty popup ──
  const [showQtyPopup, setShowQtyPopup] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [clickOrigin, setClickOrigin] = useState({ x: 0, y: 0 });

  // ── Session items (added this session, for live balance tracking) ──
  const [sessionItems, setSessionItems] = useState([]);

  // ── Cart FAB bump ──
  const [cartBump, setCartBump] = useState(false);

  // ── Flying animation ──
  const [flyingItem, setFlyingItem] = useState(null);

  // ── Toast notification ──
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Cart FAB position is calculated from the fixed bottom-right position

  // ───────────────────── Helpers ─────────────────────

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadMasterData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMasterData();
      setMasterData(data);
      setMasterDataLoaded(true);
    } catch (err) {
      console.error('Failed to load master data:', err);
      showToast('Gagal memuat data. Coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // ───────────────────── Effects ─────────────────────

  // Show PIC modal on first load if name is missing
  useEffect(() => {
    if (!picName) setShowPicModal(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch master data on mount
  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  // ───────────────────── Handlers ─────────────────────

  /** Step 1 → 2: customer selected */
  const handleSelectCustomer = useCallback(
    async (customer) => {
      setSelectedCustomer(customer);
      setStep(2);
      try {
        setLoading(true);
        const [master, cart] = await Promise.all([
          fetchMasterData(),
          getCustomerCart(customer.id)
        ]);
        setMasterData(master);
        setSessionItems(cart.transactions || []);
        setMasterDataLoaded(true);
      } catch (err) {
        console.error('Failed to load data:', err);
        showToast('Gagal memuat data. Coba lagi.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  /** Product card clicked – prepare qty popup */
  const handleProductClick = useCallback((product, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setClickOrigin({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setPendingProduct(product);
    setShowQtyPopup(true);
  }, []);

  /** Qty confirmed – add to session + call API */
  const handleQtyConfirm = useCallback(
    async (qty) => {
      if (!pendingProduct || !selectedCustomer) return;

      const idTransaksi = crypto.randomUUID();

      // Close popup immediately for better UX while loading
      setShowQtyPopup(false);
      setPendingProduct(null);

      try {
        setLoading(true);
        
        // 1. Wait for API save
        await addTransaction({
          idTransaksi,
          idProduk: pendingProduct.id,
          qty,
          idCustomer: selectedCustomer.id,
          transaksiPic: picName,
        });

        // 2. Refresh data from server
        const [master, cart] = await Promise.all([
          fetchMasterData(),
          getCustomerCart(selectedCustomer.id)
        ]);
        setMasterData(master);
        setSessionItems(cart.transactions || []);

        // 3. Trigger flying animation
        const cartEndX = window.innerWidth - 24 - 28; // right-6 + half of w-14
        const cartEndY = window.innerHeight - 24 - 28; // bottom-6 + half of h-14
        setFlyingItem({
          startX: clickOrigin.x,
          startY: clickOrigin.y,
          endX: cartEndX,
          endY: cartEndY,
        });
        setTimeout(() => setFlyingItem(null), 650);

        // 4. Cart bump animation
        setCartBump(true);
        setTimeout(() => setCartBump(false), 550);

        // 5. Toast
        showToast(`${pendingProduct.namaProduk} ×${qty} ditambahkan`);
      } catch (err) {
        console.error('Failed to save transaction:', err);
        showToast('Gagal menyimpan transaksi!', 'error');
      } finally {
        setLoading(false);
      }
    },
    [pendingProduct, selectedCustomer, clickOrigin, picName, showToast],
  );

  /** Open cart view */
  const handleOpenCart = useCallback(() => setStep(4), []);

  /** Cart → back to products */
  const handleCartBack = useCallback(() => setStep(2), []);

  /** Cart saved successfully */
  const handleCartSaved = useCallback(async () => {
    setStep(2);
    showToast('Keranjang berhasil disimpan!');
    try {
      setLoading(true);
      const [master, cart] = await Promise.all([
        fetchMasterData(),
        getCustomerCart(selectedCustomer.id)
      ]);
      setMasterData(master);
      setSessionItems(cart.transactions || []);
    } catch (err) {
      console.error('Failed to refresh data after cart save:', err);
      showToast('Gagal memuat data terbaru.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, selectedCustomer]);

  /** Edit PIC name */
  const handleEditPic = useCallback(() => setShowPicModal(true), []);

  // ───────────────────── Derived state ─────────────────────

  const cartItemCount = sessionItems.reduce((sum, item) => sum + item.qty, 0);

  const currentCustomer = masterData.customers.find(c => c.id === selectedCustomer?.id) || selectedCustomer;
  const currentBalance = currentCustomer ? currentCustomer.saldoSekarang : 0;

  // ───────────────────── Render ─────────────────────

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* ── Flying Item Animation ── */}
      {flyingItem && (
        <div
          className="fly-item"
          style={{
            left: flyingItem.startX,
            top: flyingItem.startY,
            '--fly-x': `${flyingItem.endX - flyingItem.startX}px`,
            '--fly-y': `${flyingItem.endY - flyingItem.startY}px`,
          }}
        >
          <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/50">
            <ShoppingCart className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 toast-enter">
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
          onSelectCustomer={handleSelectCustomer}
          onEditPic={handleEditPic}
          picName={picName}
        />
      )}

      {/* ── Step 2: Product Select ── */}
      {step === 2 && (
        <>
          <ProductSelect
            products={masterData.products}
            customer={selectedCustomer}
            sessionItems={sessionItems}
            currentBalance={currentBalance}
            loading={loading}
            onProductClick={handleProductClick}
            onOpenCart={handleOpenCart}
            cartItemCount={cartItemCount}
            cartBump={cartBump}
            onBack={() => setStep(1)}
          />

          {/* Qty Popup Overlay */}
          {showQtyPopup && pendingProduct && (
            <QtyPopup
              product={pendingProduct}
              customer={selectedCustomer}
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

      {/* ── Step 4: Cart View ── */}
      {step === 4 && (
        <CartView
          customer={selectedCustomer}
          products={masterData.products}
          picName={picName}
          onBack={handleCartBack}
          onSaved={handleCartSaved}
        />
      )}

      {/* Cart FAB is rendered inside ProductSelect */}
    </div>
  );
}
