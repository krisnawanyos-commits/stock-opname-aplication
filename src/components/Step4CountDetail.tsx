import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, where, doc, writeBatch, getDocs, limit } from 'firebase/firestore';
import type { SessionData, RackItem, CustomModalState, UnmappedItem } from '../types';
import CustomModal from './CustomModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import NetworkStatusBadge from './NetworkStatusBadge';
import { useLanguage, LanguageToggle } from '../utils/i18n';
import { compressImage } from '../utils/imageCompressor';
import { playScanSuccessBeep, playErrorBuzzer, triggerHapticFeedback } from '../utils/soundAndHaptics';
import { 
  ChevronLeft, LogOut, Users, MapPin, Calendar, Minus, Plus, ChevronDown, 
  ChevronUp, Camera, Scan, PlusCircle, Trash2, Loader2, CheckCircle2, Lock,
  Edit2, Calculator, Zap, Sparkles 
} from 'lucide-react';

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
  uom: 'PCS' | 'CARTON' | string;
  pcsPerCarton: number;
  inputUom: 'PCS' | 'CARTON' | string;
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

// HELPER KONVERSI DARI INPUT COUNTER KE SATUAN SISTEM
export const convertToSystemQty = (
  inputQty: number,
  inputUom: string,
  systemUom: string,
  pcsPerCarton: number
): { finalQty: number; displayFormula?: string } => {
  if (inputQty <= 0 || isNaN(inputQty)) return { finalQty: 0 };
  const ratio = pcsPerCarton > 0 ? pcsPerCarton : 1;
  const inU = (inputUom || 'PCS').toUpperCase();
  const sysU = (systemUom || 'PCS').toUpperCase();

  if (inU === sysU) {
    return { finalQty: inputQty };
  }

  // Jika sistem KARTON, counter input PCS (eceran)
  if (sysU === 'CARTON' && inU === 'PCS') {
    const rawVal = inputQty / ratio;
    const rounded = Math.round(rawVal * 100) / 100;
    const intact = Math.floor(inputQty / ratio);
    const leftover = Math.round((inputQty % ratio) * 100) / 100;
    const formula = leftover > 0 ? `${intact} Ctn + ${leftover} Pcs` : `${intact} Ctn`;
    return { finalQty: rounded, displayFormula: formula };
  }

  // Jika sistem PCS, counter input KARTON
  if (sysU === 'PCS' && inU === 'CARTON') {
    const rawVal = inputQty * ratio;
    const rounded = Math.round(rawVal * 100) / 100;
    return { finalQty: rounded, displayFormula: `${inputQty} Ctn × ${ratio} Pcs` };
  }

  return { finalQty: inputQty };
};

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
  const { t, lang, translateDamageCat } = useLanguage();
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [skuList, setSkuList] = useState<GroupedSKUItem[]>([]);
  const [matchedMasterSKU, setMatchedMasterSKU] = useState<any | null>(null);
  const [isSearchingBarcode, setIsSearchingBarcode] = useState<boolean>(false);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [unmappedDrawerOpen, setUnmappedDrawerOpen] = useState<boolean>(false);
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isLoadingSave, setIsLoadingSave] = useState<boolean>(false);
  const [showCompletedSection, setShowCompletedSection] = useState<boolean>(false);
  const [hasRemainingRacks, setHasRemainingRacks] = useState<boolean>(true);

  // MASTER KATEGORI BAD STOCK DARI OWNER
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const [modal, setModal] = useState<CustomModalState>({
    isOpen: false, title: '', message: '',
  });

  // MODAL EDIT KONVERSI ISI PER KARTON
  const [conversionModal, setConversionModal] = useState<{
    isOpen: boolean;
    skuIndex: number | null;
    sku: string;
    skuName: string;
    systemUom: string;
    tempValue: string;
  }>({
    isOpen: false,
    skuIndex: null,
    sku: '',
    skuName: '',
    systemUom: 'CARTON',
    tempValue: '24'
  });

  // STATE KALKULATOR CAMPURAN (KARTON + PCS) PER SKU
  const [mixedCalc, setMixedCalc] = useState<{
    [sku: string]: { cartons: string; loosePcs: string; targetField: 'good' | 'bad'; isOpen: boolean };
  }>({});

  const [isDirty, setIsDirty] = useState<boolean>(false);

  const draftKey = `so_draft_${sessionData.sessionId || 'default'}_${rack.rackNumber || rack.id}`;
  const [hasDraftRestored, setHasDraftRestored] = useState<boolean>(false);

  const isDirtyRef = useRef<boolean>(isDirty);
  const modalOpenRef = useRef<boolean>(modal.isOpen);
  const isHandledBackRef = useRef<boolean>(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    modalOpenRef.current = modal.isOpen;
  }, [modal.isOpen]);

  // Helper navigasi mundur aman yang menyelaraskan browser history
  const triggerSafeBack = () => {
    if (window.history.state?.inRackDetail) {
      isHandledBackRef.current = true;
      window.history.back();
      setTimeout(() => {
        if (isHandledBackRef.current) {
          isHandledBackRef.current = false;
          onBackToList();
        }
      }, 200);
    } else {
      onBackToList();
    }
  };

  // INTERSEPSI TOMBOL BACK FISIK HP & GESTURE SWIPE BACK
  useEffect(() => {
    // Daftarkan entry history untuk halaman detail rak ini jika belum ada
    if (!window.history.state?.inRackDetail) {
      window.history.pushState({ inRackDetail: true, rackNumber: rack.rackNumber }, '');
    } else {
      window.history.replaceState({ inRackDetail: true, rackNumber: rack.rackNumber }, '');
    }

    const handlePopState = () => {
      // Jika navigasi mundur dipicu secara terprogram (misal tombol in-app / modal confirm)
      if (isHandledBackRef.current) {
        isHandledBackRef.current = false;
        onBackToList();
        return;
      }

      // Jika modal sedang terbuka dan user memencet Back HP lagi: cukup tutup modalnya
      if (modalOpenRef.current) {
        window.history.pushState({ inRackDetail: true, rackNumber: rack.rackNumber }, '');
        setModal(prev => ({ ...prev, isOpen: false }));
        return;
      }

      // Jika ada perubahan/hitungan yang belum tersimpan
      if (isDirtyRef.current) {
        // Karena browser baru saja pop 1 langkah, push kembali state agar tidak langsung keluar jika batal
        window.history.pushState({ inRackDetail: true, rackNumber: rack.rackNumber }, '');

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
            isDirtyRef.current = false;
            try {
              localStorage.removeItem(draftKey);
            } catch (e) {
              console.debug('Failed to clear draft', e);
            }
            setHasDraftRestored(false);
            triggerSafeBack();
          },
          onCancel: () => {
            // User membatalkan keluar, tetap berada di rak saat ini
          }
        });
      } else {
        // Data aman / belum ada inputan kotor, langsung kembali ke Countsheet List
        onBackToList();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [rack.rackNumber, onBackToList]);

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

  // AUTO-SAVE DRAFT KE LOCALSTORAGE HP SAAT COUNTER MENGETIK HITUNGAN
  useEffect(() => {
    if (!isDirty || skuList.length === 0) return;

    const draftData: Record<string, { qtyGood: string; qtyBad: string; expDateActual: string; isBadStock: boolean; badRemarks: string; selectedCategories: string[]; inputUom?: string; pcsPerCarton?: number }> = {};
    let hasCount = false;

    skuList.forEach((item) => {
      if (item.qtyGood !== '' || item.qtyBad !== '' || item.expDateActual !== '' || item.badRemarks !== '' || item.inputUom || item.pcsPerCarton) {
        hasCount = true;
        draftData[item.sku] = {
          qtyGood: item.qtyGood,
          qtyBad: item.qtyBad,
          expDateActual: item.expDateActual,
          isBadStock: item.isBadStock,
          badRemarks: item.badRemarks,
          selectedCategories: item.selectedCategories || [],
          inputUom: item.inputUom || item.uom,
          pcsPerCarton: item.pcsPerCarton || 1
        };
      }
    });

    if (hasCount) {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          timestamp: Date.now(),
          items: draftData
        }));
      } catch (err) {
        console.warn('Gagal menyimpan draft lokal ke localStorage:', err);
      }
    }
  }, [skuList, isDirty, draftKey]);

  // PROTEKSI ANTI DATA LOSS: Peringatan jika counter mencoba menutup tab / reload saat data belum disubmit
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

  // 2. MONITOR APAKAH MASIH ADA RAK LAIN DI PROJECT AKTIF YANG BELUM SELESAI
  useEffect(() => {
    const cleanCounter = (sessionData.primaryCounter || "Unassigned").toLowerCase().trim();
    const targetLocation = rack.rackNumber || rack.id;

    const qTasks = query(
      collection(db, "master_tasks"),
      where("counter", "==", cleanCounter)
    );

    const unsubRemaining = onSnapshot(qTasks, (snapshot) => {
      let otherPendingRacksExist = false;

      for (const d of snapshot.docs) {
        const data = d.data();
        if (sessionData.projectId && data.projectId && data.projectId !== sessionData.projectId) continue;
        if (sessionData.projectId && !data.projectId) continue;
        if (data.isLocked) continue;
        if (!data.SKU || data.SKU === 'SKU_UNKNOWN') continue;
        if (data.Location && data.Location === targetLocation) continue;

        const isCounted = !!data.isCounted || (data.QTY_ACTUAL !== null && data.QTY_ACTUAL !== undefined);
        if (!isCounted) {
          otherPendingRacksExist = true;
          break;
        }
      }
      setHasRemainingRacks(otherPendingRacksExist);
    });

    return () => unsubRemaining();
  }, [sessionData.primaryCounter, sessionData.projectId, rack.rackNumber, rack.id]);

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
        // Cek apakah ada draft lokal yang tersimpan saat pertama kali halaman dimuat / ter-refresh
        let draftMap: Record<string, any> = {};
        if (prevSkuList.length === 0) {
          try {
            const rawDraft = localStorage.getItem(draftKey);
            if (rawDraft) {
              const parsed = JSON.parse(rawDraft);
              if (parsed?.items && Object.keys(parsed.items).length > 0) {
                draftMap = parsed.items;
                setHasDraftRestored(true);
                setIsDirty(true);
              }
            }
          } catch (err) {
            console.warn('Gagal membaca draft lokal:', err);
          }
        }

        const localStateMap: Record<string, { qtyGood: string; qtyBad: string; expDateActual: string; isBadStock: boolean; badRemarks: string; selectedCategories: string[]; inputUom?: string; pcsPerCarton?: number }> = {};
        prevSkuList.forEach(item => {
          localStateMap[item.sku] = {
            qtyGood: item.qtyGood,
            qtyBad: item.qtyBad,
            expDateActual: item.expDateActual,
            isBadStock: item.isBadStock,
            badRemarks: item.badRemarks,
            selectedCategories: item.selectedCategories || [],
            inputUom: item.inputUom || item.uom,
            pcsPerCarton: item.pcsPerCarton || 1
          };
        });

        const groupedMap: Record<string, GroupedSKUItem> = {};

        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (data.isLocked) return;
          if (sessionData.projectId && data.projectId && data.projectId !== sessionData.projectId) return;
          if (sessionData.projectId && !data.projectId) return;
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

          const rawSatuan = (data.satuanHitung || 'PCS').toString().toUpperCase().trim();
          const sysUom = rawSatuan === 'CARTON' || rawSatuan === 'KARTON' || rawSatuan === 'CTN' ? 'CARTON' : 'PCS';
          const defaultPcsRatio = parseInt(data.pcsPerCarton || data.qtyPerCarton || '0', 10) || (sysUom === 'CARTON' ? 24 : 1);

          if (!groupedMap[skuKey]) {
            const existingLocal = localStateMap[skuKey] || draftMap[skuKey];
            const itemPcsRatio = existingLocal?.pcsPerCarton || defaultPcsRatio;
            const itemInputUom = existingLocal?.inputUom || sysUom;

            groupedMap[skuKey] = {
              sku: skuKey,
              upc: (data.UPC1 || data.upc || '').toString().trim(),
              upc2: (data.UPC2 || data.upc2 || '').toString().trim(),
              name: data.Description || data.name || skuKey,
              category: `${data.Zone || 'RACKING'} • ${data.SKUBrand || 'General'}`,
              uom: sysUom,
              pcsPerCarton: itemPcsRatio,
              inputUom: itemInputUom,
              totalSystemQty: sysQty,
              qtyGood: existingLocal ? existingLocal.qtyGood : (!isNaN(numGoodQty) ? numGoodQty.toString() : (hasActQty ? numActQty.toString() : "")),
              qtyBad: existingLocal ? existingLocal.qtyBad : (!isNaN(numBadQty) && numBadQty > 0 ? numBadQty.toString() : ""),
              expDateSystem: edSys,
              expDateActual: existingLocal ? existingLocal.expDateActual : (data.expDateActual || data.expiredDateActual || edSys || ''),
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

            if (!groupedMap[skuKey].upc2 && (data.UPC2 || data.upc2)) {
              groupedMap[skuKey].upc2 = (data.UPC2 || data.upc2).toString().trim();
            }
            if ((!groupedMap[skuKey].upc || groupedMap[skuKey].upc === 'N/A') && (data.UPC1 || data.upc)) {
              groupedMap[skuKey].upc = (data.UPC1 || data.upc).toString().trim();
            }

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
            const current = parseFloat(item.qtyGood || "0");
            const nextVal = Math.max(0, Math.round((current + delta) * 1000) / 1000);
            return { ...item, qtyGood: nextVal === 0 ? "" : nextVal.toString() };
          }
          if (type === 'bad') {
            const current = parseFloat(item.qtyBad || "0");
            const nextVal = Math.max(0, Math.round((current + delta) * 1000) / 1000);
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

    let cleanVal = rawVal.replace(/[^0-9.]/g, '');
    const parts = cleanVal.split('.');
    if (parts.length > 2) {
      cleanVal = parts[0] + '.' + parts.slice(1).join('');
    }
    if (cleanVal.length > 1 && cleanVal.startsWith('0') && !cleanVal.startsWith('0.')) {
      cleanVal = cleanVal.replace(/^0+/, '') || '0';
    }

    setSkuList((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: cleanVal } : item))
    );
  };

  // UOM SWITCHING: Ganti mode input KARTON <-> PCS dengan live auto-convert nilai input
  const handleSwitchInputUom = (index: number, newUom: 'PCS' | 'CARTON') => {
    if (isSessionLocked) return;
    const targetItem = skuList[index];
    if (targetItem && newUom === 'CARTON' && (!targetItem.pcsPerCarton || targetItem.pcsPerCarton <= 1)) {
      openConversionModal(index);
    }
    setIsDirty(true);
    setSkuList(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const oldUom = item.inputUom || item.uom;
      if (oldUom === newUom) return item;

      const pcsRatio = item.pcsPerCarton || (item.uom === 'CARTON' ? 24 : 1);

      const convertValue = (valStr: string) => {
        if (!valStr || valStr === '0') return valStr;
        const num = parseFloat(valStr);
        if (isNaN(num)) return valStr;
        if (newUom === 'PCS' && oldUom === 'CARTON') {
          // Karton -> PCS
          const res = Math.round(num * pcsRatio * 100) / 100;
          return res.toString();
        } else if (newUom === 'CARTON' && oldUom === 'PCS') {
          // PCS -> Karton
          const res = Math.round((num / pcsRatio) * 1000) / 1000;
          return res.toString();
        }
        return valStr;
      };

      return {
        ...item,
        inputUom: newUom,
        qtyGood: convertValue(item.qtyGood),
        qtyBad: convertValue(item.qtyBad)
      };
    }));
  };

  // PENGATURAN CONVERSION RATIO (Isi per Karton)
  const openConversionModal = (index: number) => {
    if (isSessionLocked) return;
    const item = skuList[index];
    if (!item) return;
    setConversionModal({
      isOpen: true,
      skuIndex: index,
      sku: item.sku,
      skuName: item.name,
      systemUom: item.uom,
      tempValue: (item.pcsPerCarton || (item.uom === 'CARTON' ? 24 : 1)).toString()
    });
  };

  const handleSaveConversionRatio = async () => {
    if (conversionModal.skuIndex === null) return;
    const newRatio = parseInt(conversionModal.tempValue, 10);
    if (isNaN(newRatio) || newRatio <= 0) {
      setModal({ isOpen: true, type: 'warning', title: 'Nilai Tidak Valid', message: 'Isi per karton harus berupa angka lebih dari 0.' });
      return;
    }

    const targetIndex = conversionModal.skuIndex;
    const targetSku = skuList[targetIndex];
    if (!targetSku) return;

    setIsDirty(true);
    setSkuList(prev => prev.map((item, idx) => (idx === targetIndex ? { ...item, pcsPerCarton: newRatio } : item)));

    // Simpan ke Firestore master_tasks agar tersinkron ke semua perangkat & reload
    try {
      const batch = writeBatch(db);
      targetSku.docIds.forEach(docId => {
        const tRef = doc(db, "master_tasks", docId);
        batch.set(tRef, {
          pcsPerCarton: newRatio,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
    } catch (e) {
      console.warn("Gagal menyimpan pcsPerCarton ke Firestore:", e);
    }

    setConversionModal(prev => ({ ...prev, isOpen: false }));
    triggerHapticFeedback('success');
  };

  // KALKULATOR CAMPURAN (Dus Utuh + Eceran PCS)
  const toggleMixedCalc = (sku: string) => {
    setMixedCalc(prev => ({
      ...prev,
      [sku]: prev[sku] ? { ...prev[sku], isOpen: !prev[sku].isOpen } : { isOpen: true, cartons: '', loosePcs: '', targetField: 'good' }
    }));
  };

  const updateMixedCalcValue = (sku: string, field: 'cartons' | 'loosePcs' | 'targetField', value: any) => {
    setMixedCalc(prev => ({
      ...prev,
      [sku]: {
        ...(prev[sku] || { isOpen: true, cartons: '', loosePcs: '', targetField: 'good' }),
        [field]: value
      }
    }));
  };

  const applyMixedCalc = (index: number) => {
    const item = skuList[index];
    if (!item) return;
    const calcData = mixedCalc[item.sku] || { cartons: '0', loosePcs: '0', targetField: 'good' };
    const numCartons = parseFloat(calcData.cartons || '0') || 0;
    const numLoosePcs = parseFloat(calcData.loosePcs || '0') || 0;
    const ratio = item.pcsPerCarton || (item.uom === 'CARTON' ? 24 : 1);

    const totalPcs = (numCartons * ratio) + numLoosePcs;
    const activeInputUom = item.inputUom || item.uom;
    let finalValStr = '';
    if (activeInputUom === 'PCS') {
      finalValStr = totalPcs.toString();
    } else {
      const valCtn = Math.round((totalPcs / ratio) * 1000) / 1000;
      finalValStr = valCtn.toString();
    }

    const fieldToUpdate = calcData.targetField === 'bad' ? 'qtyBad' : 'qtyGood';
    handleInputText(index, fieldToUpdate, finalValStr);

    setMixedCalc(prev => ({
      ...prev,
      [item.sku]: { ...prev[item.sku], isOpen: false }
    }));
    triggerHapticFeedback('success');
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
          isDirtyRef.current = false;
          try {
            localStorage.removeItem(draftKey);
          } catch (e) {
            console.debug('Failed to clear draft', e);
          }
          setHasDraftRestored(false);
          triggerSafeBack();
        }
      });
      return;
    }
    triggerSafeBack();
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
          try {
            localStorage.removeItem(draftKey);
          } catch (e) {
            console.debug('Failed to clear draft', e);
          }
          setHasDraftRestored(false);
          onLogout();
        }
      });
      return;
    }
    onLogout();
  };

  const triggerNativeCamera = () => { if (cameraInputRef.current) cameraInputRef.current.click(); };
  const triggerNativeBarcodeScan = () => { setIsScannerOpen(true); };

  const handlePhotoCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 960, 960, 0.65);
        setUnmappedPhotoUrl(compressedBase64);
      } catch (err) {
        console.error('Failed to compress photo, falling back to raw:', err);
        const reader = new FileReader();
        reader.onloadend = () => setUnmappedPhotoUrl(reader.result as string);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleBarcodeDetected = (scannedCode: string) => {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    // 1. Cek apakah barcode ini cocok dengan SKU / UPC di rak ini
    const foundItem = skuList.find(
      (item) =>
        item.sku.toLowerCase() === cleanCode.toLowerCase() ||
        (item.upc && item.upc.toLowerCase() === cleanCode.toLowerCase()) ||
        (item.upc2 && item.upc2.toLowerCase() === cleanCode.toLowerCase())
    );

    if (foundItem) {
      // Ditemukan di rak! Expand kartu SKU dan scroll ke sana
      setExpandedSku(foundItem.sku);
      playScanSuccessBeep();
      triggerHapticFeedback('success');
      setTimeout(() => {
        const el = document.getElementById(`sku-card-${foundItem.sku}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    } else {
      // Tidak terdaftar di rak -> Buka form item temuan (unmapped) dan isi barcodenya
      setUnmappedDrawerOpen(true);
      setUnmappedBarcode(cleanCode);
      playScanSuccessBeep();
      triggerHapticFeedback('warning');
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
      const rawGood = parseFloat(skuItem.qtyGood || "0") || 0;
      const rawBad = parseFloat(skuItem.qtyBad || "0") || 0;
      const pcsRatio = skuItem.pcsPerCarton || (skuItem.uom === 'CARTON' ? 24 : 1);
      const inputUnit = skuItem.inputUom || skuItem.uom;
      const sysUnit = skuItem.uom;

      // Konversi ke Satuan Sistem (uom)
      const finalGoodQty = convertToSystemQty(rawGood, inputUnit, sysUnit, pcsRatio).finalQty;
      const finalBadQty = convertToSystemQty(rawBad, inputUnit, sysUnit, pcsRatio).finalQty;
      const skuTotalSubmitted = Math.round((finalGoodQty + finalBadQty) * 1000) / 1000;

      const conversionNote = inputUnit !== sysUnit
        ? ` [Input: ${rawGood + rawBad} ${inputUnit} (isi ${pcsRatio}/ctn) -> Converted: ${skuTotalSubmitted} ${sysUnit}]`
        : '';
      const finalRemarks = (skuItem.selectedCategories && skuItem.selectedCategories.length > 0
        ? `[BAD STOCK] ${skuItem.selectedCategories.join(', ')}`
        : (skuItem.badRemarks || '')) + conversionNote;

      if (skuTotalSubmitted > 0 || skuItem.expDateActual) {
        skuItem.docIds.forEach((docId, i) => {
          const existingTaskRef = doc(db, "master_tasks", docId);
          batch.set(existingTaskRef, {
            counter: cleanCounter,
            counterPendamping: sessionData.partners?.[0] || '',
            partner: sessionData.partners?.[0] || '',
            isCounted: true,
            QTY_ACTUAL: i === 0 ? skuTotalSubmitted : 0,
            QTY_GOOD: i === 0 ? finalGoodQty : 0,
            QTY_BAD: i === 0 ? finalBadQty : 0,
            badRemarks: i === 0 ? finalRemarks : '',
            expDateActual: skuItem.expDateActual || '',
            pcsPerCarton: pcsRatio,
            countedInUom: inputUnit,
            rawGoodInput: rawGood,
            rawBadInput: rawBad,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });
      }
    });

    // 2. Simpan dokumen temuan baru
    const taskId = `${rack.rackNumber}_${unmSku}_TEMUAN_${Date.now()}`;
    const taskRef = doc(db, "master_tasks", taskId);

    batch.set(taskRef, {
      projectId: sessionData.projectId || '',
      Owner: unmOwner,
      SKU: unmSku,
      Description: unmDesc,
      UPC1: unmappedBarcode.trim(),
      UPC2: '',
      SKUBrand: unmBrand,
      Location: rack.rackNumber,
      counter: cleanCounter,
      counterPendamping: sessionData.partners?.[0] || '',
      partner: sessionData.partners?.[0] || '',
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
      projectId: sessionData.projectId || '',
      sessionCode: sessionData.sessionCode || '',
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
    setUnmappedDrawerOpen(false);
    setModal({ isOpen: true, type: 'success', title: 'Item Temuan Tersimpan!', message: `Item ${unmSku} & seluruh inputan SKU lain pada Rak ${rack.rackNumber} tersimpan aman!` });
  };

  const handleDeleteUnmapped = (id: string) => {
    if (isSessionLocked) return;
    setUnmappedList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveAndNext = async (goToNextRack: boolean = true) => {
    if (isSessionLocked) return;
    setIsLoadingSave(true);

    try {
      const batch = writeBatch(db);
      const cleanCounter = (sessionData.primaryCounter || 'Unassigned').toLowerCase().trim();

      skuList.forEach(skuItem => {
        const rawGood = parseFloat(skuItem.qtyGood || "0") || 0;
        const rawBad = parseFloat(skuItem.qtyBad || "0") || 0;
        const pcsRatio = skuItem.pcsPerCarton || (skuItem.uom === 'CARTON' ? 24 : 1);
        const inputUnit = skuItem.inputUom || skuItem.uom;
        const sysUnit = skuItem.uom;

        // Konversi ke Satuan Sistem yang telah ditentukan diawal (uom)
        const finalGoodQty = convertToSystemQty(rawGood, inputUnit, sysUnit, pcsRatio).finalQty;
        const finalBadQty = convertToSystemQty(rawBad, inputUnit, sysUnit, pcsRatio).finalQty;
        const totalSubmitted = Math.round((finalGoodQty + finalBadQty) * 1000) / 1000;
        const currentRoundNum = skuItem.currentRound || 1;

        const conversionNote = inputUnit !== sysUnit
          ? ` [Dihitung: ${rawGood + rawBad} ${inputUnit} (isi ${pcsRatio}/ctn) -> Dikonversi ke ${totalSubmitted} ${sysUnit}]`
          : '';

        const remarksText = (skuItem.selectedCategories && skuItem.selectedCategories.length > 0
          ? `[BAD STOCK] ${skuItem.selectedCategories.join(', ')}`
          : (skuItem.badRemarks || '-')) + conversionNote;

        skuItem.docIds.forEach((docId, i) => {
          const taskRef = doc(db, "master_tasks", docId);
          batch.set(taskRef, {
            counter: cleanCounter,
            counterPendamping: sessionData.partners?.[0] || '',
            partner: sessionData.partners?.[0] || '',
            isCounted: true,
            QTY_ACTUAL: i === 0 ? totalSubmitted : 0,
            QTY_GOOD: i === 0 ? finalGoodQty : 0,
            QTY_BAD: i === 0 ? finalBadQty : 0,
            badRemarks: i === 0 ? remarksText : '',
            expDateActual: skuItem.expDateActual || '',
            pcsPerCarton: pcsRatio,
            countedInUom: inputUnit,
            rawGoodInput: rawGood,
            rawBadInput: rawBad,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        });

        const auditRef = doc(collection(db, "audit_logs"));

        batch.set(auditRef, {
          projectId: sessionData.projectId || '',
          sessionCode: sessionData.sessionCode || '',
          timestamp: new Date().toISOString(),
          rackLocation: rack.rackNumber,
          ownerSku: 'DDI',
          sku: skuItem.sku,
          description: skuItem.name,
          upc1: skuItem.upc,
          upc2: skuItem.upc2 || '-',
          counterPic: cleanCounter,
          counterPendamping: sessionData.partners?.[0] || '-',
          partner: sessionData.partners?.[0] || '-',
          round: currentRoundNum,
          qtyGood: finalGoodQty,
          qtyBad: finalBadQty,
          totalFinalSubmitted: totalSubmitted,
          uom: sysUnit,
          countedInUom: inputUnit,
          pcsPerCarton: pcsRatio,
          rawGoodInput: rawGood,
          rawBadInput: rawBad,
          edActual: skuItem.expDateActual || '-',
          remarks: remarksText
        }, { merge: true });
      });

      await batch.commit();
      setIsDirty(false);
      try {
        localStorage.removeItem(draftKey);
      } catch (err) {
        console.debug('Failed to clear draft key', err);
      }
      setHasDraftRestored(false);

      const remainingTasksQuery = query(
        collection(db, "master_tasks"),
        where("counter", "==", cleanCounter)
      );

      const snap = await getDocs(remainingTasksQuery);
      let nextRackItem: RackItem | null = null;

      if (!snap.empty) {
        const nextDoc = snap.docs.find(d => {
          const data = d.data();
          // Filter ketat isolasi Project ID
          if (sessionData.projectId && data.projectId && data.projectId !== sessionData.projectId) return false;
          if (sessionData.projectId && !data.projectId) return false;
          if (data.isLocked) return false;
          if (!data.SKU || data.SKU === 'SKU_UNKNOWN') return false;
          if (!data.Location || data.Location === rack.rackNumber) return false;

          const isCounted = !!data.isCounted || (data.QTY_ACTUAL !== null && data.QTY_ACTUAL !== undefined);
          return !isCounted;
        });

        if (nextDoc) {
          const nextTask = nextDoc.data();
          const nextRackNumber = nextTask.Location;
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

      if (goToNextRack && nextRackItem && onSelectNextRack) {
        playScanSuccessBeep();
        triggerHapticFeedback('success');
        onSelectNextRack(nextRackItem);
        return;
      }

      // Jika tidak ada rak lagi di project ini (rak terakhir) ATAU user klik "Simpan & List":
      // Langsung arahkan kembali ke Countsheet List tanpa modal berbelit atau nyasar ke rak kosong!
      playScanSuccessBeep();
      triggerHapticFeedback('success');
      triggerSafeBack();
    } catch (err) {
      console.error("Firestore Save Error:", err);
      playErrorBuzzer();
      triggerHapticFeedback('error');
      setModal({ isOpen: true, type: 'error', title: 'Gagal Menyimpan', message: 'Periksa koneksi internet kamu.' });
    } finally {
      setIsLoadingSave(false);
    }
  };

  const currentDisplayRound = skuList[0]?.currentRound || 1;
  const completedCount = skuList.filter(s => s.isCounted || ((s.qtyGood !== "" || s.qtyBad !== "") && (parseInt(s.qtyGood || "0", 10) + parseInt(s.qtyBad || "0", 10) > 0))).length;

  return (
    <div className="bg-slate-50 text-slate-900 font-body-md text-body-md flex flex-col min-h-screen">
      <CustomModal modal={modal} onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))} />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onDetected={handleBarcodeDetected}
        title="Scan Barcode Barang (HP)"
      />

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoCaptured} />

      {/* HEADER HP COUNTER (RELATIVE - TIDAK IKUT TURUN SAAT SCROLLING) */}
      <header className="relative w-full z-10 bg-white border-b border-slate-200/90 pt-safe shadow-xs shrink-0">
        <div className="py-3 px-4 sm:px-5 flex flex-col justify-center gap-space-xs max-w-md mx-auto">
          <div className="flex items-center justify-between gap-1.5">
            <button type="button" onClick={handleSafeBackToList} className="min-h-10 -ml-1 px-1.5 flex items-center gap-0.5 text-slate-800 hover:text-cyan-600 transition-colors cursor-pointer font-bold shrink-0">
              <ChevronLeft className="w-5 h-5 text-slate-700" />
              <span className="font-label-md uppercase tracking-wider font-bold text-xs">{t('backToCountsheet')}</span>
            </button>
            <div className="flex items-center gap-1.5 shrink-0 pr-1">
              <LanguageToggle />
              <NetworkStatusBadge />
              <span className="whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-950 font-sans text-xs font-bold border border-cyan-300 shadow-2xs flex items-center gap-1">
                <span className="text-[10px] text-cyan-700 font-semibold uppercase">{t('round')}</span>
                <span className="font-mono font-black text-xs text-cyan-900">{currentDisplayRound}</span>
              </span>
              <button
                type="button"
                onClick={handleSafeLogout}
                className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ml-1.5 shadow-2xs"
                title={t('logout')}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-space-sm pt-0.5">
            <h1 className="font-headline-md text-slate-900 tracking-tight font-extrabold truncate text-base">{sessionData.sessionName}</h1>
          </div>

          <div className="flex items-center justify-between gap-space-sm pt-0.5">
            <div className="flex items-center gap-1.5 text-slate-600 font-label-sm text-xs truncate">
              <Users className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              <span className="truncate">{t('activeCounterText')}: <b className="text-slate-900 font-mono">{sessionData.primaryCounter}</b></span>
            </div>
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA DENGAN KARTU SKU & DRAWER UNMAPPED */}
      <main className="flex-1 flex flex-col relative w-full px-margin pt-4 pb-32 bg-slate-100 min-h-screen max-w-md mx-auto">
        <div className="flex flex-col w-full pb-12 space-y-4">

          <div className="flex items-center justify-between pb-1">
            <h2 className="font-headline-sm font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>BIN: {rack.rackNumber}</span>
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${isSessionLocked ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {isSessionLocked ? `🔒 ${t('sessionLockedBadge')}` : `🟢 ${t('sessionOpenBadge')}`}
              </span>
              <span className="text-xs font-bold text-slate-700 bg-slate-200 px-2.5 py-1 rounded-full">{completedCount} / {skuList.length} SKU</span>
            </div>
          </div>

          {/* BANNER NOTIFIKASI DRAFT RESTORED */}
          {hasDraftRestored && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="font-bold">{t('draftRestoredMsg')}</span>
              </div>
              <button
                type="button"
                onClick={() => setHasDraftRestored(false)}
                className="text-amber-700 font-extrabold hover:text-amber-900 ml-2 text-[11px] underline cursor-pointer shrink-0"
              >
                {t('dismiss')}
              </button>
            </div>
          )}

          {/* TOMBOL SCAN BARCODE KAMERA HP (VIEWFINDER LIVE) */}
          <button
            type="button"
            disabled={isSessionLocked}
            onClick={() => setIsScannerOpen(true)}
            className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.99] ${
              isSessionLocked
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                : 'bg-linear-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 shadow-cyan-400/20'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>{t('scanBarcodeBtnTop')}</span>
          </button>

          {/* PISAHKAN SKU BELUM DIHITUNG (UTAMA) VS SELESAI DIHITUNG (TERLIPAT) */}
          {(() => {
            const pendingItems = skuList
              .map((sku, originalIndex) => ({ sku, originalIndex }))
              .filter(({ sku }) => {
                if (expandedSku === sku.sku) return true;
                const numGood = parseInt(sku.qtyGood || "0", 10);
                const numBad = parseInt(sku.qtyBad || "0", 10);
                const totalCounted = numGood + numBad;
                const hasInputValue = sku.qtyGood !== "" || sku.qtyBad !== "";
                const isCounted = sku.isCounted || (hasInputValue && totalCounted > 0);
                return !isCounted;
              });

            const completedItems = skuList
              .map((sku, originalIndex) => ({ sku, originalIndex }))
              .filter(({ sku }) => {
                if (expandedSku === sku.sku) return false;
                const numGood = parseInt(sku.qtyGood || "0", 10);
                const numBad = parseInt(sku.qtyBad || "0", 10);
                const totalCounted = numGood + numBad;
                const hasInputValue = sku.qtyGood !== "" || sku.qtyBad !== "";
                const isCounted = sku.isCounted || (hasInputValue && totalCounted > 0);
                return isCounted;
              });

            const renderCard = (currentSku: GroupedSKUItem, idx: number) => {
              const isExpanded = expandedSku === currentSku.sku;
              const numGood = parseInt(currentSku.qtyGood || "0", 10);
              const numBad = parseInt(currentSku.qtyBad || "0", 10);
              const totalCounted = numGood + numBad;
              const hasInputValue = currentSku.qtyGood !== "" || currentSku.qtyBad !== "";
              const isCounted = currentSku.isCounted || (hasInputValue && totalCounted > 0);

              return (
              <div
                key={currentSku.sku}
                id={`sku-card-${currentSku.sku}`}
                className={`bg-white rounded-2xl shadow-xs border transition-all overflow-hidden ${
                  isExpanded
                    ? 'border-cyan-400 ring-2 ring-cyan-400/20 shadow-md'
                    : isCounted
                      ? 'border-emerald-300 bg-emerald-50/15'
                      : currentSku.isUnmappedFound
                        ? 'border-amber-300 bg-amber-50/15'
                        : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* ACCENT LINE TOP */}
                <div className={`h-1.5 w-full ${
                  currentSku.isUnmappedFound
                    ? 'bg-amber-500'
                    : isCounted
                      ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                      : isExpanded
                        ? 'bg-cyan-400'
                        : 'bg-slate-200'
                }`} />

                {/* ACCORDION HEADER (SELALU KELIHATAN & RINGKAS) */}
                <div
                  onClick={() => setExpandedSku(isExpanded ? null : currentSku.sku)}
                  className="p-3.5 cursor-pointer flex items-center justify-between gap-3 select-none hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isCounted
                        ? 'bg-emerald-100 text-emerald-700'
                        : currentSku.isUnmappedFound
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isCounted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded-md tracking-wide ${
                          currentSku.isUnmappedFound
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                        }`}>
                          {currentSku.isUnmappedFound ? '📦 TEMUAN' : currentSku.sku}
                        </span>
                        <span className="text-xs font-bold uppercase bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md">
                          {currentSku.uom}
                        </span>
                        <button
                          type="button"
                          disabled={isSessionLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            openConversionModal(idx);
                          }}
                          className="text-[10px] font-mono font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Klik untuk setting rasio / isi per karton"
                        >
                          <span>📦 1 Ctn = {currentSku.pcsPerCarton || (currentSku.uom === 'CARTON' ? 24 : 1)} Pcs</span>
                          <Edit2 className="w-2.5 h-2.5 text-amber-700" />
                        </button>
                      </div>
                      <h3 className="font-headline-sm text-slate-900 font-bold text-xs sm:text-sm leading-snug line-clamp-2">
                        {currentSku.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium truncate">
                        {currentSku.category}
                      </p>

                      {/* BADGE UPC 1 & UPC 2 JELAS (TIDAK TERPOTONG) */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {currentSku.upc && currentSku.upc !== 'N/A' && currentSku.upc !== '-' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px] sm:text-[11px] font-bold border border-slate-200 shadow-2xs">
                            <span className="text-[9px] text-slate-500 font-semibold uppercase">UPC:</span>
                            <span className="select-all tracking-wide">{currentSku.upc}</span>
                          </span>
                        )}
                        {currentSku.upc2 && currentSku.upc2 !== '-' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-900 font-mono text-[10px] sm:text-[11px] font-bold border border-purple-200 shadow-2xs">
                            <span className="text-[9px] text-purple-600 font-semibold uppercase">UPC 2 (Kardus):</span>
                            <span className="select-all tracking-wide">{currentSku.upc2}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCounted ? (
                      <div className="text-right">
                        <span className="px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-black rounded-lg inline-flex items-center gap-1">
                          <span>✓ {totalCounted}</span>
                          <span className="text-[11px] font-extrabold uppercase">{currentSku.uom}</span>
                        </span>
                        {numBad > 0 && (
                          <span className="block text-[9px] font-bold text-amber-700 mt-0.5">
                            ⚠️ {numBad} {t('damagedSummary')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg border border-slate-200">
                        {t('notCountedYet')}
                      </span>
                    )}

                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-cyan-600' : ''}`} />
                  </div>
                </div>

                {/* EXPANDED CONTENT: FORM HITUNG HANYA MUNCUL SAAT DI-KLIK */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 space-y-3.5 border-t border-slate-100 animate-in fade-in duration-150">
                    {/* DETAIL KODE BARCODE & UPC */}
                    <div className="bg-slate-50/90 border border-slate-200 p-2.5 rounded-xl flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex-1 min-w-36 bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider mb-0.5 flex items-center justify-between">
                          <span>{t('upc1Label')}</span>
                          <span className="text-[8px] bg-slate-100 px-1 py-0.2 rounded text-slate-500 font-medium">{t('barcodeScanHelper')}</span>
                        </div>
                        <div className="font-mono text-xs font-black text-slate-900 select-all break-all">
                          {currentSku.upc && currentSku.upc !== 'N/A' && currentSku.upc !== '-' ? currentSku.upc : '-'}
                        </div>
                      </div>

                      {currentSku.upc2 && currentSku.upc2 !== '-' && (
                        <div className="flex-1 min-w-36 bg-purple-50/50 p-2 rounded-lg border border-purple-200 shadow-2xs">
                          <div className="text-[9px] text-purple-700 font-extrabold uppercase tracking-wider mb-0.5 flex items-center justify-between">
                            <span>{t('upc2Label')}</span>
                            <span className="text-[8px] bg-purple-100 px-1 py-0.2 rounded text-purple-700 font-medium">{t('barcodeScanHelper')}</span>
                          </div>
                          <div className="font-mono text-xs font-black text-purple-950 select-all break-all">
                            {currentSku.upc2}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* EXPIRED DATE FEFO DENGAN FORMAT DD/MM/YYYY */}
                    <div className="bg-cyan-50/60 border border-cyan-200 p-space-sm rounded-xl space-y-2">
                      <div className="flex justify-between items-center gap-2 flex-wrap">
                        <span className="font-label-sm text-cyan-950 font-bold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-cyan-700" />
                          <span>{t('expDateSystemLabel')}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          {currentSku.expDateActual && currentSku.expDateSystem && currentSku.expDateActual === currentSku.expDateSystem ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ✓ Sesuai Sistem
                            </span>
                          ) : currentSku.expDateActual && currentSku.expDateSystem && currentSku.expDateActual !== currentSku.expDateSystem ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              ⚠️ Beda Batch
                            </span>
                          ) : null}

                          {currentSku.expDateSystem && currentSku.expDateActual !== currentSku.expDateSystem && (
                            <button
                              type="button"
                              disabled={isSessionLocked}
                              onClick={() => handleSetSameExpAsSystem(idx)}
                              className={`px-2 py-0.5 text-white rounded-lg text-[10px] font-bold cursor-pointer ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-500 active:scale-95'}`}
                              title="Reset sama dengan sistem"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 font-bold block uppercase mb-0.5">{t('nearestSystemEd')}</label>
                          <input type="text" readOnly value={formatDateDisplay(currentSku.expDateSystem)} className="w-full p-2 bg-white/80 border border-slate-200 rounded-lg text-slate-600 font-mono text-xs font-bold outline-none" />
                        </div>
                        <div>
                          <label className="text-[10px] text-cyan-800 font-bold block uppercase mb-0.5">{t('actualEdLabel')}</label>
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

                    {/* PILIH SATUAN HITUNG & SETTING RASIO */}
                    <div className="bg-linear-to-r from-slate-50 to-cyan-50/40 border border-slate-200 p-2.5 rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1">
                          <Zap className="w-3 h-3 text-cyan-600" />
                          <span>Satuan Input Hitung:</span>
                        </span>

                        <button
                          type="button"
                          disabled={isSessionLocked}
                          onClick={() => openConversionModal(idx)}
                          className="text-[10px] font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Ubah isi per karton"
                        >
                          <span>📦 1 Ctn = {currentSku.pcsPerCarton || (currentSku.uom === 'CARTON' ? 24 : 1)} Pcs</span>
                          <Edit2 className="w-2.5 h-2.5 text-amber-700" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl">
                        <button
                          type="button"
                          disabled={isSessionLocked}
                          onClick={() => handleSwitchInputUom(idx, 'CARTON')}
                          className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            (currentSku.inputUom || currentSku.uom) === 'CARTON'
                              ? 'bg-cyan-500 text-slate-950 shadow-sm scale-[1.01]'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                          }`}
                        >
                          <span>📦</span>
                          <span>KARTON</span>
                          {currentSku.uom === 'CARTON' && (
                            <span className="text-[9px] px-1 py-0.2 bg-cyan-900/10 rounded font-normal">(Sistem)</span>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isSessionLocked}
                          onClick={() => handleSwitchInputUom(idx, 'PCS')}
                          className={`py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            (currentSku.inputUom || currentSku.uom) === 'PCS'
                              ? 'bg-cyan-500 text-slate-950 shadow-sm scale-[1.01]'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                          }`}
                        >
                          <span>🛍️</span>
                          <span>PCS</span>
                          {currentSku.uom === 'PCS' && (
                            <span className="text-[9px] px-1 py-0.2 bg-cyan-900/10 rounded font-normal">(Sistem)</span>
                          )}
                        </button>
                      </div>

                      {/* TOMBOL KALKULATOR CAMPURAN (DUS UTUH + ECERAN) */}
                      <button
                        type="button"
                        disabled={isSessionLocked}
                        onClick={() => toggleMixedCalc(currentSku.sku)}
                        className="w-full py-1.5 px-2 bg-white hover:bg-cyan-50/70 border border-slate-300 hover:border-cyan-300 text-slate-700 hover:text-cyan-900 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Calculator className="w-3.5 h-3.5 text-cyan-600" />
                        <span>{mixedCalc[currentSku.sku]?.isOpen ? 'Tutup Kalkulator Dus + Pcs' : '🧮 Hitung Campuran: Dus Utuh + Eceran Pcs'}</span>
                      </button>

                      {/* PANEL KALKULATOR CAMPURAN JIKA DIAKTIFKAN */}
                      {mixedCalc[currentSku.sku]?.isOpen && (
                        <div className="bg-white border-2 border-cyan-400 p-2.5 rounded-xl space-y-2 animate-in fade-in shadow-xs">
                          <div className="text-[11px] font-bold text-cyan-950 flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-cyan-600" />
                              <span>Kalkulator Dus + Eceran Pcs</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">1 Ctn = {currentSku.pcsPerCarton || (currentSku.uom === 'CARTON' ? 24 : 1)} Pcs</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block uppercase mb-0.5">Dus Utuh (Ctn)</label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                value={mixedCalc[currentSku.sku]?.cartons || ''}
                                onChange={(e) => updateMixedCalcValue(currentSku.sku, 'cartons', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded-lg text-center font-bold text-sm bg-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 block uppercase mb-0.5">Eceran (Pcs)</label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                value={mixedCalc[currentSku.sku]?.loosePcs || ''}
                                onChange={(e) => updateMixedCalcValue(currentSku.sku, 'loosePcs', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded-lg text-center font-bold text-sm bg-white outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                              <span>Target:</span>
                              <button
                                type="button"
                                onClick={() => updateMixedCalcValue(currentSku.sku, 'targetField', 'good')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  (mixedCalc[currentSku.sku]?.targetField || 'good') === 'good'
                                    ? 'bg-cyan-500 text-slate-950'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                Baik
                              </button>
                              <button
                                type="button"
                                onClick={() => updateMixedCalcValue(currentSku.sku, 'targetField', 'bad')}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  mixedCalc[currentSku.sku]?.targetField === 'bad'
                                    ? 'bg-amber-500 text-slate-950'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                Rusak
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => applyMixedCalc(idx)}
                              className="px-3 py-1 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-lg font-black text-xs cursor-pointer shadow-xs active:scale-95 transition-all"
                            >
                              ✓ Terapkan
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* INPUT KONDISI BAIK (QTY GOOD) */}
                    <div className="bg-slate-50 border border-slate-200 p-space-md rounded-xl space-y-space-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-cyan-400"></span><span className="font-headline-sm text-slate-900 font-bold text-xs sm:text-sm">{t('goodConditionLabel')}</span></div>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-950 border border-cyan-300 font-black text-xs uppercase">{currentSku.inputUom || currentSku.uom}</span>
                      </div>
                      <div className="flex items-center gap-space-sm">
                        <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 'good', -1)} className={`w-14 h-14 bg-white border border-slate-300 text-slate-800 rounded-xl flex items-center justify-center text-xl shrink-0 cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}><Minus className="w-5 h-5" /></button>
                        <div className="flex-1 h-14 border-2 border-cyan-400 rounded-xl flex items-center justify-center bg-white">
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={isSessionLocked}
                            value={currentSku.qtyGood}
                            onChange={(e) => handleInputText(idx, 'qtyGood', e.target.value)}
                            placeholder="0"
                            className={`w-full text-center font-bold text-2xl outline-none ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`}
                          />
                        </div>
                        <button type="button" disabled={isSessionLocked} onClick={() => adjustQty(idx, 'good', 1)} className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl shrink-0 cursor-pointer transition-all ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-md active:scale-95'}`}><Plus className="w-5 h-5" /></button>
                      </div>
                    </div>

                    {/* BAD STOCK DETECTED DENGAN TOMBOL CHIP KATEGORI */}
                    <div className="bg-amber-50/70 border border-amber-200 p-space-md rounded-xl space-y-space-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-body-lg text-amber-900 font-bold">{t('badStockQuestion')}</span>
                        <button type="button" disabled={isSessionLocked} onClick={() => toggleBadStock(idx)} className={`min-h-11 min-w-11 px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${currentSku.isBadStock ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>{currentSku.isBadStock ? 'ON' : 'OFF'}</button>
                      </div>
                      {currentSku.isBadStock && (
                        <div className="pt-2 space-y-3 border-t border-amber-200">
                          <div>
                            <label className="text-xs font-bold text-amber-900 flex items-center justify-between mb-1">
                              <span>{t('damagedQtyLabel')}</span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-950 font-black text-[11px] uppercase">{currentSku.inputUom || currentSku.uom}</span>
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={isSessionLocked}
                              value={currentSku.qtyBad}
                              onChange={(e) => handleInputText(idx, 'qtyBad', e.target.value)}
                              placeholder="0"
                              className={`w-full p-2 border border-amber-300 rounded-lg text-center font-bold text-lg ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`}
                            />
                          </div>

                          <div>
                            <label className="text-xs font-bold text-amber-900 block mb-1.5">{t('selectDamageCatLabel')}</label>
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
                                    {isSelected ? '✓ ' : ''}{translateDamageCat(cat)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* LIVE CONVERSION BANNER JIKA INPUT BEDA DENGAN SISTEM UOM */}
                    {(currentSku.inputUom || currentSku.uom) !== currentSku.uom && (
                      <div className="p-2.5 bg-cyan-50 border border-cyan-300 rounded-xl flex items-center justify-between text-xs text-cyan-950 shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-cyan-600 shrink-0" />
                          <div>
                            <div className="font-extrabold text-[11px] text-cyan-900">Konversi Otomatis ke Sistem:</div>
                            <div className="text-[11px] text-cyan-700">
                              Input <b className="font-mono text-cyan-950">{(parseFloat(currentSku.qtyGood || '0') + parseFloat(currentSku.qtyBad || '0')) || 0} {currentSku.inputUom || currentSku.uom}</b> ➔ Disimpan sebagai <b className="font-mono text-cyan-950">{convertToSystemQty((parseFloat(currentSku.qtyGood || '0') + parseFloat(currentSku.qtyBad || '0')) || 0, currentSku.inputUom || currentSku.uom, currentSku.uom, currentSku.pcsPerCarton || 24).finalQty} {currentSku.uom}</b>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TOMBOL TUTUP CARD CEPAT */}
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedSku(null)}
                        className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 cursor-pointer py-1.5 px-3 rounded-xl bg-cyan-50 hover:bg-cyan-100 transition-colors"
                      >
                        <span>{t('doneEditingThisItem')}</span>
                        <ChevronUp className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          };

          return (
            <>
              {/* 1. KELOMPOK UTAMA: SKU BELUM DIHITUNG */}
              {pendingItems.map(({ sku, originalIndex }) => renderCard(sku, originalIndex))}

              {/* NOTIFIKASI JIKA SEMUA SKU DI RAK SUDAH SELESAI */}
              {pendingItems.length === 0 && completedItems.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-1.5 my-1 animate-in fade-in">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-base font-black">
                    ✓
                  </div>
                  <h4 className="font-bold text-sm text-emerald-950">Semua SKU di Rak Ini Selesai Dihitung!</h4>
                  <p className="text-[11px] text-emerald-700 max-w-xs mx-auto">
                    Total {completedItems.length} SKU sudah memiliki hitungan. Buka section riwayat di bawah jika perlu koreksi, atau klik tombol simpan di bawah.
                  </p>
                </div>
              )}

              {/* 2. SECTION TERLIPAT: SKU YANG SUDAH DIHITUNG (DENGAN TOMBOL RIWAYAT) */}
              {completedItems.length > 0 && (
                <div className="rounded-2xl border border-emerald-200 bg-white shadow-xs overflow-hidden transition-all my-2">
                  <button
                    type="button"
                    onClick={() => setShowCompletedSection(prev => !prev)}
                    className="w-full p-3.5 flex items-center justify-between bg-emerald-50/80 hover:bg-emerald-100/70 transition-colors cursor-pointer select-none text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        ✓
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 flex-wrap">
                          <span>SKU Selesai Dihitung</span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-mono text-[10px] font-bold">
                            {completedItems.length} SKU
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-medium truncate">
                          {showCompletedSection ? 'Klik untuk melipat kembali' : 'Klik untuk melihat riwayat atau koreksi hitungan'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-800 text-xs font-bold shrink-0 pl-2">
                      <span>{showCompletedSection ? 'Tutup' : 'Buka'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showCompletedSection ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {showCompletedSection && (
                    <div className="p-3 bg-slate-50/60 space-y-3 border-t border-emerald-100 animate-in fade-in duration-200">
                      {completedItems.map(({ sku, originalIndex }) => renderCard(sku, originalIndex))}
                    </div>
                  )}
                </div>
              )}
            </>
          );
        })()}

          {/* JIKA RAK TIDAK MEMILIKI SKU TERDAFTAR DI SESI INI */}
          {skuList.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center space-y-3 my-1 shadow-xs animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto text-xl">
                📋
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-slate-900">Tidak Ada SKU Terdaftar di Rak Ini</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Rak <b className="text-slate-800">{rack.rackNumber}</b> tidak memiliki daftar SKU sistem untuk sesi ini. Kamu dapat langsung kembali ke Countsheet List atau mencatat temuan barang fisik baru di bawah.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSafeBackToList}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali ke Countsheet List</span>
              </button>
            </div>
          )}

          {/* FORM ITEM TAK TERDAFTAR / TEMUAN LAIN (ACCORDION COLLAPSIBLE) */}
          <div id="unmapped-card" className={`bg-white rounded-2xl shadow-xs border transition-all overflow-hidden ${unmappedDrawerOpen ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-dashed border-2 border-amber-300/80 bg-amber-50/30 hover:bg-amber-50/60'}`}>
            <div
              className="p-3.5 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setUnmappedDrawerOpen(!unmappedDrawerOpen)}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <PlusCircle className="w-5 h-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-slate-900 font-bold text-xs sm:text-sm">
                    {unmappedDrawerOpen ? t('unmappedHeaderOpen') : t('unmappedHeaderClosed')}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {unmappedDrawerOpen ? (lang === 'en' ? 'Scan barcode, upload physical photo, and enter counts' : 'Isi barcode, foto fisik, dan jumlah temuan') : t('unmappedSubtitleClosed')}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${unmappedDrawerOpen ? 'rotate-180 text-amber-600' : ''}`} />
            </div>
            {unmappedDrawerOpen && (
              <div className="p-3.5 pt-3 space-y-3 border-t border-amber-200/80 bg-white">
                <div className="flex gap-2">
                  <input type="text" disabled={isSessionLocked} value={unmappedBarcode} onChange={(e) => setUnmappedBarcode(e.target.value)} placeholder="Scan/Ketik Barcode/UPC..." className={`flex-1 h-11 border border-slate-300 px-3 rounded-lg text-sm font-mono font-bold ${isSessionLocked ? 'bg-slate-100 opacity-60' : 'bg-white'}`} />
                  <button type="button" disabled={isSessionLocked} onClick={triggerNativeBarcodeScan} className={`px-3 min-h-11 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer transition-all ${isSessionLocked ? 'bg-slate-400 opacity-50 cursor-not-allowed text-white' : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold shadow-xs active:scale-95'}`}>
                    <Scan className="w-4 h-4" />
                    <span>Scan</span>
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
                        <label className="text-[10px] font-bold text-amber-900 block mb-1">Pilih Kategori Kerusakan (Bisa lebih dari 1):</label>
                        <div className="flex flex-wrap gap-1.5">
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

                <button type="button" disabled={isSessionLocked} onClick={triggerNativeCamera} className={`w-full h-11 border rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''} ${!isBarcodeInSystem && !unmappedPhotoUrl ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
                  <Camera className="w-4 h-4" />
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
                    className={`p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer ${isSessionLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title="Hapus Temuan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>


      {/* STICKY BOTTOM ACTION BAR (DUAL ACTION: LANJUT RAK VS BALIK LIST) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-2.5 sm:p-3 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] pb-safe">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {/* Tombol Sekunder: Simpan & Balik ke List */}
          <button
            type="button"
            disabled={isLoadingSave || isSessionLocked}
            onClick={() => handleSaveAndNext(false)}
            className="h-12 px-3 sm:px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-300 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
            title="Simpan dan kembali ke menu list rak"
          >
            {t('saveAndBackToList') || 'Simpan & List'}
          </button>

          {/* Tombol Utama: Simpan & Lanjut ke Rak Berikutnya */}
          <button
            type="button"
            disabled={isLoadingSave || isSessionLocked}
            onClick={() => handleSaveAndNext(true)}
            className={`flex-1 h-12 px-3 sm:px-4 rounded-xl font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(34,211,238,0.35)] cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 text-center ${
              isSessionLocked || isLoadingSave
                ? 'bg-slate-400 opacity-50 cursor-not-allowed text-white shadow-none'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
            }`}
          >
            {isLoadingSave ? (
              <>
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                <span>{t('savingToCloud')}</span>
              </>
            ) : isSessionLocked ? (
              <>
                <Lock className="w-4 h-4 shrink-0" />
                <span>{t('sessionLockedByAdmin')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 shrink-0 text-slate-950" />
                <span>
                  {!hasRemainingRacks
                    ? (t('saveAndFinishCountsheetBtn') || 'Simpan & Selesai (Ke Countsheet) ➔')
                    : (t('saveAndNextBtn') || 'Simpan & Lanjut Rak ➔')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL SETTING ISI PER KARTON (CONVERSION RATIO) */}
      {conversionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  📦
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Setting Isi per Karton</h3>
                  <p className="text-[10px] text-slate-500">Konversi UOM Karton ⇄ PCS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConversionModal(prev => ({ ...prev, isOpen: false }))}
                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-800">{conversionModal.sku}</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-900 font-extrabold text-[10px] uppercase">
                    Satuan Sistem: {conversionModal.systemUom}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium line-clamp-1">{conversionModal.skuName}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Jumlah Pcs dalam 1 Karton (Pack Size):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    autoFocus
                    value={conversionModal.tempValue}
                    onChange={(e) => setConversionModal(prev => ({ ...prev, tempValue: e.target.value }))}
                    placeholder="24"
                    className="w-full p-3 border-2 border-amber-400 rounded-xl text-center font-black text-2xl text-slate-900 bg-white outline-none"
                  />
                  <span className="absolute right-3.5 top-4 text-xs font-extrabold text-slate-400 uppercase">Pcs / Dus</span>
                </div>
              </div>

              {/* TOMBOL PRESET CEPAT */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Preset Populer:</span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[6, 12, 24, 48, 100].map((presetVal) => (
                    <button
                      key={presetVal}
                      type="button"
                      onClick={() => setConversionModal(prev => ({ ...prev, tempValue: presetVal.toString() }))}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        conversionModal.tempValue === presetVal.toString()
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs font-black'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {presetVal}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                💡 <b>Info:</b> Jika counter menghitung dalam Pcs namun satuan sistem adalah Karton (atau sebaliknya), angka akan otomatis dikonversikan sesuai rasio ini dan tetap disimpan sesuai satuan sistem diawal.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConversionModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConversionRatio}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow-md active:scale-95 transition-all"
              >
                Simpan Rasio
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center py-4 bg-slate-50 text-slate-400 text-[10px] font-medium border-t border-slate-200 pb-16">
        Noctus Count™ • Developed by <span className="font-bold text-cyan-600">Noctus</span>
      </footer>
    </div>
  );
}