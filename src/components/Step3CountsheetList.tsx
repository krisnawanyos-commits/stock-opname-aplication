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

  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false, title: '', message: '',
  });

  useEffect(() => {
    const primaryCounter = (sessionData.primaryCounter || "Unassigned").toLowerCase().trim();
    const qTasks = query(
      collection(db, "master_tasks"),
      where("counter", "==", primaryCounter)
    );

    const unsubscribe = onSnapshot(qTasks, (snapshot) => {
      const taskList = snapshot.docs.map(docSnap => docSnap.data());
      const groupedRacks: Record<string, RackItem> = {};

      taskList.forEach((task: any) => {
        const rackLoc = task.Location || 'Z02-10-A';
        const isCounted = !!task.isCounted || task.QTY_ACTUAL !== null;

        const existingRack = groupedRacks[rackLoc];
        if (!existingRack) {
          groupedRacks[rackLoc] = {
            id: rackLoc,
            rackNumber: rackLoc,
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

      setRacks(rackArray);
    });

    return () => unsubscribe();
  }, [sessionData]);

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
      <CustomModal modal={modal} onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))} />

      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-gutter-sm flex items-center justify-between gap-space-sm max-w-md mx-auto">
          <div className="flex items-center gap-space-sm min-w-0">
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-secondary shrink-0 hover:bg-surface-container-high transition-colors cursor-pointer"
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
              className="px-3 py-1 flex items-center gap-1 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <span>Keluar</span>
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-20 pb-28 px-gutter-sm bg-surface max-w-md mx-auto">
        <div className="flex flex-col w-full pb-8 gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between gap-space-xs">
              <div className="flex items-center gap-space-xs min-w-0">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">warehouse</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">
                  {sessionData.sessionName || "SO Sesi Utama 2026"}
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
                  Counter Active: <b className="text-slate-900">{sessionData.primaryCounter}</b>
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-md text-label-md text-on-surface-variant block uppercase tracking-wide">Ringkasan Tugas Kamu</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Progress Perhitungan</h3>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-headline-lg-mobile text-headline-lg-mobile text-secondary font-bold leading-none">{progressPercent}%</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">{completedCount} / {totalRacks} Rak</span>
              </div>
            </div>
            <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden flex">
              <div className="bg-secondary h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          <div className="flex flex-col gap-space-sm">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px] pointer-events-none">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor rak atau zona (misal: A01-50-A)..."
                className="w-full h-11 pl-10 pr-4 bg-surface-container-lowest rounded-xl font-body-md text-body-md shadow-sm border border-outline-variant/30 outline-none"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button type="button" onClick={() => setActiveFilter('all')} className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors cursor-pointer ${activeFilter === 'all' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'}`}>Semua ({totalRacks})</button>
              <button type="button" onClick={() => setActiveFilter('completed')} className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors cursor-pointer ${activeFilter === 'completed' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'}`}>Selesai ({completedCount})</button>
              <button type="button" onClick={() => setActiveFilter('in_progress')} className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors cursor-pointer ${activeFilter === 'in_progress' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'}`}>Berjalan ({inProgressCount})</button>
              <button type="button" onClick={() => setActiveFilter('pending')} className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full font-label-md text-label-md shadow-sm shrink-0 transition-colors cursor-pointer ${activeFilter === 'pending' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/30'}`}>Pending ({pendingCount})</button>
            </div>
          </div>

          <div className="flex flex-col gap-space-sm">
            {filteredRacks.map((rack) => (
              <div key={rack.id} onClick={() => onSelectRack(rack)} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-3 cursor-pointer hover:border-secondary/50 transition-all relative overflow-hidden">
                {rack.status === 'in-progress' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>}
                <div className={`flex items-start justify-between gap-space-xs ${rack.status === 'in-progress' ? 'pl-1' : ''}`}>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px] text-indigo-600">shelves</span>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">Rak {rack.rackNumber}</h4>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{rack.countedSKU} / {rack.totalSKU} SKU Dihitung • Zone: {rack.zone}</p>
                  </div>
                  {rack.status === 'completed' && <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0 border border-emerald-200"><span className="material-symbols-outlined text-[14px] text-emerald-700 font-bold">check</span> Selesai</span>}
                  {rack.status === 'in-progress' && <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span> Sedang Dihitung</span>}
                  {rack.status === 'pending' && <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-outline"></span> Belum Mulai</span>}
                </div>
              </div>
            ))}
            {filteredRacks.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-medium">Belum ada tugas rak untuk akun kamu ({sessionData.primaryCounter}).</div>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button type="button" disabled={isLocking} onClick={handleLockSubmit} className="w-full h-12 bg-primary text-on-primary rounded-xl font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-70">
              {isLocking ? <><span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span><span>Memverifikasi Rak...</span></> : <><span className="material-symbols-outlined text-[18px]">lock</span><span>Submit &amp; Kunci Putaran 1</span></>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}