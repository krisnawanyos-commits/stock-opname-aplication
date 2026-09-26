import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import type { UserRole } from '../types';

interface Step1LoginProps {
  onSuccessLogin: (username: string, role: UserRole, name?: string) => void;
}

export default function Step1Login({ onSuccessLogin }: Step1LoginProps) {
  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const cleanUsername = usernameInput.toLowerCase().trim();
    const cleanPin = pinInput.trim();

    if (!cleanUsername || !cleanPin) {
      setErrorMsg('Username dan PIN wajib diisi.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Cek Login Owner Profile
      if (cleanUsername === 'owner' || cleanUsername === 'admin') {
        const ownerDocRef = doc(db, "owner_profile", "owner_default");
        const ownerSnap = await getDoc(ownerDocRef);

        let validOwnerPin = '1234';
        let ownerName = 'Yos Krisnawan';

        if (ownerSnap.exists()) {
          const oData = ownerSnap.data();
          if (oData.pin) validOwnerPin = oData.pin.toString().trim();
          if (oData.name) ownerName = oData.name;
        }

        if (cleanPin === validOwnerPin) {
          onSuccessLogin('owner', 'owner', ownerName);
          setIsLoading(false);
          return;
        } else {
          setErrorMsg('PIN Owner tidak sesuai. Periksa PIN terbaru kamu.');
          setIsLoading(false);
          return;
        }
      }

      // 2. Cek Login dari Firestore global_accounts
      const accDocRef = doc(db, "global_accounts", cleanUsername);
      const accSnap = await getDoc(accDocRef);

      if (accSnap.exists()) {
        const accData = accSnap.data();
        const storedPin = (accData.pin || '1234').toString().trim();

        if (cleanPin === storedPin) {
          // Priority Check: Cek apakah user di-assign sebagai SPV di project_teams
          let assignedRole: UserRole = 'counter';

          const teamQuery = query(
            collection(db, "project_teams"),
            where("username", "==", cleanUsername)
          );
          const teamSnap = await getDocs(teamQuery);

          if (!teamSnap.empty) {
            const teamData = teamSnap.docs[0].data();
            if (teamData.role === 'spv') {
              assignedRole = 'spv';
            }
          } else if (accData.role === 'spv') {
            assignedRole = 'spv';
          }

          onSuccessLogin(cleanUsername, assignedRole, accData.name || cleanUsername);
          setIsLoading(false);
          return;
        } else {
          setErrorMsg('PIN salah. Silakan coba lagi.');
          setIsLoading(false);
          return;
        }
      }

      setErrorMsg('Username tidak terdaftar di KTP Cloud.');
    } catch (err) {
      console.error("Login Error:", err);
      setErrorMsg('Terjadi kesalahan koneksi. Periksa internet kamu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 font-sans min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-indigo-600 text-white font-black text-xl rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
            360
          </div>
          <h1 className="text-xl font-black text-slate-900 pt-2">Stock Opname 360</h1>
          <p className="text-xs text-slate-500 font-medium">Masukan Username &amp; PIN Akses Kamu</p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs font-bold text-center animate-in fade-in">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 block uppercase">Username</label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Contoh: bambang / pamungkas / owner"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 block uppercase">PIN Akses (4-Digit)</label>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer mt-2"
          >
            {isLoading ? 'Memverifikasi...' : 'Masuk Aplikasi'}
          </button>
        </form>
      </div>
    </div>
  );
}