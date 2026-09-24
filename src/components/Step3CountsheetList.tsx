import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import type { SessionData, RackItem, CustomModalState } from '../types';
import CustomModal from './CustomModal';

interface Step3CountsheetListProps {
  sessionData: SessionData;
  onSelectRack: (rack: RackItem) => void;
  onLogout: () => void;
}

export default function Step3CountsheetList({ sessionData, onSelectRack, onLogout }: Step3CountsheetListProps) {
  const [racks, setRacks] = useState<RackItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLocking, setIsLocking] = useState<boolean>(false);

  // Custom Modal State
  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false,
    title: '',
    message: '',
  });

  // 1. SYNC REAL-TIME RAK DARI CLOUD FIRESTORE
  useEffect(() => {
    const primaryCounter = sessionData.primaryCounter || "Unassigned";
    const qTasks = query(
      collection(db, "master_tasks"),
      where("counter", "==", primaryCounter)
    );

    const unsubscribe = onSnapshot(qTasks, (snapshot) => {
      const taskList = snapshot.docs.map(doc => doc.data());

      const groupedRacks: Record<string, RackItem> = {};

      taskList.forEach((task: any) => {
        const rackLoc = task.Location || 'Z02-10-A';
        const isCounted = !!task.isCounted;

        const existingRack = groupedRacks[rackLoc];
        if (!existingRack) {
          groupedRacks[rackLoc] = {
            id: rackLoc,
            rackNumber: `${rackLoc} (Level ${task.level || '1'})`,
            level: parseInt(task.level || '1', 10),
            zone: task.Zone || 'RACKING',
            status: 'pending',
            totalSKU: 1,
            countedSKU: isCounted ? 1 : 0
          };
        } else {
          existingRack.totalSKU = (existingRack.totalSKU || 0) + 1;
          if (isCounted) {
            existingRack.countedSKU = (existingRack.countedSKU || 0) + 1;
          }
        }
      });

      // AMAN DARI SANITASI TS TYPES
      const rackArray = Object.values(groupedRacks).map(r => {
        const counted = r.countedSKU ?? 0;
        const total = r.totalSKU ?? 0;
        let status: 'completed' | 'in-progress' | 'pending' = 'pending';

        if (counted === total && total > 0) {
          status = 'completed';
        } else if (counted > 0) {
          status = 'in-progress';
        }

        return {
          ...r,
          countedSKU: counted,
          totalSKU: total,
          status
        };
      });

      if (rackArray.length === 0) {
        setRacks([
          { id: '1', rackNumber: 'Z02-10-A (Level 1)', level: 1, zone: 'RACKING', status: 'completed', totalSKU: 24, countedSKU: 24 },
          { id: '2', rackNumber: 'Z02-10-B (Level 1)', level: 1, zone: 'RACKING', status: 'in-progress', totalSKU: 18, countedSKU: 10 },
          { id: '3', rackNumber: 'Z02-10-C (Level 2)', level: 2, zone: 'DAMAGE', status: 'pending', totalSKU: 30, countedSKU: 0 },
        ]);
      } else {
        setRacks(rackArray);
      }
    });

    return () => unsubscribe();
  }, [sessionData]);

  // COMPUTATIONS
  const completedCount = racks.filter((r) => r.status === 'completed').length;
  const inProgressCount = racks.filter((r) => r.status === 'in-progress').length;
  const pendingCount = racks.filter((r) => r.status === 'pending').length;
  const totalRacks = racks.length || 1;
  const progressPercent = Math.round((completedCount / totalRacks) * 100);

  const filteredRacks = racks.filter((rack) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'completed' && rack.status === 'completed') ||
      (activeFilter === 'in_progress' && rack.status === 'in-progress') ||
      (activeFilter === 'pending' && rack.status === 'pending') ||
      rack.zone === activeFilter;

    const queryStr = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !queryStr ||
      rack.rackNumber.toLowerCase().includes(queryStr) ||
      rack.zone.toLowerCase().includes(queryStr);

    return matchesFilter && matchesSearch;
  });

  const getInitials = (name?: string) => {
    if (!name) return 'SO';
    const parts = name.split(/[\s.]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.substring(0, 2)).toUpperCase();
  };

  const handleLockSubmit = async () => {
    setIsLocking(true);

    await setDoc(doc(db, "round_locks", sessionData.sessionName || "SESSION_01"), {
      status: 'LOCKED',
      lockedBy: sessionData.primaryCounter || 'Counter',
      timestamp: new Date().toLocaleString()
    }, { merge: true });

    setTimeout(() => {
      setIsLocking(false);
      setModal({
        isOpen: true,
        type: pendingCount + inProgressCount > 0 ? 'warning' : 'success',
        title: 'Submit & Kunci Putaran 1',
        message: 'Seluruh hasil rekonsiliasi hitungan fisik untuk Putaran 1 berhasil dikirim ke server WMS pusat.',
        details: [
          { label: 'Sesi Aktif', value: sessionData.sessionName || 'SO Sesi Utama 2026' },
          { label: 'Total Rak Selesai', value: `${completedCount} / ${totalRacks} Rak` },
          { label: 'Rak Berjalan/Pending', value: `${inProgressCount + pendingCount} Rak` },
          { label: 'Status Sinkronisasi', value: 'Terdaftar di Cloud WMS' },
        ],
        confirmText: 'Selesai & Kunci Sesi',
      });
    }, 600);
  };

  return (
    <div className="bg-surface font-body-md text-on-surface flex flex-col min-h-screen">
      {/* Custom Modal */}
      <CustomModal modal={modal} onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))} />

      {/* Fixed Top Header */}
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-gutter-sm flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm min-w-0">
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0 hover:bg-surface-container-high transition-colors cursor-pointer"
              title="Logout / Keluar"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
            </button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs">
                <h1 className="font-headline-sm text-headline-sm text-on-surface truncate leading-tight">Countsheet List</h1>
                <span className="px-space-sm py-space-xs rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm uppercase tracking-wider shrink-0">
                  Round 1
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface-variant truncate">Stock Opname Ops</span>
            </div>
          </div>
          <div className="flex items-center gap-space-xs shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 py-1 flex items-center gap-1 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant hover:bg-error-container/40 hover:text-error transition-colors cursor-pointer"
            >
              <span>Keluar</span>
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-surface-container-high">
              {getInitials(sessionData.primaryCounter)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative w-full pt-20 pb-28 px-gutter-sm bg-surface max-w-md mx-auto">
        <div className="flex flex-col w-full pb-8 gap-space-md">
          {/* Session Context Sub-bar */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between gap-space-xs">
              <div className="flex items-center gap-space-xs min-w-0">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">warehouse</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">
                  {sessionData.sessionName || "Kosambi WH — SO Sesi Utama 2026"}
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-label-sm text-label-sm uppercase tracking-wider shrink-0 flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                Round 1
              </span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-space-xs pt-space-xs border-t border-surface-container-low">
              <div className="inline-flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-full">
                <span className="text-xs">👥</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium truncate">
                  Tim: {(sessionData.primaryCounter || 'putri').split('.')[0]} (SO) &amp; {(sessionData.partners || ['Budi Prasetyo']).join(', ')} (WH)
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              </div>
              <div className="inline-flex items-center gap-1 text-secondary font-label-sm text-label-sm bg-secondary-fixed/50 px-2 py-0.5 rounded-full">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                <span>List to Floor (Guided Rak)</span>
              </div>
            </div>
          </div>

          {/* Overall Progress Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant block uppercase tracking-wide">
                  Ringkasan Operasional
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Progres Perhitungan Putaran 1
                </h3>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-headline-lg-mobile text-headline-lg-mobile text-secondary font-bold leading-none">
                  {progressPercent}%
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {completedCount} / {totalRacks} Rak
                </span>
              </div>
            </div>
            {/* Dual-Tone Track Bar */}
            <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-secondary h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            {/* Micro Metrics Counter */}
            <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
              <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 p-2 rounded-lg">
                <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">check_circle</span>
                <div className="min-w-0">
                  <p className="font-label-md text-label-md font-bold leading-tight">{completedCount} Rak</p>
                  <p className="font-label-sm text-label-sm opacity-80 leading-tight">Selesai</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 p-2 rounded-lg">
                <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">sync</span>
                <div className="min-w-0">
                  <p className="font-label-md text-label-md font-bold leading-tight">{inProgressCount} Rak</p>
                  <p className="font-label-sm text-label-sm opacity-80 leading-tight">Berjalan</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-surface-container-low text-on-surface-variant p-2 rounded-lg">
                <span className="material-symbols-outlined text-[18px] text-outline shrink-0">schedule</span>
                <div className="min-w-0">
                  <p className="font-label-md text-label-md font-bold leading-tight">{pendingCount} Rak</p>
                  <p className="font-label-sm text-label-sm opacity-80 leading-tight">Pending</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col gap-space-sm">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor rak atau zona (misal: Z02-10, RACKING)..."
                className="w-full h-11 pl-10 pr-4 bg-surface-container-lowest rounded-xl font-body-md text-body-md shadow-sm border border-outline-variant/30 outline-none placeholder:text-outline focus:ring-2 focus:ring-secondary/40 transition-all"
              />
            </div>

            {/* Filter Chips Carousel */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors cursor-pointer ${activeFilter === 'all' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'
                  }`}
              >
                Semua ({totalRacks})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('completed')}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors cursor-pointer ${activeFilter === 'completed' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'
                  }`}
              >
                Selesai ({completedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('in_progress')}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors cursor-pointer ${activeFilter === 'in_progress' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'
                  }`}
              >
                Berjalan ({inProgressCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('pending')}
                className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors cursor-pointer ${activeFilter === 'pending' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'
                  }`}
              >
                Pending ({pendingCount})
              </button>
            </div>
          </div>

          {/* Rack Cards List */}
          <div className="flex flex-col gap-space-sm">
            {filteredRacks.map((rack) => (
              <div
                key={rack.id}
                onClick={() => onSelectRack(rack)}
                className={`bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-3 cursor-pointer hover:border-secondary/50 active:scale-[0.99] transition-all relative overflow-hidden`}
              >
                {rack.status === 'in-progress' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
                )}
                <div className={`flex items-start justify-between gap-space-xs ${rack.status === 'in-progress' ? 'pl-1' : ''}`}>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[18px] ${rack.status === 'completed' ? 'text-secondary' : rack.status === 'in-progress' ? 'text-secondary' : 'text-outline'}`}>
                        shelves
                      </span>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">
                        Rak {rack.rackNumber}
                      </h4>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Zone: {rack.zone}
                    </p>
                  </div>

                  {/* Status Badges */}
                  {rack.status === 'completed' && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0 border border-emerald-200">
                      <span className="material-symbols-outlined text-[14px] text-emerald-700 font-bold">check</span>
                      Selesai
                    </span>
                  )}
                  {rack.status === 'in-progress' && (
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
                      Sedang Dihitung
                    </span>
                  )}
                  {rack.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
                      Belum Mulai
                    </span>
                  )}
                </div>

                {/* Progress bar for In Progress */}
                {rack.status === 'in-progress' && (
                  <div className="bg-amber-50/70 p-2.5 rounded-lg flex items-center justify-between text-amber-950 font-label-sm text-label-sm ml-1 border border-amber-200/50">
                    <span className="flex items-center gap-1 truncate">
                      <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0">pending_actions</span>
                      {rack.countedSKU ?? 0}/{rack.totalSKU} SKU Telah Dihitung
                    </span>
                    <span className="font-bold shrink-0">{Math.round(((rack.countedSKU ?? 0) / rack.totalSKU) * 100)}%</span>
                  </div>
                )}

                {/* Action button row */}
                <div className={`flex items-center ${rack.status === 'in-progress' ? 'justify-end pl-1' : 'justify-between'} pt-1`}>
                  {rack.status === 'completed' && (
                    <>
                      <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        <span>{rack.countedSKU}/{rack.totalSKU} SKU Telah Dihitung</span>
                      </div>
                      <button
                        type="button"
                        className="h-9 px-4 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-1.5 hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        Edit
                      </button>
                    </>
                  )}
                  {rack.status === 'in-progress' && (
                    <button
                      type="button"
                      className="w-full h-11 px-4 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md flex items-center justify-center gap-1.5 shadow-md shadow-secondary/20 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <span>Lanjutkan Hitung</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  )}
                  {rack.status === 'pending' && (
                    <>
                      <span className="font-body-sm text-body-sm text-outline flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">inventory_2</span>
                        0/{rack.totalSKU} SKU Telah Dihitung
                      </span>
                      <button
                        type="button"
                        className="h-9 px-4 rounded-lg bg-surface-container text-secondary font-label-md text-label-md flex items-center gap-1.5 hover:bg-secondary-fixed transition-colors cursor-pointer font-semibold"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                        Mulai Hitung
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {filteredRacks.length === 0 && (
              <div className="flex flex-col items-center justify-center p-8 text-center bg-surface-container-lowest rounded-xl gap-2 shadow-sm border border-outline-variant/30">
                <span className="material-symbols-outlined text-outline text-[40px]">manage_search</span>
                <p className="font-headline-sm text-headline-sm text-on-surface">Tidak Ada Rak Ditemukan</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs">
                  Coba ganti kata kunci pencarian atau sesuaikan filter status rak.
                </p>
              </div>
            )}
          </div>

          {/* Barcode Scanner Banner */}
          <div className="bg-linear-to-r from-secondary-container to-secondary text-on-secondary rounded-xl p-space-md shadow-md flex items-center gap-space-md">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <div className="flex flex-col min-w-0">
              <h4 className="font-label-lg text-label-lg font-bold leading-tight">Pindai Barcode Rak Langsung</h4>
              <p className="font-body-sm text-body-sm text-white/80 leading-tight mt-0.5">
                Buka kamera barcode kapan saja melalui menu scan bawah.
              </p>
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={isLocking}
              onClick={handleLockSubmit}
              className="w-full h-12 bg-primary text-on-primary rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-[0.99] transition-transform cursor-pointer disabled:opacity-70"
            >
              {isLocking ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Memverifikasi Rak...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Submit &amp; Kunci Putaran 1</span>
                </>
              )}
            </button>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-center px-2">
              Pastikan seluruh rak telah selesai dihitung sebelum melakukan submit dan kunci putaran.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 w-full z-50 pb-safe bg-surface/85 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.05)] border-t border-outline-variant/30">
        <div className="flex justify-around items-center h-16 px-space-sm max-w-md mx-auto">
          <a href="#" className="flex flex-col items-center justify-center w-16 h-12 transition-colors text-secondary font-label-lg">
            <span className="material-symbols-outlined text-[22px]">format_list_bulleted</span>
            <span className="font-label-sm text-label-sm mt-0.5">Counts</span>
          </a>
          <a href="#" className="flex flex-col items-center justify-center w-16 h-12 text-on-surface-variant transition-colors hover:text-on-surface">
            <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
            <span className="font-label-sm text-label-sm mt-0.5">Scan</span>
          </a>
          <a href="#" className="flex flex-col items-center justify-center w-16 h-12 text-on-surface-variant transition-colors hover:text-on-surface">
            <span className="material-symbols-outlined text-[22px]">warehouse</span>
            <span className="font-label-sm text-label-sm mt-0.5">Zones</span>
          </a>
          <a href="#" className="flex flex-col items-center justify-center w-16 h-12 text-on-surface-variant transition-colors hover:text-on-surface">
            <span className="material-symbols-outlined text-[22px]">analytics</span>
            <span className="font-label-sm text-label-sm mt-0.5">Reports</span>
          </a>
        </div>
      </nav>
    </div>
  );
}