import React, { useState, useRef, useEffect } from 'react';
import { UserCircle, ArrowRight } from 'lucide-react';

const PicModal = ({ isOpen, defaultName = '', onSave }) => {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setName(defaultName);
  }, [defaultName]);

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onSave(trimmed);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="animate-bounce-in glass-card w-full max-w-sm mx-4 p-8 flex flex-col items-center gap-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-carnival-blue to-carnival-green flex items-center justify-center shadow-lg shadow-carnival-blue/25">
          <UserCircle className="w-10 h-10 text-slate-900" strokeWidth={1.5} />
        </div>

        {/* Title & Subtitle */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-1">Nama PIC</h2>
          <p className="text-sm text-slate-400">Masukkan nama petugas yang bertugas</p>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nama lengkap..."
          className="input-field w-full"
          autoFocus
        />

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Mulai</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PicModal;
