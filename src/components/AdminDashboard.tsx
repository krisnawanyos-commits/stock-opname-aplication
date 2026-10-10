import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import {
    collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs, query, orderBy, limit
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import emailjs from '@emailjs/browser';
import {
    Users, Database, Upload, ShieldCheck, Check, FileSpreadsheet,
    ChevronUp, Plus, Trash2, MapPin, Save,
    UserPlus, TrendingDown, SlidersHorizontal,
    CheckCircle2, XCircle, Search, Building2, DollarSign,
    Download, Scale, PlayCircle, ArrowLeft, AlertTriangle,
    LogOut, Contact, Eye, EyeOff, UserCheck, Clock, Store, Link2, KeyRound,
    Mail, Edit2, Smartphone, Lock, Unlock, Repeat, Copy, Tag, RefreshCw, HardDrive, Loader2, AlertCircle, X,
    ChevronLeft, ChevronRight, ChevronDown, Settings, Bell, LayoutDashboard, ArrowRightLeft,
    Printer, Shuffle, FileDown
} from 'lucide-react';
import type { UserRole } from '../types';

interface AdminDashboardProps {
    onBackToApp: () => void;
    onSwitchToCounterView?: () => void;
    currentUserRole?: UserRole;
    currentUserEmail?: string;
}

interface GlobalAccount {
    id: string;
    username: string;
    name: string;
    pin: string;
    email: string;
}

interface ProjectTeamMember {
    id?: string;
    projectId: string;
    username: string;
    role: UserRole;
}

interface MasterSKUItem {
    id?: string;
    Owner: string;
    SKU: string;
    Description: string;
    UPC1: string;
    UPC2: string;
    Status: string;
    Location: string;
    level: string;
    ailee: string;
    Zone: string;
    LocationType: string;
    counter: string;
    currentRound: number;
    satuanHitung: string;
    SKUBrand: string;
    expiredDateSystem: string;
    expiredDateActual: string;
    Qty: number;
    countedQty?: number;
    QTY_ACTUAL?: number | null;
    QTY_GOOD?: number | null;
    QTY_BAD?: number | null;
    qtyGood?: number;
    qtyBad?: number;
    Remarks: string;
    thirdPartyQty?: number;
    unitPrice?: number;
    isCounted?: boolean;
    round1Actual?: number;
    round2Actual?: number;
    round3Actual?: number;
    round1Counter?: string;
    round2Counter?: string;
    round3Counter?: string;
    previousCounter?: string;
    lastSwapBatchId?: string;
    isLocked?: boolean;
    counterPendamping?: string;
    partner?: string;
}

interface LocationOption {
    id: string;
    name: string;
    type: 'NON_CONSIGNMENT' | 'CONSIGNMENT';
}

interface ProjectSession {
    id: string;
    sessionCode: string;
    locationId: string;
    locationName: string;
    opnameDate: string;
    method: 'LIST_TO_FLOOR' | 'FLOOR_TO_LIST';
    status: 'LIVE_ACTIVE' | 'ARCHIVED';
    createdAt: string;
    currentRound?: number;
}

interface TabDefinition {
    id: string;
    label: string;
    icon: any;
    roles: UserRole[];
}

const ALL_AVAILABLE_TABS: TabDefinition[] = [
    { id: 'progress', label: 'Progress & Analytics', icon: LayoutDashboard, roles: ['owner', 'spv'] },
    { id: 'master', label: 'Master Task & Rak', icon: Database, roles: ['owner', 'spv'] },
    { id: 'sku_catalog', label: 'Master SKU Katalog', icon: Tag, roles: ['owner', 'spv'] },
    { id: 'recon', label: 'Recon & Recovery', icon: Scale, roles: ['owner', 'spv'] },
    { id: 'audit', label: 'Audit Trail Countsheet', icon: Clock, roles: ['owner', 'spv'] },
    { id: 'settings', label: 'Tim & Configurations', icon: SlidersHorizontal, roles: ['owner'] },
];

const SearchableSelect = ({ options, value, onChange, placeholder, className = "" }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));

    const foundOpt = options.find((o: any) => o.value.toLowerCase() === (value || '').toLowerCase());
    const selectedLabel = foundOpt ? foundOpt.label : (value && value !== 'unassigned' ? value : placeholder);

    return (
        <div className={`relative ${className}`}>
            <div className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none font-bold cursor-pointer flex justify-between items-center hover:bg-slate-50 transition-colors shadow-xs" onClick={() => setIsOpen(!isOpen)}>
                <span className={value ? "text-slate-800 truncate" : "text-slate-400 truncate"}>{selectedLabel}</span>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2 rotate-180" />
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearch(''); }}></div>
                    <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white/90 backdrop-blur-xs border-b border-slate-100 z-10">
                            <input type="text" autoFocus className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none" placeholder="Ketik pencarian..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <div className="py-1">
                            {options.length > 0 && <div className="px-3 py-2 text-[10px] font-extrabold text-indigo-400 bg-indigo-50/50 cursor-pointer hover:bg-indigo-50" onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}>-- Reset Pilihan --</div>}
                            {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
                                <div key={opt.value} className={`px-4 py-2.5 text-xs cursor-pointer hover:bg-indigo-50 transition-colors ${value === opt.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700 font-medium'}`} onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}>{opt.label}</div>
                            )) : (<div className="px-4 py-4 text-xs text-slate-400 text-center font-medium">Data tidak ditemukan</div>)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default function AdminDashboard({ onBackToApp, onSwitchToCounterView, currentUserRole = 'owner', currentUserEmail = 'yos.krisnawan@anymindgroup.com' }: AdminDashboardProps) {

    const effectiveRole: UserRole = currentUserRole === 'spv' ? 'spv' : 'owner';

    const [viewState, setViewState] = useState<'LANDING' | 'WIZARD_SETUP' | 'DASHBOARD'>('LANDING');
    const [landingTab, setLandingTab] = useState<'projects' | 'accounts'>('projects');
    const [projectToDelete, setProjectToDelete] = useState<ProjectSession | null>(null);

    const [activeTab, setActiveTab] = useState<string>('progress');
    const [orderedTabs, setOrderedTabs] = useState<TabDefinition[]>([]);

    const [selectedCounterForDetail, setSelectedCounterForDetail] = useState<string | null>(null);
    const [ktpSearch, setKtpSearch] = useState<string>('');
    const [counterSearch, setCounterSearch] = useState<string>('');
    const [catalogSearch, setCatalogSearch] = useState<string>('');
    const [masterTaskSearch, setMasterTaskSearch] = useState<string>('');

    // PAGINATION STATES (Pencegah Lag Memory)
    const [masterCurrentPage, setMasterCurrentPage] = useState<number>(1);
    const [catalogCurrentPage, setCatalogCurrentPage] = useState<number>(1);
    const [reconCurrentPage, setReconCurrentPage] = useState<number>(1);
    const ITEMS_PER_PAGE = 50;

    const [editingAccount, setEditingAccount] = useState<GlobalAccount | null>(null);
    const [assignUsername, setAssignUsername] = useState<string>('');
    const [assignRole, setAssignRole] = useState<UserRole>('counter');

    const [transferSourceCounter, setTransferSourceCounter] = useState<string | null>(null);
    const [transferTargetCounter, setTransferTargetCounter] = useState<string>('');

    // STATE RE-ASSIGN SISA RAK PENDING (BANTU TEMAN DI LIST TO FLOOR)
    const [reassignModal, setReassignModal] = useState<{
        isOpen: boolean;
        sourceCounter: string;
        targetCounter: string;
        selectedRacks: string[];
        searchRack: string;
    }>({
        isOpen: false,
        sourceCounter: '',
        targetCounter: '',
        selectedRacks: [],
        searchRack: '',
    });
    const [isReassignSubmitting, setIsReassignSubmitting] = useState<boolean>(false);

    const [isProjectLocked, setIsProjectLocked] = useState(false);
    const [lockedCounters, setLockedCounters] = useState<Record<string, boolean>>({});

    const [credentialsModalText, setCredentialsModalText] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [counterPartnersMap, setCounterPartnersMap] = useState<{ [counter: string]: string }>({});

    // UPLOAD PROGRESS & CANCEL REF
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; stepMessage?: string } | null>(null);
    const isUploadCancelledRef = useRef<boolean>(false);
    const isUploadingRef = useRef<boolean>(false);

    // DEPLOY & SWAP MODAL STATES
    const [deployModal, setDeployModal] = useState<{
        isOpen: boolean;
        sourceCounter: string;
        sourceRound: number;
        sourceDisputeCount: number;
        mode: 'KEEP' | 'SWAP' | 'ASSIGN';
        targetCounter: string;
        searchQuery: string;
    }>({
        isOpen: false,
        sourceCounter: '',
        sourceRound: 1,
        sourceDisputeCount: 0,
        mode: 'SWAP',
        targetCounter: '',
        searchQuery: ''
    });
    const [isDeploySubmitting, setIsDeploySubmitting] = useState<boolean>(false);
    const vendorFileInputRef = useRef<HTMLInputElement>(null);
    const [isVendorImporting, setIsVendorImporting] = useState<boolean>(false);
    const [lastSwapEvent, setLastSwapEvent] = useState<{
        swapId: string;
        sourceCounter: string;
        targetCounter: string;
        round: number;
        sourceItemIds: string[];
        targetItemIds: string[];
        timestamp: string;
    } | null>(null);

    // STATE KATEGORI BAD STOCK (CONFIGURABLE BY OWNER)
    const [badStockCategories, setBadStockCategories] = useState<string[]>(['Dus Penyok', 'Kemasan Bocor', 'Segel Rusak', 'Basah / Lembab', 'Barang Expired']);
    const [newCategoryInput, setNewCategoryInput] = useState<string>('');

    // DROPDOWN MENU KONTROL PIC COUNTER (FIXED VIEWPORT POPUP)
    const [menuAnchor, setMenuAnchor] = useState<{
        counter: string;
        top: number;
        right: number;
        isDropup: boolean;
    } | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (menuAnchor) setMenuAnchor(null);
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [menuAnchor]);

    useEffect(() => {
        setOrderedTabs(ALL_AVAILABLE_TABS.filter(tab => tab.roles.includes(effectiveRole)));
    }, [effectiveRole]);

    // RESET SCROLL KE ATAS SETIAP KALI GANTI SCREEN / PINDAH TAB
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, [viewState, activeTab]);

    const [gsheetWebhookUrl, setGsheetWebhookUrl] = useState<string>('');
    const [newWhName, setNewWhName] = useState<string>('');
    const [newStoreName, setNewStoreName] = useState<string>('');

    const [ownerNewName, setOwnerNewName] = useState<string>('Yos Krisnawan');
    const [ownerNewEmail, setOwnerNewEmail] = useState<string>(currentUserEmail || '');
    const [ownerNewPin, setOwnerNewPin] = useState<string>('');

    const [wizLocationId, setWizLocationId] = useState<string>('');
    const [wizOpnameDate, setWizOpnameDate] = useState<string>('2026-09-22');
    const [wizSessionCode, setWizSessionCode] = useState<string>('SO-WRG-2026-09');
    const [wizMethod, setWizMethod] = useState<'LIST_TO_FLOOR' | 'FLOOR_TO_LIST'>('LIST_TO_FLOOR');

    const [showToast, setShowToast] = useState<string | null>(null);
    const triggerNotification = (message: string) => { setShowToast(message); setTimeout(() => setShowToast(null), 4000); };

    const [showLevelProgress, setShowLevelProgress] = useState<boolean>(false);
    const [viewRoundFilter, setViewRoundFilter] = useState<'overall' | 1 | 2 | 3 | 4>('overall');
    const [brandSearch, setBrandSearch] = useState<string>('');
    const [brandStatusFilter, setBrandStatusFilter] = useState<'all' | 'selisih' | 'match' | 'uncounted'>('all');
    const [expandedBrandDetail, setExpandedBrandDetail] = useState<{ [brand: string]: boolean }>({});
    const [recoveryAdjustments, setRecoveryAdjustments] = useState<{ [sku: string]: number }>({});
    const [initialFileToUpload, setInitialFileToUpload] = useState<File | null>(null);

    const [globalAccounts, setGlobalAccounts] = useState<GlobalAccount[]>([]);
    const [projectHistory, setProjectHistory] = useState<ProjectSession[]>([]);
    const [allProjectTeams, setAllProjectTeams] = useState<ProjectTeamMember[]>([]);
    const [warehouseList, setWarehouseList] = useState<LocationOption[]>([]);
    const [consignmentStoreList, setConsignmentStoreList] = useState<LocationOption[]>([]);
    const [activeProject, setActiveProject] = useState<ProjectSession | null>(null);
    const [masterDataList, setMasterDataList] = useState<MasterSKUItem[]>([]);
    const [catalogDataList, setCatalogDataList] = useState<any[]>([]);

    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, "global_accounts"), (snap) => setGlobalAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as GlobalAccount))));
        const unsub2 = onSnapshot(collection(db, "projects"), (snap) => setProjectHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectSession))));
        const unsub3 = onSnapshot(collection(db, "project_teams"), (snap) => setAllProjectTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectTeamMember))));
        const unsub4 = onSnapshot(collection(db, "warehouses"), (snap) => setWarehouseList(snap.docs.map(d => ({ id: d.id, ...d.data() } as LocationOption))));
        const unsub5 = onSnapshot(collection(db, "consignment_stores"), (snap) => setConsignmentStoreList(snap.docs.map(d => ({ id: d.id, ...d.data() } as LocationOption))));

        const unsubOwner = onSnapshot(doc(db, "owner_profile", "owner_default"), (snap) => {
            if (snap.exists()) {
                const oData = snap.data();
                if (oData.name) setOwnerNewName(oData.name);
                if (oData.email) setOwnerNewEmail(oData.email);
            }
        });

        const unsubBadStock = onSnapshot(doc(db, "settings", "bad_stock_config"), (snap) => {
            if (snap.exists() && snap.data().categories) {
                setBadStockCategories(snap.data().categories);
            }
        });

        const qAuditLatest = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(100));
        const unsubAudit = onSnapshot(qAuditLatest, (snap) => {
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setAuditLogs(logs);
        });

        let catalogTimer: any = null;
        const unsubCatalog = onSnapshot(collection(db, "sku_catalog"), (snap) => {
            if (isUploadingRef.current) return;
            if (catalogTimer) clearTimeout(catalogTimer);
            catalogTimer = setTimeout(() => {
                setCatalogDataList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }, 250);
        });

        const unsubPartners = onSnapshot(collection(db, "counter_partners"), (snap) => {
            const map: { [c: string]: string } = {};
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.counter && data.partner) {
                    map[data.counter.toLowerCase().trim()] = data.partner;
                }
            });
            setCounterPartnersMap(map);
        });

        return () => { 
            if (catalogTimer) clearTimeout(catalogTimer);
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsubOwner(); unsubBadStock(); unsubAudit(); unsubCatalog(); unsubPartners();
        };
    }, []);

    const handleAddBadStockCategory = async () => {
        if (!newCategoryInput.trim()) return;
        const cleanCat = newCategoryInput.trim();
        if (badStockCategories.includes(cleanCat)) {
            triggerNotification('Kategori tersebut sudah ada.');
            return;
        }
        const updated = [...badStockCategories, cleanCat];
        await setDoc(doc(db, "settings", "bad_stock_config"), { categories: updated }, { merge: true });
        setNewCategoryInput('');
        triggerNotification(`Kategori Bad Stock "${cleanCat}" ditambahkan!`);
    };

    const handleRemoveBadStockCategory = async (catToRemove: string) => {
        const updated = badStockCategories.filter(c => c !== catToRemove);
        await setDoc(doc(db, "settings", "bad_stock_config"), { categories: updated }, { merge: true });
        triggerNotification(`Kategori "${catToRemove}" dihapus.`);
    };

    const combinedLocationOptions = [
        ...warehouseList.map(w => ({ value: w.id, label: `[Gudang WMS] ${w.name}` })),
        ...consignmentStoreList.map(s => ({ value: s.id, label: `[Store Offline] ${s.name}` }))
    ];

    const handleDownloadFullDatabaseBackupJSON = () => {
        if (masterDataList.length === 0) {
            triggerNotification("Tidak ada data untuk dibackup.");
            return;
        }

        const fullBackupData = {
            backupDate: new Date().toISOString(),
            project: activeProject,
            masterTasks: masterDataList,
            auditTrailLogs: auditLogs,
            teamMembers: activeTeamMembers
        };

        const jsonString = JSON.stringify(fullBackupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = url;
        downloadAnchor.download = `EMERGENCY_BACKUP_NOCTUS_${activeProject?.sessionCode || 'PROJECT'}_${Date.now()}.json`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        URL.revokeObjectURL(url);

        triggerNotification("🛡️ Backup Cloud JSON Berhasil Diunduh!");
    };

    const handleRestoreDatabaseFromJSON = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target?.result as string);
                if (!backup.masterTasks || !Array.isArray(backup.masterTasks)) {
                    triggerNotification("File JSON tidak valid!");
                    return;
                }

                triggerNotification("Memulihkan data dari JSON...");

                const CHUNK = 400;
                const tasks = backup.masterTasks;
                for (let i = 0; i < tasks.length; i += CHUNK) {
                    const chunk = tasks.slice(i, i + CHUNK);
                    const taskBatch = writeBatch(db);
                    chunk.forEach((task: any) => {
                        const taskRef = doc(db, "master_tasks", task.id);
                        taskBatch.set(taskRef, task, { merge: true });
                    });
                    await taskBatch.commit();
                }

                triggerNotification("✅ PEMULIHAN SUKSES! Seluruh data berhasil dipulihkan!");
            } catch (err: any) {
                console.error("Restore Error:", err);
                triggerNotification("Gagal memulihkan database.");
            }
        };
        reader.readAsText(file);
    };

    const handleUpdateOwnerAccount = async () => {
        if (!ownerNewEmail.trim() || !ownerNewPin.trim()) {
            triggerNotification('Email dan PIN Baru (4-Digit) wajib diisi.');
            return;
        }

        try {
            await setDoc(doc(db, "owner_profile", "owner_default"), {
                name: ownerNewName.trim() || 'Yos Krisnawan',
                email: ownerNewEmail.trim(),
                pin: ownerNewPin.trim(),
                updatedAt: new Date().toISOString()
            }, { merge: true });

            setOwnerNewPin('');
            triggerNotification('Profil & PIN Baru Owner Berhasil Diperbarui!');
        } catch (err: any) {
            console.error("Update Owner Profile Error:", err);
            triggerNotification('Gagal memperbarui profil owner.');
        }
    };

    const handleSaveEditedGlobalAccount = async () => {
        if (!editingAccount) return;
        const uName = editingAccount.username.toLowerCase().trim();
        await setDoc(doc(db, "global_accounts", uName), {
            username: uName,
            name: editingAccount.name,
            email: editingAccount.email,
            pin: editingAccount.pin || '1234'
        }, { merge: true });
        setEditingAccount(null);
        triggerNotification(`Akun KTP ${uName} berhasil diperbarui!`);
    };

    const handleUploadBulkKTPAccounts = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                if (json.length === 0) {
                    triggerNotification("File KTP kosong atau format salah.");
                    return;
                }

                const CHUNK = 400;
                let count = 0;
                for (let i = 0; i < json.length; i += CHUNK) {
                    const chunk = json.slice(i, i + CHUNK);
                    const batch = writeBatch(db);

                    chunk.forEach((row: any) => {
                        const uName = (row['Username'] || row['username'] || row['USERNAME'] || '').toString().toLowerCase().trim();
                        const name = (row['Nama'] || row['Name'] || row['NAMA'] || uName).toString().trim();
                        const pin = (row['PIN'] || row['Pin'] || row['pin'] || '1234').toString().trim();
                        const email = (row['Email'] || row['email'] || `${uName}@anymindgroup.com`).toString().trim();

                        if (uName) {
                            const accRef = doc(db, "global_accounts", uName);
                            batch.set(accRef, {
                                username: uName,
                                name: name,
                                pin: pin,
                                email: email,
                                role: 'counter'
                            }, { merge: true });
                            count++;
                        }
                    });

                    await batch.commit();
                }
                triggerNotification(`Berhasil upload ${count} Akun KTP Cloud Massal!`);
            } catch (err: any) {
                console.error("Bulk KTP Upload Error:", err);
                triggerNotification("Gagal upload KTP Massal. Periksa format file.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadKTPTemplate = () => {
        const template = [
            { Username: 'bambang.so', Nama: 'Bambang Sudrajat', PIN: '1234', Email: 'bambang@anymindgroup.com' },
            { Username: 'budi.so', Nama: 'Budi Prasetyo', PIN: '1234', Email: 'budi@anymindgroup.com' }
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template_KTP_Cloud");
        XLSX.writeFile(wb, "Template_Import_KTP_Massal.xlsx");
        triggerNotification("Template Import KTP (.xlsx) diunduh!");
    };

    const handleGenerateCredentialsText = () => {
        if (globalAccounts.length === 0) {
            triggerNotification("Belum ada KTP terdaftar.");
            return;
        }

        let text = "📋 *DAFTAR KREDENSIAL LOGIN NOCTUS COUNT*\n\n";
        globalAccounts.forEach((acc, i) => {
            text += `${i + 1}. *${acc.name}*\n   Username: \`${acc.username}\`\n   PIN: \`${acc.pin}\`\n\n`;
        });

        setCredentialsModalText(text);
    };

    useEffect(() => {
        if (!activeProject) return;

        const qTasks = collection(db, "master_tasks");
        let updateTimer: any = null;

        const unsubscribe = onSnapshot(qTasks, (snapshot) => {
            if (isUploadingRef.current) return; // Cegah UI freeze & re-render berlebihan saat upload massal berlangsung
            if (updateTimer) clearTimeout(updateTimer);

            updateTimer = setTimeout(() => {
                const taskList: MasterSKUItem[] = snapshot.docs.map(docSnap => {
                    const data = docSnap.data();

                    const gQty = data.QTY_GOOD ?? data.qtyGood;
                    const bQty = data.QTY_BAD ?? data.qtyBad;

                    const rawActQty = data.QTY_ACTUAL ?? data.countedQty;
                    const numActQty = parseInt(rawActQty, 10);

                    const isCounted = !!data.isCounted || (rawActQty !== undefined && rawActQty !== null && !isNaN(numActQty));

                    const calcGood = gQty !== undefined ? parseInt(gQty, 10) : (isCounted ? (isNaN(numActQty) ? 0 : numActQty) : 0);
                    const calcBad = bQty !== undefined ? parseInt(bQty, 10) : 0;
                    const totalActualCalculated = calcGood + calcBad;

                    return {
                        id: docSnap.id,
                        Owner: data.Owner || 'DDI',
                        SKU: data.SKU || '',
                        Description: data.Description || data.name || '',
                        UPC1: data.UPC1 || '',
                        UPC2: data.UPC2 || '',
                        SKUBrand: data.SKUBrand || '',
                        satuanHitung: data.satuanHitung || 'PCS',
                        Location: data.Location || '',
                        level: data.level || '1',
                        ailee: data.ailee || '',
                        Zone: data.Zone || 'RACKING',
                        LocationType: data.LocationType || 'RACK',
                        counter: (data.counter || 'Unassigned').toLowerCase().trim(),
                        Status: data.Status || 'Active',
                        currentRound: parseInt(data.currentRound, 10) || 1,
                        expiredDateSystem: data.expiredDateSystem || '',
                        expiredDateActual: data.expDateActual || data.expiredDateActual || '',
                        Qty: parseInt(data.Qty || data.QTY_SYSTEM) || 0,
                        countedQty: isCounted ? totalActualCalculated : undefined,
                        QTY_ACTUAL: isCounted ? totalActualCalculated : null,
                        qtyGood: isCounted ? calcGood : undefined,
                        qtyBad: isCounted ? calcBad : undefined,
                        Remarks: data.badRemarks || data.Remarks || '',
                        isCounted: !!isCounted,
                        unitPrice: parseInt(data.unitPrice) || 0,
                        round1Actual: data.round1Actual,
                        round2Actual: data.round2Actual
                    };
                });

                if (taskList.length > 0) {
                    setMasterDataList(taskList);
                }
            }, 250);
        });

        const lockDocId = activeProject.sessionCode || activeProject.id;
        const lockUnsubscribe = onSnapshot(doc(db, "round_locks", lockDocId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setIsProjectLocked(data.status === 'LOCKED');
                setLockedCounters(data.lockedCounters || {});
            } else {
                setIsProjectLocked(false);
                setLockedCounters({});
            }
        });

        return () => {
            if (updateTimer) clearTimeout(updateTimer);
            unsubscribe();
            lockUnsubscribe();
        };
    }, [activeProject]);

    const handleOpenDeployModal = (targetCounter: string) => {
        if (effectiveRole === 'spv') {
            triggerNotification('Hanya Super Admin/Owner yang memiliki hak deploy ronde.');
            return;
        }

        if (!activeProject) return;
        const cleanCounter = targetCounter.toLowerCase().trim();

        const counterTasks = masterDataList.filter(item => item.counter === cleanCounter);
        if (counterTasks.length === 0) {
            triggerNotification(`Tidak ada task ditemukan untuk counter ${cleanCounter}.`);
            return;
        }

        const currentCounterRound = Math.max(...counterTasks.map(t => t.currentRound || 1));

        if (currentCounterRound >= 3) {
            triggerNotification(`Counter "${cleanCounter}" sudah mencapai Ronde 3 Maksimal.`);
            return;
        }

        const cData = counterGroups[cleanCounter];
        const is100PctDone = cData && cData.total > 0 && cData.counted === cData.total;
        if (!is100PctDone) {
            triggerNotification(`Counter "${cleanCounter}" belum menyelesaikan 100% hitungan Ronde ${currentCounterRound} (${cData?.counted || 0}/${cData?.total || 0} SKU).`);
            return;
        }

        const disputeTasks = counterTasks.filter(item => {
            const act = item.countedQty ?? item.Qty;
            if (currentCounterRound === 2 && item.round1Actual !== undefined && act === item.round1Actual) {
                return false;
            }
            return item.isCounted && act !== item.Qty;
        });

        if (disputeTasks.length === 0) {
            triggerNotification(`Tidak ada SKU selisih ditemukan pada counter ${cleanCounter}. Semua match!`);
            return;
        }

        setDeployModal({
            isOpen: true,
            sourceCounter: cleanCounter,
            sourceRound: currentCounterRound,
            sourceDisputeCount: disputeTasks.length,
            mode: 'SWAP',
            targetCounter: '',
            searchQuery: ''
        });
    };

    const handleExecuteDeploy = async () => {
        if (!activeProject || isDeploySubmitting) return;
        const { sourceCounter, sourceRound, mode, targetCounter } = deployModal;
        const nextRound = sourceRound + 1;
        const timestampNow = new Date().toISOString();
        const swapBatchId = `SWAP_${Date.now()}`;

        setIsDeploySubmitting(true);
        try {
            const sourceTasks = masterDataList.filter(m => m.counter === sourceCounter);
            const sourceDispute = sourceTasks.filter(item => {
                const act = item.countedQty ?? item.Qty;
                const isR2MatchR1 = (sourceRound === 2 && item.round1Actual !== undefined && act === item.round1Actual);
                return item.isCounted && act !== item.Qty && !isR2MatchR1;
            });

            const updates: { ref: any; data: any }[] = [];
            const auditEntries: { ref: any; data: any }[] = [];

            if (mode === 'KEEP' || !targetCounter) {
                sourceTasks.forEach(item => {
                    if (!item.id) return;
                    const ref = doc(db, "master_tasks", item.id);
                    const act = item.countedQty ?? item.Qty;
                    const isR2MatchR1 = (sourceRound === 2 && item.round1Actual !== undefined && act === item.round1Actual);

                    if (item.isCounted && act !== item.Qty && !isR2MatchR1) {
                        updates.push({
                            ref,
                            data: {
                                currentRound: nextRound,
                                QTY_ACTUAL: null,
                                QTY_GOOD: null,
                                QTY_BAD: null,
                                isCounted: false,
                                [`round${sourceRound}Actual`]: act,
                                [`round${sourceRound}Counter`]: sourceCounter,
                                updatedAt: timestampNow
                            }
                        });

                        const logId = `${activeProject.sessionCode}_DEPLOY_R${nextRound}_${sourceCounter}_${item.SKU}_${item.Location}`;
                        auditEntries.push({
                            ref: doc(db, "audit_logs", logId),
                            data: {
                                timestamp: timestampNow,
                                rackLocation: item.Location,
                                ownerSku: item.Owner || 'DDI',
                                sku: item.SKU,
                                description: item.Description,
                                upc1: item.UPC1 || '-',
                                upc2: item.UPC2 || '-',
                                counterPic: sourceCounter,
                                round: nextRound,
                                qtyGood: 0,
                                qtyBad: 0,
                                totalFinalSubmitted: 0,
                                edActual: '-',
                                remarks: `[DEPLOY R${nextRound} PIC: ${sourceCounter}] Di-reset untuk hitung ulang karena selisih R${sourceRound} (Act: ${act} vs WMS: ${item.Qty})`
                            }
                        });
                    } else {
                        updates.push({
                            ref,
                            data: { isLocked: true, updatedAt: timestampNow }
                        });
                    }
                });
            } else if (mode === 'ASSIGN') {
                // ASSIGN MODE: Hanya memindahkan task selisih sourceCounter ke targetCounter. Task targetCounter tidak disentuh.
                sourceTasks.forEach(item => {
                    if (!item.id) return;
                    const ref = doc(db, "master_tasks", item.id);
                    const act = item.countedQty ?? item.Qty;
                    const isR2MatchR1 = (sourceRound === 2 && item.round1Actual !== undefined && act === item.round1Actual);

                    if (item.isCounted && act !== item.Qty && !isR2MatchR1) {
                        updates.push({
                            ref,
                            data: {
                                counter: targetCounter,
                                currentRound: nextRound,
                                QTY_ACTUAL: null,
                                QTY_GOOD: null,
                                QTY_BAD: null,
                                isCounted: false,
                                [`round${sourceRound}Actual`]: act,
                                [`round${sourceRound}Counter`]: sourceCounter,
                                previousCounter: sourceCounter,
                                lastSwapBatchId: swapBatchId,
                                updatedAt: timestampNow
                            }
                        });

                        const logId = `${activeProject.sessionCode}_ASSIGN_R${nextRound}_${sourceCounter}_TO_${targetCounter}_${item.SKU}_${item.Location}`;
                        auditEntries.push({
                            ref: doc(db, "audit_logs", logId),
                            data: {
                                timestamp: timestampNow,
                                rackLocation: item.Location,
                                ownerSku: item.Owner || 'DDI',
                                sku: item.SKU,
                                description: item.Description,
                                upc1: item.UPC1 || '-',
                                upc2: item.UPC2 || '-',
                                counterPic: targetCounter,
                                round: nextRound,
                                qtyGood: 0,
                                qtyBad: 0,
                                totalFinalSubmitted: 0,
                                edActual: '-',
                                remarks: `[CROSS ASSIGN R${nextRound}] Selisih dari ${sourceCounter} ditugaskan ke ${targetCounter} untuk audit independen`
                            }
                        });
                    } else {
                        updates.push({
                            ref,
                            data: { isLocked: true, updatedAt: timestampNow }
                        });
                    }
                });
            } else {
                // SWAP MODE (2-Arah)
                // 1. Pindahkan selisih sourceTasks ke targetCounter
                sourceTasks.forEach(item => {
                    if (!item.id) return;
                    const ref = doc(db, "master_tasks", item.id);
                    const act = item.countedQty ?? item.Qty;
                    const isR2MatchR1 = (sourceRound === 2 && item.round1Actual !== undefined && act === item.round1Actual);

                    if (item.isCounted && act !== item.Qty && !isR2MatchR1) {
                        updates.push({
                            ref,
                            data: {
                                counter: targetCounter,
                                currentRound: nextRound,
                                QTY_ACTUAL: null,
                                QTY_GOOD: null,
                                QTY_BAD: null,
                                isCounted: false,
                                [`round${sourceRound}Actual`]: act,
                                [`round${sourceRound}Counter`]: sourceCounter,
                                previousCounter: sourceCounter,
                                lastSwapBatchId: swapBatchId,
                                updatedAt: timestampNow
                            }
                        });

                        const logId = `${activeProject.sessionCode}_SWAP_R${nextRound}_${sourceCounter}_TO_${targetCounter}_${item.SKU}_${item.Location}`;
                        auditEntries.push({
                            ref: doc(db, "audit_logs", logId),
                            data: {
                                timestamp: timestampNow,
                                rackLocation: item.Location,
                                ownerSku: item.Owner || 'DDI',
                                sku: item.SKU,
                                description: item.Description,
                                upc1: item.UPC1 || '-',
                                upc2: item.UPC2 || '-',
                                counterPic: targetCounter,
                                round: nextRound,
                                qtyGood: 0,
                                qtyBad: 0,
                                totalFinalSubmitted: 0,
                                edActual: '-',
                                remarks: `[MUTUAL SWAP R${nextRound}] Dari ${sourceCounter} dipindahkan ke ${targetCounter} karena selisih R${sourceRound}`
                            }
                        });
                    } else {
                        updates.push({
                            ref,
                            data: { isLocked: true, updatedAt: timestampNow }
                        });
                    }
                });

                // 2. Periksa tugas targetCounter
                const targetTasks = masterDataList.filter(m => m.counter === targetCounter);
                const targetDisputeInNextRound = targetTasks.filter(item => item.currentRound === nextRound && !item.isCounted);
                const targetDisputeInSourceRound = targetTasks.filter(item => {
                    const act = item.countedQty ?? item.Qty;
                    const isR2MatchR1 = (sourceRound === 2 && item.round1Actual !== undefined && act === item.round1Actual);
                    return item.isCounted && act !== item.Qty && !isR2MatchR1;
                });

                if (targetDisputeInNextRound.length > 0) {
                    // Partner sudah di nextRound: tukar task dispute nextRound miliknya ke sourceCounter
                    targetDisputeInNextRound.forEach(item => {
                        if (!item.id) return;
                        const ref = doc(db, "master_tasks", item.id);
                        updates.push({
                            ref,
                            data: {
                                counter: sourceCounter,
                                previousCounter: targetCounter,
                                lastSwapBatchId: swapBatchId,
                                updatedAt: timestampNow
                            }
                        });
                    });
                } else if (targetDisputeInSourceRound.length > 0) {
                    // Partner masih di sourceRound: naikkan dan tukar ke sourceCounter
                    targetTasks.forEach(item => {
                        if (!item.id) return;
                        const ref = doc(db, "master_tasks", item.id);
                        const act = item.countedQty ?? item.Qty;
                        const isR2MatchR1 = (sourceRound === 2 && item.round1Actual !== undefined && act === item.round1Actual);

                        if (item.isCounted && act !== item.Qty && !isR2MatchR1) {
                            updates.push({
                                ref,
                                data: {
                                    counter: sourceCounter,
                                    currentRound: nextRound,
                                    QTY_ACTUAL: null,
                                    QTY_GOOD: null,
                                    QTY_BAD: null,
                                    isCounted: false,
                                    [`round${sourceRound}Actual`]: act,
                                    [`round${sourceRound}Counter`]: targetCounter,
                                    previousCounter: targetCounter,
                                    lastSwapBatchId: swapBatchId,
                                    updatedAt: timestampNow
                                }
                            });
                        } else if (item.currentRound === sourceRound) {
                            updates.push({
                                ref,
                                data: { isLocked: true, updatedAt: timestampNow }
                            });
                        }
                    });
                }

                setLastSwapEvent({
                    swapId: swapBatchId,
                    sourceCounter,
                    targetCounter,
                    round: nextRound,
                    sourceItemIds: sourceDispute.map(d => d.id!),
                    targetItemIds: (targetDisputeInNextRound.length > 0 ? targetDisputeInNextRound : targetDisputeInSourceRound).map(d => d.id!),
                    timestamp: timestampNow
                });
            }

            // Commit in safe chunks of 400
            const allOps = [...updates, ...auditEntries];
            const CHUNK_SIZE = 400;
            for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
                const chunk = allOps.slice(i, i + CHUNK_SIZE);
                const b = writeBatch(db);
                chunk.forEach(op => {
                    if (op.data.remarks) {
                        b.set(op.ref, op.data, { merge: true });
                    } else {
                        b.update(op.ref, op.data);
                    }
                });
                await b.commit();
            }

            setDeployModal(prev => ({ ...prev, isOpen: false }));
            if (mode === 'SWAP' && targetCounter) {
                triggerNotification(`🚀 SWAP 2-ARAH BERHASIL! Ronde ${nextRound}: ${sourceCounter} ⇄ ${targetCounter} saling bertukar task.`);
            } else if (mode === 'ASSIGN' && targetCounter) {
                triggerNotification(`🚀 PENUGASAN BERHASIL! Selisih ${sourceCounter} dialihkan ke ${targetCounter} untuk Ronde ${nextRound}.`);
            } else {
                triggerNotification(`🚀 Ronde ${nextRound} Berhasil Dideploy untuk ${sourceCounter}!`);
            }
        } catch (err: any) {
            console.error("Deploy/Swap Error:", err);
            triggerNotification(`Gagal deploy ronde: ${err.message || String(err)}`);
        } finally {
            setIsDeploySubmitting(false);
        }
    };

    // FITUR CETAK COUNTSHEET LAPANGAN (BLIND COUNT - SYSTEM QTY & HARGA 100% DISEMBUNYIKAN)
    const handlePrintCountsheet = (selectedCounter?: string, roundNumber: number = 1) => {
        if (!masterDataList || masterDataList.length === 0) {
            triggerNotification("Tidak ada data SKU untuk dicetak!");
            return;
        }

        const project = activeProject;
        const printWindow = window.open('', '_blank', 'width=1150,height=950');
        if (!printWindow) {
            triggerNotification("Gagal membuka jendela cetak. Pastikan izin pop-up browser aktif.");
            return;
        }

        const countersToPrint = selectedCounter
            ? [selectedCounter]
            : Array.from(new Set(masterDataList.map(m => m.counter))).filter(Boolean).sort();

        let pagesHtml = '';

        countersToPrint.forEach(cName => {
            let tasks = masterDataList.filter(m => m.counter === cName);
            if (roundNumber > 1) {
                tasks = tasks.filter(m => m.currentRound === roundNumber || (m.currentRound >= roundNumber && !m.isLocked));
            }

            if (tasks.length === 0 && selectedCounter) return;

            tasks.sort((a, b) => (a.Location || '').localeCompare(b.Location || '') || (a.SKU || '').localeCompare(b.SKU || ''));

            const rowsHtml = tasks.map((item, tIdx) => `
                <tr>
                    <td style="text-align: center; font-weight: bold;">${tIdx + 1}</td>
                    <td style="text-align: center; font-weight: 600;">${item.Zone || '-'}</td>
                    <td style="font-weight: bold; font-family: monospace;">${item.Location || '-'}</td>
                    <td style="text-align: center; font-weight: 600;">${item.level || '-'}</td>
                    <td style="font-weight: bold; font-family: monospace;">${item.SKU}</td>
                    <td style="font-family: monospace; font-size: 8px;">${item.UPC1 || '-'}</td>
                    <td style="font-family: monospace; font-size: 8px;">${item.UPC2 || '-'}</td>
                    <td style="font-size: 8.5px; word-break: break-word;">${item.Description || '-'}</td>
                    <td style="text-align: center; font-size: 8px;">${item.expiredDateSystem || item.expiredDateActual || '-'}</td>
                    <td style="text-align: center; font-weight: 600;">${item.satuanHitung || 'PCS'}</td>
                    <td style="height: 25px; min-width: 65px; background-color: #fafafa;"></td>
                    <td style="height: 25px; min-width: 50px;"></td>
                </tr>
            `).join('');

            pagesHtml += `
                <div class="sheet-page">
                    <div class="header-container">
                        <div class="header-left">
                            <h2 class="doc-title">LEMBAR KERJA STOCK OPNAME (${roundNumber === 1 ? 'BLIND COUNT' : `RECOUNT RONDE ${roundNumber}`})</h2>
                            <div class="sub-meta">
                                <span><b>Sesi:</b> ${project?.sessionCode || 'SO-360'}</span> | 
                                <span><b>Lokasi:</b> ${project?.locationName || 'Gudang Utama'}</span> | 
                                <span><b>Tanggal:</b> ${project?.opnameDate || new Date().toISOString().split('T')[0]}</span>
                            </div>
                        </div>
                        <div class="header-right">
                            <div class="counter-badge">
                                <span class="badge-label">PETUGAS / PIC:</span>
                                <span class="badge-name">${cName.toUpperCase()}</span>
                            </div>
                            <div class="round-badge">RONDE ${roundNumber}</div>
                        </div>
                    </div>

                    <div class="notice-bar">
                        ⚠️ <b>PERHATIAN AUDIT:</b> Lakukan penghitungan fisik murni (Blind Count). Tulis angka hasil hitungan fisik secara teliti dan bubuhkan paraf.
                    </div>

                    <table class="count-table">
                        <thead>
                            <tr>
                                <th style="width: 24px; text-align: center;">NO</th>
                                <th style="width: 44px; text-align: center;">ZONE</th>
                                <th style="width: 70px;">LOKASI / RAK</th>
                                <th style="width: 34px; text-align: center;">LEVEL</th>
                                <th style="width: 90px;">BARCODE / SKU</th>
                                <th style="width: 72px;">UPC 1</th>
                                <th style="width: 72px;">UPC 2</th>
                                <th>DESKRIPSI PRODUK</th>
                                <th style="width: 62px; text-align: center;">EXP DATE</th>
                                <th style="width: 36px; text-align: center;">UOM</th>
                                <th style="width: 75px; text-align: center; background-color: #e2e8f0;">FISIK AKTUAL</th>
                                <th style="width: 55px; text-align: center;">PARAF / KET</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="12" style="text-align: center; padding: 20px;">Tidak ada item task untuk PIC ini di ronde ini.</td></tr>'}
                        </tbody>
                    </table>

                    <div class="sig-container">
                        <div class="sig-box">
                            <div class="sig-title">Petugas Penghitung (Internal)</div>
                            <div class="sig-line"></div>
                            <div class="sig-name">${cName}</div>
                        </div>
                        <div class="sig-box">
                            <div class="sig-title">Counter Vendor</div>
                            <div class="sig-line"></div>
                            <div class="sig-name">(........................................)</div>
                        </div>
                    </div>
                </div>
            `;
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Countsheet SO - ${selectedCounter ? selectedCounter.toUpperCase() : 'All Counters'} - R${roundNumber}</title>
                <style>
                    @page { 
                        size: A4 portrait; 
                        margin: 8mm 6mm 8mm 6mm; 
                    }
                    * { 
                        box-sizing: border-box; 
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                        font-size: 9.5px;
                        color: #0f172a;
                        margin: 0;
                        padding: 0;
                        background: #f1f5f9;
                        -webkit-font-smoothing: antialiased;
                    }

                    /* Top Toolbar (Screen Only) */
                    .screen-toolbar {
                        position: sticky;
                        top: 0;
                        z-index: 999;
                        background: #0f172a;
                        color: #fff;
                        padding: 10px 24px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.18);
                    }
                    .toolbar-content {
                        max-width: 950px;
                        margin: 0 auto;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 15px;
                    }
                    .toolbar-title {
                        font-size: 13px;
                        font-weight: 800;
                        letter-spacing: -0.2px;
                    }
                    .toolbar-hint {
                        font-size: 10px;
                        color: #94a3b8;
                        margin-left: 10px;
                    }
                    .toolbar-actions {
                        display: flex;
                        gap: 8px;
                    }
                    .btn-print {
                        background: #2563eb;
                        color: #fff;
                        border: none;
                        padding: 7px 16px;
                        font-size: 12px;
                        font-weight: 800;
                        border-radius: 8px;
                        cursor: pointer;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        box-shadow: 0 2px 6px rgba(37,99,235,0.3);
                    }
                    .btn-print:hover { background: #1d4ed8; }
                    .btn-close {
                        background: #334155;
                        color: #cbd5e1;
                        border: none;
                        padding: 7px 14px;
                        font-size: 12px;
                        font-weight: 700;
                        border-radius: 8px;
                        cursor: pointer;
                    }
                    .btn-close:hover { background: #475569; color: #fff; }

                    /* Page Canvas */
                    .pages-wrapper {
                        padding: 20px 10px 40px 10px;
                    }
                    .sheet-page {
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0 auto 25px auto;
                        background: #fff;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                        border-radius: 4px;
                        padding: 12mm 10mm;
                        box-sizing: border-box;
                    }

                    .header-container {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 6px;
                        margin-bottom: 6px;
                    }
                    .doc-title {
                        font-size: 13px;
                        font-weight: 900;
                        margin: 0 0 3px 0;
                        letter-spacing: -0.2px;
                        text-transform: uppercase;
                    }
                    .sub-meta {
                        font-size: 9px;
                        color: #475569;
                    }
                    .header-right {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .counter-badge {
                        border: 1.5px solid #0f172a;
                        padding: 3px 8px;
                        border-radius: 6px;
                        text-align: right;
                    }
                    .badge-label {
                        font-size: 7.5px;
                        font-weight: bold;
                        color: #64748b;
                        display: block;
                    }
                    .badge-name {
                        font-size: 11px;
                        font-weight: 900;
                        color: #0f172a;
                    }
                    .round-badge {
                        background: #0f172a;
                        color: #fff;
                        font-weight: 900;
                        font-size: 9.5px;
                        padding: 4px 8px;
                        border-radius: 6px;
                    }
                    .notice-bar {
                        background: #f8fafc;
                        border: 1px dashed #cbd5e1;
                        padding: 4px 8px;
                        border-radius: 6px;
                        font-size: 8px;
                        color: #334155;
                        margin-bottom: 6px;
                    }
                    .count-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 2px;
                        page-break-inside: auto;
                    }
                    .count-table thead {
                        display: table-header-group;
                    }
                    .count-table tr {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .count-table th, .count-table td {
                        border: 1px solid #334155;
                        padding: 3.5px 4.5px;
                        font-size: 8px;
                        line-height: 1.15;
                    }
                    .count-table th {
                        background-color: #f1f5f9;
                        font-weight: 800;
                        color: #0f172a;
                    }
                    .sig-container {
                        margin-top: 20px;
                        margin-bottom: 8px;
                        display: flex;
                        justify-content: space-around;
                        max-width: 520px;
                        margin-left: auto;
                        margin-right: auto;
                        gap: 60px;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .sig-box {
                        flex: 1;
                        text-align: center;
                        min-width: 160px;
                    }
                    .sig-title {
                        font-size: 9px;
                        font-weight: bold;
                        color: #475569;
                        margin-bottom: 28px;
                    }
                    .sig-line {
                        border-bottom: 1px solid #475569;
                        margin-bottom: 4px;
                    }
                    .sig-name {
                        font-size: 9.5px;
                        font-weight: bold;
                        color: #0f172a;
                    }

                    @media print {
                        .no-print {
                            display: none !important;
                        }
                        body {
                            background: #fff !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                        .pages-wrapper {
                            padding: 0 !important;
                        }
                        .sheet-page {
                            width: 100% !important;
                            min-height: auto !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            border-radius: 0 !important;
                            page-break-after: always;
                            break-after: page;
                        }
                        .sheet-page:last-child {
                            page-break-after: auto;
                            break-after: auto;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="no-print screen-toolbar">
                    <div class="toolbar-content">
                        <div>
                            <span class="toolbar-title">📄 Preview Countsheet Stock Opname</span>
                            <span class="toolbar-hint">Format siap cetak A4. Pada dialog cetak: pilih <b>Paper size: A4</b> & <b>Margins: Default/None</b></span>
                        </div>
                        <div class="toolbar-actions">
                            <button onclick="window.print()" class="btn-print">🖨️ Cetak / Simpan PDF</button>
                            <button onclick="window.close()" class="btn-close">✕ Tutup</button>
                        </div>
                    </div>
                </div>
                <div class="pages-wrapper">
                    ${pagesHtml}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
    };

    // FITUR EXPORT COUNTSHEET BLIND KE EXCEL (.XLSX)
    const handleExportCountsheetXLSX = (selectedCounter?: string, roundNumber: number = 1) => {
        if (!masterDataList || masterDataList.length === 0) {
            triggerNotification("Tidak ada data SKU untuk diexport!");
            return;
        }

        let tasks = selectedCounter
            ? masterDataList.filter(m => m.counter === selectedCounter)
            : [...masterDataList];

        if (roundNumber > 1) {
            tasks = tasks.filter(m => m.currentRound === roundNumber || (m.currentRound >= roundNumber && !m.isLocked));
        }

        tasks.sort((a, b) => (a.counter || '').localeCompare(b.counter || '') || (a.Location || '').localeCompare(b.Location || ''));

        const exportRows = tasks.map((item, idx) => ({
            'NO': idx + 1,
            'RONDE': roundNumber,
            'PIC COUNTER': item.counter,
            'ZONE': item.Zone || '-',
            'LOKASI / RAK': item.Location || '-',
            'LEVEL': item.level || '-',
            'BARCODE / SKU': item.SKU,
            'UPC 1': item.UPC1 || '-',
            'UPC 2': item.UPC2 || '-',
            'DESKRIPSI PRODUK': item.Description || '-',
            'EXPIRED DATE': item.expiredDateSystem || item.expiredDateActual || '-',
            'SATUAN (UOM)': item.satuanHitung || 'PCS',
            'HASIL FISIK (TULIS TANGAN / SCAN)': '',
            'PARAF / CATATAN': ''
        }));

        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Countsheet_R${roundNumber}`);
        const filename = `Countsheet_Blind_R${roundNumber}_${selectedCounter ? selectedCounter.toUpperCase() : 'SEMUA_COUNTER'}_${activeProject?.sessionCode || 'SO'}.xlsx`;
        XLSX.writeFile(wb, filename);
        triggerNotification(`📥 File Countsheet (.xlsx) berhasil diunduh: ${filename}`);
    };

    // FITUR EXPORT HITUNGAN FISIK INTERNAL UNTUK NEGO / SHARING DENGAN VENDOR
    // (SYSTEM QTY & HARGA 100% DISEMBUNYIKAN UNTUK MENJAGA INTEGRITAS AUDIT & KERAHASIAAN)
    const handleExportInternalCountsForVendorXLSX = () => {
        if (!masterDataList || masterDataList.length === 0) {
            triggerNotification("Tidak ada data hasil hitungan untuk diexport!");
            return;
        }

        const exportData = masterDataList.map((item, idx) => {
            const isCounted = !!item.isCounted;
            const actualQty = isCounted ? (item.countedQty !== undefined ? item.countedQty : (item.QTY_ACTUAL ?? 0)) : 0;
            const goodQty = isCounted ? (item.qtyGood !== undefined ? item.qtyGood : actualQty) : '-';
            const badQty = isCounted ? (item.qtyBad !== undefined ? item.qtyBad : 0) : '-';

            const cleanCounter = (item.counter || '').toLowerCase().trim();
            const pendampingName = item.counterPendamping || item.partner || counterPartnersMap[cleanCounter] || '-';

            return {
                'NO': idx + 1,
                'ZONE': item.Zone || '-',
                'LOKASI / RAK': item.Location || '-',
                'LEVEL': item.level || '-',
                'BARCODE / SKU': item.SKU,
                'UPC 1': item.UPC1 || '-',
                'UPC 2': item.UPC2 || '-',
                'DESKRIPSI PRODUK': item.Description || '-',
                'EXPIRED DATE': item.expiredDateSystem || item.expiredDateActual || '-',
                'SATUAN (UOM)': item.satuanHitung || 'PCS',
                'QTY FISIK INTERNAL': isCounted ? actualQty : 'Belum Dihitung',
                'FISIK KONDISI BAIK (GOOD)': goodQty,
                'FISIK KONDISI RUSAK (BAD)': badQty,
                'STATUS FISIK': isCounted ? 'Sudah Dihitung' : 'Pending',
                'RONDE TERAKHIR': `Ronde ${item.currentRound || 1}`,
                'NAMA COUNTER': item.counter || '-',
                'COUNTER PENDAMPING (WH)': pendampingName
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fisik_Internal_For_Vendor");
        const filename = `Data_Fisik_Internal_Share_Vendor_${activeProject?.sessionCode || 'SO'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        triggerNotification(`🔒 File Hitungan Fisik Internal (.xlsx) berhasil diexport! Target WMS System Qty & Harga 100% AMAN disembunyikan.`);
    };

    // FITUR IMPORT HASIL HITUNGAN VENDOR (.XLSX / .CSV)
    const handleImportVendorXLSX = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeProject) return;

        setIsVendorImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = evt.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheet];
                const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                if (json.length === 0) {
                    triggerNotification("File Excel vendor kosong!");
                    setIsVendorImporting(false);
                    return;
                }

                const vendorDataMap: { [sku: string]: number } = {};
                json.forEach(row => {
                    const sku = String(row['SKU'] ?? row['SKU BARANG'] ?? row['Barcode'] ?? row['BARCODE'] ?? row['Item'] ?? row['Kode'] ?? '').trim();
                    const rawQty = row['Qty Vendor'] ?? row['QTY VENDOR'] ?? row['Vendor Qty'] ?? row['Third Party Qty'] ?? row['Hitungan Vendor'] ?? row['Qty'] ?? row['QTY'] ?? row['Actual'] ?? row['Fisik'];
                    if (sku && rawQty !== undefined) {
                        const parsed = parseInt(String(rawQty).replace(/[^0-9-]/g, ''), 10);
                        if (!isNaN(parsed)) {
                            vendorDataMap[sku.toLowerCase()] = parsed;
                        }
                    }
                });

                const skuKeys = Object.keys(vendorDataMap);
                if (skuKeys.length === 0) {
                    triggerNotification("Kolom SKU atau Qty Vendor tidak ditemukan dalam file!");
                    setIsVendorImporting(false);
                    return;
                }

                const updates: { ref: any; data: any }[] = [];
                masterDataList.forEach(item => {
                    if (!item.id || !item.SKU) return;
                    const cleanSku = item.SKU.toLowerCase().trim();
                    const cleanUpc1 = (item.UPC1 || '').toLowerCase().trim();

                    let matchedQty: number | undefined;
                    if (vendorDataMap[cleanSku] !== undefined) {
                        matchedQty = vendorDataMap[cleanSku];
                    } else if (cleanUpc1 && vendorDataMap[cleanUpc1] !== undefined) {
                        matchedQty = vendorDataMap[cleanUpc1];
                    }

                    if (matchedQty !== undefined) {
                        updates.push({
                            ref: doc(db, "master_tasks", item.id),
                            data: {
                                thirdPartyQty: matchedQty,
                                updatedAt: new Date().toISOString()
                            }
                        });
                    }
                });

                if (updates.length === 0) {
                    triggerNotification("Tidak ada SKU di file vendor yang cocok dengan master task proyek ini.");
                    setIsVendorImporting(false);
                    return;
                }

                const CHUNK_SIZE = 400;
                for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
                    const chunk = updates.slice(i, i + CHUNK_SIZE);
                    const b = writeBatch(db);
                    chunk.forEach(op => b.update(op.ref, op.data));
                    await b.commit();
                }

                triggerNotification(`✅ Berhasil mencocokkan ${updates.length} hitungan SKU dari Vendor!`);
            } catch (err: any) {
                console.error("Vendor Import Error:", err);
                triggerNotification(`Gagal import file vendor: ${err.message || String(err)}`);
            } finally {
                setIsVendorImporting(false);
                if (vendorFileInputRef.current) vendorFileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // FITUR EXPORT REKONSILIASI KOMPARASI DENGAN VENDOR (SELECTIVE UNIT PRICE MASKING)
    const handleExportVendorComparisonXLSX = () => {
        if (!masterDataList || masterDataList.length === 0) {
            triggerNotification("Tidak ada data untuk diexport!");
            return;
        }

        const exportData = masterDataList.map((item, idx) => {
            const sysQty = item.Qty || 0;
            const isCounted = !!item.isCounted;
            const effectiveActual = isCounted ? (item.countedQty ?? sysQty) : (item.round1Actual ?? sysQty);
            const vendorQty = item.thirdPartyQty;

            const diffSys = effectiveActual - sysQty;
            const diffVendor = vendorQty !== undefined ? (effectiveActual - vendorQty) : '-';

            const hasDiscrepancy = diffSys !== 0 || (vendorQty !== undefined && vendorQty !== effectiveActual);
            const unitPrice = item.unitPrice || 0;
            const valDiscrepancy = diffSys * unitPrice;

            let statusRecon = 'MATCH (SEPAKAT)';
            if (vendorQty !== undefined && vendorQty !== effectiveActual) {
                statusRecon = 'DISPUTE VENDOR (BEDA HITUNGAN)';
            } else if (diffSys !== 0) {
                statusRecon = 'VARIANCE WMS (BEDA DENGAN SISTEM)';
            }

            return {
                'NO': idx + 1,
                'LOKASI RAK': item.Location,
                'BARCODE / SKU': item.SKU,
                'DESKRIPSI PRODUK': item.Description,
                'PIC COUNTER INTERNAL': item.counter,
                'QTY SISTEM (WMS)': sysQty,
                'QTY FISIK INTERNAL': isCounted ? effectiveActual : 'Pending',
                'QTY FISIK VENDOR': vendorQty !== undefined ? vendorQty : 'Belum Ada',
                'SELISIH INT VS VENDOR': diffVendor,
                'SELISIH FISIK VS SISTEM': isCounted ? diffSys : '-',
                'STATUS REKONSILIASI': statusRecon,
                // MASKING HARGA: Hanya dibuka untuk SKU yang berselisih
                'HARGA SATUAN (RP)': hasDiscrepancy ? unitPrice : '*** (Protected)',
                'VALUASI SELISIH FISIK (RP)': hasDiscrepancy ? (isCounted ? valDiscrepancy : 0) : '-',
                'RONDE SAAT INI': `Ronde ${item.currentRound}`
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Rekonsiliasi_Vendor_3Way");
        const filename = `Rekonsiliasi_Auditor_Vendor_${activeProject?.sessionCode || 'SO'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        triggerNotification(`📊 Laporan Rekonsiliasi Vendor (.xlsx) berhasil diunduh!`);
    };

    const handleRevertLastSwap = async () => {
        if (!lastSwapEvent || isDeploySubmitting) return;
        const { sourceCounter, targetCounter, round, sourceItemIds, targetItemIds } = lastSwapEvent;

        const affectedItems = masterDataList.filter(m => m.id && (sourceItemIds.includes(m.id) || targetItemIds.includes(m.id)));
        const alreadyCountedInNewRound = affectedItems.some(m => m.isCounted && m.currentRound === round);

        if (alreadyCountedInNewRound) {
            triggerNotification(`⚠️ Tidak dapat membatalkan: Salah satu counter sudah mulai menginput hitungan fisik di Ronde ${round}!`);
            return;
        }

        setIsDeploySubmitting(true);
        try {
            const prevRound = round - 1;
            const timestampNow = new Date().toISOString();
            const revertOps: { ref: any; data: any }[] = [];

            sourceItemIds.forEach(id => {
                const m = masterDataList.find(item => item.id === id);
                if (!m) return;
                const ref = doc(db, "master_tasks", id);
                revertOps.push({
                    ref,
                    data: {
                        counter: sourceCounter,
                        currentRound: prevRound,
                        isCounted: true,
                        QTY_ACTUAL: m[`round${prevRound}Actual` as keyof MasterSKUItem] ?? m.countedQty ?? m.Qty,
                        lastSwapBatchId: null,
                        updatedAt: timestampNow
                    }
                });
            });

            targetItemIds.forEach(id => {
                const m = masterDataList.find(item => item.id === id);
                if (!m) return;
                const ref = doc(db, "master_tasks", id);
                revertOps.push({
                    ref,
                    data: {
                        counter: targetCounter,
                        currentRound: prevRound,
                        isCounted: true,
                        QTY_ACTUAL: m[`round${prevRound}Actual` as keyof MasterSKUItem] ?? m.countedQty ?? m.Qty,
                        lastSwapBatchId: null,
                        updatedAt: timestampNow
                    }
                });
            });

            const CHUNK_SIZE = 400;
            for (let i = 0; i < revertOps.length; i += CHUNK_SIZE) {
                const chunk = revertOps.slice(i, i + CHUNK_SIZE);
                const b = writeBatch(db);
                chunk.forEach(op => b.update(op.ref, op.data));
                await b.commit();
            }

            setLastSwapEvent(null);
            triggerNotification(`↩️ SUKSES! Pertukaran ${sourceCounter} ⇄ ${targetCounter} berhasil dibatalkan. Seluruh task dikembalikan.`);
        } catch (err: any) {
            console.error("Revert Swap Error:", err);
            triggerNotification(`Gagal membatalkan swap: ${err.message || 'Error'}`);
        } finally {
            setIsDeploySubmitting(false);
        }
    };

    const handleExportReconXLSX = () => {
        if (masterDataList.length === 0) {
            triggerNotification("Tidak ada data untuk diexport!");
            return;
        }

        const exportData = masterDataList.map((item, idx) => {
            const sysQty = item.Qty || 0;
            const isCounted = !!item.isCounted;

            const actQty = isCounted ? (item.countedQty !== undefined ? item.countedQty : sysQty) : 0;
            const goodQty = isCounted ? (item.qtyGood !== undefined ? item.qtyGood : actQty) : 0;
            const badQty = isCounted ? (item.qtyBad !== undefined ? item.qtyBad : 0) : 0;

            const diff = isCounted ? (actQty - sysQty) : 0;
            const unitPrice = item.unitPrice || 0;
            const valDiscrepancy = diff * unitPrice;

            const vendorQty = item.thirdPartyQty;
            const diffVendor = vendorQty !== undefined && isCounted ? (actQty - vendorQty) : '-';
            const isDiscrepant = isCounted && (diff !== 0 || (vendorQty !== undefined && vendorQty !== actQty));

            let statusSelisih = 'Uncounted / Pending';
            if (isCounted) {
                if (diff === 0 && (vendorQty === undefined || vendorQty === actQty)) statusSelisih = 'Match';
                else if (vendorQty !== undefined && vendorQty !== actQty) statusSelisih = 'Dispute Vendor';
                else if (diff < 0) statusSelisih = 'Shortage';
                else statusSelisih = 'Overage';
            }

            const overrideQty = recoveryAdjustments[item.SKU] !== undefined ? recoveryAdjustments[item.SKU] : (isCounted ? actQty : sysQty);
            const finalValuation = (overrideQty - sysQty) * unitPrice;

            return {
                'NO': idx + 1,
                'OWNER SKU': item.Owner || 'DDI',
                'SKU BARANG': item.SKU,
                'UPC 1 (ECERAN)': item.UPC1 || item.SKU,
                'UPC 2 (KARDUS)': item.UPC2 || '-',
                'DESKRIPSI PRODUK': item.Description,
                'BRAND': item.SKUBrand || '',
                'LOKASI RAK': item.Location,
                'COUNTER R1': item.round1Counter || (item.currentRound >= 1 ? (item.previousCounter || item.counter) : '-'),
                'QTY R1': item.round1Actual !== undefined ? item.round1Actual : (item.currentRound === 1 && isCounted ? actQty : '-'),
                'COUNTER R2': item.round2Counter || (item.currentRound >= 2 ? (item.currentRound === 2 ? item.counter : (item.previousCounter || '-')) : '-'),
                'QTY R2': item.round2Actual !== undefined ? item.round2Actual : (item.currentRound === 2 && isCounted ? actQty : '-'),
                'COUNTER R3': item.round3Counter || (item.currentRound >= 3 ? item.counter : '-'),
                'QTY R3': item.round3Actual !== undefined ? item.round3Actual : (item.currentRound === 3 && isCounted ? actQty : '-'),
                'FINAL COUNTER PIC': item.counter,
                'QTY SYSTEM (WMS)': sysQty,
                'QTY GOOD': isCounted ? goodQty : '-',
                'QTY BAD': isCounted ? badQty : '-',
                'TOTAL QTY ACTUAL': isCounted ? actQty : '-',
                'QTY VENDOR (3RD PARTY)': vendorQty !== undefined ? vendorQty : '-',
                'SELISIH INT VS VENDOR': diffVendor,
                'SELISIH QTY': isCounted ? diff : '-',
                'STATUS SELISIH': statusSelisih,
                // Selective Price Masking
                'HARGA SATUAN (RP)': isDiscrepant ? (item.unitPrice || 0) : '*** (Protected)',
                'VALUASI SELISIH (RP)': isDiscrepant ? (isCounted ? valDiscrepancy : 0) : '-',
                'QTY FINAL RECOVERY': overrideQty,
                'VALUASI FINAL (RP)': isDiscrepant ? finalValuation : '-',
                'CATATAN (REMARKS)': item.Remarks || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Recon_Recovery_Report");
        XLSX.writeFile(wb, `Laporan_Recon_SO_${activeProject?.sessionCode || '360'}_${new Date().toISOString().split('T')[0]}.xlsx`);
        triggerNotification("Laporan Recon & Recovery (.xlsx) berhasil diunduh!");
    };

    const handleExportAuditTrailXLSX = async () => {
        try {
            triggerNotification("Memuat Audit Trail dari Cloud...");
            const qAuditFull = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(20000));
            const snap = await getDocs(qAuditFull);

            if (snap.empty) {
                triggerNotification("Belum ada data Audit Trail!");
                return;
            }

            const exportLogs = snap.docs.map((docSnap, idx) => {
                const log = docSnap.data();
                return {
                    'NO': idx + 1,
                    'TIMESTAMP (JAM SUBMIT)': log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '-',
                    'LOKASI RAK': log.rackLocation || log.Location || '-',
                    'OWNER SKU': log.ownerSku || log.Owner || 'DDI',
                    'SKU': log.sku || log.SKU || '-',
                    'DESKRIPSI PRODUK': log.description || log.Description || '-',
                    'UPC 1': log.upc1 || log.UPC1 || '-',
                    'UPC 2': log.upc2 || log.UPC2 || '-',
                    'COUNTER PIC': log.counterPic || log.counter || '-',
                    'RONDE': `Round ${log.round || log.currentRound || 1}`,
                    'QTY GOOD': log.qtyGood ?? 0,
                    'QTY BAD': log.qtyBad ?? 0,
                    'TOTAL FINAL SUBMITTED': log.totalFinalSubmitted ?? log.qtyActual ?? 0,
                    'ED ACTUAL': log.edActual || log.expiredDateActual || '-',
                    'CATATAN (REMARKS)': log.remarks || log.Remarks || '-'
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportLogs);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Audit_Trail_Log");
            XLSX.writeFile(wb, `Audit_Trail_Snapshot_${activeProject?.sessionCode || '360'}_${Date.now()}.xlsx`);
            triggerNotification("Audit Trail Log (.xlsx) berhasil diunduh!");
        } catch (err: any) {
            console.error("Export Audit Error:", err);
            triggerNotification("Gagal mengunduh Audit Log.");
        }
    };

    const handleToggleGlobalLock = async () => {
        if (effectiveRole === 'spv') {
            triggerNotification('Hanya Owner yang berwenang mengubah gembok sesi.');
            return;
        }
        if (!activeProject) return;
        const lockDocId = activeProject.sessionCode || activeProject.id;
        const newStatus = isProjectLocked ? 'OPEN' : 'LOCKED';
        await setDoc(doc(db, "round_locks", lockDocId), {
            status: newStatus,
            lockedCounters: newStatus === 'OPEN' ? {} : (lockedCounters || {}),
            lockedBy: effectiveRole,
            timestamp: new Date().toISOString()
        }, { merge: true });
        triggerNotification(`Sesi Opname ${newStatus === 'LOCKED' ? 'Terkunci' : 'Terbuka'} secara Global!`);
    };

    const handleToggleCounterLock = async (counterName: string, currentStatus: boolean) => {
        if (effectiveRole === 'spv') {
            triggerNotification('Hanya Owner yang berwenang mengunci counter.');
            return;
        }
        if (!activeProject) return;
        const lockDocId = activeProject.sessionCode || activeProject.id;
        const cleanKey = counterName.toLowerCase().trim();
        const newLocks = { ...lockedCounters, [cleanKey]: !currentStatus };
        await setDoc(doc(db, "round_locks", lockDocId), {
            lockedCounters: newLocks,
            updatedAt: new Date().toISOString()
        }, { merge: true });
        triggerNotification(`Akses Counter "${cleanKey}" ${!currentStatus ? 'Dikunci' : 'Dibuka'}!`);
    };

    const handleExecuteBulkTransfer = async () => {
        if (effectiveRole === 'spv') {
            triggerNotification('Hanya Owner yang dapat melakukan transfer tugas massal.');
            return;
        }
        if (!transferSourceCounter || !transferTargetCounter) return;
        const cleanTarget = transferTargetCounter.toLowerCase().trim();
        const cleanSource = transferSourceCounter.toLowerCase().trim();

        const tasksToMove = masterDataList.filter(m => m.counter === cleanSource);
        if (tasksToMove.length === 0) {
            triggerNotification(`Tidak ada task ditemukan pada counter ${cleanSource}`);
            return;
        }

        const CHUNK = 400;
        for (let i = 0; i < tasksToMove.length; i += CHUNK) {
            const chunk = tasksToMove.slice(i, i + CHUNK);
            const batch = writeBatch(db);
            chunk.forEach(task => {
                if (task.id) {
                    const ref = doc(db, "master_tasks", task.id);
                    batch.update(ref, { counter: cleanTarget, updatedAt: new Date().toISOString() });
                }
            });
            await batch.commit();
        }

        triggerNotification(`Sukses! ${tasksToMove.length} task milik ${cleanSource} dipindahkan ke ${cleanTarget}.`);
        setTransferSourceCounter(null);
        setTransferTargetCounter('');
    };

    const handleOpenReassignModal = (initialSource?: string) => {
        const source = initialSource || (filteredCounterNames[0] || '');
        setReassignModal({
            isOpen: true,
            sourceCounter: source,
            targetCounter: '',
            selectedRacks: [],
            searchRack: '',
        });
    };

    const handleToggleSelectRack = (rackName: string) => {
        setReassignModal(prev => {
            const exists = prev.selectedRacks.includes(rackName);
            return {
                ...prev,
                selectedRacks: exists
                    ? prev.selectedRacks.filter(r => r !== rackName)
                    : [...prev.selectedRacks, rackName]
            };
        });
    };

    const handleSelectAllPendingRacks = () => {
        setReassignModal(prev => {
            const allRackNames = pendingRacksForSource.map(r => r.rack);
            const isAllSelected = prev.selectedRacks.length === allRackNames.length && allRackNames.length > 0;
            return {
                ...prev,
                selectedRacks: isAllSelected ? [] : allRackNames
            };
        });
    };

    const handleExecuteReassignRacks = async () => {
        if (!activeProject || isReassignSubmitting) return;
        const { sourceCounter, targetCounter, selectedRacks } = reassignModal;
        if (!sourceCounter || !targetCounter) {
            triggerNotification('Mohon pilih counter asal dan counter penerima tugas.');
            return;
        }
        if (selectedRacks.length === 0) {
            triggerNotification('Pilih minimal 1 rak pending yang ingin dialihkan.');
            return;
        }

        const cleanSource = sourceCounter.toLowerCase().trim();
        const cleanTarget = targetCounter.toLowerCase().trim();

        if (cleanSource === cleanTarget) {
            triggerNotification('Counter asal dan counter tujuan tidak boleh sama.');
            return;
        }

        setIsReassignSubmitting(true);
        try {
            const timestampNow = new Date().toISOString();
            const actorName = currentUserEmail || effectiveRole;

            // Kumpulkan task yang berada di rak terpilih
            const targetTasksToMove = masterDataList.filter(m => 
                (m.counter || '').toLowerCase().trim() === cleanSource &&
                selectedRacks.includes((m.Location || '').trim())
            );

            if (targetTasksToMove.length === 0) {
                triggerNotification('Tidak ada task ditemukan pada rak yang dipilih.');
                setIsReassignSubmitting(false);
                return;
            }

            // Batch update Firestore untuk master_tasks
            const CHUNK = 400;
            for (let i = 0; i < targetTasksToMove.length; i += CHUNK) {
                const chunk = targetTasksToMove.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(task => {
                    if (task.id) {
                        const ref = doc(db, "master_tasks", task.id);
                        batch.update(ref, {
                            counter: cleanTarget,
                            previousCounter: cleanSource,
                            updatedAt: timestampNow
                        });
                    }
                });
                await batch.commit();
            }

            // Catat Audit Trail per Rak terpilih
            const auditBatch = writeBatch(db);
            selectedRacks.forEach(rackName => {
                const rackTasks = targetTasksToMove.filter(t => t.Location === rackName);
                const rackRound = rackTasks[0]?.currentRound || 1;
                const logId = `${activeProject.sessionCode || 'SO'}_REASSIGN_${Date.now()}_${rackName.replace(/[\/\s]/g, '-')}`;
                const auditRef = doc(db, "audit_logs", logId);
                auditBatch.set(auditRef, {
                    timestamp: timestampNow,
                    actionType: 'REASSIGN_PENDING_RACK',
                    rackLocation: rackName,
                    ownerSku: rackTasks[0]?.Owner || 'DDI',
                    sku: `MULTI (${rackTasks.length} SKU)`,
                    description: `Reassign sisa rak pending dari ${cleanSource} ke ${cleanTarget}`,
                    upc1: '-',
                    upc2: '-',
                    counterPic: `${cleanSource} ➔ ${cleanTarget}`,
                    round: rackRound,
                    qtyGood: 0,
                    qtyBad: 0,
                    totalFinalSubmitted: 0,
                    edActual: '-',
                    remarks: `[REASSIGN RAK PENDING] Rak ${rackName} (Ronde ${rackRound}, ${rackTasks.length} SKU) dialihkan dari ${cleanSource} ke ${cleanTarget} oleh ${actorName} (${effectiveRole.toUpperCase()})`
                });
            });
            await auditBatch.commit();

            // Update local state masterDataList
            setMasterDataList(prev => prev.map(m => {
                if ((m.counter || '').toLowerCase().trim() === cleanSource && selectedRacks.includes(m.Location)) {
                    return { ...m, counter: cleanTarget, previousCounter: cleanSource };
                }
                return m;
            }));

            triggerNotification(`✅ Sukses! ${selectedRacks.length} rak (${targetTasksToMove.length} SKU) dialihkan dari ${cleanSource} ke ${cleanTarget}.`);
            setReassignModal({
                isOpen: false,
                sourceCounter: '',
                targetCounter: '',
                selectedRacks: [],
                searchRack: '',
            });
        } catch (err: any) {
            console.error("Reassign Racks Error:", err);
            triggerNotification(`Gagal mere-assign rak: ${err?.message || String(err)}`);
        } finally {
            setIsReassignSubmitting(false);
        }
    };

    const handleSendDirectEmailJS = async (recipientEmail: string, username: string, pin: string, name: string) => {
        if (!recipientEmail || !recipientEmail.trim()) {
            triggerNotification("Alamat email tidak valid.");
            return;
        }

        try {
            const templateParams = {
                to_email: recipientEmail,
                to_name: name,
                username: username,
                pin: pin,
                app_name: 'Noctus Count'
            };

            await emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams, 'YOUR_PUBLIC_KEY');
            triggerNotification(`✅ Email Kredensial Berhasil Terkirim ke ${recipientEmail}!`);
        } catch (err: any) {
            console.warn("EmailJS Key Not Configured, Fallback to Credentials Modal:", err);

            let copyText = `📋 *KREDENSIAL LOGIN NOCTUS COUNT*\nNama: ${name}\nUsername: ${username}\nPIN: ${pin}`;
            navigator.clipboard.writeText(copyText);
            setCredentialsModalText(copyText);
            triggerNotification(`📋 Kredensial ${username} disalin ke Clipboard!`);
        }
    };

    const handleBlastEmailCredentials = () => {
        if (globalAccounts.length === 0) {
            triggerNotification('Belum ada akun KTP Cloud terdaftar.');
            return;
        }
        handleGenerateCredentialsText();
    };

    const handleSendIndividualEmail = (acc: GlobalAccount) => {
        if (!acc.email || !acc.email.trim()) {
            let copyText = `📋 *KREDENSIAL LOGIN NOCTUS COUNT*\nNama: ${acc.name}\nUsername: ${acc.username}\nPIN: ${acc.pin}`;
            navigator.clipboard.writeText(copyText);
            setCredentialsModalText(copyText);
            triggerNotification(`📋 Kredensial ${acc.username} disalin ke Clipboard!`);
            return;
        }
        handleSendDirectEmailJS(acc.email.trim(), acc.username, acc.pin, acc.name);
    };

    const [newAccUser, setNewAccUser] = useState('');
    const [newAccName, setNewAccName] = useState('');
    const [newAccPin, setNewAccPin] = useState('');
    const [newAccEmail, setNewAccEmail] = useState('');
    const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

    const handleAddGlobalAccount = async () => {
        if (newAccUser.trim() && newAccPin.trim() && newAccName.trim()) {
            const uName = newAccUser.trim().toLowerCase();
            const newUser = { username: uName, name: newAccName.trim(), pin: newAccPin.trim(), email: newAccEmail.trim() || `${uName}@anymindgroup.com` };
            await setDoc(doc(db, "global_accounts", uName), newUser);
            setNewAccUser(''); setNewAccName(''); setNewAccPin(''); setNewAccEmail('');
            triggerNotification(`KTP Global ${uName} berhasil tersimpan di Cloud!`);
        }
    };

    const handleDeleteGlobalAccount = async (username: string) => {
        if (window.confirm(`Yakin hapus permanen KTP: ${username}?`)) {
            await deleteDoc(doc(db, "global_accounts", username));
            triggerNotification(`Akun KTP ${username} dihapus.`);
        }
    };

    const togglePinVisibility = (id: string) => setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));

    const filteredGlobalAccounts = globalAccounts.filter(acc =>
        acc.username.toLowerCase().includes(ktpSearch.toLowerCase()) ||
        acc.name.toLowerCase().includes(ktpSearch.toLowerCase()) ||
        acc.email.toLowerCase().includes(ktpSearch.toLowerCase())
    );

    const sanitizeDocId = (str: string) => str.replace(/[\/\\#$\[\].]/g, '-').trim();

    const parseXLSXFile = (file: File, currentProjId?: string): Promise<MasterSKUItem[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                    if (json.length === 0) {
                        triggerNotification("File Excel kosong.");
                        reject("File kosong");
                        return;
                    }

                    isUploadCancelledRef.current = false;
                    isUploadCancelledRef.current = false;
                    isUploadingRef.current = true; // Kunci onSnapshot listener agar tidak membekukan UI React
                    const totalRows = json.length;
                    setUploadProgress({ current: 0, total: totalRows, stepMessage: "Membaca & memvalidasi file Excel..." });

                    const pId = currentProjId || activeProject?.id;

                    // 1. Ekstrak & Buat Akun Counter Unik Hanya Jika Belum Terdaftar
                    const uniqueCounters = new Set<string>();
                    json.forEach((row: any) => {
                        const rawCounter = (row['counter'] || row['Counter'] || row['COUNTER'] || 'Unassigned').toString().toLowerCase().trim();
                        const clean = sanitizeDocId(rawCounter);
                        if (clean && clean !== 'unassigned') {
                            uniqueCounters.add(clean);
                        }
                    });

                    if (uniqueCounters.size > 0 && !isUploadCancelledRef.current) {
                        const existingUsernames = new Set(globalAccounts.map(a => a.username.toLowerCase()));
                        const counterList = Array.from(uniqueCounters).filter(c => !existingUsernames.has(c.toLowerCase()));
                        
                        if (counterList.length > 0) {
                            setUploadProgress({ current: 0, total: totalRows, stepMessage: `Menyiapkan ${counterList.length} akun counter baru...` });
                            for (let c = 0; c < counterList.length; c += 100) {
                                if (isUploadCancelledRef.current) break;
                                const cBatch = writeBatch(db);
                                const slice = counterList.slice(c, c + 100);
                                slice.forEach(cleanCounter => {
                                    const accRef = doc(db, "global_accounts", cleanCounter);
                                    cBatch.set(accRef, {
                                        username: cleanCounter,
                                        name: cleanCounter.toUpperCase(),
                                        pin: '1234',
                                        email: `${cleanCounter}@anymindgroup.com`,
                                        role: 'counter'
                                    }, { merge: true });

                                    if (pId) {
                                        const teamRef = doc(db, "project_teams", `${pId}_${cleanCounter}`);
                                        cBatch.set(teamRef, {
                                            projectId: pId,
                                            username: cleanCounter,
                                            role: 'counter'
                                        }, { merge: true });
                                    }
                                });
                                await cBatch.commit();
                            }
                        }
                    }

                    if (isUploadCancelledRef.current) {
                        isUploadingRef.current = false;
                        setUploadProgress(null);
                        reject("Upload dibatalkan");
                        return;
                    }

                    // 2. Persiapkan Chunks Task dengan ukuran ultra-cepat (100 docs per batch)
                    const CHUNK_SIZE = 100;
                    const chunks: { startIndex: number; rows: any[] }[] = [];
                    for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
                        chunks.push({
                            startIndex: i,
                            rows: json.slice(i, i + CHUNK_SIZE)
                        });
                    }

                    const newMasterList: MasterSKUItem[] = new Array(totalRows);
                    let chunkCursor = 0;
                    let completedRows = 0;

                    setUploadProgress({ current: 0, total: totalRows, stepMessage: "Mengunggah data batch ke Cloud..." });

                    // Fungsi proses satu chunk dengan membuat WriteBatch BARU di setiap percobaan
                    const processChunk = async (currentChunk: { startIndex: number; rows: any[] }) => {
                        for (let attempt = 0; attempt < 2; attempt++) {
                            if (isUploadCancelledRef.current) throw new Error("Upload dibatalkan oleh pengguna.");
                            try {
                                const batch = writeBatch(db);

                                currentChunk.rows.forEach((row: any, idxInChunk: number) => {
                                    const globalIdx = currentChunk.startIndex + idxInChunk;
                                    const rawCounter = (row['counter'] || row['Counter'] || row['COUNTER'] || 'Unassigned').toString().toLowerCase().trim();
                                    const cleanCounter = sanitizeDocId(rawCounter || 'unassigned');
                                    const locStr = (row['Location'] || row['LOCATION'] || `LOC-${globalIdx + 1}`).toString().trim();
                                    const skuStr = (row['SKU'] || `SKU-${globalIdx + 1}`).toString().trim();

                                    const taskId = sanitizeDocId(`${locStr}_${skuStr}_${globalIdx + 1}`);

                                    const rawActQty = row['QTY ACTUAL'] ?? row['Qty Actual'] ?? row['ACTUAL QTY'];
                                    const numActQty = parseInt(rawActQty, 10);
                                    const isCounted = rawActQty !== undefined && rawActQty !== null && rawActQty !== '' && !isNaN(numActQty);

                                    const taskDoc = {
                                        Owner: row['Owner'] || 'DDI',
                                        SKU: skuStr,
                                        Description: row['Description'] || '',
                                        UPC1: row['UPC 1']?.toString() || '',
                                        UPC2: row['UPC 2']?.toString() || '',
                                        SKUBrand: row['SKU Brand'] || '',
                                        satuanHitung: row['satuan hitung'] || 'PCS',
                                        Location: locStr,
                                        level: row['level']?.toString() || '1',
                                        ailee: row['ailee']?.toString() || '',
                                        Zone: row['Zone']?.toString() || 'RACKING',
                                        LocationType: row['Location Type'] || 'RACK',
                                        counter: cleanCounter,
                                        Status: row['Status'] || 'Active',
                                        currentRound: parseInt(row['current round']) || 1,
                                        expiredDateSystem: row['expired date by system'] || '',
                                        expiredDateActual: row['expired date by actual'] || '',
                                        Qty: parseInt(row['Qty System'] || row['QTY SYSTEM']) || 0,
                                        unitPrice: parseInt(row['Unit Price'] || '0') || 0,
                                        isCounted,
                                        QTY_ACTUAL: isCounted ? numActQty : null,
                                        updatedAt: new Date().toISOString()
                                    };

                                    const taskRef = doc(db, "master_tasks", taskId);
                                    batch.set(taskRef, taskDoc, { merge: true });

                                    newMasterList[globalIdx] = {
                                        id: taskId,
                                        ...taskDoc,
                                        countedQty: isCounted ? numActQty : undefined,
                                        Remarks: row['REMARKS'] || ''
                                    };
                                });

                                await batch.commit();
                                return; // Berhasil
                            } catch (err: any) {
                                if (isUploadCancelledRef.current) throw new Error("Upload dibatalkan oleh pengguna.");
                                if (attempt === 1) throw err;
                                console.warn(`Retry chunk (percobaan ke-${attempt + 1}):`, err);
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        }
                    };

                    // 3. Worker Pool Paralel (CONCURRENCY = 3) untuk kecepatan tinggi & responsivitas
                    const worker = async () => {
                        while (chunkCursor < chunks.length) {
                            if (isUploadCancelledRef.current) {
                                throw new Error("Upload dibatalkan oleh pengguna.");
                            }
                            const chunkIndex = chunkCursor++;
                            const currentChunk = chunks[chunkIndex];

                            await processChunk(currentChunk);

                            completedRows += currentChunk.rows.length;
                            setUploadProgress({
                                current: Math.min(completedRows, totalRows),
                                total: totalRows,
                                stepMessage: `Mengunggah task (${Math.min(completedRows, totalRows).toLocaleString('id-ID')} / ${totalRows.toLocaleString('id-ID')})...`
                            });
                        }
                    };

                    const CONCURRENCY = 3;
                    const workerCount = Math.min(CONCURRENCY, chunks.length);
                    const workers = Array.from({ length: workerCount }, () => worker());

                    await Promise.all(workers);

                    if (!isUploadCancelledRef.current) {
                        isUploadingRef.current = false;
                        setMasterDataList(newMasterList);
                        setUploadProgress(null);
                        triggerNotification(`🚀 Upload Berhasil! ${totalRows.toLocaleString('id-ID')} data sukses diunggah ke Cloud.`);
                        resolve(newMasterList);
                    }
                } catch (err: any) {
                    isUploadingRef.current = false;
                    setUploadProgress(null);
                    if (!isUploadCancelledRef.current) {
                        console.error("Batch upload error:", err);
                        triggerNotification(`⚠️ Upload terputus / koneksi terganggu: ${err?.message || String(err)}`);
                    }
                    reject(err);
                }
            };
            reader.onerror = (err) => {
                isUploadingRef.current = false;
                setUploadProgress(null);
                reject(err);
            };
            reader.readAsArrayBuffer(file);
        });
    };

    const handleReassignCounter = async (taskIndex: number, newCounter: string) => {
        if (effectiveRole === 'spv') {
            triggerNotification('Hanya Owner yang berwenang menugaskan counter.');
            return;
        }
        const targetItem = filteredMasterTask[taskIndex];
        const cleanCounter = newCounter.toLowerCase().trim();
        const rawTaskId = targetItem.id || `${targetItem.Location}_${targetItem.SKU}_${taskIndex + 1}`;
        const taskId = rawTaskId.replace(/\//g, '-');

        await setDoc(doc(db, "master_tasks", taskId), {
            counter: cleanCounter,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        setMasterDataList(prev => prev.map(m => m.id === taskId ? { ...m, counter: cleanCounter } : m));
        triggerNotification(`Lokasi ${targetItem.Location} (${targetItem.SKU}) ditugaskan ke: ${cleanCounter}`);
    };

    const handleDownloadTemplateXLSX = () => {
        const templateData = [{
            Owner: 'DDI',
            SKU: 'ENFA-01',
            Description: 'Susu Kaleng 400g',
            'UPC 1': '12345678',
            'UPC 2': '',
            Status: 'Active',
            Location: 'A01-50-A',
            level: '1',
            ailee: 'A',
            Zone: 'FOOD',
            'Location Type': 'RACK',
            counter: 'bambang',
            'current round': 1,
            'satuan hitung': 'PCS',
            'SKU Brand': 'ENFAGROW',
            'expired date by system': '2026-12-31',
            'expired date by actual': '',
            'QTY ACTUAL': '',
            REMARKS: '',
            'Qty System': 100,
            'Unit Price': 150000
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master_Task");
        XLSX.writeFile(wb, "Template_Master_Task.xlsx");
        triggerNotification("Template Master Task (.xlsx) berhasil diunduh!");
    };

    const handleExportCurrentMasterXLSX = () => {
        if (masterDataList.length === 0) {
            triggerNotification("Tidak ada data Master Task untuk diexport!");
            return;
        }

        const exportData = masterDataList.map(item => ({
            'Owner': item.Owner || 'DDI',
            'SKU': item.SKU,
            'Description': item.Description,
            'UPC 1': item.UPC1 || '',
            'UPC 2': item.UPC2 || '',
            'SKU Brand': item.SKUBrand,
            'Location': item.Location,
            'Zone': item.Zone,
            'level': item.level,
            'Location Type': item.LocationType,
            'counter': item.counter,
            'expired date by system': item.expiredDateSystem,
            'expired date by actual': item.expiredDateActual,
            'Qty System': item.Qty,
            'QTY ACTUAL': (item.countedQty !== undefined && !isNaN(item.countedQty)) ? item.countedQty : '',
            'Unit Price': item.unitPrice || 0,
            'REMARKS': item.Remarks || '',
            'Status': item.Status || 'Active',
            'current round': item.currentRound || 1,
            'satuan Hitung': item.satuanHitung || 'PCS'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master_Task_Terisi");
        XLSX.writeFile(wb, `Master_Task_Data_${activeProject?.sessionCode || 'SO'}.xlsx`);
        triggerNotification("Export data Master Task (.xlsx) berhasil diunduh!");
    };

    const handleDownloadCatalogTemplateXLSX = () => {
        const templateData = [
            {
                'Owner': 'DDI',
                'SKU': 'FREEGIFT-TASCCMELON',
                'Description': 'Gimmick Tas Ransel Anak Cocomelon',
                'UPC 1': 'FREEGIFT-TASCCMELON',
                'UPC 2': '',
                'SKU Brand': 'Sanofi',
                'satuan hitung': 'PCS',
                'Unit Price': 10000
            },
            {
                'Owner': 'DDI',
                'SKU': 'UG016',
                'Description': 'Gimmick - Tas Pokojang (Backpack)',
                'UPC 1': 'UG016',
                'UPC 2': '',
                'SKU Brand': 'UNICHARM',
                'satuan hitung': 'PCS',
                'Unit Price': 10000
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master_Katalog_SKU");
        XLSX.writeFile(wb, "Template_Master_Katalog_SKU.xlsx");
        triggerNotification("Template Master Katalog (.xlsx) berhasil diunduh!");
    };

    const handleExportCatalogXLSX = () => {
        if (filteredSKUCatalog.length === 0) {
            triggerNotification("Tidak ada data Master Katalog untuk diexport!");
            return;
        }

        const exportData = filteredSKUCatalog.map(item => ({
            'Owner': item.Owner || 'DDI',
            'SKU': item.SKU,
            'Description': item.Description || '',
            'UPC 1 (ECERAN)': item.UPC1 || '',
            'UPC 2 (KARDUS)': item.UPC2 || '',
            'Brand': item.SKUBrand || '',
            'Satuan Hitung': item.satuanHitung || 'PCS',
            'Harga Satuan (Rp)': item.unitPrice || 0
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master_Katalog");
        XLSX.writeFile(wb, `Master_Katalog_SKU_${new Date().toISOString().slice(0, 10)}.xlsx`);
        triggerNotification("Master Katalog SKU (.xlsx) berhasil diexport!");
    };

    const handleUploadSKUCatalog = async (file: File) => {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (!json || json.length === 0) {
                triggerNotification("File Excel/CSV katalog referensi kosong.");
                return;
            }

            const totalRows = json.length;
            isUploadCancelledRef.current = false;
            isUploadingRef.current = true;
            setUploadProgress({ current: 0, total: totalRows, stepMessage: "Membaca & memvalidasi data katalog referensi..." });

            // Peta SKU ke ID master_tasks untuk auto-sync deskripsi, barcode & harga
            const skuToTaskDocIds = new Map<string, string[]>();
            masterDataList.forEach(m => {
                if (!m.SKU) return;
                if (!skuToTaskDocIds.has(m.SKU)) skuToTaskDocIds.set(m.SKU, []);
                skuToTaskDocIds.get(m.SKU)!.push(m.id || `${m.Location}_${m.SKU}`);
            });

            const CHUNK_SIZE = 100;
            let successCount = 0;

            for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
                if (isUploadCancelledRef.current) {
                    triggerNotification("Upload katalog dibatalkan.");
                    break;
                }

                const chunk = json.slice(i, i + CHUNK_SIZE);
                const batch = writeBatch(db);

                chunk.forEach((row: any) => {
                    const rawSku = (row['SKU'] || row['SKU BARANG'] || row['Kode Barang'] || row['sku'] || '').toString().trim();
                    if (!rawSku) return;

                    const skuKey = sanitizeDocId(rawSku);
                    const owner = (row['Owner'] || row['OWNER'] || row['owner'] || 'DDI').toString().trim();
                    const desc = (row['Description'] || row['DESKRIPSI PRODUK'] || row['Deskripsi'] || row['Nama Produk'] || row['description'] || '').toString().trim();
                    const upc1 = (row['UPC 1'] || row['UPC1'] || row['UPC 1 (ECERAN)'] || row['Barcode'] || row['barcode'] || row['upc1'] || '').toString().trim();
                    const upc2 = (row['UPC 2'] || row['UPC2'] || row['UPC 2 (KARDUS)'] || row['Barcode Kardus'] || row['upc2'] || '').toString().trim();
                    const brand = (row['SKU Brand'] || row['BRAND'] || row['Brand'] || row['Merk'] || row['brand'] || '').toString().trim();
                    const satuan = (row['satuan hitung'] || row['SATUAN HITUNG'] || row['Satuan'] || row['UOM'] || 'PCS').toString().trim();
                    const rawPrice = row['Unit Price'] ?? row['HARGA SATUAN'] ?? row['Harga Satuan'] ?? row['Price'] ?? row['harga'];
                    const unitPrice = parseInt(rawPrice, 10) || 0;

                    const catalogDoc = {
                        SKU: rawSku,
                        Owner: owner,
                        Description: desc,
                        UPC1: upc1,
                        UPC2: upc2,
                        SKUBrand: brand,
                        satuanHitung: satuan,
                        unitPrice: unitPrice,
                        updatedAt: new Date().toISOString()
                    };

                    const catRef = doc(db, "sku_catalog", skuKey);
                    batch.set(catRef, catalogDoc, { merge: true });
                    successCount++;

                    // Sinkronkan ke master_tasks jika SKU tersebut ada di task operasional aktif
                    if (skuToTaskDocIds.has(rawSku)) {
                        skuToTaskDocIds.get(rawSku)!.forEach(tId => {
                            const tRef = doc(db, "master_tasks", tId);
                            const syncUpdates: any = {};
                            if (desc) syncUpdates.Description = desc;
                            if (upc1) syncUpdates.UPC1 = upc1;
                            if (upc2) syncUpdates.UPC2 = upc2;
                            if (brand) syncUpdates.SKUBrand = brand;
                            if (satuan) syncUpdates.satuanHitung = satuan;
                            if (unitPrice > 0) syncUpdates.unitPrice = unitPrice;
                            if (Object.keys(syncUpdates).length > 0) {
                                batch.set(tRef, syncUpdates, { merge: true });
                            }
                        });
                    }
                });

                await batch.commit();

                setUploadProgress({
                    current: Math.min(i + CHUNK_SIZE, totalRows),
                    total: totalRows,
                    stepMessage: `Menyimpan referensi SKU (${Math.min(i + CHUNK_SIZE, totalRows).toLocaleString('id-ID')} / ${totalRows.toLocaleString('id-ID')})...`
                });
            }

            isUploadingRef.current = false;
            setUploadProgress(null);
            const refreshSnap = await getDocs(collection(db, "sku_catalog"));
            setCatalogDataList(refreshSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            triggerNotification(`Berhasil mengunggah ${successCount} referensi SKU ke Master Katalog!`);
        } catch (err: any) {
            console.error("Error upload SKU catalog:", err);
            isUploadingRef.current = false;
            setUploadProgress(null);
            triggerNotification(`Gagal mengunggah katalog: ${err.message || 'Format tidak valid'}`);
        }
    };

    const handleOpenHistoricalProject = (proj: ProjectSession) => {
        setActiveProject(proj); setViewState('DASHBOARD'); setActiveTab('progress');
        triggerNotification(`Membuka Dashboard Project "${proj.sessionCode}"`);
    };

    const handleConfirmDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            triggerNotification(`Menghapus project ${projectToDelete.sessionCode} & seluruh data task...`);

            await deleteDoc(doc(db, "projects", projectToDelete.id));

            const tasksSnap = await getDocs(collection(db, "master_tasks"));
            const CHUNK = 400;
            const taskDocs = tasksSnap.docs;

            for (let i = 0; i < taskDocs.length; i += CHUNK) {
                const chunk = taskDocs.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(docSnap => batch.delete(docSnap.ref));
                await batch.commit();
            }

            const auditSnap = await getDocs(collection(db, "audit_logs"));
            for (let i = 0; i < auditSnap.docs.length; i += CHUNK) {
                const chunk = auditSnap.docs.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(docSnap => batch.delete(docSnap.ref));
                await batch.commit();
            }

            triggerNotification(`Project "${projectToDelete.sessionCode}" & seluruh task berhasil dihapus bersih!`);
            setProjectToDelete(null);
        } catch (err: any) {
            console.error("Delete project error:", err);
            triggerNotification("Gagal menghapus data project.");
        }
    };

    const handleStartNewProjectSession = async () => {
        try {
            const allLocs = [...warehouseList, ...consignmentStoreList];
            const matched = allLocs.find(l => l.id === wizLocationId);
            const locName = matched ? matched.name : (wizLocationId || 'Gudang Utama');
            const projId = `PROJ-${Date.now().toString().slice(-4)}`;
            const newSession: ProjectSession = {
                id: projId,
                sessionCode: wizSessionCode.trim() || `SO-${wizLocationId}-${wizOpnameDate}`,
                locationId: wizLocationId || 'WH-01', locationName: locName, opnameDate: wizOpnameDate,
                method: wizMethod, status: 'LIVE_ACTIVE', createdAt: new Date().toLocaleString(),
                currentRound: 1
            };
            await setDoc(doc(db, "projects", projId), newSession);
            setActiveProject(newSession);

            if (initialFileToUpload) {
                await parseXLSXFile(initialFileToUpload, projId);
            }
            setRecoveryAdjustments({});
            setViewState('DASHBOARD');
            setActiveTab('progress');
            triggerNotification(`Project Baru Diluncurkan: ${newSession.sessionCode}`);
        } catch (err: any) {
            console.error("Gagal meluncurkan project session:", err);
        }
    };

    const handleAddWarehouseCloud = async () => {
        if (newWhName.trim()) {
            const id = `WH-${(warehouseList.length + 1).toString().padStart(2, '0')}`;
            await setDoc(doc(db, "warehouses", id), { name: newWhName.trim(), type: 'NON_CONSIGNMENT' });
            setNewWhName(''); triggerNotification(`Gudang "${newWhName.trim()}" tersimpan!`);
        }
    };

    const handleAddStoreCloud = async () => {
        if (newStoreName.trim()) {
            const id = `STORE-${(consignmentStoreList.length + 1).toString().padStart(2, '0')}`;
            await setDoc(doc(db, "consignment_stores", id), { name: newStoreName.trim(), type: 'CONSIGNMENT' });
            setNewStoreName(''); triggerNotification(`Toko "${newStoreName.trim()}" tersimpan!`);
        }
    };

    const handleSaveRecoveryOverride = (sku: string, newQty: number) => {
        if (effectiveRole === 'spv') {
            triggerNotification('Hanya Owner yang berwenang melakukan override recovery.');
            return;
        }
        setRecoveryAdjustments(prev => ({ ...prev, [sku]: newQty }));
        setMasterDataList(prev => prev.map(m => m.SKU === sku ? { ...m, countedQty: newQty, currentRound: 4, isCounted: true } : m));
        triggerNotification(`Stok SKU ${sku} disesuaikan ke ${newQty}!`);
    };

    const handleDownloadTeamTemplate = () => {
        const csvContent = "Username,Role\nriski.so,spv\nputri.so,counter";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Assign_Tim_Project.csv');
        link.click();
        triggerNotification('Template Tim Project (.csv) diunduh!');
    };

    const handleAssignTeamManual = async () => {
        if (!activeProject || !assignUsername) return;
        const cleanUser = assignUsername.toLowerCase().trim();

        await setDoc(doc(db, "project_teams", `${activeProject.id}_${cleanUser}`), {
            projectId: activeProject.id,
            username: cleanUser,
            role: assignRole
        });

        await setDoc(doc(db, "global_accounts", cleanUser), {
            role: assignRole
        }, { merge: true });

        setAssignUsername('');
        triggerNotification(`Sukses! ${cleanUser} resmi ditugaskan sebagai ${assignRole}!`);
    };

    const handleRemoveTeamMember = async (username: string) => {
        if (!activeProject) return;
        const cleanUser = username.toLowerCase().trim();

        await deleteDoc(doc(db, "project_teams", `${activeProject.id}_${cleanUser}`));
        await setDoc(doc(db, "global_accounts", cleanUser), {
            role: 'counter'
        }, { merge: true });

        triggerNotification(`Akses SPV/Counter ${cleanUser} dicabut.`);
    };

    const activeTeamMembers = activeProject ? allProjectTeams.filter(t => t.projectId === activeProject.id) : [];

    // 1. OPTIMIZED COUNTER GROUPS (Single-pass O(N))
    const counterGroups = useMemo(() => {
        const counterMaxRoundMap = new Map<string, number>();
        for (let i = 0; i < masterDataList.length; i++) {
            const item = masterDataList[i];
            const cName = item.counter || 'Unassigned';
            const round = item.currentRound || 1;
            const curMax = counterMaxRoundMap.get(cName) || 1;
            if (round > curMax) counterMaxRoundMap.set(cName, round);
        }

        const groups: Record<string, { total: number; counted: number; errorCount: number }> = {};
        for (let i = 0; i < masterDataList.length; i++) {
            const item = masterDataList[i];
            const cName = item.counter || 'Unassigned';
            if (!groups[cName]) groups[cName] = { total: 0, counted: 0, errorCount: 0 };

            const activeRound = counterMaxRoundMap.get(cName) || 1;
            if (item.currentRound === activeRound) {
                groups[cName].total++;
                if (item.isCounted) {
                    groups[cName].counted++;
                    if ((item.countedQty ?? item.Qty) !== item.Qty) groups[cName].errorCount++;
                }
            }
        }
        return groups;
    }, [masterDataList]);

    const filteredCounterNames = useMemo(() => {
        const lowerSearch = counterSearch.toLowerCase();
        return Object.keys(counterGroups).filter(cName =>
            cName.toLowerCase().includes(lowerSearch)
        );
    }, [counterGroups, counterSearch]);

    const counterDiscrepancies = useMemo(() => {
        if (!selectedCounterForDetail) return [];
        return masterDataList.filter(m => m.counter === selectedCounterForDetail && m.isCounted && (m.countedQty ?? m.Qty) !== m.Qty);
    }, [masterDataList, selectedCounterForDetail]);

    // 1b. PENDING RACKS FOR SOURCE COUNTER (HANYA RAK 100% PENDING BELUM DIHITUNG)
    const pendingRacksForSource = useMemo(() => {
        if (!reassignModal.sourceCounter) return [];
        const cleanSource = reassignModal.sourceCounter.toLowerCase().trim();
        const sourceTasks = masterDataList.filter(m => (m.counter || '').toLowerCase().trim() === cleanSource);

        const groups: Record<string, { rack: string; zone: string; currentRound: number; tasks: MasterSKUItem[] }> = {};
        sourceTasks.forEach(t => {
            const loc = (t.Location || 'NO-LOC').trim();
            if (!groups[loc]) {
                groups[loc] = {
                    rack: loc,
                    zone: t.Zone || 'RACKING',
                    currentRound: t.currentRound || 1,
                    tasks: []
                };
            }
            groups[loc].tasks.push(t);
        });

        const purePendingList = Object.values(groups).filter(g => {
            return g.tasks.every(t => !t.isCounted);
        }).map(g => ({
            rack: g.rack,
            zone: g.zone,
            skuCount: g.tasks.length,
            currentRound: g.currentRound,
            tasks: g.tasks
        }));

        if (!reassignModal.searchRack.trim()) return purePendingList;
        const q = reassignModal.searchRack.toLowerCase().trim();
        return purePendingList.filter(p => p.rack.toLowerCase().includes(q) || p.zone.toLowerCase().includes(q));
    }, [masterDataList, reassignModal.sourceCounter, reassignModal.searchRack]);

    // 1c. TARGET COUNTERS OPTIONS WITH PROGRESS BADGE
    const targetCounterOptions = useMemo(() => {
        const cleanSource = reassignModal.sourceCounter.toLowerCase().trim();
        const allKnownCounters = Array.from(new Set([
            ...Object.keys(counterGroups),
            ...globalAccounts.map(a => a.username)
        ])).filter(name => name.toLowerCase().trim() !== cleanSource && name.toLowerCase().trim() !== 'unassigned');

        return allKnownCounters.map(cName => {
            const cData = counterGroups[cName];
            const pct = cData && cData.total > 0 ? Math.round((cData.counted / cData.total) * 100) : 0;
            const is100Done = cData && cData.total > 0 && cData.counted === cData.total;
            const labelSuffix = is100Done ? ' — 100% Selesai (Siap Bantu ✨)' : (cData ? ` — ${pct}% Progress (${cData.counted}/${cData.total} SKU)` : '');
            return {
                value: cName,
                label: `${cName}${labelSuffix}`
            };
        });
    }, [reassignModal.sourceCounter, counterGroups, globalAccounts]);

    // 2. FILTERED SKU CATALOG WITH PAGINATION (Single-pass Map O(N))
    const filteredSKUCatalog = useMemo(() => {
        const catalogMap = new Map<string, any>();

        // Sumber 1: Master SKU Catalog yang diunggah terpisah
        for (let i = 0; i < catalogDataList.length; i++) {
            const c = catalogDataList[i];
            if (!c.SKU) continue;
            catalogMap.set(c.SKU, {
                SKU: c.SKU,
                Owner: c.Owner || 'DDI',
                Description: c.Description || '-',
                UPC1: c.UPC1 || '-',
                UPC2: c.UPC2 || '-',
                SKUBrand: c.SKUBrand || '-',
                satuanHitung: c.satuanHitung || 'PCS',
                unitPrice: c.unitPrice || 0
            });
        }

        // Sumber 2: Data SKU dari Master Task WMS aktif
        for (let i = 0; i < masterDataList.length; i++) {
            const m = masterDataList[i];
            if (!m.SKU) continue;
            if (!catalogMap.has(m.SKU)) {
                catalogMap.set(m.SKU, {
                    SKU: m.SKU,
                    Owner: m.Owner || 'DDI',
                    Description: m.Description || '-',
                    UPC1: m.UPC1 || '-',
                    UPC2: m.UPC2 || '-',
                    SKUBrand: m.SKUBrand || '-',
                    satuanHitung: m.satuanHitung || 'PCS',
                    unitPrice: m.unitPrice || 0
                });
            } else {
                const item = catalogMap.get(m.SKU);
                if (item.Description === '-' && m.Description) item.Description = m.Description;
                if (item.UPC1 === '-' && m.UPC1) item.UPC1 = m.UPC1;
                if (item.UPC2 === '-' && m.UPC2) item.UPC2 = m.UPC2;
                if (item.SKUBrand === '-' && m.SKUBrand) item.SKUBrand = m.SKUBrand;
                if (item.unitPrice === 0 && m.unitPrice) item.unitPrice = m.unitPrice;
            }
        }

        const lowerSearch = catalogSearch.toLowerCase();
        const allItems = Array.from(catalogMap.values());
        if (!lowerSearch) return allItems;
        return allItems.filter(c =>
            c.SKU.toLowerCase().includes(lowerSearch) ||
            c.Description.toLowerCase().includes(lowerSearch) ||
            c.UPC1.toLowerCase().includes(lowerSearch) ||
            (c.UPC2 && c.UPC2.toLowerCase().includes(lowerSearch)) ||
            (c.SKUBrand && c.SKUBrand.toLowerCase().includes(lowerSearch))
        );
    }, [catalogDataList, masterDataList, catalogSearch]);

    const totalCatalogPages = Math.ceil(filteredSKUCatalog.length / ITEMS_PER_PAGE) || 1;
    const paginatedSKUCatalog = useMemo(() => {
        return filteredSKUCatalog.slice(
            (catalogCurrentPage - 1) * ITEMS_PER_PAGE,
            catalogCurrentPage * ITEMS_PER_PAGE
        );
    }, [filteredSKUCatalog, catalogCurrentPage]);

    // 3. FILTERED MASTER TASK WITH PAGINATION
    const filteredMasterTask = useMemo(() => {
        const lower = masterTaskSearch.toLowerCase();
        if (!lower) return masterDataList;
        return masterDataList.filter(m =>
            m.SKU.toLowerCase().includes(lower) ||
            m.Location.toLowerCase().includes(lower) ||
            m.Description.toLowerCase().includes(lower) ||
            m.counter.toLowerCase().includes(lower)
        );
    }, [masterDataList, masterTaskSearch]);

    const totalMasterPages = Math.ceil(filteredMasterTask.length / ITEMS_PER_PAGE) || 1;
    const paginatedMasterTask = useMemo(() => {
        return filteredMasterTask.slice(
            (masterCurrentPage - 1) * ITEMS_PER_PAGE,
            masterCurrentPage * ITEMS_PER_PAGE
        );
    }, [filteredMasterTask, masterCurrentPage]);

    // 4. STATISTIK GLOBAL & PROGRESS (Memoized)
    const totalSKUs = masterDataList.length;
    const totalCounted = useMemo(() => masterDataList.filter(i => i.isCounted).length, [masterDataList]);
    const overallPercentage = totalSKUs > 0 ? Math.round((totalCounted / totalSKUs) * 100) : 0;
    const totalSystemUnits = useMemo(() => masterDataList.reduce((acc, m) => acc + (m.Qty || 0), 0), [masterDataList]);
    const totalCountedUnits = useMemo(() => masterDataList.reduce((acc, m) => acc + (m.isCounted ? (m.countedQty ?? m.Qty ?? 0) : 0), 0), [masterDataList]);
    const liveIssues = useMemo(() => masterDataList.filter(item => item.isCounted && (item.countedQty ?? item.Qty) !== item.Qty), [masterDataList]);

    // 5. LEVEL PROGRESS (Single-pass O(N))
    const levelProgress = useMemo(() => {
        const levelMap: Record<string, { total: number; counted: number }> = {};
        for (let i = 0; i < masterDataList.length; i++) {
            const item = masterDataList[i];
            const l = item.level || 'Unassigned';
            if (!levelMap[l]) levelMap[l] = { total: 0, counted: 0 };
            levelMap[l].total++;
            if (item.isCounted) levelMap[l].counted++;
        }
        return Object.keys(levelMap).map(name => {
            const group = levelMap[name];
            return {
                name,
                total: group.total,
                counted: group.counted,
                percentage: group.total > 0 ? Math.round((group.counted / group.total) * 100) : 0
            };
        });
    }, [masterDataList]);

    // 6. BRAND ACCURACY (Single-pass Grouping O(N))
    const brandAccuracyList = useMemo(() => {
        const brandGroupMap = new Map<string, Map<string, { SKU: string; Qty: number; countedTargetQty: number; countedQty: number; isCounted: boolean }>>();

        for (let i = 0; i < masterDataList.length; i++) {
            const item = masterDataList[i];
            const brand = item.SKUBrand || 'No Brand';
            let skuMap = brandGroupMap.get(brand);
            if (!skuMap) {
                skuMap = new Map();
                brandGroupMap.set(brand, skuMap);
            }

            const existing = skuMap.get(item.SKU);
            if (!existing) {
                skuMap.set(item.SKU, {
                    SKU: item.SKU,
                    Qty: item.Qty || 0,
                    countedTargetQty: item.isCounted ? (item.Qty || 0) : 0,
                    countedQty: item.isCounted ? (item.countedQty || 0) : 0,
                    isCounted: !!item.isCounted
                });
            } else {
                existing.Qty += (item.Qty || 0);
                if (item.isCounted) {
                    existing.countedTargetQty += (item.Qty || 0);
                    existing.countedQty += (item.countedQty || 0);
                    existing.isCounted = true;
                }
            }
        }

        const lowerBrandSearch = brandSearch.toLowerCase();
        const result = [];

        for (const [brandName, skuMap] of brandGroupMap.entries()) {
            if (lowerBrandSearch && !brandName.toLowerCase().includes(lowerBrandSearch)) {
                continue;
            }

            const aggregatedSKUList = Array.from(skuMap.values());
            const countedSKUs = aggregatedSKUList.filter(m => m.isCounted);
            const diffCount = countedSKUs.filter(m => m.countedQty !== m.countedTargetQty).length;

            let accuracyPct = 0;
            const isFullyUncounted = countedSKUs.length === 0;

            if (countedSKUs.length > 0) {
                accuracyPct = Math.max(0, Math.round(((countedSKUs.length - diffCount) / countedSKUs.length) * 100));
            }

            const passesFilter = brandStatusFilter === 'all' ||
                (brandStatusFilter === 'selisih' ? diffCount > 0 :
                    (brandStatusFilter === 'match' ? (!isFullyUncounted && diffCount === 0) : isFullyUncounted));

            if (passesFilter) {
                result.push({
                    brand: brandName,
                    totalSKUs: aggregatedSKUList.length,
                    countedCount: countedSKUs.length,
                    diffSKUs: diffCount,
                    accuracyPct,
                    isFullyUncounted,
                    skuList: aggregatedSKUList
                });
            }
        }
        return result;
    }, [masterDataList, brandSearch, brandStatusFilter]);

    // 7. FINANCIAL VARIANCE & RECONCILIATION SUMMARY (Memoized)
    const matchRecoveryCount = useMemo(() => masterDataList.filter(m => m.isCounted && (m.countedQty ?? m.Qty) === m.Qty).length, [masterDataList]);
    const varianceRecoveryCount = useMemo(() => masterDataList.filter(m => {
        if (m.isCounted) return (m.countedQty ?? m.Qty) !== m.Qty;
        return m.currentRound > 1 && m.round1Actual !== undefined && m.round1Actual !== m.Qty;
    }).length, [masterDataList]);
    const totalFinancialVarianceValue = useMemo(() => masterDataList.reduce((acc, m) => {
        if (m.isCounted) {
            return acc + (((m.countedQty ?? m.Qty) - m.Qty) * (m.unitPrice || 0));
        }
        if (m.currentRound > 1 && m.round1Actual !== undefined && m.round1Actual !== m.Qty) {
            return acc + ((m.round1Actual - m.Qty) * (m.unitPrice || 0));
        }
        return acc;
    }, 0), [masterDataList]);

    // 8. DISCREPANCY TABLE LIST & PAGINATION (Pencegah Freeze Layar Rekapitulasi)
    const filteredDiscrepancies = useMemo(() => {
        return masterDataList.filter(i => {
            if (i.isCounted) {
                return ((i.countedQty || 0) - i.Qty) !== 0;
            }
            return i.currentRound > 1 && i.round1Actual !== undefined && i.round1Actual !== i.Qty;
        });
    }, [masterDataList]);

    const totalReconPages = Math.ceil(filteredDiscrepancies.length / ITEMS_PER_PAGE) || 1;
    const paginatedDiscrepancies = useMemo(() => {
        return filteredDiscrepancies.slice(
            (reconCurrentPage - 1) * ITEMS_PER_PAGE,
            reconCurrentPage * ITEMS_PER_PAGE
        );
    }, [filteredDiscrepancies, reconCurrentPage]);

    return (
        <div className={`min-h-screen font-sans relative ${viewState === 'DASHBOARD' ? 'w-full p-0 max-w-none bg-slate-50 text-slate-800' : 'bg-[#F4F6F9] text-slate-900 p-4 lg:p-8 min-h-screen'}`}>
            {/* ATMOSPHERIC TECH GRID (LIGHT MODE) */}
            {viewState !== 'DASHBOARD' && (
                <>
                    <div 
                        className="fixed inset-0 pointer-events-none opacity-40 z-0"
                        style={{
                            backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
                            backgroundSize: '36px 36px'
                        }}
                    />
                    <div className="fixed top-10 left-1/4 -translate-x-1/2 w-140 h-140 bg-cyan-400/10 rounded-full blur-[150px] pointer-events-none z-0" />
                    <div className="fixed bottom-10 right-1/4 translate-x-1/2 w-100 h-100 bg-sky-400/10 rounded-full blur-[130px] pointer-events-none z-0" />
                </>
            )}

            {/* OVERLAY MODAL UPLOAD PROGRESS DENGAN TOMBOL CANCEL */}
            {uploadProgress && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-100">
                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                        <div>
                            <h3 className="font-black text-slate-900 text-base">Mengunggah Task ke Cloud</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {uploadProgress.stepMessage ||
                                    (uploadProgress.current === 0
                                        ? "Mempersiapkan data dan antrean..."
                                        : "Mengunggah data multi-batch secara cepat...")}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-bold text-indigo-600">
                                {uploadProgress.current.toLocaleString('id-ID')} / {uploadProgress.total.toLocaleString('id-ID')} Data ({Math.round((uploadProgress.current / uploadProgress.total) * 100)}%)
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                isUploadCancelledRef.current = true;
                                isUploadingRef.current = false;
                                setUploadProgress(null);
                                triggerNotification("Upload dibatalkan oleh pengguna.");
                            }}
                            className="w-full py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                            Hentikan / Cancel Upload
                        </button>
                    </div>
                </div>
            )}

            {showToast && (
                <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in slide-in-from-top-4 duration-300">
                    <Check className="w-5 h-5 text-emerald-400" /><span className="text-sm font-semibold">{showToast}</span>
                </div>
            )}

            {credentialsModalText && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-indigo-600" />
                                <span>Kredensial Akun KTP Cloud</span>
                            </h3>
                            <button onClick={() => setCredentialsModalText(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">✕</button>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Salin teks di bawah untuk dikirim langsung via WhatsApp/Group Chat:</p>
                        <textarea
                            readOnly
                            rows={8}
                            value={credentialsModalText}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 outline-none select-all"
                        />
                        <div className="flex justify-between items-center pt-2">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(credentialsModalText);
                                    triggerNotification("Teks Kredensial Berhasil Disalin!");
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer"
                            >
                                <Copy className="w-4 h-4" />
                                <span>Salin Teks Kredensial</span>
                            </button>
                            <button onClick={() => setCredentialsModalText(null)} className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {transferSourceCounter && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><Repeat className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Transfer Tugas Massal</h3>
                                    <p className="text-xs text-slate-500 font-medium">Pindahkan seluruh task milik counter absen.</p>
                                </div>
                            </div>
                            <button onClick={() => setTransferSourceCounter(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">✕</button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                                <span className="text-xs text-slate-500 font-bold block uppercase">Counter Asal (Absen / Tidak Hadir):</span>
                                <span className="text-base font-black text-slate-900 font-mono">{transferSourceCounter}</span>
                                <span className="text-xs text-indigo-600 font-extrabold block">
                                    Total {masterDataList.filter(m => m.counter === transferSourceCounter).length} SKU Task Terdaftar
                                </span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-700 block">Pilih Counter Pengganti (Target):</label>
                                <SearchableSelect
                                    options={globalAccounts.filter(acc => acc.username !== transferSourceCounter).map(acc => ({ value: acc.username, label: `${acc.username} - ${acc.name}` }))}
                                    value={transferTargetCounter}
                                    onChange={setTransferTargetCounter}
                                    placeholder="-- Pilih Counter Pengganti --"
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                            <button onClick={() => setTransferSourceCounter(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
                            <button onClick={handleExecuteBulkTransfer} disabled={!transferTargetCounter} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-lg flex items-center space-x-2 cursor-pointer">
                                <Repeat className="w-4 h-4" />
                                <span>Proses Pindahkan Tugas</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL RE-ASSIGN SISA RAK PENDING (BANTU TEMAN DI LIST TO FLOOR) */}
            {reassignModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in duration-200">
                        {/* HEADER MODAL */}
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-2xl border border-cyan-200">
                                    <ArrowRightLeft className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <span>Bagi Tugas / Oper Sisa Rak</span>
                                        <span className="text-[10px] font-extrabold uppercase bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-md">List To Floor</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">Alihkan rak yang belum disentuh (Pending) ke rekan yang sudah selesai.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setReassignModal(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* SELECT COUNTER ASAL & TUJUAN */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">1. Counter Asal (Pemberi Tugas):</label>
                                <SearchableSelect
                                    options={Object.keys(counterGroups).map(cName => ({
                                        value: cName,
                                        label: `${cName} (${counterGroups[cName].counted}/${counterGroups[cName].total} SKU)`
                                    }))}
                                    value={reassignModal.sourceCounter}
                                    onChange={(val: string) => setReassignModal(prev => ({ ...prev, sourceCounter: val, selectedRacks: [] }))}
                                    placeholder="-- Pilih Counter Asal --"
                                    className="w-full"
                                />
                                <span className="text-[10px] font-bold text-slate-400 block">
                                    Tersedia <b className="text-cyan-700 font-mono">{pendingRacksForSource.length} Rak</b> murni pending
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700 block uppercase tracking-wider">2. Counter Penerima (Pembantu):</label>
                                <SearchableSelect
                                    options={targetCounterOptions}
                                    value={reassignModal.targetCounter}
                                    onChange={(val: string) => setReassignModal(prev => ({ ...prev, targetCounter: val }))}
                                    placeholder="-- Pilih Counter Penerima --"
                                    className="w-full"
                                />
                                <span className="text-[10px] font-bold text-slate-400 block">
                                    Rekomendasi: pilih yang bertanda <b className="text-emerald-600 font-bold">100% Selesai ✨</b>
                                </span>
                            </div>
                        </div>

                        {/* DAFTAR PILIHAN RAK PENDING */}
                        <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">3. Pilih Rak yang Ingin Dialihkan:</span>
                                    <span className="text-[11px] font-black bg-white px-2 py-0.5 rounded-full border border-slate-300 text-slate-700">
                                        {reassignModal.selectedRacks.length} / {pendingRacksForSource.length} Terpilih
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Filter rak / zona..."
                                        value={reassignModal.searchRack}
                                        onChange={(e) => setReassignModal(prev => ({ ...prev, searchRack: e.target.value }))}
                                        className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none flex-1 sm:w-40"
                                    />
                                    {pendingRacksForSource.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleSelectAllPendingRacks}
                                            className="px-2.5 h-8 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors"
                                        >
                                            {reassignModal.selectedRacks.length === pendingRacksForSource.length ? 'Batal Semua' : 'Pilih Semua'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* LIST KARTU RAK CHECKBOX */}
                            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                {pendingRacksForSource.map((rItem) => {
                                    const isChecked = reassignModal.selectedRacks.includes(rItem.rack);
                                    return (
                                        <div
                                            key={rItem.rack}
                                            onClick={() => handleToggleSelectRack(rItem.rack)}
                                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                isChecked
                                                    ? 'bg-cyan-50/90 border-cyan-400 shadow-xs'
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {}} // dikontrol parent div
                                                    className="w-4 h-4 rounded text-cyan-600 cursor-pointer accent-cyan-500"
                                                />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-black text-sm text-slate-900">{rItem.rack}</span>
                                                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                            Zone: {rItem.zone}
                                                        </span>
                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                                            Ronde {rItem.currentRound}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-500 font-medium">
                                                        {rItem.skuCount} SKU terdaftar • Status: <b className="text-amber-700 font-bold">Pending (Belum Dihitung)</b>
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`text-xs font-black px-2 py-1 rounded-lg ${isChecked ? 'bg-cyan-500 text-slate-950' : 'bg-slate-100 text-slate-400'}`}>
                                                {isChecked ? 'Dipilih' : 'Lewati'}
                                            </span>
                                        </div>
                                    );
                                })}

                                {pendingRacksForSource.length === 0 && (
                                    <div className="p-6 text-center bg-white rounded-xl border border-dashed border-slate-200 space-y-1">
                                        <span className="material-symbols-outlined text-slate-300 text-3xl">shelves</span>
                                        <p className="text-xs font-bold text-slate-600">
                                            Tidak ada sisa rak pending untuk counter "{reassignModal.sourceCounter}".
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            Semua rak milik counter ini sudah selesai atau sedang dalam proses perhitungan fisik.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RINGKASAN AUDIT & FOOTER */}
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center gap-2 text-[11px] text-amber-900 font-medium">
                            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                            <span>
                                <b>Audit Trail:</b> Pemindahan ini akan dicatat permanen di log audit dengan nama PIC asal, penerima baru, dan timestamp SO.
                            </span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-600">
                                {reassignModal.selectedRacks.length > 0 ? (
                                    <>Akan mengoper <b className="text-cyan-700">{reassignModal.selectedRacks.length} rak</b> ke <b className="text-slate-900 capitalize">{reassignModal.targetCounter || '...'}</b></>
                                ) : (
                                    'Pilih rak di atas untuk melanjutkan.'
                                )}
                            </span>
                            <div className="flex items-center space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setReassignModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteReassignRacks}
                                    disabled={!reassignModal.targetCounter || reassignModal.selectedRacks.length === 0 || isReassignSubmitting}
                                    className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                                >
                                    {isReassignSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Memindahkan Rak...</span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowRightLeft className="w-4 h-4" />
                                            <span>Konfirmasi Oper Rak</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingAccount && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-black text-slate-900">Edit Akun KTP: {editingAccount.username}</h3>
                            <button onClick={() => setEditingAccount(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">✕</button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-600 block mb-1">Nama Pegawai:</label>
                                <input type="text" value={editingAccount.name} onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })} className="w-full px-4 py-2 text-xs bg-slate-50 border rounded-xl outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 block mb-1">Email Pegawai:</label>
                                <input type="email" value={editingAccount.email} onChange={(e) => setEditingAccount({ ...editingAccount, email: e.target.value })} className="w-full px-4 py-2 text-xs bg-slate-50 border rounded-xl outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 block mb-1">PIN Akses (4-Digit):</label>
                                <input type="text" maxLength={4} value={editingAccount.pin} onChange={(e) => setEditingAccount({ ...editingAccount, pin: e.target.value })} className="w-full px-4 py-2 text-xs font-mono bg-slate-50 border rounded-xl outline-none" />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                            <button onClick={() => setEditingAccount(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
                            <button onClick={handleSaveEditedGlobalAccount} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md">Simpan Perubahan</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedCounterForDetail && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Detail Selisih: {selectedCounterForDetail}</h3>
                                    <p className="text-xs text-slate-500 font-medium">Daftar lokasi rak dan SKU yang mengalami selisih hitung.</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedCounterForDetail(null)} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl">✕</button>
                        </div>

                        <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-2xl scrollbar-thin">
                            <table className="w-full text-left text-xs"><thead className="bg-slate-50 font-bold text-slate-600 border-b"><tr><th className="p-3">LOKASI RAK</th><th className="p-3">SKU</th><th className="p-3">DESKRIPSI</th><th className="p-3 text-center">SYSTEM</th><th className="p-3 text-center">AKTUAL</th><th className="p-3 text-center">SELISIH</th></tr></thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {counterDiscrepancies.map((item, idx) => {
                                        const diff = (item.countedQty || 0) - item.Qty;
                                        return (
                                            <tr key={idx} className="hover:bg-red-50/30">
                                                <td className="p-3 font-mono font-bold text-indigo-600 flex items-center"><MapPin className="w-3.5 h-3.5 text-indigo-400 mr-1" />{item.Location}</td>
                                                <td className="p-3 font-mono font-bold text-slate-900">{item.SKU}</td>
                                                <td className="p-3 truncate max-w-xs">{item.Description}</td>
                                                <td className="p-3 text-center text-slate-500">{item.Qty}</td>
                                                <td className="p-3 text-center font-black">{item.countedQty}</td>
                                                <td className="p-3 text-center font-black text-red-600">{diff > 0 ? `+${diff}` : diff}</td>
                                            </tr>
                                        );
                                    })}
                                    {counterDiscrepancies.length === 0 && (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">Tidak ada selisih ditemukan pada counter ini. All match!</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button onClick={() => setSelectedCounterForDetail(null)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {projectToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                        <div className="flex items-center space-x-3 text-red-600"><AlertTriangle className="w-8 h-8" /><h3 className="text-lg font-black text-slate-900">Hapus Project Cloud</h3></div>
                        <p className="text-sm text-slate-600 leading-relaxed">Yakin hapus project <b className="text-slate-900">{projectToDelete.sessionCode}</b>?</p>
                        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                            <button onClick={() => setProjectToDelete(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold">Batal</button>
                            <button onClick={handleConfirmDeleteProject} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-extrabold shadow-lg">Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

            {deployModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
                                    <Repeat className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h3 className="text-base font-black text-slate-900">
                                            Deploy Ronde {deployModal.sourceRound + 1}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold font-mono">
                                            {deployModal.sourceCounter}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {deployModal.sourceDisputeCount} SKU mengalami selisih di Ronde {deployModal.sourceRound}.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDeployModal(prev => ({ ...prev, isOpen: false }))}
                                disabled={isDeploySubmitting}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Mode Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                                Metode Penugasan Ronde {deployModal.sourceRound + 1}:
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                    <div
                                        onClick={() => setDeployModal(prev => ({ ...prev, mode: 'SWAP' }))}
                                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                                            deployModal.mode === 'SWAP'
                                                ? 'border-cyan-400 bg-cyan-50/50 shadow-xs'
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <Repeat className="w-3.5 h-3.5 text-cyan-600" />
                                                <span>Swap 2 Arah</span>
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                                Mutual
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                                            Saling bertukar tugas selisih dengan partner pilihan.
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setDeployModal(prev => ({ ...prev, mode: 'ASSIGN' }))}
                                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                                            deployModal.mode === 'ASSIGN'
                                                ? 'border-cyan-400 bg-cyan-50/50 shadow-xs'
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                                                <span>Alihkan Selisih</span>
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                                Estafet
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                                            Serahkan selisih ke partner (ideal untuk 3 counter / ganjil).
                                        </p>
                                    </div>

                                    <div
                                        onClick={() => setDeployModal(prev => ({ ...prev, mode: 'KEEP' }))}
                                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                                            deployModal.mode === 'KEEP'
                                                ? 'border-cyan-400 bg-cyan-50/50 shadow-xs'
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                                                <span>Tetap Sendiri</span>
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                                            {deployModal.sourceCounter} menghitung ulang task selisih miliknya.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* If SWAP or ASSIGN Mode: Target Counter Selection with Search Box & Random Pick */}
                            {(deployModal.mode === 'SWAP' || deployModal.mode === 'ASSIGN') && (
                                <div className="space-y-3 pt-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                                            {deployModal.mode === 'SWAP' ? 'Pilih Partner untuk Bertukar:' : 'Pilih Partner Penerima Tugas:'}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const eligibleCandidates = filteredCounterNames.filter(cName => {
                                                    if (cName === deployModal.sourceCounter) return false;
                                                    const cData = counterGroups[cName];
                                                    const cTasks = masterDataList.filter(m => m.counter === cName);
                                                    const cRound = cTasks.length > 0 ? Math.max(...cTasks.map(t => t.currentRound || 1)) : 1;
                                                    const isAlreadyInNextRound = cRound === deployModal.sourceRound + 1;
                                                    const isSameRoundDone = (cRound === deployModal.sourceRound) && (cData && cData.total > 0 && cData.counted === cData.total);
                                                    return isAlreadyInNextRound || isSameRoundDone;
                                                });
                                                if (eligibleCandidates.length > 0) {
                                                    const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
                                                    const chosen = eligibleCandidates[randomIndex];
                                                    setDeployModal(prev => ({ ...prev, targetCounter: chosen }));
                                                    triggerNotification(`🎲 Terpilih acak: ${chosen}`);
                                                } else {
                                                    triggerNotification("Tidak ada partner lain yang memenuhi syarat.");
                                                }
                                            }}
                                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                                            title="Pilih partner secara acak dari yang tersedia"
                                        >
                                            <Shuffle className="w-3 h-3" />
                                            <span>🎲 Pasangkan Acak</span>
                                        </button>
                                    </div>

                                    {/* Search Box */}
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={deployModal.searchQuery}
                                            onChange={(e) => setDeployModal(prev => ({ ...prev, searchQuery: e.target.value }))}
                                            placeholder="Cari nama counter..."
                                            className="cipher-input w-full pl-9 pr-3 py-2 rounded-xl text-xs font-bold outline-none"
                                        />
                                    </div>

                                    {/* Counter Candidate List */}
                                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                        {filteredCounterNames
                                            .filter(cName => cName !== deployModal.sourceCounter)
                                            .filter(cName => cName.toLowerCase().includes(deployModal.searchQuery.toLowerCase()))
                                            .map((cName) => {
                                                const cData = counterGroups[cName];
                                                const cTasks = masterDataList.filter(m => m.counter === cName);
                                                const cRound = cTasks.length > 0 ? Math.max(...cTasks.map(t => t.currentRound || 1)) : 1;
                                                const isAlreadyInNextRound = cRound === deployModal.sourceRound + 1;
                                                const isSameRoundDone = (cRound === deployModal.sourceRound) && (cData && cData.total > 0 && cData.counted === cData.total);
                                                const isEligible = isAlreadyInNextRound || isSameRoundDone;
                                                const isSelected = deployModal.targetCounter === cName;

                                                return (
                                                    <div
                                                        key={cName}
                                                        onClick={() => {
                                                            if (isEligible) {
                                                                setDeployModal(prev => ({ ...prev, targetCounter: cName }));
                                                            }
                                                        }}
                                                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                                                            !isEligible
                                                                ? 'bg-slate-100/60 border-slate-200 opacity-60 cursor-not-allowed'
                                                                : isSelected
                                                                    ? 'bg-cyan-50 border-cyan-400 shadow-xs cursor-pointer'
                                                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center uppercase shrink-0">
                                                                {cName.slice(0, 2)}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-xs font-black text-slate-900 capitalize">{cName}</span>
                                                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                        Ronde {cRound}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500">
                                                                    {cData ? `${cData.counted} / ${cData.total} SKU (${cData.errorCount} Selisih)` : '0 SKU'}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            {isSelected ? (
                                                                <span className="text-[10px] font-bold text-cyan-800 bg-cyan-200/80 px-2.5 py-1 rounded-lg">
                                                                    ✓ Terpilih
                                                                </span>
                                                            ) : isAlreadyInNextRound ? (
                                                                <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                                                                    Siap di R{cRound}
                                                                </span>
                                                            ) : isSameRoundDone ? (
                                                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                                    Selesai R{cRound}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                                                                    Belum 100% (R{cRound})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                        {filteredCounterNames.filter(cName => cName !== deployModal.sourceCounter).length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-4">
                                                Tidak ada counter lain yang terdaftar.
                                            </p>
                                        )}
                                    </div>

                                    {/* Preview comparison card */}
                                    {deployModal.targetCounter && (
                                        <div className="p-3.5 bg-cyan-50/70 border border-cyan-200 rounded-2xl space-y-2">
                                            <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">
                                                {deployModal.mode === 'SWAP' ? 'Ringkasan Pertukaran 2 Arah (Mutual Swap):' : 'Ringkasan Pengalihan Tugas Selisih (Estafet):'}
                                            </span>
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                                                <div className="text-center flex-1">
                                                    <span className="block text-slate-500 font-normal text-[10px]">Tugas Selisih Dari</span>
                                                    <span className="capitalize font-black text-cyan-950">{deployModal.sourceCounter}</span>
                                                    <span className="block text-rose-600 font-mono text-[11px] font-black">{deployModal.sourceDisputeCount} SKU</span>
                                                </div>
                                                <div className="p-2 bg-white rounded-full shadow-xs text-cyan-600 shrink-0">
                                                    {deployModal.mode === 'SWAP' ? <Repeat className="w-4 h-4" /> : <ArrowRightLeft className="w-4 h-4" />}
                                                </div>
                                                <div className="text-center flex-1">
                                                    <span className="block text-slate-500 font-normal text-[10px]">Ditugaskan Ke</span>
                                                    <span className="capitalize font-black text-cyan-950">{deployModal.targetCounter}</span>
                                                    <span className="block text-slate-500 font-mono text-[11px] font-bold">
                                                        {deployModal.mode === 'SWAP' ? `${counterGroups[deployModal.targetCounter]?.errorCount || 0} SKU` : 'Pemeriksa Baru'}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-cyan-900/80 text-center leading-snug">
                                                Barang yang sudah cocok (match) tetap terkunci dan tidak ikut bertukar.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                                <button
                                    onClick={() => setDeployModal(prev => ({ ...prev, isOpen: false }))}
                                    disabled={isDeploySubmitting}
                                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleExecuteDeploy}
                                    disabled={isDeploySubmitting || ((deployModal.mode === 'SWAP' || deployModal.mode === 'ASSIGN') && !deployModal.targetCounter)}
                                    className="px-6 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black shadow-md flex items-center space-x-2 cursor-pointer transition-all"
                                >
                                    {isDeploySubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                                            <span>Menyimpan ke Cloud...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircle className="w-4 h-4 text-slate-950" />
                                            <span>Deploy Ronde {deployModal.sourceRound + 1} Sekarang</span>
                                        </>
                                    )}
                                </button>
                            </div>
                    </div>
                </div>
            )}

            {/* SCREEN 1: LANDING PAGE */}
            {viewState === 'LANDING' && (
                <div className="space-y-6 animate-in fade-in duration-500 relative z-10 max-w-7xl mx-auto">
                    {/* TOP COMMAND HEADER (NOCTUS LIGHT ENTERPRISE) */}
                    <div className="relative overflow-hidden rounded-3xl p-6 sm:p-7 bg-white border border-slate-200/90 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                        <div className="flex items-center space-x-4 relative z-10">
                            <div className="w-13 h-13 flex items-center justify-center shrink-0">
                                <img 
                                    src="/logo.png" 
                                    alt="Noctus Count Monogram" 
                                    className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                                    style={{ filter: 'drop-shadow(0 0 12px rgba(0,242,254,0.4)) drop-shadow(0 2px 6px rgba(15,23,42,0.1))' }}
                                />
                            </div>
                            <div className="space-y-0.5">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-[0.2em] uppercase flex items-center gap-2.5">
                                    <span>NOCTUS COUNT</span>
                                    <span className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-300 rounded-md">
                                        SYSTEMS
                                    </span>
                                </h1>
                                <p className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase font-bold">
                                    ENTERPRISE STOCK OPNAME • DEVELOPED BY <span className="text-cyan-600 font-extrabold">NOCTUS</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 w-full md:w-auto relative z-10">
                            {onSwitchToCounterView && (
                                <button
                                    onClick={onSwitchToCounterView}
                                    className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs"
                                    title="Buka Tampilan HP Counter untuk Demo"
                                >
                                    <Smartphone className="w-4 h-4 text-emerald-600" />
                                    <span className="hidden sm:inline">Demo Mode Counter</span>
                                </button>
                            )}
                            {effectiveRole === 'owner' && (
                                <button 
                                    onClick={() => setViewState('WIZARD_SETUP')} 
                                    className="flex-1 md:flex-none px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(0,242,254,0.3)] transition-all cursor-pointer active:scale-95"
                                >
                                    <Plus className="w-4 h-4" /><span>New Project</span>
                                </button>
                            )}
                            <button 
                                onClick={onBackToApp} 
                                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer"
                                title="Keluar"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* INTERACTIVE NAVIGATION & TELEMETRY STRIP */}
                    {effectiveRole === 'owner' && (
                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 p-2 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
                            {/* LEFT: TABS */}
                            <div className="flex space-x-2">
                                <button 
                                    onClick={() => setLandingTab('projects')} 
                                    className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
                                        landingTab === 'projects' 
                                            ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.25)]' 
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Building2 className="w-3.5 h-3.5" /><span>Lokasi & Project</span>
                                </button>
                                <button 
                                    onClick={() => setLandingTab('accounts')} 
                                    className={`px-4 py-2 text-xs font-mono font-bold tracking-wider uppercase rounded-xl transition-all flex items-center space-x-2 cursor-pointer ${
                                        landingTab === 'accounts' 
                                            ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,242,254,0.25)]' 
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    }`}
                                >
                                    <Contact className="w-3.5 h-3.5" /><span>KTP Cloud</span>
                                </button>
                            </div>

                            {/* RIGHT: SYSTEM TELEMETRY CAPSULE */}
                            <div className="flex items-center space-x-3 px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono">
                                <div className="flex items-center space-x-1.5 text-slate-600">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">WMS:</span>
                                    <span className="font-black text-slate-900">{warehouseList.length}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 text-slate-600 border-l border-slate-200 pl-3">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Consign:</span>
                                    <span className="font-black text-slate-900">{consignmentStoreList.length}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 text-slate-600 border-l border-slate-200 pl-3">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Projects:</span>
                                    <span className="font-black text-cyan-700">{projectHistory.length}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-3">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] text-emerald-700 uppercase tracking-widest font-black">ONLINE</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {landingTab === 'projects' && (
                        <div className="space-y-6">
                            {effectiveRole === 'owner' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* MASTER GUDANG WMS */}
                                    <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-4">
                                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                            <h3 className="text-sm font-mono font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                                                <Building2 className="w-4 h-4 text-cyan-600" />
                                                <span>Master Gudang WMS</span>
                                            </h3>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-300 font-bold">
                                                {warehouseList.length} Gudang
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Nama Gudang Baru..." 
                                                value={newWhName} 
                                                onChange={(e) => setNewWhName(e.target.value)} 
                                                className="cipher-input flex-1 px-3.5 py-2 text-xs font-mono font-bold rounded-xl outline-none" 
                                            />
                                            <button 
                                                onClick={handleAddWarehouseCloud} 
                                                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                                            >
                                                + Tambah
                                            </button>
                                        </div>
                                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                            {warehouseList.map((wh) => (
                                                <div key={wh.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex justify-between items-center transition-colors">
                                                    <span className="font-mono font-bold text-xs text-slate-800">{wh.name}</span>
                                                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">WMS Node</span>
                                                </div>
                                            ))}
                                            {warehouseList.length === 0 && (
                                                <p className="text-xs text-slate-400 font-mono text-center py-4">Belum ada gudang terdaftar.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* MASTER TOKO CONSIGNMENT */}
                                    <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-4">
                                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                            <h3 className="text-sm font-mono font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                                                <Store className="w-4 h-4 text-purple-600" />
                                                <span>Master Toko Consignment</span>
                                            </h3>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-300 font-bold">
                                                {consignmentStoreList.length} Outlet
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Nama Toko Baru..." 
                                                value={newStoreName} 
                                                onChange={(e) => setNewStoreName(e.target.value)} 
                                                className="cipher-input flex-1 px-3.5 py-2 text-xs font-mono font-bold rounded-xl outline-none focus:border-purple-400" 
                                            />
                                            <button 
                                                onClick={handleAddStoreCloud} 
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                                            >
                                                + Tambah
                                            </button>
                                        </div>
                                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                            {consignmentStoreList.map((st) => (
                                                <div key={st.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl flex justify-between items-center transition-colors">
                                                    <span className="font-mono font-bold text-xs text-slate-800">{st.name}</span>
                                                    <span className="text-[9px] font-mono uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">Consignment</span>
                                                </div>
                                            ))}
                                            {consignmentStoreList.length === 0 && (
                                                <p className="text-xs text-slate-400 font-mono text-center py-4">Belum ada toko terdaftar.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LIVE FIRESTORE PROJECTS TABLE */}
                            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-5">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <h3 className="text-sm font-mono font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                                        <Database className="w-4 h-4 text-cyan-600" />
                                        <span>Live Firestore Projects</span>
                                    </h3>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">
                                        {projectHistory.length} sesi terarsip
                                    </span>
                                </div>
                                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                    <table className="w-full text-left text-xs font-mono">
                                        <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="p-4 uppercase tracking-wider">KODE PROJECT</th>
                                                <th className="p-4 uppercase tracking-wider">LOKASI</th>
                                                <th className="p-4 uppercase tracking-wider">TANGGAL</th>
                                                <th className="p-4 text-center uppercase tracking-wider">STATUS</th>
                                                <th className="p-4 text-right uppercase tracking-wider">AKSI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {projectHistory.map((proj) => (
                                                <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 font-black text-cyan-700">{proj.sessionCode}</td>
                                                    <td className="p-4 font-bold text-slate-800">{proj.locationName}</td>
                                                    <td className="p-4 text-slate-500">{proj.opnameDate}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-black uppercase tracking-wider">
                                                            {proj.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button 
                                                            onClick={() => handleOpenHistoricalProject(proj)} 
                                                            className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                                                        >
                                                            <PlayCircle className="w-3.5 h-3.5" />
                                                            <span>Buka Dashboard</span>
                                                        </button>
                                                        {effectiveRole === 'owner' && (
                                                            <button 
                                                                onClick={() => setProjectToDelete(proj)} 
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                                                title="Hapus Project"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {projectHistory.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                                                        Belum ada project aktif di Firestore. Klik + New Project untuk membuat baru.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {landingTab === 'accounts' && effectiveRole === 'owner' && (
                        <div className="space-y-6">
                            {/* OWNER PROFILE */}
                            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-4">
                                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                    <h3 className="text-sm font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                                        <KeyRound className="w-4 h-4 text-cyan-600" />
                                        <span>Pengaturan Akun & Profil Owner</span>
                                    </h3>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold">
                                        Master Authorization
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input 
                                        type="text" 
                                        value={ownerNewName} 
                                        onChange={(e) => setOwnerNewName(e.target.value)} 
                                        placeholder="Nama Lengkap Owner" 
                                        className="cipher-input px-4 py-2.5 text-xs font-mono rounded-xl outline-none" 
                                    />
                                    <input 
                                        type="email" 
                                        value={ownerNewEmail} 
                                        onChange={(e) => setOwnerNewEmail(e.target.value)} 
                                        placeholder="Email Owner" 
                                        className="cipher-input px-4 py-2.5 text-xs font-mono rounded-xl outline-none" 
                                    />
                                    <input 
                                        type="password" 
                                        maxLength={6} 
                                        value={ownerNewPin} 
                                        onChange={(e) => setOwnerNewPin(e.target.value)} 
                                        placeholder="PIN Baru (4-Digit)" 
                                        className="cipher-input px-4 py-2.5 text-xs font-mono rounded-xl outline-none" 
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={handleUpdateOwnerAccount} 
                                        className="px-5 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>Simpan Profil Owner</span>
                                    </button>
                                </div>
                            </div>

                            {/* MASTER KTP & AUTHORIZATION */}
                            <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm space-y-6">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-slate-100 pb-4">
                                    <div>
                                        <h3 className="text-sm font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                            <Contact className="w-4 h-4 text-cyan-600" />
                                            <span>Master KTP & Otorisasi Personel</span>
                                        </h3>
                                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">Kelola akun counter dan supervisor cloud</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button 
                                            onClick={handleDownloadKTPTemplate} 
                                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-mono flex items-center space-x-1 transition-all cursor-pointer"
                                        >
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                            <span>Template KTP</span>
                                        </button>
                                        <label className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer">
                                            <Upload className="w-4 h-4" />
                                            <span>Upload KTP Massal</span>
                                            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUploadBulkKTPAccounts(e.target.files[0]); }} />
                                        </label>
                                        <button 
                                            onClick={handleGenerateCredentialsText} 
                                            className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                                        >
                                            <Copy className="w-4 h-4" />
                                            <span>Salin Kredensial</span>
                                        </button>
                                        <button 
                                            onClick={handleBlastEmailCredentials} 
                                            className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                                        >
                                            <Mail className="w-4 h-4" />
                                            <span>Blast Email</span>
                                        </button>
                                    </div>
                                </div>

                                {/* MANUAL KTP REGISTRATION */}
                                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3">
                                    <h4 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">Daftar KTP Manual</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input type="text" placeholder="Username..." value={newAccUser} onChange={(e) => setNewAccUser(e.target.value)} className="cipher-input px-3.5 py-2 text-xs font-mono rounded-xl outline-none" />
                                        <input type="text" placeholder="Nama Lengkap..." value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="cipher-input px-3.5 py-2 text-xs font-mono rounded-xl outline-none" />
                                        <input type="password" maxLength={4} placeholder="PIN 4-Digit..." value={newAccPin} onChange={(e) => setNewAccPin(e.target.value)} className="cipher-input px-3.5 py-2 text-xs font-mono rounded-xl outline-none" />
                                        <input type="email" placeholder="Email..." value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="cipher-input px-3.5 py-2 text-xs font-mono rounded-xl outline-none" />
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={handleAddGlobalAccount} className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-mono font-bold uppercase tracking-wider shadow-sm flex items-center space-x-2 cursor-pointer transition-all">
                                            <UserPlus className="w-4 h-4" /><span>Buat Akun KTP</span>
                                        </button>
                                    </div>
                                </div>

                                {/* SEARCH BAR */}
                                <div className="relative w-full">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input 
                                        type="text" 
                                        value={ktpSearch} 
                                        onChange={(e) => setKtpSearch(e.target.value)} 
                                        placeholder="Cari counter berdasarkan username, nama, atau email..." 
                                        className="cipher-input w-full pl-10 pr-4 py-2.5 text-xs font-mono rounded-xl outline-none" 
                                    />
                                </div>

                                {/* TABLE */}
                                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                    <table className="w-full text-left text-xs font-mono">
                                        <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                                            <tr>
                                                <th className="p-4 uppercase tracking-wider">USERNAME</th>
                                                <th className="p-4 uppercase tracking-wider">NAMA PEGAWAI</th>
                                                <th className="p-4 uppercase tracking-wider">EMAIL</th>
                                                <th className="p-4 text-center uppercase tracking-wider">PIN</th>
                                                <th className="p-4 text-right uppercase tracking-wider">AKSI</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredGlobalAccounts.map((acc) => (
                                                <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="p-4 font-bold text-cyan-700">{acc.username}</td>
                                                    <td className="p-4 font-medium text-slate-800">{acc.name}</td>
                                                    <td className="p-4 text-slate-500 text-xs">{acc.email || '-'}</td>
                                                    <td className="p-4 text-center font-bold text-slate-700 flex justify-center items-center space-x-2">
                                                        <span>{visiblePins[acc.id] ? acc.pin : '••••'}</span>
                                                        <button onClick={() => togglePinVisibility(acc.id)} className="text-slate-400 hover:text-cyan-600 cursor-pointer">
                                                            {visiblePins[acc.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button onClick={() => setEditingAccount(acc)} className="p-1.5 text-cyan-600 hover:bg-cyan-50 rounded-lg cursor-pointer" title="Edit Akun KTP"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleSendIndividualEmail(acc)} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer" title="Kirim Email Individual"><Mail className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteGlobalAccount(acc.username)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SCREEN 2: WIZARD SETUP */}
            {viewState === 'WIZARD_SETUP' && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500 relative z-10">
                    <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-sm flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-cyan-50 text-cyan-600 border border-cyan-200 rounded-2xl">
                                <SlidersHorizontal className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-mono font-bold text-slate-900 uppercase tracking-wider">Project Setup</h1>
                                <p className="text-xs font-mono text-slate-500">Konfigurasi sesi opname baru</p>
                            </div>
                        </div>
                        <button onClick={() => setViewState('LANDING')} className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="rounded-3xl bg-white border border-slate-200/90 p-8 shadow-sm space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">1. Tipe Lokasi Opname:</label>
                            <SearchableSelect options={combinedLocationOptions} value={wizLocationId} onChange={setWizLocationId} placeholder="-- Cari Lokasi --" className="w-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">2. Kode Sesi:</label>
                                <input type="text" value={wizSessionCode} onChange={(e) => setWizSessionCode(e.target.value)} className="cipher-input w-full p-3.5 rounded-2xl text-sm font-bold font-mono text-cyan-700 outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">3. Tanggal:</label>
                                <input type="date" value={wizOpnameDate} onChange={(e) => setWizOpnameDate(e.target.value)} className="cipher-input w-full p-3.5 rounded-2xl text-sm font-mono outline-none" />
                            </div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">4. Metode Lock:</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div onClick={() => setWizMethod('LIST_TO_FLOOR')} className={`p-4 rounded-2xl border cursor-pointer transition-all ${wizMethod === 'LIST_TO_FLOOR' ? 'border-cyan-500 bg-cyan-50/80 text-cyan-950 font-bold shadow-xs' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                                    <div className="text-xs font-mono font-bold uppercase text-center tracking-wider">LIST TO FLOOR</div>
                                </div>
                                <div onClick={() => setWizMethod('FLOOR_TO_LIST')} className={`p-4 rounded-2xl border cursor-pointer transition-all ${wizMethod === 'FLOOR_TO_LIST' ? 'border-cyan-500 bg-cyan-50/80 text-cyan-950 font-bold shadow-xs' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                                    <div className="text-xs font-mono font-bold uppercase text-center tracking-wider">FLOOR TO LIST</div>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-slate-50 border border-dashed border-cyan-400/50 rounded-2xl text-center space-y-3">
                            <div className="flex justify-center"><FileSpreadsheet className="w-8 h-8 text-cyan-600" /></div>
                            <div>
                                <div className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">Pre-load Master Task Excel (.xlsx)</div>
                                <p className="text-[11px] font-mono text-slate-500 mt-1">Upload sekarang untuk mempercepat sesi opname.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2 text-slate-600">
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplateXLSX}
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                    <span>Download Template (.xlsx)</span>
                                </button>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setInitialFileToUpload(e.target.files?.[0] || null)}
                                    className="text-xs font-mono file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:font-bold file:bg-cyan-400 file:text-slate-950 hover:file:bg-cyan-300 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={handleStartNewProjectSession} 
                                className="w-full md:w-auto px-8 py-3.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-2xl text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer"
                            >
                                <PlayCircle className="w-5 h-5" />
                                <span>Launch Dashboard</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCREEN 3: DASHBOARD MAIN - FULL SCREEN EDGE-TO-EDGE */}
            {viewState === 'DASHBOARD' && activeProject && (
                <div className="w-full min-h-screen bg-slate-100 flex flex-col animate-in fade-in duration-300">
                    {/* EXECUTIVE TOP BAR (FULL WIDTH) */}
                    <div className="bg-white px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200/90 flex flex-col xl:flex-row justify-between xl:items-center gap-4 shrink-0 shadow-xs sticky top-0 z-30">
                        {/* LEFT: Back, Logo, Project Code & Warehouse */}
                        <div className="flex items-center space-x-3.5 shrink-0">
                            <button
                                onClick={() => setViewState('LANDING')}
                                title="Kembali ke Daftar Project"
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors text-slate-700 shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                <img src="/logo.png" alt="Noctus Count Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
                            </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-black tracking-tight text-slate-900 font-mono">
                                            {activeProject.sessionCode}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">•</span>
                                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-slate-400" />
                                            <span>{activeProject.locationName}</span>
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-semibold tracking-wider">
                                        NOCTUS COUNT™ <span className="text-slate-300">|</span> Stock Opname Systems
                                    </p>
                                </div>
                            </div>

                        {/* RIGHT: Round Filter, Role Badge, Session Lock, Mode Counter & Logout Button */}
                        <div className="flex items-center space-x-2.5 justify-end shrink-0">
                            <select
                                value={viewRoundFilter}
                                onChange={(e) => setViewRoundFilter(e.target.value === 'overall' ? 'overall' : parseInt(e.target.value, 10) as 1 | 2 | 3 | 4)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                            >
                                <option value="overall">All Rounds</option>
                                <option value={1}>Round 1</option>
                                <option value={2}>Round 2</option>
                                <option value={3}>Round 3</option>
                            </select>

                            {effectiveRole === 'owner' ? (
                                <div className="flex items-center space-x-2">
                                    <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl flex items-center space-x-1 border border-slate-800 shadow-xs">
                                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>SUPER ADMIN</span>
                                    </span>
                                    <button
                                        onClick={handleToggleGlobalLock}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs border transition-colors cursor-pointer ${isProjectLocked ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                                    >
                                        {isProjectLocked ? <><Unlock className="w-3.5 h-3.5" />Buka Sesi</> : <><Lock className="w-3.5 h-3.5" />Kunci Sesi</>}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border border-emerald-300 shadow-xs">
                                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>SUPERVISOR (MONITORING)</span>
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${isProjectLocked ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        {isProjectLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        <span>{isProjectLocked ? 'Terkunci' : 'Aktif'}</span>
                                    </span>
                                </div>
                            )}

                            {onSwitchToCounterView && (
                                <button
                                    onClick={onSwitchToCounterView}
                                    title="Beralih ke Layar HP Counter"
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors flex items-center space-x-1.5 text-xs font-bold"
                                >
                                    <Smartphone className="w-4 h-4 text-emerald-600" />
                                    <span className="hidden sm:inline">Mode Counter</span>
                                </button>
                            )}

                            <button
                                onClick={() => setViewState('LANDING')}
                                title="Keluar ke Daftar Project"
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-xl cursor-pointer transition-colors flex items-center space-x-1.5 text-xs font-bold"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Keluar</span>
                            </button>
                        </div>
                    </div>

                    {/* MAIN BODY: LABELED SIDEBAR + FULL WIDTH EXPANSIVE CONTENT */}
                    <div className="flex flex-1 flex-col md:flex-row min-h-[calc(100vh-65px)]">
                        {/* LABELED SIDEBAR (EXECUTIVE DARK) */}
                        <div className="w-full md:w-56 bg-[#0F172A] flex md:flex-col justify-between p-2 md:p-3.5 border-r border-slate-800 shrink-0">
                            {/* NAV ICONS & LABELS */}
                            <div className="flex md:flex-col space-x-1.5 md:space-x-0 md:space-y-1.5 overflow-x-auto md:overflow-x-visible w-full">
                                {orderedTabs.map(t => {
                                    const isActive = activeTab === t.id;
                                    const IconComponent = t.icon;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => setActiveTab(t.id)}
                                            title={t.label}
                                            className={`w-full px-3 py-2.5 rounded-xl flex items-center space-x-3 cursor-pointer transition-all ${
                                                isActive
                                                    ? 'bg-cyan-400 text-slate-950 font-black shadow-[0_0_15px_rgba(34,211,238,0.35)] ring-1 ring-cyan-300'
                                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70 font-medium'
                                            }`}
                                        >
                                            <IconComponent className="w-4.5 h-4.5 shrink-0" />
                                            <span className="text-xs tracking-tight truncate">{t.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CONTENT AREA (EXPANSIVE FULL WIDTH LAPTOP VIEW) */}
                        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden min-w-0 bg-slate-50">
                                {/* TAB 1: PROGRESS & ANALYTICS (EXECUTIVE 12-COL GRID) */}
                                {activeTab === 'progress' && (
                                    <div className="space-y-6">
                                        {/* PATENT KPI CAPSULE STRIP */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-md">
                                            <div>
                                                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                                                    <span>PROGRESS & ANALYTICS</span>
                                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-md">Live Telemetry</span>
                                                </h2>
                                                <p className="text-xs text-slate-400 font-medium">Monitoring performa fisik vs sistem secara paten dan real-time</p>
                                            </div>

                                            {/* 4-PILL KPI CAPSULE (PATENT IN PROGRESS TAB) */}
                                            <div className="inline-flex items-center bg-[#0F172A] text-white p-1 rounded-2xl border border-cyan-500/40 shadow-[0_0_14px_rgba(34,211,238,0.2)] text-xs self-start md:self-auto">
                                                <div className="px-4 py-1.5 text-center border-r border-slate-800">
                                                    <span className="text-[9px] text-cyan-400 font-extrabold uppercase tracking-widest block">TOTAL ITEMS</span>
                                                    <span className="text-xs sm:text-sm font-black text-white">{totalSKUs.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="px-4 py-1.5 text-center border-r border-slate-800">
                                                    <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest block">COUNTED</span>
                                                    <span className="text-xs sm:text-sm font-black text-amber-400">{totalCounted.toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="px-4 py-1.5 text-center border-r border-slate-800">
                                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">REMAINING</span>
                                                    <span className="text-xs sm:text-sm font-black text-slate-300">{Math.max(0, totalSKUs - totalCounted).toLocaleString('id-ID')}</span>
                                                </div>
                                                <div className="px-4 py-1.5 text-center">
                                                    <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest block">ACCURACY</span>
                                                    <span className="text-xs sm:text-sm font-black text-emerald-400">{overallPercentage}%</span>
                                                </div>
                                            </div>
                                        </div>
                                        {/* 12-COL GRID */}
                                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                            {/* LEFT COLUMN: PENDING STOCK COUNTS & LEVEL PROGRESS (7 OF 12) */}
                                            <div className="xl:col-span-7 space-y-6">
                                                {/* PENDING STOCK COUNTS TABLE */}
                                                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="p-2 bg-cyan-50 text-cyan-700 rounded-xl">
                                                                <Users className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-black text-slate-900 tracking-tight">PENDING STOCK COUNTS</h3>
                                                                <p className="text-[11px] text-slate-400 font-medium">Monitoring Real-Time PIC Counter Lapangan</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                                            <button
                                                                type="button"
                                                                onClick={() => handlePrintCountsheet(undefined, 1)}
                                                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                                                                title="Cetak Countsheet Fisik Ronde 1 untuk semua counter (Page-break otomatis per counter)"
                                                            >
                                                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                                                                <span>Cetak R1 (Semua)</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleExportCountsheetXLSX(undefined, 1)}
                                                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                                                                title="Download file Excel Countsheet Blind Ronde 1"
                                                            >
                                                                <FileDown className="w-3.5 h-3.5 text-slate-600" />
                                                                <span>Excel R1</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenReassignModal()}
                                                                className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                                                                title="Bagi sisa tugas / Oper rak pending ke counter lain"
                                                            >
                                                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                                                <span>Oper Sisa Rak</span>
                                                            </button>
                                                            <div className="relative w-full sm:w-48">
                                                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Cari PIC Counter..."
                                                                    value={counterSearch}
                                                                    onChange={(e) => setCounterSearch(e.target.value)}
                                                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ACTIVE SWAP REVERT BANNER */}
                                                    {lastSwapEvent && (
                                                        <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                                                            <div className="flex items-center space-x-2 text-xs">
                                                                <span className="material-symbols-outlined text-amber-600 text-lg">swap_horiz</span>
                                                                <div>
                                                                    <span className="font-black text-amber-950 block text-xs">
                                                                        Swap Ronde {lastSwapEvent.round} Aktif:
                                                                    </span>
                                                                    <span className="text-[11px] text-amber-800">
                                                                        <b className="capitalize">{lastSwapEvent.sourceCounter}</b> ⇄ <b className="capitalize">{lastSwapEvent.targetCounter}</b>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={handleRevertLastSwap}
                                                                disabled={isDeploySubmitting}
                                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                                title="Kembalikan penugasan ke counter asal sebelum hitungan fisik dimulai"
                                                            >
                                                                <RefreshCw className={`w-3.5 h-3.5 ${isDeploySubmitting ? 'animate-spin' : ''}`} />
                                                                <span>Batalkan Swap</span>
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* COUNTER PIC LIST */}
                                                    <div className="space-y-3 max-h-110 overflow-y-auto pr-1 scrollbar-thin">
                                                        {filteredCounterNames.map((cName, idx) => {
                                                            const cData = counterGroups[cName];
                                                            const pct = cData.total > 0 ? Math.round((cData.counted / cData.total) * 100) : 0;
                                                            const cleanCounterKey = cName.toLowerCase().trim();
                                                            const isLocked = !!lockedCounters[cleanCounterKey];
                                                            const cTasks = masterDataList.filter(m => m.counter === cleanCounterKey);
                                                            const cMaxRound = cTasks.length > 0 ? Math.max(...cTasks.map(t => t.currentRound || 1)) : 1;

                                                            return (
                                                                <div key={idx} className="p-3.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-2xl transition-all space-y-2.5">
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center space-x-3">
                                                                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center uppercase shrink-0">
                                                                                {cName.slice(0, 2)}
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex items-center space-x-2">
                                                                                    <span className="text-xs font-black text-slate-900 capitalize">{cName}</span>
                                                                                    <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                                                        Ronde {cMaxRound}
                                                                                    </span>
                                                                                </div>
                                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                                    {cData.counted} / {cData.total} SKU ({pct}%)
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="flex items-center space-x-1.5">
                                                                            {cData.errorCount > 0 && (
                                                                                <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                                                                                    ⚠️ {cData.errorCount} Selisih
                                                                                </span>
                                                                            )}
                                                                            {/* DROPDOWN KONTROL AKSI COUNTER (FIXED POPUP) */}
                                                                            <div className="relative">
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (menuAnchor?.counter === cName) {
                                                                                            setMenuAnchor(null);
                                                                                        } else {
                                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                                            const dropdownHeight = 260;
                                                                                            const spaceBelow = window.innerHeight - rect.bottom;
                                                                                            const isDropup = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
                                                                                            setMenuAnchor({
                                                                                                counter: cName,
                                                                                                top: isDropup ? rect.top - 6 : rect.bottom + 6,
                                                                                                right: Math.max(16, window.innerWidth - rect.right),
                                                                                                isDropup
                                                                                            });
                                                                                        }
                                                                                    }}
                                                                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black inline-flex items-center space-x-1 transition-all cursor-pointer ${
                                                                                        menuAnchor?.counter === cName
                                                                                            ? 'bg-cyan-500 text-slate-950 shadow-xs'
                                                                                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs'
                                                                                    }`}
                                                                                >
                                                                                    <Settings className="w-3 h-3 text-cyan-600" />
                                                                                    <span>Kelola</span>
                                                                                    <ChevronDown className={`w-3 h-3 transition-transform ${menuAnchor?.counter === cName ? 'rotate-180' : ''}`} />
                                                                                </button>

                                                                                {menuAnchor?.counter === cName && createPortal(
                                                                                    <>
                                                                                        <div
                                                                                            className="fixed inset-0 z-50 bg-transparent"
                                                                                            onClick={(e) => { e.stopPropagation(); setMenuAnchor(null); }}
                                                                                        />
                                                                                        <div
                                                                                            className={`fixed w-64 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 ${
                                                                                                menuAnchor.isDropup ? '-translate-y-full' : ''
                                                                                            }`}
                                                                                            style={{
                                                                                                top: `${menuAnchor.top}px`,
                                                                                                right: `${menuAnchor.right}px`
                                                                                            }}
                                                                                        >
                                                                                            <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                                                                                                <span>Aksi PIC: <b className="text-slate-900">{cName}</b></span>
                                                                                                <span className="font-mono text-cyan-600">Ronde {cMaxRound}</span>
                                                                                            </div>

                                                                                            {effectiveRole === 'owner' && (
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setMenuAnchor(null);
                                                                                                        handleOpenDeployModal(cName);
                                                                                                    }}
                                                                                                    disabled={cMaxRound >= 3}
                                                                                                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                                                                                                        cMaxRound >= 3
                                                                                                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                                                                                                            : 'hover:bg-red-50 text-slate-700 hover:text-red-700'
                                                                                                    }`}
                                                                                                >
                                                                                                    <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                                                                                        <Repeat className="w-3.5 h-3.5" />
                                                                                                    </div>
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <div className="text-xs font-bold leading-tight">Deploy / Swap Ronde</div>
                                                                                                        <div className="text-[10px] text-slate-400 font-normal">
                                                                                                            {cMaxRound >= 3 ? 'Sudah max ronde 3' : `Lanjut ke Ronde ${cMaxRound + 1}`}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                </button>
                                                                                            )}

                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setMenuAnchor(null);
                                                                                                    handleOpenReassignModal(cName);
                                                                                                }}
                                                                                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2.5 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 transition-all cursor-pointer"
                                                                                            >
                                                                                                <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                                                                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="text-xs font-bold leading-tight">Oper Sisa Rak Pending</div>
                                                                                                    <div className="text-[10px] text-slate-400 font-normal">Pindahkan rak belum beres</div>
                                                                                                </div>
                                                                                            </button>

                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setMenuAnchor(null);
                                                                                                    handlePrintCountsheet(cName, cMaxRound);
                                                                                                }}
                                                                                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2.5 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                                                                                            >
                                                                                                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                                                                                                    <Printer className="w-3.5 h-3.5" />
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="text-xs font-bold leading-tight">Cetak Countsheet R{cMaxRound}</div>
                                                                                                    <div className="text-[10px] text-slate-400 font-normal">Blind Count ({cName})</div>
                                                                                                </div>
                                                                                            </button>

                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setMenuAnchor(null);
                                                                                                    handleExportCountsheetXLSX(cName, cMaxRound);
                                                                                                }}
                                                                                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2.5 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                                                                                            >
                                                                                                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                                                                                                    <FileDown className="w-3.5 h-3.5" />
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="text-xs font-bold leading-tight">Excel Countsheet R{cMaxRound}</div>
                                                                                                    <div className="text-[10px] text-slate-400 font-normal">Format Blind .xlsx</div>
                                                                                                </div>
                                                                                            </button>

                                                                                            {effectiveRole === 'owner' && (
                                                                                                <button
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        setMenuAnchor(null);
                                                                                                        setTransferSourceCounter(cName);
                                                                                                    }}
                                                                                                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2.5 hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 transition-all cursor-pointer"
                                                                                                >
                                                                                                    <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                                                                                                        <UserPlus className="w-3.5 h-3.5" />
                                                                                                    </div>
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <div className="text-xs font-bold leading-tight">Transfer Seluruh Tugas</div>
                                                                                                        <div className="text-[10px] text-slate-400 font-normal">Alihkan semua rak ke PIC lain</div>
                                                                                                    </div>
                                                                                                </button>
                                                                                            )}

                                                                                            {effectiveRole === 'owner' && (
                                                                                                <div className="pt-1 border-t border-slate-100 mt-1">
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setMenuAnchor(null);
                                                                                                            handleToggleCounterLock(cName, isLocked);
                                                                                                        }}
                                                                                                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                                                                                                            isLocked
                                                                                                                ? 'hover:bg-emerald-50 text-emerald-700'
                                                                                                                : 'hover:bg-red-50 text-red-600'
                                                                                                        }`}
                                                                                                    >
                                                                                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isLocked ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                                                                                            {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                                                                                        </div>
                                                                                                        <div className="flex-1 min-w-0">
                                                                                                            <div className="text-xs font-bold leading-tight">
                                                                                                                {isLocked ? "Buka Kunci Akses HP" : "Kunci Akses HP (Lock)"}
                                                                                                            </div>
                                                                                                            <div className="text-[10px] text-slate-400 font-normal">
                                                                                                                {isLocked ? "Counter bisa input kembali" : "Bekukan aktivitas hitung"}
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </>,
                                                                                    document.body
                                                                                )}
                                                                            </div>
                                                                            <button
                                                                                onClick={() => setSelectedCounterForDetail(cName)}
                                                                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center space-x-1 cursor-pointer transition-all"
                                                                            >
                                                                                <Eye className="w-3 h-3" />
                                                                                <span>Detail</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {/* PROGRESS BAR */}
                                                                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                                                        <div
                                                                            className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(34,211,238,0.4)]"
                                                                            style={{ width: `${pct}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                        {filteredCounterNames.length === 0 && (
                                                            <div className="p-8 text-center text-xs text-slate-400 font-medium">
                                                                Tidak ada counter PIC yang sesuai pencarian.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* RACK LEVEL PROGRESSION */}
                                                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                                        <div>
                                                            <h3 className="text-sm font-black text-slate-900 tracking-tight">RACK LEVEL PROGRESSION</h3>
                                                            <p className="text-[11px] text-slate-400 font-medium">Tingkat capaian fisik berdasarkan level vertikal rak</p>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowLevelProgress(!showLevelProgress)}
                                                            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                                                        >
                                                            <ChevronUp className={`w-4 h-4 transition-transform ${showLevelProgress ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    </div>
                                                    {!showLevelProgress && (
                                                        <div className="space-y-3">
                                                            {levelProgress.map((lvl, idx) => (
                                                                <div key={idx} className="space-y-1.5">
                                                                    <div className="flex justify-between text-xs font-bold">
                                                                        <span className="text-slate-700">Level {lvl.name}</span>
                                                                        <span className="text-cyan-700 font-mono font-bold">{lvl.counted}/{lvl.total} ({lvl.percentage}%)</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                        <div className="bg-cyan-400 h-2 rounded-full transition-all duration-300 shadow-[0_0_6px_rgba(34,211,238,0.4)]" style={{ width: `${lvl.percentage}%` }} />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {levelProgress.length === 0 && (
                                                                <p className="text-xs text-slate-400 text-center py-3">Belum ada data level rak.</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN: CHART, LIVE ALERTS, BRAND ACCURACY (5 OF 12) */}
                                            <div className="xl:col-span-5 space-y-6">
                                                {/* COUNT PROGRESS DUAL-BAR CHART (PURE CSS 60FPS) */}
                                                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                                                    <div className="border-b border-slate-100 pb-3">
                                                        <h3 className="text-sm font-black text-slate-900 tracking-tight">COUNT PROGRESS CHART</h3>
                                                        <p className="text-[11px] text-slate-400 font-medium">Perbandingan Volume Unit Sistem (WMS) vs Fisik Terhitung</p>
                                                    </div>

                                                    {/* DUAL-BAR DISPLAY */}
                                                    <div className="space-y-3.5 pt-1">
                                                        {/* SYSTEM QTY BAR */}
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-xs font-bold">
                                                                <span className="text-slate-600 flex items-center gap-1.5">
                                                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                                                                    <span>Target System (WMS)</span>
                                                                </span>
                                                                <span className="font-mono text-slate-800">{totalSystemUnits.toLocaleString('id-ID')} Pcs</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                                                <div className="bg-slate-400 h-3 rounded-full w-full" />
                                                            </div>
                                                        </div>

                                                        {/* COUNTED QTY BAR */}
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-xs font-bold">
                                                                <span className="text-slate-600 flex items-center gap-1.5">
                                                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                                                    <span>Actual Counted</span>
                                                                </span>
                                                                <span className="font-mono text-amber-700 font-black">{totalCountedUnits.toLocaleString('id-ID')} Pcs</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                                                <div
                                                                    className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                                                                    style={{ width: `${totalSystemUnits > 0 ? Math.min(100, Math.round((totalCountedUnits / totalSystemUnits) * 100)) : 0}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* SUMMARY PILL ROW */}
                                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SKU Completion</span>
                                                            <span className="text-lg font-black text-slate-900">{overallPercentage}%</span>
                                                        </div>
                                                        <div className="p-3 bg-red-50/70 border border-red-100 rounded-2xl text-center">
                                                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Dispute Selisih</span>
                                                            <span className="text-lg font-black text-red-600">{liveIssues.length}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* RECENT COUNT ALERTS (LIVE STREAM FROM AUDIT LOGS) */}
                                                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                                        <div>
                                                            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                                                                <Bell className="w-4 h-4 text-amber-500" />
                                                                <span>RECENT COUNT ALERTS</span>
                                                            </h3>
                                                            <p className="text-[11px] text-slate-400 font-medium">Aktivitas submit counter terkini di lapangan</p>
                                                        </div>
                                                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
                                                            LIVE
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                                                        {auditLogs.slice(0, 4).map((log, idx) => {
                                                            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';
                                                            const isDiff = log.remarks && log.remarks.toLowerCase().includes('selisih');

                                                            return (
                                                                <div key={idx} className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition-colors ${isDiff ? 'bg-red-50/60 border-red-200 text-red-900' : 'bg-slate-50 border-slate-200/70 text-slate-800'}`}>
                                                                    <div className="flex items-center space-x-2.5 truncate">
                                                                        <div className={`w-2 h-2 rounded-full shrink-0 ${isDiff ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                                        <div className="truncate">
                                                                            <div className="flex items-center space-x-1.5">
                                                                                <span className="font-black capitalize">{log.counterPic || 'Counter'}</span>
                                                                                <span className="text-[10px] text-slate-400 font-mono">[{log.rackLocation || 'Rak'}]</span>
                                                                            </div>
                                                                            <p className="text-[10px] text-slate-500 truncate font-mono">{log.sku} • {log.totalFinalSubmitted ?? 0} Pcs</p>
                                                                        </div>
                                                                    </div>
                                                                    <span className="text-[9px] font-mono font-bold text-slate-400 shrink-0 ml-2">{timeStr}</span>
                                                                </div>
                                                            );
                                                        })}

                                                        {auditLogs.length === 0 && (
                                                            <p className="text-xs text-slate-400 text-center py-4">Belum ada aktivitas countsheet masuk.</p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* BRAND ACCURACY */}
                                                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                                                        <div>
                                                            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center">
                                                                <TrendingDown className="w-4 h-4 mr-1.5 text-indigo-500" />
                                                                <span>Akurasi Hitung per Brand</span>
                                                            </h3>
                                                            <p className="text-[11px] text-slate-400 font-medium">Audit persentase kesesuaian brand</p>
                                                        </div>
                                                        <div className="flex items-center space-x-1.5">
                                                            <div className="relative">
                                                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Brand..."
                                                                    value={brandSearch}
                                                                    onChange={(e) => setBrandSearch(e.target.value)}
                                                                    className="w-28 pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                                                />
                                                            </div>
                                                            <select
                                                                value={brandStatusFilter}
                                                                onChange={(e) => setBrandStatusFilter(e.target.value as any)}
                                                                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                                                            >
                                                                <option value="all">All</option>
                                                                <option value="selisih">Selisih</option>
                                                                <option value="match">Match</option>
                                                                <option value="uncounted">Uncounted</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                                                        {brandAccuracyList.map((bAcc, idx) => (
                                                            <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                                                                <div className="flex justify-between items-center">
                                                                    <div>
                                                                        <span className="text-xs font-black text-slate-900">{bAcc.brand}</span>
                                                                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                                                            {bAcc.totalSKUs} SKU ({bAcc.countedCount} Dihitung) • <span className="text-red-500 font-bold">{bAcc.diffSKUs} Selisih</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        {bAcc.isFullyUncounted ? (
                                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-slate-200 text-slate-600">
                                                                                Uncounted
                                                                            </span>
                                                                        ) : (
                                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${bAcc.accuracyPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                                                {bAcc.accuracyPct}% Akurat
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            onClick={() => setExpandedBrandDetail(prev => ({ ...prev, [bAcc.brand]: !prev[bAcc.brand] }))}
                                                                            className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 cursor-pointer"
                                                                        >
                                                                            {expandedBrandDetail[bAcc.brand] ? 'Tutup' : 'SKU'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                {expandedBrandDetail[bAcc.brand] && (
                                                                    <div className="mt-2 bg-white border border-slate-200 rounded-xl overflow-x-auto text-[10px]">
                                                                        <table className="w-full text-left">
                                                                            <thead className="bg-slate-50"><tr><th className="p-2">SKU</th><th className="p-2 text-center">WMS</th><th className="p-2 text-center">ACT</th></tr></thead>
                                                                            <tbody>
                                                                                {bAcc.skuList.map((s, i) => (
                                                                                    <tr key={i} className="border-t">
                                                                                        <td className="p-2 font-mono font-bold text-indigo-600">{s.SKU}</td>
                                                                                        <td className="p-2 text-center">{s.Qty}</td>
                                                                                        <td className="p-2 text-center font-bold">{s.countedQty ?? '-'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {brandAccuracyList.length === 0 && (
                                                            <p className="text-xs text-slate-400 text-center py-3">Tidak ada brand ditemukan.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                    {/* TAB 2: MASTER TASK (WITH PAGINATION) */}
                    {activeTab === 'master' && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-5">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 gap-4">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Database Master Task & Lokasi Rak</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Total {masterDataList.length.toLocaleString('id-ID')} Task Terdaftar di Database
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Cari SKU, Rak, PIC..."
                                            value={masterTaskSearch}
                                            onChange={(e) => {
                                                setMasterTaskSearch(e.target.value);
                                                setMasterCurrentPage(1);
                                            }}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none"
                                        />
                                    </div>
                                    <button onClick={handleExportCurrentMasterXLSX} className="px-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold flex items-center space-x-2 shrink-0 cursor-pointer">
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                        <span>Export (.xlsx)</span>
                                    </button>
                                    {effectiveRole === 'owner' && (
                                        <label className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center space-x-2 shrink-0">
                                            <Upload className="w-4 h-4" />
                                            <span>Upload Master</span>
                                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { const f = e.target.files[0]; e.target.value = ''; parseXLSXFile(f); } }} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto overflow-y-auto border rounded-2xl max-h-125 scrollbar-thin">
                                <table className="w-full text-left text-[11px] min-w-max"><thead className="bg-slate-50 font-black text-slate-600 border-b sticky top-0 z-10"><tr><th className="p-3 bg-slate-50">OWNER SKU</th><th className="p-3 bg-slate-50">SKU</th><th className="p-3 bg-slate-50">DESKRIPSI</th><th className="p-3 bg-slate-50">UPC 1</th><th className="p-3 bg-slate-50">UPC 2</th><th className="p-3 bg-slate-50">LOKASI RAK</th><th className="p-3 bg-slate-50">COUNTER PIC</th><th className="p-3 text-center bg-slate-50">WMS QTY</th><th className="p-3 text-center bg-slate-50">ACTUAL QTY</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {paginatedMasterTask.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold text-slate-800">{row.Owner || 'DDI'}</td>
                                                <td className="p-3 font-mono font-black text-indigo-600">{row.SKU}</td>
                                                <td className="p-3 truncate max-w-xs">{row.Description}</td>
                                                <td className="p-3 font-mono">{row.UPC1 || '-'}</td>
                                                <td className="p-3 font-mono">{row.UPC2 || '-'}</td>
                                                <td className="p-3 font-mono font-bold">{row.Location}</td>
                                                <td className="p-2">
                                                    {effectiveRole === 'owner' ? (
                                                        <SearchableSelect
                                                            options={globalAccounts.map(acc => ({ value: acc.username, label: acc.username }))}
                                                            value={row.counter === 'unassigned' ? '' : row.counter}
                                                            onChange={(val: string) => handleReassignCounter((masterCurrentPage - 1) * ITEMS_PER_PAGE + idx, val)}
                                                            placeholder="Assign..."
                                                            className="w-32"
                                                        />
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-800 font-bold uppercase">{row.counter}</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-bold text-slate-400">{row.Qty}</td>
                                                <td className="p-3 text-center font-black text-sm">{(row.isCounted && row.countedQty !== undefined && !isNaN(row.countedQty)) ? row.countedQty : '-'}</td>
                                            </tr>
                                        ))}
                                        {filteredMasterTask.length === 0 && (
                                            <tr><td colSpan={9} className="p-8 text-center text-slate-400 font-medium">Data Task tidak ditemukan.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* CONTROLLER PAGINATION MASTER TASK */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs font-bold text-slate-600">
                                <span>
                                    Menampilkan {filteredMasterTask.length > 0 ? (masterCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(masterCurrentPage * ITEMS_PER_PAGE, filteredMasterTask.length)} dari {filteredMasterTask.length.toLocaleString('id-ID')} Task
                                </span>
                                <div className="flex items-center space-x-2">
                                    <button
                                        disabled={masterCurrentPage === 1}
                                        onClick={() => setMasterCurrentPage(p => Math.max(1, p - 1))}
                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl flex items-center space-x-1 cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span>Prev</span>
                                    </button>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black">
                                        Halaman {masterCurrentPage} / {totalMasterPages}
                                    </span>
                                    <button
                                        disabled={masterCurrentPage >= totalMasterPages}
                                        onClick={() => setMasterCurrentPage(p => p + 1)}
                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl flex items-center space-x-1 cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB MASTER SKU KATALOG (WITH PAGINATION) */}
                    {activeTab === 'sku_catalog' && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-5">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 gap-4">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <Tag className="w-5 h-5 text-indigo-600" />
                                        <span>Master Katalog SKU & Referensi Produk</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium">Basis data referensi resmi untuk pencocokan barcode temuan di HP Counter.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                                    <div className="relative flex-1 sm:w-64">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Cari SKU, Barcode, Deskripsi..."
                                            value={catalogSearch}
                                            onChange={(e) => {
                                                setCatalogSearch(e.target.value);
                                                setCatalogCurrentPage(1);
                                            }}
                                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-bold outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleDownloadCatalogTemplateXLSX}
                                        className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer text-slate-700"
                                        title="Download template Excel katalog referensi"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                        <span>Template (.xlsx)</span>
                                    </button>
                                    <button
                                        onClick={handleExportCatalogXLSX}
                                        className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 cursor-pointer text-slate-700"
                                        title="Export semua katalog referensi"
                                    >
                                        <Download className="w-4 h-4 text-indigo-600" />
                                        <span>Export (.xlsx)</span>
                                    </button>
                                    {(effectiveRole === 'owner' || effectiveRole === 'spv') && (
                                        <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center space-x-2 shrink-0 shadow-md transition-all">
                                            <Upload className="w-4 h-4" />
                                            <span>Upload Referensi SKU</span>
                                            <input
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        const f = e.target.files[0];
                                                        e.target.value = '';
                                                        handleUploadSKUCatalog(f);
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto overflow-y-auto border rounded-2xl max-h-125 scrollbar-thin">
                                <table className="w-full text-left text-xs"><thead className="bg-slate-50 font-bold text-slate-600 border-b sticky top-0 z-10"><tr><th className="p-3 bg-slate-50">OWNER</th><th className="p-3 bg-slate-50">SKU BARANG</th><th className="p-3 bg-slate-50">DESKRIPSI PRODUK</th><th className="p-3 bg-slate-50">UPC 1 (ECERAN)</th><th className="p-3 bg-slate-50">UPC 2 (KARDUS)</th><th className="p-3 bg-slate-50">BRAND</th><th className="p-3 text-right bg-slate-50">HARGA SATUAN (RP)</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {paginatedSKUCatalog.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold text-slate-800">{item.Owner}</td>
                                                <td className="p-3 font-mono font-black text-indigo-600">{item.SKU}</td>
                                                <td className="p-3 font-bold text-slate-900">{item.Description}</td>
                                                <td className="p-3 font-mono">{item.UPC1}</td>
                                                <td className="p-3 font-mono">{item.UPC2}</td>
                                                <td className="p-3 font-semibold text-slate-600">{item.SKUBrand}</td>
                                                <td className="p-3 text-right font-mono font-bold text-amber-700">Rp {item.unitPrice.toLocaleString('id-ID')}</td>
                                            </tr>
                                        ))}
                                        {filteredSKUCatalog.length === 0 && (
                                            <tr><td colSpan={7} className="p-8 text-center text-slate-400">Tidak ada Katalog SKU ditemukan.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* CONTROLLER PAGINATION KATALOG SKU */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs font-bold text-slate-600">
                                <span>
                                    Menampilkan {filteredSKUCatalog.length > 0 ? (catalogCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(catalogCurrentPage * ITEMS_PER_PAGE, filteredSKUCatalog.length)} dari {filteredSKUCatalog.length.toLocaleString('id-ID')} SKU Unik
                                </span>
                                <div className="flex items-center space-x-2">
                                    <button
                                        disabled={catalogCurrentPage === 1}
                                        onClick={() => setCatalogCurrentPage(p => Math.max(1, p - 1))}
                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl flex items-center space-x-1 cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        <span>Prev</span>
                                    </button>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-black">
                                        Halaman {catalogCurrentPage} / {totalCatalogPages}
                                    </span>
                                    <button
                                        disabled={catalogCurrentPage >= totalCatalogPages}
                                        onClick={() => setCatalogCurrentPage(p => p + 1)}
                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl flex items-center space-x-1 cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: RECON & RECOVERY */}
                    {activeTab === 'recon' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xl flex items-center justify-between"><div><div className="text-xs font-black text-emerald-600 uppercase mb-1">Match Valid</div><div className="text-3xl font-black text-emerald-900">{matchRecoveryCount}</div></div><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
                                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-xl flex items-center justify-between"><div><div className="text-xs font-black text-red-600 uppercase mb-1">Variance Dispute</div><div className="text-3xl font-black text-red-900">{varianceRecoveryCount}</div></div><XCircle className="w-8 h-8 text-red-500" /></div>
                                <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-xl flex items-center justify-between"><div><div className="text-xs font-black text-amber-700 uppercase mb-1">Valuasi Selisih</div><div className="text-2xl font-black text-amber-900">Rp {totalFinancialVarianceValue.toLocaleString('id-ID')}</div></div><DollarSign className="w-6 h-6 text-amber-600" /></div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-4">
                                <input
                                    type="file"
                                    ref={vendorFileInputRef}
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleImportVendorXLSX}
                                    className="hidden"
                                />

                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 flex items-center">
                                            <Scale className="w-5 h-5 mr-2 text-indigo-600" />
                                            Rekonsiliasi 3-Way & Audit Vendor
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            Komparasi stok WMS Sistem vs Fisik Internal vs Auditor Vendor (Harga satuan terproteksi otomatis)
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleExportInternalCountsForVendorXLSX}
                                            className="px-3 py-2 bg-slate-900 hover:bg-black text-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer transition-all border border-slate-700"
                                            title="Export data hitungan fisik internal untuk dibagikan ke Vendor (Target Qty WMS & Harga 100% AMAN disembunyikan)"
                                        >
                                            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                                            <span>Share Fisik ke Vendor (.xlsx)</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => vendorFileInputRef.current?.click()}
                                            disabled={isVendorImporting}
                                            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-all disabled:opacity-50"
                                            title="Upload file Excel dari Auditor Vendor untuk mencocokkan hitungan"
                                        >
                                            <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>{isVendorImporting ? 'Mengimpor Vendor...' : 'Import Data Vendor (.xlsx)'}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleExportVendorComparisonXLSX}
                                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
                                            title="Download format komparasi 3-Way khusus Auditor Vendor (Masking harga aktif)"
                                        >
                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                            <span>Export Rekon Vendor (.xlsx)</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={handleExportReconXLSX}
                                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer transition-all"
                                        >
                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                            <span>Download Recon (.xlsx)</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border rounded-2xl">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 font-black text-slate-600 border-b">
                                            <tr>
                                                <th className="p-3.5">SKU BARANG</th>
                                                <th className="p-3.5 text-center">WMS SYS</th>
                                                <th className="p-3.5 text-center">FISIK (INT)</th>
                                                <th className="p-3.5 text-center bg-indigo-50/70 text-indigo-900">VENDOR (3RD)</th>
                                                <th className="p-3.5 text-center">SELISIH SYS</th>
                                                <th className="p-3.5 text-center bg-amber-50/70 text-amber-900">SELISIH VENDOR</th>
                                                <th className="p-3.5 text-right bg-slate-100/60">HARGA SATUAN</th>
                                                <th className="p-3.5 text-right bg-amber-50">VALUASI SELISIH</th>
                                                <th className="p-3.5 text-right bg-indigo-50">OVERRIDE RECOVERY</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {paginatedDiscrepancies.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="p-8 text-center text-slate-400 font-bold">
                                                        Tidak ada selisih stok (Seluruh item terhitung cocok / belum ada variansi).
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedDiscrepancies.map((item, i) => {
                                                    const isRoundPending = !item.isCounted && item.currentRound > 1;
                                                    const effectiveActual = item.isCounted ? (item.countedQty ?? 0) : (item.round1Actual ?? 0);
                                                    const diff = effectiveActual - item.Qty;
                                                    const val = diff * (item.unitPrice || 0);

                                                    const vendorQty = item.thirdPartyQty;
                                                    const diffVendor = vendorQty !== undefined && item.isCounted ? (effectiveActual - vendorQty) : null;
                                                    const isDiscrepant = item.isCounted && (diff !== 0 || (vendorQty !== undefined && vendorQty !== effectiveActual));

                                                    return (
                                                        <tr key={item.id || `${item.SKU}_${i}`} className="hover:bg-slate-50">
                                                            <td className="p-3.5">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-mono font-bold text-indigo-600">{item.SKU}</span>
                                                                    {isRoundPending ? (
                                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                                                            🔄 Ronde {item.currentRound} ({item.counter})
                                                                        </span>
                                                                    ) : diff !== 0 ? (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                                            Selisih WMS
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            Match WMS
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {item.Description && <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.Description}</div>}
                                                            </td>
                                                            <td className="p-3.5 text-center text-slate-500 font-mono font-bold">{item.Qty}</td>
                                                            <td className="p-3.5 text-center font-black">
                                                                {isRoundPending ? (
                                                                    <div>
                                                                        <span>{effectiveActual}</span>
                                                                        <span className="block text-[9px] font-bold text-amber-600">(R1 Act)</span>
                                                                    </div>
                                                                ) : (
                                                                    item.countedQty
                                                                )}
                                                            </td>
                                                            {/* Kolom Hitungan Vendor */}
                                                            <td className="p-3.5 text-center font-bold text-indigo-700 bg-indigo-50/20 font-mono">
                                                                {vendorQty !== undefined ? vendorQty : <span className="text-slate-300">-</span>}
                                                            </td>
                                                            <td className="p-3.5 text-center font-black font-mono">
                                                                {diff === 0 ? (
                                                                    <span className="text-emerald-600 text-xs">0</span>
                                                                ) : (
                                                                    <span className="text-red-600">{diff > 0 ? `+${diff}` : diff}</span>
                                                                )}
                                                            </td>
                                                            {/* Kolom Selisih Fisik vs Vendor */}
                                                            <td className="p-3.5 text-center font-bold bg-amber-50/20">
                                                                {diffVendor !== null ? (
                                                                    diffVendor === 0 ? (
                                                                        <span className="text-emerald-600 text-xs font-black">✓ Match</span>
                                                                    ) : (
                                                                        <span className="text-rose-600 text-xs font-black font-mono">{diffVendor > 0 ? `+${diffVendor}` : diffVendor}</span>
                                                                    )
                                                                ) : (
                                                                    <span className="text-slate-300 text-xs">-</span>
                                                                )}
                                                            </td>
                                                            {/* Selective Price Masking */}
                                                            <td className="p-3.5 text-right font-mono text-xs">
                                                                {isDiscrepant ? (
                                                                    <span className="font-bold text-amber-700">Rp {(item.unitPrice || 0).toLocaleString('id-ID')}</span>
                                                                ) : (
                                                                    <span className="text-slate-400 font-bold" title="Harga satuan dilindungi untuk SKU yang sudah cocok">*** (Protected)</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3.5 text-right font-mono text-xs font-bold bg-amber-50/20">
                                                                {isDiscrepant ? (
                                                                    <span className="text-red-600">Rp {val.toLocaleString('id-ID')}</span>
                                                                ) : (
                                                                    <span className="text-slate-400">-</span>
                                                                )}
                                                            </td>
                                                            <td className="p-3.5 text-right bg-indigo-50/10">
                                                                {effectiveRole === 'owner' ? (
                                                                    <div className="flex items-center justify-end space-x-2">
                                                                        <input type="number" placeholder="Qty Final" className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono outline-none" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRecoveryOverride(item.SKU, parseInt((e.target as HTMLInputElement).value, 10)); }} />
                                                                        <button onClick={(e) => handleSaveRecoveryOverride(item.SKU, parseInt(((e.currentTarget.previousElementSibling as HTMLInputElement).value), 10))} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md"><Save className="w-4 h-4" /></button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">Owner Only</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {filteredDiscrepancies.length > ITEMS_PER_PAGE && (
                                    <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-600">
                                        <span>
                                            Menampilkan {filteredDiscrepancies.length > 0 ? (reconCurrentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(reconCurrentPage * ITEMS_PER_PAGE, filteredDiscrepancies.length)} dari {filteredDiscrepancies.length.toLocaleString('id-ID')} Item Selisih
                                        </span>
                                        <div className="flex items-center space-x-2">
                                            <button
                                                disabled={reconCurrentPage === 1}
                                                onClick={() => setReconCurrentPage(p => Math.max(1, p - 1))}
                                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl flex items-center space-x-1 cursor-pointer"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                                <span>Prev</span>
                                            </button>
                                            <span className="px-3 py-1 bg-slate-100 rounded-xl">
                                                Halaman {reconCurrentPage} / {totalReconPages}
                                            </span>
                                            <button
                                                disabled={reconCurrentPage >= totalReconPages}
                                                onClick={() => setReconCurrentPage(p => p + 1)}
                                                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl flex items-center space-x-1 cursor-pointer"
                                            >
                                                <span>Next</span>
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: AUDIT TRAIL COUNTSHEET */}
                    {activeTab === 'audit' && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-5">
                            <div className="flex justify-between items-center border-b pb-4">
                                <h3 className="text-base font-black text-slate-900 flex items-center">
                                    <Clock className="w-5 h-5 mr-2 text-indigo-600" />
                                    Audit Trail Countsheet (Snapshot Final)
                                </h3>
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                                        Monitor Real-Time ({auditLogs.length} Entri Terbaru)
                                    </span>
                                    <button
                                        onClick={handleExportAuditTrailXLSX}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        <span>Download Full Audit Log (.xlsx)</span>
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto overflow-y-auto border rounded-2xl max-h-125 scrollbar-thin">
                                <table className="w-full text-left text-[11px] min-w-max border-collapse">
                                    <thead className="bg-slate-50 font-black text-slate-600 border-b sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 border-r whitespace-nowrap bg-slate-50">TIMESTAMP (JAM SUBMIT)</th>
                                            <th className="p-3 border-r bg-slate-50">LOKASI RAK</th>
                                            <th className="p-3 border-r bg-slate-50">OWNER SKU</th>
                                            <th className="p-3 border-r bg-slate-50">SKU & DESKRIPSI</th>
                                            <th className="p-3 border-r bg-slate-50">UPC 1</th>
                                            <th className="p-3 border-r bg-slate-50">UPC 2</th>
                                            <th className="p-3 border-r bg-slate-50">COUNTER PIC</th>
                                            <th className="p-3 border-r text-center bg-slate-50">RONDE</th>
                                            <th className="p-3 border-r text-center text-emerald-700 bg-slate-50">QTY GOOD</th>
                                            <th className="p-3 border-r text-center text-red-700 bg-slate-50">QTY BAD</th>
                                            <th className="p-3 border-r text-center font-black bg-slate-50">TOTAL FINAL SUBMITTED</th>
                                            <th className="p-3 border-r bg-slate-50">ED ACTUAL</th>
                                            <th className="p-3 bg-slate-50">REMARKS</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {auditLogs.map((log, idx) => (
                                            <tr key={log.id || idx} className="hover:bg-slate-50">
                                                <td className="p-3 border-r font-mono whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleString('id-ID') : '-'}</td>
                                                <td className="p-3 border-r font-bold font-mono text-indigo-600">{log.rackLocation || log.Location}</td>
                                                <td className="p-3 border-r font-bold">{log.ownerSku || log.Owner || 'DDI'}</td>
                                                <td className="p-3 border-r max-w-xs truncate"><span className="font-mono font-bold text-slate-900">{log.sku || log.SKU}</span> - {log.description || log.Description}</td>
                                                <td className="p-3 border-r font-mono">{log.upc1 || log.UPC1 || '-'}</td>
                                                <td className="p-3 border-r font-mono">{log.upc2 || log.UPC2 || '-'}</td>
                                                <td className="p-3 border-r font-bold uppercase">{log.counterPic || log.counter}</td>
                                                <td className="p-3 border-r text-center font-bold">Round {log.round || log.currentRound || 1}</td>
                                                <td className="p-3 border-r text-center font-black text-emerald-600">{log.qtyGood ?? log.totalFinalSubmitted ?? 0}</td>
                                                <td className="p-3 border-r text-center font-black text-red-600">{log.qtyBad ?? 0}</td>
                                                <td className="p-3 border-r text-center font-black bg-slate-50">{log.totalFinalSubmitted ?? log.qtyActual ?? 0} PCS</td>
                                                <td className="p-3 border-r font-mono">{log.edActual || log.expiredDateActual || '-'}</td>
                                                <td className="p-3 bg-slate-50">{log.remarks || log.Remarks || '-'}</td>
                                            </tr>
                                        ))}
                                        {auditLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={13} className="p-8 text-center text-slate-400 font-medium">
                                                    Belum ada riwayat hitungan countsheet yang tercatat di Cloud.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: SETTINGS & BACKUP EMERGENCY */}
                    {activeTab === 'settings' && effectiveRole === 'owner' && (
                        <div className="space-y-6">
                            {/* KARTU 1: MASTER KATEGORI BAD STOCK (CONFIGURABLE BY OWNER) */}
                            <div className="bg-white rounded-3xl border border-amber-200 p-6 shadow-xl space-y-4">
                                <div className="border-b pb-3 flex justify-between items-center">
                                    <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                                        <AlertCircle className="w-5 h-5 text-amber-600" />
                                        <span>Master Kategori Kerusakan (Bad Stock)</span>
                                    </h3>
                                    <span className="text-xs font-extrabold text-amber-800 bg-amber-50 px-3 py-1 rounded-xl">Otorisasi Owner</span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Atur daftar label kategori kerusakan yang akan muncul sebagai pilihan tombol chip di HP Counter saat input Bad Stock.
                                </p>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ketik kategori kerusakan baru (contoh: Kemasan Sobek)..."
                                        value={newCategoryInput}
                                        onChange={(e) => setNewCategoryInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddBadStockCategory(); }}
                                        className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                    <button
                                        onClick={handleAddBadStockCategory}
                                        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                                    >
                                        + Tambah Kategori
                                    </button>
                                </div>

                                <div className="pt-2 flex flex-wrap gap-2">
                                    {badStockCategories.map((cat, idx) => (
                                        <div key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs font-bold text-amber-900 shadow-2xs">
                                            <span>{cat}</span>
                                            <button
                                                onClick={() => handleRemoveBadStockCategory(cat)}
                                                className="p-0.5 hover:bg-amber-200 rounded-lg text-amber-700 hover:text-red-700 transition-colors cursor-pointer"
                                                title={`Hapus kategori ${cat}`}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {badStockCategories.length === 0 && (
                                        <span className="text-xs text-slate-400 italic">Belum ada kategori diset. Counter akan melihat opsi default.</span>
                                    )}
                                </div>
                            </div>

                            {/* KARTU 2: EMERGENCY BACKUP & RESTORE */}
                            <div className="bg-white rounded-3xl border border-indigo-100 p-6 shadow-xl space-y-4">
                                <div className="border-b pb-3 flex justify-between items-center">
                                    <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                                        <HardDrive className="w-5 h-5 text-indigo-600" />
                                        <span>System Emergency Backup & Restore (JSON Cloud Snapshot)</span>
                                    </h3>
                                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">Solusi Anti Crash</span>
                                </div>
                                <p className="text-xs text-slate-500">Unduh snapshot backup seluruh database ke file komputer/HP kamu untuk amunisi cadangan darurat jika koneksi bermasalah.</p>
                                <div className="flex flex-wrap gap-3 pt-1">
                                    <button
                                        onClick={handleDownloadFullDatabaseBackupJSON}
                                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md cursor-pointer"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Download Cloud Backup (.JSON)</span>
                                    </button>

                                    <label className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md cursor-pointer">
                                        <RefreshCw className="w-4 h-4" />
                                        <span>Restore Database dari File (.JSON)</span>
                                        <input
                                            type="file"
                                            accept=".json"
                                            className="hidden"
                                            onChange={(e) => { if (e.target.files?.[0]) handleRestoreDatabaseFromJSON(e.target.files[0]); }}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* KARTU 3: WEBHOOK SYNC */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-4">
                                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                                    <Link2 className="w-5 h-5 text-purple-600" />
                                    <span>Google Sheets Webhook Sync</span>
                                </h3>
                                <div className="flex gap-3">
                                    <input type="text" placeholder="https://script.google.com/..." value={gsheetWebhookUrl} onChange={(e) => setGsheetWebhookUrl(e.target.value)} className="flex-1 px-4 py-2.5 text-xs font-mono bg-slate-50 border rounded-xl outline-none" />
                                    <button onClick={() => triggerNotification('Webhook Disimpan!')} className="px-6 py-2.5 bg-purple-700 text-white rounded-xl text-xs font-bold">Simpan Webhook</button>
                                </div>
                            </div>

                            {/* KARTU 4: ASSIGN TIM PROJECT */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-5">
                                    <div className="flex justify-between items-center border-b pb-3">
                                        <h3 className="text-base font-black text-slate-900 flex items-center"><Users className="w-5 h-5 mr-2 text-indigo-600" />Assign Tim Project</h3>
                                        <button onClick={handleDownloadTeamTemplate} className="text-xs text-indigo-600 font-bold hover:underline bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center"><Download className="w-3.5 h-3.5 mr-1" />Template CSV</button>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <SearchableSelect options={globalAccounts.filter(acc => !activeTeamMembers.find(t => t.username === acc.username)).map(acc => ({ value: acc.username, label: `${acc.username} - ${acc.name}` }))} value={assignUsername} onChange={setAssignUsername} placeholder="Cari dari Master KTP..." className="flex-1" />
                                        <select value={assignRole} onChange={(e) => setAssignRole(e.target.value as UserRole)} className="px-4 py-2 bg-slate-50 border rounded-xl text-sm font-bold outline-none"><option value="counter">Counter</option><option value="spv">Supervisor</option></select>
                                        <button onClick={handleAssignTeamManual} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold">Assign Tim</button>
                                    </div>
                                    <div className="overflow-y-auto max-h-56 border rounded-2xl text-sm">
                                        <table className="w-full text-left"><thead className="bg-slate-50 font-bold text-slate-500 border-b"><tr><th className="p-3">USERNAME</th><th className="p-3 text-center">ROLE</th><th className="p-3 text-right">CABUT</th></tr></thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeTeamMembers.map(t => (<tr key={t.id} className="hover:bg-slate-50"><td className="p-3 font-mono font-bold text-indigo-600">{t.username}</td><td className="p-3 text-center"><span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">{t.role}</span></td><td className="p-3 text-right"><button onClick={() => handleRemoveTeamMember(t.username)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button></td></tr>))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                        </div>
                    </div>
                </div>
            )}

            {/* TRADEMARK FOOTER */}
            <div className={`pt-8 pb-4 text-center border-t ${viewState === 'DASHBOARD' ? 'border-slate-200/60 mt-8 px-6 bg-slate-100' : 'border-white/10 mt-12 bg-transparent relative z-10'}`}>
                <div className="flex items-center justify-center gap-2 mb-1">
                    <img 
                        src="/logo.png" 
                        alt="Noctus Count Logo" 
                        className="w-5 h-5 object-contain"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(0,242,254,0.45))' }}
                    />
                    <span className={`text-xs font-mono font-bold tracking-wider ${viewState === 'DASHBOARD' ? 'text-slate-800' : 'text-slate-200'}`}>
                        NOCTUS COUNT™
                    </span>
                </div>
                <p className={`text-[11px] font-mono ${viewState === 'DASHBOARD' ? 'text-slate-400 font-medium' : 'text-slate-500'}`}>
                    Stock Opname Systems • Developed by <span className="font-bold text-cyan-500">Noctus</span>
                </p>
            </div>
        </div>
    );
}