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
    className="glass-card text-left w-full p-3.5 transition-all duration-200 hover:scale-[1.03] hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
  >
    <div className="min-w-0">
      <p className="font-semibold text-slate-100 text-base">
        {customer.nama}
      </p>
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

  const grouped = useMemo(() => {
    let result = customers;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = customers.filter(
        (c) =>
          c.nama?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q)
      );
    }
    
    // Sort alphabetically by nama
    result = [...result].sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    // Group by kelas
    const groups = {};
    result.forEach(c => {
      const kelas = c.kelas || 'Lainnya';
      if (!groups[kelas]) groups[kelas] = [];
      groups[kelas].push(c);
    });

    // Return array of entries sorted by kelas name
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [customers, search]);

  const totalFiltered = useMemo(() => 
    grouped.reduce((sum, [, items]) => sum + items.length, 0)
  , [grouped]);

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
              {search ? `Hasil Pencarian (${totalFiltered})` : 'Semua Customer'}
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : totalFiltered > 0 ? (
            <div className="space-y-8">
              {grouped.map(([kelas, items]) => (
                <div key={kelas} className="animate-fade-in relative">
                  <div className="sticky top-[60px] z-20 bg-slate-950/95 backdrop-blur-md py-2 mb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">{kelas}</h3>
                      <div className="flex-1 h-px bg-emerald-500/30"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {items.map((c) => (
                      <CustomerCard key={c.id} customer={c} onClick={handleSelect} />
                    ))}
                  </div>
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
