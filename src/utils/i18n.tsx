import { useState, useEffect } from 'react';

export type Language = 'id' | 'en';

const STORAGE_KEY = 'stock_opname_lang';

export const getLanguage = (): Language => {
  if (typeof window === 'undefined') return 'id';
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' ? 'en' : 'id';
};

export const setLanguage = (lang: Language) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, lang);
  window.dispatchEvent(new CustomEvent('app_language_change', { detail: lang }));
};

export const useLanguage = () => {
  const [lang, setLangState] = useState<Language>(getLanguage());

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<Language>;
      if (custom.detail) {
        setLangState(custom.detail);
      } else {
        setLangState(getLanguage());
      }
    };
    window.addEventListener('app_language_change', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('app_language_change', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLanguage(newLang);
    setLangState(newLang);
  };

  const t = (key: keyof typeof translations.id): string => {
    return translations[lang]?.[key] || translations.id[key] || key;
  };

  const translateDamageCat = (catName: string): string => {
    if (lang === 'id') return catName;
    const catMap: Record<string, string> = {
      'Dus Penyok': 'Dented Box/Carton',
      'Kemasan Bocor': 'Leaking Packaging',
      'Segel Rusak': 'Broken Seal',
      'Basah / Lembab': 'Wet / Damp',
      'Barang Expired': 'Expired Product',
      'Kemasan Sobek': 'Torn Packaging',
      'Pecah': 'Broken / Shattered',
      'Cacat Pabrik': 'Factory Defect',
      'Label Hilang': 'Missing Label',
    };
    return catMap[catName] || catName;
  };

  return { lang, changeLanguage, t, translateDamageCat };
};

export const translations = {
  id: {
    // Shared / Badges
    online: 'Online',
    offline: 'Offline (Lokal)',
    logout: 'Keluar',
    cancel: 'Batal',
    confirm: 'Lanjutkan',
    round: 'Round',
    search: 'Cari',

    // Step 1: Login
    loginTitle: 'Masuk Akun Counter',
    loginSubtitle: 'Gunakan username & PIN yang telah didaftarkan',
    usernameLabel: 'Username Akun',
    usernamePlaceholder: 'Masukkan username...',
    pinLabel: 'PIN Akun',
    pinPlaceholder: 'Masukkan PIN...',
    loginBtn: 'Masuk Aplikasi',
    loginLoading: 'Memeriksa Akun...',
    loginOwnerAdminNote: 'Login dengan akun counter kamu.',

    // Step 2: Team Setup
    teamSetupTitle: 'Setup Tim Opname',
    teamSetupSubtitle: 'Keterangan Tim Pendamping',
    teamSetupDesc: 'Sebelum memulai perhitungan rak, mohon lengkapi nama petugas pendamping dari tim warehouse (WH).',
    primaryCounterLabel: 'Counter Utama (SO)',
    partnerLabel: 'Tim Pendamping (Warehouse / WH)',
    partnerPlaceholder: 'Masukkan nama petugas WH...',
    startOpnameBtn: 'Mulai Stock Opname',

    // Step 3: Countsheet List
    countsheetListTitle: 'Countsheet List',
    activeProjectPrefix: 'Sesi Aktif',
    tabAll: 'Semua',
    tabPending: 'Pending',
    tabInProgress: 'Proses',
    tabCompleted: 'Selesai',
    searchRackPlaceholder: 'Cari rak / BIN (misal: AA01)...',
    addRackBtn: 'Tambah Rak',
    noRacksAssigned: 'Tidak ada rak tugas untuk akun ini.',
    emptyFilter: 'Tidak ada rak di tab ini.',
    rackStatusPending: 'Belum Dihitung',
    rackStatusCompleted: 'Selesai',
    rackStatusInProgress: 'Sedang Dihitung',
    racksFinishedConfirmTitle: 'Konfirmasi Selesai Perhitungan',
    racksFinishedConfirmBtn: 'Konfirmasi Selesai Semua Rak',
    sessionLockedBadge: 'Sesi Terkunci',
    sessionOpenBadge: 'Sesi Terbuka',

    // Step 4: Count Detail
    backToCountsheet: 'Countsheet List',
    activeCounterText: 'Counter Aktif',
    scanBarcodeBtnTop: 'Scan Barcode Kamera (Cari / Tambah SKU)',
    draftRestoredMsg: 'Draft hitungan dipulihkan dari memori lokal HP.',
    dismiss: 'Tutup',
    unmappedBadge: 'TEMUAN',
    notCountedYet: 'Belum Dihitung',
    damagedSummary: 'Rusak',
    upc1Label: 'UPC 1 (Satuan/Pcs)',
    upc2Label: 'UPC 2 (Kardus/Pack)',
    barcodeScanHelper: 'Barcode Scan',

    expDateSystemLabel: 'Expired Date System (FEFO)',
    sameAsSystemBtn: 'Sama dgn System',
    nearestSystemEd: 'ED System Terdekat',
    actualEdLabel: 'ED Actual (Fisik)',
    edVariationsLabel: 'Variasi ED System di Rak Ini',
    batchCountSuffix: 'Batch',

    goodConditionLabel: 'Kondisi Baik (Qty Good)',
    badStockQuestion: 'Bad Stock Detected?',
    damagedQtyLabel: 'Jumlah Rusak (Qty Bad):',
    selectDamageCatLabel: 'Pilih Kategori Kerusakan (Bisa lebih dari 1):',
    doneEditingThisItem: 'Selesai Edit Item Ini',

    // Step 4: Unmapped
    unmappedHeaderOpen: 'Form Input Item Temuan Fisik',
    unmappedHeaderClosed: 'Temukan Barang Tak Terdaftar? Klik di Sini',
    unmappedSubtitleClosed: '+ Tambah item baru yang tidak ada dalam daftar sistem',
    barcodeFieldLabel: 'Barcode / UPC Fisik Barang',
    scanBarcodeCamera: 'Scan Barcode',
    searchingBarcode: 'Mencari master barcode...',
    itemFoundInMaster: 'Barang Ditemukan di Master WMS',
    itemNotInMaster: 'Barang Baru Tak Terdaftar di Master WMS',
    physicalPhotoRequired: 'Foto Fisik Wajib Diambil',
    takePhysicalPhotoBtn: 'Ambil Foto Fisik Barang',
    photoAttachedBtn: 'Foto Terlampir (Klik untuk ganti)',
    itemDescLabel: 'Keterangan / Nama Barang Fisik',
    itemDescPlaceholder: 'Ketik nama barang fisik temuan...',
    unmappedGoodQtyLabel: 'Jumlah Kondisi Baik (Qty Good)',
    unmappedBadStockCheck: 'Apakah ada sebagian yang Rusak/Bad Stock?',
    unmappedBadQtyLabel: 'Jumlah Rusak (Qty Bad)',
    saveUnmappedItemBtn: 'Simpan Barang Temuan',
    unmappedListHeader: 'Daftar Temuan di Rak Ini',

    // Bottom Action Bar
    saveAndNextBtn: 'Simpan & Lanjut Rak Berikutnya',
    saveAndFinishCountsheetBtn: 'Simpan & Selesai (Ke Countsheet) ➔',
    saveAndBackToList: 'Simpan & List',
    savingToCloud: 'Menyimpan ke Cloud...',
    sessionLockedByAdmin: 'Sesi Terkunci oleh Admin',
    unsavedExitTitle: 'Hasil Hitung Belum Disimpan!',
    unsavedExitMsg: 'Kamu memiliki inputan di rak ini yang belum disimpan ke Cloud. Yakin ingin keluar?',
    stayInRackBtn: 'Tetap di Rak Ini',
    exitWithoutSavingBtn: 'Keluar Tanpa Simpan',
  },
  en: {
    // Shared / Badges
    online: 'Online',
    offline: 'Offline (Local)',
    logout: 'Sign Out',
    cancel: 'Cancel',
    confirm: 'Proceed',
    round: 'Round',
    search: 'Search',

    // Step 1: Login
    loginTitle: 'Counter Account Login',
    loginSubtitle: 'Enter your assigned username & PIN',
    usernameLabel: 'Account Username',
    usernamePlaceholder: 'Enter username...',
    pinLabel: 'Account PIN',
    pinPlaceholder: 'Enter 4-digit PIN...',
    loginBtn: 'Sign In',
    loginLoading: 'Verifying Account...',
    loginOwnerAdminNote: 'Sign in with your field counter credentials.',

    // Step 2: Team Setup
    teamSetupTitle: 'Opname Team Setup',
    teamSetupSubtitle: 'Warehouse Assistant Info',
    teamSetupDesc: 'Before counting, please enter the name of the warehouse (WH) assistant accompanying you in this aisle.',
    primaryCounterLabel: 'Primary Counter (SO)',
    partnerLabel: 'Warehouse Assistant (WH)',
    partnerPlaceholder: 'Enter WH assistant name...',
    startOpnameBtn: 'Start Stock Opname',

    // Step 3: Countsheet List
    countsheetListTitle: 'Countsheet List',
    activeProjectPrefix: 'Active Session',
    tabAll: 'All',
    tabPending: 'Pending',
    tabInProgress: 'Process',
    tabCompleted: 'Done',
    searchRackPlaceholder: 'Search bin / rack (e.g. AA01)...',
    addRackBtn: 'Add Rack',
    noRacksAssigned: 'No racks assigned to this account.',
    emptyFilter: 'No racks found in this tab.',
    rackStatusPending: 'Pending',
    rackStatusCompleted: 'Completed',
    rackStatusInProgress: 'Counting',
    racksFinishedConfirmTitle: 'Confirm Counting Completion',
    racksFinishedConfirmBtn: 'Confirm All Racks Completed',
    sessionLockedBadge: 'Session Locked',
    sessionOpenBadge: 'Session Open',

    // Step 4: Count Detail
    backToCountsheet: 'Countsheet List',
    activeCounterText: 'Active Counter',
    scanBarcodeBtnTop: 'Camera Barcode Scan (Find / Add SKU)',
    draftRestoredMsg: 'Count draft restored from phone local storage.',
    dismiss: 'Dismiss',
    unmappedBadge: 'UNMAPPED',
    notCountedYet: 'Pending',
    damagedSummary: 'Damaged',
    upc1Label: 'UPC 1 (Unit/Pcs)',
    upc2Label: 'UPC 2 (Case/Carton)',
    barcodeScanHelper: 'Barcode Scan',

    expDateSystemLabel: 'System Expiry Date (FEFO)',
    sameAsSystemBtn: 'Same as System',
    nearestSystemEd: 'Nearest System ED',
    actualEdLabel: 'Actual Physical ED',
    edVariationsLabel: 'System ED Variations in this Bin',
    batchCountSuffix: 'Batch',

    goodConditionLabel: 'Good Condition (Qty Good)',
    badStockQuestion: 'Bad Stock Detected?',
    damagedQtyLabel: 'Damaged Qty (Qty Bad):',
    selectDamageCatLabel: 'Select Damage Categories (Multiple allowed):',
    doneEditingThisItem: 'Done Editing Item',

    // Step 4: Unmapped
    unmappedHeaderOpen: 'Physical Unmapped Item Entry Form',
    unmappedHeaderClosed: 'Found Unlisted Item? Tap Here',
    unmappedSubtitleClosed: '+ Add new physical item not listed in system',
    barcodeFieldLabel: 'Product Physical Barcode / UPC',
    scanBarcodeCamera: 'Scan Barcode',
    searchingBarcode: 'Searching master barcode...',
    itemFoundInMaster: 'Item Found in Master WMS',
    itemNotInMaster: 'New Item Not in Master WMS',
    physicalPhotoRequired: 'Physical Photo Evidence Required',
    takePhysicalPhotoBtn: 'Take Physical Product Photo',
    photoAttachedBtn: 'Photo Attached (Tap to change)',
    itemDescLabel: 'Physical Item Description / Name',
    itemDescPlaceholder: 'Type unmapped item description...',
    unmappedGoodQtyLabel: 'Good Condition Count (Qty Good)',
    unmappedBadStockCheck: 'Are any items Damaged / Bad Stock?',
    unmappedBadQtyLabel: 'Damaged Count (Qty Bad)',
    saveUnmappedItemBtn: 'Save Unmapped Item',
    unmappedListHeader: 'Unmapped Items in this Bin',

    // Bottom Action Bar
    saveAndNextBtn: 'Save & Proceed to Next Rack',
    saveAndFinishCountsheetBtn: 'Save & Finish (To Countsheet) ➔',
    saveAndBackToList: 'Save & List',
    savingToCloud: 'Saving to Cloud...',
    sessionLockedByAdmin: 'Session Locked by Admin',
    unsavedExitTitle: 'Unsaved Counts Detected!',
    unsavedExitMsg: 'You have entered counts in this rack that have not been synced to Cloud. Are you sure you want to exit?',
    stayInRackBtn: 'Stay in this Rack',
    exitWithoutSavingBtn: 'Exit Without Saving',
  }
};

/**
 * Mungil, elegan, dan ringan: tombol toggle bahasa [ ID | EN ]
 */
export function LanguageToggle({ className = '' }: { className?: string }) {
  const { lang, changeLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-black shadow-2xs select-none shrink-0 ${className}`}
      title={lang === 'id' ? 'Switch language to English' : 'Ganti bahasa ke Indonesia'}
    >
      <button
        type="button"
        onClick={() => changeLanguage('id')}
        className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
          lang === 'id'
            ? 'bg-white text-slate-900 shadow-xs font-black'
            : 'text-slate-500 hover:text-slate-800 font-semibold'
        }`}
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => changeLanguage('en')}
        className={`px-1.5 py-0.5 rounded-md transition-all cursor-pointer ${
          lang === 'en'
            ? 'bg-white text-cyan-900 shadow-xs font-black'
            : 'text-slate-500 hover:text-slate-800 font-semibold'
        }`}
      >
        EN
      </button>
    </div>
  );
}
