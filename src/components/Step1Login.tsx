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

      const accDocRef = doc(db, "global_accounts", cleanUsername);
      const accSnap = await getDoc(accDocRef);

      if (accSnap.exists()) {
        const accData = accSnap.data();
        const storedPin = (accData.pin || '1234').toString().trim();

        if (cleanPin === storedPin) {
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
    <div className="relative min-h-screen bg-[#0B0F14] font-sans flex flex-col justify-center items-center p-4 overflow-hidden select-none">
      {/* 1. ATMOSPHERIC DARK SPACE - MESH/GRID OVERLAY */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '36px 36px'
        }}
      />

      {/* 2. AMBIENT RADIAL GLOW (COOL CYAN / TOSCA #00F2FE) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-130 h-130 bg-cyan-400/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-70 h-70 bg-sky-600/20 rounded-full blur-[90px] pointer-events-none" />

      {/* 3. LOGIN CARD (FROSTED GLASSMORPHISM) */}
      <div 
        className="relative z-10 w-full max-w-sm rounded-[28px] p-8 sm:p-9 backdrop-blur-xl bg-slate-900/65 border border-cyan-400/25 space-y-7 animate-in fade-in zoom-in-95 duration-500"
        style={{
          boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 10px 35px rgba(0,242,254,0.08)'
        }}
      >
        {/* LOGO & CINEMATIC TYPOGRAPHY */}
        <div className="text-center space-y-3">
          {/* LOGO NC MONOGRAM MURNI TRANSPARAN + CYAN RIM LIGHT */}
          <div className="w-24 h-24 mx-auto flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Noctus Count Monogram" 
              className="w-full h-full object-contain transition-transform duration-500 hover:scale-105"
              style={{
                filter: 'drop-shadow(0 0 18px rgba(0,242,254,0.45)) drop-shadow(0 4px 12px rgba(0,0,0,0.9))'
              }}
            />
          </div>

          <div className="space-y-1 pt-1">
            <h1 className="text-xl font-light text-white tracking-[0.3em] uppercase leading-none pl-[0.3em]">
              NOCTUS COUNT
            </h1>
            <p className="font-mono text-[10px] text-slate-400 tracking-[0.2em] uppercase font-medium">
              ENTER AUTHORIZED CREDENTIALS
            </p>
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMsg && (
          <div className="bg-rose-950/50 border border-rose-500/30 text-rose-300 px-4 py-2.5 rounded-xl text-xs font-mono text-center shadow-inner animate-in fade-in">
            {errorMsg}
          </div>
        )}

        {/* INPUT FIELDS & CYBER-MINIMALIST BUTTON */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* USERNAME FIELD */}
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] tracking-[0.18em] text-slate-400 block uppercase font-medium">
              IDENTIFIER / USERNAME
            </label>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="e.g. pamungkas / spv / owner"
              className="cipher-input w-full h-12 px-4 rounded-xl text-sm font-mono outline-none transition-all duration-300 focus:ring-1 focus:ring-cyan-400/40"
              required
            />
          </div>

          {/* PIN FIELD */}
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] tracking-[0.18em] text-slate-400 block uppercase font-medium">
              SECURITY PIN (4-DIGIT)
            </label>
            <input
              type="password"
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="cipher-input w-full h-12 px-4 rounded-xl text-sm font-mono tracking-widest outline-none transition-all duration-300 focus:ring-1 focus:ring-cyan-400/40"
              required
            />
          </div>

          {/* SUBMIT BUTTON (CYBER-MINIMALIST GLOW) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-2 rounded-xl text-xs font-mono font-bold tracking-[0.2em] uppercase transition-all duration-300 cursor-pointer disabled:opacity-50 text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(0,242,254,0.35)] hover:shadow-[0_0_30px_rgba(0,242,254,0.6)] active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <span>{isLoading ? 'AUTHENTICATING...' : 'MASUK APLIKASI'}</span>
          </button>
        </form>

        {/* FOOTER METADATA */}
        <div className="pt-4 border-t border-white/6 text-center space-y-1">
          <p className="font-mono text-[9px] text-slate-400 tracking-[0.25em] uppercase">
            NOCTUS COUNT™ • SECURE TERMINAL
          </p>
          <p className="font-mono text-[9px] text-slate-500 tracking-wider">
            DEVELOPED BY <span className="text-cyan-400 font-bold">NOCTUS</span>
          </p>
        </div>
      </div>
    </div>
  );
}