import { useState, useEffect, useRef, useMemo } from 'react';
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
    ChevronLeft, ChevronRight, Bell, LayoutDashboard
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
    qtyGood?: number;
    qtyBad?: number;
    Remarks: string;
    thirdPartyQty?: number;
    unitPrice?: number;
    isCounted?: boolean;
    round1Actual?: number;
    round2Actual?: number;
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

    const [isProjectLocked, setIsProjectLocked] = useState(false);
    const [lockedCounters, setLockedCounters] = useState<Record<string, boolean>>({});

    const [credentialsModalText, setCredentialsModalText] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    // UPLOAD PROGRESS & CANCEL REF
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; stepMessage?: string } | null>(null);
    const isUploadCancelledRef = useRef<boolean>(false);
    const isUploadingRef = useRef<boolean>(false);

    // STATE KATEGORI BAD STOCK (CONFIGURABLE BY OWNER)
    const [badStockCategories, setBadStockCategories] = useState<string[]>(['Dus Penyok', 'Kemasan Bocor', 'Segel Rusak', 'Basah / Lembab', 'Barang Expired']);
    const [newCategoryInput, setNewCategoryInput] = useState<string>('');

    useEffect(() => {
        setOrderedTabs(ALL_AVAILABLE_TABS.filter(tab => tab.roles.includes(effectiveRole)));
    }, [effectiveRole]);

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

        return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsubOwner(); unsubBadStock(); unsubAudit(); };
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

    const handleDeployNextRoundForCounter = async (targetCounter: string) => {
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

        const nextRound = currentCounterRound + 1;

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

        if (!window.confirm(`AKSI OWNER: Deploy RONDE ${nextRound} KHUSUS untuk Counter "${cleanCounter}"? (${disputeTasks.length} SKU Selisih akan di-reset)`)) return;

        try {
            const batch = writeBatch(db);
            const timestampNow = new Date().toISOString();

            counterTasks.forEach((item) => {
                if (!item.id) return;
                const ref = doc(db, "master_tasks", item.id);
                const act = item.countedQty ?? item.Qty;

                const isR2MatchR1 = (currentCounterRound === 2 && item.round1Actual !== undefined && act === item.round1Actual);

                if (item.isCounted && act !== item.Qty && !isR2MatchR1) {
                    batch.update(ref, {
                        currentRound: nextRound,
                        QTY_ACTUAL: null,
                        QTY_GOOD: null,
                        QTY_BAD: null,
                        isCounted: false,
                        [`round${currentCounterRound}Actual`]: act,
                        updatedAt: timestampNow
                    });

                    const logId = `${activeProject.sessionCode}_DEPLOY_R${nextRound}_${cleanCounter}_${item.SKU}_${item.Location}`;
                    const auditRef = doc(db, "audit_logs", logId);
                    batch.set(auditRef, {
                        timestamp: timestampNow,
                        rackLocation: item.Location,
                        ownerSku: item.Owner || 'DDI',
                        sku: item.SKU,
                        description: item.Description,
                        upc1: item.UPC1 || '-',
                        upc2: item.UPC2 || '-',
                        counterPic: cleanCounter,
                        round: nextRound,
                        qtyGood: 0,
                        qtyBad: 0,
                        totalFinalSubmitted: 0,
                        edActual: '-',
                        remarks: `[DEPLOY R${nextRound} PIC: ${cleanCounter}] Di-reset untuk hitung ulang karena selisih R${currentCounterRound} (Act: ${act} vs WMS: ${item.Qty})`
                    }, { merge: true });

                } else {
                    batch.update(ref, {
                        isLocked: true,
                        updatedAt: timestampNow
                    });
                }
            });

            await batch.commit();
            triggerNotification(`🚀 Ronde ${nextRound} Berhasil Dideploy Khusus untuk Counter "${cleanCounter}"! (${disputeTasks.length} SKU Selisih)`);
        } catch (err: any) {
            console.error(`Deploy Round ${nextRound} Error:`, err);
            triggerNotification(`Gagal Deploy Ronde ${nextRound}: ${err.message || String(err)}`);
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

            let statusSelisih = 'Uncounted / Pending';
            if (isCounted) {
                if (diff === 0) statusSelisih = 'Match';
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
                'COUNTER PIC': item.counter,
                'QTY SYSTEM (WMS)': sysQty,
                'QTY GOOD': isCounted ? goodQty : '-',
                'QTY BAD': isCounted ? badQty : '-',
                'TOTAL QTY ACTUAL': isCounted ? actQty : '-',
                'SELISIH QTY': isCounted ? diff : '-',
                'STATUS SELISIH': statusSelisih,
                'HARGA SATUAN (RP)': item.unitPrice || 0,
                'VALUASI SELISIH (RP)': isCounted ? valDiscrepancy : 0,
                'QTY FINAL RECOVERY': overrideQty,
                'VALUASI FINAL (RP)': finalValuation,
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

    // 2. FILTERED SKU CATALOG WITH PAGINATION (Single-pass Map O(N))
    const filteredSKUCatalog = useMemo(() => {
        const catalogMap = new Map<string, any>();
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
            }
        }
        const lowerSearch = catalogSearch.toLowerCase();
        const allItems = Array.from(catalogMap.values());
        if (!lowerSearch) return allItems;
        return allItems.filter(c =>
            c.SKU.toLowerCase().includes(lowerSearch) ||
            c.Description.toLowerCase().includes(lowerSearch) ||
            c.UPC1.toLowerCase().includes(lowerSearch)
        );
    }, [masterDataList, catalogSearch]);

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
        const brandGroupMap = new Map<string, Map<string, { SKU: string; Qty: number; countedQty: number; isCounted: boolean }>>();

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
                    countedQty: item.countedQty || 0,
                    isCounted: !!item.isCounted
                });
            } else {
                existing.Qty += (item.Qty || 0);
                if (item.isCounted) {
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
            const diffCount = countedSKUs.filter(m => m.countedQty !== m.Qty).length;

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
    const varianceRecoveryCount = useMemo(() => masterDataList.filter(m => m.isCounted && (m.countedQty ?? m.Qty) !== m.Qty).length, [masterDataList]);
    const totalFinancialVarianceValue = useMemo(() => masterDataList.reduce((acc, m) => acc + (m.isCounted ? (((m.countedQty ?? m.Qty) - m.Qty) * (m.unitPrice || 0)) : 0), 0), [masterDataList]);

    // 8. DISCREPANCY TABLE LIST & PAGINATION (Pencegah Freeze Layar Rekapitulasi)
    const filteredDiscrepancies = useMemo(() => {
        return masterDataList.filter(i => i.isCounted && ((i.countedQty || 0) - i.Qty) !== 0);
    }, [masterDataList]);

    const totalReconPages = Math.ceil(filteredDiscrepancies.length / ITEMS_PER_PAGE) || 1;
    const paginatedDiscrepancies = useMemo(() => {
        return filteredDiscrepancies.slice(
            (reconCurrentPage - 1) * ITEMS_PER_PAGE,
            reconCurrentPage * ITEMS_PER_PAGE
        );
    }, [filteredDiscrepancies, reconCurrentPage]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 lg:p-8 max-w-7xl mx-auto font-sans relative">
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

            {/* SCREEN 1: LANDING PAGE */}
            {viewState === 'LANDING' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative overflow-hidden">
                        <div className="flex items-center space-x-4 relative z-10">
                            <div className="w-14 h-14 bg-white rounded-2xl shadow-md border border-slate-100 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                <img src="/logo.png" alt="Noctus Count Logo" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                    <span>Noctus Count</span>
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg">Systems</span>
                                </h1>
                                <p className="text-xs text-slate-500 font-medium">Developed by Noctus • Enterprise Stock Opname</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 w-full md:w-auto relative z-10">
                            {onSwitchToCounterView && (
                                <button
                                    onClick={onSwitchToCounterView}
                                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
                                    title="Buka Tampilan HP Counter untuk Demo"
                                >
                                    <Smartphone className="w-5 h-5" />
                                    <span className="hidden sm:inline">Demo Mode Counter</span>
                                </button>
                            )}
                            {effectiveRole === 'owner' && (
                                <button onClick={() => setViewState('WIZARD_SETUP')} className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center space-x-2 shadow-xl">
                                    <Plus className="w-5 h-5" /><span>New Project</span>
                                </button>
                            )}
                            <button onClick={onBackToApp} className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center shadow-lg">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {effectiveRole === 'owner' && (
                        <div className="flex space-x-3 p-1.5 bg-white border border-slate-200 rounded-2xl w-fit shadow-xs">
                            <button onClick={() => setLandingTab('projects')} className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center space-x-2 ${landingTab === 'projects' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                                <Building2 className="w-4 h-4" /><span>Lokasi & Project</span>
                            </button>
                            <button onClick={() => setLandingTab('accounts')} className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center space-x-2 ${landingTab === 'accounts' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>
                                <Contact className="w-4 h-4" /><span>KTP Cloud</span>
                            </button>
                        </div>
                    )}

                    {landingTab === 'projects' && (
                        <div className="space-y-6">
                            {effectiveRole === 'owner' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-4">
                                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2"><Building2 className="w-5 h-5 text-indigo-600" /><span>Master Gudang WMS</span></h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Nama Gudang Baru..." value={newWhName} onChange={(e) => setNewWhName(e.target.value)} className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                                            <button onClick={handleAddWarehouseCloud} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">+ Tambah</button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-2">
                                            {warehouseList.map((wh) => (
                                                <div key={wh.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center"><span className="font-bold text-xs text-slate-800">{wh.name}</span></div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-4">
                                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2"><Store className="w-5 h-5 text-purple-600" /><span>Master Toko Consignment</span></h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Nama Toko Baru..." value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                                            <button onClick={handleAddStoreCloud} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold">+ Tambah</button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-2">
                                            {consignmentStoreList.map((st) => (
                                                <div key={st.id} className="p-3 bg-purple-50/40 border border-purple-200 rounded-xl flex justify-between items-center"><span className="font-bold text-xs text-slate-800">{st.name}</span></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-5">
                                <h3 className="text-base font-black text-slate-800 flex items-center space-x-2"><Database className="w-5 h-5 text-indigo-600" /><span>Live Firestore Projects</span></h3>
                                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 font-bold text-slate-500 border-b"><tr><th className="p-4">KODE PROJECT</th><th className="p-4">LOKASI</th><th className="p-4">TANGGAL</th><th className="p-4 text-center">STATUS</th><th className="p-4 text-right">AKSI</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {projectHistory.map((proj) => (
                                                <tr key={proj.id} className="hover:bg-slate-50">
                                                    <td className="p-4 font-bold font-mono text-indigo-600">{proj.sessionCode}</td>
                                                    <td className="p-4 font-bold text-slate-800">{proj.locationName}</td>
                                                    <td className="p-4 font-mono text-slate-500">{proj.opnameDate}</td>
                                                    <td className="p-4 text-center"><span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-black text-[11px]">{proj.status}</span></td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button onClick={() => handleOpenHistoricalProject(proj)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5"><PlayCircle className="w-4 h-4" /><span>Buka Dashboard</span></button>
                                                        {effectiveRole === 'owner' && (<button onClick={() => setProjectToDelete(proj)} className="p-2 text-slate-400 hover:text-red-600 rounded-xl"><Trash2 className="w-4 h-4" /></button>)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {landingTab === 'accounts' && effectiveRole === 'owner' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-4">
                                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                    <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                                        <KeyRound className="w-5 h-5 text-indigo-600" />
                                        <span>Pengaturan Akun & Profil Owner</span>
                                    </h3>
                                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">Otorisasi Master</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input type="text" value={ownerNewName} onChange={(e) => setOwnerNewName(e.target.value)} placeholder="Nama Lengkap Owner" className="px-4 py-2.5 text-xs bg-slate-50 border rounded-xl outline-none" />
                                    <input type="email" value={ownerNewEmail} onChange={(e) => setOwnerNewEmail(e.target.value)} placeholder="Email Owner" className="px-4 py-2.5 text-xs bg-slate-50 border rounded-xl outline-none" />
                                    <input type="password" maxLength={6} value={ownerNewPin} onChange={(e) => setOwnerNewPin(e.target.value)} placeholder="PIN Baru (4-Digit)" className="px-4 py-2.5 text-xs font-mono bg-slate-50 border rounded-xl outline-none" />
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleUpdateOwnerAccount} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 flex items-center space-x-1.5 cursor-pointer">
                                        <Save className="w-4 h-4" />
                                        <span>Simpan Profil Owner</span>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-6">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div><h3 className="text-base font-black text-slate-900">Master KTP & Otorisasi</h3></div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={handleDownloadKTPTemplate} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                            <span>Template KTP</span>
                                        </button>
                                        <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer">
                                            <Upload className="w-4 h-4" />
                                            <span>Upload KTP Massal</span>
                                            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUploadBulkKTPAccounts(e.target.files[0]); }} />
                                        </label>
                                        <button onClick={handleGenerateCredentialsText} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md">
                                            <Copy className="w-4 h-4" />
                                            <span>Salin Teks Kredensial</span>
                                        </button>
                                        <button onClick={handleBlastEmailCredentials} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md">
                                            <Mail className="w-4 h-4" />
                                            <span>Blast Email</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                    <h4 className="text-sm font-bold text-slate-800">Daftar KTP Manual</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input type="text" placeholder="Username..." value={newAccUser} onChange={(e) => setNewAccUser(e.target.value)} className="px-4 py-2.5 text-sm bg-white border rounded-xl outline-none" />
                                        <input type="text" placeholder="Nama Lengkap..." value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="px-4 py-2.5 text-sm bg-white border rounded-xl outline-none" />
                                        <input type="password" maxLength={4} placeholder="PIN 4-Digit..." value={newAccPin} onChange={(e) => setNewAccPin(e.target.value)} className="px-4 py-2.5 text-sm font-mono bg-white border rounded-xl outline-none" />
                                        <input type="email" placeholder="Email..." value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="px-4 py-2.5 text-sm bg-white border rounded-xl outline-none" />
                                    </div>
                                    <div className="flex justify-end"><button onClick={handleAddGlobalAccount} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center space-x-2"><UserPlus className="w-4 h-4" /><span>Buat Akun KTP</span></button></div>
                                </div>

                                <div className="relative w-full">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input type="text" value={ktpSearch} onChange={(e) => setKtpSearch(e.target.value)} placeholder="Cari counter berdasarkan username, nama, atau email..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none" />
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                                    <table className="w-full text-left text-sm"><thead className="bg-slate-50 font-bold text-slate-500 border-b"><tr><th className="p-4">USERNAME</th><th className="p-4">NAMA PEGAWAI</th><th className="p-4">EMAIL</th><th className="p-4 text-center">PIN</th><th className="p-4 text-right">AKSI</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {filteredGlobalAccounts.map((acc) => (
                                                <tr key={acc.id} className="hover:bg-slate-50">
                                                    <td className="p-4 font-bold font-mono text-indigo-600">{acc.username}</td>
                                                    <td className="p-4 font-bold text-slate-800">{acc.name}</td>
                                                    <td className="p-4 text-slate-500 text-xs">{acc.email || '-'}</td>
                                                    <td className="p-4 text-center font-mono font-bold text-slate-600 flex justify-center items-center space-x-2">
                                                        <span>{visiblePins[acc.id] ? acc.pin : '••••'}</span>
                                                        <button onClick={() => togglePinVisibility(acc.id)} className="text-slate-400 hover:text-indigo-600">
                                                            {visiblePins[acc.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button onClick={() => setEditingAccount(acc)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Edit Akun KTP"><Edit2 className="w-4 h-4" /></button>
                                                        <button onClick={() => handleSendIndividualEmail(acc)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl" title="Kirim Email Individual"><Mail className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDeleteGlobalAccount(acc.username)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
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
                <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><SlidersHorizontal className="w-6 h-6" /></div><div><h1 className="text-xl font-black text-slate-900">Project Setup</h1></div></div>
                        <button onClick={() => setViewState('LANDING')} className="p-2.5 bg-slate-100 rounded-xl"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
                    </div>
                    <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-extrabold text-slate-800">1. Tipe Lokasi Opname:</label>
                            <SearchableSelect options={combinedLocationOptions} value={wizLocationId} onChange={setWizLocationId} placeholder="-- Cari Lokasi --" className="w-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-sm font-extrabold text-slate-800">2. Kode Sesi:</label><input type="text" value={wizSessionCode} onChange={(e) => setWizSessionCode(e.target.value)} className="w-full p-3.5 bg-slate-50 border rounded-2xl text-sm font-bold font-mono text-indigo-600 outline-none" /></div>
                            <div className="space-y-2"><label className="text-sm font-extrabold text-slate-800">3. Tanggal:</label><input type="date" value={wizOpnameDate} onChange={(e) => setWizOpnameDate(e.target.value)} className="w-full p-3.5 bg-slate-50 border rounded-2xl text-sm font-bold outline-none" /></div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <label className="text-sm font-extrabold text-slate-800">4. Metode Lock:</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div onClick={() => setWizMethod('LIST_TO_FLOOR')} className={`p-4 rounded-2xl border-2 cursor-pointer ${wizMethod === 'LIST_TO_FLOOR' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}><div className="text-sm font-black text-center text-slate-900">LIST TO FLOOR</div></div>
                                <div onClick={() => setWizMethod('FLOOR_TO_LIST')} className={`p-4 rounded-2xl border-2 cursor-pointer ${wizMethod === 'FLOOR_TO_LIST' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}><div className="text-sm font-black text-center text-slate-900">FLOOR TO LIST</div></div>
                            </div>
                        </div>

                        <div className="p-5 bg-linear-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl text-center space-y-3">
                            <div className="flex justify-center"><FileSpreadsheet className="w-8 h-8 text-indigo-600" /></div>
                            <div>
                                <div className="text-sm font-bold text-indigo-900">Pre-load Master Task Excel (.xlsx)</div>
                                <p className="text-xs text-indigo-600/70 mt-1">Upload sekarang untuk mempercepat sesi opname.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplateXLSX}
                                    className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                    <span>Download Template (.xlsx)</span>
                                </button>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setInitialFileToUpload(e.target.files?.[0] || null)}
                                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4"><button onClick={handleStartNewProjectSession} className="w-full md:w-auto px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-sm font-black flex items-center justify-center space-x-2 shadow-xl"><PlayCircle className="w-5 h-5" /><span>Launch Dashboard</span></button></div>
                    </div>
                </div>
            )}

            {/* SCREEN 3: DASHBOARD MAIN - EXECUTIVE TABLET LAYOUT */}
            {viewState === 'DASHBOARD' && activeProject && (
                <div className="bg-[#0B0F17] p-2.5 sm:p-5 rounded-[28px] sm:rounded-[36px] shadow-2xl border border-slate-800/80 animate-in fade-in duration-500">
                    {/* INNER CONTAINER / CANVAS */}
                    <div className="bg-[#F8FAFC] rounded-[20px] sm:rounded-[28px] overflow-hidden flex flex-col min-h-[850px] shadow-inner border border-slate-700/30">
                        {/* EXECUTIVE TABLET TOP BAR */}
                        <div className="bg-white px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200/80 flex flex-col xl:flex-row justify-between xl:items-center gap-4 shrink-0 shadow-xs">
                            {/* LEFT: Back, Logo, Project Code & Warehouse */}
                            <div className="flex items-center space-x-3.5 shrink-0">
                                <button
                                    onClick={() => setViewState('LANDING')}
                                    title="Kembali ke Daftar Project"
                                    className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors text-slate-700 shrink-0"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <div className="w-10 h-10 bg-white rounded-xl shadow-xs border border-slate-200/70 p-1 flex items-center justify-center overflow-hidden shrink-0">
                                    <img src="/logo.png" alt="Noctus Count Logo" className="w-full h-full object-contain" />
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

                            {/* CENTER: CONNECTED 4-PILL KPI CAPSULE (MOCKUP ACCURATE) */}
                            <div className="flex justify-center">
                                <div className="inline-flex items-center bg-[#0F172A] text-white p-1 rounded-2xl border border-slate-800 shadow-md divide-x divide-slate-800 text-xs">
                                    <div className="px-3.5 py-1 text-center">
                                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">TOTAL ITEMS</span>
                                        <span className="text-xs sm:text-sm font-black text-white">{totalSKUs.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="px-3.5 py-1 text-center">
                                        <span className="text-[9px] text-amber-400 font-extrabold uppercase tracking-widest block">COUNTED</span>
                                        <span className="text-xs sm:text-sm font-black text-amber-400">{totalCounted.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="px-3.5 py-1 text-center">
                                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">REMAINING</span>
                                        <span className="text-xs sm:text-sm font-black text-slate-300">{Math.max(0, totalSKUs - totalCounted).toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="px-3.5 py-1 text-center">
                                        <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest block">ACCURACY</span>
                                        <span className="text-xs sm:text-sm font-black text-emerald-400">{overallPercentage}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Round Filter, Role Badge & Session Lock Status */}
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
                                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
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
                                        title="Beralih ke Layar Counter"
                                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors"
                                    >
                                        <Smartphone className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* MAIN BODY: SLIM ICON SIDEBAR + CONTENT AREA */}
                        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
                            {/* SLIM ICON SIDEBAR (EXECUTIVE DARK) */}
                            <div className="w-full md:w-16 bg-[#0F172A] flex md:flex-col items-center justify-between p-2 md:py-5 border-r border-slate-800/80 shrink-0">
                                {/* NAV ICONS */}
                                <div className="flex md:flex-col items-center space-x-2 md:space-x-0 md:space-y-3 overflow-x-auto md:overflow-x-visible w-full md:w-auto px-2 md:px-0">
                                    {orderedTabs.map(t => {
                                        const isActive = activeTab === t.id;
                                        const IconComponent = t.icon;
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => setActiveTab(t.id)}
                                                title={t.label}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                                                    isActive
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                                                }`}
                                            >
                                                <IconComponent className="w-4 h-4" />
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* BOTTOM ICON ACTIONS */}
                                <div className="hidden md:flex flex-col items-center space-y-3 pt-4 border-t border-slate-800/60">
                                    {onSwitchToCounterView && (
                                        <button
                                            onClick={onSwitchToCounterView}
                                            title="Buka Mode Counter"
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/70 transition-all cursor-pointer"
                                        >
                                            <Smartphone className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setViewState('LANDING')}
                                        title="Keluar ke Daftar Project"
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-800/70 transition-all cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* CONTENT AREA */}
                            <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-[calc(100vh-140px)] space-y-6">
                                {/* TAB 1: PROGRESS & ANALYTICS (EXECUTIVE 12-COL GRID) */}
                                {activeTab === 'progress' && (
                                    <div className="space-y-6">
                                        {/* 12-COL GRID */}
                                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                            {/* LEFT COLUMN: PENDING STOCK COUNTS & LEVEL PROGRESS (7 OF 12) */}
                                            <div className="xl:col-span-7 space-y-6">
                                                {/* PENDING STOCK COUNTS TABLE */}
                                                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-3">
                                                        <div className="flex items-center space-x-2">
                                                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                                                <Users className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-black text-slate-900 tracking-tight">PENDING STOCK COUNTS</h3>
                                                                <p className="text-[11px] text-slate-400 font-medium">Monitoring Real-Time PIC Counter Lapangan</p>
                                                            </div>
                                                        </div>
                                                        <div className="relative w-full sm:w-56">
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
                                                                            {effectiveRole === 'owner' && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleDeployNextRoundForCounter(cName); }}
                                                                                        title={cMaxRound >= 3 ? 'Sudah mencapai Ronde 3 Maksimal' : `Deploy Ronde ${cMaxRound + 1} Khusus ${cName}`}
                                                                                        disabled={cMaxRound >= 3}
                                                                                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${cMaxRound >= 3 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`}
                                                                                    >
                                                                                        <Repeat className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setTransferSourceCounter(cName); }}
                                                                                        title="Transfer Seluruh Tugas Counter Ini"
                                                                                        className="p-1.5 rounded-lg cursor-pointer bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                                                                                    >
                                                                                        <UserPlus className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); handleToggleCounterLock(cName, isLocked); }}
                                                                                        title={isLocked ? "Buka Akses Input Counter" : "Kunci Akses Input Counter"}
                                                                                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${isLocked ? 'bg-red-100 text-red-600 hover:bg-red-200 border border-red-300' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                                                                    >
                                                                                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                                                    </button>
                                                                                </>
                                                                            )}
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
                                                                            className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
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
                                                                        <span className="text-indigo-600 font-mono">{lvl.counted}/{lvl.total} ({lvl.percentage}%)</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${lvl.percentage}%` }} />
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
                                <div className="relative w-full sm:w-72">
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
                                <div className="flex justify-between items-center border-b pb-3">
                                    <div>
                                        <h3 className="text-base font-black text-slate-900 flex items-center"><Scale className="w-5 h-5 mr-2 text-indigo-600" />Laporan Selisih & Override Recovery</h3>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">Monitoring variansi stok fisik vs sistem WMS untuk SPV & Owner</p>
                                    </div>

                                    <button onClick={handleExportReconXLSX} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        <span>Download Recon (.xlsx)</span>
                                    </button>
                                </div>
                                <div className="overflow-x-auto border rounded-2xl">
                                    <table className="w-full text-left text-sm"><thead className="bg-slate-50 font-black text-slate-600 border-b"><tr><th className="p-4">SKU BARANG</th><th className="p-4 text-center">WMS QTY</th><th className="p-4 text-center">QTY GOOD</th><th className="p-4 text-center text-red-600">QTY BAD</th><th className="p-4 text-center">ACTUAL QTY</th><th className="p-4 text-center">SELISIH</th><th className="p-4 text-right bg-amber-50">VALUASI (Rp)</th><th className="p-4 text-right bg-indigo-50">OVERRIDE RECOVERY</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {paginatedDiscrepancies.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                                                        Tidak ada selisih stok (Seluruh item terhitung cocok / belum ada variansi).
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedDiscrepancies.map((item, i) => {
                                                    const diff = (item.countedQty || 0) - item.Qty;
                                                    const val = diff * (item.unitPrice || 0);
                                                    return (
                                                        <tr key={item.id || `${item.SKU}_${i}`} className="hover:bg-slate-50">
                                                            <td className="p-4 font-mono font-bold text-indigo-600">{item.SKU}</td>
                                                            <td className="p-4 text-center text-slate-500">{item.Qty}</td>
                                                            <td className="p-4 text-center font-bold text-emerald-600">{item.qtyGood ?? item.countedQty}</td>
                                                            <td className="p-4 text-center font-bold text-red-600">{item.qtyBad ?? 0}</td>
                                                            <td className="p-4 text-center font-black">{item.countedQty}</td>
                                                            <td className="p-4 text-center text-red-600 font-black">{diff > 0 ? `+${diff}` : diff}</td>
                                                            <td className="p-4 text-right font-mono text-amber-700 font-bold bg-amber-50/20">Rp {val.toLocaleString('id-ID')}</td>
                                                            <td className="p-4 text-right bg-indigo-50/10">
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
                </div>
            )}

            {/* TRADEMARK FOOTER */}
            <div className="pt-8 pb-4 text-center border-t border-slate-200/60 mt-12">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <img src="/logo.png" alt="Noctus Count Logo" className="w-5 h-5 object-contain" />
                    <span className="text-xs font-black text-slate-800 tracking-wider">NOCTUS COUNT™</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                    Stock Opname Systems • Developed by <span className="font-bold text-indigo-600">Noctus</span>
                </p>
            </div>
        </div>
    );
}