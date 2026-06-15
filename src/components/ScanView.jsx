import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, ShoppingCart, ClipboardList, Minus, Plus, Wallet, ScanLine } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import CustomerProfile from './CustomerProfile';

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID').format(amount);

const ScanView = ({
  products,
  customer,
  currentBalance,
  cartDelta,
  cartItemCount,
  onBack,
  onOpenCart,
  onOpenPurchased,
  onAddToCart
}) => {
  const [pendingProduct, setPendingProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [scannerReady, setScannerReady] = useState(false);
  const [cartShake, setCartShake] = useState(false);
  
  const scannerRef = useRef(null);
  const html5QrCode = useRef(null);
  
  // Use ref to access latest state inside the scanner callback
  const stateRef = useRef({ pendingProduct, qty });
  useEffect(() => {
    stateRef.current = { pendingProduct, qty };
  }, [pendingProduct, qty]);

  // Handle Add to cart
  const handleAddToCart = useCallback((product, quantity) => {
    onAddToCart(product, quantity);
    setCartShake(true);
    setTimeout(() => setCartShake(false), 500);
  }, [onAddToCart]);

  // Start Scanner
  useEffect(() => {
    let isComponentMounted = true;

    const startScanner = async () => {
      try {
        html5QrCode.current = new Html5Qrcode("reader");
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        await html5QrCode.current.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Callback when QR detected
            const foundProduct = products.find(p => p.id === decodedText || p.kode === decodedText); // fallback if kode exists
            
            if (foundProduct) {
              const currentPending = stateRef.current.pendingProduct;
              const currentQty = stateRef.current.qty;

              if (currentPending && currentPending.id !== foundProduct.id) {
                // Auto add to cart if another product was pending
                handleAddToCart(currentPending, currentQty);
                // Set the new product
                setPendingProduct(foundProduct);
                setQty(1);
              } else if (!currentPending) {
                // Just set the new product
                setPendingProduct(foundProduct);
                setQty(1);
              }
              // If it's the SAME product, we do nothing to prevent spamming
            }
          },
          (errorMessage) => {
            // Ignore normal scanning errors
          }
        );
        if (isComponentMounted) setScannerReady(true);
      } catch (err) {
        console.error("Scanner error:", err);
      }
    };

    startScanner();

    return () => {
      isComponentMounted = false;
      if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop().then(() => {
          html5QrCode.current.clear();
        }).catch(err => console.error(err));
      }
    };
  }, [products, handleAddToCart]);

  const maxByStock = pendingProduct ? pendingProduct.stokSekarang : 0;
  const remainingBalance = pendingProduct ? currentBalance - (qty * pendingProduct.harga) : currentBalance;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* ── Sticky Top Section ──────────────────────── */}
      <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-violet-400" />
              <h1 className="text-lg font-bold text-slate-100">Mode Scan</h1>
            </div>
          </div>
          <CustomerProfile
            customer={customer}
            adjustedBalance={currentBalance}
            cartDelta={cartDelta}
          />
        </div>
      </div>

      {/* ── Scanner View ─────────────────────────────── */}
      <main className="flex-1 flex flex-col relative w-full max-w-5xl mx-auto">
        <div className="w-full flex-1 bg-black flex items-center justify-center overflow-hidden relative">
          <div id="reader" className="w-full h-full max-w-md mx-auto" ref={scannerRef}></div>
          {!scannerReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-white z-10">
              <p className="animate-pulse">Memulai Kamera...</p>
            </div>
          )}
        </div>

        {/* ── FABs ───────────────────────────────────── */}
        {/* Adjusted bottom position based on whether pendingProduct is visible to avoid overlap */}
        <div className={`fixed right-6 z-40 flex flex-col gap-3 items-center transition-all duration-300 ${pendingProduct ? 'bottom-[280px]' : 'bottom-6'}`}>
          <button
            onClick={onOpenPurchased}
            className="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 transition-transform duration-200 hover:scale-110 focus:outline-none"
          >
            <ClipboardList className="w-5 h-5 text-white" />
          </button>

          <button
            onClick={onOpenCart}
            className={`relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center shadow-xl shadow-violet-500/30 transition-transform duration-200 hover:scale-110 focus:outline-none ${cartShake ? 'animate-shake' : ''}`}
          >
            <span className="absolute inset-0 rounded-full bg-violet-500/40 animate-pulse-ring" />
            <ShoppingCart className="w-6 h-6 text-white relative z-10" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 z-20 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-slate-950">
                {cartItemCount > 99 ? '99+' : cartItemCount}
              </span>
            )}
          </button>
        </div>

        {/* ── Scan Result Bottom Sheet ───────────────── */}
        {pendingProduct && (
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/60 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
            <div className="max-w-5xl mx-auto p-5 space-y-4">
              <div className="w-12 h-1.5 bg-slate-700/50 rounded-full mx-auto mb-2" />
              
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-100 mb-1 line-clamp-1">{pendingProduct.namaProduk}</h2>
                {pendingProduct.varian && (
                  <div className="mt-2 mb-1">
                    <span className="inline-block px-2.5 py-1 text-[11px] font-medium rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      {pendingProduct.varian}
                    </span>
                  </div>
                )}
                <p className="text-violet-400 font-semibold text-lg">{formatCurrency(pendingProduct.harga)}</p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 active:scale-90 disabled:opacity-30"
                >
                  <Minus className="w-5 h-5" />
                </button>

                <div className="w-20 h-14 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-center text-3xl font-bold text-slate-100">
                  {qty}
                </div>

                <button
                  onClick={() => setQty(Math.min(maxByStock, qty + 1))}
                  disabled={qty >= maxByStock}
                  className="w-11 h-11 rounded-full bg-violet-600 border border-violet-500/50 flex items-center justify-center text-white active:scale-90 disabled:opacity-30"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className={`rounded-xl border p-3 text-center transition-colors duration-200 ${
                remainingBalance < 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-slate-950/50 border-slate-800 text-emerald-400'
              }`}>
                <p className="text-xs text-slate-400 mb-0.5">Sisa Saldo</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(remainingBalance)}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setPendingProduct(null)} 
                  className="flex-1 py-3.5 rounded-xl font-bold text-slate-300 bg-slate-800 border border-slate-700 active:scale-95 transition-transform"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    handleAddToCart(pendingProduct, qty);
                    setPendingProduct(null);
                  }}
                  disabled={qty < 1 || remainingBalance < 0}
                  className="flex-[2] py-3.5 rounded-xl font-bold text-white bg-violet-600 shadow-lg shadow-violet-600/30 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Ke Keranjang
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ScanView;
