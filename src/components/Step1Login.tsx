import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ShieldCheck, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import type { UserRole } from '../types';

export interface Step1LoginProps {
  onSuccessLogin?: (username: string, role: UserRole, name?: string) => void;
  onLogin?: (role: UserRole, email: string, username: string) => void;
  [key: string]: any;
}

export default function Step1Login({ onSuccessLogin, onLogin }: Step1LoginProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.toLowerCase().trim();
    const cleanPin = pin.trim();

    if (!cleanUsername || !cleanPin) {
      setError('Username dan PIN 4-digit wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      // Direct Owner / Admin Bypass
      if ((cleanUsername === 'owner' || cleanUsername === 'admin') && cleanPin === '1234') {
        if (onSuccessLogin) onSuccessLogin('owner', 'owner', 'Yos Krisnawan');
        if (onLogin) onLogin('owner', 'yos.krisnawan@anymindgroup.com', 'owner');
        return;
      }

      if (cleanUsername === 'spv.lead' && cleanPin === '1234') {
        if (onSuccessLogin) onSuccessLogin('spv.lead', 'spv', 'Supervisor Lead');
        if (onLogin) onLogin('spv', 'spv@anymindgroup.com', 'spv.lead');
        return;
      }

      // Cek Firestore untuk Counter
      const docRef = doc(db, "global_accounts", cleanUsername);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (fErr) {
        console.warn("Firestore query error, using local fallback:", fErr);
      }

      if (docSnap && docSnap.exists()) {
        const userData = docSnap.data();
        if (String(userData.pin).trim() === cleanPin) {
          const roleVal: UserRole = (userData.role as UserRole) || 'counter';
          if (onSuccessLogin) onSuccessLogin(cleanUsername, roleVal, userData.name || cleanUsername);
          if (onLogin) onLogin(roleVal, userData.email || `${cleanUsername}@anymindgroup.com`, cleanUsername);
        } else {
          setError('PIN 4-digit salah! Silakan periksa kembali.');
        }
      } else {
        // Otomatis daftarkan KTP Cloud jika belum ada di Firestore (Auto-provisioning)
        const newAccount = {
          username: cleanUsername,
          name: username.trim(),
          pin: cleanPin,
          role: 'counter',
          email: `${cleanUsername}@anymindgroup.com`
        };
        try {
          await setDoc(docRef, newAccount);
        } catch (sErr) {
          console.warn("Auto-register Firestore warning:", sErr);
        }

        if (onSuccessLogin) onSuccessLogin(cleanUsername, 'counter', username.trim());
        if (onLogin) onLogin('counter', newAccount.email, cleanUsername);
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      // Fallback izinkan login jika PIN 4 digit
      if (cleanPin.length === 4) {
        if (onSuccessLogin) onSuccessLogin(cleanUsername, 'counter', username.trim());
        if (onLogin) onLogin('counter', `${cleanUsername}@anymindgroup.com`, cleanUsername);
      } else {
        setError('PIN 4-digit salah atau gagal terhubung.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetCache = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 space-y-6 border border-slate-100 relative overflow-hidden">

        <div className="flex flex-col items-center space-y-3 relative z-10">
          <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner border border-amber-100">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Stock Opname 360</h1>
            <p className="text-sm text-slate-500 font-medium">Masukkan Username & PIN Akun Kamu</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start space-x-2.5 animate-in slide-in-from-top-2 relative z-10">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4 relative z-10">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Username Akun</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="misal: owner / bambang"
                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider">PIN (4 Digit)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="1234"
                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black tracking-[0.25em] text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-black tracking-wide shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Masuk Sistem"}
          </button>
        </form>

        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2 relative z-10">
          <p className="text-xs font-black text-slate-700">Kredensial Cloud Aktif:</p>
          <ul className="text-[11px] text-slate-500 font-medium space-y-1 leading-relaxed">
            <li>• <span className="font-bold text-slate-700">Owner:</span> owner (PIN: 1234)</li>
            <li>• <span className="font-bold text-slate-700">Counter:</span> Gunakan KTP Cloud dari Admin</li>
          </ul>
          <button
            type="button"
            onClick={handleResetCache}
            className="w-full pt-2 border-t border-slate-200 text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center justify-center space-x-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Cache Sesi Browser</span>
          </button>
        </div>

      </div>
    </div>
  );
}