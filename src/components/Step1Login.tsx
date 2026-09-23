import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle } from 'lucide-react';
import type { UserRole } from '../types';

interface Step1LoginProps {
  onSuccessLogin: (username: string, role: UserRole, name?: string) => void;
}

export default function Step1Login({ onSuccessLogin }: Step1LoginProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Database Akun Dummy
  const userDatabase = [
    { username: 'owner', pin: '1234', name: 'Project Owner', role: 'owner' as UserRole },
    { username: 'spv.lead', pin: '1234', name: 'Supervisor Gudang', role: 'spv' as UserRole },
    { username: 'putri.so', pin: '1234', name: 'Putri (Tim A)', role: 'counter' as UserRole },
    { username: 'budi.so', pin: '1234', name: 'Budi (Tim B)', role: 'counter' as UserRole },
    { username: 'rian.so', pin: '1234', name: 'Rian (Tim C)', role: 'counter' as UserRole },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const match = userDatabase.find(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.pin === pin.trim()
    );

    if (match) {
      onSuccessLogin(match.username, match.role, match.name);
    } else {
      setErrorMsg('Username atau PIN salah! Silakan coba lagi.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-200 max-w-sm w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Stock Opname 360</h1>
          <p className="text-xs text-slate-500">Masukkan Username & PIN Akun Kamu</p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">USERNAME AKUN</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Contoh: owner / putri.so"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700">PIN (4 DIGIT)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition-colors"
          >
            Masuk Sistem
          </button>
        </form>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500 space-y-1">
          <div className="font-bold text-slate-700">Kredensial Testing Bawaan:</div>
          <div>• Project Owner: <code>owner</code> (PIN: 1234)</div>
          <div>• SPV / Leader: <code>spv.lead</code> (PIN: 1234)</div>
          <div>• Counter Field: <code>putri.so</code> (PIN: 1234)</div>
        </div>
      </div>
    </div>
  );
}