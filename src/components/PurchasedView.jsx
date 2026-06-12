import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  ClipboardList,
  ShoppingBag,
  Minus,
  Plus,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import CustomerProfile from './CustomerProfile';
import { getCustomerCart, batchUpdateCart } from '../utils/api';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const PurchasedView = ({ customer, products, picName, onBack, onSaved, onLoaded }) => {
  const [cartItems, setCartItems] = useState([]);
  const [originalItems, setOriginalItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ── Fetch purchased items on mount ──────────────────────── */
  useEffect(() => {
    let cancelled = false;

    const fetchCart = async () => {
      setLoading(true);
      try {
        const response = await getCustomerCart(customer.id);
        const items = response.transactions || [];
        if (!cancelled) {
          setCartItems(items);
          setOriginalItems(JSON.parse(JSON.stringify(items)));
          if (onLoaded) onLoaded(items.length);
        }
      } catch (err) {
        console.error('Failed to fetch purchased items:', err);
        if (!cancelled) {
          setCartItems([]);
          setOriginalItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCart();
    return () => {
      cancelled = true;
    };
  }, [customer.id]);

  /* ── Product lookup helper ───────────────────────────────── */
  const getProduct = useCallback(
    (idProduk) => products.find((p) => p.id === idProduk),
    [products]
  );

  /* ── Calculate adjusted balance ──────────────────────────── */
  const { adjustedBalance, totalItems, totalCost, delta } = useMemo(() => {
    const originalTotal = originalItems.reduce((sum, item) => {
      const prod = getProduct(item.idProduk);
      return sum + (prod ? item.qty * prod.harga : 0);
    }, 0);

    const newTotal = cartItems.reduce((sum, item) => {
      const prod = getProduct(item.idProduk);
      return sum + (prod ? item.qty * prod.harga : 0);
    }, 0);

    const d = newTotal - originalTotal;

    return {
      adjustedBalance: customer.saldoSekarang - d,
      totalItems: cartItems.reduce((sum, item) => sum + item.qty, 0),
      totalCost: newTotal,
      delta: d,
    };
  }, [cartItems, originalItems, customer.saldoSekarang, getProduct]);

  /* ── Qty Change Handler ──────────────────────────────────── */
  const handleQtyChange = useCallback((idTransaksi, newQty) => {
    const clamped = Math.max(0, newQty);
    setCartItems((prev) =>
      prev.map((item) =>
        item.idTransaksi === idTransaksi ? { ...item, qty: clamped } : item
      )
    );
  }, []);

  /* ── Detect changes ──────────────────────────────────────── */
  const changedItems = useMemo(() => {
    return cartItems
      .map((item) => {
        const original = originalItems.find(
          (o) => o.idTransaksi === item.idTransaksi
        );
        if (!original) return null;
        if (item.qty === original.qty) return null;

        if (item.qty === 0) {
          return {
            idTransaksi: item.idTransaksi,
            qty: 0,
            deletePic: picName,
          };
        }

        return {
          idTransaksi: item.idTransaksi,
          qty: item.qty,
          updatePic: picName,
        };
      })
      .filter(Boolean);
  }, [cartItems, originalItems, picName]);

  const hasChanges = changedItems.length > 0;

  /* ── Save Handler ────────────────────────────────────────── */
  const handleSave = async () => {
    if (!hasChanges || saving) return;

    if (adjustedBalance < 0) {
      alert('Saldo customer tidak mencukupi! Kurangi jumlah item.');
      return;
    }

    setSaving(true);
    try {
      await batchUpdateCart(changedItems);
      onSaved();
    } catch (err) {
      console.error('Failed to save changes:', err);
      alert('Gagal menyimpan perubahan. Silakan coba lagi.');
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
              <ClipboardList className="w-5 h-5 text-emerald-400" />
              <h1 className="text-lg font-bold text-slate-100">Riwayat Pembelian</h1>
            </div>
          </div>

          <CustomerProfile customer={customer} adjustedBalance={adjustedBalance} />
        </div>
      </div>

      {/* ── Items List ──────────────────────────────── */}
      <main className="flex-1 overflow-y-auto max-w-3xl mx-auto w-full px-4 py-4 pb-36">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-sm text-slate-400">Memuat riwayat...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <ShoppingBag className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-base font-medium mb-1">Belum ada pembelian</p>
            <p className="text-sm text-slate-500/60">
              Transaksi yang sudah disimpan akan muncul di sini
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cartItems.map((item) => {
              const prod = getProduct(item.idProduk);
              if (!prod) return null;

              const isDeleted = item.qty === 0;
              const original = originalItems.find(
                (o) => o.idTransaksi === item.idTransaksi
              );
              const hasChanged = original && item.qty !== original.qty;
              const subtotal = item.qty * prod.harga;

              return (
                <div
                  key={item.idTransaksi}
                  className={`glass-card p-4 transition-all duration-200 ${
                    isDeleted ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold text-sm text-slate-100 truncate ${
                          isDeleted ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {prod.namaProduk}
                      </h3>
                      <p className="text-violet-400 font-bold text-base mt-0.5">
                        {formatCurrency(prod.harga)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() =>
                          handleQtyChange(item.idTransaksi, item.qty - 1)
                        }
                        disabled={item.qty <= 0}
                        className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600/50 flex items-center justify-center text-slate-300 transition-all hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                      >
                        {item.qty === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span
                        className={`min-w-[2rem] text-center text-lg font-bold tabular-nums ${
                          isDeleted
                            ? 'text-rose-400 line-through'
                            : hasChanged
                            ? 'text-violet-400'
                            : 'text-slate-100'
                        }`}
                      >
                        {item.qty}
                      </span>

                      <button
                        onClick={() =>
                          handleQtyChange(item.idTransaksi, item.qty + 1)
                        }
                        className="w-8 h-8 rounded-full bg-violet-600 border border-violet-500/50 flex items-center justify-center text-white transition-all hover:bg-violet-500 active:scale-90 shadow-md shadow-violet-500/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-2 pt-2 border-t border-slate-700/30">
                    <span className="text-sm font-medium text-slate-300 tabular-nums">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Sticky Bottom ───────────────────────────── */}
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
              disabled={saving || !hasChanges}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasedView;
