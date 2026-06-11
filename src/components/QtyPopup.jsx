import React, { useState } from 'react';
import { Plus, Minus, ShoppingCart } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const QtyPopup = ({ product, onConfirm, onCancel }) => {
  const [qty, setQty] = useState(1);

  const maxByStock = product.stokSekarang;

  const handleQtyChange = (newQty) => {
    const clamped = Math.max(1, Math.min(newQty, maxByStock));
    setQty(clamped);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setQty(1);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      handleQtyChange(num);
    }
  };

  const subtotal = qty * product.harga;

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
            min={1}
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

        {/* Subtotal Preview */}
        <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 p-4 text-center">
          <p className="text-xs text-slate-400 mb-1">Subtotal</p>
          <p className="text-2xl font-bold tabular-nums text-violet-400">
            {formatCurrency(subtotal)}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Batal
          </button>
          <button
            onClick={() => onConfirm(qty)}
            disabled={qty < 1}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ke Keranjang</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default QtyPopup;
