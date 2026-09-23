import React, { useState } from 'react';
import type { SessionData, CustomModalState } from '../types';
import CustomModal from './CustomModal';

interface Step2TeamSetupProps {
  sessionData: SessionData;
  onSaveTeam: (data: SessionData) => void;
  onLogout: () => void;
}

export default function Step2TeamSetup({ sessionData, onSaveTeam, onLogout }: Step2TeamSetupProps) {
  const [partnerInput, setPartnerInput] = useState('');
  const [partners, setPartners] = useState<string[]>(sessionData.partners || ['Budi Prasetyo']);
  const [selectedSession, setSelectedSession] = useState(sessionData.sessionName);
  const [isStarting, setIsStarting] = useState(false);

  // Custom Modal State
  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const handleAddPartner = () => {
    if (partnerInput.trim() && !partners.includes(partnerInput.trim())) {
      setPartners([...partners, partnerInput.trim()]);
      setPartnerInput('');
    }
  };

  const handleRemovePartner = (indexToRemove: number) => {
    setPartners(partners.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (partners.length === 0) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Staf Pendamping Wajib',
        message: 'Mohon tambahkan minimal 1 Staf Pendamping (Warehouse Staff) untuk verifikasi unit fisik sebelum memulai sesi.',
      });
      return;
    }
    setIsStarting(true);
    setTimeout(() => {
      setIsStarting(false);
      onSaveTeam({
        ...sessionData,
        sessionName: selectedSession,
        partners: partners,
      });
    }, 600);
  };

  const getInitials = (name: string) => {
    const parts = name.split(/[\s.]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.substring(0, 2)).toUpperCase();
  };

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col">
      {/* Custom Modal replacing alert */}
      <CustomModal modal={modal} onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))} />

      {/* Header Bar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-gutter flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              aria-label="Go back"
              onClick={onLogout}
              className="min-w-11 min-h-11 -ml-space-xs flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
            </button>
            <div className="flex items-center gap-space-xs">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold">
                Stock Opname 360
              </span>
              <span className="text-outline-variant">•</span>
              <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Warehouse Hub Selection
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shadow-xs">
              {getInitials(sessionData.primaryCounter)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative w-full px-gutter pt-20 pb-safe bg-surface max-w-md mx-auto">
        <div className="flex flex-col w-full pb-8">
          {/* Top User Profile Pill */}
          <div className="w-full pt-1 pb-4">
            <div className="flex items-center justify-between bg-surface-container-lowest shadow-sm rounded-full px-space-sm py-space-xs border border-outline-variant/30">
              <div className="flex items-center gap-space-sm min-w-0 pr-space-xs">
                <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline-sm text-label-lg font-bold shadow-xs">
                  {getInitials(sessionData.primaryCounter)}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-lg text-label-lg text-on-surface truncate font-semibold">
                      {sessionData.primaryCounter}
                    </span>
                    <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold truncate">
                    Tim: {sessionData.primaryCounter.split('.')[0]} &amp; {partners.join(', ')}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center gap-1 bg-surface-container text-on-surface-variant hover:text-error hover:bg-error-container/40 rounded-full px-3 transition-colors shrink-0 cursor-pointer"
              >
                <span className="font-label-md text-label-md font-semibold">Keluar</span>
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </div>
          </div>

          {/* Flow & Step Indicator */}
          <div className="flex flex-col gap-1 mb-5">
            <div className="flex items-center justify-between mb-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary">
                <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  sync_alt
                </span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold">Langkah 2 dari 2</span>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Konfigurasi Tim &amp; Sesi</span>
            </div>
            <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden mb-2">
              <div className="bg-secondary h-full rounded-full w-full transition-all duration-500"></div>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
              Setup Sesi Stock Opname
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Pilih jadwal sesi aktif dan tentukan staf pendamping gudang sebelum memulai penghitungan fisik di lorong rak.
            </p>
          </div>

          {/* Form Stack */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Field 1: Active Session Selector */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5" htmlFor="sessionSelect">
                  <span className="material-symbols-outlined text-[17px] text-secondary">domain</span>
                  <span>Pilih Sesi Stock Opname Aktif</span>
                </label>
                <span className="font-label-sm text-label-sm text-secondary font-bold">Wajib</span>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[24px]">warehouse</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <select
                        id="sessionSelect"
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        className="w-full font-label-lg text-label-lg text-on-surface font-bold bg-transparent border-none outline-none focus:ring-0 cursor-pointer p-0"
                      >
                        <option value="Kosambi WH — SO Sesi Utama 2026">Kosambi WH — SO Sesi Utama 2026</option>
                        <option value="Cikupa WH — SO Putaran 1 2026">Cikupa WH — SO Putaran 1 2026</option>
                        <option value="Consignment Store A — Cycle Count">Consignment Store A — Cycle Count</option>
                      </select>
                      <span className="font-label-sm text-label-sm text-secondary font-semibold mt-0.5">
                        Tim: {sessionData.primaryCounter.split('.')[0]} &amp; {partners.join(', ')}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline text-[22px] shrink-0 mt-2 pointer-events-none">
                    expand_more
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-surface-container-low">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                    <span>Aktif (Round 1)</span>
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Batch SO-2026-Q1</span>
                </div>
              </div>
            </div>

            {/* Field 2: Primary Counter Field (Read-only / Auto-filled) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-secondary">badge</span>
                  <span>Primary Counter (Staff SO)</span>
                </label>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-[13px] text-secondary">lock</span>
                  <span>Terisi Otomatis</span>
                </span>
              </div>
              <div className="bg-surface-container rounded-xl p-space-md flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-on-surface font-headline-sm text-headline-sm font-bold shrink-0">
                    {getInitials(sessionData.primaryCounter)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-lg text-label-lg text-on-surface font-bold truncate">
                        {sessionData.primaryCounter}
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                        verified
                      </span>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      ID: {sessionData.primaryCounter} • Penanggung Jawab Tim
                    </span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-outline-variant text-[20px]">check_circle</span>
              </div>
            </div>

            {/* Field 3: Counter Pendamping Field */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="font-label-md text-label-md text-on-surface font-semibold flex items-center gap-1.5" htmlFor="warehouse-partner">
                  <span className="material-symbols-outlined text-[17px] text-secondary">group</span>
                  <span>Counter Pendamping (Warehouse Staff)</span>
                </label>
                <span className="font-label-sm text-label-sm text-secondary font-bold">Wajib</span>
              </div>
              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-2">
                <span className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                  Tambahkan satu atau lebih rekan staf operasional gudang Kosambi
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <div className="absolute left-3 flex items-center pointer-events-none text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">person_add</span>
                    </div>
                    <input
                      id="warehouse-partner"
                      type="text"
                      value={partnerInput}
                      onChange={(e) => setPartnerInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPartner();
                        }
                      }}
                      placeholder="Ketik nama staf pendamping gudang..."
                      className="w-full h-11 pl-10 pr-3 bg-surface-container-low rounded-lg font-body-md text-body-md placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPartner}
                    className="h-11 px-3 bg-secondary text-on-secondary rounded-lg font-label-md text-label-md font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition-all shadow-xs hover:opacity-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Tambah</span>
                  </button>
                </div>

                {/* Partner Badges */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {partners.map((partner, index) => (
                    <div key={index} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant/30 text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-secondary">person</span>
                      <span className="font-label-md text-label-md font-semibold">{partner}</span>
                      <span className="px-1.5 py-0.5 rounded text-[11px] bg-secondary/10 text-secondary font-bold">WH</span>
                      <button
                        type="button"
                        aria-label={`Hapus ${partner}`}
                        onClick={() => handleRemovePartner(index)}
                        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-error-container/40 hover:text-error text-outline transition-colors -mr-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="material-symbols-outlined text-[14px] text-secondary">info</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Bertindak sebagai verifikator unit fisik di lokasi (dapat menambahkan lebih dari 1 pendamping)
                  </span>
                </div>
              </div>
            </div>

            {/* Field 4: Operating Mode Highlight Card */}
            <div className="bg-surface-container-highest/60 rounded-xl p-space-md flex flex-col gap-2 relative overflow-hidden border border-outline-variant/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center text-on-secondary">
                    <span className="material-symbols-outlined text-[16px]">view_list</span>
                  </div>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-bold text-secondary">
                    Metode Perhitungan
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-semibold">
                  Aktif
                </span>
              </div>
              <div className="flex flex-col gap-0.5 pl-1">
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  List to Floor (Guided Rack)
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Penghitungan fisik terpandu per nomor rak &amp; bin lokasi secara berurutan sesuai peta master gudang.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1 pt-2 bg-surface-container-lowest/80 rounded-lg p-2.5 border border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">grid_view</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Target Lorong</span>
                    <span className="font-label-md text-label-md text-on-surface font-bold truncate">Aisle 01 - 04</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">inventory_2</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Total Estimasi</span>
                    <span className="font-label-md text-label-md text-on-surface font-bold">148 SKU</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Delight / Checklist Reminder */}
            <div className="mt-2 p-space-md rounded-xl bg-surface-container-low flex items-start gap-3 border border-outline-variant/20">
              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[18px]">rule</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface font-bold">Protokol Validasi Ganda</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  Staff SO mencatat barcode, sementara Warehouse Staff memastikan kuantitas segel dan batch number sesuai.
                </span>
              </div>
            </div>

            {/* Bottom Sticky Action Area */}
            <div className="mt-4 flex flex-col gap-2.5">
              <button
                type="submit"
                disabled={isStarting}
                className="w-full h-14 bg-secondary text-on-secondary rounded-xl font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
              >
                {isStarting ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    <span>MEMPERSIAPKAN RAK...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      rocket_launch
                    </span>
                    <span>MULAI MENGHITUNG RAK (ROUND 1)</span>
                  </>
                )}
              </button>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-center px-4 leading-normal">
                Pastikan staf pendamping sudah siap di lokasi rak sebelum menekan tombol mulai.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}