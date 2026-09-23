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
  expDate?: string;
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
      expDate: '2026-08-14',
      badRemarks: 'Dus penyok & kemasan bocor terkena benturan pallet.',
    },
  ]);

  const [activeSkuIndex, setActiveSkuIndex] = useState<number>(0);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [badStockEnabled, setBadStockEnabled] = useState<boolean>(false);
  const [unmappedDrawerOpen, setUnmappedDrawerOpen] = useState<boolean>(false);
  const [companionName, setCompanionName] = useState<string>(sessionData.partners[0] || 'Budi Prasetyo');

  // Custom Modal State
  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false,
    title: '',
    message: '',
  });

  // Unmapped SKU Form State (including Expired Date & Batch Number)
  const [unmappedBarcode, setUnmappedBarcode] = useState<string>('8997012399912');
  const [unmappedUnit, setUnmappedUnit] = useState<'PCS' | 'CARTON'>('PCS');
  const [unmappedExpDate, setUnmappedExpDate] = useState<string>('2026-10-15');
  const [unmappedBatchNumber, setUnmappedBatchNumber] = useState<string>('BATCH-2026-X9');
  const [unmappedDesc, setUnmappedDesc] = useState<string>('Biskuit Cokelat Kemasan Plastik 100gr');
  const [unmappedPhotoUrl, setUnmappedPhotoUrl] = useState<string>('');

  // Unmapped Found Items List
  const [unmappedList, setUnmappedList] = useState<UnmappedItem[]>([
    {
      id: 'unmapped-1',
      barcode: 'UNKNOWN-8997012399912',
      name: 'Biskuit Cokelat Kemasan Plastik 100gr',
      qty: 3,
      uom: 'PCS',
      expDate: '2026-10-15',
      batchNumber: 'BATCH-2026-X9',
      photoUrl: '',
    },
    {
      id: 'unmapped-2',
      barcode: 'UNKNOWN-8886008101014',
      name: 'Kopi Instan Sachet 20g',
      qty: 1,
      uom: 'CARTON',
      expDate: '2027-01-20',
      batchNumber: 'BATCH-2026-K8',
      photoUrl: '',
    },
  ]);

  const currentSku = skuList[activeSkuIndex];

  // Native Camera Photo Upload Handlers
  const triggerNativeCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const triggerNativeBarcodeScan = () => {
    if (barcodeScanInputRef.current) {
      barcodeScanInputRef.current.click();
    }
  };

  const handlePhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUnmappedPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBarcodeCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate barcode reading from captured image
      const randomBarcode = '899' + Math.floor(1000000000 + Math.random() * 9000000000);
      setUnmappedBarcode(randomBarcode);
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Barcode Berhasil Dipindai',
        message: `Kamera native membaca kode barcode: ${randomBarcode}`,
      });
    }
  };

  const adjustQty = (type: 'good' | 'bad', delta: number) => {
    if (isSessionLocked) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Sesi Terkunci',
        message: 'Sesi sedang terkunci oleh Admin WH. Data hitungan tidak dapat diubah.',
      });
      return;
    }
    setSkuList((prev) =>
      prev.map((item, idx) => {
        if (idx === activeSkuIndex) {
          if (type === 'good') {
            return { ...item, qtyGood: Math.max(0, item.qtyGood + delta) };
          } else {
            return { ...item, qtyBad: Math.max(0, item.qtyBad + delta) };
          }
        }
        return item;
      })
    );
  };

  const handleAddUnmapped = () => {
    if (!unmappedBarcode.trim()) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Barcode Wajib Diisi',
        message: 'Mohon scan atau ketik nomor barcode temuan fisik terlebih dahulu.',
      });
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

    setUnmappedList([...unmappedList, newItem]);
    setUnmappedBarcode('');
    setUnmappedDesc('');
    setUnmappedPhotoUrl('');

    setModal({
      isOpen: true,
      type: 'success',
      title: 'Item Temuan Ditambahkan',
      message: 'Item unmapped dengan Expired Date & Nomor Batch telah disimpan ke daftar temuan rak ini.',
      details: [
        { label: 'Barcode SKU', value: newItem.barcode },
        { label: 'Exp Date', value: newItem.expDate || '-' },
        { label: 'Batch No.', value: newItem.batchNumber || '-' },
      ],
    });
  };

  const handleDeleteUnmapped = (id: string) => {
    setUnmappedList(unmappedList.filter((item) => item.id !== id));
  };

  const handleSaveAndNext = () => {
    if (isSessionLocked) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Sesi Terkunci',
        message: 'Sesi sedang terkunci oleh Admin. Hasil hitungan dalam mode Read-Only.',
      });
      return;
    }

    setModal({
      isOpen: true,
      type: 'success',
      title: 'Hitungan Rak Berhasil Disimpan',
      message: `Data rekonsiliasi fisik untuk Rak ${rack.rackNumber} telah tersimpan dan ter-sync ke storage local/cloud.`,
      details: [
        { label: 'Target Bin', value: rack.rackNumber },
        { label: 'Qty Baik (Good)', value: `${currentSku.qtyGood} ${currentSku.uom}` },
        { label: 'Qty Rusak (Bad)', value: `${currentSku.qtyBad} ${currentSku.uom}` },
        { label: 'Item Unmapped', value: `${unmappedList.length} Item Temuan` },
      ],
      confirmText: 'Lanjut ke Rak Berikutnya',
      onConfirm: () => {
        onBackToList();
      },
    });
  };

  const getInitials = (name: string) => {
    const parts = name.split(/[\s.]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name.substring(0, 2)).toUpperCase();
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-body-md text-body-md flex flex-col min-h-screen">
      {/* Custom Modal replacing alert */}
      <CustomModal modal={modal} onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))} />

      {/* Hidden Native Camera Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCaptured}
      />
      <input
        ref={barcodeScanInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleBarcodeCaptured}
      />

      {/* Header Bar */}
      <header className="fixed top-0 w-full z-50 bg-white/95 border-b border-slate-200 backdrop-blur-md pt-safe shadow-sm">
        <div className="h-32 px-margin flex flex-col justify-center gap-space-xs max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToList}
              className="min-h-11 min-w-11 -ml-2 px-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">Countsheet List</span>
            </button>
            <div className="flex items-center gap-space-sm">
              <div className="h-6 w-auto flex items-center pr-1 border-r border-slate-200">
                <span className="font-headline-sm text-headline-sm font-extrabold text-slate-900 tracking-tight">
                  Any<span className="text-blue-600">Mind</span>
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-label-sm text-[11px] uppercase font-bold border border-amber-300">
                Round 1
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm hover:bg-blue-700 cursor-pointer"
                title="Klik untuk Keluar / Logout"
              >
                {getInitials(sessionData.primaryCounter)}
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-space-sm">
            <h1 className="font-headline-md text-headline-md text-slate-900 tracking-tight truncate">
              {sessionData.sessionName}
            </h1>
            <span className="font-label-sm text-label-sm text-slate-500 font-medium shrink-0">Active Stock Opname</span>
          </div>

          <div className="flex items-center justify-between gap-space-sm pt-0.5">
            <div className="flex items-center gap-1.5 text-slate-600 font-label-sm text-label-sm truncate">
              <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">group</span>
              <span className="truncate">Tim: {sessionData.primaryCounter.split('.')[0]} (SO) &amp; {companionName} (WH)</span>
            </div>
            <button type="button" className="min-h-11 shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors">
              <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
              <span className="font-label-sm text-label-sm uppercase font-semibold">List to Floor (Guided Rack)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative w-full px-margin pt-36 pb-32 bg-slate-50 min-h-screen max-w-md mx-auto">
        <div className="flex flex-col w-full pb-12 space-y-4">

          {/* Admin Session Banner / Lock Simulation Toggle */}
          <div className="bg-white p-space-md rounded-xl flex items-center justify-between shadow-sm border border-slate-200">
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
              className="min-h-11 px-space-md py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-lg font-label-sm text-label-sm uppercase flex items-center gap-1 shrink-0 transition-all font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isSessionLocked ? 'lock' : 'lock_open'}
              </span>
              <span>{isSessionLocked ? 'Buka Kunci' : 'Kunci Sesi'}</span>
            </button>
          </div>

          {/* Operational Mode Selector (Tabs) */}
          <div className="bg-slate-200/80 p-1 rounded-xl grid grid-cols-2 gap-1 border border-slate-300/70 shadow-inner">
            <button
              type="button"
              className="min-h-11 py-2 px-space-sm rounded-lg bg-blue-600 text-white font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all font-bold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
              <span>List to Floor</span>
            </button>
            <button
              type="button"
              className="min-h-11 py-2 px-space-sm rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white/80 font-label-md text-label-md uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all font-medium cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">radar</span>
              <span>Floor to List</span>
            </button>
          </div>

          {/* Team Identification Module */}
          <div className="bg-white rounded-xl p-space-md shadow-sm border border-slate-200 space-y-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">badge</span>
                <h2 className="font-headline-sm text-headline-sm text-slate-900">Setup Tim Counter</h2>
              </div>
              <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase font-semibold">
                Siap Hitung
              </span>
            </div>

            <div className="grid grid-cols-1 gap-space-sm">
              {/* Primary Counter Read-only */}
              <div className="bg-slate-50 border border-slate-200 p-space-sm rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-space-sm min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person_check</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-sm text-label-sm text-slate-500 uppercase font-medium">Counter Utama (SO)</p>
                    <p className="font-body-lg text-body-lg text-slate-900 font-semibold truncate">
                      {sessionData.primaryCounter} (Staff SO)
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-emerald-600 text-[20px] shrink-0" title="Terverifikasi SSO">
                  verified
                </span>
              </div>

              {/* Secondary Counter Editable */}
              <div className="bg-slate-50 border border-slate-200 p-space-sm rounded-lg space-y-space-xs">
                <label className="font-label-sm text-label-sm text-slate-600 flex items-center justify-between font-medium" htmlFor="companionInput">
                  <span>Counter Pendamping (WH)</span>
                  <span className="text-amber-700 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Tersambung
                  </span>
                </label>
                <div className="flex items-center gap-space-sm">
                  <div className="relative flex-1">
                    <input
                      id="companionInput"
                      type="text"
                      disabled={isSessionLocked}
                      value={companionName}
                      onChange={(e) => setCompanionName(e.target.value)}
                      placeholder="Contoh: Budi Prasetyo"
                      className="w-full h-11 border border-slate-300 px-space-sm rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm disabled:bg-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSessionLocked}
                    onClick={() => setCompanionName(companionName === 'Budi Prasetyo' ? 'Ahmad Fauzi' : 'Budi Prasetyo')}
                    className="min-h-11 px-space-sm bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg font-label-sm text-label-sm uppercase flex items-center gap-1 shrink-0 font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                    <span>Switch</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SKU Carousel Buttons */}
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {skuList.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSkuIndex(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeSkuIndex === idx
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{item.sku}</span>
                {(item.qtyGood > 0 || item.qtyBad > 0) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                )}
              </button>
            ))}
          </div>

          {/* Primary Active Count Card (Guided Rack Mode) */}
          {currentSku && (
            <div className={`bg-white rounded-xl p-space-md shadow-sm border border-slate-200 space-y-space-md relative overflow-hidden transition-opacity ${isSessionLocked ? 'opacity-75' : ''}`}>
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-600"></div>

              {/* Bin Target Chip */}
              <div className="flex items-center justify-between gap-space-sm pt-1">
                <div className="bg-emerald-50 border border-emerald-200 px-space-sm py-1.5 rounded-lg flex items-center gap-1.5 w-full">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">pin_drop</span>
                  <span className="font-label-md text-label-md text-emerald-800 font-bold tracking-tight truncate">
                    BIN: {rack.rackNumber}
                  </span>
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-lg text-label-lg text-blue-700 tracking-wider font-bold">
                    SKU: {currentSku.sku}
                  </span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold">
                    {currentSku.uom}
                  </span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-slate-900 font-bold">
                  {currentSku.name}
                </h3>
                <p className="font-body-sm text-body-sm text-slate-500">
                  {currentSku.category}
                </p>
              </div>

              {/* Barcode Quick Copy / Scanner Match List */}
              <div className="bg-slate-50 border border-slate-200 p-space-sm rounded-lg space-y-1.5">
                <div className="flex items-center justify-between font-label-sm text-label-sm text-slate-700">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-slate-500">barcode</span>
                    <span>UPC 1: <strong className="font-mono text-slate-900">{currentSku.upc}</strong></span>
                  </span>
                  <span className="text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5 text-[11px]">
                    <span className="material-symbols-outlined text-[13px]">check</span> Terbaca
                  </span>
                </div>
                {currentSku.upc2 && (
                  <div className="flex items-center justify-between font-label-sm text-label-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">barcode_scanner</span>
                      <span>UPC 2: <span className="font-mono">{currentSku.upc2}</span> (CARTON)</span>
                    </span>
                    <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[11px] font-medium">Alternatif</span>
                  </div>
                )}
              </div>

              {/* QTY GOOD SECTION */}
              <div className="bg-slate-50 border border-slate-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                    <span className="font-headline-sm text-headline-sm text-slate-900 font-bold">
                      Kondisi Baik (Qty Good)
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm text-slate-500 font-semibold">{currentSku.uom}</span>
                </div>

                {/* Large Counter Controller */}
                <div className="flex items-center gap-space-sm">
                  <button
                    type="button"
                    disabled={isSessionLocked}
                    onClick={() => adjustQty('good', -1)}
                    className="w-14 h-14 bg-white border border-slate-300 hover:bg-slate-100 active:scale-95 text-slate-800 rounded-xl flex items-center justify-center font-headline-md text-headline-md shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[28px]">remove</span>
                  </button>
                  <div className="flex-1 h-14 bg-white border-2 border-blue-500 rounded-xl flex items-center justify-center px-space-sm shadow-sm">
                    <input
                      type="number"
                      min="0"
                      disabled={isSessionLocked}
                      value={currentSku.qtyGood}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setSkuList((prev) =>
                          prev.map((item, idx) => (idx === activeSkuIndex ? { ...item, qtyGood: Math.max(0, val) } : item))
                        );
                      }}
                      className="w-full text-center bg-transparent font-label-lg text-[28px] leading-none text-slate-900 font-bold focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isSessionLocked}
                    onClick={() => adjustQty('good', 1)}
                    className="w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl flex items-center justify-center font-headline-md text-headline-md shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[28px]">add</span>
                  </button>
                </div>

                {/* Rapid Increments Buttons */}
                <div className="grid grid-cols-4 gap-space-xs pt-1">
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty('good', 1)} className="min-h-11 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-lg font-label-md text-label-md font-semibold active:scale-95 shadow-sm cursor-pointer disabled:opacity-50">+1</button>
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty('good', 5)} className="min-h-11 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-lg font-label-md text-label-md font-semibold active:scale-95 shadow-sm cursor-pointer disabled:opacity-50">+5</button>
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty('good', 10)} className="min-h-11 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-lg font-label-md text-label-md font-semibold active:scale-95 shadow-sm cursor-pointer disabled:opacity-50">+10</button>
                  <button type="button" disabled={isSessionLocked} onClick={() => setSkuList(prev => prev.map((item, idx) => idx === activeSkuIndex ? { ...item, qtyGood: 0 } : item))} className="min-h-11 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg font-label-md text-label-md font-bold active:scale-95 shadow-sm cursor-pointer disabled:opacity-50">Rst</button>
                </div>
              </div>

              {/* BAD STOCK TOGGLE */}
              <div className="bg-amber-50/70 border border-amber-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-amber-600 text-[24px]">warning</span>
                    <div>
                      <p className="font-body-lg text-body-lg text-amber-900 font-bold">Bad Stock Detected?</p>
                      <p className="font-body-sm text-body-sm text-amber-700">Temuan kemasan rusak, penyok, atau kadaluwarsa</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSessionLocked}
                    onClick={() => setBadStockEnabled(!badStockEnabled)}
                    className={`min-h-11 min-w-14 px-2 py-1 rounded-full font-label-sm text-label-sm font-bold flex items-center justify-center transition-all cursor-pointer ${
                      badStockEnabled
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {badStockEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* BAD STOCK DRAWER / SECTION */}
                {badStockEnabled && (
                  <div className="pt-space-sm space-y-space-md border-t border-amber-200/80">
                    <div className="space-y-space-xs">
                      <label className="font-label-sm text-label-sm text-amber-900 uppercase font-bold">
                        Jumlah Rusak (Qty Bad):
                      </label>
                      <div className="flex items-center gap-space-sm">
                        <button
                          type="button"
                          disabled={isSessionLocked}
                          onClick={() => adjustQty('bad', -1)}
                          className="w-12 h-12 bg-white border border-amber-300 active:scale-95 text-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[24px]">remove</span>
                        </button>
                        <div className="flex-1 h-12 bg-white border border-amber-400 rounded-xl flex items-center justify-center px-space-sm shadow-sm">
                          <input
                            type="number"
                            min="0"
                            disabled={isSessionLocked}
                            value={currentSku.qtyBad}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setSkuList((prev) =>
                                prev.map((item, idx) => (idx === activeSkuIndex ? { ...item, qtyBad: Math.max(0, val) } : item))
                              );
                            }}
                            className="w-full text-center bg-transparent font-label-lg text-label-lg text-amber-900 font-bold focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isSessionLocked}
                          onClick={() => adjustQty('bad', 1)}
                          className="w-12 h-12 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold active:scale-95 rounded-xl flex items-center justify-center shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[24px]">add</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-space-xs pt-0.5">
                        <button type="button" disabled={isSessionLocked} onClick={() => adjustQty('bad', 1)} className="min-h-11 bg-white border border-amber-300 text-amber-900 rounded-lg font-label-md text-label-md font-semibold hover:bg-amber-100 shadow-sm cursor-pointer disabled:opacity-50">+1 Rusak</button>
                        <button type="button" disabled={isSessionLocked} onClick={() => adjustQty('bad', 5)} className="min-h-11 bg-white border border-amber-300 text-amber-900 rounded-lg font-label-md text-label-md font-semibold hover:bg-amber-100 shadow-sm cursor-pointer disabled:opacity-50">+5 Rusak</button>
                        <button type="button" disabled={isSessionLocked} onClick={() => adjustQty('bad', 10)} className="min-h-11 bg-white border border-amber-300 text-amber-900 rounded-lg font-label-md text-label-md font-semibold hover:bg-amber-100 shadow-sm cursor-pointer disabled:opacity-50">+10 Rusak</button>
                      </div>
                    </div>

                    <div className="space-y-space-xs">
                      <label className="font-label-sm text-label-sm text-slate-700 uppercase font-semibold" htmlFor="badExpiryInput">
                        Tanggal Kadaluwarsa (Exp Date):
                      </label>
                      <div className="relative">
                        <input
                          id="badExpiryInput"
                          type="date"
                          disabled={isSessionLocked}
                          value={currentSku.expDate || '2026-08-14'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSkuList((prev) =>
                              prev.map((item, idx) => (idx === activeSkuIndex ? { ...item, expDate: val } : item))
                            );
                          }}
                          className="w-full h-11 border border-slate-300 px-space-sm rounded-lg font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm disabled:bg-slate-100"
                        />
                      </div>
                    </div>

                    <div className="space-y-space-xs">
                      <label className="font-label-sm text-label-sm text-slate-700 uppercase font-semibold" htmlFor="badRemarksInput">
                        Keterangan / Detail Kerusakan Fisik:
                      </label>
                      <textarea
                        id="badRemarksInput"
                        rows={2}
                        disabled={isSessionLocked}
                        value={currentSku.badRemarks || 'Dus penyok & kemasan bocor terkena benturan pallet saat perpindahan rak.'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSkuList((prev) =>
                            prev.map((item, idx) => (idx === activeSkuIndex ? { ...item, badRemarks: val } : item))
                          );
                        }}
                        placeholder="Contoh: Dus penyok / Kemasan sobek kena cutter"
                        className="w-full border border-slate-300 p-space-sm rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none shadow-sm disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Found Item / Unmapped SKU Drawer Section */}
          <div className="bg-white rounded-xl p-space-md shadow-sm border border-slate-200 space-y-space-md">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setUnmappedDrawerOpen(!unmappedDrawerOpen)}
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-amber-500 text-[22px]">find_in_page</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-slate-900 font-bold">Item Tak Terdaftar / Temuan Lain</h3>
                  <p className="font-body-sm text-body-sm text-slate-500">Barang fisik ada di rak namun barcode unmapped</p>
                </div>
              </div>
              <button type="button" className="min-h-11 min-w-11 flex items-center justify-center text-blue-600 hover:text-blue-700">
                <span className="material-symbols-outlined text-[24px]">
                  {unmappedDrawerOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>

            {unmappedDrawerOpen && (
              <div className="space-y-space-md pt-space-xs">
                {/* Barcode & Native Camera Scan Button */}
                <div className="space-y-space-xs">
                  <label className="font-label-sm text-label-sm text-slate-700 uppercase font-semibold" htmlFor="unmappedBarcodeQuery">
                    Scan Kamera / Ketik Barcode Temuan:
                  </label>
                  <div className="flex gap-space-sm">
                    <div className="relative flex-1">
                      <input
                        id="unmappedBarcodeQuery"
                        type="text"
                        disabled={isSessionLocked}
                        value={unmappedBarcode}
                        onChange={(e) => setUnmappedBarcode(e.target.value)}
                        placeholder="Scan atau ketik barcode fisik..."
                        className="w-full h-12 border border-slate-300 px-space-sm rounded-lg font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm disabled:bg-slate-100"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isSessionLocked}
                      onClick={triggerNativeBarcodeScan}
                      className="min-h-11 px-space-md bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-label-sm text-label-sm font-semibold flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer disabled:opacity-50"
                      title="Buka Kamera Barcode Native HP"
                    >
                      <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                      <span>Scan</span>
                    </button>
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-space-sm rounded-lg flex items-start gap-space-sm">
                  <span className="material-symbols-outlined text-rose-600 text-[20px] shrink-0 mt-0.5">warning</span>
                  <div className="space-y-0.5">
                    <p className="font-label-md text-label-md text-rose-800 font-bold">Barcode Tidak Terdaftar Di Master Data</p>
                    <p className="font-body-sm text-body-sm text-rose-700">Sistem mendeteksi SKU liar. Wajib lengkapi foto kemasan fisik, Expired Date, Nomor Batch, dan satuan hitung.</p>
                  </div>
                </div>

                {/* Form Fields: Expired Date & Batch Number */}
                <div className="grid grid-cols-2 gap-space-sm">
                  <div className="space-y-1">
                    <label className="font-label-sm text-label-sm text-slate-700 uppercase font-semibold" htmlFor="unmappedExpDateInput">
                      Tanggal Kadaluarsa:
                    </label>
                    <input
                      id="unmappedExpDateInput"
                      type="date"
                      disabled={isSessionLocked}
                      value={unmappedExpDate}
                      onChange={(e) => setUnmappedExpDate(e.target.value)}
                      className="w-full h-11 border border-slate-300 px-2 rounded-lg font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm disabled:bg-slate-100"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-label-sm text-label-sm text-slate-700 uppercase font-semibold" htmlFor="unmappedBatchInput">
                      Nomor Batch:
                    </label>
                    <input
                      id="unmappedBatchInput"
                      type="text"
                      disabled={isSessionLocked}
                      value={unmappedBatchNumber}
                      onChange={(e) => setUnmappedBatchNumber(e.target.value)}
                      placeholder="Misal: BATCH-2026-X9"
                      className="w-full h-11 border border-slate-300 px-3 rounded-lg font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Satuan Fisik Temuan */}
                <div className="space-y-space-xs">
                  <label className="font-label-sm text-label-sm text-slate-700 uppercase font-semibold">Satuan Fisik Temuan:</label>
                  <div className="grid grid-cols-2 gap-space-sm">
                    <button
                      type="button"
                      disabled={isSessionLocked}
                      onClick={() => setUnmappedUnit('PCS')}
                      className={`min-h-11 py-2 rounded-lg font-label-md text-label-md font-bold uppercase transition-all shadow-sm cursor-pointer ${
                        unmappedUnit === 'PCS' ? 'bg-blue-600 text-white' : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      PCS
                    </button>
                    <button
                      type="button"
                      disabled={isSessionLocked}
                      onClick={() => setUnmappedUnit('CARTON')}
                      className={`min-h-11 py-2 rounded-lg font-label-md text-label-md uppercase transition-all shadow-sm cursor-pointer ${
                        unmappedUnit === 'CARTON' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      CARTON
                    </button>
                  </div>
                </div>

                {/* Bukti Foto Barang dengan Native Camera Trigger */}
                <div className="space-y-space-sm bg-slate-50 border border-slate-200 p-space-sm rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-amber-800 font-bold uppercase">Bukti Foto Barang (Kamera HP)</span>
                    <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded border font-semibold ${unmappedPhotoUrl ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                      {unmappedPhotoUrl ? 'Foto Kamera Terlampir' : 'Belum Ada Foto'}
                    </span>
                  </div>
                  <div className="flex gap-space-sm items-center">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0 shadow-sm flex items-center justify-center">
                      {unmappedPhotoUrl ? (
                        <img src={unmappedPhotoUrl} alt="Foto Temuan" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[36px] text-slate-400">photo_camera</span>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-[10px] text-center py-0.5 text-white font-label-sm truncate">
                        {unmappedPhotoUrl ? 'CAM_CAPTURED.JPG' : 'No Image'}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSessionLocked}
                      onClick={triggerNativeCamera}
                      className="min-h-13 flex-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg p-space-sm flex flex-col items-center justify-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                      title="Buka Kamera Belakang HP"
                    >
                      <span className="material-symbols-outlined text-blue-600 text-[24px]">add_a_photo</span>
                      <span className="font-label-sm text-label-sm uppercase font-semibold text-slate-700">Ambil Foto Kamera HP</span>
                    </button>
                  </div>
                  <div className="space-y-space-xs">
                    <label className="font-label-sm text-label-sm text-slate-700 uppercase font-semibold" htmlFor="unmappedDescInput">Deskripsi / Catatan Fisik Barang:</label>
                    <textarea
                      id="unmappedDescInput"
                      rows={2}
                      disabled={isSessionLocked}
                      value={unmappedDesc}
                      onChange={(e) => setUnmappedDesc(e.target.value)}
                      placeholder="Tuliskan nama barang fisik, gramatur, atau catatan lokasi..."
                      className="w-full border border-slate-300 p-space-sm rounded-lg font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none shadow-sm disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSessionLocked}
                  onClick={handleAddUnmapped}
                  className="w-full min-h-11 py-2 px-space-md bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-label-md text-label-md font-bold uppercase rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px]">add_circle</span>
                  <span>Tambahkan ke Daftar Temuan</span>
                </button>
              </div>
            )}
          </div>

          {/* List of Found Items in this rack */}
          <div className="bg-white rounded-xl p-space-md shadow-sm border border-slate-200 space-y-space-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-600 text-[20px]">inventory_2</span>
                <h3 className="font-headline-sm text-headline-sm text-slate-900 font-bold">Daftar Temuan di Rak Ini</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-label-sm text-[11px] font-bold uppercase">
                {unmappedList.length} Item
              </span>
            </div>

            <div className="space-y-space-xs">
              {unmappedList.map((item) => (
                <div key={item.id} className="p-space-sm bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-space-sm min-w-0">
                    <div className="w-12 h-12 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0 overflow-hidden">
                      {item.photoUrl ? (
                        <img src={item.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[24px]">inventory</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-label-sm text-label-sm font-bold text-blue-700 truncate">{item.barcode}</span>
                        <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold font-mono">
                          {item.qty} {item.uom}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-slate-900 font-semibold truncate">{item.name}</p>
                      <p className="font-body-sm text-[11px] text-slate-500 font-medium flex items-center gap-2">
                        {item.expDate && <span>Exp: {item.expDate}</span>}
                        {item.batchNumber && <span>Batch: {item.batchNumber}</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSessionLocked}
                    onClick={() => handleDeleteUnmapped(item.id)}
                    className="min-h-11 min-w-11 flex items-center justify-center text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                    title="Hapus Temuan"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              ))}
              {unmappedList.length === 0 && (
                <p className="text-center font-body-sm text-body-sm text-slate-500 py-3">Belum ada item temuan unmapped di rak ini.</p>
              )}
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="pt-2 space-y-space-sm">
            <button
              type="button"
              disabled={isSessionLocked}
              onClick={() => setUnmappedDrawerOpen(true)}
              className="w-full min-h-13 px-space-md py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-headline-sm text-headline-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-sm font-bold border border-amber-300 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[24px]">loupe</span>
              <span>+ Temukan SKU Lain di Lokasi Ini</span>
            </button>

            <button
              type="button"
              disabled={isSessionLocked}
              onClick={handleSaveAndNext}
              className="w-full min-h-14 px-space-md py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-headline-md text-headline-md active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-md font-bold cursor-pointer disabled:opacity-50"
            >
              <span>Simpan Semua &amp; Lanjut Rak Berikutnya</span>
              <span className="material-symbols-outlined text-[24px]">arrow_forward</span>
            </button>

            <div className="flex items-center justify-center gap-2 text-slate-600 py-2">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
              <span className="font-label-sm text-label-sm font-medium">Progress Rak Z02: 12/24 SKU Telah Dihitung (50%)</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}