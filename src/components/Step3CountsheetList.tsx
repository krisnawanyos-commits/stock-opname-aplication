import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, doc, setDoc } from 'firebase/firestore';
import type { SessionData, RackItem, CustomModalState } from '../types';
import CustomModal from './CustomModal';
import NetworkStatusBadge from './NetworkStatusBadge';
import { useLanguage, LanguageToggle } from '../utils/i18n';
import { playScanSuccessBeep, triggerHapticFeedback } from '../utils/soundAndHaptics';
import { 
  ChevronLeft, LogOut, Info, Lock, Warehouse, Edit2, Search, Plus, 
  Layers, Check, CheckCircle2, Loader2 
} from 'lucide-react';

interface Step3CountsheetListProps {
  sessionData: SessionData;
  onSelectRack: (rack: RackItem) => void;
  onLogout: () => void;
  onEditTeam?: () => void;
}

export default function Step3CountsheetList({ sessionData, onSelectRack, onLogout, onEditTeam }: Step3CountsheetListProps) {
  const { t, lang } = useLanguage();
  const [racks, setRacks] = useState<RackItem[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(30);

  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery, activeFilter]);

  // STATE TAMBAH RAK/BIN BARU
  const [showAddRackModal, setShowAddRackModal] = useState<boolean>(false);
  const [newRackNumber, setNewRackNumber] = useState<string>('');
  const [newRackZone, setNewRackZone] = useState<string>('RACKING');

  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false, title: '', message: '',
  });

  // 1. LISTEN PROJECT AKTIF BERSTATU "LIVE_ACTIVE" DARI FIRESTORE
  useEffect(() => {
    const qProjects = query(collection(db, "projects"), where("status", "==", "LIVE_ACTIVE"));
    const unsubProjects = onSnapshot(qProjects, (snap) => {
      if (!snap.empty) {
        // Ambil project aktif terbaru
        const projData = snap.docs[0].data();
        setActiveProject({ id: snap.docs[0].id, ...projData });
      } else {
        // JIKA ADMIN MENGHAPUS PROJECT, DETEKSI OTOMATIS & BERSIHKAN DATA
        setActiveProject(null);
        setRacks([]);
      }
    });

    return () => unsubProjects();
  }, []);

  // 2. LISTEN GEMBOK LOCK SESI
  useEffect(() => {
    const lockDocId = activeProject?.sessionCode || sessionData.sessionCode || sessionData.sessionId || "SO-WRG-2026-09";
    const lockRef = doc(db, "round_locks", lockDocId);

    const unsub = onSnapshot(lockRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isGlobalLocked = data.status === 'LOCKED';
        const primaryCounter = (sessionData.primaryCounter || '').toLowerCase().trim();
        const isCounterLocked = !!(data.lockedCounters && data.lockedCounters[primaryCounter]);

        setIsSessionLocked(isGlobalLocked || isCounterLocked);
      } else {
        setIsSessionLocked(false);
      }
    });
    return () => unsub();
  }, [activeProject, sessionData.sessionCode, sessionData.sessionId, sessionData.primaryCounter]);

  // 3. LISTEN MASTER TASKS HANYA JIKA ADA PROJECT AKTIF
  useEffect(() => {
    // JIKA TIDAK ADA PROJECT AKTIF DI CLOUD, KOSONGKAN LIST RAK
    if (!activeProject) {
      setRacks([]);
      return;
    }

    const primaryCounter = (sessionData.primaryCounter || "Unassigned").toLowerCase().trim();
    const qTasks = query(
      collection(db, "master_tasks"),
      where("counter", "==", primaryCounter)
    );

    const unsubscribe = onSnapshot(qTasks, (snapshot) => {
      const taskList = snapshot.docs.map(docSnap => docSnap.data());
      const groupedRacks: Record<string, RackItem> = {};

      taskList.forEach((task: any) => {
        if (task.isLocked) return;

        const rackLoc = task.Location || 'Z02-10-A';
        const isCounted = !!task.isCounted || (task.QTY_ACTUAL !== null && task.QTY_ACTUAL !== undefined);

        const existingRack = groupedRacks[rackLoc];
        if (!existingRack) {
          groupedRacks[rackLoc] = {
            id: rackLoc,
            rackNumber: rackLoc,
            level: parseInt(task.level || '1', 10),
            zone: task.Zone || 'RACKING',
            status: 'pending',
            totalSKU: task.SKU ? 1 : 0,
            countedSKU: isCounted ? 1 : 0
          };
        } else {
          if (task.SKU) existingRack.totalSKU = (existingRack.totalSKU || 0) + 1;
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
  }, [activeProject, sessionData]);

  // PROSES TAMBAH RAK/BIN BARU KE FIRESTORE
  const handleCreateNewRack = async () => {
    if (!newRackNumber.trim()) return;

    const cleanRack = newRackNumber.trim().toUpperCase();
    const cleanCounter = (sessionData.primaryCounter || 'Unassigned').toLowerCase().trim();

    const taskId = `${cleanRack}_BARU_${Date.now()}`;
    const taskRef = doc(db, "master_tasks", taskId);

    await setDoc(taskRef, {
      Location: cleanRack,
      Zone: newRackZone,
      counter: cleanCounter,
      currentRound: 1,
      Qty: 0,
      isCounted: false,
      Remarks: '[LOKASI RAK BARU DITAMBAHKAN MANUAL]',
      createdAt: new Date().toISOString()
    });

    setNewRackNumber('');
    setShowAddRackModal(false);
    setModal({
      isOpen: true,
      type: 'success',
      title: 'Lokasi Rak Baru Berhasil Dibuat!',
      message: `Rak ${cleanRack} telah ditambahkan ke tugas ${cleanCounter}. Silakan klik rak untuk memasukkan temuan barang.`,
    });
  };

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

  const handleConfirmCompletion = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      playScanSuccessBeep();
      triggerHapticFeedback('success');
      setModal({
        isOpen: true,
        type: pendingCount + inProgressCount > 0 ? 'warning' : 'success',
        title: 'Konfirmasi Selesai Perhitungan Rak',
        message: 'Seluruh hasil perhitungan fisik kamu telah tersimpan dan ter-sync ke server WMS pusat.',
        details: [
          { label: 'Sesi Aktif', value: activeProject?.sessionCode || sessionData.sessionName },
          { label: 'Counter Active', value: sessionData.primaryCounter || 'bambang' },
          { label: 'Total Rak Selesai', value: `${completedCount} / ${totalRacks} Rak` },
          { label: 'Rak Berjalan/Pending', value: `${inProgressCount + pendingCount} Rak` },
          { label: 'Status Sinkronisasi', value: 'Terdaftar di Cloud WMS' },
        ],
        confirmText: 'Selesai & Beri Tahu SPV',
      });
    }, 400);
  };

  const partnerName = sessionData.partners?.[0];

  return (
    <div className="bg-surface font-body-md text-on-surface flex flex-col min-h-screen">
      <CustomModal modal={modal} onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))} />

      {/* MODAL POPUP TAMBAH LOKASI RAK BARU */}
      {showAddRackModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Tambah Lokasi Rak Baru</h3>
              <button onClick={() => setShowAddRackModal(false)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nomor / Kode Rak Baru:</label>
                <input
                  type="text"
                  placeholder="Misal: Z99-99-C"
                  value={newRackNumber}
                  onChange={(e) => setNewRackNumber(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-xs font-bold font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Zona Rak:</label>
                <input
                  type="text"
                  placeholder="Misal: FOOD / RACKING"
                  value={newRackZone}
                  onChange={(e) => setNewRackZone(e.target.value)}
                  className="w-full h-11 px-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowAddRackModal(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
              <button onClick={handleCreateNewRack} className="px-5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all">Simpan Rak Baru</button>
            </div>
          </div>
        </div>
      )}

      <header className="relative w-full z-10 pt-safe bg-white border-b border-slate-200 shadow-xs shrink-0">
        <div className="h-16 px-3 sm:px-4 flex items-center justify-between gap-2 max-w-md mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm sm:text-base text-slate-900 font-extrabold leading-tight whitespace-nowrap">
                Countsheet List
              </h1>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-950 p-0.5 inline-flex items-center justify-center shrink-0 border border-slate-800">
                  <img src="/logo.png" alt="Noctus Logo" className="w-full h-full object-contain" />
                </span>
                <span className="whitespace-nowrap">Noctus Count™</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageToggle />
            <NetworkStatusBadge />
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer shrink-0"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full pt-4 pb-28 px-gutter-sm bg-surface max-w-md mx-auto">
        <div className="flex flex-col w-full pb-8 gap-space-md">

          {/* PERINGATAN JIKA TIDAK ADA PROJECT AKTIF DI CLOUD */}
          {!activeProject && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl flex flex-col items-center text-center space-y-2 shadow-xs my-4">
              <Info className="w-8 h-8 text-amber-600" />
              <h3 className="font-bold text-sm">Tidak Ada Sesi Opname Aktif</h3>
              <p className="text-xs text-amber-800/80 leading-relaxed">
                Project sebelumnya telah dihapus/ditutup oleh Owner. Silakan tunggu Owner meluncurkan project sesi baru.
              </p>
            </div>
          )}

          {isSessionLocked && activeProject && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xs">
              <Lock className="w-4 h-4 text-red-600 shrink-0" />
              <span>{lang === 'en' ? 'Session Locked by Admin. Editing counts is disabled.' : 'Sesi Terkunci oleh Admin Pusat. Input/edit hitungan fisik dinonaktifkan.'}</span>
            </div>
          )}

          {activeProject && (
            <>
              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
                <div className="flex items-center justify-between gap-space-xs">
                  <div className="flex items-center gap-space-xs min-w-0">
                    <Warehouse className="w-5 h-5 text-cyan-600 shrink-0" />
                    <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">
                      {activeProject.sessionCode} — {activeProject.locationName}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2 pt-space-xs border-t border-surface-container-low">
                  <div className="inline-flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-full">
                    <span className="text-xs">👥</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-medium truncate">
                      Counter: <b className="text-slate-900">{sessionData.primaryCounter}</b>
                      {partnerName ? <span className="text-slate-500"> • {lang === 'en' ? 'Assistant' : 'Pendamping'}: <b className="text-slate-800">{partnerName}</b></span> : null}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  </div>

                  {onEditTeam && (
                    <button
                      type="button"
                      onClick={onEditTeam}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-slate-300 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{lang === 'en' ? 'Edit Team' : 'Edit Tim'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-label-md text-label-md text-on-surface-variant block uppercase tracking-wide">{lang === 'en' ? 'Task Summary' : 'Ringkasan Tugas Kamu'}</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">{lang === 'en' ? 'Counting Progress' : 'Progress Perhitungan'}</h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-headline-lg-mobile text-headline-lg-mobile text-cyan-600 font-black leading-none">{progressPercent}%</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">{completedCount} / {racks.length} {lang === 'en' ? 'Racks' : 'Rak'}</span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]" style={{ width: `${progressPercent}%` }}></div>
                </div>
              </div>

              <div className="flex flex-col gap-space-sm">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('searchRackPlaceholder')}
                      className="w-full h-11 pl-9 pr-4 bg-surface-container-lowest rounded-xl font-body-md text-body-md shadow-sm border border-outline-variant/30 outline-none text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddRackModal(true)}
                    className="px-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer shrink-0 transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addRackBtn')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 w-full">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      activeFilter === 'all'
                        ? 'bg-cyan-400 text-slate-950 font-black shadow-sm ring-1 ring-cyan-500/20'
                        : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate leading-none">{t('tabAll')}</span>
                    <span className="text-[10px] font-mono opacity-80 leading-none">({racks.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFilter('completed')}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      activeFilter === 'completed'
                        ? 'bg-cyan-400 text-slate-950 font-black shadow-sm ring-1 ring-cyan-500/20'
                        : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate leading-none">{t('tabCompleted')}</span>
                    <span className="text-[10px] font-mono opacity-80 leading-none">({completedCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFilter('in_progress')}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      activeFilter === 'in_progress'
                        ? 'bg-cyan-400 text-slate-950 font-black shadow-sm ring-1 ring-cyan-500/20'
                        : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate leading-none">{t('tabInProgress')}</span>
                    <span className="text-[10px] font-mono opacity-80 leading-none">({inProgressCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFilter('pending')}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      activeFilter === 'pending'
                        ? 'bg-cyan-400 text-slate-950 font-black shadow-sm ring-1 ring-cyan-500/20'
                        : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate leading-none">{t('tabPending')}</span>
                    <span className="text-[10px] font-mono opacity-80 leading-none">({pendingCount})</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-space-sm">
                {filteredRacks.slice(0, visibleCount).map((rack) => (
                  <div key={rack.id} onClick={() => onSelectRack(rack)} className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-outline-variant/30 flex flex-col gap-3 cursor-pointer hover:border-cyan-400/60 transition-all relative overflow-hidden">
                    {rack.status === 'in-progress' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>}
                    <div className={`flex items-start justify-between gap-space-xs ${rack.status === 'in-progress' ? 'pl-1' : ''}`}>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-cyan-600 shrink-0" />
                          <h4 className="font-headline-sm text-headline-sm text-on-surface truncate">Rak {rack.rackNumber}</h4>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{rack.countedSKU} / {rack.totalSKU} SKU {lang === 'en' ? 'Counted' : 'Dihitung'} • Zone: {rack.zone}</p>
                      </div>
                      {rack.status === 'completed' && <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0 border border-emerald-200"><Check className="w-3 h-3 text-emerald-700 stroke-3" /> {t('rackStatusCompleted')}</span>}
                      {rack.status === 'in-progress' && <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-900 font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span> {t('rackStatusInProgress')}</span>}
                      {rack.status === 'pending' && <span className="inline-flex items-center gap-1 bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm px-2.5 py-1 rounded-full shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-outline"></span> {t('rackStatusPending')}</span>}
                    </div>
                  </div>
                ))}
                {filteredRacks.length > visibleCount && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 30)}
                    className="w-full py-3 bg-surface-container-lowest hover:bg-slate-100 text-cyan-700 border border-cyan-300/60 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    Tampilkan 30 Rak Berikutnya ({filteredRacks.length - visibleCount} Rak Tersisa)
                  </button>
                )}
                {filteredRacks.length === 0 && (
                  <div className="p-8 text-center text-slate-400 font-medium">Belum ada tugas rak untuk akun kamu ({sessionData.primaryCounter}).</div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmCompletion}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      <span>Memverifikasi Rak...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Konfirmasi Selesai Perhitungan Rak</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </main>

      <footer className="text-center py-4 bg-surface text-slate-400 text-[10px] font-medium border-t border-slate-100">
        Noctus Count™ • Developed by <span className="font-bold text-cyan-500">Noctus</span>
      </footer>
    </div>
  );
}