import React from 'react';
import { Wallet, ShoppingCart } from 'lucide-react';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('id-ID').format(amount);

const CustomerProfile = ({ customer, adjustedBalance, cartDelta = 0, isShaking = false }) => {
  const displayBalance = adjustedBalance ?? customer.saldoSekarang;
  const isNegative = displayBalance < 0;
  const hasCartDelta = cartDelta !== 0;

  return (
    <div className="glass-card p-4 flex items-center gap-4">
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-carnival-pink to-carnival-peach flex items-center justify-center flex-shrink-0 shadow-lg shadow-carnival-pink/20">
        <span className="text-xl font-bold text-slate-900">
          {customer.nama?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>

      {/* Name & Kelas */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-slate-900 truncate">{customer.nama}</h3>
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-carnival-blue/20 text-carnival-blue border border-carnival-blue/20">
          {customer.kelas}
        </span>
      </div>

      {/* Balance */}
      <div className="flex flex-col items-end flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-0.5">
          <Wallet className="w-3.5 h-3.5" />
          <span>Saldo</span>
        </div>
        <p className={`font-bold text-lg leading-tight tabular-nums transition-colors ${
            isNegative ? 'text-carnival-peach' : 'text-carnival-green'
          } ${isShaking ? 'animate-shake' : ''}`}>
          {formatCurrency(displayBalance)} <span className="text-[11px] font-semibold opacity-80 uppercase tracking-wide">pts</span>
        </p>
        {hasCartDelta && (
          <div className="flex items-center gap-1 text-xs mt-0.5 text-carnival-pink animate-fade-in">
            <ShoppingCart className="w-3 h-3" />
            <span>{formatCurrency(cartDelta)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;
