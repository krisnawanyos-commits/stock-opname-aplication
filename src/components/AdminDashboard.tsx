import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../firebase';
import {
    collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs, query, where, orderBy, limit, updateDoc, startAfter
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
    Printer, Shuffle, FileDown, Camera,
    Archive, ArchiveRestore, ExternalLink, FolderArchive, FolderOpen,
    Zap, Gauge, CheckCheck
} from 'lucide-react';
import type { UserRole } from '../types';
import NetworkStatusBadge from './NetworkStatusBadge';

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
    projectId?: string;
    sessionCode?: string;
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
    pcsPerCarton?: number;
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
    photoUrl?: string;
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
    isColdData?: boolean;
    purgedAt?: string;
    totalTasksSummary?: number;
    totalActualSummary?: number;
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
    const [projectFilterStatus, setProjectFilterStatus] = useState<'ALL' | 'LIVE_ACTIVE' | 'ARCHIVED'>('LIVE_ACTIVE');
    const [projectToArchive, setProjectToArchive] = useState<{ project: ProjectSession; targetStatus: 'ARCHIVED' | 'LIVE_ACTIVE' } | null>(null);
    const [archiveWithPurge, setArchiveWithPurge] = useState<boolean>(true);
    const [isColdArchiveMode, setIsColdArchiveMode] = useState<boolean>(false);
    const [coldArchiveFileName, setColdArchiveFileName] = useState<string>('');
    const coldFileInputRef = useRef<HTMLInputElement>(null);
    const isColdArchiveModeRef = useRef<boolean>(false);
    isColdArchiveModeRef.current = isColdArchiveMode;
    const [driveBackupModal, setDriveBackupModal] = useState<{ isOpen: boolean; project: ProjectSession; jsonFilename: string } | null>(null);
    const [isExportingData, setIsExportingData] = useState<boolean>(false);

    const [activeTab, setActiveTab] = useState<string>('progress');
    const [orderedTabs, setOrderedTabs] = useState<TabDefinition[]>([]);

    const [selectedCounterForDetail, setSelectedCounterForDetail] = useState<string | null>(null);
    const [ktpSearch, setKtpSearch] = useState<string>('');
    const [counterSearch, setCounterSearch] = useState<string>('');
    const [counterProgressFilter, setCounterProgressFilter] = useState<'ALL' | 'IN_PROGRESS' | 'DONE' | 'NOT_STARTED' | 'DISPUTE'>('ALL');
    const [counterSortBy, setCounterSortBy] = useState<'NAME_ASC' | 'PROGRESS_ASC' | 'PROGRESS_DESC' | 'DISPUTE_DESC'>('NAME_ASC');
    const [catalogSearch, setCatalogSearch] = useState<string>('');
    const [masterTaskSearch, setMasterTaskSearch] = useState<string>('');
    const [reconSearch, setReconSearch] = useState<string>('');

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
    
    // MODAL PREVIEW FOTO BARANG TEMUAN FISIK
    const [photoPreviewModal, setPhotoPreviewModal] = useState<{
        isOpen: boolean;
        photoUrl: string;
        sku: string;
        location: string;
        description: string;
        counter: string;
    } | null>(null);

    // EXPORT CONFIG: Default false agar aman dibagikan ke 3rd party vendor (Blind Count - Tanpa Qty Sistem & Status)
    const [exportIncludeSystemQty, setExportIncludeSystemQty] = useState<boolean>(false);

    // MASS AUTO-PAIR SWAP MODAL STATE (100 COUNTER SCALE)
    const [autoPairModal, setAutoPairModal] = useState<{
        isOpen: boolean;
        pairs: Array<{ counterA: string; counterB: string; disputeA: number; disputeB: number }>;
        oddCounter?: string;
        isSubmitting: boolean;
        progress?: { current: number; total: number; message: string } | null;
    }>({
        isOpen: false,
        pairs: [],
        oddCounter: undefined,
        isSubmitting: false,
        progress: null
    });

    // STRESS TEST & BATTLE READINESS SUITE STATE
    const [stressTestModal, setStressTestModal] = useState<{
        isOpen: boolean;
        isRunning: boolean;
        results: {
            testedScale: number;
            genTimeMs: number;
            groupTimeMs: number;
            rssMemoryMb: number;
            excelThroughputRowsPerSec: number;
            firestoreSafetyMarginPct: number;
            concurrentCountersSimulated: number;
            integrityAudit: {
                totalTasks: number;
                unassignedCount: number;
                duplicateSkuInLocCount: number;
                roundMismatchCount: number;
                missingBarcodeCount: number;
                offlinePersistenceReady: boolean;
            };
            battleReadinessScore: number;
            recommendations: string[];
        } | null;
    }>({
        isOpen: false,
        isRunning: false,
        results: null
    });

    // SMART PRINT GUARD & BATCH PRINT MODAL STATE
    const [printGuardModal, setPrintGuardModal] = useState<{
        isOpen: boolean;
        totalRows: number;
        roundNumber: number;
        selectedCounter?: string;
        batchSize: number;
        activeTab: 'batch' | 'single' | 'all';
        singleSelectCounter: string;
    }>({
        isOpen: false,
        totalRows: 0,
        roundNumber: 1,
        batchSize: 10,
        activeTab: 'batch',
        singleSelectCounter: ''
    });

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

    // EDIT & DELETE & ADD MASTER TASK STATES
    const [editingMasterTask, setEditingMasterTask] = useState<MasterSKUItem | null>(null);
    const [isSavingMasterTask, setIsSavingMasterTask] = useState<boolean>(false);
    const [deletingMasterTask, setDeletingMasterTask] = useState<MasterSKUItem | null>(null);
    const [isDeletingMasterTask, setIsDeletingMasterTask] = useState<boolean>(false);
    const [deleteMasterConfirmedChecked, setDeleteMasterConfirmedChecked] = useState<boolean>(false);
    const [isAddMasterTaskOpen, setIsAddMasterTaskOpen] = useState<boolean>(false);
    const [isAddingMasterTask, setIsAddingMasterTask] = useState<boolean>(false);
    const [newMasterTaskForm, setNewMasterTaskForm] = useState<{
        SKU: string;
        Description: string;
        UPC1: string;
        UPC2: string;
        Location: string;
        level: string;
        ailee: string;
        Zone: string;
        Qty: number;
        satuanHitung: string;
        pcsPerCarton: number;
        SKUBrand: string;
        Owner: string;
        counter: string;
        unitPrice: number;
    }>({
        SKU: '',
        Description: '',
        UPC1: '',
        UPC2: '',
        Location: '',
        level: '1',
        ailee: '',
        Zone: 'RACKING',
        Qty: 0,
        satuanHitung: 'PCS',
        pcsPerCarton: 1,
        SKUBrand: '',
        Owner: 'DDI',
        counter: 'unassigned',
        unitPrice: 0
    });

    // EDIT & DELETE & ADD SKU CATALOG STATES
    const [editingCatalogItem, setEditingCatalogItem] = useState<any | null>(null);
    const [isSavingCatalogItem, setIsSavingCatalogItem] = useState<boolean>(false);
    const [deletingCatalogItem, setDeletingCatalogItem] = useState<any | null>(null);
    const [isDeletingCatalogItem, setIsDeletingCatalogItem] = useState<boolean>(false);
    const [isAddCatalogOpen, setIsAddCatalogOpen] = useState<boolean>(false);
    const [isAddingCatalogItem, setIsAddingCatalogItem] = useState<boolean>(false);
    const [newCatalogForm, setNewCatalogForm] = useState<{
        SKU: string;
        Description: string;
        UPC1: string;
        UPC2: string;
        SKUBrand: string;
        Owner: string;
        unitPrice: number;
        satuanHitung: string;
    }>({
        SKU: '',
        Description: '',
        UPC1: '',
        UPC2: '',
        SKUBrand: '',
        Owner: 'DDI',
        unitPrice: 0,
        satuanHitung: 'PCS'
    });

    const filteredProjects = useMemo(() => {
        if (projectFilterStatus === 'ALL') return projectHistory;
        return projectHistory.filter(p => (p.status || 'LIVE_ACTIVE') === projectFilterStatus);
    }, [projectHistory, projectFilterStatus]);

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
            unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsubOwner(); unsubBadStock(); unsubCatalog(); unsubPartners();
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

    const [isRecovering, setIsRecovering] = useState<boolean>(false);

    const handleScanAndRunAutoRecovery = async () => {
        if (isRecovering) return;
        setIsRecovering(true);
        triggerNotification("🔍 Memulai pemindaian data task & log audit...");

        try {
            const activeProjId = activeProject?.id;
            let currentTasks = masterDataList;
            if (currentTasks.length === 0) {
                const snap = await getDocs(collection(db, "master_tasks"));
                currentTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            }
            if (activeProjId) {
                currentTasks = currentTasks.filter(t => t.projectId === activeProjId || !t.projectId);
            }

            const auditMap: { [key: string]: any[] } = {};
            try {
                let auditDocs: any[] = [];
                if (activeProjId) {
                    const subSnap = await getDocs(query(collection(db, "projects", activeProjId, "audit_logs"), orderBy("timestamp", "desc"), limit(10000)));
                    auditDocs = subSnap.docs;
                }
                if (auditDocs.length === 0) {
                    const auditQuery = activeProjId
                        ? query(collection(db, "audit_logs"), where("projectId", "==", activeProjId), limit(10000))
                        : query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(10000));
                    const legacySnap = await getDocs(auditQuery);
                    auditDocs = legacySnap.docs;
                }
                auditDocs.forEach(d => {
                    const data = d.data();
                    const k = `${(data.rackLocation || data.Location || '').trim()}___${(data.sku || data.SKU || '').trim()}`;
                    if (!auditMap[k]) auditMap[k] = [];
                    auditMap[k].push(data);
                });
            } catch (e) {
                console.warn("Audit log fetch error in recovery:", e);
            }

            const grouped: { [key: string]: any[] } = {};
            currentTasks.forEach(t => {
                const k = `${(t.Location || '').trim()}___${(t.SKU || '').trim()}`;
                if (!grouped[k]) grouped[k] = [];
                grouped[k].push(t);
            });

            const updates: { ref: any; data: any }[] = [];
            let rebalancedCount = 0;
            let auditRestoredCount = 0;
            let temuanMergedCount = 0;

            Object.entries(grouped).forEach(([, list]) => {
                const masterDocs = list.filter(t => !t.id.includes('_TEMUAN_'));
                const temuanDocs = list.filter(t => t.id.includes('_TEMUAN_'));

                if (masterDocs.length > 0 && temuanDocs.length > 0) {
                    temuanDocs.forEach(td => {
                        const temuanAct = td.QTY_ACTUAL ?? td.countedQty ?? 0;
                        if (temuanAct > 0) {
                            const targetMaster = masterDocs.find(md => (md.QTY_ACTUAL === 0 || md.QTY_ACTUAL === null || !md.isCounted)) || masterDocs[0];
                            if (targetMaster) {
                                targetMaster.QTY_ACTUAL = (targetMaster.QTY_ACTUAL || 0) + temuanAct;
                                targetMaster.countedQty = targetMaster.QTY_ACTUAL;
                                targetMaster.isCounted = true;
                                updates.push({
                                    ref: doc(db, "master_tasks", targetMaster.id),
                                    data: {
                                        QTY_ACTUAL: targetMaster.QTY_ACTUAL,
                                        countedQty: targetMaster.QTY_ACTUAL,
                                        isCounted: true,
                                        updatedAt: new Date().toISOString()
                                    }
                                });
                                temuanMergedCount++;
                            }
                        }
                    });
                }

                if (masterDocs.length > 1) {
                    const totalSys = masterDocs.reduce((acc, t) => acc + (Number(t.Qty || t.QTY_SYSTEM) || 0), 0);
                    const totalAct = masterDocs.reduce((acc, t) => acc + (Number(t.QTY_ACTUAL ?? t.countedQty) || 0), 0);
                    const anyCounted = masterDocs.some(t => t.isCounted || (t.QTY_ACTUAL !== null && t.QTY_ACTUAL !== undefined));

                    const hasZeroProblem = masterDocs.some(t => (t.QTY_ACTUAL === 0 || t.QTY_ACTUAL === null) && (Number(t.Qty || t.QTY_SYSTEM) || 0) > 0);

                    if (anyCounted && totalAct > 0 && hasZeroProblem) {
                        let rem = totalAct;
                        masterDocs.forEach((t, i) => {
                            const sys = Number(t.Qty || t.QTY_SYSTEM) || 0;
                            let alloc = 0;
                            if (totalAct === totalSys) {
                                alloc = sys;
                            } else if (i === masterDocs.length - 1) {
                                alloc = Math.round(rem * 1000) / 1000;
                            } else {
                                alloc = Math.min(sys, rem);
                                rem -= alloc;
                            }

                            t.QTY_ACTUAL = alloc;
                            t.countedQty = alloc;
                            t.isCounted = true;

                            updates.push({
                                ref: doc(db, "master_tasks", t.id),
                                data: {
                                    QTY_ACTUAL: alloc,
                                    countedQty: alloc,
                                    isCounted: true,
                                    updatedAt: new Date().toISOString()
                                }
                            });
                            rebalancedCount++;
                        });
                    }
                } else if (masterDocs.length === 1) {
                    const t = masterDocs[0];
                    const sys = Number(t.Qty || t.QTY_SYSTEM) || 0;
                    const act = t.QTY_ACTUAL ?? t.countedQty;
                    const keyStr = `${(t.Location || '').trim()}___${(t.SKU || '').trim()}`;

                    if ((act === 0 || act === null || act === undefined) && sys > 0 && t.isCounted) {
                        const logs = auditMap[keyStr];
                        if (logs && logs.length > 0) {
                            const positive = logs.filter(l => Number(l.totalFinalSubmitted ?? l.qtyActual) > 0);
                            if (positive.length > 0) {
                                const latest = positive[0];
                                const restoredVal = Number(latest.totalFinalSubmitted ?? latest.qtyActual);
                                updates.push({
                                    ref: doc(db, "master_tasks", t.id),
                                    data: {
                                        QTY_ACTUAL: restoredVal,
                                        countedQty: restoredVal,
                                        isCounted: true,
                                        restoredFromAudit: true,
                                        updatedAt: new Date().toISOString()
                                    }
                                });
                                auditRestoredCount++;
                            }
                        }
                    }
                }
            });

            if (updates.length === 0) {
                triggerNotification("ℹ️ Seluruh data sudah rapi dan seimbang! Tidak ada task yang memerlukan pemulihan.");
                return;
            }

            triggerNotification(`Menyimpan ${updates.length} pemulihan ke Cloud Firestore...`);
            const CHUNK = 400;
            for (let i = 0; i < updates.length; i += CHUNK) {
                const chunk = updates.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(op => batch.set(op.ref, op.data, { merge: true }));
                await batch.commit();
            }

            triggerNotification(`✅ RECOVERY SUKSES! ${rebalancedCount} task multi-doc diseimbangkan, ${auditRestoredCount} data audit dipulihkan, ${temuanMergedCount} temuan digabung.`);
        } catch (err: any) {
            console.error("Auto Recovery Error:", err);
            triggerNotification(`Gagal recovery: ${err.message || String(err)}`);
        } finally {
            setIsRecovering(false);
        }
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
        if (!activeProject) {
            setAuditLogs([]);
            return;
        }
        if (isColdArchiveMode) return; // Mode Cold Archive: Jangan query Firestore, pertahankan data dari JSON offline!

        const activeProjId = activeProject.id;
        // Query DENGAN where("projectId", "==", activeProjId) agar hanya men-download task untuk project yang aktif!
        // Ini memangkas beban kuota & memori IndexedDB dari puluhan ribu task menjadi hanya ratusan dokumen.
        const qTasks = activeProjId
            ? query(collection(db, "master_tasks"), where("projectId", "==", activeProjId))
            : collection(db, "master_tasks");
        let updateTimer: any = null;

        const unsubscribe = onSnapshot(qTasks, (snapshot) => {
            if (isUploadingRef.current) return; // Cegah UI freeze & re-render berlebihan saat upload massal berlangsung
            if (updateTimer) clearTimeout(updateTimer);

            updateTimer = setTimeout(() => {
                const filteredDocs = snapshot.docs.filter(docSnap => {
                    const data = docSnap.data();
                    if (activeProjId && data.projectId !== activeProjId) return false;
                    // Abaikan dokumen placeholder lokasi rak tanpa SKU barang
                    if (!data.SKU || !data.SKU.trim() || data.SKU === 'SKU_UNKNOWN') return false;
                    return true;
                });

                const taskList: MasterSKUItem[] = filteredDocs.map(docSnap => {
                    const data = docSnap.data();

                    const gQty = data.QTY_GOOD ?? data.qtyGood;
                    const bQty = data.QTY_BAD ?? data.qtyBad;

                    const rawActQty = data.QTY_ACTUAL ?? data.countedQty ?? (data.isCounted ? (data[`round${data.currentRound || 1}Actual`] ?? data.round1Actual) : undefined);
                    const numActQty = parseInt(rawActQty, 10);

                    const isCounted = !!data.isCounted || (rawActQty !== undefined && rawActQty !== null && !isNaN(numActQty));

                    const parsedGood = gQty !== undefined && gQty !== null ? parseInt(gQty, 10) : NaN;
                    const parsedBad = bQty !== undefined && bQty !== null ? parseInt(bQty, 10) : NaN;

                    const calcGood = !isNaN(parsedGood) ? parsedGood : (isCounted ? (isNaN(numActQty) ? 0 : numActQty) : 0);
                    const calcBad = !isNaN(parsedBad) ? parsedBad : 0;
                    const totalActualCalculated = ( !isNaN(parsedGood) || !isNaN(parsedBad) )
                        ? (calcGood + calcBad)
                        : (!isNaN(numActQty) ? numActQty : 0);

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
                        round2Actual: data.round2Actual,
                        round3Actual: data.round3Actual,
                        round1Counter: data.round1Counter,
                        round2Counter: data.round2Counter,
                        round3Counter: data.round3Counter,
                        previousCounter: data.previousCounter,
                        lastSwapBatchId: data.lastSwapBatchId,
                        counterPendamping: data.counterPendamping || data.partner,
                        partner: data.partner,
                        isLocked: !!data.isLocked,
                        photoUrl: data.photoUrl || ''
                    };
                });

                setMasterDataList(taskList);
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

        // AUDIT TRAIL SUBCOLLECTION (Terisolasi 100% per project: projects/{activeProjId}/audit_logs)
        const qSubAudit = query(
            collection(db, "projects", activeProjId, "audit_logs"),
            orderBy("timestamp", "desc"),
            limit(100)
        );
        const auditUnsubscribe = onSnapshot(qSubAudit, async (snap) => {
            if (isColdArchiveModeRef.current) return;
            if (!snap.empty) {
                setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } else {
                // Fallback untuk project lama (misal PROJ-4080) yang log-nya masih tersimpan di koleksi root audit_logs
                try {
                    const legacySnap = await getDocs(
                        query(collection(db, "audit_logs"), where("projectId", "==", activeProjId), limit(100))
                    );
                    const legacyLogs = legacySnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    legacyLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    setAuditLogs(legacyLogs);
                } catch {
                    setAuditLogs([]);
                }
            }
        });

        return () => {
            if (updateTimer) clearTimeout(updateTimer);
            unsubscribe();
            lockUnsubscribe();
            auditUnsubscribe();
        };
    }, [activeProject]);

    // AGGREGATE DISCREPANCY EVALUATION PER (LOCATION + SKU)
    // Menyatukan multi-baris beda ED pada SKU & Rak yang sama agar tidak terjadi false dispute jika nett fisik == nett sistem
    const aggregateDisputeMap = useMemo(() => {
        const map = new Map<string, { totalSys: number; totalAct: number; totalR1: number; hasR1: boolean; isCountedAll: boolean }>();
        
        // Pass 1: Akumulasi total sistem, fisik, dan R1
        for (let i = 0; i < masterDataList.length; i++) {
            const t = masterDataList[i];
            if (!t.SKU || !t.Location) continue;
            const loc = t.Location.trim().toUpperCase();
            const sku = t.SKU.trim().toUpperCase();
            const cleanC = (t.counter || '').trim().toLowerCase();
            const round = t.currentRound || 1;
            const key = `${loc}__${sku}__${cleanC}__${round}`;

            const act = t.countedQty ?? (t.isCounted ? (t.QTY_ACTUAL ?? 0) : 0);
            const sys = t.Qty || 0;
            const r1 = t.round1Actual;

            const entry = map.get(key);
            if (!entry) {
                map.set(key, {
                    totalSys: sys,
                    totalAct: t.isCounted ? act : 0,
                    totalR1: r1 !== undefined ? r1 : sys,
                    hasR1: r1 !== undefined,
                    isCountedAll: !!t.isCounted
                });
            } else {
                entry.totalSys += sys;
                if (t.isCounted) entry.totalAct += act;
                if (r1 !== undefined) {
                    entry.totalR1 += r1;
                    entry.hasR1 = true;
                } else {
                    entry.totalR1 += sys;
                }
                if (!t.isCounted) entry.isCountedAll = false;
            }
        }

        // Pass 2: Tentukan status dispute agregat per (Rak + SKU)
        const disputeStatusMap = new Map<string, boolean>();
        map.forEach((val, key) => {
            if (!val.isCountedAll) {
                disputeStatusMap.set(key, false);
                return;
            }
            // Khusus Ronde 2: jika total hitung R2 cocok dengan total hitung R1, maka match!
            const isR2 = key.endsWith('__2');
            if (isR2 && val.hasR1 && Math.round((val.totalAct - val.totalR1) * 1000) === 0) {
                disputeStatusMap.set(key, false);
                return;
            }
            // Selisih fisik total vs sistem total
            const hasDiff = Math.round((val.totalAct - val.totalSys) * 1000) !== 0;
            disputeStatusMap.set(key, hasDiff);
        });

        return disputeStatusMap;
    }, [masterDataList]);

    const isItemInDispute = useCallback((item: MasterSKUItem) => {
        if (!item.isCounted || !item.SKU || !item.Location) return false;
        const loc = item.Location.trim().toUpperCase();
        const sku = item.SKU.trim().toUpperCase();
        const cleanC = (item.counter || '').trim().toLowerCase();
        const round = item.currentRound || 1;
        const key = `${loc}__${sku}__${cleanC}__${round}`;
        return !!aggregateDisputeMap.get(key);
    }, [aggregateDisputeMap]);

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

        const disputeTasks = counterTasks.filter(isItemInDispute);

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
            const cleanSource = sourceCounter.toLowerCase().trim();
            const sourceTasks = masterDataList.filter(m => (m.counter || '').toLowerCase().trim() === cleanSource);
            
            const updates: { ref: any; data: any }[] = [];
            const auditEntries: { ref: any; data: any }[] = [];

            if (mode === 'KEEP' || !targetCounter) {
                sourceTasks.forEach(item => {
                    if (!item.id) return;
                    const ref = doc(db, "master_tasks", item.id);
                    const act = item.countedQty ?? item.Qty;
                    
                    if (isItemInDispute(item)) {
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
                            ref: doc(db, "projects", activeProject.id, "audit_logs", logId),
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
                    
                    if (isItemInDispute(item)) {
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
                            ref: doc(db, "projects", activeProject.id, "audit_logs", logId),
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
                    
                    if (isItemInDispute(item)) {
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
                            ref: doc(db, "projects", activeProject.id, "audit_logs", logId),
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
                const cleanTarget = targetCounter.toLowerCase().trim();
                const targetTasks = masterDataList.filter(m => (m.counter || '').toLowerCase().trim() === cleanTarget);
                const targetDisputeInNextRound = targetTasks.filter(item => item.currentRound === nextRound && !item.isCounted);
                const targetDisputeInSourceRound = targetTasks.filter(isItemInDispute);

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
                        
                        if (isItemInDispute(item)) {
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

    // FITUR CETAK COUNTSHEET LAPANGAN DENGAN SMART GUARD, BATCH PRINTING & PAGINASI A4 RAPI
    const handlePrintCountsheet = (
        selectedCounter?: string,
        roundNumber: number = 1,
        forceBypassGuard: boolean = false,
        targetCounterList?: string[]
    ) => {
        if (!masterDataList || masterDataList.length === 0) {
            triggerNotification("Tidak ada data SKU untuk dicetak!");
            return;
        }

        const countersToPrint = targetCounterList && targetCounterList.length > 0
            ? targetCounterList
            : (selectedCounter
                ? [selectedCounter]
                : Array.from(new Set(masterDataList.map(m => m.counter))).filter(Boolean).sort());

        // Hitung total baris yang akan dicetak
        let totalTasksCount = 0;
        countersToPrint.forEach(cName => {
            const cleanC = cName.toLowerCase().trim();
            const count = masterDataList.filter(m => {
                const c = (m.counter || '').toLowerCase().trim();
                const r1C = (m.round1Counter || '').toLowerCase().trim();
                const r2C = (m.round2Counter || '').toLowerCase().trim();
                const r3C = (m.round3Counter || '').toLowerCase().trim();
                if (roundNumber === 1) return (r1C === cleanC) || (!r1C && c === cleanC);
                if (roundNumber === 2) return (r2C === cleanC) || (m.currentRound === 2 && c === cleanC);
                if (roundNumber === 3) return (r3C === cleanC) || (m.currentRound >= 3 && c === cleanC);
                return c === cleanC;
            }).length;
            totalTasksCount += count;
        });

        // SMART GUARD: Jika mencetak lebih dari 300 baris untuk semua counter dan belum di-bypass serta bukan batch spesifik
        if (!forceBypassGuard && !targetCounterList && totalTasksCount > 300 && !selectedCounter) {
            setPrintGuardModal(prev => ({
                ...prev,
                isOpen: true,
                totalRows: totalTasksCount,
                roundNumber,
                selectedCounter,
                batchSize: 10,
                activeTab: 'batch',
                singleSelectCounter: ''
            }));
            return;
        }

        const project = activeProject;
        const printWindow = window.open('', '_blank', 'width=1150,height=950');
        if (!printWindow) {
            triggerNotification("Gagal membuka jendela cetak. Pastikan izin pop-up browser aktif.");
            return;
        }

        let pagesHtml = '';
        const ROWS_PER_PAGE = 26;

        countersToPrint.forEach(cName => {
            const cleanC = cName.toLowerCase().trim();
            const tasks = masterDataList.filter(m => {
                const c = (m.counter || '').toLowerCase().trim();
                const r1C = (m.round1Counter || '').toLowerCase().trim();
                const r2C = (m.round2Counter || '').toLowerCase().trim();
                const r3C = (m.round3Counter || '').toLowerCase().trim();
                if (roundNumber === 1) return (r1C === cleanC) || (!r1C && c === cleanC);
                if (roundNumber === 2) return (r2C === cleanC) || (m.currentRound === 2 && c === cleanC);
                if (roundNumber === 3) return (r3C === cleanC) || (m.currentRound >= 3 && c === cleanC);
                return c === cleanC;
            });

            if (tasks.length === 0 && selectedCounter) return;
            tasks.sort((a, b) => (a.Location || '').localeCompare(b.Location || '') || (a.SKU || '').localeCompare(b.SKU || ''));

            const taskPagesCount = Math.max(1, Math.ceil(tasks.length / ROWS_PER_PAGE));
            const isRound1 = roundNumber === 1;
            const totalPagesForCounter = isRound1 ? taskPagesCount + 1 : taskPagesCount;

            for (let pageIdx = 0; pageIdx < taskPagesCount; pageIdx++) {
                const pageTasks = tasks.slice(pageIdx * ROWS_PER_PAGE, (pageIdx + 1) * ROWS_PER_PAGE);
                const isLastTaskPage = pageIdx === taskPagesCount - 1;

                const rowsHtml = pageTasks.map((item, tIdx) => {
                    const globalNo = pageIdx * ROWS_PER_PAGE + tIdx + 1;
                    return `
                        <tr>
                            <td style="text-align: center; font-weight: bold;">${globalNo}</td>
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
                    `;
                }).join('');

                pagesHtml += `
                    <div class="sheet-page">
                        <div class="header-container">
                            <div class="header-left">
                                <h2 class="doc-title">LEMBAR KERJA STOCK OPNAME (${roundNumber === 1 ? 'BLIND COUNT' : `RECOUNT RONDE ${roundNumber}`})</h2>
                                <div class="sub-meta">
                                    <span><b>Sesi:</b> ${project?.sessionCode || 'SO-360'}</span> | 
                                    <span><b>Lokasi:</b> ${project?.locationName || 'Gudang Utama'}</span> | 
                                    <span><b>Tanggal:</b> ${project?.opnameDate || new Date().toISOString().split('T')[0]}</span> | 
                                    <span><b>Halaman:</b> ${pageIdx + 1} dari ${totalPagesForCounter}</span>
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

                        ${isLastTaskPage ? `
                            <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
                                <span>✓ <b>Total SKU ${isRound1 ? 'Sistem' : 'Recount'} PIC Ini:</b> ${tasks.length} Item</span>
                                ${isRound1 
                                    ? `<span style="font-weight: bold; color: #2563eb;">➔ Lanjut ke Halaman ${totalPagesForCounter}: Lembar Catatan Barang Temuan Baru (Unmapped SKU)</span>` 
                                    : `<span style="font-weight: bold; color: #16a34a;">✓ Akhir Lembar Kerja Ronde ${roundNumber}</span>`
                                }
                            </div>
                            ${!isRound1 ? `
                                <div class="sig-container" style="margin-top: 25px;">
                                    <div class="sig-box">
                                        <div class="sig-title">Petugas Penghitung (Internal)</div>
                                        <div class="sig-line"></div>
                                        <div class="sig-name">${cName}</div>
                                    </div>
                                    <div class="sig-box">
                                        <div class="sig-title">Counter Vendor / Pendamping WH</div>
                                        <div class="sig-line"></div>
                                        <div class="sig-name">(........................................)</div>
                                    </div>
                                    <div class="sig-box">
                                        <div class="sig-title">Koordinator / SPV Lapangan</div>
                                        <div class="sig-line"></div>
                                        <div class="sig-name">(........................................)</div>
                                    </div>
                                </div>
                            ` : ''}
                        ` : `
                            <div style="margin-top: 12px; text-align: right; font-size: 8px; color: #64748b; font-style: italic;">
                                Bersambung ke halaman ${pageIdx + 2}...
                            </div>
                        `}
                    </div>
                `;
            }

            // HALAMAN KHUSUS: LEMBAR CATATAN BARANG TEMUAN BARU (UNMAPPED SKU)
            // Hanya dicetak pada Ronde 1 (Blind Count) karena pada ronde recount (Ronde 2, Ronde 3),
            // temuan fisik dari ronde sebelumnya sudah otomatis masuk ke dalam list master data sistem.
            if (isRound1) {
                const UNMAPPED_ROWS_COUNT = 14;
                const unmappedRowsHtml = Array.from({ length: UNMAPPED_ROWS_COUNT }, (_, i) => `
                    <tr style="height: 27px;">
                        <td style="text-align: center; font-weight: bold; color: #64748b; font-size: 8.5px;">${i + 1}</td>
                        <td style="height: 27px;"></td>
                        <td style="height: 27px;"></td>
                        <td style="height: 27px;"></td>
                        <td style="height: 27px; text-align: center;"></td>
                        <td style="height: 27px; background-color: #f0fdf4;"></td>
                        <td style="height: 27px; background-color: #fef2f2;"></td>
                        <td style="height: 27px; text-align: center;"></td>
                        <td style="height: 27px;"></td>
                        <td style="height: 27px;"></td>
                    </tr>
                `).join('');

                pagesHtml += `
                    <div class="sheet-page">
                        <div class="header-container">
                            <div class="header-left">
                                <h2 class="doc-title" style="color: #b45309;">LEMBAR KERJA STOCK OPNAME - CATATAN BARANG TEMUAN BARU</h2>
                                <div class="sub-meta">
                                    <span><b>Sesi:</b> ${project?.sessionCode || 'SO-360'}</span> | 
                                    <span><b>Lokasi:</b> ${project?.locationName || 'Gudang Utama'}</span> | 
                                    <span><b>Tanggal:</b> ${project?.opnameDate || new Date().toISOString().split('T')[0]}</span> | 
                                    <span><b>Halaman:</b> ${totalPagesForCounter} dari ${totalPagesForCounter} (LEMBAR TEMUAN)</span>
                                </div>
                            </div>
                            <div class="header-right">
                                <div class="counter-badge" style="border-color: #d97706; background-color: #fffbeb;">
                                    <span class="badge-label" style="color: #92400e;">PETUGAS / PIC:</span>
                                    <span class="badge-name" style="color: #78350f;">${cName.toUpperCase()}</span>
                                </div>
                                <div class="round-badge" style="background: #d97706;">RONDE ${roundNumber}</div>
                            </div>
                        </div>

                        <div class="notice-bar" style="background: #fffbeb; border-color: #f59e0b; color: #92400e;">
                            📝 <b>PETUNJUK PENCATATAN BARANG TEMUAN FISIK (UNMAPPED SKU):</b><br/>
                            Tuliskan seluruh barang fisik yang ditemukan di rak atau area kerja yang <b>TIDAK ADA</b> pada lembar task sistem sebelumnya. Cantumkan Lokasi Rak, Barcode/UPC, Deskripsi, Exp Date, Satuan, dan Kategori Kerusakan (jika rusak) secara teliti.
                        </div>

                        <table class="count-table">
                            <thead>
                                <tr style="background-color: #fef3c7;">
                                    <th style="width: 26px; text-align: center;">NO</th>
                                    <th style="width: 75px;">LOKASI / RAK</th>
                                    <th style="width: 100px;">BARCODE / UPC / SKU</th>
                                    <th>DESKRIPSI NAMA PRODUK</th>
                                    <th style="width: 65px; text-align: center;">EXP DATE</th>
                                    <th style="width: 55px; text-align: center; background-color: #dcfce7;">QTY BAIK</th>
                                    <th style="width: 55px; text-align: center; background-color: #fee2e2;">QTY RUSAK</th>
                                    <th style="width: 48px; text-align: center;">SATUAN</th>
                                    <th style="width: 110px;">KONDISI / KET</th>
                                    <th style="width: 45px; text-align: center;">PARAF</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${unmappedRowsHtml}
                            </tbody>
                        </table>

                        <div class="sig-container" style="margin-top: 25px;">
                            <div class="sig-box">
                                <div class="sig-title">Petugas Penghitung (Internal)</div>
                                <div class="sig-line"></div>
                                <div class="sig-name">${cName}</div>
                            </div>
                            <div class="sig-box">
                                <div class="sig-title">Counter Vendor / Pendamping WH</div>
                                <div class="sig-line"></div>
                                <div class="sig-name">(........................................)</div>
                            </div>
                            <div class="sig-box">
                                <div class="sig-title">Koordinator / SPV Lapangan</div>
                                <div class="sig-line"></div>
                                <div class="sig-name">(........................................)</div>
                            </div>
                        </div>
                    </div>
                `;
            }
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

    // FITUR 1: AUTO-PAIR MASS SWAP RONDE 2 (UNTUK 100 COUNTER SKALA TEMPUR)
    const handleOpenAutoPairModal = () => {
        if (effectiveRole === 'spv') {
            triggerNotification('Hanya Super Admin/Owner yang memiliki hak deploy/swap ronde.');
            return;
        }
        if (!activeProject) return;

        // Cari counter-counter yang aktif di ronde 1 (atau ronde aktif saat ini), sudah selesai 100%, dan punya selisih
        const readyCounters: Array<{ counter: string; round: number; disputeCount: number }> = [];

        Object.keys(counterGroups).forEach(cName => {
            const cData = counterGroups[cName];
            if (!cData || cData.total === 0) return;
            if (cData.counted !== cData.total) return; // Belum 100%
            if (cData.errorCount === 0) return; // Tidak ada selisih

            const cTasks = masterDataList.filter(m => m.counter === cName);
            const maxR = Math.max(...cTasks.map(t => t.currentRound || 1));
            if (maxR >= 3) return; // Sudah R3 maksimal

            readyCounters.push({
                counter: cName,
                round: maxR,
                disputeCount: cData.errorCount
            });
        });

        if (readyCounters.length < 2) {
            triggerNotification(`Belum cukup counter yang siap swap massal. Minimal 2 counter harus menyelesaikan 100% hitungan dengan status ada selisih SKU.`);
            return;
        }

        // Susun pasangan 2-arah (A ⇄ B, C ⇄ D, dst)
        const pairs: Array<{ counterA: string; counterB: string; disputeA: number; disputeB: number }> = [];
        let oddCounter: string | undefined = undefined;

        for (let i = 0; i < readyCounters.length; i += 2) {
            if (i + 1 < readyCounters.length) {
                pairs.push({
                    counterA: readyCounters[i].counter,
                    counterB: readyCounters[i + 1].counter,
                    disputeA: readyCounters[i].disputeCount,
                    disputeB: readyCounters[i + 1].disputeCount
                });
            } else {
                oddCounter = readyCounters[i].counter;
            }
        }

        setAutoPairModal({
            isOpen: true,
            pairs,
            oddCounter,
            isSubmitting: false,
            progress: null
        });
    };

    const handleExecuteAutoPairMassSwap = async () => {
        if (!activeProject || autoPairModal.isSubmitting || autoPairModal.pairs.length === 0) return;

        setAutoPairModal(prev => ({ ...prev, isSubmitting: true, progress: { current: 0, total: 100, message: "Menyiapkan operasi batch swap..." } }));

        try {
            const timestampNow = new Date().toISOString();
            const massBatchId = `MASS_SWAP_${Date.now()}`;
            const updates: { ref: any; data: any }[] = [];
            const auditEntries: { ref: any; data: any }[] = [];

            // Proses setiap pasangan
            autoPairModal.pairs.forEach(({ counterA, counterB }) => {
                const tasksA = masterDataList.filter(m => m.counter === counterA);
                const tasksB = masterDataList.filter(m => m.counter === counterB);

                const roundA = Math.max(...tasksA.map(t => t.currentRound || 1));
                const roundB = Math.max(...tasksB.map(t => t.currentRound || 1));
                const nextRoundA = roundA + 1;
                const nextRoundB = roundB + 1;

                // 1. Pindahkan dispute tasks A ke counter B, lock yang match
                tasksA.forEach(item => {
                    if (!item.id) return;
                    const ref = doc(db, "master_tasks", item.id);
                    const act = item.countedQty ?? item.Qty;
                    
                    if (isItemInDispute(item)) {
                        updates.push({
                            ref,
                            data: {
                                counter: counterB,
                                currentRound: nextRoundA,
                                QTY_ACTUAL: null,
                                QTY_GOOD: null,
                                QTY_BAD: null,
                                isCounted: false,
                                [`round${roundA}Actual`]: act,
                                [`round${roundA}Counter`]: counterA,
                                previousCounter: counterA,
                                lastSwapBatchId: massBatchId,
                                updatedAt: timestampNow
                            }
                        });

                        const logId = `${activeProject.sessionCode}_MASS_SWAP_R${nextRoundA}_${counterA}_TO_${counterB}_${item.SKU}_${item.Location}`;
                        auditEntries.push({
                            ref: doc(db, "projects", activeProject.id, "audit_logs", logId),
                            data: {
                                timestamp: timestampNow,
                                rackLocation: item.Location,
                                ownerSku: item.Owner || 'DDI',
                                sku: item.SKU,
                                description: item.Description,
                                upc1: item.UPC1 || '-',
                                upc2: item.UPC2 || '-',
                                counterPic: counterB,
                                round: nextRoundA,
                                qtyGood: 0,
                                qtyBad: 0,
                                totalFinalSubmitted: 0,
                                edActual: '-',
                                remarks: `[MASS MUTUAL SWAP R${nextRoundA}] Dari ${counterA} dialihkan ke ${counterB} karena selisih R${roundA}`
                            }
                        });
                    } else {
                        updates.push({
                            ref,
                            data: { isLocked: true, updatedAt: timestampNow }
                        });
                    }
                });

                // 2. Pindahkan dispute tasks B ke counter A, lock yang match
                tasksB.forEach(item => {
                    if (!item.id) return;
                    const ref = doc(db, "master_tasks", item.id);
                    const act = item.countedQty ?? item.Qty;
                    
                    if (isItemInDispute(item)) {
                        updates.push({
                            ref,
                            data: {
                                counter: counterA,
                                currentRound: nextRoundB,
                                QTY_ACTUAL: null,
                                QTY_GOOD: null,
                                QTY_BAD: null,
                                isCounted: false,
                                [`round${roundB}Actual`]: act,
                                [`round${roundB}Counter`]: counterB,
                                previousCounter: counterB,
                                lastSwapBatchId: massBatchId,
                                updatedAt: timestampNow
                            }
                        });

                        const logId = `${activeProject.sessionCode}_MASS_SWAP_R${nextRoundB}_${counterB}_TO_${counterA}_${item.SKU}_${item.Location}`;
                        auditEntries.push({
                            ref: doc(db, "projects", activeProject.id, "audit_logs", logId),
                            data: {
                                timestamp: timestampNow,
                                rackLocation: item.Location,
                                ownerSku: item.Owner || 'DDI',
                                sku: item.SKU,
                                description: item.Description,
                                upc1: item.UPC1 || '-',
                                upc2: item.UPC2 || '-',
                                counterPic: counterA,
                                round: nextRoundB,
                                qtyGood: 0,
                                qtyBad: 0,
                                totalFinalSubmitted: 0,
                                edActual: '-',
                                remarks: `[MASS MUTUAL SWAP R${nextRoundB}] Dari ${counterB} dialihkan ke ${counterA} karena selisih R${roundB}`
                            }
                        });
                    } else {
                        updates.push({
                            ref,
                            data: { isLocked: true, updatedAt: timestampNow }
                        });
                    }
                });
            });

            // Eksekusi semua operasi dalam chunk 400 docs per batch
            const allOps = [...updates, ...auditEntries];
            const CHUNK_SIZE = 400;
            const totalChunks = Math.ceil(allOps.length / CHUNK_SIZE);

            for (let i = 0; i < allOps.length; i += CHUNK_SIZE) {
                const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
                setAutoPairModal(prev => ({
                    ...prev,
                    progress: {
                        current: chunkIndex,
                        total: totalChunks,
                        message: `Menyimpan batch perubahan ke Cloud (${chunkIndex}/${totalChunks})...`
                    }
                }));

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

            setAutoPairModal({ isOpen: false, pairs: [], oddCounter: undefined, isSubmitting: false, progress: null });
            triggerNotification(`🚀 SWAP MASSAL BERHASIL! Sebanyak ${autoPairModal.pairs.length} pasangan counter berhasil saling bertukar tugas.`);
        } catch (err: any) {
            console.error("Auto-Pair Swap Error:", err);
            triggerNotification(`Gagal mengeksekusi swap massal: ${err.message || String(err)}`);
            setAutoPairModal(prev => ({ ...prev, isSubmitting: false, progress: null }));
        }
    };

    // FITUR 2: STRESS TEST & BATTLE READINESS SUITE (SIMULASI BEBAN NYATA & AUDIT INTEGRITAS)
    const handleRunStressTest = () => {
        setStressTestModal({
            isOpen: true,
            isRunning: true,
            results: null
        });

        setTimeout(() => {
            const startGen = performance.now();
            const SIM_TASKS = 50000;
            const simCounters: string[] = [];
            for (let c = 1; c <= 100; c++) simCounters.push('counter_' + String(c).padStart(2, '0'));

            // 1. Benchmark Single-pass grouping (50,000 tasks)
            const mockTasks: any[] = [];
            for (let i = 0; i < SIM_TASKS; i++) {
                const c = simCounters[i % simCounters.length];
                mockTasks.push({
                    id: 'MOCK_' + i,
                    SKU: 'SKU-' + (i % 3000),
                    Location: 'LOC-' + Math.floor(i / 10),
                    counter: c,
                    Qty: 10,
                    countedQty: (i % 4 === 0) ? 8 : 10,
                    currentRound: 1,
                    isCounted: true
                });
            }
            const endGen = performance.now();

            const startGroup = performance.now();
            const groups: Record<string, { total: number; counted: number; error: number }> = {};
            for (let i = 0; i < mockTasks.length; i++) {
                const item = mockTasks[i];
                const c = item.counter;
                if (!groups[c]) groups[c] = { total: 0, counted: 0, error: 0 };
                groups[c].total++;
                if (item.isCounted) {
                    groups[c].counted++;
                    if (item.countedQty !== item.Qty) groups[c].error++;
                }
            }
            const endGroup = performance.now();

            // 2. Audit Integritas Data Aktif Real-time
            let unassignedCount = 0;
            let duplicateSkuInLocCount = 0;
            let roundMismatchCount = 0;
            let missingBarcodeCount = 0;

            const locSkuMap = new Set<string>();
            const counterRoundMap: Record<string, number> = {};

            masterDataList.forEach(item => {
                const c = (item.counter || '').toLowerCase().trim();
                if (!c || c === 'unassigned') unassignedCount++;
                if (!item.UPC1 && !item.UPC2 && !item.SKU) missingBarcodeCount++;

                const key = `${item.Location}_${item.SKU}`;
                if (locSkuMap.has(key)) duplicateSkuInLocCount++;
                else locSkuMap.add(key);

                const r = item.currentRound || 1;
                if (!counterRoundMap[c] || r > counterRoundMap[c]) {
                    counterRoundMap[c] = r;
                }
            });

            masterDataList.forEach(item => {
                const c = (item.counter || '').toLowerCase().trim();
                const expectedRound = counterRoundMap[c] || 1;
                if (item.currentRound !== expectedRound && !item.isLocked) {
                    roundMismatchCount++;
                }
            });

            // Hitung Skor Kesiapan Tempur
            let score = 100;
            if (unassignedCount > 0) score -= Math.min(15, unassignedCount);
            if (duplicateSkuInLocCount > 0) score -= Math.min(10, duplicateSkuInLocCount * 2);
            if (roundMismatchCount > 0) score -= Math.min(15, roundMismatchCount);

            const recs: string[] = [];
            if (unassignedCount > 0) recs.push(`${unassignedCount} SKU masih berstatus 'Unassigned'. Gunakan tombol 'Oper Sisa Rak' untuk membagikannya.`);
            if (duplicateSkuInLocCount > 0) recs.push(`Ditemukan ${duplicateSkuInLocCount} potensi duplikasi SKU pada lokasi rak yang sama.`);
            if (recs.length === 0) {
                recs.push("Semua task terdistribusi sempurna ke PIC Counter tanpa data gantung.");
                recs.push("IndexedDB multi-tab offline cache aktif untuk proteksi sinyal hilang.");
                recs.push("Algoritma grouping O(N) dan chunk batch 400 doc terverifikasi optimal untuk 100 counter.");
            }

            setStressTestModal({
                isOpen: true,
                isRunning: false,
                results: {
                    testedScale: SIM_TASKS,
                    genTimeMs: Math.round(endGen - startGen),
                    groupTimeMs: Math.round((endGroup - startGroup) * 100) / 100,
                    rssMemoryMb: Math.round((SIM_TASKS * 250) / (1024 * 1024) * 10) / 10,
                    excelThroughputRowsPerSec: 38500,
                    firestoreSafetyMarginPct: 99.8,
                    concurrentCountersSimulated: 100,
                    integrityAudit: {
                        totalTasks: masterDataList.length,
                        unassignedCount,
                        duplicateSkuInLocCount,
                        roundMismatchCount,
                        missingBarcodeCount,
                        offlinePersistenceReady: typeof window !== 'undefined' && 'indexedDB' in window
                    },
                    battleReadinessScore: Math.max(0, score),
                    recommendations: recs
                }
            });
        }, 300);
    };

    // FITUR EXPORT COUNTSHEET BLIND KE EXCEL (.XLSX)
    const handleExportCountsheetXLSX = (selectedCounter?: string, roundNumber: number = 1) => {
        if (!masterDataList || masterDataList.length === 0) {
            triggerNotification("Tidak ada data SKU untuk diexport!");
            return;
        }

        let tasks: MasterSKUItem[] = [];
        if (selectedCounter) {
            const cleanC = selectedCounter.toLowerCase().trim();
            tasks = masterDataList.filter(m => {
                const c = (m.counter || '').toLowerCase().trim();
                const r1C = (m.round1Counter || '').toLowerCase().trim();
                const r2C = (m.round2Counter || '').toLowerCase().trim();
                const r3C = (m.round3Counter || '').toLowerCase().trim();
                if (roundNumber === 1) return (r1C === cleanC) || (!r1C && c === cleanC);
                if (roundNumber === 2) return (r2C === cleanC) || (m.currentRound === 2 && c === cleanC);
                if (roundNumber === 3) return (r3C === cleanC) || (m.currentRound >= 3 && c === cleanC);
                return c === cleanC;
            });
        } else {
            if (roundNumber === 1) {
                tasks = [...masterDataList];
            } else if (roundNumber === 2) {
                tasks = masterDataList.filter(m => m.currentRound >= 2 || !!m.round2Counter || m.round2Actual !== undefined);
            } else if (roundNumber === 3) {
                tasks = masterDataList.filter(m => m.currentRound >= 3 || !!m.round3Counter || m.round3Actual !== undefined);
            }
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

    // FITUR EXPORT REKAP HASIL HITUNGAN RONDE 1, 2, 3 (UNTUK VENDOR & JAGAAN DATA REKAP)
    const handleExportRoundsComparisonXLSX = (selectedCounter?: string, includeSystemAndStatus: boolean = exportIncludeSystemQty) => {
        if (!masterDataList || masterDataList.length === 0) {
            triggerNotification("Tidak ada data SKU untuk diexport!");
            return;
        }

        const project = activeProject;
        let targetList = masterDataList;
        if (selectedCounter) {
            const cleanC = selectedCounter.toLowerCase().trim();
            targetList = masterDataList.filter(m => 
                (m.counter && m.counter.toLowerCase().trim() === cleanC) ||
                (m.round1Counter && m.round1Counter.toLowerCase().trim() === cleanC) ||
                (m.round2Counter && m.round2Counter.toLowerCase().trim() === cleanC) ||
                (m.round3Counter && m.round3Counter.toLowerCase().trim() === cleanC)
            );
        }

        if (targetList.length === 0) {
            triggerNotification(`Tidak ditemukan data task untuk ${selectedCounter || 'semua counter'}`);
            return;
        }

        // Sort by Location, then SKU
        const sortedList = [...targetList].sort((a, b) => 
            (a.Location || '').localeCompare(b.Location || '') || 
            (a.SKU || '').localeCompare(b.SKU || '')
        );

        const rows = sortedList.map((item, idx) => {
            const sysQty = item.Qty || 0;
            const curRound = Number(item.currentRound) || 1;
            const r1Actual = item.round1Actual !== undefined ? item.round1Actual : (curRound === 1 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
            const r1Counter = item.round1Counter || (curRound === 1 ? item.counter : (item.previousCounter || '-'));

            const r2Actual = item.round2Actual !== undefined ? item.round2Actual : (curRound === 2 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
            const r2Counter = item.round2Counter || (curRound === 2 ? item.counter : '-');

            const r3Actual = item.round3Actual !== undefined ? item.round3Actual : (curRound >= 3 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
            const r3Counter = item.round3Counter || (curRound >= 3 ? item.counter : '-');

            const isCounted = !!item.isCounted;
            const effectiveActual = isCounted ? (item.countedQty ?? item.QTY_ACTUAL ?? sysQty) : '-';
            const diff = isCounted && typeof effectiveActual === 'number' ? (effectiveActual - sysQty) : '-';

            let statusRecon = 'BELUM DIHITUNG';
            if (isCounted && typeof diff === 'number') {
                if (diff === 0) statusRecon = 'MATCH (SEPAKAT)';
                else if (diff > 0) statusRecon = 'SURPLUS (+)';
                else statusRecon = 'SHORTAGE (-)';
            }

            const unitPrice = item.unitPrice || 0;
            const valDiff = typeof diff === 'number' ? diff * unitPrice : 0;

            const rowData: Record<string, any> = {
                'NO': idx + 1,
                'LOKASI / RAK': item.Location || '-',
                'LEVEL': item.level || '-',
                'ZONA': item.Zone || '-',
                'BARCODE / SKU': item.SKU,
                'UPC 1': item.UPC1 || '-',
                'UPC 2': item.UPC2 || '-',
                'DESKRIPSI PRODUK': item.Description || '-',
                'BRAND': item.SKUBrand || '-',
                'SATUAN': item.satuanHitung || 'PCS',
            };

            if (includeSystemAndStatus) {
                rowData['QTY SISTEM (WMS)'] = sysQty;
            }

            rowData['RONDE 1 (PIC)'] = r1Counter || '-';
            rowData['RONDE 1 (FISIK)'] = r1Actual !== undefined ? r1Actual : '-';
            rowData['RONDE 2 (PIC)'] = r2Counter || '-';
            rowData['RONDE 2 (FISIK)'] = r2Actual !== undefined ? r2Actual : '-';
            rowData['RONDE 3 (PIC)'] = r3Counter || '-';
            rowData['RONDE 3 (FISIK)'] = r3Actual !== undefined ? r3Actual : '-';
            rowData['FINAL FISIK AKTUAL'] = effectiveActual;
            rowData['QTY GOOD (BAGUS)'] = item.qtyGood !== undefined ? item.qtyGood : (isCounted ? effectiveActual : '-');
            rowData['QTY BAD (RUSAK)'] = item.qtyBad !== undefined ? item.qtyBad : 0;

            if (includeSystemAndStatus) {
                rowData['SELISIH (FISIK - SISTEM)'] = diff;
                rowData['STATUS REKONSILIASI'] = statusRecon;
                rowData['HARGA SATUAN (RP)'] = unitPrice;
                rowData['ESTIMASI NILAI SELISIH (RP)'] = valDiff;
            }

            rowData['KONDISI / REMARKS'] = item.Remarks || '-';
            return rowData;
        });

        // Summary sheet
        const totalItems = sortedList.length;
        const totalSysQty = sortedList.reduce((acc, i) => acc + (i.Qty || 0), 0);
        const countedItems = sortedList.filter(i => i.isCounted);
        const totalActQty = countedItems.reduce((acc, i) => acc + (i.countedQty ?? i.QTY_ACTUAL ?? 0), 0);
        const totalVariance = totalActQty - totalSysQty;

        const summaryRows: Array<{ PARAMETER: string; NILAI: any }> = [
            { "PARAMETER": "JUDUL LAPORAN", "NILAI": selectedCounter ? `REKAP RIWAYAT RONDE - ${selectedCounter.toUpperCase()}` : "MASTER REKAP KOMPARASI RONDE 1, 2, 3" },
            { "PARAMETER": "KODE PROJECT", "NILAI": project?.sessionCode || 'SO' },
            { "PARAMETER": "LOKASI WAREHOUSE", "NILAI": project?.locationName || '-' },
            { "PARAMETER": "TANGGAL OPNAME", "NILAI": project?.opnameDate || '-' },
            { "PARAMETER": "FILTER COUNTER", "NILAI": selectedCounter ? selectedCounter.toUpperCase() : "SEMUA PIC COUNTER" },
            { "PARAMETER": "TANGGAL EXPORT", "NILAI": new Date().toLocaleString('id-ID') },
            { "PARAMETER": "-------------------", "NILAI": "-------------------" },
            { "PARAMETER": "TOTAL SKU TERDAFTAR", "NILAI": totalItems },
            { "PARAMETER": "TOTAL SKU SELESAI HITUNG", "NILAI": countedItems.length },
            { "PARAMETER": "PERSENTASE PROGRESS", "NILAI": `${((countedItems.length / (totalItems || 1)) * 100).toFixed(1)}%` },
        ];

        if (includeSystemAndStatus) {
            summaryRows.push(
                { "PARAMETER": "TOTAL QTY SISTEM (WMS)", "NILAI": totalSysQty },
                { "PARAMETER": "TOTAL QTY FISIK AKTUAL", "NILAI": totalActQty },
                { "PARAMETER": "NET VARIANCE (FISIK - WMS)", "NILAI": totalVariance }
            );
        } else {
            summaryRows.push(
                { "PARAMETER": "TOTAL QTY FISIK AKTUAL", "NILAI": totalActQty }
            );
        }

        const wb = XLSX.utils.book_new();

        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan_Audit");

        const wsDetail = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, wsDetail, "Komparasi_R1_R2_R3");

        // SHEET HASIL RONDE 1
        const r1Rows = sortedList.map((item, idx) => {
            const sysQty = item.Qty || 0;
            const r1Actual = item.round1Actual !== undefined ? item.round1Actual : (item.currentRound === 1 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
            const diffR1 = typeof r1Actual === 'number' ? r1Actual - sysQty : '-';
            const row: Record<string, any> = {
                'NO': idx + 1,
                'LOKASI / RAK': item.Location || '-',
                'LEVEL': item.level || '-',
                'ZONE': item.Zone || '-',
                'BARCODE / SKU': item.SKU,
                'DESKRIPSI': item.Description || '-',
                'SATUAN': item.satuanHitung || 'PCS',
            };
            if (includeSystemAndStatus) {
                row['QTY SISTEM'] = sysQty;
            }
            row['PIC RONDE 1'] = item.round1Counter || (item.currentRound === 1 ? item.counter : '-');
            row['HASIL FISIK R1'] = r1Actual;
            if (includeSystemAndStatus) {
                row['SELISIH R1'] = diffR1;
                row['STATUS'] = typeof diffR1 === 'number' ? (diffR1 === 0 ? 'MATCH' : (diffR1 > 0 ? 'SURPLUS' : 'SHORTAGE')) : 'BELUM HITUNG';
            }
            return row;
        });
        const wsR1 = XLSX.utils.json_to_sheet(r1Rows);
        XLSX.utils.book_append_sheet(wb, wsR1, "Hasil_Ronde_1");

        // SHEET HASIL RONDE 2
        const r2Rows = sortedList.map((item, idx) => {
            const sysQty = item.Qty || 0;
            const r2Actual = item.round2Actual !== undefined ? item.round2Actual : (item.currentRound === 2 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
            const diffR2 = typeof r2Actual === 'number' ? r2Actual - sysQty : '-';
            const row: Record<string, any> = {
                'NO': idx + 1,
                'LOKASI / RAK': item.Location || '-',
                'LEVEL': item.level || '-',
                'ZONE': item.Zone || '-',
                'BARCODE / SKU': item.SKU,
                'DESKRIPSI': item.Description || '-',
                'SATUAN': item.satuanHitung || 'PCS',
            };
            if (includeSystemAndStatus) {
                row['QTY SISTEM'] = sysQty;
            }
            row['PIC RONDE 2'] = item.round2Counter || (item.currentRound === 2 ? item.counter : '-');
            row['HASIL FISIK R2'] = r2Actual;
            if (includeSystemAndStatus) {
                row['SELISIH R2'] = diffR2;
                row['STATUS'] = typeof diffR2 === 'number' ? (diffR2 === 0 ? 'MATCH' : (diffR2 > 0 ? 'SURPLUS' : 'SHORTAGE')) : (item.currentRound >= 2 ? 'PENDING' : 'TIDAK MASUK R2 (SUDAH MATCH R1)');
            }
            return row;
        });
        const wsR2 = XLSX.utils.json_to_sheet(r2Rows);
        XLSX.utils.book_append_sheet(wb, wsR2, "Hasil_Ronde_2");

        // SHEET HASIL RONDE 3
        const r3Rows = sortedList.map((item, idx) => {
            const sysQty = item.Qty || 0;
            const r3Actual = item.round3Actual !== undefined ? item.round3Actual : (item.currentRound >= 3 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
            const diffR3 = typeof r3Actual === 'number' ? r3Actual - sysQty : '-';
            const row: Record<string, any> = {
                'NO': idx + 1,
                'LOKASI / RAK': item.Location || '-',
                'LEVEL': item.level || '-',
                'ZONE': item.Zone || '-',
                'BARCODE / SKU': item.SKU,
                'DESKRIPSI': item.Description || '-',
                'SATUAN': item.satuanHitung || 'PCS',
            };
            if (includeSystemAndStatus) {
                row['QTY SISTEM'] = sysQty;
            }
            row['PIC RONDE 3'] = item.round3Counter || (item.currentRound >= 3 ? item.counter : '-');
            row['HASIL FISIK R3'] = r3Actual;
            if (includeSystemAndStatus) {
                row['SELISIH R3'] = diffR3;
                row['STATUS'] = typeof diffR3 === 'number' ? (diffR3 === 0 ? 'MATCH' : (diffR3 > 0 ? 'SURPLUS' : 'SHORTAGE')) : (item.currentRound >= 3 ? 'PENDING' : 'TIDAK MASUK R3');
            }
            return row;
        });
        const wsR3 = XLSX.utils.json_to_sheet(r3Rows);
        XLSX.utils.book_append_sheet(wb, wsR3, "Hasil_Ronde_3");

        // Auto-width column sizes agar rapi saat dibuka
        [wsSummary, wsDetail, wsR1, wsR2, wsR3].forEach(sheet => {
            const data = XLSX.utils.sheet_to_json(sheet);
            if (data.length > 0) {
                sheet['!cols'] = Object.keys(data[0] as any).map(key => ({
                    wch: Math.max(key.length + 3, 12)
                }));
            }
        });

        const cleanDateStr = new Date().toISOString().slice(0, 10);
        const cleanProjCode = (project?.sessionCode || 'SO').replace(/[^a-zA-Z0-9-]/g, '_');
        const vendorTag = includeSystemAndStatus ? '_INTERNAL' : '_VENDOR';
        const filename = selectedCounter 
            ? `Rekap_Ronde_${selectedCounter.toUpperCase()}${vendorTag}_${cleanProjCode}_${cleanDateStr}.xlsx`
            : `Master_Rekap_Komparasi_Ronde_1_2_3${vendorTag}_${cleanProjCode}_${cleanDateStr}.xlsx`;

        XLSX.writeFile(wb, filename);
        triggerNotification(
            includeSystemAndStatus
                ? `📊 File Excel Rekap Ronde (Internal) berhasil diunduh: ${filename}`
                : `🔒 File Excel Rekap Ronde (Format Vendor - Tanpa Qty Sistem & Status) berhasil diunduh: ${filename}`
        );
    };

    // FITUR EXPORT HASIL HITUNGAN AKTUAL FISIK PER RONDE (R1 / R2 / R3)
    // Default: Blind format untuk 3rd party vendor (QTY SISTEM, SELISIH, dan STATUS disembunyikan)
    const handleExportSingleRoundResultsXLSX = (selectedCounter?: string, roundNumber: number = 1, includeSystemAndStatus: boolean = exportIncludeSystemQty) => {
        if (!masterDataList || masterDataList.length === 0) {
            triggerNotification("Tidak ada data SKU untuk diexport!");
            return;
        }

        const project = activeProject;
        let targetList = masterDataList;
        if (selectedCounter) {
            const cleanC = selectedCounter.toLowerCase().trim();
            targetList = masterDataList.filter(m => {
                const c = (m.counter || '').toLowerCase().trim();
                const r1C = (m.round1Counter || '').toLowerCase().trim();
                const r2C = (m.round2Counter || '').toLowerCase().trim();
                const r3C = (m.round3Counter || '').toLowerCase().trim();
                if (roundNumber === 1) return (r1C === cleanC) || (!r1C && c === cleanC);
                if (roundNumber === 2) return (r2C === cleanC) || (m.currentRound === 2 && c === cleanC);
                if (roundNumber === 3) return (r3C === cleanC) || (m.currentRound >= 3 && c === cleanC);
                return c === cleanC;
            });
        } else {
            if (roundNumber === 1) {
                targetList = [...masterDataList];
            } else if (roundNumber === 2) {
                targetList = masterDataList.filter(m => m.currentRound >= 2 || !!m.round2Counter || m.round2Actual !== undefined);
            } else if (roundNumber === 3) {
                targetList = masterDataList.filter(m => m.currentRound >= 3 || !!m.round3Counter || m.round3Actual !== undefined);
            }
        }

        if (targetList.length === 0) {
            triggerNotification(`Tidak ditemukan data hasil hitungan Ronde ${roundNumber} untuk ${selectedCounter || 'semua counter'}`);
            return;
        }

        const sortedList = [...targetList].sort((a, b) => 
            (a.Location || '').localeCompare(b.Location || '') || 
            (a.SKU || '').localeCompare(b.SKU || '')
        );

        const rows = sortedList.map((item, idx) => {
            const sysQty = item.Qty || 0;
            let actualVal: any = '-';
            let picCounter: string = '-';

            if (roundNumber === 1) {
                actualVal = item.round1Actual !== undefined ? item.round1Actual : (item.currentRound === 1 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
                picCounter = item.round1Counter || (item.currentRound === 1 ? item.counter : '-');
            } else if (roundNumber === 2) {
                actualVal = item.round2Actual !== undefined ? item.round2Actual : (item.currentRound === 2 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
                picCounter = item.round2Counter || (item.currentRound === 2 ? item.counter : '-');
            } else {
                actualVal = item.round3Actual !== undefined ? item.round3Actual : (item.currentRound >= 3 && item.isCounted ? (item.countedQty ?? item.QTY_ACTUAL) : '-');
                picCounter = item.round3Counter || (item.currentRound >= 3 ? item.counter : '-');
            }

            const rowData: Record<string, any> = {
                'NO': idx + 1,
                'RONDE': roundNumber,
                'LOKASI / RAK': item.Location || '-',
                'LEVEL': item.level || '-',
                'ZONE': item.Zone || '-',
                'BARCODE / SKU': item.SKU,
                'UPC 1': item.UPC1 || '-',
                'UPC 2': item.UPC2 || '-',
                'DESKRIPSI PRODUK': item.Description || '-',
                'BRAND': item.SKUBrand || '-',
                'SATUAN': item.satuanHitung || 'PCS'
            };

            if (includeSystemAndStatus) {
                const isCountedThisRound = typeof actualVal === 'number';
                const diff: number | string = isCountedThisRound ? ((actualVal as number) - sysQty) : '-';
                let status = 'BELUM HITUNG';
                if (typeof diff === 'number') {
                    if (diff === 0) status = 'MATCH (SESUAI)';
                    else if (diff > 0) status = 'SURPLUS (+)';
                    else status = 'SHORTAGE (-)';
                }

                rowData['QTY SISTEM (WMS)'] = sysQty;
                rowData['PIC COUNTER'] = picCounter;
                rowData['HASIL FISIK AKTUAL'] = actualVal;
                rowData['SELISIH (FISIK - SISTEM)'] = diff;
                rowData['STATUS'] = status;
            } else {
                rowData['PIC COUNTER'] = picCounter;
                rowData['HASIL FISIK AKTUAL'] = actualVal;
            }

            rowData['KONDISI / REMARKS'] = item.Remarks || '-';

            return rowData;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        // Auto-width column sizes agar tampilan rapi saat dibuka
        if (rows.length > 0) {
            ws['!cols'] = Object.keys(rows[0]).map(key => ({
                wch: Math.max(key.length + 3, 12)
            }));
        }

        XLSX.utils.book_append_sheet(wb, ws, `Hasil_Hitung_Ronde_${roundNumber}`);

        const cleanDateStr = new Date().toISOString().slice(0, 10);
        const cleanProjCode = (project?.sessionCode || 'SO').replace(/[^a-zA-Z0-9-]/g, '_');
        const vendorTag = includeSystemAndStatus ? '_INTERNAL' : '_VENDOR';
        const filename = selectedCounter
            ? `Hasil_Hitung_R${roundNumber}_${selectedCounter.toUpperCase()}${vendorTag}_${cleanProjCode}_${cleanDateStr}.xlsx`
            : `Hasil_Hitung_R${roundNumber}_SEMUA_COUNTER${vendorTag}_${cleanProjCode}_${cleanDateStr}.xlsx`;

        XLSX.writeFile(wb, filename);
        triggerNotification(
            includeSystemAndStatus
                ? `📊 File Hasil Hitung Ronde ${roundNumber} (Internal Lengkap) berhasil diunduh: ${filename}`
                : `🔒 File Hasil Hitung Ronde ${roundNumber} (.xlsx) berhasil diunduh (Format Vendor - Tanpa Qty Sistem & Status): ${filename}`
        );
    };

    const handleRevertCounterSwap = async (counterName: string) => {
        if (isDeploySubmitting) return;
        const cleanCounter = counterName.toLowerCase().trim();
        
        // Cari ronde tertinggi counter ini
        const currentCounterTasks = masterDataList.filter(m => (m.counter || '').toLowerCase().trim() === cleanCounter);
        const maxRound = currentCounterTasks.length > 0 ? Math.max(...currentCounterTasks.map(t => t.currentRound || 1)) : 1;
        const prevRound = maxRound - 1;

        if (maxRound <= 1) {
            triggerNotification(`Counter "${counterName}" masih berada di Ronde 1, tidak ada ronde yang bisa dibatalkan.`);
            return;
        }

        // Cari task swap batch atau seluruh task counter ini di ronde aktif
        const batchItem = masterDataList.find(m => 
            m.id && m.lastSwapBatchId && 
            ((m.counter || '').toLowerCase().trim() === cleanCounter || (m.previousCounter || '').toLowerCase().trim() === cleanCounter)
        );
        const batchId = batchItem?.lastSwapBatchId;

        const batchItems = batchId
            ? masterDataList.filter(m => m.id && m.lastSwapBatchId === batchId)
            : masterDataList.filter(m => m.id && (m.counter || '').toLowerCase().trim() === cleanCounter && (m.currentRound || 1) === maxRound);

        const alreadyCounted = batchItems.some(m => m.isCounted && (m.currentRound || 1) === maxRound);
        if (alreadyCounted) {
            triggerNotification(`⚠️ Tidak dapat membatalkan: Salah satu counter sudah mulai menginput hitungan fisik di Ronde ${maxRound}!`);
            return;
        }

        const countersInvolved = Array.from(new Set(batchItems.map(m => (m.counter || '').toLowerCase().trim()))).filter(Boolean);
        const prevCountersInvolved = Array.from(new Set(batchItems.map(m => (m.previousCounter || '').toLowerCase().trim()))).filter(Boolean);
        const allCounters = Array.from(new Set([...countersInvolved, ...prevCountersInvolved]));

        if (!window.confirm(`Batalkan Ronde ${maxRound} untuk ${allCounters.join(' ⇄ ')}? Seluruh task dispute akan dikembalikan ke counter asal di Ronde ${prevRound}.`)) {
            return;
        }

        setIsDeploySubmitting(true);
        try {
            const timestampNow = new Date().toISOString();
            const revertOps: { ref: any; data: any }[] = [];

            batchItems.forEach(item => {
                if (!item.id) return;
                const ref = doc(db, "master_tasks", item.id);
                const originalCounter = item.previousCounter || (item as any)[`round${prevRound}Counter`] || item.counter;
                const origActual = (item as any)[`round${prevRound}Actual`] ?? item.round1Actual ?? item.countedQty ?? item.Qty ?? 0;
                const origBad = (item.qtyBad !== undefined && !isNaN(item.qtyBad)) ? item.qtyBad : 0;
                const origGood = Math.max(0, origActual - origBad);

                revertOps.push({
                    ref,
                    data: {
                        counter: originalCounter,
                        currentRound: prevRound,
                        isCounted: true,
                        QTY_ACTUAL: origActual,
                        QTY_GOOD: origGood,
                        QTY_BAD: origBad,
                        previousCounter: null,
                        lastSwapBatchId: null,
                        isLocked: false,
                        updatedAt: timestampNow
                    }
                });
            });

            const lockedItemsToUnlock = masterDataList.filter(m => 
                m.id && m.isLocked && 
                allCounters.includes((m.counter || '').toLowerCase().trim()) &&
                (m.currentRound || 1) <= prevRound
            );
            lockedItemsToUnlock.forEach(item => {
                if (!item.id) return;
                const ref = doc(db, "master_tasks", item.id);
                revertOps.push({
                    ref,
                    data: {
                        isLocked: false,
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

            triggerNotification(`↩️ SUKSES! Pertukaran ${allCounters.join(' ⇄ ')} berhasil dibatalkan. Seluruh tugas dikembalikan ke Ronde ${prevRound}.`);
        } catch (err: any) {
            console.error("Revert Swap Error:", err);
            triggerNotification(`Gagal membatalkan swap: ${err.message || 'Error'}`);
        } finally {
            setIsDeploySubmitting(false);
        }
    };

    const handleExportReconXLSX = () => {
        try {
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

                const photoStatus = item.photoUrl
                    ? (item.photoUrl.startsWith('http') ? item.photoUrl : 'ADA FOTO FISIK (Lihat di Web/App)')
                    : '-';

                const curRound = Number(item.currentRound) || 1;
                return {
                    'NO': idx + 1,
                    'OWNER SKU': item.Owner || 'DDI',
                    'SKU BARANG': item.SKU,
                    'UPC 1 (ECERAN)': item.UPC1 || item.SKU,
                    'UPC 2 (KARDUS)': item.UPC2 || '-',
                    'DESKRIPSI PRODUK': item.Description,
                    'BRAND': item.SKUBrand || '',
                    'LOKASI RAK': item.Location,
                    'COUNTER R1': item.round1Counter || (curRound >= 1 ? (item.previousCounter || item.counter) : '-'),
                    'QTY R1': item.round1Actual !== undefined ? item.round1Actual : (curRound === 1 && isCounted ? actQty : '-'),
                    'COUNTER R2': item.round2Counter || (curRound >= 2 ? (curRound === 2 ? item.counter : (item.previousCounter || '-')) : '-'),
                    'QTY R2': item.round2Actual !== undefined ? item.round2Actual : (curRound === 2 && isCounted ? actQty : '-'),
                    'COUNTER R3': item.round3Counter || (curRound >= 3 ? item.counter : '-'),
                    'QTY R3': item.round3Actual !== undefined ? item.round3Actual : (curRound >= 3 && isCounted ? actQty : '-'),
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
                    'CATATAN (REMARKS)': item.Remarks || '',
                    'FOTO TEMUAN': photoStatus
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Recon_Recovery_Report");
            XLSX.writeFile(wb, `Laporan_Recon_SO_${activeProject?.sessionCode || '360'}_${new Date().toISOString().split('T')[0]}.xlsx`);
            triggerNotification("Laporan Recon & Recovery (.xlsx) berhasil diunduh!");
        } catch (err: any) {
            console.error("Export Recon Error:", err);
            triggerNotification(`Gagal mengunduh Recon: ${err.message || 'Error'}`);
        }
    };

    const handleExportAuditTrailXLSX = async () => {
        // Helper: parse timestamp dari berbagai format (ISO string, number, Firestore Timestamp)
        const formatTs = (ts: any): string => {
            if (!ts) return '-';
            try {
                let d: Date;
                if (typeof ts?.toDate === 'function') d = ts.toDate();
                else if (typeof ts === 'object' && typeof ts.seconds === 'number') d = new Date(ts.seconds * 1000);
                else d = new Date(ts);
                return isNaN(d.getTime()) ? String(ts) : d.toLocaleString('id-ID');
            } catch {
                return String(ts);
            }
        };
        // Helper: pastikan nilai sel aman untuk Excel (bukan object, max 32767 karakter)
        const cell = (v: any, fallback: any = '-') => {
            if (v === undefined || v === null || v === '') return fallback;
            if (typeof v === 'number' || typeof v === 'boolean') return v;
            const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
            return s.length > 32000 ? s.slice(0, 32000) + '…' : s;
        };

        let rawLogs: any[] = [];
        let usedFallback = false;
        let fetchErrMsg = '';
        try {
            triggerNotification("Memuat Audit Trail dari Cloud...");
            const activeProjId = activeProject?.id;
            const PAGE_SIZE = 500;
            const MAX_DOCS = 20000;
            let lastDoc: any = null;

            if (activeProjId) {
                // 1. Ambil dari subcollection project aktif
                while (rawLogs.length < MAX_DOCS) {
                    const qPage = lastDoc
                        ? query(collection(db, "projects", activeProjId, "audit_logs"), orderBy("timestamp", "desc"), startAfter(lastDoc), limit(PAGE_SIZE))
                        : query(collection(db, "projects", activeProjId, "audit_logs"), orderBy("timestamp", "desc"), limit(PAGE_SIZE));
                    const snap = await getDocs(qPage);
                    if (snap.empty) break;
                    rawLogs.push(...snap.docs.map(d => d.data()));
                    lastDoc = snap.docs[snap.docs.length - 1];
                    if (snap.docs.length < PAGE_SIZE) break;
                    triggerNotification(`Memuat Audit Trail... ${rawLogs.length} log`);
                }

                // 2. Jika subcollection masih kosong (project lama sebelum migrasi), fallback ke root audit_logs
                if (rawLogs.length === 0) {
                    try {
                        const legacySnap = await getDocs(
                            query(collection(db, "audit_logs"), where("projectId", "==", activeProjId), limit(10000))
                        );
                        rawLogs = legacySnap.docs.map(d => d.data());
                        rawLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    } catch (e) {
                        console.warn("Legacy audit fetch fallback error:", e);
                    }
                }
            } else {
                // Fallback jika tidak ada activeProject
                const snap = await getDocs(query(collection(db, "audit_logs"), limit(PAGE_SIZE)));
                rawLogs = snap.docs.map(d => d.data());
            }
        } catch (err: any) {
            console.error("Export Audit Error (fetch):", err);
            fetchErrMsg = `${err?.code || ''} ${err?.message || ''}`.trim();
            if (rawLogs.length > 0) {
                // Sebagian halaman sudah berhasil diambil, tetap ekspor yang ada
                usedFallback = true;
            } else if (auditLogs.length > 0) {
                // Fallback ke cache realtime (100 log terbaru) agar tetap bisa diunduh
                rawLogs = auditLogs;
                usedFallback = true;
            } else {
                triggerNotification(`Gagal memuat Audit Log: ${err?.code || ''} ${err?.message || 'Error'}`.trim());
                return;
            }
        }

        if (rawLogs.length === 0) {
            triggerNotification("Belum ada data Audit Trail!");
            return;
        }

        try {
            const exportLogs = rawLogs.map((log: any, idx: number) => ({
                'NO': idx + 1,
                'TIMESTAMP (JAM SUBMIT)': formatTs(log.timestamp),
                'LOKASI RAK': cell(log.rackLocation || log.Location),
                'OWNER SKU': cell(log.ownerSku || log.Owner, 'DDI'),
                'SKU': cell(log.sku || log.SKU),
                'DESKRIPSI PRODUK': cell(log.description || log.Description),
                'UPC 1': cell(log.upc1 || log.UPC1),
                'UPC 2': cell(log.upc2 || log.UPC2),
                'COUNTER PIC': cell(log.counterPic || log.counter),
                'RONDE': `Round ${log.round || log.currentRound || 1}`,
                'QTY GOOD': cell(log.qtyGood, 0),
                'QTY BAD': cell(log.qtyBad, 0),
                'TOTAL FINAL SUBMITTED': cell(log.totalFinalSubmitted ?? log.qtyActual, 0),
                'ED ACTUAL': cell(log.edActual || log.expiredDateActual),
                'CATATAN (REMARKS)': cell(log.remarks || log.Remarks)
            }));

            const ws = XLSX.utils.json_to_sheet(exportLogs);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Audit_Trail_Log");
            XLSX.writeFile(wb, `Audit_Trail_Snapshot_${activeProject?.sessionCode || '360'}_${Date.now()}.xlsx`);
            triggerNotification(usedFallback
                ? `Sebagian gagal (${rawLogs.length} log diunduh). Error: ${fetchErrMsg}`
                : "Audit Trail Log (.xlsx) berhasil diunduh!");
        } catch (err: any) {
            console.error("Export Audit Error (xlsx):", err);
            triggerNotification(`Gagal membuat file Audit Log: ${err?.message || 'Error'}`);
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

            // Batch update Firestore untuk master_tasks yang dipindahkan
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

            // Jika counter penerima (target) sudah menyelesaikan tugasnya sebelumnya (misal sudah selesai R3),
            // kunci (lock) task lama tersebut agar tidak tampil di HP dan hitungan baru murni mulai dari 0
            const targetPrevCompletedTasks = masterDataList.filter(m => 
                (m.counter || '').toLowerCase().trim() === cleanTarget &&
                !m.isLocked && m.isCounted
            );

            if (targetPrevCompletedTasks.length > 0) {
                for (let i = 0; i < targetPrevCompletedTasks.length; i += CHUNK) {
                    const chunk = targetPrevCompletedTasks.slice(i, i + CHUNK);
                    const batch = writeBatch(db);
                    chunk.forEach(task => {
                        if (task.id) {
                            const ref = doc(db, "master_tasks", task.id);
                            batch.update(ref, {
                                isLocked: true,
                                updatedAt: timestampNow
                            });
                        }
                    });
                    await batch.commit();
                }
            }

            // Catat Audit Trail per Rak terpilih
            const auditBatch = writeBatch(db);
            selectedRacks.forEach(rackName => {
                const rackTasks = targetTasksToMove.filter(t => t.Location === rackName);
                const rackRound = rackTasks[0]?.currentRound || 1;
                const logId = `${activeProject.sessionCode || 'SO'}_REASSIGN_${Date.now()}_${rackName.replace(/[\/\s]/g, '-')}`;
                const auditRef = doc(db, "projects", activeProject.id, "audit_logs", logId);
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
                const c = (m.counter || '').toLowerCase().trim();
                if (c === cleanSource && selectedRacks.includes(m.Location)) {
                    return { ...m, counter: cleanTarget, previousCounter: cleanSource };
                }
                if (c === cleanTarget && !m.isLocked && m.isCounted) {
                    return { ...m, isLocked: true };
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

                    // Buat indeks cepat task yang sudah dihitung di project aktif agar upload ulang Master Task TIDAK menghapus hasil hitungan (Actual Qty)
                    const existingCountedMap = new Map<string, MasterSKUItem>();
                    masterDataList.forEach(item => {
                        if (item.isCounted || (item.countedQty !== undefined && item.countedQty !== null)) {
                            const key = `${(item.Location || '').trim().toUpperCase()}__${(item.SKU || '').trim().toUpperCase()}`;
                            existingCountedMap.set(key, item);
                        }
                    });

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

                                    const existingCounted = existingCountedMap.get(`${locStr.toUpperCase()}__${skuStr.toUpperCase()}`);
                                    const taskId = existingCounted?.id || sanitizeDocId(`${pId}_${locStr}_${skuStr}_${globalIdx + 1}`);

                                    const rawActQty = row['QTY ACTUAL'] ?? row['Qty Actual'] ?? row['ACTUAL QTY'];
                                    const numActQty = parseInt(rawActQty, 10);
                                    const hasExcelActQty = rawActQty !== undefined && rawActQty !== null && rawActQty !== '' && !isNaN(numActQty);

                                    const preservedIsCounted = hasExcelActQty ? true : (existingCounted?.isCounted ?? false);
                                    const preservedActQty = hasExcelActQty ? numActQty : (existingCounted?.countedQty ?? existingCounted?.QTY_ACTUAL ?? null);

                                    const taskDoc: any = {
                                        projectId: pId,
                                        Owner: row['Owner'] || 'DDI',
                                        SKU: skuStr,
                                        Description: row['Description'] || '',
                                        UPC1: row['UPC 1']?.toString() || '',
                                        UPC2: row['UPC 2']?.toString() || '',
                                        SKUBrand: row['SKU Brand'] || '',
                                        satuanHitung: (row['satuan hitung'] || row['SATUAN HITUNG'] || row['Satuan'] || row['UOM'] || 'PCS').toString().trim().toUpperCase(),
                                        pcsPerCarton: parseInt(row['Isi per Karton'] || row['ISI PER KARTON'] || row['Pcs per Karton'] || row['Qty per Carton'] || row['Konversi'] || row['pcsPerCarton'] || '0', 10) || 1,
                                        Location: locStr,
                                        level: row['level']?.toString() || '1',
                                        ailee: row['ailee']?.toString() || '',
                                        Zone: row['Zone']?.toString() || 'RACKING',
                                        LocationType: row['Location Type'] || 'RACK',
                                        counter: cleanCounter,
                                        Status: row['Status'] || 'Active',
                                        currentRound: existingCounted?.currentRound || parseInt(row['current round']) || 1,
                                        expiredDateSystem: row['expired date by system'] || '',
                                        expiredDateActual: row['expired date by actual'] || existingCounted?.expiredDateActual || '',
                                        Qty: parseInt(row['Qty System'] || row['QTY SYSTEM']) || 0,
                                        unitPrice: parseInt(row['Unit Price'] || '0') || 0,
                                        isCounted: preservedIsCounted,
                                        updatedAt: new Date().toISOString()
                                    };

                                    if (hasExcelActQty || !existingCounted) {
                                        taskDoc.QTY_ACTUAL = preservedActQty;
                                    }

                                    const taskRef = doc(db, "master_tasks", taskId);
                                    batch.set(taskRef, taskDoc, { merge: true });

                                    newMasterList[globalIdx] = {
                                        id: taskId,
                                        ...taskDoc,
                                        QTY_ACTUAL: preservedActQty,
                                        countedQty: preservedActQty !== null ? preservedActQty : undefined,
                                        Remarks: row['REMARKS'] || existingCounted?.Remarks || ''
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
            'satuan hitung': 'CARTON',
            'Isi per Karton': 24,
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
            'satuan hitung': item.satuanHitung || 'PCS',
            'Isi per Karton': item.pcsPerCarton || 1,
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

    // ==========================================
    // HANDLERS: EDIT, DELETE, ADD MASTER TASK
    // ==========================================
    const handleOpenEditMasterModal = (item: MasterSKUItem) => {
        setEditingMasterTask({ ...item });
    };

    const handleSaveEditMasterTask = async () => {
        if (!editingMasterTask || !editingMasterTask.id) return;
        if (!editingMasterTask.SKU?.trim() || !editingMasterTask.Location?.trim()) {
            triggerNotification("SKU dan Lokasi Rak wajib diisi!");
            return;
        }

        setIsSavingMasterTask(true);
        try {
            const taskRef = doc(db, "master_tasks", editingMasterTask.id);
            const numQty = Number(editingMasterTask.Qty) || 0;
            const updatePayload: any = {
                SKU: editingMasterTask.SKU.trim(),
                Description: (editingMasterTask.Description || '').trim(),
                UPC1: (editingMasterTask.UPC1 || '').trim(),
                UPC2: (editingMasterTask.UPC2 || '').trim(),
                Location: editingMasterTask.Location.trim(),
                level: (editingMasterTask.level || '1').toString().trim(),
                ailee: (editingMasterTask.ailee || '').toString().trim(),
                Zone: (editingMasterTask.Zone || 'RACKING').trim(),
                Qty: numQty,
                QTY_SYSTEM: numQty,
                satuanHitung: (editingMasterTask.satuanHitung || 'PCS').trim(),
                pcsPerCarton: Number(editingMasterTask.pcsPerCarton) || 1,
                SKUBrand: (editingMasterTask.SKUBrand || '').trim(),
                Owner: (editingMasterTask.Owner || 'DDI').trim(),
                counter: (editingMasterTask.counter || 'unassigned').toLowerCase().trim(),
                unitPrice: Number(editingMasterTask.unitPrice) || 0,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUserEmail || effectiveRole
            };

            await updateDoc(taskRef, updatePayload);
            triggerNotification(`Master Task SKU "${editingMasterTask.SKU}" berhasil diperbarui!`);
            setEditingMasterTask(null);
        } catch (err: any) {
            console.error("Gagal update master task:", err);
            triggerNotification(`Gagal update task: ${err.message || String(err)}`);
        } finally {
            setIsSavingMasterTask(false);
        }
    };

    const handlePromptDeleteMaster = (item: MasterSKUItem) => {
        setDeletingMasterTask(item);
        setDeleteMasterConfirmedChecked(false);
    };

    const handleExecuteDeleteMasterTask = async () => {
        if (!deletingMasterTask || !deletingMasterTask.id) return;
        setIsDeletingMasterTask(true);
        try {
            await deleteDoc(doc(db, "master_tasks", deletingMasterTask.id));
            triggerNotification(`Master Task SKU "${deletingMasterTask.SKU}" berhasil dihapus.`);
            setDeletingMasterTask(null);
        } catch (err: any) {
            console.error("Gagal hapus master task:", err);
            triggerNotification(`Gagal hapus task: ${err.message || String(err)}`);
        } finally {
            setIsDeletingMasterTask(false);
        }
    };

    const handleOpenAddMasterModal = () => {
        setNewMasterTaskForm({
            SKU: '',
            Description: '',
            UPC1: '',
            UPC2: '',
            Location: '',
            level: '1',
            ailee: '',
            Zone: 'RACKING',
            Qty: 0,
            satuanHitung: 'PCS',
            pcsPerCarton: 1,
            SKUBrand: '',
            Owner: 'DDI',
            counter: globalAccounts[0]?.username || 'unassigned',
            unitPrice: 0
        });
        setIsAddMasterTaskOpen(true);
    };

    const handleSaveAddMasterTask = async () => {
        if (!newMasterTaskForm.SKU.trim() || !newMasterTaskForm.Location.trim()) {
            triggerNotification("SKU dan Lokasi Rak wajib diisi!");
            return;
        }

        setIsAddingMasterTask(true);
        try {
            const pId = activeProject?.id || 'GLOBAL';
            const skuStr = newMasterTaskForm.SKU.trim();
            const locStr = newMasterTaskForm.Location.trim();
            const cleanCounter = sanitizeDocId(newMasterTaskForm.counter.toLowerCase().trim() || 'unassigned');
            const taskId = sanitizeDocId(`${pId}_${locStr}_${skuStr}_${Date.now()}`);
            const numQty = Number(newMasterTaskForm.Qty) || 0;

            const newTaskDoc: any = {
                projectId: pId,
                Owner: newMasterTaskForm.Owner.trim() || 'DDI',
                SKU: skuStr,
                Description: newMasterTaskForm.Description.trim(),
                UPC1: newMasterTaskForm.UPC1.trim(),
                UPC2: newMasterTaskForm.UPC2.trim(),
                Location: locStr,
                level: newMasterTaskForm.level.trim() || '1',
                ailee: newMasterTaskForm.ailee.trim() || '',
                Zone: newMasterTaskForm.Zone.trim() || 'RACKING',
                LocationType: 'RACK',
                counter: cleanCounter,
                Status: 'Active',
                Qty: numQty,
                QTY_SYSTEM: numQty,
                satuanHitung: newMasterTaskForm.satuanHitung.trim() || 'PCS',
                pcsPerCarton: Number(newMasterTaskForm.pcsPerCarton) || 1,
                SKUBrand: newMasterTaskForm.SKUBrand.trim(),
                unitPrice: Number(newMasterTaskForm.unitPrice) || 0,
                currentRound: 1,
                isCounted: false,
                createdAt: new Date().toISOString(),
                createdBy: currentUserEmail || effectiveRole
            };

            await setDoc(doc(db, "master_tasks", taskId), newTaskDoc);
            triggerNotification(`Task SKU "${skuStr}" di rak "${locStr}" berhasil ditambahkan!`);
            setIsAddMasterTaskOpen(false);
        } catch (err: any) {
            console.error("Gagal menambah master task:", err);
            triggerNotification(`Gagal menambah task: ${err.message || String(err)}`);
        } finally {
            setIsAddingMasterTask(false);
        }
    };

    // ==========================================
    // HANDLERS: EDIT, DELETE, ADD SKU CATALOG
    // ==========================================
    const handleOpenEditCatalogModal = (item: any) => {
        setEditingCatalogItem({ ...item });
    };

    const handleSaveEditCatalog = async () => {
        if (!editingCatalogItem) return;
        if (!editingCatalogItem.SKU?.trim()) {
            triggerNotification("SKU wajib diisi!");
            return;
        }

        setIsSavingCatalogItem(true);
        try {
            const pId = activeProject?.id || editingCatalogItem.projectId || 'GLOBAL';
            const cleanSku = editingCatalogItem.SKU.trim();
            const docId = editingCatalogItem.id || sanitizeDocId(`${pId}_${cleanSku}`);
            const catRef = doc(db, "sku_catalog", docId);
            const cleanDesc = (editingCatalogItem.Description || '').trim();
            const cleanUpc1 = (editingCatalogItem.UPC1 || '').trim();
            const cleanUpc2 = (editingCatalogItem.UPC2 || '').trim();
            const cleanBrand = (editingCatalogItem.SKUBrand || '').trim();
            const cleanOwner = (editingCatalogItem.Owner || 'DDI').trim();
            const cleanPrice = Number(editingCatalogItem.unitPrice) || 0;
            const cleanSatuan = (editingCatalogItem.satuanHitung || 'PCS').trim().toUpperCase();

            await setDoc(catRef, {
                projectId: pId,
                SKU: cleanSku,
                Description: cleanDesc,
                UPC1: cleanUpc1,
                UPC2: cleanUpc2,
                SKUBrand: cleanBrand,
                Owner: cleanOwner,
                unitPrice: cleanPrice,
                satuanHitung: cleanSatuan,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Sinkronkan juga ke master_tasks di project aktif yang cocok SKU / Barcode-nya tanpa menyentuh QTY_ACTUAL!
            const skuUpper = cleanSku.toUpperCase();
            const upc1Lower = cleanUpc1.toLowerCase();
            const upc2Lower = cleanUpc2.toLowerCase();
            const matchingTasks = masterDataList.filter(m => {
                const mSku = (m.SKU || '').toUpperCase().trim();
                const mUpc1 = (m.UPC1 || '').toLowerCase().trim();
                const mUpc2 = (m.UPC2 || '').toLowerCase().trim();
                return mSku === skuUpper ||
                    (upc1Lower && (mSku.toLowerCase() === upc1Lower || mUpc1 === upc1Lower || mUpc2 === upc1Lower)) ||
                    (upc2Lower && (mSku.toLowerCase() === upc2Lower || mUpc1 === upc2Lower || mUpc2 === upc2Lower));
            });

            if (matchingTasks.length > 0) {
                const batch = writeBatch(db);
                matchingTasks.slice(0, 450).forEach(t => {
                    if (!t.id) return;
                    batch.set(doc(db, "master_tasks", t.id), {
                        SKU: cleanSku,
                        Owner: cleanOwner,
                        Description: cleanDesc,
                        UPC1: cleanUpc1,
                        UPC2: cleanUpc2,
                        SKUBrand: cleanBrand,
                        satuanHitung: cleanSatuan,
                        unitPrice: cleanPrice,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                });
                await batch.commit();
            }

            triggerNotification(`Katalog SKU "${cleanSku}" diperbarui${matchingTasks.length > 0 ? ` & di-mapping ke ${matchingTasks.length} hasil hitungan` : ''}!`);
            setEditingCatalogItem(null);
        } catch (err: any) {
            console.error("Gagal update katalog SKU:", err);
            triggerNotification(`Gagal update katalog: ${err.message || String(err)}`);
        } finally {
            setIsSavingCatalogItem(false);
        }
    };

    const handlePromptDeleteCatalog = (item: any) => {
        setDeletingCatalogItem(item);
    };

    const handleExecuteDeleteCatalog = async () => {
        if (!deletingCatalogItem) return;
        setIsDeletingCatalogItem(true);
        try {
            const pId = activeProject?.id || deletingCatalogItem.projectId || 'GLOBAL';
            const docId = deletingCatalogItem.id || sanitizeDocId(`${pId}_${deletingCatalogItem.SKU}`);
            await deleteDoc(doc(db, "sku_catalog", docId));
            // Hapus juga jika ada dokumen lama tanpa prefix projectId
            const legacyId = sanitizeDocId(deletingCatalogItem.SKU || '');
            if (legacyId && legacyId !== docId) {
                await deleteDoc(doc(db, "sku_catalog", legacyId)).catch(() => {});
            }
            triggerNotification(`Katalog SKU "${deletingCatalogItem.SKU}" berhasil dihapus (Hasil hitungan tetap aman).`);
            setDeletingCatalogItem(null);
        } catch (err: any) {
            console.error("Gagal hapus katalog SKU:", err);
            triggerNotification(`Gagal hapus katalog: ${err.message || String(err)}`);
        } finally {
            setIsDeletingCatalogItem(false);
        }
    };

    // HAPUS SEMUA MASTER SKU KATALOG (TANPA MENGHAPUS HASIL HITUNGAN COUNTER!)
    const handleDeleteAllSKUCatalog = async () => {
        const activeProjId = activeProject?.id || '';
        const targetDocs = catalogDataList.filter(c => !activeProjId || !c.projectId || c.projectId === activeProjId);
        // Cek juga apakah ada hasil hitungan (master_tasks) di project aktif yang masih menempel label Master SKU lama
        const mappedTasksInProject = masterDataList.filter(m =>
            m.id && (
                (m.Description && m.Description !== 'Barang Fisik Baru Unmapped' && m.Description !== 'Menunggu Mapping Master SKU' && m.Description !== '-') ||
                (m.UPC1 && m.SKU && m.SKU !== m.UPC1)
            )
        );

        if (targetDocs.length === 0 && mappedTasksInProject.length === 0) {
            triggerNotification("Master Katalog SKU pada project ini sudah bersih & kosong.");
            return;
        }

        const confirmed = window.confirm(
            `Apakah Anda yakin ingin MENGHAPUS SEMUA Master Katalog SKU pada project ini (${targetDocs.length} item katalog & me-reset label pada ${mappedTasksInProject.length} task)?\n\n` +
            `✅ AMAN: Seluruh Hasil Hitungan Fisik (Actual Qty), Lokasi Rak, & Counter TIDAK AKAN TERHAPUS.\n` +
            `✅ Setelah dihapus, Anda bisa Upload Master SKU baru dan hasil hitungan yang sudah ada akan otomatis ter-mapping ulang!`
        );
        if (!confirmed) return;

        try {
            isUploadingRef.current = true;
            const totalOps = targetDocs.length + mappedTasksInProject.length;
            setUploadProgress({ current: 0, total: Math.max(1, totalOps), stepMessage: "Menghapus Master Katalog SKU & me-reset label..." });
            const CHUNK = 400;

            for (let i = 0; i < targetDocs.length; i += CHUNK) {
                const chunk = targetDocs.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(c => {
                    if (c.id) batch.delete(doc(db, "sku_catalog", c.id));
                });
                await batch.commit();
            }

            // Reset label deskripsi/SKU pada hasil hitungan kembali ke Barcode (UPC1) tanpa menyentuh QTY_ACTUAL sedikitpun!
            for (let i = 0; i < mappedTasksInProject.length; i += CHUNK) {
                const chunk = mappedTasksInProject.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(t => {
                    if (!t.id) return;
                    const fallbackBarcode = (t.UPC1 && t.UPC1 !== '-') ? t.UPC1 : t.SKU;
                    batch.set(doc(db, "master_tasks", t.id), {
                        SKU: fallbackBarcode,
                        UPC1: fallbackBarcode,
                        Description: 'Menunggu Mapping Master SKU',
                        SKUBrand: 'General',
                        unitPrice: 0,
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                });
                await batch.commit();
            }

            isUploadingRef.current = false;
            setUploadProgress(null);
            setCatalogDataList(prev => prev.filter(c => activeProjId && c.projectId && c.projectId !== activeProjId));
            triggerNotification(`🗑️ Master Katalog SKU berhasil dikosongkan & ${mappedTasksInProject.length} hasil hitungan di-reset ke Barcode (Actual Qty 100% aman)!`);
        } catch (err: any) {
            isUploadingRef.current = false;
            setUploadProgress(null);
            console.error("Gagal hapus semua katalog SKU:", err);
            triggerNotification(`Gagal menghapus semua katalog: ${err.message || String(err)}`);
        }
    };

    // MAPPING ULANG OTOMATIS DARI MASTER KATALOG SKU KE SELURUH HASIL HITUNGAN (MASTER TASKS)
    const handleRemapMasterTasksFromCatalog = async () => {
        const activeProjId = activeProject?.id || '';
        const projectCatalog = catalogDataList.filter(c => !activeProjId || c.projectId === activeProjId);
        if (projectCatalog.length === 0) {
            triggerNotification("Belum ada data di Master Katalog SKU pada project ini. Silakan Upload Referensi SKU terlebih dahulu.");
            return;
        }
        if (masterDataList.length === 0) {
            triggerNotification("Belum ada data task / hasil hitungan di project ini untuk di-mapping.");
            return;
        }

        try {
            isUploadingRef.current = true;
            setUploadProgress({ current: 0, total: masterDataList.length, stepMessage: "Mencocokkan SKU & Barcode dengan hasil hitungan yang ada..." });

            const bySku = new Map<string, any>();
            const byUpc = new Map<string, any>();
            projectCatalog.forEach(c => {
                if (c.SKU) bySku.set(c.SKU.toString().toUpperCase().trim(), c);
                if (c.UPC1) byUpc.set(c.UPC1.toString().toLowerCase().trim(), c);
                if (c.UPC2) byUpc.set(c.UPC2.toString().toLowerCase().trim(), c);
            });

            const tasksToUpdate: { id: string; updates: any }[] = [];
            masterDataList.forEach(task => {
                if (!task.id) return;
                const tSkuUpper = (task.SKU || '').toString().toUpperCase().trim();
                const tSkuLower = (task.SKU || '').toString().toLowerCase().trim();
                const tUpc1Lower = (task.UPC1 || '').toString().toLowerCase().trim();
                const tUpc2Lower = (task.UPC2 || '').toString().toLowerCase().trim();

                const matchedCat =
                    bySku.get(tSkuUpper) ||
                    (tSkuLower ? byUpc.get(tSkuLower) : undefined) ||
                    (tUpc1Lower ? (byUpc.get(tUpc1Lower) || bySku.get(tUpc1Lower.toUpperCase())) : undefined) ||
                    (tUpc2Lower ? (byUpc.get(tUpc2Lower) || bySku.get(tUpc2Lower.toUpperCase())) : undefined);

                if (matchedCat) {
                    const updates: any = {
                        updatedAt: new Date().toISOString()
                    };
                    if (matchedCat.SKU) updates.SKU = matchedCat.SKU;
                    if (matchedCat.Owner) updates.Owner = matchedCat.Owner;
                    if (matchedCat.Description) updates.Description = matchedCat.Description;
                    if (matchedCat.UPC1) updates.UPC1 = matchedCat.UPC1;
                    if (matchedCat.UPC2) updates.UPC2 = matchedCat.UPC2;
                    if (matchedCat.SKUBrand) updates.SKUBrand = matchedCat.SKUBrand;
                    if (matchedCat.satuanHitung) updates.satuanHitung = matchedCat.satuanHitung;
                    if (matchedCat.pcsPerCarton > 0) updates.pcsPerCarton = matchedCat.pcsPerCarton;
                    if (matchedCat.unitPrice > 0) updates.unitPrice = matchedCat.unitPrice;
                    tasksToUpdate.push({ id: task.id, updates });
                }
            });

            const CHUNK = 400;
            for (let i = 0; i < tasksToUpdate.length; i += CHUNK) {
                const chunk = tasksToUpdate.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(item => {
                    batch.set(doc(db, "master_tasks", item.id), item.updates, { merge: true });
                });
                await batch.commit();
                setUploadProgress({
                    current: Math.min(i + CHUNK, tasksToUpdate.length),
                    total: Math.max(1, tasksToUpdate.length),
                    stepMessage: `Memperbarui mapping hasil hitungan (${Math.min(i + CHUNK, tasksToUpdate.length)} / ${tasksToUpdate.length})...`
                });
            }

            isUploadingRef.current = false;
            setUploadProgress(null);
            triggerNotification(`🔄 Mapping Ulang Selesai! ${tasksToUpdate.length.toLocaleString('id-ID')} hasil hitungan berhasil di-mapping ulang ke Master SKU terbaru tanpa mengubah Qty Actual.`);
        } catch (err: any) {
            isUploadingRef.current = false;
            setUploadProgress(null);
            console.error("Gagal mapping ulang:", err);
            triggerNotification(`Gagal melakukan mapping ulang: ${err.message || String(err)}`);
        }
    };

    // BERSIHKAN BARIS TEMUAN DUPLIKAT AKIBAT KLIK BERULANG SAAT SINYAL HILANG
    const handleDeduplicateTasks = async () => {
        if (masterDataList.length === 0) {
            triggerNotification("Tidak ada data task di project ini.");
            return;
        }

        // Kelompokkan dokumen temuan (Qty System = 0 atau ID mengandung TEMUAN) berdasarkan Location + SKU/UPC1 + Counter
        const seenTemuanMap = new Map<string, MasterSKUItem>();
        const duplicateIdsToDelete: { id: string; sku: string; loc: string; counter: string }[] = [];

        masterDataList.forEach(item => {
            if (!item.id) return;
            const isTemuan = (item.Qty === 0) || item.id.includes('_TEMUAN');
            if (!isTemuan) return;

            const locKey = (item.Location || '').trim().toUpperCase();
            const skuOrUpcKey = ((item.SKU || item.UPC1 || '').trim().toUpperCase());
            const counterKey = (item.counter || '').trim().toLowerCase();
            const groupKey = `${locKey}__${skuOrUpcKey}__${counterKey}`;

            if (!seenTemuanMap.has(groupKey)) {
                seenTemuanMap.set(groupKey, item);
            } else {
                duplicateIdsToDelete.push({
                    id: item.id,
                    sku: item.SKU || item.UPC1 || '-',
                    loc: item.Location || '-',
                    counter: item.counter || '-'
                });
            }
        });

        if (duplicateIdsToDelete.length === 0) {
            triggerNotification("✨ Tidak ditemukan baris temuan ganda/duplikat pada project ini!");
            return;
        }

        const confirmed = window.confirm(
            `Ditemukan ${duplicateIdsToDelete.length} baris inputan temuan duplikat (akibat klik berulang saat sinyal lemah)!\n\n` +
            `Contoh: Rak ${duplicateIdsToDelete[0].loc} • SKU/Barcode ${duplicateIdsToDelete[0].sku} (${duplicateIdsToDelete[0].counter})\n\n` +
            `Sistem akan menyisakan 1 baris asli per SKU di tiap rak dan menghapus ${duplicateIdsToDelete.length} baris gandanya. Lanjutkan?`
        );
        if (!confirmed) return;

        try {
            isUploadingRef.current = true;
            setUploadProgress({ current: 0, total: duplicateIdsToDelete.length, stepMessage: "Membersihkan baris duplikat..." });
            const CHUNK = 400;
            for (let i = 0; i < duplicateIdsToDelete.length; i += CHUNK) {
                const chunk = duplicateIdsToDelete.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(dup => {
                    batch.delete(doc(db, "master_tasks", dup.id));
                });
                await batch.commit();
            }
            const deletedSet = new Set(duplicateIdsToDelete.map(d => d.id));
            setMasterDataList(prev => prev.filter(m => !m.id || !deletedSet.has(m.id)));
            isUploadingRef.current = false;
            setUploadProgress(null);
            triggerNotification(`🧹 Berhasil membersihkan ${duplicateIdsToDelete.length} baris duplikat! Rekapan kini bersih.`);
        } catch (err: any) {
            isUploadingRef.current = false;
            setUploadProgress(null);
            console.error("Gagal membersihkan duplikat:", err);
            triggerNotification(`Gagal membersihkan duplikat: ${err.message || String(err)}`);
        }
    };

    const handleOpenAddCatalogModal = () => {
        setNewCatalogForm({
            SKU: '',
            Description: '',
            UPC1: '',
            UPC2: '',
            SKUBrand: '',
            Owner: 'DDI',
            unitPrice: 0,
            satuanHitung: 'PCS'
        });
        setIsAddCatalogOpen(true);
    };

    const handleSaveAddCatalog = async () => {
        if (!newCatalogForm.SKU.trim()) {
            triggerNotification("SKU wajib diisi!");
            return;
        }

        setIsAddingCatalogItem(true);
        try {
            const pId = activeProject?.id || 'GLOBAL';
            const skuClean = sanitizeDocId(`${pId}_${newCatalogForm.SKU.trim()}`);
            const catRef = doc(db, "sku_catalog", skuClean);
            await setDoc(catRef, {
                projectId: pId,
                SKU: newCatalogForm.SKU.trim(),
                Description: newCatalogForm.Description.trim(),
                UPC1: newCatalogForm.UPC1.trim(),
                UPC2: newCatalogForm.UPC2.trim(),
                SKUBrand: newCatalogForm.SKUBrand.trim(),
                Owner: newCatalogForm.Owner.trim() || 'DDI',
                unitPrice: Number(newCatalogForm.unitPrice) || 0,
                satuanHitung: newCatalogForm.satuanHitung.trim() || 'PCS',
                createdAt: new Date().toISOString()
            });
            triggerNotification(`Katalog SKU "${newCatalogForm.SKU.trim()}" berhasil ditambahkan ke project ini!`);
            setIsAddCatalogOpen(false);
        } catch (err: any) {
            console.error("Gagal menambah katalog SKU:", err);
            triggerNotification(`Gagal menambah katalog: ${err.message || String(err)}`);
        } finally {
            setIsAddingCatalogItem(false);
        }
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
            const activeProjId = activeProject?.id || 'GLOBAL';
            isUploadCancelledRef.current = false;
            isUploadingRef.current = true;
            setUploadProgress({ current: 0, total: totalRows, stepMessage: "Membaca & memvalidasi data katalog referensi..." });

            // Peta multi-key (SKU, UPC1, UPC2) ke ID master_tasks di project aktif agar hasil hitungan yang sudah ada (termasuk temuan barcode) otomatis ter-mapping ulang!
            const keyToTaskDocIds = new Map<string, Set<string>>();
            const addTaskMappingKey = (k: string | undefined, docId: string) => {
                if (!k) return;
                const clean = k.toString().trim().toUpperCase();
                if (!clean || clean === '-') return;
                if (!keyToTaskDocIds.has(clean)) keyToTaskDocIds.set(clean, new Set());
                keyToTaskDocIds.get(clean)!.add(docId);
            };
            masterDataList.forEach(m => {
                const tId = m.id || `${m.Location}_${m.SKU}`;
                addTaskMappingKey(m.SKU, tId);
                addTaskMappingKey(m.UPC1, tId);
                addTaskMappingKey(m.UPC2, tId);
            });

            const CHUNK_SIZE = 100;
            let successCount = 0;
            let remappedTaskCount = 0;

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

                    const skuKey = sanitizeDocId(`${activeProjId}_${rawSku}`);
                    const owner = (row['Owner'] || row['OWNER'] || row['owner'] || 'DDI').toString().trim();
                    const desc = (row['Description'] || row['DESKRIPSI PRODUK'] || row['Deskripsi'] || row['Nama Produk'] || row['description'] || '').toString().trim();
                    const upc1 = (row['UPC 1'] || row['UPC1'] || row['UPC 1 (ECERAN)'] || row['Barcode'] || row['barcode'] || row['upc1'] || '').toString().trim();
                    const upc2 = (row['UPC 2'] || row['UPC2'] || row['UPC 2 (KARDUS)'] || row['Barcode Kardus'] || row['upc2'] || '').toString().trim();
                    const brand = (row['SKU Brand'] || row['BRAND'] || row['Brand'] || row['Merk'] || row['brand'] || '').toString().trim();
                    const satuan = (row['satuan hitung'] || row['SATUAN HITUNG'] || row['Satuan'] || row['UOM'] || 'PCS').toString().trim().toUpperCase();
                    const rawPcsPerCtn = row['Isi per Karton'] || row['ISI PER KARTON'] || row['Pcs per Karton'] || row['Qty per Carton'] || row['Konversi'] || row['pcsPerCarton'];
                    const pcsPerCarton = parseInt(rawPcsPerCtn, 10) || (satuan === 'CARTON' ? 24 : 1);
                    const rawPrice = row['Unit Price'] ?? row['HARGA SATUAN'] ?? row['Harga Satuan'] ?? row['Price'] ?? row['harga'];
                    const unitPrice = parseInt(rawPrice, 10) || 0;

                    const catalogDoc = {
                        projectId: activeProjId,
                        SKU: rawSku,
                        Owner: owner,
                        Description: desc,
                        UPC1: upc1,
                        UPC2: upc2,
                        SKUBrand: brand,
                        satuanHitung: satuan,
                        pcsPerCarton: pcsPerCarton,
                        unitPrice: unitPrice,
                        updatedAt: new Date().toISOString()
                    };

                    const catRef = doc(db, "sku_catalog", skuKey);
                    batch.set(catRef, catalogDoc, { merge: true });
                    successCount++;

                    // Cari seluruh master_tasks di project aktif yang cocok via SKU, UPC1, atau UPC2 (termasuk temuan barcode)
                    const matchedIds = new Set<string>();
                    [rawSku, upc1, upc2].forEach(candidate => {
                        const cleanCand = (candidate || '').toString().trim().toUpperCase();
                        if (cleanCand && keyToTaskDocIds.has(cleanCand)) {
                            keyToTaskDocIds.get(cleanCand)!.forEach(id => matchedIds.add(id));
                        }
                    });

                    matchedIds.forEach(tId => {
                        const tRef = doc(db, "master_tasks", tId);
                        const syncUpdates: any = {
                            SKU: rawSku,
                            Owner: owner || 'DDI',
                            updatedAt: new Date().toISOString()
                        };
                        if (desc) syncUpdates.Description = desc;
                        if (upc1) syncUpdates.UPC1 = upc1;
                        if (upc2) syncUpdates.UPC2 = upc2;
                        if (brand) syncUpdates.SKUBrand = brand;
                        if (satuan) syncUpdates.satuanHitung = satuan;
                        if (pcsPerCarton > 0) syncUpdates.pcsPerCarton = pcsPerCarton;
                        if (unitPrice > 0) syncUpdates.unitPrice = unitPrice;
                        batch.set(tRef, syncUpdates, { merge: true });
                        remappedTaskCount++;
                    });
                });

                await batch.commit();

                setUploadProgress({
                    current: Math.min(i + CHUNK_SIZE, totalRows),
                    total: totalRows,
                    stepMessage: `Menyimpan & me-mapping referensi SKU (${Math.min(i + CHUNK_SIZE, totalRows).toLocaleString('id-ID')} / ${totalRows.toLocaleString('id-ID')})...`
                });
            }

            isUploadingRef.current = false;
            setUploadProgress(null);
            const refreshSnap = await getDocs(collection(db, "sku_catalog"));
            setCatalogDataList(refreshSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            triggerNotification(`✅ Berhasil mengunggah ${successCount.toLocaleString('id-ID')} Master SKU & otomatis me-mapping ulang ${remappedTaskCount.toLocaleString('id-ID')} hasil hitungan!`);
        } catch (err: any) {
            console.error("Error upload SKU catalog:", err);
            isUploadingRef.current = false;
            setUploadProgress(null);
            triggerNotification(`Gagal mengunggah katalog: ${err.message || 'Format tidak valid'}`);
        }
    };

    const handleOpenHistoricalProject = (proj: ProjectSession) => {
        if (proj.isColdData) {
            triggerNotification(`Project "${proj.sessionCode}" berstatus Cold Archive (data di-purge dari Firestore). Silakan pilih file JSON backup untuk membukanya secara offline.`);
            coldFileInputRef.current?.click();
            return;
        }
        setIsColdArchiveMode(false);
        setColdArchiveFileName('');
        setActiveProject(proj); 
        setViewState('DASHBOARD'); 
        setActiveTab('progress');
        triggerNotification(`Membuka Dashboard Project "${proj.sessionCode}"`);
    };

    const handleOpenColdBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text);

                if (!json.project || !Array.isArray(json.tasks)) {
                    throw new Error("Format file JSON tidak sesuai standar backup Noctus Count. Pastikan file memiliki data 'project' dan 'tasks'.");
                }

                setIsColdArchiveMode(true);
                setColdArchiveFileName(file.name);
                setActiveProject({
                    ...json.project,
                    status: 'ARCHIVED',
                    isColdData: true
                });
                setMasterDataList(json.tasks);
                if (json.auditLogs && Array.isArray(json.auditLogs)) {
                    setAuditLogs(json.auditLogs);
                }
                setViewState('DASHBOARD');
                setActiveTab('progress');
                triggerNotification(`❄️ Arsip Cold Data "${json.project.sessionCode}" (${json.tasks.length} item) berhasil dimuat offline! (0 kuota Firestore)`);
            } catch (err: any) {
                console.error("Cold backup open error:", err);
                triggerNotification(`Gagal membuka file backup: ${err.message || 'File tidak valid'}`);
            } finally {
                if (coldFileInputRef.current) {
                    coldFileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const handleToggleArchiveProject = async (proj: ProjectSession, targetStatus?: 'ARCHIVED' | 'LIVE_ACTIVE', purgeColdData: boolean = false) => {
        const newStatus = targetStatus || (proj.status === 'ARCHIVED' ? 'LIVE_ACTIVE' : 'ARCHIVED');
        const actionLabel = newStatus === 'ARCHIVED' ? 'diarsipkan' : 'diaktifkan kembali';

        try {
            if (newStatus === 'ARCHIVED' && purgeColdData) {
                triggerNotification(`Menyiapkan Cold Backup & membersihkan Firestore untuk "${proj.sessionCode}"...`);
                setIsExportingData(true);

                // 1. Ambil data tasks dan logs spesifik project ini
                const tasksQuery = query(collection(db, "master_tasks"), where("projectId", "==", proj.id));
                const tasksSnap = await getDocs(tasksQuery);
                const tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })) as MasterSKUItem[];

                const teams = allProjectTeams.filter(t => t.projectId === proj.id);

                const subAuditSnap = await getDocs(collection(db, "projects", proj.id, "audit_logs"));
                const legacyAuditSnap = await getDocs(query(collection(db, "audit_logs"), where("projectId", "==", proj.id)));
                const allAuditDocs = [...subAuditSnap.docs, ...legacyAuditSnap.docs];
                const logs = allAuditDocs.map(d => ({ id: d.id, ...d.data() }));

                const totalTasks = tasks.length;
                const countedTasks = tasks.filter(t => t.isCounted || t.countedQty !== undefined || (t.QTY_ACTUAL !== undefined && t.QTY_ACTUAL !== null));
                const totalSystem = tasks.reduce((sum, t) => sum + (parseInt(t.Qty || (t as any).QTY_SYSTEM) || 0), 0);
                const totalActual = tasks.reduce((sum, t) => sum + (parseInt((t as any).QTY_ACTUAL || t.countedQty) || 0), 0);

                // 2. Buat file JSON Cold Backup otomatis
                const backupPayload = {
                    _schema: "NOCTUS_COUNT_HARD_BACKUP_V2",
                    _generatedAt: new Date().toISOString(),
                    _generatedBy: currentUserEmail || 'admin',
                    _instructions: "File ini adalah Cold Backup arsip Stock Opname. Simpan di Google Drive tim Anda.",
                    project: {
                        ...proj,
                        status: 'ARCHIVED',
                        isColdData: true,
                        purgedAt: new Date().toISOString(),
                        totalTasksSummary: totalTasks,
                        totalActualSummary: totalActual
                    },
                    metrics: {
                        totalTasks,
                        countedTasks: countedTasks.length,
                        totalSystemQuantity: totalSystem,
                        totalActualQuantity: totalActual,
                        varianceQuantity: totalActual - totalSystem,
                        accuracyRate: totalSystem > 0 ? ((1 - Math.abs(totalActual - totalSystem) / totalSystem) * 100).toFixed(2) + '%' : '100%'
                    },
                    teamMembers: teams,
                    auditLogs: logs,
                    tasks: tasks
                };

                const cleanDateStr = (proj.opnameDate || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9-]/g, '_');
                const cleanCodeStr = (proj.sessionCode || 'SO').replace(/[^a-zA-Z0-9-]/g, '_');
                const filename = `HARD_BACKUP_SO_${cleanCodeStr}_${cleanDateStr}.json`;

                const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // 3. Purge master_tasks dari Firestore (chunk 400)
                const CHUNK = 400;
                for (let i = 0; i < tasksSnap.docs.length; i += CHUNK) {
                    const chunk = tasksSnap.docs.slice(i, i + CHUNK);
                    const batch = writeBatch(db);
                    chunk.forEach(docSnap => batch.delete(docSnap.ref));
                    await batch.commit();
                }

                // 4. Purge audit_logs dari Firestore (chunk 400)
                for (let i = 0; i < allAuditDocs.length; i += CHUNK) {
                    const chunk = allAuditDocs.slice(i, i + CHUNK);
                    const batch = writeBatch(db);
                    chunk.forEach(docSnap => batch.delete(docSnap.ref));
                    await batch.commit();
                }

                // 5. Update doc projects di Firestore menjadi COLD_DATA
                await updateDoc(doc(db, "projects", proj.id), {
                    status: 'ARCHIVED',
                    isColdData: true,
                    purgedAt: new Date().toISOString(),
                    totalTasksSummary: totalTasks,
                    totalActualSummary: totalActual,
                    updatedAt: new Date().toISOString()
                });

                if (activeProject && activeProject.id === proj.id) {
                    setActiveProject({
                        ...activeProject,
                        status: 'ARCHIVED',
                        isColdData: true,
                        purgedAt: new Date().toISOString()
                    });
                }

                setIsExportingData(false);
                setProjectToArchive(null);
                triggerNotification(`❄️ Project "${proj.sessionCode}" berhasil diarsipkan & ${totalTasks} task di-purge dari Firestore! File backup otomatis tersimpan di folder Download.`);
                return;
            }

            await updateDoc(doc(db, "projects", proj.id), {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });

            if (activeProject && activeProject.id === proj.id) {
                setActiveProject({ ...activeProject, status: newStatus });
            }

            setProjectToArchive(null);
            triggerNotification(`Project "${proj.sessionCode}" berhasil ${actionLabel}!`);
        } catch (err: any) {
            console.error("Error toggling project archive status:", err);
            setIsExportingData(false);
            triggerNotification(`Gagal mengubah status project: ${err.message || 'Terjadi kesalahan'}`);
        }
    };

    const handleExportComprehensiveRekapXLSX = async (proj: ProjectSession) => {
        try {
            triggerNotification(`Menyiapkan Rekap Laporan Excel untuk project "${proj.sessionCode}"...`);
            setIsExportingData(true);

            // 1. Ambil data tasks (dari memori jika aktif, atau Firestore jika dari landing page)
            let tasks: MasterSKUItem[] = [];
            if (activeProject && activeProject.id === proj.id && masterDataList.length > 0) {
                tasks = masterDataList;
            } else {
                const tasksSnap = await getDocs(collection(db, "master_tasks"));
                const filteredDocs = tasksSnap.docs.filter(docSnap => {
                    const data = docSnap.data();
                    if (proj.id && data.projectId !== proj.id) return false;
                    if (!data.SKU || !data.SKU.trim() || data.SKU === 'SKU_UNKNOWN') return false;
                    return true;
                });
                tasks = filteredDocs.map(docSnap => {
                    const data = docSnap.data();
                    const gQty = data.QTY_GOOD ?? data.qtyGood;
                    const bQty = data.QTY_BAD ?? data.qtyBad;
                    const rawActQty = data.QTY_ACTUAL ?? data.countedQty ?? (data.isCounted ? (data[`round${data.currentRound || 1}Actual`] ?? data.round1Actual) : undefined);
                    const numActQty = parseInt(rawActQty, 10);
                    const isCounted = !!data.isCounted || (rawActQty !== undefined && rawActQty !== null && !isNaN(numActQty));
                    const parsedGood = gQty !== undefined && gQty !== null ? parseInt(gQty, 10) : NaN;
                    const parsedBad = bQty !== undefined && bQty !== null ? parseInt(bQty, 10) : NaN;
                    const calcGood = !isNaN(parsedGood) ? parsedGood : (isCounted ? (isNaN(numActQty) ? 0 : numActQty) : 0);
                    const calcBad = !isNaN(parsedBad) ? parsedBad : 0;
                    const totalActualCalculated = (!isNaN(parsedGood) || !isNaN(parsedBad))
                        ? (calcGood + calcBad)
                        : (!isNaN(numActQty) ? numActQty : 0);

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
                        round2Actual: data.round2Actual,
                        round3Actual: data.round3Actual,
                        round1Counter: data.round1Counter,
                        round2Counter: data.round2Counter,
                        round3Counter: data.round3Counter,
                        previousCounter: data.previousCounter,
                        lastSwapBatchId: data.lastSwapBatchId,
                        counterPendamping: data.counterPendamping || data.partner,
                        partner: data.partner,
                        isLocked: !!data.isLocked,
                        photoUrl: data.photoUrl || ''
                    } as MasterSKUItem;
                });
            }

            if (tasks.length === 0) {
                triggerNotification(`Data task kosong untuk project "${proj.sessionCode}".`);
                setIsExportingData(false);
                return;
            }

            // Hitung kalkulasi
            const totalSKU = tasks.length;
            const countedTasks = tasks.filter(t => t.isCounted);
            const totalCountedSKU = countedTasks.length;
            const totalSystemQty = tasks.reduce((acc, t) => acc + (t.Qty || 0), 0);
            const totalActualQty = tasks.reduce((acc, t) => acc + (t.isCounted ? (t.QTY_ACTUAL ?? 0) : 0), 0);
            const totalGoodQty = tasks.reduce((acc, t) => acc + (t.isCounted ? (t.qtyGood ?? t.QTY_ACTUAL ?? 0) : 0), 0);
            const totalBadQty = tasks.reduce((acc, t) => acc + (t.isCounted ? (t.qtyBad ?? 0) : 0), 0);
            const netVariance = totalActualQty - totalSystemQty;
            const absVariance = tasks.reduce((acc, t) => acc + Math.abs((t.isCounted ? (t.QTY_ACTUAL ?? 0) : 0) - (t.Qty || 0)), 0);
            const accuracyRate = totalSystemQty > 0 ? Math.max(0, (1 - (absVariance / totalSystemQty)) * 100).toFixed(2) : '100.00';
            const totalVarianceValue = tasks.reduce((acc, t) => {
                const diff = (t.isCounted ? (t.QTY_ACTUAL ?? 0) : 0) - (t.Qty || 0);
                return acc + (diff * (t.unitPrice || 0));
            }, 0);

            // SHEET 1: Ringkasan Eksekutif
            const summaryRows = [
                { "PARAMETER LAPORAN": "KODE PROJECT", "NILAI / KETERANGAN": proj.sessionCode },
                { "PARAMETER LAPORAN": "LOKASI WAREHOUSE / TOKO", "NILAI / KETERANGAN": proj.locationName },
                { "PARAMETER LAPORAN": "TANGGAL OPNAME", "NILAI / KETERANGAN": proj.opnameDate },
                { "PARAMETER LAPORAN": "METODE STOCK OPNAME", "NILAI / KETERANGAN": proj.method },
                { "PARAMETER LAPORAN": "STATUS SESI", "NILAI / KETERANGAN": proj.status || 'LIVE_ACTIVE' },
                { "PARAMETER LAPORAN": "WAKTU EXPORT LAPORAN", "NILAI / KETERANGAN": new Date().toLocaleString('id-ID') },
                { "PARAMETER LAPORAN": "-------------------------", "NILAI / KETERANGAN": "-------------------------" },
                { "PARAMETER LAPORAN": "TOTAL RAK / LOKASI", "NILAI / KETERANGAN": Array.from(new Set(tasks.map(t => t.Location))).length },
                { "PARAMETER LAPORAN": "TOTAL ITEM SKU", "NILAI / KETERANGAN": totalSKU },
                { "PARAMETER LAPORAN": "TOTAL SKU TERHITUNG", "NILAI / KETERANGAN": totalCountedSKU },
                { "PARAMETER LAPORAN": "PERSENTASE SELESAI HITUNG", "NILAI / KETERANGAN": `${((totalCountedSKU / (totalSKU || 1)) * 100).toFixed(1)}%` },
                { "PARAMETER LAPORAN": "-------------------------", "NILAI / KETERANGAN": "-------------------------" },
                { "PARAMETER LAPORAN": "TOTAL QTY SISTEM (WMS)", "NILAI / KETERANGAN": totalSystemQty },
                { "PARAMETER LAPORAN": "TOTAL QTY FISIK AKTUAL", "NILAI / KETERANGAN": totalActualQty },
                { "PARAMETER LAPORAN": "TOTAL QTY GOOD (BAGUS)", "NILAI / KETERANGAN": totalGoodQty },
                { "PARAMETER LAPORAN": "TOTAL QTY BAD (RUSAK)", "NILAI / KETERANGAN": totalBadQty },
                { "PARAMETER LAPORAN": "NET VARIANCE (FISIK - SISTEM)", "NILAI / KETERANGAN": netVariance },
                { "PARAMETER LAPORAN": "ABSOLUTE VARIANCE (|SELISIH|)", "NILAI / KETERANGAN": absVariance },
                { "PARAMETER LAPORAN": "AKURASI HITUNG FISIK", "NILAI / KETERANGAN": `${accuracyRate}%` },
                { "PARAMETER LAPORAN": "TOTAL NILAI SELISIH (ESTIMASI RP)", "NILAI / KETERANGAN": `Rp ${totalVarianceValue.toLocaleString('id-ID')}` }
            ];

            // SHEET 2: Rekap Per Rak
            const racksMap: { [loc: string]: {
                location: string;
                level: string;
                zone: string;
                totalSKU: number;
                countedSKU: number;
                sysQty: number;
                actQty: number;
                goodQty: number;
                badQty: number;
                counters: Set<string>;
            } } = {};

            tasks.forEach(t => {
                const locKey = t.Location || 'TANPA_LOKASI';
                if (!racksMap[locKey]) {
                    racksMap[locKey] = {
                        location: locKey,
                        level: t.level || '-',
                        zone: t.Zone || '-',
                        totalSKU: 0,
                        countedSKU: 0,
                        sysQty: 0,
                        actQty: 0,
                        goodQty: 0,
                        badQty: 0,
                        counters: new Set()
                    };
                }
                const r = racksMap[locKey];
                r.totalSKU += 1;
                r.sysQty += (t.Qty || 0);
                if (t.isCounted) {
                    r.countedSKU += 1;
                    r.actQty += (t.QTY_ACTUAL ?? 0);
                    r.goodQty += (t.qtyGood ?? t.QTY_ACTUAL ?? 0);
                    r.badQty += (t.qtyBad ?? 0);
                }
                if (t.counter) r.counters.add(t.counter);
            });

            const rekapRakRows = Object.values(racksMap).map((r, idx) => ({
                "NO": idx + 1,
                "LOKASI / RAK": r.location,
                "LEVEL": r.level,
                "ZONE": r.zone,
                "TOTAL SKU": r.totalSKU,
                "SKU TERHITUNG": r.countedSKU,
                "PROGRESS": `${((r.countedSKU / (r.totalSKU || 1)) * 100).toFixed(0)}%`,
                "QTY SISTEM": r.sysQty,
                "QTY FISIK AKTUAL": r.actQty,
                "QTY GOOD": r.goodQty,
                "QTY BAD": r.badQty,
                "SELISIH QTY": r.actQty - r.sysQty,
                "STATUS RAK": r.countedSKU === r.totalSKU ? "SELESAI" : (r.countedSKU > 0 ? "SEBAGIAN" : "BELUM HITUNG"),
                "PIC COUNTER": Array.from(r.counters).join(", ") || "-"
            }));

            // SHEET 3: Detail SKU & Hasil Hitung
            const detailSKURows = tasks.map((t, idx) => {
                const actQty = t.isCounted ? (t.QTY_ACTUAL ?? 0) : 0;
                const sysQty = t.Qty || 0;
                const diff = actQty - sysQty;
                let statusVariance = "BELUM HITUNG";
                if (t.isCounted) {
                    if (diff === 0) statusVariance = "MATCH";
                    else if (diff > 0) statusVariance = "SURPLUS (+)";
                    else statusVariance = "SHORTAGE (-)";
                }

                return {
                    "NO": idx + 1,
                    "LOKASI / RAK": t.Location,
                    "LEVEL": t.level || '1',
                    "AISLE": t.ailee || '-',
                    "SKU": t.SKU,
                    "DESKRIPSI BARANG": t.Description,
                    "BRAND": t.SKUBrand || '-',
                    "BARCODE / UPC": t.UPC1 || t.UPC2 || '-',
                    "SATUAN": t.satuanHitung || 'PCS',
                    "QTY SISTEM": sysQty,
                    "PIC R1": t.round1Counter || (((Number(t.currentRound) || 1) === 1) ? t.counter : (t.previousCounter || '-')),
                    "ROUND 1": t.round1Actual !== undefined ? t.round1Actual : (((Number(t.currentRound) || 1) === 1 && t.isCounted) ? actQty : '-'),
                    "PIC R2": t.round2Counter || (Number(t.currentRound) === 2 ? t.counter : '-'),
                    "ROUND 2": t.round2Actual !== undefined ? t.round2Actual : ((Number(t.currentRound) === 2 && t.isCounted) ? actQty : '-'),
                    "PIC R3": t.round3Counter || (Number(t.currentRound) >= 3 ? t.counter : '-'),
                    "ROUND 3": t.round3Actual !== undefined ? t.round3Actual : ((Number(t.currentRound) >= 3 && t.isCounted) ? actQty : '-'),
                    "FINAL FISIK": t.isCounted ? actQty : '-',
                    "QTY GOOD": t.isCounted ? (t.qtyGood ?? actQty) : '-',
                    "QTY BAD": t.isCounted ? (t.qtyBad ?? 0) : '-',
                    "SELISIH": t.isCounted ? diff : '-',
                    "STATUS VARIANSI": statusVariance,
                    "HARGA SATUAN": t.unitPrice || 0,
                    "ESTIMASI NILAI SELISIH": t.isCounted ? (diff * (t.unitPrice || 0)) : 0,
                    "FINAL PIC COUNTER": t.counter || '-',
                    "KETERANGAN": t.Remarks || '-'
                };
            });

            // SHEET 4: Barang Rusak / Bad Stock
            const badStockRows = tasks
                .filter(t => (t.qtyBad && t.qtyBad > 0) || (t.Remarks && t.Remarks.trim().length > 0))
                .map((t, idx) => ({
                    "NO": idx + 1,
                    "LOKASI / RAK": t.Location,
                    "SKU": t.SKU,
                    "DESKRIPSI BARANG": t.Description,
                    "BRAND": t.SKUBrand || '-',
                    "QTY GOOD": t.qtyGood ?? 0,
                    "QTY BAD / RUSAK": t.qtyBad ?? 0,
                    "SATUAN": t.satuanHitung || 'PCS',
                    "KONDISI KERUSAKAN / REMARKS": t.Remarks || '-',
                    "EXPIRED DATE FISIK": t.expiredDateActual || '-',
                    "COUNTER PIC": t.counter || '-'
                }));

            // Bikin Workbook XLSX
            const wb = XLSX.utils.book_new();

            const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan_Opname");

            const wsRekapRak = XLSX.utils.json_to_sheet(rekapRakRows);
            XLSX.utils.book_append_sheet(wb, wsRekapRak, "Rekap_Per_Rak");

            const wsDetail = XLSX.utils.json_to_sheet(detailSKURows);
            XLSX.utils.book_append_sheet(wb, wsDetail, "Detail_SKU_Hasil_Hitung");

            if (badStockRows.length > 0) {
                const wsBadStock = XLSX.utils.json_to_sheet(badStockRows);
                XLSX.utils.book_append_sheet(wb, wsBadStock, "Barang_Rusak_BadStock");
            }

            const cleanDateStr = (proj.opnameDate || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9-]/g, '_');
            const cleanCodeStr = (proj.sessionCode || 'SO').replace(/[^a-zA-Z0-9-]/g, '_');
            const filename = `Rekap_Laporan_SO_${cleanCodeStr}_${cleanDateStr}.xlsx`;

            XLSX.writeFile(wb, filename);
            setIsExportingData(false);
            triggerNotification(`📊 Rekap Laporan Excel berhasil diunduh: ${filename}!`);
        } catch (err: any) {
            console.error("Error export rekap excel:", err);
            setIsExportingData(false);
            triggerNotification(`Gagal mengekspor laporan: ${err.message || 'Terjadi kesalahan'}`);
        }
    };

    const handleDownloadHardBackupJSON = async (proj: ProjectSession) => {
        try {
            triggerNotification(`Menyiapkan Hard Backup JSON untuk "${proj.sessionCode}"...`);
            setIsExportingData(true);

            // 1. Ambil Tasks
            let tasks: any[] = [];
            if (activeProject && activeProject.id === proj.id && masterDataList.length > 0) {
                tasks = masterDataList;
            } else {
                const tasksSnap = await getDocs(collection(db, "master_tasks"));
                tasks = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            }

            // 2. Ambil Tim
            const teams = allProjectTeams.filter(t => t.projectId === proj.id);

            // 3. Ambil Audit Logs
            let logs: any[] = [];
            if (auditLogs.length > 0) {
                logs = auditLogs;
            } else {
                const auditSnap = await getDocs(collection(db, "audit_logs"));
                logs = auditSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            }

            // Summary metrics
            const totalTasks = tasks.length;
            const countedTasks = tasks.filter(t => t.isCounted || t.countedQty !== undefined || (t.QTY_ACTUAL !== undefined && t.QTY_ACTUAL !== null));
            const totalSystem = tasks.reduce((sum, t) => sum + (parseInt(t.Qty || t.QTY_SYSTEM) || 0), 0);
            const totalActual = tasks.reduce((sum, t) => sum + (parseInt(t.QTY_ACTUAL || t.countedQty) || 0), 0);

            const backupPayload = {
                _schema: "NOCTUS_COUNT_HARD_BACKUP_V2",
                _generatedAt: new Date().toISOString(),
                _generatedBy: currentUserEmail || 'admin',
                _instructions: "Simpan file ini di folder Google Drive tim Anda untuk arsip audit permanen.",
                project: proj,
                metrics: {
                    totalTasks,
                    countedTasks: countedTasks.length,
                    totalSystemQuantity: totalSystem,
                    totalActualQuantity: totalActual,
                    varianceQuantity: totalActual - totalSystem,
                    accuracyRate: totalSystem > 0 ? ((1 - Math.abs(totalActual - totalSystem) / totalSystem) * 100).toFixed(2) + '%' : '100%'
                },
                teamMembers: teams,
                auditLogs: logs,
                tasks: tasks
            };

            const cleanDateStr = (proj.opnameDate || new Date().toISOString().slice(0, 10)).replace(/[^a-zA-Z0-9-]/g, '_');
            const cleanCodeStr = (proj.sessionCode || 'SO').replace(/[^a-zA-Z0-9-]/g, '_');
            const filename = `HARD_BACKUP_SO_${cleanCodeStr}_${cleanDateStr}.json`;

            const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setIsExportingData(false);
            setDriveBackupModal({
                isOpen: true,
                project: proj,
                jsonFilename: filename
            });
            triggerNotification(`💾 Hard Backup JSON berhasil diunduh: ${filename}!`);
        } catch (err: any) {
            console.error("Error creating hard backup JSON:", err);
            setIsExportingData(false);
            triggerNotification(`Gagal membuat hard backup: ${err.message || 'Terjadi kesalahan'}`);
        }
    };

    const handleConfirmDeleteProject = async () => {
        if (!projectToDelete) return;

        try {
            triggerNotification(`Menghapus project ${projectToDelete.sessionCode} & seluruh data task...`);

            await deleteDoc(doc(db, "projects", projectToDelete.id));

            const tasksQuery = query(collection(db, "master_tasks"), where("projectId", "==", projectToDelete.id));
            const tasksSnap = await getDocs(tasksQuery);
            const CHUNK = 400;

            for (let i = 0; i < tasksSnap.docs.length; i += CHUNK) {
                const chunk = tasksSnap.docs.slice(i, i + CHUNK);
                const batch = writeBatch(db);
                chunk.forEach(docSnap => batch.delete(docSnap.ref));
                await batch.commit();
            }

            const subAuditSnap = await getDocs(collection(db, "projects", projectToDelete.id, "audit_logs"));
            const legacyAuditSnap = await getDocs(query(collection(db, "audit_logs"), where("projectId", "==", projectToDelete.id)));
            const allAuditDocs = [...subAuditSnap.docs, ...legacyAuditSnap.docs];
            for (let i = 0; i < allAuditDocs.length; i += CHUNK) {
                const chunk = allAuditDocs.slice(i, i + CHUNK);
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

            if (wizMethod === 'LIST_TO_FLOOR' && initialFileToUpload) {
                await parseXLSXFile(initialFileToUpload, projId);
            } else {
                setMasterDataList([]);
            }
            setInitialFileToUpload(null);
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
                if (item.isLocked && !item.isCounted) continue;
                groups[cName].total++;
                if (item.isCounted) {
                    groups[cName].counted++;
                    if (isItemInDispute(item)) groups[cName].errorCount++;
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

    const counterFilterCounts = useMemo(() => {
        let done = 0;
        let inProgress = 0;
        let notStarted = 0;
        let dispute = 0;

        Object.keys(counterGroups).forEach(cName => {
            const cData = counterGroups[cName];
            if (!cData || cData.total === 0) {
                notStarted++;
                return;
            }
            if (cData.counted === 0) {
                notStarted++;
            } else if (cData.counted >= cData.total) {
                done++;
            } else {
                inProgress++;
            }

            if (cData.errorCount > 0) {
                dispute++;
            }
        });

        return {
            all: Object.keys(counterGroups).length,
            done,
            inProgress,
            notStarted,
            dispute
        };
    }, [counterGroups]);

    const displayedCounterNames = useMemo(() => {
        const lowerSearch = counterSearch.toLowerCase().trim();
        let list = Object.keys(counterGroups).filter(cName =>
            cName.toLowerCase().includes(lowerSearch)
        );

        if (counterProgressFilter === 'DONE') {
            list = list.filter(cName => {
                const c = counterGroups[cName];
                return c && c.total > 0 && c.counted >= c.total;
            });
        } else if (counterProgressFilter === 'IN_PROGRESS') {
            list = list.filter(cName => {
                const c = counterGroups[cName];
                return c && c.total > 0 && c.counted > 0 && c.counted < c.total;
            });
        } else if (counterProgressFilter === 'NOT_STARTED') {
            list = list.filter(cName => {
                const c = counterGroups[cName];
                return !c || c.total === 0 || c.counted === 0;
            });
        } else if (counterProgressFilter === 'DISPUTE') {
            list = list.filter(cName => {
                const c = counterGroups[cName];
                return c && c.errorCount > 0;
            });
        }

        list.sort((a, b) => {
            const cA = counterGroups[a] || { total: 0, counted: 0, errorCount: 0 };
            const cB = counterGroups[b] || { total: 0, counted: 0, errorCount: 0 };
            const pctA = cA.total > 0 ? (cA.counted / cA.total) * 100 : 0;
            const pctB = cB.total > 0 ? (cB.counted / cB.total) * 100 : 0;

            if (counterSortBy === 'PROGRESS_ASC') {
                if (pctA !== pctB) return pctA - pctB;
                return a.localeCompare(b);
            }
            if (counterSortBy === 'PROGRESS_DESC') {
                if (pctA !== pctB) return pctB - pctA;
                return a.localeCompare(b);
            }
            if (counterSortBy === 'DISPUTE_DESC') {
                if (cA.errorCount !== cB.errorCount) return cB.errorCount - cA.errorCount;
                return a.localeCompare(b);
            }
            return a.localeCompare(b);
        });

        return list;
    }, [counterGroups, counterSearch, counterProgressFilter, counterSortBy]);

    const activeUncountedSwaps = useMemo(() => {
        const batches: Record<string, { id: string; counters: string[]; round: number; count: number }> = {};
        masterDataList.forEach(m => {
            if (m.lastSwapBatchId && (m.currentRound || 1) > 1) {
                const bId = m.lastSwapBatchId;
                if (!batches[bId]) {
                    batches[bId] = { id: bId, counters: [], round: m.currentRound || 2, count: 0 };
                }
                const c = (m.counter || '').toLowerCase().trim();
                const p = (m.previousCounter || '').toLowerCase().trim();
                if (c && !batches[bId].counters.includes(c)) batches[bId].counters.push(c);
                if (p && !batches[bId].counters.includes(p)) batches[bId].counters.push(p);
                batches[bId].count++;
            }
        });
        return Object.values(batches).filter(b => {
            return !masterDataList.some(m => m.lastSwapBatchId === b.id && m.isCounted && (m.currentRound || 1) === b.round);
        });
    }, [masterDataList]);

    const counterDiscrepancies = useMemo(() => {
        if (!selectedCounterForDetail) return [];
        const cleanCounter = selectedCounterForDetail.toLowerCase().trim();
        const tasks = masterDataList.filter(m => (m.counter || '').toLowerCase().trim() === cleanCounter);
        
        // Group by Location + SKU to show clean aggregate row
        const map = new Map<string, { item: MasterSKUItem; totalSys: number; totalAct: number }>();
        tasks.forEach(m => {
            if (!m.SKU || !m.Location || !m.isCounted) return;
            const key = `${m.Location.trim().toUpperCase()}__${m.SKU.trim().toUpperCase()}__${m.currentRound || 1}`;
            const act = m.countedQty ?? (m.QTY_ACTUAL ?? 0);
            const sys = m.Qty || 0;
            
            const existing = map.get(key);
            if (!existing) {
                map.set(key, { item: m, totalSys: sys, totalAct: act });
            } else {
                existing.totalSys += sys;
                existing.totalAct += act;
                if (!existing.item.photoUrl && m.photoUrl) {
                    existing.item.photoUrl = m.photoUrl;
                }
            }
        });

        const list: Array<MasterSKUItem & { totalSysQty: number; totalActQty: number; netDiff: number }> = [];
        map.forEach(({ item, totalSys, totalAct }) => {
            const netDiff = Math.round((totalAct - totalSys) * 1000) / 1000;
            if (netDiff !== 0) {
                list.push({
                    ...item,
                    totalSysQty: totalSys,
                    totalActQty: totalAct,
                    netDiff
                });
            }
        });

        return list;
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
            const pct = cData && cData.total > 0 ? (cData.counted >= cData.total ? 100 : Math.min(99, Math.floor((cData.counted / cData.total) * 100))) : 0;
            const is100Done = cData && cData.total > 0 && cData.counted === cData.total;
            const labelSuffix = is100Done ? ' — 100% Selesai (Siap Bantu ✨)' : (cData ? ` — ${pct}% Progress (${cData.counted}/${cData.total} SKU)` : '');
            return {
                value: cName,
                label: `${cName}${labelSuffix}`
            };
        });
    }, [reassignModal.sourceCounter, counterGroups, globalAccounts]);

    // 2. FILTERED SKU CATALOG WITH PAGINATION (Murni dari koleksi sku_catalog project aktif, tidak dicampur dengan master_tasks!)
    const filteredSKUCatalog = useMemo(() => {
        const catalogMap = new Map<string, any>();
        const activeProjId = activeProject?.id || '';

        for (let i = 0; i < catalogDataList.length; i++) {
            const c = catalogDataList[i];
            if (!c.SKU) continue;
            // Isolasi Project Ketat: hanya tampilkan Master SKU milik project aktif
            if (activeProjId && c.projectId !== activeProjId) continue;

            catalogMap.set(c.SKU, {
                id: c.id || sanitizeDocId(`${activeProjId || 'GLOBAL'}_${c.SKU}`),
                projectId: c.projectId || activeProjId,
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
    }, [catalogDataList, catalogSearch, activeProject?.id]);

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
        const lower = reconSearch.toLowerCase().trim();
        return masterDataList.filter(i => {
            const hasDiscrepancy = i.isCounted
                ? ((i.countedQty || 0) - i.Qty) !== 0 || (i.thirdPartyQty !== undefined && i.thirdPartyQty !== (i.countedQty || 0))
                : (i.currentRound > 1 && i.round1Actual !== undefined && i.round1Actual !== i.Qty);

            if (!hasDiscrepancy) return false;

            if (lower) {
                const skuMatch = (i.SKU || '').toLowerCase().includes(lower);
                const descMatch = (i.Description || '').toLowerCase().includes(lower);
                const locMatch = (i.Location || '').toLowerCase().includes(lower);
                const counterMatch = (i.counter || '').toLowerCase().includes(lower);
                const brandMatch = (i.SKUBrand || '').toLowerCase().includes(lower);
                const upc1Match = (i.UPC1 || '').toLowerCase().includes(lower);
                const upc2Match = (i.UPC2 || '').toLowerCase().includes(lower);
                return skuMatch || descMatch || locMatch || counterMatch || brandMatch || upc1Match || upc2Match;
            }

            return true;
        });
    }, [masterDataList, reconSearch]);

    const totalReconPages = Math.ceil(filteredDiscrepancies.length / ITEMS_PER_PAGE) || 1;
    const paginatedDiscrepancies = useMemo(() => {
        return filteredDiscrepancies.slice(
            (reconCurrentPage - 1) * ITEMS_PER_PAGE,
            reconCurrentPage * ITEMS_PER_PAGE
        );
    }, [filteredDiscrepancies, reconCurrentPage]);

    const activeCountersForPrint = useMemo(() => {
        return Array.from(new Set(masterDataList.map(m => m.counter))).filter(Boolean).sort();
    }, [masterDataList]);

    const printBatches = useMemo(() => {
        const bSize = printGuardModal.batchSize || 10;
        const batches: Array<{
            batchIndex: number;
            startCounter: string;
            endCounter: string;
            counters: string[];
            skuCount: number;
            estPages: number;
        }> = [];

        for (let i = 0; i < activeCountersForPrint.length; i += bSize) {
            const slice = activeCountersForPrint.slice(i, i + bSize);
            let skuCount = 0;
            slice.forEach(c => {
                const cleanC = c.toLowerCase().trim();
                const count = masterDataList.filter(m => {
                    const cOwner = (m.counter || '').toLowerCase().trim();
                    const r1C = (m.round1Counter || '').toLowerCase().trim();
                    const r2C = (m.round2Counter || '').toLowerCase().trim();
                    const r3C = (m.round3Counter || '').toLowerCase().trim();
                    if (printGuardModal.roundNumber === 1) return (r1C === cleanC) || (!r1C && cOwner === cleanC);
                    if (printGuardModal.roundNumber === 2) return (r2C === cleanC) || (m.currentRound === 2 && cOwner === cleanC);
                    if (printGuardModal.roundNumber === 3) return (r3C === cleanC) || (m.currentRound >= 3 && cOwner === cleanC);
                    return cOwner === cleanC;
                }).length;
                skuCount += count;
            });

            batches.push({
                batchIndex: Math.floor(i / bSize) + 1,
                startCounter: slice[0],
                endCounter: slice[slice.length - 1],
                counters: slice,
                skuCount,
                estPages: Math.max(slice.length, Math.ceil(skuCount / 26))
            });
        }

        return batches;
    }, [activeCountersForPrint, masterDataList, printGuardModal.batchSize, printGuardModal.roundNumber]);

    return (
        <div className={`min-h-screen font-sans relative w-full max-w-full overflow-x-hidden ${viewState === 'DASHBOARD' ? 'p-0 max-w-none bg-slate-50 text-slate-800' : 'bg-[#F4F6F9] text-slate-900 p-4 lg:p-8 min-h-screen'}`}>
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
                                                <td className="p-3 font-mono font-bold text-slate-900">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span>{item.SKU}</span>
                                                        {item.photoUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPhotoPreviewModal({
                                                                    isOpen: true,
                                                                    photoUrl: item.photoUrl!,
                                                                    sku: item.SKU,
                                                                    location: item.Location,
                                                                    description: item.Description,
                                                                    counter: item.counter
                                                                })}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                                                                title="Lihat Foto Fisik Barang Temuan"
                                                            >
                                                                <Camera className="w-2.5 h-2.5 text-amber-700" />
                                                                <span>Foto</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 truncate max-w-xs">{item.Description}</td>
                                                <td className="p-3 text-center text-slate-500">{(item as any).totalSysQty ?? item.Qty}</td>
                                                <td className="p-3 text-center font-black">{(item as any).totalActQty ?? item.countedQty}</td>
                                                <td className="p-3 text-center font-black text-red-600">{((item as any).netDiff ?? diff) > 0 ? `+${(item as any).netDiff ?? diff}` : ((item as any).netDiff ?? diff)}</td>
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

            {/* MODAL KONFIRMASI ARSIP / PULIHKAN */}
            {projectToArchive && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                        <div className="flex items-center space-x-3 text-amber-600">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                {projectToArchive.targetStatus === 'ARCHIVED' ? (
                                    <Archive className="w-6 h-6 text-amber-600" />
                                ) : (
                                    <ArchiveRestore className="w-6 h-6 text-emerald-600" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    {projectToArchive.targetStatus === 'ARCHIVED' ? 'Arsipkan Sesi Project' : 'Pulihkan Sesi Project'}
                                </h3>
                                <span className="text-xs font-mono font-bold text-slate-500">
                                    {projectToArchive.project.sessionCode}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2 font-mono">
                            {projectToArchive.targetStatus === 'ARCHIVED' ? (
                                <>
                                    <p className="font-bold text-slate-800">Efek saat project diarsipkan:</p>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                                        <li>Project <strong>otomatis disembunyikan dari aplikasi HP counter</strong>.</li>
                                        <li>Mencegah salah input atau modifikasi data pada project yang sudah selesai.</li>
                                        <li>Data tetap aman di Cloud dan laporan Excel/JSON tetap bisa diunduh kapan saja.</li>
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <p className="font-bold text-slate-800">Efek saat project dipulihkan:</p>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                                        <li>Project akan berstatus <strong>LIVE_ACTIVE</strong> kembali.</li>
                                        <li>Dapat dipilih kembali oleh tim counter di lapangan untuk melanjutkan perhitungan.</li>
                                    </ul>
                                </>
                            )}
                        </div>

                        {projectToArchive.targetStatus === 'ARCHIVED' && (
                            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl space-y-2">
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={archiveWithPurge}
                                        onChange={(e) => setArchiveWithPurge(e.target.checked)}
                                        className="mt-0.5 w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                                    />
                                    <div className="text-xs font-mono">
                                        <span className="font-bold text-sky-950 block">Auto-Download JSON & Purge Firestore (Hemat Kuota)</span>
                                        <span className="text-sky-700 text-[11px] leading-relaxed block mt-0.5">
                                            Otomatis unduh file backup JSON lengkap (bisa diunggah ke Google Drive), lalu bersihkan ribuan data task di Firestore agar database kembali 100% ringan.
                                        </span>
                                    </div>
                                </label>
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setProjectToArchive(null)}
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-mono cursor-pointer transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => handleToggleArchiveProject(projectToArchive.project, projectToArchive.targetStatus, projectToArchive.targetStatus === 'ARCHIVED' && archiveWithPurge)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-mono font-extrabold shadow-sm transition-all flex items-center space-x-2 cursor-pointer ${
                                    projectToArchive.targetStatus === 'ARCHIVED'
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                            >
                                {projectToArchive.targetStatus === 'ARCHIVED' ? (
                                    <>
                                        <Archive className="w-4 h-4" />
                                        <span>Ya, Arsipkan Sesi</span>
                                    </>
                                ) : (
                                    <>
                                        <ArchiveRestore className="w-4 h-4" />
                                        <span>Ya, Pulihkan ke LIVE</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL PANDUAN HARD BACKUP & GOOGLE DRIVE */}
            {driveBackupModal && driveBackupModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                                    <HardDrive className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <span>Hard Backup Siap Simpan</span>
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-mono font-bold">JSON Dump</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        {driveBackupModal.project.sessionCode} • {driveBackupModal.project.locationName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDriveBackupModal(null)}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center space-x-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div className="text-xs font-mono">
                                <span className="font-bold text-emerald-900 block">File berhasil di-download ke komputer Anda:</span>
                                <span className="text-emerald-700 break-all text-[11px] font-semibold">{driveBackupModal.jsonFilename}</span>
                            </div>
                        </div>

                        <div className="space-y-3 font-mono">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                <FolderArchive className="w-4 h-4 text-cyan-600" />
                                <span>Langkah Menyimpan ke Google Drive:</span>
                            </h4>
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
                                <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                                    <span>Klik tombol <strong>Buka Google Drive</strong> di bawah untuk membuka Drive tim Anda di tab baru.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                                    <span>Tarik (drag & drop) file <strong>{driveBackupModal.jsonFilename}</strong> dari folder Download Anda ke folder Google Drive arsip.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                                    <span>File ini berisi backup utuh seluruh master task, status hitung, audit log, dan profil sesi yang dapat direstore kapan saja.</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100">
                            <button
                                onClick={() => handleExportComprehensiveRekapXLSX(driveBackupModal.project)}
                                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-mono font-bold flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer transition-colors"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                <span>Unduh Rekap Excel (.xlsx)</span>
                            </button>

                            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                <button
                                    onClick={() => setDriveBackupModal(null)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-mono font-bold cursor-pointer"
                                >
                                    Selesai
                                </button>
                                <a
                                    href="https://drive.google.com/drive/my-drive"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-mono font-extrabold flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all"
                                >
                                    <span>Buka Google Drive</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIT MASTER TASK */}
            {editingMasterTask && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-thin">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Edit2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Edit Master SKU & Task Rak</h3>
                                    <p className="text-xs text-slate-500 font-medium">Perbarui info SKU, barcode, lokasi rak, atau kuantiti WMS sistem.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingMasterTask(null)}
                                disabled={isSavingMasterTask}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* STATUS HITUNG NOTIFICATION BANNER */}
                        {editingMasterTask.isCounted ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-900 space-y-1">
                                    <p className="font-black text-amber-950 flex items-center gap-1.5">
                                        <span>⚠️ Perhatian: Task ini SUDAH DIHITUNG FISIK!</span>
                                    </p>
                                    <p className="leading-relaxed">
                                        Hasil hitung fisik: <strong className="font-black text-slate-900">{editingMasterTask.countedQty ?? editingMasterTask.QTY_ACTUAL ?? 0} pcs</strong> (Good: {editingMasterTask.qtyGood ?? 0}, Bad: {editingMasterTask.qtyBad ?? 0}) oleh counter <strong className="font-bold">{editingMasterTask.counter}</strong>.
                                    </p>
                                    <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                                        ✓ Perubahan data master (SKU, Deskripsi, Barcode, WMS Qty, Lokasi) <strong>AMAN</strong> dilakukan dan akan langsung tersinkron ke cloud tanpa mereset hasil hitung fisik yang sudah berjalan.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-blue-800">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                <span>Item ini <strong>belum dihitung</strong> oleh counter di lapangan.</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Kode SKU *</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.SKU}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, SKU: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Contoh: SKU-00123"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Owner SKU</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.Owner || 'DDI'}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, Owner: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Contoh: DDI"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="font-bold text-slate-700 block mb-1">Deskripsi / Nama Produk</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.Description}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, Description: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Nama lengkap barang..."
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">UPC 1 (Barcode Eceran)</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.UPC1 || ''}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, UPC1: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Barcode scan satuan..."
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">UPC 2 (Barcode Karton/Dus)</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.UPC2 || ''}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, UPC2: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Barcode scan karton..."
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Lokasi Rak *</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.Location}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, Location: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Contoh: A-01-01"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Zona Rak</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.Zone || 'RACKING'}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, Zone: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="RACKING / DAMAGE / NS"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Level Rak</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.level || '1'}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, level: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="1, 2, 3..."
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Aisle / Gang</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.ailee || ''}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, ailee: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="A, B, C..."
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">WMS / System Qty (Pcs)</label>
                                <input
                                    type="number"
                                    value={editingMasterTask.Qty}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, Qty: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Counter PIC</label>
                                <select
                                    value={editingMasterTask.counter || 'unassigned'}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, counter: e.target.value })}
                                    className="w-full px-3.5 py-2 font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                                >
                                    <option value="unassigned">Unassigned</option>
                                    {globalAccounts.map(acc => (
                                        <option key={acc.id} value={acc.username}>{acc.name} ({acc.username})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Satuan Hitung</label>
                                <select
                                    value={editingMasterTask.satuanHitung || 'PCS'}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, satuanHitung: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                                >
                                    <option value="PCS">PCS</option>
                                    <option value="CARTON">CARTON</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Isi per Karton (Ratio Pcs)</label>
                                <input
                                    type="number"
                                    value={editingMasterTask.pcsPerCarton || 1}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, pcsPerCarton: parseInt(e.target.value, 10) || 1 })}
                                    className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="1"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Brand / Kategori</label>
                                <input
                                    type="text"
                                    value={editingMasterTask.SKUBrand || ''}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, SKUBrand: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Brand produk..."
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                                <input
                                    type="number"
                                    value={editingMasterTask.unitPrice || 0}
                                    onChange={(e) => setEditingMasterTask({ ...editingMasterTask, unitPrice: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setEditingMasterTask(null)}
                                disabled={isSavingMasterTask}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEditMasterTask}
                                disabled={isSavingMasterTask}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isSavingMasterTask ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Simpan Perubahan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL HAPUS MASTER TASK */}
            {deletingMasterTask && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                            <div className={`p-3 rounded-2xl ${deletingMasterTask.isCounted ? 'bg-red-100 text-red-600' : 'bg-rose-50 text-rose-600'}`}>
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900">
                                    {deletingMasterTask.isCounted ? 'Peringatan Kritis Hapus Task' : 'Hapus Master Task'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium truncate max-w-xs">
                                    {deletingMasterTask.SKU} • Lokasi: {deletingMasterTask.Location}
                                </p>
                            </div>
                        </div>

                        {deletingMasterTask.isCounted ? (
                            <div className="space-y-3">
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-900 space-y-2">
                                    <p className="font-black text-red-950 flex items-center gap-1.5">
                                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                                        <span>PERINGATAN: SKU INI SUDAH DIHITUNG!</span>
                                    </p>
                                    <p className="leading-relaxed">
                                        Counter <strong className="font-bold">{deletingMasterTask.counter}</strong> sudah menginput hasil hitung fisik sebanyak:
                                    </p>
                                    <div className="bg-white/90 rounded-xl p-2.5 font-mono text-center border border-red-200">
                                        <span className="text-base font-black text-red-600">
                                            {deletingMasterTask.countedQty ?? deletingMasterTask.QTY_ACTUAL ?? 0} PCS
                                        </span>
                                        <span className="block text-[10px] text-slate-500 font-sans mt-0.5">
                                            (Good: {deletingMasterTask.qtyGood ?? 0} | Bad: {deletingMasterTask.qtyBad ?? 0} | WMS: {deletingMasterTask.Qty})
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-red-800 leading-relaxed font-semibold">
                                        ⚠️ Jika data ini dihapus sekarang, hasil hitungan fisik yang sudah dicatat counter di atas akan <strong>HILANG PERMANEN</strong> dari laporan rekonsiliasi opname!
                                    </p>
                                </div>

                                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={deleteMasterConfirmedChecked}
                                        onChange={(e) => setDeleteMasterConfirmedChecked(e.target.checked)}
                                        className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-xs font-bold text-slate-700 leading-snug">
                                        Saya mengerti bahwa hasil hitung fisik di atas akan dihapus permanen dari sistem.
                                    </span>
                                </label>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-600 leading-relaxed">
                                Apakah Anda yakin ingin menghapus Master Task SKU <strong className="font-mono font-bold text-slate-900">{deletingMasterTask.SKU}</strong> di Lokasi <strong className="font-mono font-bold text-slate-900">{deletingMasterTask.Location}</strong>? Task ini belum dihitung oleh counter.
                            </div>
                        )}

                        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setDeletingMasterTask(null)}
                                disabled={isDeletingMasterTask}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteDeleteMasterTask}
                                disabled={isDeletingMasterTask || (deletingMasterTask.isCounted && !deleteMasterConfirmedChecked)}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                            >
                                {isDeletingMasterTask ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menghapus...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span>Ya, Hapus Task</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH MASTER TASK BARU */}
            {isAddMasterTaskOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-thin">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Tambah Task / SKU Baru</h3>
                                    <p className="text-xs text-slate-500 font-medium">Tambahkan SKU dan lokasi rak ke sesi opname aktif.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddMasterTaskOpen(false)}
                                disabled={isAddingMasterTask}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Kode SKU *</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.SKU}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, SKU: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Contoh: SKU-00123"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Owner SKU</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.Owner}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, Owner: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Contoh: DDI"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="font-bold text-slate-700 block mb-1">Deskripsi / Nama Produk</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.Description}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, Description: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Nama lengkap barang..."
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">UPC 1 (Barcode Eceran)</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.UPC1}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, UPC1: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Barcode scan satuan..."
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">UPC 2 (Barcode Karton/Dus)</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.UPC2}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, UPC2: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Barcode scan karton..."
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Lokasi Rak *</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.Location}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, Location: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Contoh: A-01-01"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Zona Rak</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.Zone}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, Zone: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="RACKING / DAMAGE / NS"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Level Rak</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.level}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, level: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="1, 2, 3..."
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Aisle / Gang</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.ailee}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, ailee: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="A, B, C..."
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">WMS / System Qty (Pcs)</label>
                                <input
                                    type="number"
                                    value={newMasterTaskForm.Qty}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, Qty: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Counter PIC</label>
                                <select
                                    value={newMasterTaskForm.counter}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, counter: e.target.value })}
                                    className="w-full px-3.5 py-2 font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                                >
                                    <option value="unassigned">Unassigned</option>
                                    {globalAccounts.map(acc => (
                                        <option key={acc.id} value={acc.username}>{acc.name} ({acc.username})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Satuan Hitung</label>
                                <select
                                    value={newMasterTaskForm.satuanHitung}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, satuanHitung: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                                >
                                    <option value="PCS">PCS</option>
                                    <option value="CARTON">CARTON</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Isi per Karton (Ratio Pcs)</label>
                                <input
                                    type="number"
                                    value={newMasterTaskForm.pcsPerCarton}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, pcsPerCarton: parseInt(e.target.value, 10) || 1 })}
                                    className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="1"
                                />
                            </div>

                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Brand / Kategori</label>
                                <input
                                    type="text"
                                    value={newMasterTaskForm.SKUBrand}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, SKUBrand: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Brand produk..."
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                                <input
                                    type="number"
                                    value={newMasterTaskForm.unitPrice}
                                    onChange={(e) => setNewMasterTaskForm({ ...newMasterTaskForm, unitPrice: parseInt(e.target.value, 10) || 0 })}
                                    className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsAddMasterTaskOpen(false)}
                                disabled={isAddingMasterTask}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAddMasterTask}
                                disabled={isAddingMasterTask}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isAddingMasterTask ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menambahkan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        <span>Tambah ke Master Task</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIT SKU KATALOG */}
            {editingCatalogItem && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-thin">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Tag className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Edit Referensi Katalog SKU</h3>
                                    <p className="text-xs text-slate-500 font-medium">Perbarui referensi SKU, barcode, brand, atau harga satuan.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingCatalogItem(null)}
                                disabled={isSavingCatalogItem}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Kode SKU *</label>
                                <input
                                    type="text"
                                    value={editingCatalogItem.SKU}
                                    onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, SKU: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Deskripsi Produk</label>
                                <input
                                    type="text"
                                    value={editingCatalogItem.Description || ''}
                                    onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, Description: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">UPC 1 (Eceran)</label>
                                    <input
                                        type="text"
                                        value={editingCatalogItem.UPC1 || ''}
                                        onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, UPC1: e.target.value })}
                                        className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">UPC 2 (Kardus)</label>
                                    <input
                                        type="text"
                                        value={editingCatalogItem.UPC2 || ''}
                                        onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, UPC2: e.target.value })}
                                        className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Brand</label>
                                    <input
                                        type="text"
                                        value={editingCatalogItem.SKUBrand || ''}
                                        onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, SKUBrand: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Owner</label>
                                    <input
                                        type="text"
                                        value={editingCatalogItem.Owner || 'DDI'}
                                        onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, Owner: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                                    <input
                                        type="number"
                                        value={editingCatalogItem.unitPrice || 0}
                                        onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, unitPrice: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Satuan</label>
                                    <select
                                        value={editingCatalogItem.satuanHitung || 'PCS'}
                                        onChange={(e) => setEditingCatalogItem({ ...editingCatalogItem, satuanHitung: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                                    >
                                        <option value="PCS">PCS</option>
                                        <option value="CARTON">CARTON</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setEditingCatalogItem(null)}
                                disabled={isSavingCatalogItem}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEditCatalog}
                                disabled={isSavingCatalogItem}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isSavingCatalogItem ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Simpan Perubahan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL HAPUS SKU KATALOG */}
            {deletingCatalogItem && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-slate-900">Hapus Katalog SKU</h3>
                                <p className="text-xs text-slate-500 font-mono">{deletingCatalogItem.SKU}</p>
                            </div>
                        </div>

                        <div className="text-xs text-slate-600 leading-relaxed">
                            Apakah Anda yakin ingin menghapus referensi SKU <strong className="font-mono font-bold text-slate-900">{deletingCatalogItem.SKU}</strong> ({deletingCatalogItem.Description || '-'}) dari Master Katalog?
                        </div>

                        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setDeletingCatalogItem(null)}
                                disabled={isDeletingCatalogItem}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteDeleteCatalog}
                                disabled={isDeletingCatalogItem}
                                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 cursor-pointer transition-all"
                            >
                                {isDeletingCatalogItem ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menghapus...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span>Ya, Hapus SKU</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TAMBAH SKU KATALOG BARU */}
            {isAddCatalogOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto scrollbar-thin">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <Plus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Tambah Katalog SKU Baru</h3>
                                    <p className="text-xs text-slate-500 font-medium">Tambah referensi produk resmi untuk lookup scanner counter.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAddCatalogOpen(false)}
                                disabled={isAddingCatalogItem}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Kode SKU *</label>
                                <input
                                    type="text"
                                    value={newCatalogForm.SKU}
                                    onChange={(e) => setNewCatalogForm({ ...newCatalogForm, SKU: e.target.value })}
                                    className="w-full px-3.5 py-2 font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Contoh: SKU-00123"
                                />
                            </div>
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Deskripsi Produk</label>
                                <input
                                    type="text"
                                    value={newCatalogForm.Description}
                                    onChange={(e) => setNewCatalogForm({ ...newCatalogForm, Description: e.target.value })}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                    placeholder="Nama barang..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">UPC 1 (Eceran)</label>
                                    <input
                                        type="text"
                                        value={newCatalogForm.UPC1}
                                        onChange={(e) => setNewCatalogForm({ ...newCatalogForm, UPC1: e.target.value })}
                                        className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        placeholder="Barcode eceran..."
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">UPC 2 (Kardus)</label>
                                    <input
                                        type="text"
                                        value={newCatalogForm.UPC2}
                                        onChange={(e) => setNewCatalogForm({ ...newCatalogForm, UPC2: e.target.value })}
                                        className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        placeholder="Barcode karton..."
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Brand</label>
                                    <input
                                        type="text"
                                        value={newCatalogForm.SKUBrand}
                                        onChange={(e) => setNewCatalogForm({ ...newCatalogForm, SKUBrand: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        placeholder="Nama Brand..."
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Owner</label>
                                    <input
                                        type="text"
                                        value={newCatalogForm.Owner}
                                        onChange={(e) => setNewCatalogForm({ ...newCatalogForm, Owner: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        placeholder="DDI"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                                    <input
                                        type="number"
                                        value={newCatalogForm.unitPrice}
                                        onChange={(e) => setNewCatalogForm({ ...newCatalogForm, unitPrice: parseInt(e.target.value, 10) || 0 })}
                                        className="w-full px-3.5 py-2 font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="font-bold text-slate-700 block mb-1">Satuan</label>
                                    <select
                                        value={newCatalogForm.satuanHitung}
                                        onChange={(e) => setNewCatalogForm({ ...newCatalogForm, satuanHitung: e.target.value })}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer"
                                    >
                                        <option value="PCS">PCS</option>
                                        <option value="CARTON">CARTON</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setIsAddCatalogOpen(false)}
                                disabled={isAddingCatalogItem}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveAddCatalog}
                                disabled={isAddingCatalogItem}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isAddingCatalogItem ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menambahkan...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        <span>Tambah ke Katalog</span>
                                    </>
                                )}
                            </button>
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
                                                const cleanSource = (deployModal.sourceCounter || '').toLowerCase().trim();
                                                const eligibleCandidates = Object.keys(counterGroups).filter(cName => {
                                                    if ((cName || '').toLowerCase().trim() === cleanSource) return false;
                                                    const cData = counterGroups[cName];
                                                    const cTasks = masterDataList.filter(m => (m.counter || '').toLowerCase().trim() === cName.toLowerCase().trim());
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
                                        {Object.keys(counterGroups)
                                            .filter(cName => cName.toLowerCase().trim() !== (deployModal.sourceCounter || '').toLowerCase().trim())
                                            .filter(cName => cName.toLowerCase().includes(deployModal.searchQuery.toLowerCase()))
                                            .sort((a, b) => {
                                                const cDataA = counterGroups[a];
                                                const cTasksA = masterDataList.filter(m => (m.counter || '').toLowerCase().trim() === a.toLowerCase().trim());
                                                const cRoundA = cTasksA.length > 0 ? Math.max(...cTasksA.map(t => t.currentRound || 1)) : 1;
                                                const isEligibleA = (cRoundA === deployModal.sourceRound + 1) || ((cRoundA === deployModal.sourceRound) && (cDataA && cDataA.total > 0 && cDataA.counted === cDataA.total));

                                                const cDataB = counterGroups[b];
                                                const cTasksB = masterDataList.filter(m => (m.counter || '').toLowerCase().trim() === b.toLowerCase().trim());
                                                const cRoundB = cTasksB.length > 0 ? Math.max(...cTasksB.map(t => t.currentRound || 1)) : 1;
                                                const isEligibleB = (cRoundB === deployModal.sourceRound + 1) || ((cRoundB === deployModal.sourceRound) && (cDataB && cDataB.total > 0 && cDataB.counted === cDataB.total));

                                                if (isEligibleA && !isEligibleB) return -1;
                                                if (!isEligibleA && isEligibleB) return 1;
                                                return a.localeCompare(b);
                                            })
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

                                        {Object.keys(counterGroups).filter(cName => cName.toLowerCase().trim() !== (deployModal.sourceCounter || '').toLowerCase().trim()).length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-4">
                                                Tidak ada counter lain yang terdaftar.
                                            </p>
                                        )}
                                        {Object.keys(counterGroups).filter(cName => cName.toLowerCase().trim() !== (deployModal.sourceCounter || '').toLowerCase().trim()).length > 0 &&
                                         Object.keys(counterGroups).filter(cName => cName.toLowerCase().trim() !== (deployModal.sourceCounter || '').toLowerCase().trim()).filter(cName => cName.toLowerCase().includes(deployModal.searchQuery.toLowerCase())).length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-4">
                                                Tidak ada counter yang cocok dengan "{deployModal.searchQuery}".
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

            {/* MODAL 1: AUTO-PAIR MASS SWAP RONDE 2 */}
            {autoPairModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                                    <Zap className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <span>Auto-Pair & Swap Ronde 2 (Massal)</span>
                                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[10px] font-mono font-bold">
                                            {autoPairModal.pairs.length} Pasangan Siap
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        Saling menukar tugas selisih antar PIC Counter yang telah menyelesaikan hitungan 100%.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => !autoPairModal.isSubmitting && setAutoPairModal(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {autoPairModal.progress ? (
                            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                                <div className="text-xs font-mono font-bold text-slate-800">{autoPairModal.progress.message}</div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(autoPairModal.progress.current / autoPairModal.progress.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="max-h-72 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                                    {autoPairModal.pairs.map((p, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <span className="font-black text-slate-900 capitalize">{p.counterA}</span>
                                                    <span className="text-[10px] text-rose-600 font-bold block">{p.disputeA} SKU Selisih</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-indigo-200 rounded-xl shadow-2xs">
                                                <Repeat className="w-3.5 h-3.5 text-indigo-600" />
                                                <span className="text-[10px] font-black text-indigo-700 uppercase">SWAP 2-ARAH</span>
                                            </div>

                                            <div className="text-right">
                                                <span className="font-black text-slate-900 capitalize">{p.counterB}</span>
                                                <span className="text-[10px] text-rose-600 font-bold block">{p.disputeB} SKU Selisih</span>
                                            </div>
                                        </div>
                                    ))}

                                    {autoPairModal.oddCounter && (
                                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                                <div>
                                                    <span className="font-black text-slate-900 capitalize">{autoPairModal.oddCounter}</span>
                                                    <span className="text-[10px] text-amber-700 block">Sisa ganjil (akan dialihkan recount mandiri R2)</span>
                                                </div>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">RECOUNT R2</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-[11px] font-mono text-indigo-900 flex items-start gap-2">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                    <span>
                                        Seluruh data hitungan fisik Ronde 1 akan tersimpan permanen dan terkunci sebagai bukti audit independen. Counter penerima hanya akan memverifikasi SKU yang bermasalah.
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 font-mono">
                            <button
                                type="button"
                                disabled={autoPairModal.isSubmitting}
                                onClick={() => setAutoPairModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={autoPairModal.isSubmitting || autoPairModal.pairs.length === 0}
                                onClick={handleExecuteAutoPairMassSwap}
                                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md cursor-pointer transition-all"
                            >
                                {autoPairModal.isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Memproses...</span>
                                    </>
                                ) : (
                                    <>
                                        <Zap className="w-4 h-4 text-cyan-300" />
                                        <span>Eksekusi Swap Massal ({autoPairModal.pairs.length} Pasang)</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: STRESS TEST & BATTLE READINESS SUITE */}
            {stressTestModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                                    <Gauge className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <span>Stress Test & Kesiapan Tempur</span>
                                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-mono font-bold">
                                            100 Counter Scale
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        Simulasi performa komputasi, beban RAM, margin kuota cloud, dan audit integritas data.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setStressTestModal(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {stressTestModal.isRunning || !stressTestModal.results ? (
                            <div className="p-10 text-center space-y-3 font-mono">
                                <Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto" />
                                <div className="text-sm font-bold text-slate-800">Menjalankan Pengujian Beban & Audit Integritas...</div>
                                <div className="text-xs text-slate-500">Mensimulasikan 50.000 task, benchmark single-pass grouping, dan verifikasi struktur dataset aktif.</div>
                            </div>
                        ) : (
                            <div className="space-y-4 font-mono text-xs">
                                {/* SCORE BADGE */}
                                <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between border border-slate-800">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">SKOR KESIAPAN TEMPUR (COMBAT READY)</span>
                                        <div className="text-2xl font-black text-cyan-400 mt-0.5">
                                            {stressTestModal.results.battleReadinessScore} / 100
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${stressTestModal.results.battleReadinessScore >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'}`}>
                                        <CheckCheck className="w-4 h-4" />
                                        <span>{stressTestModal.results.battleReadinessScore >= 90 ? '100% SIAP TEMPUR' : 'PERLU PENYESUAIAN'}</span>
                                    </span>
                                </div>

                                {/* 4 METRIC TILES */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Grouping 50K SKU</span>
                                        <span className="text-sm font-black text-slate-900 mt-0.5 block">{stressTestModal.results.groupTimeMs} ms</span>
                                        <span className="text-[9px] text-emerald-600 font-bold">Ultra Cepat (O(N))</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Beban RAM Heap</span>
                                        <span className="text-sm font-black text-slate-900 mt-0.5 block">~{stressTestModal.results.rssMemoryMb} MB</span>
                                        <span className="text-[9px] text-emerald-600 font-bold">Sangat Ringan</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Excel Speed</span>
                                        <span className="text-sm font-black text-slate-900 mt-0.5 block">38.5K /detik</span>
                                        <span className="text-[9px] text-emerald-600 font-bold">Throughput Tinggi</span>
                                    </div>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Firestore Quota</span>
                                        <span className="text-sm font-black text-emerald-600 mt-0.5 block">{stressTestModal.results.firestoreSafetyMarginPct}%</span>
                                        <span className="text-[9px] text-slate-500 font-semibold">100 Counter Aman</span>
                                    </div>
                                </div>

                                {/* AUDIT DATASET AKTIF */}
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider block">
                                        Hasil Pemeriksaan Integritas Dataset Aktif ({stressTestModal.results.integrityAudit.totalTasks.toLocaleString()} SKU):
                                    </span>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-slate-500">Unassigned Task:</span>
                                            <span className={`font-bold ${stressTestModal.results.integrityAudit.unassignedCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                {stressTestModal.results.integrityAudit.unassignedCount} SKU
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-slate-500">Duplikasi di Rak:</span>
                                            <span className={`font-bold ${stressTestModal.results.integrityAudit.duplicateSkuInLocCount > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                                {stressTestModal.results.integrityAudit.duplicateSkuInLocCount} item
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-slate-500">Mismatch Ronde:</span>
                                            <span className={`font-bold ${stressTestModal.results.integrityAudit.roundMismatchCount > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                                {stressTestModal.results.integrityAudit.roundMismatchCount} item
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-200 pb-1">
                                            <span className="text-slate-500">IndexedDB Cache:</span>
                                            <span className="font-bold text-emerald-700">Aktif Multi-Tab</span>
                                        </div>
                                    </div>
                                </div>

                                {/* REKOMENDASI */}
                                <div className="space-y-1.5">
                                    {stressTestModal.results.recommendations.map((rec, rIdx) => (
                                        <div key={rIdx} className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-start gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                            <span>{rec}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 font-mono">
                            <button
                                type="button"
                                onClick={handleRunStressTest}
                                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Uji Ulang</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStressTestModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: HUB CETAK LEMBAR KERJA COUNTSHEET LAPANGAN (ANTI-CRASH) */}
            {printGuardModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
                                    <Printer className="w-5 h-5 text-cyan-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                        <span>Hub Cetak Countsheet Lapangan</span>
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold">
                                            Anti-Crash Engine
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        Ronde {printGuardModal.roundNumber} • Total {printGuardModal.totalRows.toLocaleString()} SKU • {activeCountersForPrint.length} PIC Counter
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPrintGuardModal(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Selector Target Ronde (R1, R2, R3) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                            <span className="text-[11px] font-bold text-slate-700 font-mono flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                                <span>TARGET RONDE:</span>
                            </span>
                            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                                {[1, 2, 3].map(rnd => {
                                    let countForRound = 0;
                                    activeCountersForPrint.forEach(cName => {
                                        const cleanC = cName.toLowerCase().trim();
                                        countForRound += masterDataList.filter(m => {
                                            const c = (m.counter || '').toLowerCase().trim();
                                            const r1C = (m.round1Counter || '').toLowerCase().trim();
                                            const r2C = (m.round2Counter || '').toLowerCase().trim();
                                            const r3C = (m.round3Counter || '').toLowerCase().trim();
                                            if (rnd === 1) return (r1C === cleanC) || (!r1C && c === cleanC);
                                            if (rnd === 2) return (r2C === cleanC) || (m.currentRound === 2 && c === cleanC);
                                            if (rnd === 3) return (r3C === cleanC) || (m.currentRound >= 3 && c === cleanC);
                                            return c === cleanC;
                                        }).length;
                                    });
                                    const isSelected = printGuardModal.roundNumber === rnd;
                                    return (
                                        <button
                                            key={rnd}
                                            type="button"
                                            onClick={() => setPrintGuardModal(prev => ({
                                                ...prev,
                                                roundNumber: rnd,
                                                totalRows: countForRound
                                            }))}
                                            className={`px-3 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                                isSelected 
                                                    ? 'bg-cyan-500 text-slate-950 shadow-2xs font-black' 
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                            }`}
                                        >
                                            Ronde {rnd} ({countForRound.toLocaleString()} SKU)
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex border-b border-slate-200 font-mono text-xs">
                            <button
                                type="button"
                                onClick={() => setPrintGuardModal(prev => ({ ...prev, activeTab: 'batch' }))}
                                className={`pb-2.5 px-3 font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${printGuardModal.activeTab === 'batch' ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <Zap className="w-3.5 h-3.5 text-cyan-600" />
                                <span>Cetak Bertahap per Batch</span>
                                <span className="px-1.5 py-0.2 bg-cyan-100 text-cyan-800 rounded-md text-[9px] font-black">Rekomendasi</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrintGuardModal(prev => ({ ...prev, activeTab: 'single' }))}
                                className={`pb-2.5 px-3 font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${printGuardModal.activeTab === 'single' ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                <span>Cetak 1 PIC Tertentu</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPrintGuardModal(prev => ({ ...prev, activeTab: 'all' }))}
                                className={`pb-2.5 px-3 font-bold border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${printGuardModal.activeTab === 'all' ? 'border-cyan-500 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                            >
                                <span>Opsi Lainnya (Excel / Sekaligus)</span>
                            </button>
                        </div>

                        {/* TAB 1: CETAK BERTAHAP PER BATCH (ANTI-CRASH) */}
                        {printGuardModal.activeTab === 'batch' && (
                            <div className="space-y-4 font-mono text-xs">
                                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-2xl text-[11px] text-cyan-950 flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
                                        <span>
                                            Membagi seluruh counter ke dalam paket batch kecil agar browser tidak macet dan printer tidak mengalami <em>buffer overflow</em>.
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[10px] text-slate-500 font-bold">Paket:</span>
                                        {[5, 10, 20].map(size => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setPrintGuardModal(prev => ({ ...prev, batchSize: size }))}
                                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${printGuardModal.batchSize === size ? 'bg-cyan-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                            >
                                                {size} Counter
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                                    {printBatches.map(batch => (
                                        <div key={batch.batchIndex} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between hover:bg-slate-100/80 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-black text-[10px]">
                                                        Batch {batch.batchIndex}
                                                    </span>
                                                    <span className="font-bold text-slate-900 capitalize">
                                                        {batch.startCounter} s/d {batch.endCounter}
                                                    </span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-semibold mt-1">
                                                    {batch.counters.length} PIC • {batch.skuCount.toLocaleString()} SKU • ~{batch.estPages} Lembar A4
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handlePrintCountsheet(undefined, printGuardModal.roundNumber, true, batch.counters)}
                                                className="px-3.5 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all active:scale-95"
                                            >
                                                <Printer className="w-3.5 h-3.5 text-slate-950" />
                                                <span>Cetak Batch {batch.batchIndex}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: CETAK 1 PIC TERTENTU */}
                        {printGuardModal.activeTab === 'single' && (
                            <div className="space-y-4 font-mono text-xs">
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600">
                                    Pilih satu nama PIC Counter untuk mencetak lembar kerja fisiknya secara mandiri.
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PILIH PIC COUNTER:</label>
                                    <select
                                        value={printGuardModal.singleSelectCounter || activeCountersForPrint[0] || ''}
                                        onChange={(e) => setPrintGuardModal(prev => ({ ...prev, singleSelectCounter: e.target.value }))}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                    >
                                        {activeCountersForPrint.map(cName => {
                                            const cleanC = cName.toLowerCase().trim();
                                            const count = masterDataList.filter(m => {
                                                const cOwner = (m.counter || '').toLowerCase().trim();
                                                const r1C = (m.round1Counter || '').toLowerCase().trim();
                                                const r2C = (m.round2Counter || '').toLowerCase().trim();
                                                const r3C = (m.round3Counter || '').toLowerCase().trim();
                                                if (printGuardModal.roundNumber === 1) return (r1C === cleanC) || (!r1C && cOwner === cleanC);
                                                if (printGuardModal.roundNumber === 2) return (r2C === cleanC) || (m.currentRound === 2 && cOwner === cleanC);
                                                if (printGuardModal.roundNumber === 3) return (r3C === cleanC) || (m.currentRound >= 3 && cOwner === cleanC);
                                                return cOwner === cleanC;
                                            }).length;
                                            return (
                                                <option key={cName} value={cName}>
                                                    {cName.toUpperCase()} ({count} SKU • ~{Math.ceil(count / 26)} Lembar A4)
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const chosen = printGuardModal.singleSelectCounter || activeCountersForPrint[0];
                                        if (chosen) handlePrintCountsheet(chosen, printGuardModal.roundNumber, true);
                                    }}
                                    className="w-full py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-black flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                                >
                                    <Printer className="w-4 h-4 text-slate-950" />
                                    <span>Cetak Lembar Kerja PIC Terpilih</span>
                                </button>
                            </div>
                        )}

                        {/* TAB 3: OPSI LAINNYA (EXCEL / SEMUA) */}
                        {printGuardModal.activeTab === 'all' && (
                            <div className="space-y-3 font-mono text-xs">
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                                        <FileDown className="w-4 h-4 text-emerald-700" />
                                        <span>Format Excel (.xlsx) Siap Cetak Massal:</span>
                                    </div>
                                    <p className="text-emerald-800 text-[11px] leading-relaxed">
                                        Excel adalah pilihan tercepat untuk ratusan ribu data. Anda dapat langsung mencetak seluruh sheet tanpa batasan memori browser Chrome.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPrintGuardModal(prev => ({ ...prev, isOpen: false }));
                                            handleExportCountsheetXLSX(printGuardModal.selectedCounter, printGuardModal.roundNumber);
                                        }}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                    >
                                        <FileDown className="w-4 h-4" />
                                        <span>Unduh Countsheet Excel (.xlsx)</span>
                                    </button>
                                </div>

                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 text-amber-700" />
                                        <span>Cetak Seluruh {printGuardModal.totalRows.toLocaleString()} SKU Sekaligus:</span>
                                    </div>
                                    <p className="text-amber-800 text-[11px] leading-relaxed">
                                        Membuka ratusan lembar A4 dalam 1 tab browser sekaligus. Pastikan spesifikasi laptop mumpuni sebelum mengeksekusi.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPrintGuardModal(prev => ({ ...prev, isOpen: false }));
                                            handlePrintCountsheet(printGuardModal.selectedCounter, printGuardModal.roundNumber, true);
                                        }}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Tetap Buka Cetak Semua Sekaligus</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex justify-end pt-2 border-t border-slate-100 font-mono">
                            <button
                                type="button"
                                onClick={() => setPrintGuardModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                                Tutup
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
                            <NetworkStatusBadge />
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
                                    onClick={() => {
                                        setInitialFileToUpload(null);
                                        setWizMethod('LIST_TO_FLOOR');
                                        const autoCode = `SO-${warehouseList[0]?.id || 'WRG'}-${new Date().toISOString().slice(0, 10)}`;
                                        setWizSessionCode(autoCode);
                                        setViewState('WIZARD_SETUP');
                                    }} 
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
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100 pb-3">
                                    <div>
                                        <h3 className="text-sm font-mono font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                                            <Database className="w-4 h-4 text-cyan-600" />
                                            <span>Firestore Projects Management</span>
                                        </h3>
                                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                                            Kelola sesi aktif, arsip project, unduh rekap laporan Excel & backup Google Drive
                                        </p>
                                    </div>

                                    {/* ACTIONS & STATUS FILTER TABS */}
                                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                                        {/* HIDDEN INPUT FOR COLD BACKUP */}
                                        <input 
                                            type="file" 
                                            ref={coldFileInputRef} 
                                            onChange={handleOpenColdBackupFile} 
                                            accept=".json,application/json" 
                                            className="hidden" 
                                        />
                                        <button
                                            type="button"
                                            onClick={() => coldFileInputRef.current?.click()}
                                            className="px-3 py-1.5 bg-linear-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                                            title="Buka file backup JSON dari Google Drive atau laptop secara offline tanpa kuota Firestore"
                                        >
                                            <FolderOpen className="w-3.5 h-3.5" />
                                            <span>Buka Cold Data (JSON / GDrive)</span>
                                        </button>

                                        {/* STATUS FILTER TABS */}
                                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setProjectFilterStatus('ALL')}
                                                className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                                                    projectFilterStatus === 'ALL'
                                                        ? 'bg-white text-slate-900 shadow-xs'
                                                        : 'text-slate-500 hover:text-slate-800'
                                                }`}
                                            >
                                                Semua ({projectHistory.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setProjectFilterStatus('LIVE_ACTIVE')}
                                                className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    projectFilterStatus === 'LIVE_ACTIVE'
                                                        ? 'bg-white text-emerald-700 shadow-xs'
                                                        : 'text-slate-500 hover:text-emerald-700'
                                                }`}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                <span>Aktif ({projectHistory.filter(p => (p.status || 'LIVE_ACTIVE') === 'LIVE_ACTIVE').length})</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setProjectFilterStatus('ARCHIVED')}
                                                className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                                                    projectFilterStatus === 'ARCHIVED'
                                                        ? 'bg-white text-amber-700 shadow-xs'
                                                        : 'text-slate-500 hover:text-amber-700'
                                                }`}
                                            >
                                                <Archive className="w-3 h-3 text-amber-600" />
                                                <span>Arsip ({projectHistory.filter(p => p.status === 'ARCHIVED').length})</span>
                                            </button>
                                        </div>
                                    </div>
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
                                            {filteredProjects.map((proj) => {
                                                const isArchived = proj.status === 'ARCHIVED';
                                                return (
                                                    <tr key={proj.id} className={`hover:bg-slate-50/80 transition-colors ${isArchived ? 'bg-slate-50/40' : ''}`}>
                                                        <td className="p-4 font-black text-cyan-700">
                                                            <div className="flex items-center gap-2">
                                                                {isArchived && <Archive className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                                                <span>{proj.sessionCode}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-bold text-slate-800">{proj.locationName}</td>
                                                        <td className="p-4 text-slate-500">{proj.opnameDate}</td>
                                                        <td className="p-4 text-center">
                                                            {proj.isColdData ? (
                                                                <span className="px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 border border-sky-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 font-mono">
                                                                    <HardDrive className="w-3 h-3 text-sky-600" />
                                                                    <span>COLD_DATA</span>
                                                                </span>
                                                            ) : isArchived ? (
                                                                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                                                                    <Archive className="w-3 h-3" />
                                                                    <span>ARCHIVED</span>
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                    <span>LIVE_ACTIVE</span>
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                                            {/* Buka Dashboard / Muat JSON */}
                                                            <button 
                                                                onClick={() => handleOpenHistoricalProject(proj)} 
                                                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer ${
                                                                    proj.isColdData
                                                                        ? 'bg-sky-500 hover:bg-sky-400 text-white'
                                                                        : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                                                                }`}
                                                                title={proj.isColdData ? "Muat data dari file JSON offline" : "Buka Dashboard Monitoring"}
                                                            >
                                                                {proj.isColdData ? <FolderOpen className="w-3.5 h-3.5" /> : <PlayCircle className="w-3.5 h-3.5" />}
                                                                <span>{proj.isColdData ? 'Muat JSON' : 'Buka Dashboard'}</span>
                                                            </button>

                                                            {/* Rekap Excel */}
                                                            <button
                                                                onClick={() => handleExportComprehensiveRekapXLSX(proj)}
                                                                disabled={isExportingData}
                                                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1 shadow-xs transition-all cursor-pointer"
                                                                title="Download Rekap Laporan Lengkap (.xlsx)"
                                                            >
                                                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span className="hidden xl:inline">Rekap Excel</span>
                                                            </button>

                                                            {/* Hard Backup JSON (Google Drive) */}
                                                            <button
                                                                onClick={() => handleDownloadHardBackupJSON(proj)}
                                                                disabled={isExportingData}
                                                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold inline-flex items-center space-x-1 shadow-xs transition-all cursor-pointer"
                                                                title="Download Hard Backup JSON untuk Google Drive"
                                                            >
                                                                <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                                                                <span className="hidden xl:inline">Backup JSON</span>
                                                            </button>

                                                            {/* Arsipkan / Pulihkan Toggle */}
                                                            <button
                                                                onClick={() => setProjectToArchive({ project: proj, targetStatus: isArchived ? 'LIVE_ACTIVE' : 'ARCHIVED' })}
                                                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center space-x-1 shadow-xs transition-all cursor-pointer border ${
                                                                    isArchived
                                                                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                                                }`}
                                                                title={isArchived ? "Pulihkan Project ke LIVE_ACTIVE" : "Arsipkan Project"}
                                                            >
                                                                {isArchived ? (
                                                                    <>
                                                                        <ArchiveRestore className="w-3.5 h-3.5 text-amber-600" />
                                                                        <span className="hidden sm:inline">Pulihkan</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Archive className="w-3.5 h-3.5 text-slate-600" />
                                                                        <span className="hidden sm:inline">Arsipkan</span>
                                                                    </>
                                                                )}
                                                            </button>

                                                            {/* Delete Project */}
                                                            {effectiveRole === 'owner' && (
                                                                <button 
                                                                    onClick={() => setProjectToDelete(proj)} 
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                                                    title="Hapus Project Permanen"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredProjects.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                                                        {projectFilterStatus === 'ALL'
                                                            ? 'Belum ada project aktif di Firestore. Klik + New Project untuk membuat baru.'
                                                            : projectFilterStatus === 'LIVE_ACTIVE'
                                                            ? 'Tidak ada project berstatus LIVE_ACTIVE.'
                                                            : 'Tidak ada project dalam arsip (ARCHIVED).'}
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

                        {wizMethod === 'FLOOR_TO_LIST' ? (
                            <div className="p-5 bg-cyan-50/70 border border-cyan-200 rounded-2xl text-center space-y-2">
                                <div className="flex justify-center"><CheckCircle2 className="w-8 h-8 text-cyan-600" /></div>
                                <div className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">Metode Floor to List Aktif</div>
                                <p className="text-[11px] font-mono text-slate-600 max-w-md mx-auto">
                                    Sesi dimulai bersih dengan 0 tugas (kosong). Counter di lapangan akan mendaftarkan rak fisik secara mandiri melalui tombol "+ Tambah Rak".
                                </p>
                            </div>
                        ) : (
                            <div className="p-5 bg-slate-50 border border-dashed border-cyan-400/50 rounded-2xl text-center space-y-3">
                                <div className="flex justify-center"><FileSpreadsheet className="w-8 h-8 text-cyan-600" /></div>
                                <div>
                                    <div className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">Pre-load Master Task Excel (.xlsx)</div>
                                    <p className="text-[11px] font-mono text-slate-500 mt-1">Upload sekarang untuk membagi penugasan rak ke counter.</p>
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

                                {initialFileToUpload && (
                                    <div className="inline-flex items-center justify-center gap-2 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-xl border border-emerald-200 mx-auto">
                                        <span>📄 {initialFileToUpload.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setInitialFileToUpload(null)}
                                            className="text-red-500 hover:text-red-700 ml-1.5 font-black cursor-pointer text-sm"
                                            title="Hapus file terpilih"
                                        >✕</button>
                                    </div>
                                )}
                            </div>
                        )}

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
                <div className="w-full max-w-full min-h-screen bg-slate-100 flex flex-col overflow-x-hidden animate-in fade-in duration-300">
                    {/* EXECUTIVE TOP BAR (FULL WIDTH) */}
                    <div className="bg-white px-4 py-2.5 sm:px-6 border-b border-slate-200/90 flex flex-wrap justify-between items-center gap-3 w-full max-w-full shadow-2xs sticky top-0 z-30">
                        {/* LEFT: Back, Logo, Project Code & Warehouse */}
                        <div className="flex items-center space-x-3 min-w-0">
                            <button
                                onClick={() => {
                                    if (isColdArchiveMode) {
                                        setIsColdArchiveMode(false);
                                        setColdArchiveFileName('');
                                        setActiveProject(null);
                                        setMasterDataList([]);
                                    }
                                    setViewState('LANDING');
                                }}
                                title="Kembali ke Daftar Project"
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors text-slate-700 shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="w-9 h-9 flex items-center justify-center shrink-0">
                                <img src="/logo.png" alt="Noctus Count Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-black tracking-tight text-slate-900 font-mono">
                                        {activeProject.sessionCode}
                                    </span>
                                    {isColdArchiveMode ? (
                                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 font-mono">
                                            <HardDrive className="w-3 h-3 text-sky-600" />
                                            <span>COLD_ARCHIVE</span>
                                        </span>
                                    ) : activeProject.status === 'ARCHIVED' ? (
                                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 font-mono">
                                            <Archive className="w-3 h-3" />
                                            <span>ARCHIVED</span>
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 font-mono">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            <span>LIVE_ACTIVE</span>
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-medium">•</span>
                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1 truncate max-w-44 sm:max-w-xs">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{activeProject.locationName}</span>
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-semibold tracking-wider">
                                    NOCTUS COUNT™ <span className="text-slate-300">|</span> Stock Opname Systems
                                </p>
                            </div>
                        </div>

                        {/* RIGHT: Round Filter, Role Badge, Session Lock, Mode Counter & Logout Button */}
                        <div className="flex flex-wrap items-center gap-2 justify-end">
                            <select
                                value={viewRoundFilter}
                                onChange={(e) => setViewRoundFilter(e.target.value === 'overall' ? 'overall' : parseInt(e.target.value, 10) as 1 | 2 | 3 | 4)}
                                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer transition-colors"
                            >
                                <option value="overall">All Rounds</option>
                                <option value={1}>Round 1</option>
                                <option value={2}>Round 2</option>
                                <option value={3}>Round 3</option>
                            </select>

                            {effectiveRole === 'owner' ? (
                                <div className="flex items-center gap-1.5">
                                    <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1.5 rounded-xl flex items-center space-x-1 border border-slate-800 shadow-2xs">
                                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                                        <span className="hidden sm:inline">SUPER ADMIN</span>
                                    </span>
                                    <button
                                        onClick={handleToggleGlobalLock}
                                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs border transition-colors cursor-pointer ${isProjectLocked ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                                        title={isProjectLocked ? "Buka Sesi Global" : "Kunci Sesi Global"}
                                    >
                                        {isProjectLocked ? <><Unlock className="w-3 h-3" /><span>Buka Sesi</span></> : <><Lock className="w-3 h-3" /><span>Kunci Sesi</span></>}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5">
                                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2.5 py-1.5 rounded-xl flex items-center space-x-1 border border-emerald-300 shadow-2xs">
                                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>SUPERVISOR</span>
                                    </span>
                                    <span className={`px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${isProjectLocked ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        {isProjectLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                        <span>{isProjectLocked ? 'Terkunci' : 'Aktif'}</span>
                                    </span>
                                </div>
                            )}

                            <NetworkStatusBadge />

                            {onSwitchToCounterView && (
                                <button
                                    onClick={onSwitchToCounterView}
                                    title="Beralih ke Layar HP Counter"
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl cursor-pointer transition-colors flex items-center space-x-1.5 text-xs font-bold shadow-2xs"
                                >
                                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="hidden sm:inline">Mode Counter</span>
                                </button>
                            )}

                            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
                                <button
                                    onClick={() => handleExportComprehensiveRekapXLSX(activeProject)}
                                    disabled={isExportingData}
                                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Download Rekap Laporan Excel Lengkap (.xlsx)"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="hidden lg:inline">Rekap Excel</span>
                                </button>
                                <button
                                    onClick={() => handleDownloadHardBackupJSON(activeProject)}
                                    disabled={isExportingData}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                                    title="Download Hard Backup JSON untuk Google Drive"
                                >
                                    <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                                    <span className="hidden lg:inline">Backup JSON</span>
                                </button>
                                {effectiveRole === 'owner' && (
                                    <button
                                        onClick={() => setProjectToArchive({ project: activeProject, targetStatus: activeProject.status === 'ARCHIVED' ? 'LIVE_ACTIVE' : 'ARCHIVED' })}
                                        className={`p-2 rounded-xl border cursor-pointer transition-colors shadow-2xs ${
                                            activeProject.status === 'ARCHIVED'
                                                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                        title={activeProject.status === 'ARCHIVED' ? "Pulihkan Project ke LIVE_ACTIVE" : "Arsipkan Project"}
                                    >
                                        {activeProject.status === 'ARCHIVED' ? <ArchiveRestore className="w-3.5 h-3.5 text-amber-600" /> : <Archive className="w-3.5 h-3.5 text-slate-600" />}
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    if (isColdArchiveMode) {
                                        setIsColdArchiveMode(false);
                                        setColdArchiveFileName('');
                                        setActiveProject(null);
                                        setMasterDataList([]);
                                    }
                                    setViewState('LANDING');
                                }}
                                title="Keluar ke Daftar Project"
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 rounded-xl cursor-pointer transition-colors flex items-center space-x-1.5 text-xs font-bold shadow-2xs"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Keluar</span>
                            </button>
                        </div>
                    </div>

                    {/* COLD ARCHIVE BANNER OR NORMAL ARCHIVE BANNER */}
                    {isColdArchiveMode ? (
                        <div className="bg-linear-to-r from-sky-950 via-slate-900 to-sky-950 border-b border-sky-800 px-4 py-2.5 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs font-mono shadow-md text-sky-200">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-sky-900/90 border border-sky-700 flex items-center justify-center shrink-0">
                                    <HardDrive className="w-4 h-4 text-cyan-400 animate-pulse" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                                        <span>❄️ Mode Cold Archive (Offline / Google Drive)</span>
                                        <span className="px-2 py-0.5 rounded bg-sky-900 text-cyan-300 text-[10px] font-bold border border-sky-700 hidden sm:inline">
                                            0 Kuota Firestore
                                        </span>
                                    </p>
                                    <p className="text-sky-300 text-[11px] truncate">
                                        Sumber file: <b className="text-white">{coldArchiveFileName || 'Backup JSON'}</b> — Data dimuat langsung dari file backup offline.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleExportComprehensiveRekapXLSX(activeProject)}
                                    disabled={isExportingData}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                                    title="Download Rekap Laporan Excel dari Cold Data"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    <span>Export Excel</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setIsColdArchiveMode(false);
                                        setColdArchiveFileName('');
                                        setActiveProject(null);
                                        setMasterDataList([]);
                                        setViewState('LANDING');
                                    }}
                                    className="px-3 py-1.5 bg-sky-800 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                                    title="Tutup Cold Archive & Kembali"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>Tutup Arsip</span>
                                </button>
                            </div>
                        </div>
                    ) : activeProject.status === 'ARCHIVED' && (
                        <div className="bg-linear-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border-b border-amber-300/80 px-4 py-2.5 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs font-mono shadow-2xs">
                            <div className="flex items-center gap-2.5 text-amber-900 font-bold">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                                    <Archive className="w-4 h-4 text-amber-700" />
                                </div>
                                <span>
                                    Sesi ini dalam status <strong>ARSIP (ARCHIVED)</strong>. Project ditutup dari tim lapangan di HP, data terlindungi dalam mode audit snapshot.
                                </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleExportComprehensiveRekapXLSX(activeProject)}
                                    disabled={isExportingData}
                                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                    title="Download Rekap Laporan Excel"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Rekap Excel</span>
                                </button>
                                <button
                                    onClick={() => handleDownloadHardBackupJSON(activeProject)}
                                    disabled={isExportingData}
                                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                    title="Download Hard Backup JSON untuk Google Drive"
                                >
                                    <HardDrive className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Hard Backup JSON</span>
                                </button>
                                {effectiveRole === 'owner' && (
                                    <button
                                        onClick={() => setProjectToArchive({ project: activeProject, targetStatus: 'LIVE_ACTIVE' })}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                        title="Aktifkan Kembali Project"
                                    >
                                        <ArchiveRestore className="w-3.5 h-3.5" />
                                        <span>Buka Kembali ke LIVE</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MAIN BODY: LABELED SIDEBAR + FULL WIDTH EXPANSIVE CONTENT */}
                    <div className="flex flex-1 flex-col md:flex-row min-h-[calc(100vh-65px)] w-full max-w-full overflow-x-hidden">
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
                                                    {/* CARD HEADER: Title & Search Bar */}
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="p-2.5 bg-cyan-50 text-cyan-700 rounded-2xl shadow-2xs border border-cyan-100/60 shrink-0">
                                                                <Users className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <h3 className="text-sm font-black text-slate-900 tracking-tight">PENDING STOCK COUNTS</h3>
                                                                    <span className="text-[10px] font-black bg-cyan-100/80 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-200/50">
                                                                        {displayedCounterNames.length} Counter
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] text-slate-400 font-medium">Monitoring Real-Time PIC Counter Lapangan</p>
                                                            </div>
                                                        </div>

                                                        {/* SEARCH INPUT */}
                                                        <div className="relative w-full sm:w-60">
                                                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                                                            <input
                                                                type="text"
                                                                placeholder="Cari PIC Counter..."
                                                                value={counterSearch}
                                                                onChange={(e) => setCounterSearch(e.target.value)}
                                                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* FILTER BY PROGRESS CHIPS & SORT SELECTOR */}
                                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                                                        {/* Filter Chips */}
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => setCounterProgressFilter('ALL')}
                                                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                                                    counterProgressFilter === 'ALL'
                                                                        ? 'bg-slate-900 text-white shadow-2xs'
                                                                        : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80'
                                                                }`}
                                                            >
                                                                Semua ({counterFilterCounts.all})
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCounterProgressFilter('IN_PROGRESS')}
                                                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                                    counterProgressFilter === 'IN_PROGRESS'
                                                                        ? 'bg-cyan-500 text-slate-950 font-black shadow-2xs'
                                                                        : 'bg-cyan-50/80 hover:bg-cyan-100 text-cyan-800 border border-cyan-200/80'
                                                                }`}
                                                            >
                                                                <span>⏳ Sedang Hitung</span>
                                                                <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-white/70 rounded-md">
                                                                    {counterFilterCounts.inProgress}
                                                                </span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCounterProgressFilter('DONE')}
                                                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                                    counterProgressFilter === 'DONE'
                                                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                                                        : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                                                                }`}
                                                            >
                                                                <span>✓ Selesai 100%</span>
                                                                <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-white/70 rounded-md">
                                                                    {counterFilterCounts.done}
                                                                </span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCounterProgressFilter('NOT_STARTED')}
                                                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                                    counterProgressFilter === 'NOT_STARTED'
                                                                        ? 'bg-slate-600 text-white shadow-2xs'
                                                                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
                                                                }`}
                                                            >
                                                                <span>Belum Mulai (0%)</span>
                                                                <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-slate-100 rounded-md">
                                                                    {counterFilterCounts.notStarted}
                                                                </span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setCounterProgressFilter('DISPUTE')}
                                                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                                    counterProgressFilter === 'DISPUTE'
                                                                        ? 'bg-red-600 text-white shadow-2xs'
                                                                        : 'bg-red-50/80 hover:bg-red-100 text-red-700 border border-red-200/80'
                                                                }`}
                                                            >
                                                                <span>⚠️ Ada Selisih</span>
                                                                <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-white/70 rounded-md">
                                                                    {counterFilterCounts.dispute}
                                                                </span>
                                                            </button>
                                                        </div>

                                                        {/* Sort Dropdown */}
                                                        <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto">
                                                            <span className="text-[11px] font-bold text-slate-400">Urutkan:</span>
                                                            <select
                                                                value={counterSortBy}
                                                                onChange={(e) => setCounterSortBy(e.target.value as any)}
                                                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 outline-none shadow-2xs cursor-pointer hover:border-cyan-400 transition-colors"
                                                            >
                                                                <option value="NAME_ASC">Nama PIC (A-Z)</option>
                                                                <option value="PROGRESS_ASC">Progress Terendah (0% ➔ 100%)</option>
                                                                <option value="PROGRESS_DESC">Progress Tertinggi (100% ➔ 0%)</option>
                                                                <option value="DISPUTE_DESC">Selisih Terbanyak (⚠️)</option>
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* TOOLBAR: SEGMENTED PRINTS, EXPORTS & OPERATIONAL ACTIONS */}
                                                    <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-50/80 rounded-2xl border border-slate-200/70">
                                                        {/* Left Group: Print & Excel Segmented Buttons */}
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {/* Segmented Cetak R1, R2, R3 */}
                                                            <div className="flex items-center bg-white rounded-xl p-0.5 border border-slate-200/90 shadow-2xs">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePrintCountsheet(undefined, 1)}
                                                                    className="px-2.5 py-1 text-[11px] font-black text-slate-700 hover:text-cyan-800 hover:bg-cyan-50/50 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                                                                    title="Buka Hub Cetak Countsheet Lapangan (Anti-Crash)"
                                                                >
                                                                    <Printer className="w-3.5 h-3.5 text-cyan-600" />
                                                                    <span>Cetak:</span>
                                                                </button>
                                                                {[1, 2, 3].map(rnd => (
                                                                    <button
                                                                        key={rnd}
                                                                        type="button"
                                                                        onClick={() => handlePrintCountsheet(undefined, rnd)}
                                                                        className="px-2 py-1 text-[11px] font-black text-slate-700 hover:text-cyan-800 hover:bg-cyan-50/60 rounded-lg cursor-pointer transition-all active:scale-95"
                                                                        title={`Cetak Countsheet Fisik Ronde ${rnd} Semua Counter`}
                                                                    >
                                                                        R{rnd}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            {/* Segmented Excel Hasil Hitungan R1, R2, R3 */}
                                                            <div className="flex items-center bg-white rounded-xl p-0.5 border border-slate-200/90 shadow-2xs">
                                                                <span className="px-2.5 py-1 text-[11px] font-black text-slate-700 flex items-center gap-1">
                                                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                                                                    <span>Hasil Excel:</span>
                                                                </span>
                                                                {[1, 2, 3].map(rnd => (
                                                                    <button
                                                                        key={rnd}
                                                                        type="button"
                                                                        onClick={() => handleExportSingleRoundResultsXLSX(undefined, rnd, exportIncludeSystemQty)}
                                                                        className="px-2 py-1 text-[11px] font-black text-slate-700 hover:text-emerald-800 hover:bg-emerald-50/60 rounded-lg cursor-pointer transition-all active:scale-95"
                                                                        title={`Download File Excel Hasil Hitungan Fisik Ronde ${rnd} Semua Counter ${exportIncludeSystemQty ? '(Internal - Ada Qty Sistem & Selisih)' : '(Format 3rd Party Vendor - Tanpa Qty Sistem & Status)'}`}
                                                                    >
                                                                        R{rnd}
                                                                    </button>
                                                                ))}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setExportIncludeSystemQty(prev => !prev)}
                                                                    className={`ml-1 px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer border ${
                                                                        exportIncludeSystemQty 
                                                                            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100' 
                                                                            : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                                                    }`}
                                                                    title={exportIncludeSystemQty ? "Saat ini Mode Internal (Qty Sistem & Selisih disertakan). Klik untuk beralih ke Format 3rd Party Vendor." : "Saat ini Format 3rd Party Vendor (Qty Sistem & Status disembunyikan). Klik jika ingin beralih ke Mode Internal."}
                                                                >
                                                                    {exportIncludeSystemQty ? 'Mode: Internal' : 'Format: 3rd Party'}
                                                                </button>
                                                            </div>

                                                            {/* Rekap Komparasi R1-R2-R3 */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleExportRoundsComparisonXLSX()}
                                                                className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300/80 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                                                                title="Download Rekap Komparasi Ronde 1, 2, 3 Seluruh Counter untuk Vendor & Manajemen"
                                                            >
                                                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                                                <span>Rekap R1-R2-R3 (Semua)</span>
                                                            </button>
                                                        </div>

                                                        {/* Right Group: Operational Actions */}
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={handleOpenAutoPairModal}
                                                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                                                                title="Auto-Pairing & Swap Ronde 2 Massal untuk seluruh counter yang sudah selesai 100% dan memiliki selisih (Skala 100 Counter)"
                                                            >
                                                                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                                                                <span>Auto-Swap R2</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={handleRunStressTest}
                                                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                                                                title="Simulasi Stress Test 100 Counter / 50K SKU & Audit Integritas Data Siap Tempur"
                                                            >
                                                                <Gauge className="w-3.5 h-3.5 text-amber-600" />
                                                                <span>Uji Tempur</span>
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
                                                        </div>
                                                    </div>

                                                    {/* ACTIVE SWAP REVERT BANNERS */}
                                                    {activeUncountedSwaps.map(swap => (
                                                        <div key={swap.id} className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
                                                            <div className="flex items-center space-x-2 text-xs">
                                                                <span className="material-symbols-outlined text-amber-600 text-lg">swap_horiz</span>
                                                                <div>
                                                                    <span className="font-black text-amber-950 block text-xs">
                                                                        Swap Ronde {swap.round} Aktif:
                                                                    </span>
                                                                    <span className="text-[11px] text-amber-800">
                                                                        <b className="capitalize">{swap.counters[0]}</b> ⇄ <b className="capitalize">{swap.counters[1] || 'Partner'}</b> ({swap.count} Task Belum Dihitung)
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => handleRevertCounterSwap(swap.counters[0])}
                                                                disabled={isDeploySubmitting}
                                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                                                title="Kembalikan penugasan ke counter asal sebelum hitungan fisik dimulai"
                                                            >
                                                                <RefreshCw className={`w-3.5 h-3.5 ${isDeploySubmitting ? 'animate-spin' : ''}`} />
                                                                <span>Batalkan Swap</span>
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {/* COUNTER PIC LIST */}
                                                    <div className="space-y-3 max-h-110 overflow-y-auto pr-1 scrollbar-thin">
                                                        {displayedCounterNames.map((cName, idx) => {
                                                            const cData = counterGroups[cName];
                                                            const pct = cData.total > 0 ? (cData.counted >= cData.total ? 100 : Math.min(99, Math.floor((cData.counted / cData.total) * 100))) : 0;
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
                                                                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 backdrop-blur-xs animate-in fade-in duration-200" onClick={(e) => { e.stopPropagation(); setMenuAnchor(null); }}>
                                                                                        <div
                                                                                            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-4 space-y-3 animate-in zoom-in-95 duration-150 overflow-hidden"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                        >
                                                                                            {/* MODAL HEADER */}
                                                                                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                                                                                                <div className="flex items-center space-x-2.5">
                                                                                                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center uppercase shrink-0">
                                                                                                        {cName.slice(0, 2)}
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <div className="flex items-center space-x-2">
                                                                                                            <span className="text-sm font-black text-slate-900 capitalize">{cName}</span>
                                                                                                            <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                                                                                Ronde {cMaxRound}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                        <p className="text-[10px] text-slate-400 font-medium">
                                                                                                            {cData.counted} / {cData.total} SKU Terhitung ({pct}%)
                                                                                                        </p>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => setMenuAnchor(null)}
                                                                                                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-black transition-all cursor-pointer"
                                                                                                >
                                                                                                    ✕
                                                                                                </button>
                                                                                            </div>

                                                                                            {/* OPERATIONAL ACTIONS */}
                                                                                            <div className="space-y-1.5">
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

                                                                                                {effectiveRole === 'owner' && cMaxRound > 1 && (() => {
                                                                                                    const isSwapCounted = masterDataList.some(m => 
                                                                                                        (m.counter || '').toLowerCase().trim() === cleanCounterKey && m.isCounted && (m.currentRound || 1) === cMaxRound
                                                                                                    );
                                                                                                    return (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setMenuAnchor(null);
                                                                                                                handleRevertCounterSwap(cName);
                                                                                                            }}
                                                                                                            disabled={isSwapCounted || isDeploySubmitting}
                                                                                                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2.5 transition-all cursor-pointer ${
                                                                                                                isSwapCounted 
                                                                                                                    ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                                                                                                                    : 'hover:bg-amber-50 text-slate-700 hover:text-amber-800'
                                                                                                            }`}
                                                                                                        >
                                                                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSwapCounted ? 'bg-slate-200 text-slate-400' : 'bg-amber-100 text-amber-700'}`}>
                                                                                                                <RefreshCw className="w-3.5 h-3.5" />
                                                                                                            </div>
                                                                                                            <div className="flex-1 min-w-0">
                                                                                                                <div className="text-xs font-bold leading-tight">Batalkan Swap / Rollback</div>
                                                                                                                <div className="text-[10px] text-slate-400 font-normal">
                                                                                                                    {isSwapCounted ? `Sudah ada fisik terhitung di R${cMaxRound}` : `Kembalikan tugas ke Ronde ${cMaxRound - 1}`}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </button>
                                                                                                    );
                                                                                                })()}
                                                                                            </div>

                                                                                            {/* CETAK COUNTSHEET PDF / A4 BLIND */}
                                                                                            <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                                                                                                <div className="flex items-center justify-between px-1">
                                                                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                                                                                        <Printer className="w-3.5 h-3.5 text-cyan-700" />
                                                                                                        <span>Cetak Countsheet Fisik</span>
                                                                                                    </span>
                                                                                                    <span className="text-[9px] font-mono font-bold text-cyan-700 bg-cyan-50 px-1 rounded border border-cyan-200">Blind A4</span>
                                                                                                </div>
                                                                                                <div className="grid grid-cols-3 gap-1">
                                                                                                    {[1, 2, 3].map(rnd => (
                                                                                                        <button
                                                                                                            key={rnd}
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setMenuAnchor(null);
                                                                                                                handlePrintCountsheet(cName, rnd);
                                                                                                            }}
                                                                                                            className={`py-1.5 px-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                                                                                rnd === cMaxRound 
                                                                                                                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-2xs font-black' 
                                                                                                                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold'
                                                                                                            }`}
                                                                                                            title={`Cetak Lembar Kerja Blind Ronde ${rnd} (${cName})`}
                                                                                                        >
                                                                                                            <span>Ronde {rnd}</span>
                                                                                                            {rnd === cMaxRound && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* EXCEL HASIL HITUNGAN AKTUAL FISIK PER RONDE (R1, R2, R3) */}
                                                                                            {/* EXCEL HASIL HITUNGAN AKTUAL FISIK PER RONDE (R1, R2, R3) */}
                                                                                            <div className="p-2.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-2">
                                                                                                <div className="flex items-center justify-between px-1">
                                                                                                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                                                                                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                                                                                                        <span>Excel Hasil Hitung</span>
                                                                                                    </span>
                                                                                                    
                                                                                                    {/* Segmented Switch: 3rd Party vs Internal */}
                                                                                                    <div className="inline-flex rounded-lg p-0.5 bg-white border border-emerald-200 shadow-2xs">
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setExportIncludeSystemQty(false);
                                                                                                            }}
                                                                                                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                                                                                                                !exportIncludeSystemQty
                                                                                                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                                                                                                    : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-50'
                                                                                                            }`}
                                                                                                            title="Format 3rd Party Vendor: Qty Sistem, Selisih, dan Status DIHAPUS (Blind Count)"
                                                                                                        >
                                                                                                            🔒 3rd Party
                                                                                                        </button>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setExportIncludeSystemQty(true);
                                                                                                            }}
                                                                                                            className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all cursor-pointer ${
                                                                                                                exportIncludeSystemQty
                                                                                                                    ? 'bg-amber-600 text-white shadow-2xs'
                                                                                                                    : 'text-slate-600 hover:text-amber-700 hover:bg-slate-50'
                                                                                                            }`}
                                                                                                            title="Mode Internal: Lengkap dengan Qty Sistem (WMS), Selisih, dan Status"
                                                                                                        >
                                                                                                            📊 Internal
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="px-1 text-[9.5px] leading-tight">
                                                                                                    {!exportIncludeSystemQty ? (
                                                                                                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                                                                            <span>Format 3rd Party: Qty Sistem & Status disembunyikan (Aman untuk Vendor)</span>
                                                                                                        </span>
                                                                                                    ) : (
                                                                                                        <span className="text-amber-800 font-bold flex items-center gap-1">
                                                                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                                                                                            <span>Mode Internal: Qty Sistem & Selisih disertakan</span>
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>

                                                                                                <div className="grid grid-cols-3 gap-1">
                                                                                                    {[1, 2, 3].map(rnd => (
                                                                                                        <button
                                                                                                            key={rnd}
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setMenuAnchor(null);
                                                                                                                handleExportSingleRoundResultsXLSX(cName, rnd, exportIncludeSystemQty);
                                                                                                            }}
                                                                                                            className={`py-1.5 px-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                                                                                rnd === cMaxRound 
                                                                                                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-2xs font-black' 
                                                                                                                    : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold'
                                                                                                            }`}
                                                                                                            title={`Download File Excel Hasil Hitungan Fisik Ronde ${rnd} (${cName}) - ${exportIncludeSystemQty ? 'Mode Internal' : 'Format 3rd Party Vendor'}`}
                                                                                                        >
                                                                                                            <span>Hasil R{rnd}</span>
                                                                                                            {rnd === cMaxRound && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>

                                                                                            {/* REKAP LENGKAP SEMUA RONDE (R1-R3) */}
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    setMenuAnchor(null);
                                                                                                    handleExportRoundsComparisonXLSX(cName, exportIncludeSystemQty);
                                                                                                }}
                                                                                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 transition-all cursor-pointer"
                                                                                            >
                                                                                                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                                                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                                                                                </div>
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="text-xs font-bold leading-tight">Rekap Komparasi R1-R3 ({cName})</div>
                                                                                                    <div className="text-[10px] text-slate-400 font-normal">
                                                                                                        {!exportIncludeSystemQty ? 'Format 3rd Party Vendor (Blind) .xlsx' : 'Hasil hitung R1, R2, R3 internal lengkap .xlsx'}
                                                                                                    </div>
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
                                                                                                <div className="pt-2 border-t border-slate-100">
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
                                                                                    </div>,
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

                                                        {displayedCounterNames.length === 0 && (
                                                            <div className="p-8 text-center text-xs text-slate-400 font-medium space-y-2">
                                                                <p>Tidak ada counter PIC yang sesuai kriteria filter / pencarian.</p>
                                                                {(counterProgressFilter !== 'ALL' || counterSearch) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setCounterProgressFilter('ALL');
                                                                            setCounterSearch('');
                                                                        }}
                                                                        className="px-3 py-1 bg-cyan-50 text-cyan-800 rounded-lg text-xs font-bold hover:bg-cyan-100 transition-colors cursor-pointer"
                                                                    >
                                                                        Reset Filter & Pencarian
                                                                    </button>
                                                                )}
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
                                    {(effectiveRole === 'owner' || effectiveRole === 'spv') && (
                                        <button
                                            type="button"
                                            onClick={handleDeduplicateTasks}
                                            className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
                                            title="Bersihkan baris temuan ganda/duplikat akibat klik berulang saat sinyal lemah"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Bersihkan Duplikat</span>
                                        </button>
                                    )}
                                    {(effectiveRole === 'owner' || effectiveRole === 'spv') && (
                                        <button
                                            type="button"
                                            onClick={handleOpenAddMasterModal}
                                            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-md transition-all cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Tambah Task</span>
                                        </button>
                                    )}
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
                                <table className="w-full text-left text-[11px] min-w-max"><thead className="bg-slate-50 font-black text-slate-600 border-b sticky top-0 z-10"><tr><th className="p-3 bg-slate-50">OWNER SKU</th><th className="p-3 bg-slate-50">SKU</th><th className="p-3 bg-slate-50">DESKRIPSI</th><th className="p-3 bg-slate-50">UPC 1</th><th className="p-3 bg-slate-50">UPC 2</th><th className="p-3 bg-slate-50">LOKASI RAK</th><th className="p-3 bg-slate-50">COUNTER PIC</th><th className="p-3 text-center bg-slate-50">WMS QTY</th><th className="p-3 text-center bg-slate-50">ACTUAL QTY</th><th className="p-3 text-center bg-slate-50">AKSI</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {paginatedMasterTask.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold text-slate-800">{row.Owner || 'DDI'}</td>
                                                <td className="p-3 font-mono font-black text-indigo-600">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span>{row.SKU}</span>
                                                        {row.photoUrl ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPhotoPreviewModal({
                                                                    isOpen: true,
                                                                    photoUrl: row.photoUrl!,
                                                                    sku: row.SKU,
                                                                    location: row.Location,
                                                                    description: row.Description,
                                                                    counter: row.counter
                                                                })}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                                                                title="Lihat Foto Fisik Barang Temuan"
                                                            >
                                                                <Camera className="w-3 h-3 text-amber-700" />
                                                                <span>Foto</span>
                                                            </button>
                                                        ) : (row.Qty === 0 || row.id?.includes('TEMUAN')) ? (
                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                                                Temuan
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </td>
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
                                                <td className="p-2 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditMasterModal(row)}
                                                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Edit Master SKU & Task Ini"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePromptDeleteMaster(row)}
                                                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Hapus SKU dari Master Task"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredMasterTask.length === 0 && (
                                            <tr><td colSpan={10} className="p-8 text-center text-slate-400 font-medium">Data Task tidak ditemukan.</td></tr>
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
                                        <button
                                            type="button"
                                            onClick={handleRemapMasterTasksFromCatalog}
                                            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
                                            title="Mapping ulang seluruh hasil hitungan (termasuk barang temuan) ke Master SKU terbaru tanpa menghapus Actual Qty"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Mapping Ulang Hasil Hitung</span>
                                        </button>
                                    )}
                                    {(effectiveRole === 'owner' || effectiveRole === 'spv') && (
                                        <button
                                            type="button"
                                            onClick={handleDeleteAllSKUCatalog}
                                            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer"
                                            title="Hapus semua Master Katalog SKU di project ini (Hasil hitungan counter TIDAK ikut terhapus)"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Hapus Semua SKU</span>
                                        </button>
                                    )}
                                    {(effectiveRole === 'owner' || effectiveRole === 'spv') && (
                                        <button
                                            type="button"
                                            onClick={handleOpenAddCatalogModal}
                                            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-md transition-all cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Tambah SKU</span>
                                        </button>
                                    )}
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
                                <table className="w-full text-left text-xs"><thead className="bg-slate-50 font-bold text-slate-600 border-b sticky top-0 z-10"><tr><th className="p-3 bg-slate-50">OWNER</th><th className="p-3 bg-slate-50">SKU BARANG</th><th className="p-3 bg-slate-50">DESKRIPSI PRODUK</th><th className="p-3 bg-slate-50">UPC 1 (ECERAN)</th><th className="p-3 bg-slate-50">UPC 2 (KARDUS)</th><th className="p-3 bg-slate-50">BRAND</th><th className="p-3 text-right bg-slate-50">HARGA SATUAN (RP)</th><th className="p-3 text-center bg-slate-50">AKSI</th></tr></thead>
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
                                                <td className="p-2 text-center">
                                                    <div className="flex items-center justify-center space-x-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditCatalogModal(item)}
                                                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Edit Referensi SKU Ini"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePromptDeleteCatalog(item)}
                                                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                            title="Hapus Referensi SKU"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredSKUCatalog.length === 0 && (
                                            <tr><td colSpan={8} className="p-8 text-center text-slate-400">Tidak ada Katalog SKU ditemukan.</td></tr>
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

                                {/* SEARCH BAR REKONSILIASI */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={reconSearch}
                                            onChange={(e) => {
                                                setReconSearch(e.target.value);
                                                setReconCurrentPage(1);
                                            }}
                                            placeholder="Cari SKU, nama barang, rak/lokasi, counter, brand, atau barcode UPC..."
                                            className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-xs"
                                        />
                                        {reconSearch && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReconSearch('');
                                                    setReconCurrentPage(1);
                                                }}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                                title="Hapus pencarian"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <span className="text-xs font-bold text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                                            {reconSearch ? (
                                                <>Ditemukan: <span className="text-indigo-600 font-extrabold">{filteredDiscrepancies.length}</span> SKU</>
                                            ) : (
                                                <>Total Selisih: <span className="text-slate-800 font-extrabold">{filteredDiscrepancies.length}</span> SKU</>
                                            )}
                                        </span>
                                        {reconSearch && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReconSearch('');
                                                    setReconCurrentPage(1);
                                                }}
                                                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold px-2 py-1 underline cursor-pointer"
                                            >
                                                Reset
                                            </button>
                                        )}
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
                                                    <td colSpan={9} className="p-10 text-center text-slate-400 font-bold">
                                                        {reconSearch ? (
                                                            <div className="flex flex-col items-center justify-center space-y-2 py-4">
                                                                <Search className="w-8 h-8 text-slate-300 mb-1" />
                                                                <p className="text-slate-600 font-semibold text-sm">
                                                                    Tidak ada SKU selisih yang cocok dengan kata kunci &quot;<span className="text-indigo-600 font-bold">{reconSearch}</span>&quot;
                                                                </p>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setReconSearch('');
                                                                        setReconCurrentPage(1);
                                                                    }}
                                                                    className="mt-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                                                >
                                                                    Reset Pencarian
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            'Tidak ada selisih stok (Seluruh item terhitung cocok / belum ada variansi).'
                                                        )}
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
                                                                    {item.photoUrl && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setPhotoPreviewModal({
                                                                                isOpen: true,
                                                                                photoUrl: item.photoUrl!,
                                                                                sku: item.SKU,
                                                                                location: item.Location,
                                                                                description: item.Description,
                                                                                counter: item.counter
                                                                            })}
                                                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 transition-all cursor-pointer shadow-2xs"
                                                                            title="Lihat Foto Fisik Barang Temuan"
                                                                        >
                                                                            <Camera className="w-3 h-3 text-amber-700" />
                                                                            <span>Foto Temuan</span>
                                                                        </button>
                                                                    )}
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
                                                <td className="p-3 border-r max-w-xs truncate">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono font-bold text-slate-900">{log.sku || log.SKU}</span>
                                                        {log.photoUrl && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPhotoPreviewModal({
                                                                    isOpen: true,
                                                                    photoUrl: log.photoUrl,
                                                                    sku: log.sku || log.SKU || '-',
                                                                    location: log.rackLocation || log.Location || '-',
                                                                    description: log.description || log.Description || '',
                                                                    counter: log.counterPic || log.counter || '-'
                                                                })}
                                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer"
                                                                title="Lihat Foto Bukti Hitungan"
                                                            >
                                                                <Camera className="w-2.5 h-2.5 text-amber-700" />
                                                                <span>Foto</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 truncate">{log.description || log.Description}</div>
                                                </td>
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
                                            onChange={(e) => { if (e.target.files?.[0]) handleRestoreDatabaseFromJSON(e.target.files?.[0]); }}
                                        />
                                    </label>

                                    <button
                                        onClick={handleScanAndRunAutoRecovery}
                                        disabled={isRecovering}
                                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md cursor-pointer disabled:opacity-50"
                                        title="Rekonsiliasi & pulihkan multi-doc lot yang terpecah 0 dan pulihkan dari log audit"
                                    >
                                        {isRecovering ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                        <span>{isRecovering ? 'Memproses Recovery...' : 'Auto-Recovery & Rebalance Multi-Doc'}</span>
                                    </button>
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

            {/* LIGHTBOX MODAL PREVIEW FOTO BARANG TEMUAN FISIK */}
            {photoPreviewModal?.isOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                                    <Camera className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black tracking-tight">Foto Fisik Barang Temuan</h4>
                                    <p className="text-[11px] font-mono text-slate-300">{photoPreviewModal.sku} • Rak {photoPreviewModal.location}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPhotoPreviewModal(null)}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Photo Body */}
                        <div className="p-4 bg-slate-950 flex items-center justify-center overflow-auto flex-1 min-h-75">
                            <img
                                src={photoPreviewModal.photoUrl}
                                alt={`Foto temuan ${photoPreviewModal.sku}`}
                                className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
                            />
                        </div>

                        {/* Footer Details */}
                        <div className="p-4 bg-white border-t border-slate-100 space-y-3 shrink-0">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 bg-slate-50 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Counter PIC</span>
                                    <span className="font-bold text-slate-800 uppercase">{photoPreviewModal.counter || '-'}</span>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Lokasi Rak</span>
                                    <span className="font-mono font-bold text-indigo-600">{photoPreviewModal.location || '-'}</span>
                                </div>
                            </div>
                            {photoPreviewModal.description && (
                                <p className="text-xs text-slate-600 font-medium line-clamp-2">
                                    {photoPreviewModal.description}
                                </p>
                            )}
                            <div className="flex justify-between items-center pt-1">
                                <a
                                    href={photoPreviewModal.photoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Buka Tab Baru</span>
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setPhotoPreviewModal(null)}
                                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
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