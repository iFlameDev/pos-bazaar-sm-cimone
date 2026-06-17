import React, { useState } from 'react';
import { QrCode, ScanLine, X, ArrowRight, User } from 'lucide-react';
import QrScanner from './QrScanner';
import { APP_NAME } from '../config';

const SelfServiceLogin = ({ customers, onLogin }) => {
  const [customerId, setCustomerId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [foundCustomer, setFoundCustomer] = useState(null);

  const handleCheck = (idToCheck = customerId) => {
    setErrorMsg('');
    if (!idToCheck.trim()) return;

    const cust = customers.find(c => c.id.toLowerCase() === idToCheck.trim().toLowerCase());
    if (cust) {
      setFoundCustomer(cust);
      setCustomerId(cust.id);
      setIsScanning(false);
    } else {
      setErrorMsg('Customer ID Tidak ditemukan');
      setFoundCustomer(null);
    }
  };

  const handleScan = (decodedText) => {
    setCustomerId(decodedText);
    handleCheck(decodedText);
  };

  return (
    <div className="max-w-md mx-auto min-h-screen px-4 pt-10 pb-20 flex flex-col items-center justify-center">
      <div className="w-full bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Dekorasi */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-carnival-yellow/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-carnival-pink/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-2xl font-bold text-slate-800 mb-1">{APP_NAME}</h1>
          <p className="text-slate-500 text-sm">Masuk untuk menukar poin Anda</p>
        </div>

        {foundCustomer ? (
          <div className="animate-fade-in relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-carnival-peach to-carnival-pink rounded-full flex items-center justify-center text-white shadow-lg mb-4">
              <User className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 text-center mb-1">{foundCustomer.nama}</h2>
            <div className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold mb-6">
              Kelas {foundCustomer.kelas}
            </div>

            <button
              onClick={() => onLogin(foundCustomer)}
              className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold shadow-md hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Tukar Point
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setFoundCustomer(null);
                setCustomerId('');
              }}
              className="mt-4 text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Ganti Customer ID
            </button>
          </div>
        ) : (
          <div className="relative z-10">
            {isScanning ? (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-carnival-blue" />
                    Scan QR
                  </h3>
                  <button onClick={() => setIsScanning(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mb-4">
                  <QrScanner onScan={handleScan} />
                </div>
                <p className="text-xs text-center text-slate-500">Arahkan kamera ke QR Code pada kartu Anda</p>
              </div>
            ) : (
              <div className="animate-fade-in">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Customer ID</label>
                <div className="relative mb-2">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-carnival-yellow focus:border-carnival-yellow outline-none transition-all font-medium text-slate-800"
                    placeholder="Masukkan ID..."
                  />
                  <button
                    onClick={() => setIsScanning(true)}
                    className="absolute inset-y-1 right-1 px-2 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                    title="Scan QR"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>

                {errorMsg && (
                  <p className="text-carnival-peach text-sm font-medium animate-fade-in mb-4">
                    {errorMsg}
                  </p>
                )}

                <button
                  onClick={() => handleCheck()}
                  className="w-full mt-4 py-3.5 bg-carnival-yellow text-slate-800 rounded-xl font-bold shadow-md hover:bg-yellow-400 transition-all active:scale-95"
                >
                  Check
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelfServiceLogin;
