import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, doc, writeBatch, getDocs } from 'firebase/firestore';
import type { SessionData, RackItem, CustomModalState, UnmappedItem } from '../types';
import CustomModal from './CustomModal';

interface Step4CountDetailProps {
  sessionData: SessionData;
  rack: RackItem;
  onBackToList: () => void;
  onLogout: () => void;
  onSelectNextRack?: (nextRack: RackItem) => void;
}

interface GroupedSKUItem {
  sku: string;
  upc: string;
  upc2?: string;
  name: string;
  category: string;
  uom: 'PCS' | 'CARTON';
  totalSystemQty: number;
  qtyGood: string;
  qtyBad: string;
  expDateSystem: string;
  expDateActual: string;
  isBadStock: boolean;
  badRemarks: string;
  isCounted: boolean;
  currentRound: number;
  docIds: string[];
  batchCount: number;
  allSystemEds: string[];
}

export default function Step4CountDetail({ sessionData, rack, onBackToList, onLogout, onSelectNextRack }: Step4CountDetailProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const barcodeScanInputRef = useRef<HTMLInputElement>(null);

  const [skuList, setSkuList] = useState<GroupedSKUItem[]>([]);
  const [allMasterSKUs, setAllMasterSKUs] = useState<any[]>([]);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [unmappedDrawerOpen, setUnmappedDrawerOpen] = useState<boolean>(false);
  const [isLoadingSave, setIsLoadingSave] = useState<boolean>(false);

  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false, title: '', message: '',
  });

  // REAL-TIME LISTENER PENGUNCIAN SESI GLOBAL & COUNTER
  useEffect(() => {
    const lockDocId = sessionData.sessionCode || sessionData.sessionId || "SO-WRG-2026-09";
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
  }, [sessionData.sessionCode, sessionData.sessionId, sessionData.primaryCounter]);

  // 3. LISTEN MASTER SKU LIST DARI FIRESTORE UNTUK AUTO-MATCHING UNMAPPED
  useEffect(() => {
    const unsubMaster = onSnapshot(collection(db, "master_tasks"), (snapshot) => {
      const items = snapshot.docs.map(d => d.data());
      setAllMasterSKUs(items);
    });
    return () => unsubMaster();
  }, []);

  // FETCH TASK BERDASARKAN RAK & COUNTER
  useEffect(() => {
    const primaryCounter = (sessionData.primaryCounter || "Unassigned").toLowerCase().trim();
    const targetLocation = rack.rackNumber || rack.id;

    const qTasks = query(
      collection(db, "master_tasks"),
      where("counter", "==", primaryCounter),
      where("Location", "==", targetLocation)
    );

    const unsubscribe = onSnapshot(qTasks, (snapshot) => {
      const groupedMap: Record<string, GroupedSKUItem> = {};

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isLocked) return;

        const skuKey = (data.SKU || 'SKU_UNKNOWN').toUpperCase().trim();
        const sysQty = parseInt(data.Qty || data.QTY_SYSTEM) || 0;

        const rawActQty = data.QTY_ACTUAL ?? data.countedQty;
        const numActQty = parseInt(rawActQty, 10);
        const hasActQty = rawActQty !== undefined && rawActQty !== null && !isNaN(numActQty);

        const rawGoodQty = data.QTY_GOOD ?? data.qtyGood;
        const numGoodQty = parseInt(rawGoodQty, 10);

        const rawBadQty = data.QTY_BAD ?? data.qtyBad;
        const numBadQty = parseInt(rawBadQty, 10);

        const edSys = data.expiredDateSystem || '';
        const taskRound = parseInt(data.currentRound, 10) || 1;

        if (!groupedMap[skuKey]) {
          groupedMap[skuKey] = {
            sku: skuKey,
            upc: data.UPC1 || data.upc || 'N/A',
            upc2: data.UPC2 || '',
            name: data.Description || data.name || skuKey,
            category: `${data.Zone || 'RACKING'} • ${data.SKUBrand || 'General'}`,
            uom: (data.satuanHitung as 'PCS' | 'CARTON') || 'PCS',
            totalSystemQty: sysQty,
            qtyGood: !isNaN(numGoodQty) ? numGoodQty.toString() : (hasActQty ? numActQty.toString() : ""),
            qtyBad: !isNaN(numBadQty) && numBadQty > 0 ? numBadQty.toString() : "",
            expDateSystem: edSys,
            expDateActual: data.expDateActual || data.expiredDateActual || '',
            isBadStock: (!isNaN(numBadQty) && numBadQty > 0) || !!data.badRemarks,
            badRemarks: data.badRemarks || '',
            isCounted: !!data.isCounted || hasActQty,
            currentRound: taskRound,
            docIds: [docSnap.id],
            batchCount: 1,
            allSystemEds: edSys ? [edSys] : []
          };
        } else {
          groupedMap[skuKey].totalSystemQty += sysQty;
          groupedMap[skuKey].docIds.push(docSnap.id);
          groupedMap[skuKey].batchCount += 1;

          if (edSys && !groupedMap[skuKey].allSystemEds.includes(edSys)) {
            groupedMap[skuKey].allSystemEds.push(edSys);
            groupedMap[skuKey].allSystemEds.sort();
          }

          if (hasActQty) {
            const currentGood = parseInt(groupedMap[skuKey].qtyGood || "0", 10);
            groupedMap[skuKey].qtyGood = (currentGood + numActQty).toString();
            groupedMap[skuKey].isCounted = true;
          }

          const currentEd = groupedMap[skuKey].expDateSystem;
          if (edSys && (!currentEd || edSys < currentEd)) {
            groupedMap[skuKey].expDateSystem = edSys;
          }
        }
      });

      setSkuList(Object.values(groupedMap));
    });

    return () => unsubscribe();
  }, [rack, sessionData]);

  const [unmappedBarcode, setUnmappedBarcode] = useState<string>('');
  const [unmappedQty, setUnmappedQty] = useState<string>("1");
  const [unmappedUnit, setUnmappedUnit] = useState<'PCS' | 'CARTON'>('PCS');
  const [unmappedExpDate, setUnmappedExpDate] = useState<string>('2026-10-15');
  const [unmappedBatchNumber, setUnmappedBatchNumber] = useState<string>('BATCH-2026-X9');
  const [unmappedDesc, setUnmappedDesc] = useState<string>('');
  const [unmappedPhotoUrl, setUnmappedPhotoUrl] = useState<string>('');
  const [unmappedList, setUnmappedList] = useState<UnmappedItem[]>([]);

  // 3. LOOKUP KE SELURUH DATABASE MASTER
  const matchedMasterSKU = unmappedBarcode.trim() !== '' ? allMasterSKUs.find(m =>
    (m.UPC1 && m.UPC1.trim() === unmappedBarcode.trim()) ||
    (m.UPC2 && m.UPC2.trim() === unmappedBarcode.trim()) ||
    (m.SKU && m.SKU.toLowerCase().trim() === unmappedBarcode.trim().toLowerCase())
  ) : null;

  const isBarcodeInSystem = !!matchedMasterSKU;

  const handleSetSameExpAsSystem = (index: number) => {
    if (isSessionLocked) return;
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index && item.expDateSystem ? { ...item, expDateActual: item.expDateSystem } : item))
    );
  };

  const adjustQty = (index: number, type: 'good' | 'bad', delta: number) => {
    if (isSessionLocked) return;
    setSkuList((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          if (type === 'good') {
            const current = parseInt(item.qtyGood || "0", 10);
            const nextVal = Math.max(0, current + delta);
            return { ...item, qtyGood: nextVal === 0 ? "" : nextVal.toString() };
          }
          if (type === 'bad') {
            const current = parseInt(item.qtyBad || "0", 10);
            const nextVal = Math.max(0, current + delta);
            return { ...item, qtyBad: nextVal === 0 ? "" : nextVal.toString() };
          }
        }
        return item;
      })
    );
  };

  const toggleBadStock = (index: number) => {
    if (isSessionLocked) return;
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, isBadStock: !item.isBadStock } : item))
    );
  };

  const handleInputText = (index: number, field: 'qtyGood' | 'qtyBad', rawVal: string) => {
    if (isSessionLocked) return;

    let cleanVal = rawVal.replace(/^0+/, '');
    if (cleanVal === "" && rawVal !== "") cleanVal = "0";
    if (rawVal === "") cleanVal = "";

    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: cleanVal } : item))
    );
  };

  const updateItemField = (index: number, field: keyof GroupedSKUItem, value: any) => {
    if (isSessionLocked) return;
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const triggerNativeCamera = () => { if (cameraInputRef.current) cameraInputRef.current.click(); };
  const triggerNativeBarcodeScan = () => { if (barcodeScanInputRef.current) barcodeScanInputRef.current.click(); };

  const handlePhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUnmappedPhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBarcodeCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const randomBarcode = '899' + Math.floor(1000000000 + Math.random() * 9000000000);
      setUnmappedBarcode(randomBarcode);
    }
  };

  const handleAddUnmapped = () => {
    if (isSessionLocked) return;
    if (!unmappedBarcode.trim()) {
      setModal({ isOpen: true, type: 'warning', title: 'Barcode Wajib Diisi', message: 'Mohon scan atau ketik barcode temuan terlebih dahulu.' });
      return;
    }

    if (!isBarcodeInSystem && !unmappedPhotoUrl) {
      setModal({ isOpen: true, type: 'error', title: 'Foto Fisik Wajib Lampir!', message: 'Barang ini TIDAK ADA di system! Kamu WAJIB mengambil foto barang sebelum menambahkannya.' });
      return;
    }

    const qtyNumber = parseInt(unmappedQty || "0", 10);

    const newItem: UnmappedItem = {
      id: Date.now().toString(),
      barcode: unmappedBarcode.trim(),
      name: unmappedDesc.trim() || (matchedMasterSKU ? (matchedMasterSKU.Description || matchedMasterSKU.SKU) : 'Barang Fisik Baru Unmapped'),
      qty: qtyNumber > 0 ? qtyNumber : 1,
      uom: unmappedUnit,
      expDate: unmappedExpDate,
      batchNumber: unmappedBatchNumber,
      photoUrl: unmappedPhotoUrl,
    };

    setUnmappedList((prev) => [...prev, newItem]);
    setUnmappedBarcode('');
    setUnmappedDesc('');
    setUnmappedPhotoUrl('');
    setUnmappedQty("1");
    setModal({ isOpen: true, type: 'success', title: 'Item Temuan Ditambahkan', message: 'Item berhasil disimpan ke daftar temuan rak ini.' });
  };

  const handleDeleteUnmapped = (id: string) => {
    if (isSessionLocked) return;
    setUnmappedList((prev) => prev.filter((item) => item.id !== id));
  };

  // SAVE, SNAPSHOT AUDIT LOG, & AUTO-NEXT RAK
  const handleSaveAndNext = async () => {
    if (isSessionLocked) return;
    setIsLoadingSave(true);

    try {
      const batch = writeBatch(db);
      const cleanCounter = (sessionData.primaryCounter || 'Unassigned').toLowerCase().trim();

      skuList.forEach(skuItem => {
        const finalGoodQty = parseInt(skuItem.qtyGood || "0", 10);
        const finalBadQty = parseInt(skuItem.qtyBad || "0", 10);
        const totalSubmitted = finalGoodQty + finalBadQty;
        const currentRoundNum = skuItem.currentRound || 1;

        skuItem.docIds.forEach((docId, i) => {
          const taskRef = doc(db, "master_tasks", docId);
          batch.set(taskRef, {
            counter: cleanCounter,
            isCounted: true,
            QTY_ACTUAL: i === 0 ? totalSubmitted : 0,
            QTY_GOOD: i === 0 ? finalGoodQty : 0,
            QTY_BAD: i === 0 ? finalBadQty : 0,
            badRemarks: i === 0 ? (skuItem.badRemarks || '') : '',
            expDateActual: skuItem.expDateActual || '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

        const sessCode = sessionData.sessionCode || sessionData.sessionId || 'SO-WRG-2026-09';
        const logId = `${sessCode}_R${currentRoundNum}_${rack.rackNumber}_${skuItem.sku}`;
        const auditRef = doc(db, "audit_logs", logId);

        batch.set(auditRef, {
          timestamp: new Date().toISOString(),
          rackLocation: rack.rackNumber,
          ownerSku: 'DDI',
          sku: skuItem.sku,
          description: skuItem.name,
          upc1: skuItem.upc,
          upc2: skuItem.upc2 || '-',
          counterPic: cleanCounter,
          round: currentRoundNum,
          qtyGood: finalGoodQty,
          qtyBad: finalBadQty,
          totalFinalSubmitted: totalSubmitted,
          edActual: skuItem.expDateActual || '-',
          remarks: skuItem.badRemarks || '-'
        }, { merge: true });
      });

      // 3. TAMBAHKAN TEMUAN BARANG UNMAPPED KE FIRESTORE TASK & AUDIT
      unmappedList.forEach((unm) => {
        const unmSku = (matchedMasterSKU?.SKU || `TEMUAN-${unm.barcode}`).toUpperCase().trim();
        const unmOwner = matchedMasterSKU?.Owner || 'DDI';
        const unmPrice = parseInt(matchedMasterSKU?.unitPrice) || 0;
        const unmDesc = unm.name;

        const taskId = `${rack.rackNumber}_${unmSku}_TEMUAN_${Date.now()}`;
        const taskRef = doc(db, "master_tasks", taskId);

        batch.set(taskRef, {
          Owner: unmOwner,
          SKU: unmSku,
          Description: unmDesc,
          UPC1: unm.barcode,
          UPC2: '',
          Location: rack.rackNumber,
          counter: cleanCounter,
          currentRound: 1,
          Qty: 0,
          QTY_ACTUAL: unm.qty,
          QTY_GOOD: unm.qty,
          QTY_BAD: 0,
          isCounted: true,
          unitPrice: unmPrice,
          badRemarks: `[BARANG TEMUAN FISIK] Batch: ${unm.batchNumber}`,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const logId = `${sessionData.sessionCode || 'SO'}_TEMUAN_${rack.rackNumber}_${unmSku}`;
        const auditRef = doc(db, "audit_logs", logId);
        batch.set(auditRef, {
          timestamp: new Date().toISOString(),
          rackLocation: rack.rackNumber,
          ownerSku: unmOwner,
          sku: unmSku,
          description: unmDesc,
          upc1: unm.barcode,
          upc2: '-',
          counterPic: cleanCounter,
          round: 1,
          qtyGood: unm.qty,
          qtyBad: 0,
          totalFinalSubmitted: unm.qty,
          edActual: unm.expDate || '-',
          remarks: `[ITEM TEMUAN] Batch: ${unm.batchNumber}`
        }, { merge: true });
      });

      await batch.commit();

      const remainingTasksQuery = query(
        collection(db, "master_tasks"),
        where("counter", "==", cleanCounter),
        where("isCounted", "==", false)
      );

      const snap = await getDocs(remainingTasksQuery);
      let nextRackItem: RackItem | null = null;

      if (!snap.empty) {
        const nextTask = snap.docs[0].data();
        const nextRackNumber = nextTask.Location;
        if (nextRackNumber && nextRackNumber !== rack.rackNumber) {
          nextRackItem = {
            id: nextRackNumber,
            rackNumber: nextRackNumber,
            level: parseInt(nextTask.level || '1', 10),
            zone: nextTask.Zone || 'RACKING',
            status: 'pending',
            totalSKU: 1,
            countedSKU: 0
          };
        }
      }

      setModal({
        isOpen: true,
        type: 'success',
        title: 'Hitungan Rak Berhasil Tersimpan!',
        message: `Semua SKU pada Rak ${rack.rackNumber} telah di-sync ke Cloud Firestore dan dicatat ke Audit Trail.`,
        confirmText: nextRackItem ? `Lanjut Otomatis ke Rak ${nextRackItem.rackNumber}` : 'Kembali ke Countsheet List',
        onConfirm: () => {
          if (nextRackItem && onSelectNextRack) {
            onSelectNextRack(nextRackItem);
          } else {
            onBackToList();
          }
        },
      });
    } catch (err) {
      console.error("Firestore Save Error:", err);
      setModal({ isOpen: true, type: 'error', title: 'Gagal Menyimpan', message: 'Periksa koneksi internet kamu.' });
    } finally {
      setIsLoadingSave(false);
    }
  };

  const currentDisplayRound = skuList[0]?.currentRound || 1;

  return (
    <div className="bg-slate-50 text-slate-900 font-body-md text-body-md flex flex-col min-h-screen">
      <CustomModal modal={modal} onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))} />

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCaptured} />
      <input ref={barcodeScanInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleBarcodeCaptured} />

      <header className="fixed top-0 w-full z-50 bg-white/95 border-b border-slate-200 backdrop-blur-md pt-safe shadow-xs">
        <div className="h-32 px-margin flex flex-col justify-center gap-space-xs max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <button type="button" onClick={onBackToList} className="min-h-11 min-w-11 -ml-2 px-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              <span className="font-label-md uppercase tracking-wider font-semibold">Countsheet List</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-label-sm text-[11px] uppercase font-bold border border-amber-300">
                Round {currentDisplayRound}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Keluar</span>
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-space-sm">
            <h1 className="font-headline-md text-slate-900 tracking-tight truncate">{sessionData.sessionName}</h1>
          </div>

          <div className="flex items-center justify-between gap-space-sm pt-0.5">
            <div className="flex items-center gap-1.5 text-slate-600 font-label-sm text-label-sm truncate">
              <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">group</span>
              <span className="truncate">Counter Active: <b className="text-slate-900">{sessionData.primaryCounter}</b></span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full px-margin pt-36 pb-32 bg-slate-50 min-h-screen max-w-md mx-auto">
        <div className="flex flex-col w-full pb-12 space-y-4">

          <div className="flex items-center justify-between pb-1">
            <h2 className="font-headline-sm font-bold text-slate-800 flex items-center gap-1">
              <span className="material-symbols-outlined text-emerald-600">pin_drop</span> BIN: {rack.rackNumber}
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${isSessionLocked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {isSessionLocked ? '🔒 Sesi Terkunci (Pusat)' : '🟢 Sesi Terbuka'}
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">{skuList.length} SKU</span>
            </div>
          </div>

          {skuList.map((currentSku, idx) => (
            <div key={currentSku.sku} className="bg-white rounded-xl p-space-md shadow-xs border border-slate-200 space-y-space-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600"></div>

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-lg text-blue-700 tracking-wider font-bold">SKU: {currentSku.sku}</span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-label-sm">{currentSku.uom}</span>
                </div>
                <p className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit">
                  UPC1: {currentSku.upc || 'N/A'} {currentSku.upc2 ? `• UPC2: ${currentSku.upc2}` : ''}
                </p>
                <h3 className="font-headline-sm text-slate-900 font-bold leading-snug">{currentSku.name}</h3>
                <p className="font-body-sm text-slate-500">{currentSku.category}</p>
              </div>

              {/* EXPIRED DATE FEFO */}
              <div className="bg-blue-50/60 border border-blue-200 p-space-sm rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-blue-900 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-blue-700">event</span> Expired Date System (FEFO)
                  </span>
                  <button
                    type="button"
                    disabled={isSessionLocked}
                    onClick={() => handleSetSameExpAsSystem(idx)}
                    className={`px-2.5 py-1 text-white rounded-lg text-[10px] font-bold cursor-pointer ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-emerald-600 active:scale-95'}`}
                  >
                    Sama dgn System
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-0.5">ED System Terdekat</label>
                    <input type="text" readOnly value={currentSku.expDateSystem || '-'} className="w-full p-2 bg-white/80 border border-slate-200 rounded-lg text-slate-600 font-mono text-xs font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-blue-700 font-bold block uppercase mb-0.5">ED Actual (Fisik)</label>
                    <input
                      type="date"
                      disabled={isSessionLocked}
                      value={currentSku.expDateActual || ''}
                      onChange={(e) => updateItemField(idx, 'expDateActual', e.target.value)}
                      className={`w-full p-1.5 border-2 rounded-lg text-slate-900 font-mono text-xs font-bold outline-none shadow-xs ${isSessionLocked ? 'bg-slate-100 border-slate-300 opacity-60' : 'bg-white border-blue-400'}`}
                    />
                  </div>
                </div>

                {currentSku.allSystemEds.length > 0 && (
                  <div className="pt-2 border-t border-blue-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">
                      Variasi ED System di Rak Ini ({currentSku.batchCount} Batch):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentSku.allSystemEds.map((edDate, edIdx) => (
                        <span key={edIdx} className="px-2 py-0.5 bg-white border border-blue-300 text-blue-900 font-mono text-[10px] font-bold rounded-md shadow-xs flex items-center gap-1">
                          <span>📅</span>
                          <span>{edDate}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* INPUT KONDISI BAIK */}
              <div className="bg-slate-50 border border-slate-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600"></span><span className="font-headline-sm text-slate-900 font-bold">Kondisi Baik (Qty Good)</span></div>
                  <span className="font-label-sm text-slate-500 font-semibold">{currentSku.uom}</span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 'good', -1)} className={`w-14 h-14 bg-white border border-slate-300 text-slate-800 rounded-xl flex items-center justify-center text-xl shrink-0 cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}><span className="material-symbols-outlined">remove</span></button>
                  <div className="flex-1 h-14 border-2 border-blue-500 rounded-xl flex items-center justify-center bg-white">
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={isSessionLocked}
                      value={currentSku.qtyGood}
                      onChange={(e) => handleInputText(idx, 'qtyGood', e.target.value)}
                      placeholder="0"
                      className={`w-full text-center font-bold text-2xl outline-none ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`}
                    />
                  </div>
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 'good', 1)} className={`w-14 h-14 text-white rounded-xl flex items-center justify-center text-xl shrink-0 cursor-pointer ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-blue-600'}`}><span className="material-symbols-outlined">add</span></button>
                </div>
              </div>

              {/* BAD STOCK DETECTED */}
              <div className="bg-amber-50/70 border border-amber-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-body-lg text-amber-900 font-bold">Bad Stock Detected?</span>
                  <button type="button" disabled={isSessionLocked} onClick={() => toggleBadStock(idx)} className={`min-h-11 min-w-11 px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${currentSku.isBadStock ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>{currentSku.isBadStock ? 'ON' : 'OFF'}</button>
                </div>
                {currentSku.isBadStock && (
                  <div className="pt-2 space-y-2 border-t border-amber-200">
                    <label className="text-xs font-bold text-amber-900">Jumlah Rusak (Qty Bad):</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      disabled={isSessionLocked}
                      value={currentSku.qtyBad}
                      onChange={(e) => handleInputText(idx, 'qtyBad', e.target.value)}
                      placeholder="0"
                      className={`w-full p-2 border border-amber-300 rounded-lg text-center font-bold text-lg ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`}
                    />

                    <label className="text-xs font-bold text-amber-900 block mt-2">Catatan Detail Kerusakan (Free Text):</label>
                    <textarea
                      rows={2}
                      disabled={isSessionLocked}
                      value={currentSku.badRemarks || ''}
                      onChange={(e) => updateItemField(idx, 'badRemarks', e.target.value)}
                      placeholder="Contoh: Dus penyok, kemasan bocor terkena benturan..."
                      className={`w-full p-2 border border-amber-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500/20 ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`}
                    />
                  </div>
                )}
              </div>

            </div>
          ))}

          {skuList.length === 0 && (
            <div className="bg-white p-8 rounded-xl text-center text-slate-400 font-medium border border-slate-200">
              Tidak ada SKU ditemukan untuk rak ini.
            </div>
          )}

          {/* ITEM TAK TERDAFTAR / TEMUAN LAIN */}
          <div className="bg-white rounded-xl p-space-md shadow-xs border border-slate-200 space-y-space-md">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setUnmappedDrawerOpen(!unmappedDrawerOpen)}>
              <h3 className="font-headline-sm text-slate-900 font-bold">Item Tak Terdaftar / Temuan Lain</h3>
              <span className="material-symbols-outlined">{unmappedDrawerOpen ? 'expand_less' : 'expand_more'}</span>
            </div>
            {unmappedDrawerOpen && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input type="text" disabled={isSessionLocked} value={unmappedBarcode} onChange={(e) => setUnmappedBarcode(e.target.value)} placeholder="Scan/Ketik Barcode/UPC..." className={`flex-1 h-11 border border-slate-300 px-3 rounded-lg text-sm font-mono font-bold ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`} />
                  <button type="button" disabled={isSessionLocked} onClick={triggerNativeBarcodeScan} className={`px-3 min-h-11 text-white font-bold rounded-lg flex items-center gap-1 text-xs cursor-pointer ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-blue-600'}`}>
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span> Scan
                  </button>
                </div>

                {unmappedBarcode.trim() !== '' && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between ${isBarcodeInSystem ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    <span>{isBarcodeInSystem ? `✓ Cocok dgn Master (${matchedMasterSKU?.Owner || 'DDI'} - ${matchedMasterSKU?.SKU})` : '⚠ TIDAK ADA di Master (Wajib Foto!)'}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Exp Date:</label>
                    <input type="date" disabled={isSessionLocked} value={unmappedExpDate} onChange={(e) => setUnmappedExpDate(e.target.value)} className={`w-full h-10 border border-slate-300 px-2 rounded-lg text-xs ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Batch No:</label>
                    <input type="text" disabled={isSessionLocked} value={unmappedBatchNumber} onChange={(e) => setUnmappedBatchNumber(e.target.value)} placeholder="Batch..." className={`w-full h-10 border border-slate-300 px-2 rounded-lg text-xs ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Qty Temuan:</label>
                    <input type="text" inputMode="numeric" disabled={isSessionLocked} value={unmappedQty} onChange={(e) => setUnmappedQty(e.target.value)} placeholder="0" className={`w-full h-10 border border-slate-300 px-2 rounded-lg text-xs font-bold text-center ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Satuan (UOM):</label>
                    <div className="flex gap-1 h-10">
                      <button type="button" disabled={isSessionLocked} onClick={() => setUnmappedUnit('PCS')} className={`flex-1 rounded-lg text-xs font-bold cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${unmappedUnit === 'PCS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>PCS</button>
                      <button type="button" disabled={isSessionLocked} onClick={() => setUnmappedUnit('CARTON')} className={`flex-1 rounded-lg text-xs font-bold cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${unmappedUnit === 'CARTON' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>CARTON</button>
                    </div>
                  </div>
                </div>

                <button type="button" disabled={isSessionLocked} onClick={triggerNativeCamera} className={`w-full h-11 border rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${!isBarcodeInSystem && !unmappedPhotoUrl ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                  <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                  <span>{unmappedPhotoUrl ? 'Foto Terlampir ✓' : (!isBarcodeInSystem ? 'Ambil Foto Kamera (Wajib)' : 'Ambil Foto Kamera (Opsional)')}</span>
                </button>

                <button type="button" disabled={isSessionLocked} onClick={handleAddUnmapped} className={`w-full min-h-11 text-white font-bold rounded-lg cursor-pointer ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-blue-600'}`}>+ Tambahkan Ke Temuan</button>
              </div>
            )}
          </div>

          {unmappedList.length > 0 && (
            <div className="bg-white rounded-xl p-space-md shadow-xs border border-slate-200 space-y-2">
              <h4 className="font-bold text-sm text-slate-800 border-b pb-2">Daftar Temuan di Rak Ini ({unmappedList.length})</h4>
              {unmappedList.map((item) => (
                <div key={item.id} className="p-2 bg-slate-50 border rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-blue-700">{item.barcode} ({item.qty} {item.uom})</div>
                    <div className="text-slate-600">{item.name}</div>
                  </div>
                  <button type="button" disabled={isSessionLocked} onClick={() => handleDeleteUnmapped(item.id)} className={`p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* TOMBOL EDIT ULANG / RE-AUDIT */}
          {skuList.length > 0 && (
            <button
              type="button"
              disabled={isLoadingSave || isSessionLocked}
              onClick={handleSaveAndNext}
              className={`w-full min-h-14 text-white rounded-xl font-bold text-lg shadow-md cursor-pointer transition-all ${isSessionLocked || isLoadingSave ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isLoadingSave
                ? "Menyimpan ke Cloud..."
                : isSessionLocked
                  ? "🔒 Sesi Terkunci oleh Admin"
                  : skuList.some(s => s.isCounted)
                    ? `Update Hitungan R${currentDisplayRound} (Re-Audit) & Simpan`
                    : "Simpan Semua & Lanjut Rak Berikutnya"}
            </button>
          )}

        </div>
      </main>
    </div>
  );
}