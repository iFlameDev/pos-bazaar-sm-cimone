import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, ShoppingCart, Package } from 'lucide-react';
import CustomerProfile from './CustomerProfile';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

/* ── Product Card ──────────────────────────────────────────── */
const ProductCard = ({ product, onClick, index }) => {
  const outOfStock = product.stokSekarang <= 0;

  return (
    <button
      onClick={(e) => {
        if (!outOfStock) onClick(product, e);
      }}
      disabled={outOfStock}
      className={`glass-card text-left w-full p-4 transition-all duration-200 animate-fade-in focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${
        outOfStock
          ? 'opacity-40 cursor-not-allowed grayscale'
          : 'hover:scale-[1.03] hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 cursor-pointer'
      }`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Product Name */}
      <h3 className="font-semibold text-slate-100 text-sm mb-1 line-clamp-2 leading-snug">
        {product.namaProduk}
      </h3>

      {/* Price */}
      <p className="text-violet-400 font-bold text-base mb-2.5">
        {formatCurrency(product.harga)}
      </p>

      {/* Stock Indicator */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
            outOfStock
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
              : product.stokSekarang <= 5
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          <Package className="w-3 h-3" />
          {outOfStock ? 'Habis' : `Stok: ${product.stokSekarang}`}
        </span>
      </div>
    </button>
  );
};

/* ── Main Component ────────────────────────────────────────── */
const ProductSelect = ({
  products,
  customer,
  sessionItems,
  onProductClick,
  onOpenCart,
  cartItemCount,
  onBack,
  currentBalance,
  cartBump,
}) => {
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.kategori).filter(Boolean))];
    return ['Semua', ...cats.sort()];
  }, [products]);

  const isSearching = search.trim().length > 0;

  const filtered = useMemo(() => {
    let result = products;

    if (isSearching) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => p.namaProduk?.toLowerCase().includes(q));
    } else if (activeCategory !== 'Semua') {
      result = result.filter((p) => p.kategori === activeCategory);
    }

    return result;
  }, [products, activeCategory, search, isSearching]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* ── Sticky Top Section ──────────────────────── */}
      <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
          {/* Back Button + Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </button>
            <h1 className="text-lg font-bold text-slate-100">Pilih Produk</h1>
          </div>

          {/* Customer Profile */}
          <CustomerProfile customer={customer} adjustedBalance={currentBalance} />

          {/* Category Tabs */}
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
                    ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/25'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="input-field w-full pl-11"
            />
          </div>
        </div>
      </div>

      {/* ── Product Grid ───────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-5 pb-24">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((p, idx) => (
              <ProductCard
                key={p.id}
                product={p}
                onClick={onProductClick}
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

      {/* ── Cart FAB ───────────────────────────────── */}
      {cartItemCount > 0 && (
        <button
          onClick={onOpenCart}
          className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center shadow-xl shadow-violet-500/30 transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-violet-500/30 ${
            cartBump ? 'animate-cart-bump' : ''
          }`}
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full bg-violet-500/40 animate-pulse-ring" />

          <ShoppingCart className="w-6 h-6 text-white relative z-10" />

        </button>
      )}
    </div>
  );
};

export default ProductSelect;
