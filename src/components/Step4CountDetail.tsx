import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, doc, writeBatch } from 'firebase/firestore';
import type { SessionData, RackItem, CustomModalState, UnmappedItem } from '../types';
import CustomModal from './CustomModal';

interface Step4CountDetailProps {
  sessionData: SessionData;
  rack: RackItem;
  onBackToList: () => void;
  onLogout: () => void;
}

interface GroupedSKUItem {
  sku: string;
  upc: string;
  name: string;
  category: string;
  uom: 'PCS' | 'CARTON';
  totalSystemQty: number;
  qtyGood: number;
  qtyBad: number;
  expDateSystem: string;
  expDateActual: string;
  isBadStock: boolean;
  badRemarks: string;
  isCounted: boolean;
  docIds: string[];
  batchCount: number;
  allSystemEds: string[];
}

export default function Step4CountDetail({ sessionData, rack, onBackToList, onLogout }: Step4CountDetailProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const barcodeScanInputRef = useRef<HTMLInputElement>(null);

  const [skuList, setSkuList] = useState<GroupedSKUItem[]>([]);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [unmappedDrawerOpen, setUnmappedDrawerOpen] = useState<boolean>(false);
  const [isLoadingSave, setIsLoadingSave] = useState<boolean>(false);

  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false, title: '', message: '',
  });

  // REAL-TIME FETCHING & AGGREGATION BERDASARKAN SKU
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
        const skuKey = (data.SKU || 'SKU_UNKNOWN').toUpperCase().trim();
        const sysQty = parseInt(data.Qty || data.QTY_SYSTEM) || 0;
        const rawActQty = data.QTY_ACTUAL ?? data.countedQty;
        const numActQty = parseInt(rawActQty, 10);
        const hasActQty = rawActQty !== undefined && rawActQty !== null && !isNaN(numActQty);
        const edSys = data.expiredDateSystem || '';

        if (!groupedMap[skuKey]) {
          groupedMap[skuKey] = {
            sku: skuKey,
            upc: data.UPC1 || data.upc || 'N/A',
            name: data.Description || data.name || skuKey,
            category: `${data.Zone || 'RACKING'} • ${data.SKUBrand || 'General'}`,
            uom: (data.satuanHitung as 'PCS' | 'CARTON') || 'PCS',
            totalSystemQty: sysQty,
            qtyGood: hasActQty ? numActQty : 0,
            qtyBad: parseInt(data.QTY_BAD) || 0,
            expDateSystem: edSys,
            expDateActual: data.expDateActual || data.expiredDateActual || '',
            isBadStock: (parseInt(data.QTY_BAD) || 0) > 0 || !!data.badRemarks,
            badRemarks: data.badRemarks || '',
            isCounted: !!data.isCounted || hasActQty,
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
            groupedMap[skuKey].qtyGood += numActQty;
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

  // UNMAPPED ITEMS STATES
  const [unmappedBarcode, setUnmappedBarcode] = useState<string>('');
  const [unmappedQty, setUnmappedQty] = useState<number>(1);
  const [unmappedUnit, setUnmappedUnit] = useState<'PCS' | 'CARTON'>('PCS');
  const [unmappedExpDate, setUnmappedExpDate] = useState<string>('2026-10-15');
  const [unmappedBatchNumber, setUnmappedBatchNumber] = useState<string>('BATCH-2026-X9');
  const [unmappedDesc, setUnmappedDesc] = useState<string>('');
  const [unmappedPhotoUrl, setUnmappedPhotoUrl] = useState<string>('');
  const [unmappedList, setUnmappedList] = useState<UnmappedItem[]>([]);

  const isBarcodeInSystem = unmappedBarcode.trim() !== '' && skuList.some(s =>
    s.upc === unmappedBarcode.trim() ||
    s.sku.toLowerCase() === unmappedBarcode.trim().toLowerCase()
  );

  const handleSetSameExpAsSystem = (index: number) => {
    if (isSessionLocked) return;
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index && item.expDateSystem ? { ...item, expDateActual: item.expDateSystem } : item))
    );
  };

  const adjustQty = (index: number, delta: number) => {
    if (isSessionLocked) return;
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, qtyGood: Math.max(0, item.qtyGood + delta) } : item))
    );
  };

  const toggleBadStock = (index: number) => {
    if (isSessionLocked) return;
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, isBadStock: !item.isBadStock } : item))
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
    if (!unmappedBarcode.trim()) {
      setModal({ isOpen: true, type: 'warning', title: 'Barcode Wajib Diisi', message: 'Mohon scan atau ketik barcode temuan terlebih dahulu.' });
      return;
    }

    if (!isBarcodeInSystem && !unmappedPhotoUrl) {
      setModal({ isOpen: true, type: 'error', title: 'Foto Fisik Wajib Lampir!', message: 'Barang ini TIDAK ADA di system! Kamu WAJIB mengambil foto barang sebelum menambahkannya.' });
      return;
    }

    const newItem: UnmappedItem = {
      id: Date.now().toString(),
      barcode: unmappedBarcode.trim(),
      name: unmappedDesc.trim() || (isBarcodeInSystem ? 'Barang System Ditemukan' : 'Barang Fisik Baru Unmapped'),
      qty: unmappedQty || 1,
      uom: unmappedUnit,
      expDate: unmappedExpDate,
      batchNumber: unmappedBatchNumber,
      photoUrl: unmappedPhotoUrl,
    };

    setUnmappedList((prev) => [...prev, newItem]);
    setUnmappedBarcode('');
    setUnmappedDesc('');
    setUnmappedPhotoUrl('');
    setUnmappedQty(1);
    setModal({ isOpen: true, type: 'success', title: 'Item Temuan Ditambahkan', message: 'Item berhasil disimpan ke daftar temuan rak ini.' });
  };

  const handleDeleteUnmapped = (id: string) => {
    setUnmappedList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveAndNext = async () => {
    if (isSessionLocked) return;
    setIsLoadingSave(true);

    try {
      const batch = writeBatch(db);

      skuList.forEach(skuItem => {
        skuItem.docIds.forEach((docId, i) => {
          const taskRef = doc(db, "master_tasks", docId);
          batch.set(taskRef, {
            counter: (sessionData.primaryCounter || 'Unassigned').toLowerCase().trim(),
            isCounted: true,
            QTY_ACTUAL: i === 0 ? skuItem.qtyGood : 0,
            QTY_BAD: i === 0 ? skuItem.qtyBad : 0,
            badRemarks: i === 0 ? (skuItem.badRemarks || '') : '',
            expDateActual: skuItem.expDateActual || '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
      });

      await batch.commit();

      setModal({
        isOpen: true,
        type: 'success',
        title: 'Hitungan Rak Berhasil Tersimpan!',
        message: `Semua SKU pada Rak ${rack.rackNumber} telah di-sync ke Cloud Firestore secara real-time.`,
        confirmText: 'Lanjut ke Rak Berikutnya',
        onConfirm: () => onBackToList(),
      });
    } catch (err) {
      console.error("Firestore Save Error:", err);
      setModal({ isOpen: true, type: 'error', title: 'Gagal Menyimpan', message: 'Periksa koneksi internet kamu.' });
    } finally {
      setIsLoadingSave(false);
    }
  };

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
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-label-sm text-[11px] uppercase font-bold border border-amber-300">Round 1</span>
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
              <button
                type="button"
                onClick={() => setIsSessionLocked(!isSessionLocked)}
                className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-md"
              >
                {isSessionLocked ? 'Sesi Terkunci' : 'Kunci Sesi'}
              </button>
              <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">{skuList.length} SKU</span>
            </div>
          </div>

          {/* LIST SKU DIGABUNGKAN (1 KARTU PER SKU PER RAK) */}
          {skuList.map((currentSku, idx) => (
            <div key={currentSku.sku} className="bg-white rounded-xl p-space-md shadow-xs border border-slate-200 space-y-space-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600"></div>

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-lg text-blue-700 tracking-wider font-bold">SKU: {currentSku.sku}</span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-label-sm">{currentSku.uom}</span>
                </div>
                <p className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit">
                  Barcode/UPC: {currentSku.upc || 'N/A'}
                </p>
                <h3 className="font-headline-sm text-slate-900 font-bold leading-snug">{currentSku.name}</h3>
                <p className="font-body-sm text-slate-500">{currentSku.category}</p>
              </div>

              {/* INFORMASI EXPIRED DATE FEFO DENGAN DAFTAR BADGES TANPA QTY SYSTEM */}
              <div className="bg-blue-50/60 border border-blue-200 p-space-sm rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-blue-900 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-blue-700">event</span> Expired Date System (FEFO)
                  </span>
                  <button type="button" disabled={isSessionLocked} onClick={() => handleSetSameExpAsSystem(idx)} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold active:scale-95 cursor-pointer">
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
                    <input type="date" disabled={isSessionLocked} value={currentSku.expDateActual || ''} onChange={(e) => updateItemField(idx, 'expDateActual', e.target.value)} className="w-full p-1.5 bg-white border-2 border-blue-400 rounded-lg text-slate-900 font-mono text-xs font-bold outline-none shadow-xs" />
                  </div>
                </div>

                {/* LIST DAFTAR ED SYSTEM TERDAFTAR DI RAK INI (TANPA PEMBOCORAN STOK SYSTEM) */}
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

              {/* INPUT KONDISI BAIK (DEFAULT 0) */}
              <div className="bg-slate-50 border border-slate-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600"></span><span className="font-headline-sm text-slate-900 font-bold">Kondisi Baik (Qty Good)</span></div>
                  <span className="font-label-sm text-slate-500 font-semibold">{currentSku.uom}</span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, -1)} className="w-14 h-14 bg-white border border-slate-300 text-slate-800 rounded-xl flex items-center justify-center text-xl shrink-0 cursor-pointer"><span className="material-symbols-outlined">remove</span></button>
                  <div className="flex-1 h-14 bg-white border-2 border-blue-500 rounded-xl flex items-center justify-center">
                    <input type="number" min="0" disabled={isSessionLocked} value={currentSku.qtyGood} onChange={(e) => updateItemField(idx, 'qtyGood', parseInt(e.target.value) || 0)} className="w-full text-center font-bold text-2xl outline-none" />
                  </div>
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 1)} className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xl shrink-0 cursor-pointer"><span className="material-symbols-outlined">add</span></button>
                </div>
              </div>

              {/* BAD STOCK DETECTED */}
              <div className="bg-amber-50/70 border border-amber-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-body-lg text-amber-900 font-bold">Bad Stock Detected?</span>
                  <button type="button" onClick={() => toggleBadStock(idx)} className={`min-h-11 min-w-11 px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${currentSku.isBadStock ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>{currentSku.isBadStock ? 'ON' : 'OFF'}</button>
                </div>
                {currentSku.isBadStock && (
                  <div className="pt-2 space-y-2 border-t border-amber-200">
                    <label className="text-xs font-bold text-amber-900">Jumlah Rusak (Qty Bad):</label>
                    <input type="number" min="0" value={currentSku.qtyBad} onChange={(e) => updateItemField(idx, 'qtyBad', parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-amber-300 rounded-lg text-center font-bold text-lg" />

                    <label className="text-xs font-bold text-amber-900 block mt-2">Catatan Detail Kerusakan (Free Text):</label>
                    <textarea
                      rows={2}
                      value={currentSku.badRemarks || ''}
                      onChange={(e) => updateItemField(idx, 'badRemarks', e.target.value)}
                      placeholder="Contoh: Dus penyok, kemasan bocor terkena benturan..."
                      className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500/20"
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
                  <input type="text" value={unmappedBarcode} onChange={(e) => setUnmappedBarcode(e.target.value)} placeholder="Scan/Ketik Barcode..." className="flex-1 h-11 border border-slate-300 px-3 rounded-lg text-sm font-mono font-bold" />
                  <button type="button" onClick={triggerNativeBarcodeScan} className="px-3 min-h-11 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-1 text-xs cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span> Scan
                  </button>
                </div>

                {unmappedBarcode.trim() !== '' && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between ${isBarcodeInSystem ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                    <span>{isBarcodeInSystem ? '✓ Ada di System (Foto Opsional)' : '⚠ TIDAK ADA di System (Wajib Foto!)'}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Exp Date:</label>
                    <input type="date" value={unmappedExpDate} onChange={(e) => setUnmappedExpDate(e.target.value)} className="w-full h-10 border border-slate-300 px-2 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Batch No:</label>
                    <input type="text" value={unmappedBatchNumber} onChange={(e) => setUnmappedBatchNumber(e.target.value)} placeholder="Batch..." className="w-full h-10 border border-slate-300 px-2 rounded-lg text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Qty Temuan:</label>
                    <input type="number" min="1" value={unmappedQty} onChange={(e) => setUnmappedQty(parseInt(e.target.value) || 1)} className="w-full h-10 border border-slate-300 px-2 rounded-lg text-xs font-bold text-center" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Satuan (UOM):</label>
                    <div className="flex gap-1 h-10">
                      <button type="button" onClick={() => setUnmappedUnit('PCS')} className={`flex-1 rounded-lg text-xs font-bold cursor-pointer ${unmappedUnit === 'PCS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>PCS</button>
                      <button type="button" onClick={() => setUnmappedUnit('CARTON')} className={`flex-1 rounded-lg text-xs font-bold cursor-pointer ${unmappedUnit === 'CARTON' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>CARTON</button>
                    </div>
                  </div>
                </div>

                <button type="button" onClick={triggerNativeCamera} className={`w-full h-11 border rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${!isBarcodeInSystem && !unmappedPhotoUrl ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                  <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                  <span>{unmappedPhotoUrl ? 'Foto Terlampir ✓' : (!isBarcodeInSystem ? 'Ambil Foto Kamera (Wajib)' : 'Ambil Foto Kamera (Opsional)')}</span>
                </button>

                <button type="button" onClick={handleAddUnmapped} className="w-full min-h-11 bg-blue-600 text-white font-bold rounded-lg cursor-pointer">+ Tambahkan Ke Temuan</button>
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
                  <button type="button" onClick={() => handleDeleteUnmapped(item.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {skuList.length > 0 && (
            <button
              type="button"
              disabled={isLoadingSave}
              onClick={handleSaveAndNext}
              className="w-full min-h-14 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLoadingSave ? "Menyimpan ke Cloud..." : "Simpan Semua & Lanjut Rak Berikutnya"}
            </button>
          )}

        </div>
      </main>
    </div>
  );
}