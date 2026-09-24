import React, { useState } from 'react';
import type { SessionData } from '../types';

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
      primaryCounter,
      partners: partnerName ? [partnerName] : sessionData.partners,
    });
  };

  return (
    <div className="bg-slate-50 font-sans text-slate-900 min-h-screen flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">Setup Tim Counter</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{sessionData.sessionName}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
            title="Keluar"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">Counter Utama (SO)</label>
            <input
              type="text"
              value={primaryCounter}
              onChange={(e) => setPrimaryCounter(e.target.value)}
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase">Counter Pendamping (WH)</label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Misal: Budi Prasetyo"
              className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <button
            type="submit"
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            Lanjut ke Daftar Rak (Step 3)
          </button>
        </form>
      </div>
    </div>
  );
}