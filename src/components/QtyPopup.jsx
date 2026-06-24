import React, { useState, useRef } from 'react';
import { Plus, Minus, ShoppingCart, Wallet, ChevronLeft, ChevronRight, X } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const QtyPopup = ({ product, currentBalance, onConfirm, onCancel, mode }) => {
  // If mode === 'variant', product is an array of variants (productGroup)
  // If mode === 'scan', product is a single product object
  const isVariantMode = mode === 'variant';
  const productGroup = isVariantMode ? product : [product];
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

  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(selectableVariants.length === 1 ? selectableVariants[0] : null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [slideDir, setSlideDir] = useState('right');

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      setGalleryIndex((prev) => (prev + 1) % selectableVariants.length);
      setSlideDir('right');
    }
    if (touchEndX.current - touchStartX.current > 50) {
      setGalleryIndex((prev) => (prev - 1 + selectableVariants.length) % selectableVariants.length);
      setSlideDir('left');
    }
  };

  const handleImageClick = () => {
    if (isVariantMode && selectableVariants.length > 0) {
      let idx = 0;
      if (selectedVariant) {
        idx = selectableVariants.findIndex(v => v.id === selectedVariant.id);
        if (idx === -1) idx = 0;
      }
      setGalleryIndex(idx);
      setShowGallery(true);
    } else {
      setGalleryIndex(0);
      setShowGallery(true);
    }
  };

  const handleCloseGallery = () => {
    if (isVariantMode && selectableVariants.length > 0) {
      const v = selectableVariants[galleryIndex];
      if (v && v.stokSekarang > 0) {
        setSelectedVariant(v);
        setQty(1);
      }
    }
    setShowGallery(false);
  };

  const validPrices = selectableVariants.map(v => Number(v.harga)).filter(h => !isNaN(h) && h > 0);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
  const currentPrice = selectedVariant ? selectedVariant.harga : minPrice;
  const maxByStock = selectedVariant ? selectedVariant.stokSekarang : 0;

  const handleQtyChange = (newQty) => {
    if (!selectedVariant) return;
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

  const subtotal = qty * currentPrice;
  const remainingBalance = currentBalance - subtotal;
  const balanceRef = useRef(null);
  const [shaking, setShaking] = useState(false);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    onConfirm(qty, selectedVariant);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="animate-bounce-in glass-card w-full max-w-sm mx-4 p-6 space-y-5">
        <div className="text-center">
          <p className="text-[10px] text-carnival-peach font-medium mb-2 opacity-80 uppercase tracking-widest">
            Klik gambar untuk memperbesar
          </p>
          {(selectedVariant?.gambarUrl || baseProduct.gambarUrl) && (
            <div 
              className="w-28 h-28 mx-auto mb-4 rounded-xl bg-white/80 flex items-center justify-center overflow-hidden border border-slate-200/50 shadow-inner cursor-pointer hover:scale-105 transition-transform"
              onClick={handleImageClick}
            >
              <img src={selectedVariant?.gambarUrl || baseProduct.gambarUrl} alt={selectedVariant?.namaProduk || baseProduct.namaProduk} className="w-full h-full object-cover transition-opacity duration-300" />
            </div>
          )}
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            {baseProduct.namaProduk}
          </h2>
          {!isVariantMode && baseProduct.varian && (
            <span className="inline-block px-1.5 py-0.5 mb-2 rounded bg-carnival-blue/20 text-carnival-blue border border-carnival-blue/30 text-[10px] font-medium tracking-wide">
              {baseProduct.varian}
            </span>
          )}
          <p className="text-carnival-pink font-semibold text-lg">{formatCurrency(currentPrice)} <span className="text-xs font-semibold opacity-70 uppercase tracking-wide">pts</span></p>
        </div>

        {isVariantMode && selectableVariants.length > 1 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 text-center">Pilih Varian:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {selectableVariants.map((v) => {
                const isSelected = selectedVariant?.id === v.id;
                const isOutOfStock = v.stokSekarang <= 0;
                return (
                  <button
                    key={v.id}
                    disabled={isOutOfStock}
                    onClick={() => {
                      setSelectedVariant(v);
                      setQty(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                      isSelected
                        ? 'bg-carnival-pink text-white border-carnival-pink shadow-md shadow-carnival-pink/30'
                        : isOutOfStock
                        ? 'bg-white/50 text-slate-500 border-slate-200/50 cursor-not-allowed'
                        : 'bg-slate-100/50 text-slate-700 border-slate-300/50 hover:bg-slate-200'
                    }`}
                  >
                    {v.varian || 'Default'} {isOutOfStock && '(Habis)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => handleQtyChange(qty - 1)}
            disabled={qty <= 1 || !selectedVariant}
            className="w-11 h-11 rounded-full bg-slate-100 border border-slate-300/50 flex items-center justify-center text-slate-800 transition-all duration-150 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
          >
            <Minus className="w-5 h-5" />
          </button>

          <input
            type="number"
            value={qty}
            onChange={handleInputChange}
            min={1}
            max={maxByStock || 1}
            disabled={!selectedVariant}
            className="w-20 h-14 text-center text-3xl font-bold text-slate-900 bg-white/60 border border-slate-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-carnival-blue/40 focus:border-carnival-blue/40 disabled:opacity-30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            onClick={() => handleQtyChange(qty + 1)}
            disabled={qty >= maxByStock || !selectedVariant}
            className="w-11 h-11 rounded-full bg-carnival-pink border border-carnival-pink/50 flex items-center justify-center text-slate-900 transition-all duration-150 hover:bg-carnival-pink/80 disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 shadow-md shadow-carnival-pink/20"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className={`rounded-xl border p-4 text-center transition-colors duration-200 ${
          remainingBalance < 0
            ? 'bg-carnival-peach/10 border-carnival-peach/30'
            : 'bg-white/50 border-slate-200/40'
        }`}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Wallet className="w-3.5 h-3.5 text-slate-600" />
            <p className="text-xs text-slate-600">Sisa Saldo</p>
          </div>
          <p ref={balanceRef} className={`text-2xl font-bold tabular-nums transition-colors duration-200 ${
            remainingBalance < 0 ? 'text-carnival-peach' : 'text-carnival-green'
          } ${shaking ? 'animate-shake' : ''}`}>
            {formatCurrency(remainingBalance)} <span className="text-sm font-semibold opacity-80 uppercase tracking-wide">pts</span>
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Batal
          </button>
          <button
            onClick={handleAddToCart}
            disabled={qty < 1 || !selectedVariant || maxByStock < 1}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Ke Keranjang</span>
          </button>
        </div>
      </div>

      {showGallery && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={handleCloseGallery}
          onTouchStart={isVariantMode && selectableVariants.length > 1 ? handleTouchStart : undefined}
          onTouchMove={isVariantMode && selectableVariants.length > 1 ? handleTouchMove : undefined}
          onTouchEnd={isVariantMode && selectableVariants.length > 1 ? handleTouchEnd : undefined}
        >
          <div className="relative w-[90%] md:w-[60%] h-[60%] flex flex-col items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
            <img 
              key={galleryIndex}
              src={isVariantMode && selectableVariants.length > 0 ? selectableVariants[galleryIndex]?.gambarUrl || baseProduct.gambarUrl : (selectedVariant?.gambarUrl || baseProduct.gambarUrl)} 
              alt="Enlarged product"
              className={`max-w-full max-h-full object-contain rounded-xl shadow-2xl ${slideDir === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
            />
            {isVariantMode && selectableVariants.length > 0 && selectableVariants[galleryIndex]?.varian && (
              <div className="absolute bottom-4 bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur-sm text-sm font-medium z-10">
                {selectableVariants[galleryIndex].varian}
              </div>
            )}
            
            {isVariantMode && selectableVariants.length > 1 && (
              <>
                <button 
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-12 p-2 md:p-3 bg-white/10 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-colors z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex((prev) => (prev - 1 + selectableVariants.length) % selectableVariants.length);
                    setSlideDir('left');
                  }}
                >
                  <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
                </button>
                <button 
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-12 p-2 md:p-3 bg-white/10 hover:bg-white/30 rounded-full text-white backdrop-blur-md transition-colors z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setGalleryIndex((prev) => (prev + 1) % selectableVariants.length);
                    setSlideDir('right');
                  }}
                >
                  <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              </>
            )}
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors z-10"
              onClick={handleCloseGallery}
            >
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QtyPopup;
