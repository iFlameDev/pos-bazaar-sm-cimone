import React from 'react';
import { X } from 'lucide-react';

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID').format(amount);

const VariantPopup = ({
  productGroup,
  currentVariantId,
  onSelect,
  onClose,
}) => {
  const parentProduct = productGroup.find(p => 
    (p.id && String(p.id).toUpperCase().startsWith('PRN-')) || 
    (p.varian && p.varian.toUpperCase() === 'PARENT-000')
  ) || productGroup[0];
  const baseProduct = parentProduct;
  const selectableVariants = productGroup.filter(p => !(
    (p.id && String(p.id).toUpperCase().startsWith('PRN-')) || 
    (p.varian && p.varian.toUpperCase() === 'PARENT-000')
  )).sort((a, b) => {
    return String(a.varian || '').localeCompare(String(b.varian || ''), undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-bounce-in glass-card w-full max-w-sm mx-4 p-5 space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/60 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center pt-2">
          {baseProduct.gambarUrl && (
            <div className="w-20 h-20 mx-auto mb-3 rounded-xl bg-white/80 flex items-center justify-center overflow-hidden border border-slate-200/50 shadow-inner">
              <img src={baseProduct.gambarUrl} alt={baseProduct.namaProduk} className="w-full h-full object-cover" />
            </div>
          )}
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Ganti Varian
          </h2>
          <p className="text-sm text-slate-600">{baseProduct.namaProduk}</p>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto p-1">
          {selectableVariants.map((v) => {
            const isSelected = v.id === currentVariantId;
            const isOutOfStock = v.stokSekarang <= 0;

            return (
              <button
                key={v.id}
                disabled={isOutOfStock || isSelected}
                onClick={() => onSelect(v.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 border flex items-center justify-between ${
                  isSelected
                    ? 'bg-carnival-pink/20 text-carnival-pink border-carnival-pink/50 cursor-default'
                    : isOutOfStock
                    ? 'bg-slate-50/50 text-slate-500 border-slate-200/30 cursor-not-allowed'
                    : 'bg-white/60 text-slate-700 border-slate-200/50 hover:bg-slate-100 hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="font-semibold">{v.varian || 'Default'}</div>
                  {isOutOfStock && (
                    <div className="text-[11px] mt-0.5 text-carnival-peach font-medium">
                      Habis
                    </div>
                  )}
                </div>
                <div className="font-bold">
                  {formatCurrency(v.harga)} <span className="text-[10px] font-semibold opacity-70 uppercase tracking-wide">pts</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VariantPopup;
