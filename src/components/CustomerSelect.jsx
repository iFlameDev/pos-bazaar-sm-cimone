import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Store, Pencil, QrCode, Search, Clock, Users, Wallet, X } from 'lucide-react';
import QrScanner from './QrScanner';

const RECENT_CUSTOMERS_KEY = 'pos_recent_customers';
const MAX_RECENT = 5;

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const getRecentCustomers = () => {
  try {
    const stored = localStorage.getItem(RECENT_CUSTOMERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRecentCustomer = (customer) => {
  try {
    let recent = getRecentCustomers();
    recent = recent.filter((c) => c.id !== customer.id);
    recent.unshift({
      id: customer.id,
      nama: customer.nama,
      kelas: customer.kelas,
    });
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(recent));
  } catch {
    // Silently fail on storage errors
  }
};

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
const CustomerCard = ({ customer, onClick, compact = false }) => (
  <button
    onClick={() => onClick(customer)}
    className={`glass-card text-left w-full transition-all duration-200 hover:scale-[1.03] hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${
      compact ? 'p-3 min-w-[140px] flex-shrink-0' : 'p-4'
    }`}
  >
    <div className={`flex items-center gap-3 ${compact ? 'mb-1' : 'mb-3'}`}>
      <div
        className={`rounded-full bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20 ${
          compact ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base'
        }`}
      >
        <span className="font-bold text-white">
          {customer.nama?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-slate-100 truncate ${compact ? 'text-sm' : 'text-base'}`}>
          {customer.nama}
        </p>
        <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/15">
          {customer.kelas}
        </span>
      </div>
    </div>
    {!compact && (
      <div className="flex items-center gap-1.5 text-sm text-slate-400">
        <Wallet className="w-3.5 h-3.5" />
        <span className="text-emerald-400 font-medium">
          {formatCurrency(customer.saldoSekarang)}
        </span>
      </div>
    )}
  </button>
);

/* ── Main Component ────────────────────────────────────────── */
const CustomerSelect = ({ customers, picName, onSelectCustomer, onEditPic, loading }) => {
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [recentCustomers, setRecentCustomers] = useState([]);

  useEffect(() => {
    setRecentCustomers(getRecentCustomers());
  }, []);

  const handleSelect = useCallback(
    (customer) => {
      addRecentCustomer(customer);
      setRecentCustomers(getRecentCustomers());
      onSelectCustomer(customer);
    },
    [onSelectCustomer]
  );

  const handleQrScan = useCallback(
    (decodedText) => {
      setSearch(decodedText);
      setShowScanner(false);
    },
    []
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.nama?.toLowerCase().includes(q) || c.id?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Map recent IDs to full customer data
  const recentFull = useMemo(() => {
    return recentCustomers
      .map((r) => customers.find((c) => c.id === r.id))
      .filter(Boolean);
  }, [recentCustomers, customers]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* ── Sticky Header ───────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-violet-500 flex items-center justify-center shadow-md shadow-violet-500/25">
              <Store className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-100">POS System</h1>
          </div>
          <button
            onClick={onEditPic}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-sm text-slate-300 hover:bg-slate-700/60 hover:text-slate-100 transition-colors"
          >
            <span className="max-w-[120px] truncate">{picName}</span>
            <Pencil className="w-3.5 h-3.5 text-violet-400" />
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
        {/* QR Scanner Toggle */}
        <div className="space-y-3">
          <button
            onClick={() => setShowScanner((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
              showScanner
                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            {showScanner ? <X className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
            <span>{showScanner ? 'Tutup Scanner' : 'Scan QR Code'}</span>
          </button>
          {showScanner && (
            <div className="animate-fade-in">
              <QrScanner
                onScan={handleQrScan}
                onError={(err) => console.warn('QR Error:', err)}
              />
            </div>
          )}
        </div>

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

        {/* Recent Customers */}
        {!search && recentFull.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Terakhir Dilayani
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
              {recentFull.map((c) => (
                <CustomerCard key={`recent-${c.id}`} customer={c} onClick={handleSelect} compact />
              ))}
            </div>
          </section>
        )}

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
