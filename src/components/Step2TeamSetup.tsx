import React, { useState, useEffect } from 'react';
import type { SessionData } from '../types';
import { Users, LogOut, Info, ArrowRight, ShieldCheck, UserCheck, ChevronLeft } from 'lucide-react';
import NetworkStatusBadge from './NetworkStatusBadge';
import { useLanguage, LanguageToggle } from '../utils/i18n';

interface Step2TeamSetupProps {
  sessionData: SessionData;
  onSaveTeam: (updatedSession: SessionData) => void;
  onLogout: () => void;
  onCancel?: () => void;
}

export default function Step2TeamSetup({ sessionData, onSaveTeam, onLogout, onCancel }: Step2TeamSetupProps) {
  const { t } = useLanguage();
  const [partnerName, setPartnerName] = useState<string>(() => {
    if (sessionData.partners?.[0]) return sessionData.partners[0];
    const cleanUser = (sessionData.primaryCounter || '').toLowerCase().trim();
    if (cleanUser) {
      const saved = localStorage.getItem(`counter_partner_${cleanUser}`);
      if (saved) return saved;
    }
    return '';
  });

  // GUARD: REDIRECT SPV OTOMATIS KE DASHBOARD ADMIN
  useEffect(() => {
    if (sessionData.role === 'admin' || sessionData.primaryCounter === 'owner' || sessionData.primaryCounter === 'pamungkas') {
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
    <div className="relative min-h-screen bg-[#F4F6F9] font-sans flex flex-col justify-center items-center p-4 overflow-hidden select-none">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)`,
          backgroundSize: '36px 36px'
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-140 h-140 bg-cyan-400/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] border border-slate-200/90 space-y-5">
        {/* TOP UTILITY BAR (NETWORK STATUS, LANGUAGE TOGGLE, LOGOUT / BATAL) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t('cancel') || 'Batal'}</span>
            </button>
          ) : (
            <NetworkStatusBadge />
          )}
          <div className="flex items-center gap-2 shrink-0">
            {onCancel && <NetworkStatusBadge />}
            <LanguageToggle />
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HEADER TITLE & ICON */}
        <div className="flex items-center space-x-3 pt-0.5">
          <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-2xl border border-cyan-200 shrink-0">
            <Users className="w-5 h-5 text-cyan-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900 leading-snug">{t('teamSetupTitle')}</h2>
            <p className="text-xs text-slate-500 font-medium truncate">{sessionData.sessionName}</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-1.5">
          <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs">
            <Info className="w-4 h-4 text-amber-700 shrink-0" />
            <span>{t('teamSetupSubtitle')}</span>
          </div>
          <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
            {t('teamSetupDesc')}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
              {t('primaryCounterLabel')}
            </label>
            <input
              type="text"
              value={sessionData.primaryCounter}
              disabled
              className="w-full h-12 px-4 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-800 outline-none capitalize cursor-not-allowed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-cyan-600" />
              {t('partnerLabel')}
            </label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder={t('partnerPlaceholder')}
              className="w-full h-12 px-4 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="h-12 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-300 transition-all cursor-pointer"
              >
                {t('cancel') || 'Batal'}
              </button>
            )}
            <button
              type="submit"
              className="flex-1 h-12 bg-cyan-400 hover:bg-cyan-300 active:scale-[0.98] text-slate-950 rounded-xl text-sm font-extrabold shadow-lg shadow-cyan-400/25 transition-all cursor-pointer flex items-center justify-center space-x-2"
            >
              <span>{onCancel ? (t('saveTeamChangesBtn') || 'Simpan Perubahan') : t('startOpnameBtn')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="pt-3 border-t border-slate-100 text-center space-y-0.5">
          <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
            Noctus Count™
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            Developed by <span className="font-bold text-cyan-700">Noctus</span>
          </p>
        </div>
      </div>
    </div>
  );
}