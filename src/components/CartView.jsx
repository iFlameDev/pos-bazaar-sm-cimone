import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  ShoppingCart,
  ShoppingBag,
  Minus,
  Plus,
  Loader2,
  Send,
  Trash2,
} from 'lucide-react';
import CustomerProfile from './CustomerProfile';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const CartView = ({
  cartItems,
  products,
  customer,
  currentBalance,
  cartDelta,
  picName,
  onUpdateQty,
  onRemoveItem,
  onSave,
  onBack,
}) => {
  const [saving, setSaving] = useState(false);

  /* ── Product lookup helper ───────────────────────────────── */
  const getProduct = useCallback(
    (productId) => products.find((p) => p.id === productId),
    [products]
  );

  /* ── Enriched cart items ─────────────────────────────────── */
  const enrichedItems = useMemo(() => {
    return cartItems
      .map((item) => {
        const prod = getProduct(item.productId);
        if (!prod) return null;
        return {
          ...item,
          product: prod,
          subtotal: item.qty * prod.harga,
        };
      })
      .filter(Boolean);
  }, [cartItems, getProduct]);

  /* ── Totals ──────────────────────────────────────────────── */
  const { totalItems, totalCost } = useMemo(() => {
    return {
      totalItems: enrichedItems.reduce((sum, item) => sum + item.qty, 0),
      totalCost: enrichedItems.reduce((sum, item) => sum + item.subtotal, 0),
    };
  }, [enrichedItems]);

  /* ── Save Handler ────────────────────────────────────────── */
  const handleSave = async () => {
    if (saving || enrichedItems.length === 0) return;

    if (currentBalance < 0) {
      alert('Saldo customer tidak mencukupi! Kurangi item di keranjang.');
      return;
    }

    setSaving(true);
    try {
      await onSave();
    } catch (err) {
      console.error('Failed to save cart:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-slide-in-right">
      {/* ── Sticky Header ───────────────────────────── */}
      <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-violet-400" />
              <h1 className="text-lg font-bold text-slate-100">Keranjang</h1>
            </div>
          </div>

          <CustomerProfile
            customer={customer}
            adjustedBalance={currentBalance}
            cartDelta={cartDelta}
          />
        </div>
      </div>

      {/* ── Cart Items List ─────────────────────────── */}
      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-4 py-4 pb-36">
        {enrichedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ShoppingBag className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-base font-medium mb-1">Keranjang kosong</p>
            <p className="text-sm text-slate-500/60">
              Pilih produk untuk ditambahkan ke keranjang
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {enrichedItems.map((item) => (
              <div
                key={item.productId}
                className="glass-card p-4 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-100 truncate">
                      {item.product.namaProduk} {item.product.varian ? `(${item.product.varian})` : ''}
                    </h3>
                    <p className="text-violet-400 font-bold text-base mt-0.5">
                      {formatCurrency(item.product.harga)}
                    </p>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        if (item.qty <= 1) {
                          onRemoveItem(item.productId);
                        } else {
                          onUpdateQty(item.productId, item.qty - 1);
                        }
                      }}
                      className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600/50 flex items-center justify-center text-slate-300 transition-all hover:bg-slate-600 active:scale-90"
                    >
                      {item.qty === 1 ? (
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <span className="min-w-[2rem] text-center text-lg font-bold tabular-nums text-slate-100">
                      {item.qty}
                    </span>

                    <button
                      onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                      disabled={item.qty >= item.product.stokSekarang}
                      className="w-8 h-8 rounded-full bg-violet-600 border border-violet-500/50 flex items-center justify-center text-white transition-all hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 shadow-md shadow-violet-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="flex items-center justify-end mt-2 pt-2 border-t border-slate-700/30">
                  <span className="text-sm font-medium text-slate-300 tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Sticky Bottom ───────────────────────────── */}
      {enrichedItems.length > 0 && (
        <div className="sticky bottom-0 z-30 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/60">
          <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {totalItems} item{totalItems !== 1 ? 's' : ''}
              </span>
              <span className="text-slate-100 font-bold text-base">
                {formatCurrency(totalCost)}
              </span>
            </div>

            <div className="flex gap-3">
              <button onClick={onBack} className="btn-secondary flex-1">
                Kembali
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Simpan Transaksi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartView;
