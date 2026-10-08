import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, doc, writeBatch, getDocs, limit } from 'firebase/firestore';
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
  selectedCategories: string[];
  isCounted: boolean;
  currentRound: number;
  docIds: string[];
  batchCount: number;
  allSystemEds: string[];
  isUnmappedFound?: boolean;
}

// HELPER SANITASI FORMAT TANGGAL DISPLAY (DD/MM/YYYY)
const formatDateDisplay = (dateStr: string) => {
  if (!dateStr || dateStr === '-') return '-';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
};

export default function Step4CountDetail({ sessionData, rack, onBackToList, onLogout, onSelectNextRack }: Step4CountDetailProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const barcodeScanInputRef = useRef<HTMLInputElement>(null);

  const [skuList, setSkuList] = useState<GroupedSKUItem[]>([]);
  const [matchedMasterSKU, setMatchedMasterSKU] = useState<any | null>(null);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState<boolean>(false);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [unmappedDrawerOpen, setUnmappedDrawerOpen] = useState<boolean>(true);
  const [isLoadingSave, setIsLoadingSave] = useState<boolean>(false);

  // MASTER KATEGORI BAD STOCK DARI OWNER
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false, title: '', message: '',
  });
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Proteksi tab close/refresh saat ada inputan belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // 1. LISTEN GEMBOK LOCK SESI GLOBAL & COUNTER
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

    // LISTEN KATEGORI BAD STOCK DARI CONFIG OWNER
    const unsubCat = onSnapshot(doc(db, "settings", "bad_stock_config"), (snap) => {
      if (snap.exists() && snap.data().categories) {
        setAvailableCategories(snap.data().categories);
      } else {
        setAvailableCategories(['Dus Penyok', 'Kemasan Bocor', 'Segel Rusak', 'Basah / Lembab', 'Barang Expired']);
      }
    });

    return () => { unsub(); unsubCat(); };
  }, [sessionData.sessionCode, sessionData.sessionId, sessionData.primaryCounter]);

  // 3. LISTEN MASTER TASKS LOKASI RAK AKTIF
  useEffect(() => {
    const primaryCounter = (sessionData.primaryCounter || "Unassigned").toLowerCase().trim();
    const targetLocation = rack.rackNumber || rack.id;

    const qTasks = query(
      collection(db, "master_tasks"),
      where("counter", "==", primaryCounter),
      where("Location", "==", targetLocation)
    );

    const unsubscribe = onSnapshot(qTasks, (snapshot) => {
      setSkuList((prevSkuList) => {
        const localStateMap: Record<string, { qtyGood: string; qtyBad: string; expDateActual: string; isBadStock: boolean; badRemarks: string; selectedCategories: string[] }> = {};
        prevSkuList.forEach(item => {
          localStateMap[item.sku] = {
            qtyGood: item.qtyGood,
            qtyBad: item.qtyBad,
            expDateActual: item.expDateActual,
            isBadStock: item.isBadStock,
            badRemarks: item.badRemarks,
            selectedCategories: item.selectedCategories || []
          };
        });

        const groupedMap: Record<string, GroupedSKUItem> = {};

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.isLocked) return;
          if (!data.SKU || data.SKU === 'SKU_UNKNOWN') return;

          const skuKey = data.SKU.toUpperCase().trim();
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
          const isUnmapped = sysQty === 0 || docSnap.id.includes('_TEMUAN_');

          const existingRemarks = data.badRemarks || '';
          const initialCats = existingRemarks.replace(/^\[BAD STOCK\]\s*/, '').split(', ').filter(Boolean);

          if (!groupedMap[skuKey]) {
            const existingLocal = localStateMap[skuKey];

            groupedMap[skuKey] = {
              sku: skuKey,
              upc: data.UPC1 || data.upc || 'N/A',
              upc2: data.UPC2 || '',
              name: data.Description || data.name || skuKey,
              category: `${data.Zone || 'RACKING'} • ${data.SKUBrand || 'General'}`,
              uom: (data.satuanHitung as 'PCS' | 'CARTON') || 'PCS',
              totalSystemQty: sysQty,
              qtyGood: existingLocal ? existingLocal.qtyGood : (!isNaN(numGoodQty) ? numGoodQty.toString() : (hasActQty ? numActQty.toString() : "")),
              qtyBad: existingLocal ? existingLocal.qtyBad : (!isNaN(numBadQty) && numBadQty > 0 ? numBadQty.toString() : ""),
              expDateSystem: edSys,
              expDateActual: existingLocal ? existingLocal.expDateActual : (data.expDateActual || data.expiredDateActual || ''),
              isBadStock: existingLocal ? existingLocal.isBadStock : ((!isNaN(numBadQty) && numBadQty > 0) || !!data.badRemarks),
              badRemarks: existingLocal ? existingLocal.badRemarks : existingRemarks,
              selectedCategories: existingLocal ? existingLocal.selectedCategories : initialCats,
              isCounted: !!data.isCounted || hasActQty,
              currentRound: taskRound,
              docIds: [docSnap.id],
              batchCount: 1,
              allSystemEds: edSys ? [edSys] : [],
              isUnmappedFound: isUnmapped
            };
          } else {
            groupedMap[skuKey].totalSystemQty += sysQty;
            groupedMap[skuKey].docIds.push(docSnap.id);
            groupedMap[skuKey].batchCount += 1;

            if (edSys && !groupedMap[skuKey].allSystemEds.includes(edSys)) {
              groupedMap[skuKey].allSystemEds.push(edSys);
              groupedMap[skuKey].allSystemEds.sort();
            }

            if (!localStateMap[skuKey] && hasActQty) {
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

        return Object.values(groupedMap).sort((a, b) => {
          if (a.isUnmappedFound && !b.isUnmappedFound) return 1;
          if (!a.isUnmappedFound && b.isUnmappedFound) return -1;
          return a.sku.localeCompare(b.sku);
        });
      });
    });

    return () => unsubscribe();
  }, [rack, sessionData]);

  // STATE FORM TEMUAN UNMAPPED (BATCH NO DIHAPUS)
  const [unmappedBarcode, setUnmappedBarcode] = useState<string>('');
  const [unmappedQty, setUnmappedQty] = useState<string>("1");
  const [unmappedUnit, setUnmappedUnit] = useState<'PCS' | 'CARTON'>('PCS');
  const [unmappedExpDate, setUnmappedExpDate] = useState<string>('2026-10-15');
  const [unmappedDesc, setUnmappedDesc] = useState<string>('');
  const [unmappedPhotoUrl, setUnmappedPhotoUrl] = useState<string>('');

  const [unmappedIsBadStock, setUnmappedIsBadStock] = useState<boolean>(false);
  const [unmappedBadQty, setUnmappedBadQty] = useState<string>("");
  const [unmappedSelectedCategories, setUnmappedSelectedCategories] = useState<string[]>([]);

  const [unmappedList, setUnmappedList] = useState<UnmappedItem[]>([]);

  // ON-DEMAND LOOKUP BARCODE MASTER (0ms untuk rak aktif, ~150ms untuk cloud lookup via limit 1)
  useEffect(() => {
    const cleanBarcode = unmappedBarcode.trim();
    if (!cleanBarcode) {
      setMatchedMasterSKU(null);
      setIsSearchingBarcode(false);
      return;
    }

    // 1. Cek instan di rak lokal saat ini (0 ms)
    const foundInCurrentRack = skuList.find(item =>
      (item.upc && item.upc.trim() === cleanBarcode) ||
      (item.upc2 && item.upc2.trim() === cleanBarcode) ||
      (item.sku && item.sku.toLowerCase().trim() === cleanBarcode.toLowerCase())
    );

    if (foundInCurrentRack) {
      setMatchedMasterSKU({
        SKU: foundInCurrentRack.sku,
        Owner: 'DDI',
        Description: foundInCurrentRack.name,
        UPC1: foundInCurrentRack.upc,
        UPC2: foundInCurrentRack.upc2 || '',
        SKUBrand: 'General',
        unitPrice: 0
      });
      setIsSearchingBarcode(false);
      return;
    }

    // 2. Query ke Firestore on-demand (limit 1) dengan debounce 300ms
    let isCancelled = false;
    setIsSearchingBarcode(true);

    const timer = setTimeout(async () => {
      try {
        const q1 = query(collection(db, "master_tasks"), where("UPC1", "==", cleanBarcode), limit(1));
        const snap1 = await getDocs(q1);
        if (!snap1.empty && !isCancelled) {
          setMatchedMasterSKU(snap1.docs[0].data());
          setIsSearchingBarcode(false);
          return;
        }

        const q2 = query(collection(db, "master_tasks"), where("UPC2", "==", cleanBarcode), limit(1));
        const snap2 = await getDocs(q2);
        if (!snap2.empty && !isCancelled) {
          setMatchedMasterSKU(snap2.docs[0].data());
          setIsSearchingBarcode(false);
          return;
        }

        const q3 = query(collection(db, "master_tasks"), where("SKU", "==", cleanBarcode.toUpperCase()), limit(1));
        const snap3 = await getDocs(q3);
        if (!snap3.empty && !isCancelled) {
          setMatchedMasterSKU(snap3.docs[0].data());
          setIsSearchingBarcode(false);
          return;
        }

        // 3. Query tambahan ke Master Katalog Referensi (sku_catalog)
        const qc1 = query(collection(db, "sku_catalog"), where("UPC1", "==", cleanBarcode), limit(1));
        const snapC1 = await getDocs(qc1);
        if (!snapC1.empty && !isCancelled) {
          setMatchedMasterSKU(snapC1.docs[0].data());
          setIsSearchingBarcode(false);
          return;
        }

        const qc2 = query(collection(db, "sku_catalog"), where("UPC2", "==", cleanBarcode), limit(1));
        const snapC2 = await getDocs(qc2);
        if (!snapC2.empty && !isCancelled) {
          setMatchedMasterSKU(snapC2.docs[0].data());
          setIsSearchingBarcode(false);
          return;
        }

        const qc3 = query(collection(db, "sku_catalog"), where("SKU", "==", cleanBarcode.toUpperCase()), limit(1));
        const snapC3 = await getDocs(qc3);
        if (!snapC3.empty && !isCancelled) {
          setMatchedMasterSKU(snapC3.docs[0].data());
          setIsSearchingBarcode(false);
          return;
        }

        if (!isCancelled) {
          setMatchedMasterSKU(null);
          setIsSearchingBarcode(false);
        }
      } catch (err) {
        console.warn("Barcode search error:", err);
        if (!isCancelled) {
          setMatchedMasterSKU(null);
          setIsSearchingBarcode(false);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [unmappedBarcode, skuList]);

  const isBarcodeInSystem = !!matchedMasterSKU;

  const handleSetSameExpAsSystem = (index: number) => {
    if (isSessionLocked) return;
    setIsDirty(true);
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index && item.expDateSystem ? { ...item, expDateActual: item.expDateSystem } : item))
    );
  };

  const adjustQty = (index: number, type: 'good' | 'bad', delta: number) => {
    if (isSessionLocked) return;
    setIsDirty(true);
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
    setIsDirty(true);
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, isBadStock: !item.isBadStock } : item))
    );
  };

  const toggleCategoryChip = (skuIdx: number, catName: string) => {
    if (isSessionLocked) return;
    setIsDirty(true);
    setSkuList(prev => prev.map((item, idx) => {
      if (idx === skuIdx) {
        const currentCats = item.selectedCategories || [];
        const exists = currentCats.includes(catName);
        const nextCats = exists ? currentCats.filter(c => c !== catName) : [...currentCats, catName];
        return {
          ...item,
          selectedCategories: nextCats,
          badRemarks: nextCats.length > 0 ? `[BAD STOCK] ${nextCats.join(', ')}` : ''
        };
      }
      return item;
    }));
  };

  const toggleUnmappedCategoryChip = (catName: string) => {
    if (isSessionLocked) return;
    setIsDirty(true);
    setUnmappedSelectedCategories(prev => {
      if (prev.includes(catName)) {
        return prev.filter(c => c !== catName);
      }
      return [...prev, catName];
    });
  };

  const handleInputText = (index: number, field: 'qtyGood' | 'qtyBad', rawVal: string) => {
    if (isSessionLocked) return;
    setIsDirty(true);

    let cleanVal = rawVal.replace(/^0+/, '');
    if (cleanVal === "" && rawVal !== "") cleanVal = "0";
    if (rawVal === "") cleanVal = "";

    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: cleanVal } : item))
    );
  };

  const handleInputBadQtyText = (rawVal: string) => {
    let cleanVal = rawVal.replace(/^0+/, '');
    if (cleanVal === "" && rawVal !== "") cleanVal = "0";
    if (rawVal === "") cleanVal = "";
    setIsDirty(true);
    setUnmappedBadQty(cleanVal);
  };

  const updateItemField = (index: number, field: keyof GroupedSKUItem, value: any) => {
    if (isSessionLocked) return;
    setIsDirty(true);
    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSafeBackToList = () => {
    if (isDirty) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Hasil Hitung Belum Disimpan!',
        message: `Kamu memiliki inputan di Rak ${rack.rackNumber} yang belum disimpan ke Cloud. Jika keluar sekarang, inputan kamu akan hilang. Yakin ingin keluar?`,
        showCancel: true,
        cancelText: 'Tetap di Rak Ini',
        confirmText: 'Keluar Tanpa Simpan',
        onConfirm: () => {
          setIsDirty(false);
          onBackToList();
        }
      });
      return;
    }
    onBackToList();
  };

  const handleSafeLogout = () => {
    if (isDirty) {
      setModal({
        isOpen: true,
        type: 'warning',
        title: 'Hasil Hitung Belum Disimpan!',
        message: `Kamu memiliki inputan di Rak ${rack.rackNumber} yang belum disimpan ke Cloud. Yakin ingin keluar dari akun?`,
        showCancel: true,
        cancelText: 'Batal / Tetap di Rak',
        confirmText: 'Keluar Akun',
        onConfirm: () => {
          setIsDirty(false);
          onLogout();
        }
      });
      return;
    }
    onLogout();
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

  const handleAddUnmapped = async () => {
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
    const badQtyNum = unmappedIsBadStock ? parseInt(unmappedBadQty || "0", 10) : 0;
    const cleanCounter = (sessionData.primaryCounter || 'Unassigned').toLowerCase().trim();

    const unmSku = matchedMasterSKU?.SKU ? matchedMasterSKU.SKU.toUpperCase().trim() : unmappedBarcode.trim();
    const unmOwner = matchedMasterSKU?.Owner || 'DDI';
    const unmPrice = parseInt(matchedMasterSKU?.unitPrice) || 0;
    const unmBrand = matchedMasterSKU?.SKUBrand || 'General';
    const unmDesc = unmappedDesc.trim() || (matchedMasterSKU ? (matchedMasterSKU.Description || matchedMasterSKU.SKU) : 'Barang Fisik Baru Unmapped');
    const totalSubmitted = qtyNumber + badQtyNum;

    const badCatRemarks = unmappedSelectedCategories.length > 0 ? `[BAD STOCK] ${unmappedSelectedCategories.join(', ')}` : '[BARANG TEMUAN FISIK]';

    const batch = writeBatch(db);

    // 1. Simpan inputan lokal SKU lain
    skuList.forEach(skuItem => {
      const finalGoodQty = parseInt(skuItem.qtyGood || "0", 10);
      const finalBadQty = parseInt(skuItem.qtyBad || "0", 10);
      const skuTotalSubmitted = finalGoodQty + finalBadQty;

      if (skuTotalSubmitted > 0 || skuItem.expDateActual) {
        skuItem.docIds.forEach((docId, i) => {
          const existingTaskRef = doc(db, "master_tasks", docId);
          batch.set(existingTaskRef, {
            counter: cleanCounter,
            isCounted: true,
            QTY_ACTUAL: i === 0 ? skuTotalSubmitted : 0,
            QTY_GOOD: i === 0 ? finalGoodQty : 0,
            QTY_BAD: i === 0 ? finalBadQty : 0,
            badRemarks: i === 0 ? (skuItem.badRemarks || '') : '',
            expDateActual: skuItem.expDateActual || '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
      }
    });

    // 2. Simpan dokumen temuan baru
    const taskId = `${rack.rackNumber}_${unmSku}_TEMUAN_${Date.now()}`;
    const taskRef = doc(db, "master_tasks", taskId);

    batch.set(taskRef, {
      Owner: unmOwner,
      SKU: unmSku,
      Description: unmDesc,
      UPC1: unmappedBarcode.trim(),
      UPC2: '',
      SKUBrand: unmBrand,
      Location: rack.rackNumber,
      counter: cleanCounter,
      currentRound: 1,
      Qty: 0,
      QTY_ACTUAL: totalSubmitted,
      QTY_GOOD: qtyNumber,
      QTY_BAD: badQtyNum,
      isCounted: true,
      unitPrice: unmPrice,
      badRemarks: badCatRemarks,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 3. Log Audit Trail (Auto-ID)
    const auditRef = doc(collection(db, "audit_logs"));
    batch.set(auditRef, {
      timestamp: new Date().toISOString(),
      rackLocation: rack.rackNumber,
      ownerSku: unmOwner,
      sku: unmSku,
      description: unmDesc,
      upc1: unmappedBarcode.trim(),
      upc2: '-',
      counterPic: cleanCounter,
      round: 1,
      qtyGood: qtyNumber,
      qtyBad: badQtyNum,
      totalFinalSubmitted: totalSubmitted,
      edActual: unmappedExpDate || '-',
      remarks: badCatRemarks
    }, { merge: true });

    await batch.commit();
    setIsDirty(false);

    setUnmappedBarcode('');
    setUnmappedDesc('');
    setUnmappedPhotoUrl('');
    setUnmappedQty("1");
    setUnmappedIsBadStock(false);
    setUnmappedBadQty("");
    setUnmappedSelectedCategories([]);
    setModal({ isOpen: true, type: 'success', title: 'Item Temuan Tersimpan!', message: `Item ${unmSku} & seluruh inputan SKU lain pada Rak ${rack.rackNumber} tersimpan aman!` });
  };

  const handleDeleteUnmapped = (id: string) => {
    if (isSessionLocked) return;
    setUnmappedList((prev) => prev.filter((item) => item.id !== id));
  };

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

        const remarksText = skuItem.selectedCategories && skuItem.selectedCategories.length > 0
          ? `[BAD STOCK] ${skuItem.selectedCategories.join(', ')}`
          : (skuItem.badRemarks || '-');

        skuItem.docIds.forEach((docId, i) => {
          const taskRef = doc(db, "master_tasks", docId);
          batch.set(taskRef, {
            counter: cleanCounter,
            isCounted: true,
            QTY_ACTUAL: i === 0 ? totalSubmitted : 0,
            QTY_GOOD: i === 0 ? finalGoodQty : 0,
            QTY_BAD: i === 0 ? finalBadQty : 0,
            badRemarks: i === 0 ? remarksText : '',
            expDateActual: skuItem.expDateActual || '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

        const auditRef = doc(collection(db, "audit_logs"));

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
          remarks: remarksText
        }, { merge: true });
      });

      await batch.commit();
      setIsDirty(false);

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

      {/* HEADER HP COUNTER (RELATIVE - TIDAK IKUT TURUN SAAT SCROLLING) */}
      <header className="relative w-full z-10 bg-white border-b border-slate-200/90 pt-safe shadow-xs shrink-0">
        <div className="py-3 px-margin flex flex-col justify-center gap-space-xs max-w-md mx-auto">
          <div className="flex items-center justify-between">
            <button type="button" onClick={handleSafeBackToList} className="min-h-11 min-w-11 -ml-2 px-2 flex items-center gap-1 text-slate-800 hover:text-cyan-600 transition-colors cursor-pointer font-bold">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              <span className="font-label-md uppercase tracking-wider font-bold text-xs">Countsheet List</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-900 font-mono text-[11px] uppercase font-bold border border-cyan-300">
                Round {currentDisplayRound}
              </span>
              <button
                type="button"
                onClick={handleSafeLogout}
                className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Keluar</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-space-sm pt-0.5">
            <h1 className="font-headline-md text-slate-900 tracking-tight font-extrabold truncate text-base">{sessionData.sessionName}</h1>
          </div>

          <div className="flex items-center justify-between gap-space-sm pt-0.5">
            <div className="flex items-center gap-1.5 text-slate-600 font-label-sm text-xs truncate">
              <span className="material-symbols-outlined text-[16px] text-cyan-600 shrink-0">group</span>
              <span className="truncate">Counter Active: <b className="text-slate-900 font-mono">{sessionData.primaryCounter}</b></span>
            </div>
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA DENGAN KARTU SKU & DRAWER UNMAPPED */}
      <main className="flex-1 flex flex-col relative w-full px-margin pt-4 pb-32 bg-slate-100 min-h-screen max-w-md mx-auto">
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

          {/* RENDER KARTU SKU MASTER WMS & TEMUAN */}
          {skuList.map((currentSku, idx) => (
            <div key={currentSku.sku} className={`bg-white rounded-xl p-space-md shadow-xs border space-y-space-md relative overflow-hidden ${currentSku.isUnmappedFound ? 'border-amber-300' : 'border-slate-200'}`}>
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${currentSku.isUnmappedFound ? 'bg-amber-500' : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]'}`}></div>

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className={`font-label-lg tracking-wider font-bold ${currentSku.isUnmappedFound ? 'text-amber-800' : 'text-cyan-800'}`}>
                    {currentSku.isUnmappedFound ? `[TEMUAN] SKU: ${currentSku.sku}` : `SKU: ${currentSku.sku}`}
                  </span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-label-sm">{currentSku.uom}</span>
                </div>
                <p className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md w-fit">
                  UPC1: {currentSku.upc || 'N/A'} {currentSku.upc2 ? `• UPC2: ${currentSku.upc2}` : ''}
                </p>
                <h3 className="font-headline-sm text-slate-900 font-bold leading-snug">{currentSku.name}</h3>
                <p className="font-body-sm text-slate-500">{currentSku.category}</p>
              </div>

              {/* EXPIRED DATE FEFO DENGAN FORMAT DD/MM/YYYY */}
              <div className="bg-cyan-50/60 border border-cyan-200 p-space-sm rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-label-sm text-cyan-950 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-cyan-700">event</span> Expired Date System (FEFO)
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
                    <input type="text" readOnly value={formatDateDisplay(currentSku.expDateSystem)} className="w-full p-2 bg-white/80 border border-slate-200 rounded-lg text-slate-600 font-mono text-xs font-bold outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-cyan-800 font-bold block uppercase mb-0.5">ED Actual (Fisik)</label>
                    <input
                      type="date"
                      disabled={isSessionLocked}
                      value={currentSku.expDateActual || ''}
                      onChange={(e) => updateItemField(idx, 'expDateActual', e.target.value)}
                      className={`w-full p-1.5 border-2 rounded-lg text-slate-900 font-mono text-xs font-bold outline-none shadow-xs ${isSessionLocked ? 'bg-slate-100 border-slate-300 opacity-60' : 'bg-white border-cyan-400'}`}
                    />
                  </div>
                </div>

                {currentSku.allSystemEds.length > 0 && (
                  <div className="pt-2 border-t border-cyan-200/60 space-y-1">
                    <span className="text-[10px] font-bold text-slate-600 block">
                      Variasi ED System di Rak Ini ({currentSku.batchCount} Batch):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentSku.allSystemEds.map((edDate, edIdx) => (
                        <span key={edIdx} className="px-2 py-0.5 bg-white border border-cyan-300 text-cyan-900 font-mono text-[10px] font-bold rounded-md shadow-xs flex items-center gap-1">
                          <span>📅</span>
                          <span>{formatDateDisplay(edDate)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* INPUT KONDISI BAIK (QTY GOOD) */}
              <div className="bg-slate-50 border border-slate-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-cyan-400"></span><span className="font-headline-sm text-slate-900 font-bold">Kondisi Baik (Qty Good)</span></div>
                  <span className="font-label-sm text-slate-500 font-semibold">{currentSku.uom}</span>
                </div>
                <div className="flex items-center gap-space-sm">
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 'good', -1)} className={`w-14 h-14 bg-white border border-slate-300 text-slate-800 rounded-xl flex items-center justify-center text-xl shrink-0 cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}><span className="material-symbols-outlined">remove</span></button>
                  <div className="flex-1 h-14 border-2 border-cyan-400 rounded-xl flex items-center justify-center bg-white">
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
                  <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 'good', 1)} className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl shrink-0 cursor-pointer transition-all ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-md active:scale-95'}`}><span className="material-symbols-outlined">add</span></button>
                </div>
              </div>

              {/* BAD STOCK DETECTED DENGAN TOMBOL CHIP KATEOGORI */}
              <div className="bg-amber-50/70 border border-amber-200 p-space-md rounded-xl space-y-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-body-lg text-amber-900 font-bold">Bad Stock Detected?</span>
                  <button type="button" disabled={isSessionLocked} onClick={() => toggleBadStock(idx)} className={`min-h-11 min-w-11 px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${currentSku.isBadStock ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>{currentSku.isBadStock ? 'ON' : 'OFF'}</button>
                </div>
                {currentSku.isBadStock && (
                  <div className="pt-2 space-y-3 border-t border-amber-200">
                    <div>
                      <label className="text-xs font-bold text-amber-900 block mb-1">Jumlah Rusak (Qty Bad):</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={isSessionLocked}
                        value={currentSku.qtyBad}
                        onChange={(e) => handleInputText(idx, 'qtyBad', e.target.value)}
                        placeholder="0"
                        className={`w-full p-2 border border-amber-300 rounded-lg text-center font-bold text-lg ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-amber-900 block mb-1.5">Pilih Kategori Kerusakan (Bisa lebih dari 1):</label>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCategories.map((cat, cIdx) => {
                          const isSelected = (currentSku.selectedCategories || []).includes(cat);
                          return (
                            <button
                              key={cIdx}
                              type="button"
                              disabled={isSessionLocked}
                              onClick={() => toggleCategoryChip(idx, cat)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${isSelected ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'}`}
                            >
                              {isSelected ? '✓ ' : ''}{cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ))}

          {/* FORM ITEM TAK TERDAFTAR / TEMUAN LAIN (BATCH NO DIHAPUS) */}
          <div className="bg-white rounded-xl p-space-md shadow-xs border border-slate-200 space-y-space-md">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setUnmappedDrawerOpen(!unmappedDrawerOpen)}>
              <h3 className="font-headline-sm text-slate-900 font-bold">Item Tak Terdaftar / Temuan Lain</h3>
              <span className="material-symbols-outlined">{unmappedDrawerOpen ? 'expand_less' : 'expand_more'}</span>
            </div>
            {unmappedDrawerOpen && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input type="text" disabled={isSessionLocked} value={unmappedBarcode} onChange={(e) => setUnmappedBarcode(e.target.value)} placeholder="Scan/Ketik Barcode/UPC..." className={`flex-1 h-11 border border-slate-300 px-3 rounded-lg text-sm font-mono font-bold ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`} />
                  <button type="button" disabled={isSessionLocked} onClick={triggerNativeBarcodeScan} className={`px-3 min-h-11 rounded-lg flex items-center gap-1 text-xs cursor-pointer transition-all ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold shadow-xs active:scale-95'}`}>
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span> Scan
                  </button>
                </div>

                {unmappedBarcode.trim() !== '' && (
                  <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between ${
                    isSearchingBarcode
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : isBarcodeInSystem
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}>
                    <span>
                      {isSearchingBarcode
                        ? '⏳ Mengecek barcode di master database...'
                        : isBarcodeInSystem
                          ? `✓ Cocok dgn Master (${matchedMasterSKU?.Owner || 'DDI'} - ${matchedMasterSKU?.SKU} - Brand: ${matchedMasterSKU?.SKUBrand || 'General'})`
                          : '⚠ TIDAK ADA di Master (Wajib Foto!)'}
                    </span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block">Exp Date:</label>
                  <input type="date" disabled={isSessionLocked} value={unmappedExpDate} onChange={(e) => setUnmappedExpDate(e.target.value)} className={`w-full h-10 border border-slate-300 px-3 rounded-lg text-xs font-mono font-bold ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Qty Good (Kondisi Baik):</label>
                    <input type="text" inputMode="numeric" disabled={isSessionLocked} value={unmappedQty} onChange={(e) => setUnmappedQty(e.target.value)} placeholder="0" className={`w-full h-10 border border-slate-300 px-2 rounded-lg text-xs font-bold text-center ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Satuan (UOM):</label>
                    <div className="flex gap-1 h-10">
                      <button type="button" disabled={isSessionLocked} onClick={() => setUnmappedUnit('PCS')} className={`flex-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${unmappedUnit === 'PCS' ? 'bg-cyan-400 text-slate-950 font-black shadow-xs' : 'bg-slate-100 text-slate-700'}`}>PCS</button>
                      <button type="button" disabled={isSessionLocked} onClick={() => setUnmappedUnit('CARTON')} className={`flex-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${unmappedUnit === 'CARTON' ? 'bg-cyan-400 text-slate-950 font-black shadow-xs' : 'bg-slate-100 text-slate-700'}`}>CARTON</button>
                    </div>
                  </div>
                </div>

                {/* FORM BAD STOCK UNMAPPED DENGAN CHIPS */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900">Temuan Ini Memiliki Bad Stock?</span>
                    <button
                      type="button"
                      disabled={isSessionLocked}
                      onClick={() => setUnmappedIsBadStock(!unmappedIsBadStock)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer ${unmappedIsBadStock ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {unmappedIsBadStock ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {unmappedIsBadStock && (
                    <div className="space-y-3 pt-2 border-t border-amber-200">
                      <div>
                        <label className="text-[10px] font-bold text-amber-900 block mb-0.5">Qty Bad (Jumlah Rusak):</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          disabled={isSessionLocked}
                          value={unmappedBadQty}
                          onChange={(e) => handleInputBadQtyText(e.target.value)}
                          placeholder="0"
                          className="w-full h-9 border border-amber-300 rounded-lg text-xs font-bold text-center bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-900 block mb-1">Pilih Kategori Kerusakan (Bisa lebih dari 1):</label>                        <div className="flex flex-wrap gap-1.5">
                          {availableCategories.map((cat, cIdx) => {
                            const isSelected = unmappedSelectedCategories.includes(cat);
                            return (
                              <button
                                key={cIdx}
                                type="button"
                                disabled={isSessionLocked}
                                onClick={() => toggleUnmappedCategoryChip(cat)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${isSelected ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'}`}
                              >
                                {isSelected ? '✓ ' : ''}{cat}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button type="button" disabled={isSessionLocked} onClick={triggerNativeCamera} className={`w-full h-11 border rounded-lg font-bold text-xs flex items-center justify-center gap-1 cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${!isBarcodeInSystem && !unmappedPhotoUrl ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                  <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                  <span>{unmappedPhotoUrl ? 'Foto Terlampir ✓' : (!isBarcodeInSystem ? 'Ambil Foto Kamera (Wajib)' : 'Ambil Foto Kamera (Opsional)')}</span>
                </button>

                <button type="button" disabled={isSessionLocked} onClick={handleAddUnmapped} className={`w-full min-h-11 rounded-lg cursor-pointer transition-all ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed text-white font-bold' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-md active:scale-[0.99]'}`}>+ Tambahkan Ke Temuan &amp; Simpan</button>
              </div>
            )}
          </div>

          {/* RENDER LIST TEMUAN UNMAPPED */}
          {unmappedList.length > 0 && (
            <div className="bg-white rounded-xl p-space-md shadow-xs border border-slate-200 space-y-2">
              <h4 className="font-bold text-sm text-slate-800 border-b pb-2">Daftar Temuan di Rak Ini ({unmappedList.length})</h4>
              {unmappedList.map((item) => (
                <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-cyan-800">{item.barcode} ({item.qty} {item.uom})</div>
                    <div className="text-slate-600 font-medium">{item.name}</div>
                  </div>
                  <button
                    type="button"
                    disabled={isSessionLocked}
                    onClick={() => handleDeleteUnmapped(item.id)}
                    className={`p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Hapus Temuan"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={isLoadingSave || isSessionLocked}
            onClick={handleSaveAndNext}
            className={`w-full min-h-14 rounded-xl font-black text-lg shadow-[0_0_15px_rgba(34,211,238,0.35)] cursor-pointer transition-all active:scale-[0.99] ${isSessionLocked || isLoadingSave ? 'bg-slate-400 opacity-50 cursor-not-allowed text-white shadow-none' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'}`}
          >
            {isLoadingSave
              ? "Menyimpan ke Cloud..."
              : isSessionLocked
                ? "🔒 Sesi Terkunci oleh Admin"
                : "Simpan Semua & Lanjut Rak Berikutnya"}
          </button>

        </div>
      </main>

      <footer className="text-center py-4 bg-slate-50 text-slate-400 text-[10px] font-medium border-t border-slate-200">
        Noctus Count™ • Developed by <span className="font-bold text-indigo-600">Noctus</span>
      </footer>
    </div>
  );
}