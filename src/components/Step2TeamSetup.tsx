import React, { useState, useEffect } from 'react';
import type { SessionData } from '../types';

interface Step2TeamSetupProps {
  sessionData: SessionData;
  onSaveTeam: (updatedSession: SessionData) => void;
  onLogout: () => void;
}

export default function Step2TeamSetup({ sessionData, onSaveTeam, onLogout }: Step2TeamSetupProps) {
  const [partnerName, setPartnerName] = useState<string>(sessionData.partners?.[0] || 'Budi Prasetyo');

  // GUARD: JIKA USER DI-ASSIGN SPV / ADMIN, OTOMATIS REDIRECT DARI LAYAR COUNTER INI
  useEffect(() => {
    if (sessionData.role === 'admin' || sessionData.primaryCounter === 'owner') {
      window.location.reload();
    }
  }, [sessionData.role, sessionData.primaryCounter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTeam({
      ...sessionData,
      partners: partnerName.trim() ? [partnerName.trim()] : []
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Setup Tim Opname</h2>
              <p className="text-xs text-slate-500 font-medium truncate max-w-50">{sessionData.sessionName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
            title="Keluar"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
          <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs">
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span>Keterangan Tim Pendamping</span>
          </div>
          <p className="text-[11px] text-amber-800/80 font-medium leading-relaxed">
            Sebelum memulai perhitungan rak, mohon lengkapi nama petugas pendamping dari tim warehouse (WH).
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 block uppercase">Counter Utama (SO)</label>
            <input
              type="text"
              value={sessionData.primaryCounter}
              disabled
              className="w-full h-12 px-4 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-black text-slate-800 outline-none capitalize cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-700 block uppercase">Tim Pendamping (Warehouse / WH)</label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Masukkan nama petugas WH..."
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center space-x-2 mt-2"
          >
            <span>Lanjut ke Countsheet (Step 3)</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </form>
      </div>
    </div>
  );
}