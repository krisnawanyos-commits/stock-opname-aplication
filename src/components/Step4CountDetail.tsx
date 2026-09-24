import React, { useState, useRef } from 'react';
import type { SessionData, RackItem, CustomModalState, UnmappedItem } from '../types';
import CustomModal from './CustomModal';

interface Step4CountDetailProps {
  sessionData: SessionData;
  rack: RackItem;
  onBackToList: () => void;
  onLogout: () => void;
}

interface SKUItem {
  id: string;
  sku: string;
  upc: string;
  upc2?: string;
  name: string;
  category: string;
  uom: 'PCS' | 'CARTON';
  qtyGood: number;
  qtyBad: number;
  expDateSystem?: string;
  expDateActual?: string;
  isBadStock?: boolean;
  badRemarks?: string;
}

export default function Step4CountDetail({ sessionData, rack, onBackToList, onLogout }: Step4CountDetailProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const barcodeScanInputRef = useRef<HTMLInputElement>(null);

  const [skuList, setSkuList] = useState<SKUItem[]>([
    {
      id: '1',
      sku: 'SMB-14',
      upc: '8993189272165',
      upc2: '18993189388184',
      name: 'Simba Sereal 2in1 Strawberi 22 gr',
      category: 'Food & Beverage • Kemasan Bantal Kecil',
      uom: 'PCS',
      qtyGood: 12,
      qtyBad: 0,
      expDateSystem: '2026-10-18',
      expDateActual: '',
      isBadStock: false,
    },
    {
      id: '2',
      sku: 'KPB-08',
      upc: '8991001122334',
      name: 'Kopi Kapal Api Special Mix 20x25g',
      category: 'Food & Beverage • Sachet',
      uom: 'CARTON',
      qtyGood: 5,
      qtyBad: 1,
      expDateSystem: '2026-08-14',
      expDateActual: '2026-08-14',
      isBadStock: true,
      badRemarks: 'Dus penyok & kemasan bocor terkena benturan pallet.',
    },
  ]);

  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [unmappedDrawerOpen, setUnmappedDrawerOpen] = useState<boolean>(false);
  const companionName = sessionData.partners?.[0] || 'Budi Prasetyo';

  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false, title: '', message: '',
  });

  const [unmappedBarcode, setUnmappedBarcode] = useState<string>('8997012399912');
  const [unmappedUnit, setUnmappedUnit] = useState<'PCS' | 'CARTON'>('PCS');
  const [unmappedExpDate, setUnmappedExpDate] = useState<string>('2026-10-15');
  const [unmappedBatchNumber, setUnmappedBatchNumber] = useState<string>('BATCH-2026-X9');
  const [unmappedDesc, setUnmappedDesc] = useState<string>('Biskuit Cokelat Kemasan Plastik 100gr');
  const [unmappedPhotoUrl, setUnmappedPhotoUrl] = useState<string>('');
  const [unmappedList, setUnmappedList] = useState<UnmappedItem[]>([]);

  const handleSetSameExpAsSystem = (index: number) => {
    if (isSessionLocked) return;
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index && item.expDateSystem ? { ...item, expDateActual: item.expDateSystem } : item))
    );
  };

  const adjustQty = (index: number, type: 'good' | 'bad', delta: number) => {
    if (isSessionLocked) {
      setModal({ isOpen: true, type: 'warning', title: 'Sesi Terkunci', message: 'Sesi sedang terkunci oleh Admin WH.' });
      return;
    }
    setSkuList((prev) =>
      prev.map((item, idx) => {
        if (idx === index) {
          if (type === 'good') return { ...item, qtyGood: Math.max(0, item.qtyGood + delta) };
          if (type === 'bad') return { ...item, qtyBad: Math.max(0, item.qtyBad + delta) };
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

  const updateItemField = (index: number, field: keyof SKUItem, value: any) => {
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
      setModal({ isOpen: true, type: 'success', title: 'Barcode Berhasil Dipindai', message: `Kamera membaca: ${randomBarcode}` });
    }
  };

  const handleAddUnmapped = () => {
    if (!unmappedBarcode.trim()) {
      setModal({ isOpen: true, type: 'warning', title: 'Barcode Wajib Diisi', message: 'Mohon scan/ketik barcode temuan.' });
      return;
    }

    const newItem: UnmappedItem = {
      id: Date.now().toString(),
      barcode: unmappedBarcode.startsWith('UNKNOWN-') ? unmappedBarcode.trim() : `UNKNOWN-${unmappedBarcode.trim()}`,
      name: unmappedDesc.trim() || 'Barang Fisik Unmapped',
      qty: 1,
      uom: unmappedUnit,
      expDate: unmappedExpDate,
      batchNumber: unmappedBatchNumber,
      photoUrl: unmappedPhotoUrl,
    };

    setUnmappedList((prev) => [...prev, newItem]);
    setUnmappedBarcode('');
    setUnmappedDesc('');
    setUnmappedPhotoUrl('');
    setModal({ isOpen: true, type: 'success', title: 'Item Temuan Ditambahkan', message: 'Item unmapped tersimpan ke rak ini.' });
  };

  const handleDeleteUnmapped = (id: string) => {
    setUnmappedList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveAndNext = () => {
    if (isSessionLocked) return;
    setModal({
      isOpen: true,
      type: 'success',
      title: 'Hitungan Rak Tersimpan',
      message: `Semua SKU (${skuList.length} Item) pada Rak ${rack.rackNumber} telah tersimpan.`,
      confirmText: 'Lanjut ke Rak Berikutnya',
      onConfirm: () => onBackToList(),
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'SO';
    const parts = name.split(/[\s.]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
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
            <div className="flex items-center gap-space-sm">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-label-sm text-[11px] uppercase font-bold border border-amber-300">Round 1</span>
              <button type="button" onClick={onLogout} className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {getInitials(sessionData.primaryCounter || 'SO')}
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-space-sm">
            <h1 className="font-headline-md text-slate-900 tracking-tight truncate">{sessionData.sessionName}</h1>
          </div>

          <div className="flex items-center justify-between gap-space-sm pt-0.5">
            <div className="flex items-center gap-1.5 text-slate-600 font-label-sm text-label-sm truncate">
              <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">group</span>
              <span className="truncate">Tim: {(sessionData.primaryCounter || 'putri').split('.')[0]} (SO) &amp; {companionName} (WH)</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full px-margin pt-36 pb-32 bg-slate-50 min-h-screen max-w-md mx-auto">
        <div className="flex flex-col w-full pb-12 space-y-4">

          {/* Banner Status Sesi (Buka/Kunci) */}
          <div className="bg-white p-space-md rounded-xl flex items-center justify-between shadow-xs border border-slate-200">
            <div className="flex items-center gap-space-sm min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full ${isSessionLocked ? 'bg-red-600' : 'bg-emerald-500 animate-pulse'} shrink-0`}></span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`material-symbols-outlined ${isSessionLocked ? 'text-red-600' : 'text-emerald-600'} text-[18px]`}>
                    {isSessionLocked ? 'lock' : 'verified_user'}
                  </span>
                  <span className={`font-headline-sm text-headline-sm ${isSessionLocked ? 'text-red-700' : 'text-slate-900'} truncate`}>
                    {isSessionLocked ? 'Sesi Terkunci oleh Admin WH' : 'Sesi Terverifikasi Aktif'}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-slate-500 truncate">
                  {isSessionLocked ? 'Finalisasi hitungan aktif • Mode Read-Only' : 'Putaran 1 Berjalan • Sinkronisasi cloud aktif'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSessionLocked(!isSessionLocked)}
              className="min-h-11 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg font-label-sm text-xs uppercase flex items-center gap-1 shrink-0 font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">{isSessionLocked ? 'lock' : 'lock_open'}</span>
              <span>{isSessionLocked ? 'Buka Kunci' : 'Kunci Sesi'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pb-1">
            <h2 className="font-headline-sm font-bold text-slate-800 flex items-center gap-1">
              <span className="material-symbols-outlined text-emerald-600">pin_drop</span> BIN: {rack.rackNumber}
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">{skuList.length} SKU</span>
          </div>

          {/* SPREAD LIST SKU VERTIKAL MEMANJANG */}
          {skuList.map((currentSku, idx) => (
            <div key={currentSku.id} className="bg-white rounded-xl p-space-md shadow-xs border border-slate-200 space-y-space-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600"></div>

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-lg text-blue-700 tracking-wider font-bold">SKU: {currentSku.sku}</span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-label-sm">{currentSku.uom}</span>
                </div>
                <h3 className="font-headline-sm text-slate-900 font-bold leading-snug">{currentSku.name}</h3>
                <p className="font-body-sm text-slate-500">{currentSku.category}</p>
              </div>

              <div className="bg-blue-50/60 border border-blue-200 p-space-sm rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-blue-900 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-blue-700">event</span> Expired Date
                  </span>
                  <button type="button" disabled={isSessionLocked} onClick={() => handleSetSameExpAsSystem(idx)} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold active:scale-95">
                    Sama dgn System
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block uppercase mb-0.5">ED System</label>
                    <input type="text" readOnly value={currentSku.expDateSystem || '-'} className="w-full p-2 bg-white/80 border border-slate-200 rounded-lg text-slate-600 font-mono text-xs font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-blue-700 font-bold block uppercase mb-0.5">ED Actual (Fisik)</label>
                    <input type="date" disabled={isSessionLocked} value={currentSku.expDateActual || ''} onChange={(e) => updateItemField(idx, 'expDateActual', e.target.value)} className="w-full p-1.5 bg-white border-2 border-blue-400 rounded-lg text-slate-900 font-mono text-xs font-bold outline-none shadow-xs" />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600"></span><span className="font-headline-sm text-slate-900 font-bold">Kondisi Baik (Qty Good)</span></div>
                  <span className="font-label-sm text-slate-500 font-semibold">{currentSku.uom}</span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 'good', -1)} className="w-14 h-14 bg-white border border-slate-300 text-slate-800 rounded-xl flex items-center justify-center text-xl shrink-0"><span className="material-symbols-outlined">remove</span></button>
                  <div className="flex-1 h-14 bg-white border-2 border-blue-500 rounded-xl flex items-center justify-center">
                    <input type="number" min="0" disabled={isSessionLocked} value={currentSku.qtyGood} onChange={(e) => updateItemField(idx, 'qtyGood', parseInt(e.target.value) || 0)} className="w-full text-center font-bold text-2xl outline-none" />
                  </div>
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 'good', 1)} className="w-14 h-14 bg-blue-600 text-white rounded-xl flex items-center justify-center text-xl shrink-0"><span className="material-symbols-outlined">add</span></button>
                </div>
                <div className="grid grid-cols-4 gap-space-xs pt-1">
                  <button type="button" onClick={() => adjustQty(idx, 'good', 1)} className="min-h-11 bg-white border border-slate-200 rounded-lg text-sm font-semibold">+1</button>
                  <button type="button" onClick={() => adjustQty(idx, 'good', 5)} className="min-h-11 bg-white border border-slate-200 rounded-lg text-sm font-semibold">+5</button>
                  <button type="button" onClick={() => adjustQty(idx, 'good', 10)} className="min-h-11 bg-white border border-slate-200 rounded-lg text-sm font-semibold">+10</button>
                  <button type="button" onClick={() => updateItemField(idx, 'qtyGood', 0)} className="min-h-11 bg-rose-50 text-rose-700 rounded-lg text-sm font-bold">Rst</button>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-body-lg text-amber-900 font-bold">Bad Stock Detected?</span>
                  <button type="button" onClick={() => toggleBadStock(idx)} className={`min-h-11 min-w-11 px-3 py-1 rounded-full text-xs font-bold ${currentSku.isBadStock ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>{currentSku.isBadStock ? 'ON' : 'OFF'}</button>
                </div>
                {currentSku.isBadStock && (
                  <div className="pt-2 space-y-2 border-t border-amber-200">
                    <label className="text-xs font-bold text-amber-900">Jumlah Rusak (Qty Bad):</label>
                    <input type="number" min="0" value={currentSku.qtyBad} onChange={(e) => updateItemField(idx, 'qtyBad', parseInt(e.target.value) || 0)} className="w-full p-2 bg-white border border-amber-300 rounded-lg text-center font-bold text-lg" />
                  </div>
                )}
              </div>

            </div>
          ))}

          {/* DRAWER UNMAPPED POPUP */}
          <div className="bg-white rounded-xl p-space-md shadow-xs border border-slate-200 space-y-space-md">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setUnmappedDrawerOpen(!unmappedDrawerOpen)}>
              <h3 className="font-headline-sm text-slate-900 font-bold">Item Tak Terdaftar / Temuan Lain</h3>
              <span className="material-symbols-outlined">{unmappedDrawerOpen ? 'expand_less' : 'expand_more'}</span>
            </div>
            {unmappedDrawerOpen && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input type="text" value={unmappedBarcode} onChange={(e) => setUnmappedBarcode(e.target.value)} placeholder="Barcode Fisik..." className="flex-1 h-11 border border-slate-300 px-3 rounded-lg text-sm font-mono font-bold" />
                  <button type="button" onClick={triggerNativeBarcodeScan} className="px-3 min-h-11 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-1 text-xs">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span> Scan
                  </button>
                </div>

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

                <div className="flex gap-2">
                  <button type="button" onClick={() => setUnmappedUnit('PCS')} className={`flex-1 h-10 rounded-lg text-xs font-bold ${unmappedUnit === 'PCS' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>PCS</button>
                  <button type="button" onClick={() => setUnmappedUnit('CARTON')} className={`flex-1 h-10 rounded-lg text-xs font-bold ${unmappedUnit === 'CARTON' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>CARTON</button>
                </div>

                <button type="button" onClick={triggerNativeCamera} className="w-full h-11 bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-bold text-xs flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                  <span>{unmappedPhotoUrl ? 'Foto Terlampir (Foto Ulang)' : 'Ambil Foto Kamera HP'}</span>
                </button>

                <button type="button" onClick={handleAddUnmapped} className="w-full min-h-11 bg-blue-600 text-white font-bold rounded-lg">+ Tambahkan Ke Temuan</button>
              </div>
            )}
          </div>

          {/* LIST ITEM UNMAPPED (Terhubung ke handleDeleteUnmapped) */}
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

          <button type="button" onClick={handleSaveAndNext} className="w-full min-h-14 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-md">
            Simpan Semua &amp; Lanjut Rak Berikutnya
          </button>

        </div>
      </main>
    </div>
  );
}