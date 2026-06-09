import React, { useState, useMemo } from 'react';
import { Plus, Minus, AlertTriangle } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const QtyPopup = ({ product, customer, currentBalance, onConfirm, onCancel }) => {
  const [qty, setQty] = useState(1);

  const maxByStock = product.stokSekarang;
  const maxByBalance = product.harga > 0 ? Math.floor(currentBalance / product.harga) : Infinity;
  const maxQty = Math.max(0, Math.min(maxByStock, maxByBalance));

  const subtotal = qty * product.harga;
  const remainingBalance = currentBalance - subtotal;
  const isBalanceNegative = remainingBalance < 0;
  const canConfirm = qty > 0 && !isBalanceNegative;

  const handleQtyChange = (newQty) => {
    const clamped = Math.max(0, Math.min(newQty, maxByStock));
    setQty(clamped);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setQty(0);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      handleQtyChange(num);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="animate-bounce-in glass-card w-full max-w-sm mx-4 p-6 space-y-5">
        {/* Product Info */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-100 mb-1">{product.namaProduk}</h2>
          <p className="text-violet-400 font-semibold text-lg">{formatCurrency(product.harga)}</p>
        </div>

        {/* Qty Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => handleQtyChange(qty - 1)}
            disabled={qty <= 1}
            className="w-11 h-11 rounded-full bg-slate-700 border border-slate-600/50 flex items-center justify-center text-slate-200 transition-all duration-150 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
          >
            <Minus className="w-5 h-5" />
          </button>

          <input
            type="number"
            value={qty}
            onChange={handleInputChange}
            min={0}
            max={maxByStock}
            className="w-20 h-14 text-center text-3xl font-bold text-slate-100 bg-slate-800/60 border border-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            onClick={() => handleQtyChange(qty + 1)}
            disabled={qty >= maxByStock}
            className="w-11 h-11 rounded-full bg-violet-600 border border-violet-500/50 flex items-center justify-center text-white transition-all duration-150 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 shadow-md shadow-violet-500/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Preview */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Sisa Saldo</p>
          <p
            className={`text-2xl font-bold tabular-nums transition-all duration-300 ${
              isBalanceNegative ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {formatCurrency(remainingBalance)}
          </p>
        </div>

        {/* Warning */}
        {isBalanceNegative && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300/90">
              Saldo customer tidak mencukupi untuk jumlah ini.
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Batal
          </button>
          <button
            onClick={() => onConfirm(qty)}
            disabled={!canConfirm}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QtyPopup;
