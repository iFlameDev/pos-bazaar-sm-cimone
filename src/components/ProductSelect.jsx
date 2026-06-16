import React, { useState, useMemo } from 'react';
import { ShoppingCart, ArrowLeft, Search, Package, ClipboardList, ScanLine } from 'lucide-react';
import CustomerProfile from './CustomerProfile';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const ProductCard = ({ product, onClick, index, mode }) => {
  const outOfStock = mode === 'variant' ? product.stokSekarang <= 0 : product.stokSekarang <= 0;

  return (
    <button
      onClick={(e) => {
        if (!outOfStock) onClick(product, e);
      }}
      disabled={outOfStock}
      className={`glass-card text-left w-full p-4 transition-all duration-200 animate-fade-in focus:outline-none focus:ring-2 focus:ring-carnival-blue/40 ${
        outOfStock
          ? 'opacity-40 cursor-not-allowed grayscale'
          : 'hover:scale-[1.03] hover:border-carnival-blue/40 hover:shadow-lg hover:shadow-carnival-blue/10 cursor-pointer'
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Product Image Thumbnail */}
      <div className={`w-full aspect-[4/3] rounded-lg bg-white/80 mb-3 flex items-center justify-center overflow-hidden border border-slate-200/50 ${outOfStock ? 'opacity-40 grayscale' : ''}`}>
        {product.gambarUrl ? (
          <img src={product.gambarUrl} alt={product.namaProduk} className="w-full h-full object-cover" />
        ) : (
          <Package className="w-8 h-8 text-slate-600" />
        )}
      </div>

      <h3 className="font-semibold text-slate-900 text-sm mb-1 line-clamp-2 leading-snug">
        {product.namaProduk}
      </h3>
      {mode === 'scan' && product.varian && (
        <span className="inline-block px-1.5 py-0.5 mb-2 rounded bg-carnival-blue/20 text-carnival-blue border border-carnival-blue/30 text-[10px] font-medium tracking-wide">
          {product.varian}
        </span>
      )}
      <p className={`text-carnival-pink font-bold text-base ${mode === 'variant' ? 'mb-2.5' : 'mb-0'}`}>
        {formatCurrency(product.harga)}
      </p>
      
      {mode === 'variant' && (
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              outOfStock
                ? 'bg-carnival-peach/20 text-carnival-peach border border-carnival-peach/20'
                : product.stokSekarang <= 5
                ? 'bg-carnival-orange/20 text-carnival-orange border border-carnival-orange/20'
                : 'bg-carnival-green/20 text-carnival-green border border-carnival-green/20'
            }`}
          >
            <Package className="w-3 h-3" />
            {outOfStock ? 'Habis' : `Stok: ${product.stokSekarang}`}
          </span>
        </div>
      )}
    </button>
  );
};

const ProductSelect = ({
  products,
  customer,
  onProductClick,
  onOpenCart,
  onOpenPurchased,
  onOpenScan,
  cartItemCount,
  onBack,
  currentBalance,
  cartDelta,
  mode,
  onToggleMode
}) => {
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [search, setSearch] = useState('');

  const groupedProducts = useMemo(() => {
    if (mode !== 'variant') return [];
    const groups = {};
    products.forEach((p) => {
      const name = p.namaProduk;
      if (!name) return;
      if (!groups[name]) {
        groups[name] = {
          namaProduk: name,
          kategori: p.kategori,
          harga: p.harga, // assume same price
          gambarUrl: p.gambarUrl,
          stokSekarang: 0,
          variants: []
        };
      }
      groups[name].stokSekarang += (Number(p.stokSekarang) || 0);
      groups[name].variants.push(p);
    });
    return Object.values(groups);
  }, [products, mode]);

  const categories = useMemo(() => {
    const source = mode === 'variant' ? groupedProducts : products;
    const cats = [...new Set(source.map((p) => p.kategori).filter(Boolean))];
    return ['Semua', ...cats.sort()];
  }, [groupedProducts, products, mode]);

  const isSearching = search.trim().length > 0;

  const filtered = useMemo(() => {
    let result = mode === 'variant' ? groupedProducts : products;

    if (isSearching) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => p.namaProduk?.toLowerCase().includes(q));
    } else if (activeCategory !== 'Semua') {
      result = result.filter((p) => p.kategori === activeCategory);
    }

    return result;
  }, [groupedProducts, products, activeCategory, search, isSearching, mode]);

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-lg bg-white/60 border border-slate-200/50 flex items-center justify-center text-slate-700 hover:bg-slate-100/60 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <h1 className="text-lg font-bold text-slate-900">Pilih Produk</h1>
            </div>
            <button
              onClick={onToggleMode}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-carnival-pink/20 text-carnival-pink border border-carnival-pink/30 hover:bg-carnival-pink/30 transition-colors"
            >
              {mode === 'scan' ? 'Mode Varian' : 'Mode Flat'}
            </button>
          </div>

          <CustomerProfile
            customer={customer}
            adjustedBalance={currentBalance}
            cartDelta={cartDelta}
          />

          <div
            className={`flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700 transition-opacity duration-200 ${
              isSearching ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                  activeCategory === cat
                    ? 'bg-carnival-pink text-white border-carnival-pink shadow-md shadow-carnival-pink/25'
                    : 'bg-white/50 text-slate-600 border-slate-200/50 hover:bg-slate-100/60 hover:text-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-600 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="input-field w-full pl-11 pr-12"
            />
            <button
              onClick={onOpenScan}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-carnival-green hover:bg-carnival-green/20 rounded-lg transition-colors focus:outline-none"
            >
              <ScanLine className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 pb-24">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((item, idx) => (
              <ProductCard
                key={mode === 'variant' ? item.namaProduk : item.id}
                product={item}
                mode={mode}
                onClick={() => onProductClick(mode === 'variant' ? item.variants : item)}
                index={idx}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Package className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-sm">Tidak ada produk ditemukan</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-center">
        <button
          onClick={onOpenPurchased}
          className="relative w-12 h-12 rounded-full bg-gradient-to-br from-carnival-blue to-carnival-green flex items-center justify-center shadow-xl shadow-carnival-blue/30 transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-carnival-blue/30"
        >
          <ClipboardList className="w-5 h-5 text-slate-900" />
        </button>

        <button
          onClick={onOpenCart}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-carnival-pink to-carnival-peach flex items-center justify-center shadow-xl shadow-carnival-pink/30 transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-carnival-pink/30"
        >
          <span className="absolute inset-0 rounded-full bg-carnival-pink/40 animate-pulse-ring" />
          <ShoppingCart className="w-6 h-6 text-slate-900 relative z-10" />

          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 z-20 min-w-[20px] h-5 px-1 rounded-full bg-carnival-yellow text-slate-900 text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-slate-950">
              {cartItemCount > 99 ? '99+' : cartItemCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductSelect;
