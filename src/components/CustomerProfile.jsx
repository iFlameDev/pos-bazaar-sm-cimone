import React from 'react';
import { Wallet } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const CustomerProfile = ({ customer, adjustedBalance }) => {
  const displayBalance = adjustedBalance ?? customer.saldoSekarang;
  const isNegative = displayBalance < 0;

  return (
    <div className="glass-card p-4 flex items-center gap-4">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
        <span className="text-xl font-bold text-white">
          {customer.nama?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>

      {/* Name & Kelas */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-slate-100 truncate">{customer.nama}</h3>
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/20">
          {customer.kelas}
        </span>
      </div>

      {/* Balance */}
      <div className="flex flex-col items-end flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
          <Wallet className="w-3.5 h-3.5" />
          <span>Saldo</span>
        </div>
        <span
          className={`text-lg font-bold tabular-nums transition-colors duration-300 ${
            isNegative ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          {formatCurrency(displayBalance)}
        </span>
      </div>
    </div>
  );
};

export default CustomerProfile;
