import React, { useState } from 'react';
import type { SessionData } from '../types';
import { Users, User, ArrowRight, LogOut } from 'lucide-react';

interface Step2Props {
  sessionData: SessionData;
  onLogout: () => void;
  onSaveTeam: (updatedSession: SessionData) => void;
}

export default function Step2TeamSetup({ sessionData, onLogout, onSaveTeam }: Step2Props) {
  const [primaryCounter, setPrimaryCounter] = useState(sessionData.primaryCounter || '');
  const [partnerName, setPartnerName] = useState(sessionData.partners?.[0] || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTeam({
      ...sessionData,
      primaryCounter: primaryCounter.trim() || sessionData.primaryCounter,
      partners: partnerName.trim() ? [partnerName.trim()] : (sessionData.partners || []),
    });
  };

  return (
    <div className="bg-slate-50 font-sans text-slate-900 min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">Setup Tim Opname</h1>
              <p className="text-xs text-slate-500 font-medium">{sessionData.sessionName || "SO Sesi Utama 2026"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span>ℹ️</span> Keterangan Tim Pendamping
          </p>
          <p className="text-amber-800 font-medium leading-relaxed">
            Sebelum memulai perhitungan rak, mohon lengkapi nama petugas pendamping dari tim warehouse (WH).
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              <span>Counter Utama (SO)</span>
            </label>
            <input
              type="text"
              value={primaryCounter}
              onChange={(e) => setPrimaryCounter(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              required
              placeholder="Username / Nama Counter"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tim Pendamping (Warehouse / WH)</span>
            </label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Ketik Nama Tim Pendamping (Misal: Budi Prasetyo)"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 cursor-pointer mt-2"
          >
            <span>Lanjut ke Countsheet (Step 3)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}