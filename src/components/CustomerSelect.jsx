import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Store, Pencil, Search, Users, Wallet, RefreshCw } from 'lucide-react';
import { APP_NAME } from '../config';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

/* ── Skeleton Card ─────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="glass-card p-4 animate-pulse">
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-slate-700" />
      <div className="flex-1">
        <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-slate-700/60 rounded w-1/3" />
      </div>
    </div>
    <div className="h-3 bg-slate-700/40 rounded w-1/2" />
  </div>
);

/* ── Customer Card ─────────────────────────────────────────── */
const CustomerCard = ({ customer, onClick }) => (
  <button
    onClick={() => onClick(customer)}
    className="glass-card text-left w-full p-4 transition-all duration-200 hover:scale-[1.03] hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20">
        <span className="font-bold text-white text-base">
          {customer.nama?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-100 truncate text-base">
          {customer.nama}
        </p>
        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/15">
          {customer.kelas}
        </span>
      </div>
    </div>
    <div className="flex items-center gap-1.5 text-sm text-slate-400">
      <Wallet className="w-3.5 h-3.5" />
      <span className="text-emerald-400 font-medium">
        {formatCurrency(customer.saldoSekarang)}
      </span>
    </div>
  </button>
);

/* ── Main Component ────────────────────────────────────────── */
const CustomerSelect = ({ customers, picName, onSelectCustomer, onEditPic, onRefreshData, loading, refreshing }) => {
  const [search, setSearch] = useState('');

  const handleSelect = useCallback(
    (customer) => {
      onSelectCustomer(customer);
    },
    [onSelectCustomer]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.nama?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* ── Sticky Header ───────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center shadow-md shadow-violet-500/25">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-100">{APP_NAME}</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh Data Button */}
            <button
              onClick={onRefreshData}
              disabled={refreshing}
              className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-all disabled:opacity-40"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {/* Edit PIC Button */}
            <button
              onClick={onEditPic}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-colors"
            >
              <span className="max-w-[120px] truncate">{picName}</span>
              <Pencil className="w-3.5 h-3.5 text-violet-400" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau ID customer..."
            className="input-field w-full pl-11"
          />
        </div>

        {/* All Customers */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              {search ? `Hasil Pencarian (${filtered.length})` : 'Semua Customer'}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtered.map((c, idx) => (
                <div key={c.id} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                  <CustomerCard customer={c} onClick={handleSelect} />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Search className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">Tidak ada customer ditemukan</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CustomerSelect;
