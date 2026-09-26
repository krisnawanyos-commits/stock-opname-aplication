import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch, getDocs
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import {
    Users, Database, Upload, ShieldCheck, Check, FileSpreadsheet,
    PieChart, ChevronUp, Plus, Trash2, MapPin, Save,
    UserPlus, Filter, TrendingDown, SlidersHorizontal,
    CheckCircle2, XCircle, Search, Building2, DollarSign,
    Download, Scale, PlayCircle, Archive, ArrowLeft, AlertTriangle,
    LogOut, GripHorizontal, Contact, Eye, EyeOff, UserCheck, Clock, Store, Link2, KeyRound,
    Mail, Edit2, Smartphone, Lock, Unlock, Repeat, Copy
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
}

interface TabDefinition {
    id: string;
    label: string;
    icon: any;
    roles: UserRole[];
}

const ALL_AVAILABLE_TABS: TabDefinition[] = [
    { id: 'progress', label: 'Progress & Analytics', icon: PieChart, roles: ['owner', 'spv'] },
    { id: 'master', label: 'Master Task & Rak', icon: Database, roles: ['owner', 'spv'] },
    { id: 'recon', label: 'Recon & Recovery', icon: Scale, roles: ['owner'] },
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

    const OWNER_WHITELIST = ['yos.krisnawan@anymindgroup.com', 'krisnawanyos@gmail.com'];
    const isWhitelistedOwner = currentUserRole === 'owner' && OWNER_WHITELIST.includes(currentUserEmail.toLowerCase().trim());
    const effectiveRole: UserRole = isWhitelistedOwner ? 'owner' : (currentUserRole === 'owner' ? 'spv' : currentUserRole);

    const [viewState, setViewState] = useState<'LANDING' | 'WIZARD_SETUP' | 'DASHBOARD'>('LANDING');
    const [landingTab, setLandingTab] = useState<'projects' | 'accounts'>('projects');
    const [projectToDelete, setProjectToDelete] = useState<ProjectSession | null>(null);

    const [activeTab, setActiveTab] = useState<string>('progress');
    const [orderedTabs, setOrderedTabs] = useState<TabDefinition[]>([]);
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

    const [selectedCounterForDetail, setSelectedCounterForDetail] = useState<string | null>(null);
    const [ktpSearch, setKtpSearch] = useState<string>('');
    const [counterSearch, setCounterSearch] = useState<string>('');

    const [editingAccount, setEditingAccount] = useState<GlobalAccount | null>(null);
    const [assignUsername, setAssignUsername] = useState<string>('');
    const [assignRole, setAssignRole] = useState<UserRole>('counter');

    // BULK REASSIGN TASK COUNTER ABSEN STATE
    const [transferSourceCounter, setTransferSourceCounter] = useState<string | null>(null);
    const [transferTargetCounter, setTransferTargetCounter] = useState<string>('');

    // STATE PENGUNCIAN
    const [isProjectLocked, setIsProjectLocked] = useState(false);
    const [lockedCounters, setLockedCounters] = useState<Record<string, boolean>>({});

    // STATE MODAL POPUP KREDENSIAL TEXT (FALLBACK EMAIL)
    const [credentialsModalText, setCredentialsModalText] = useState<string | null>(null);

    // AUDIT LOGS STATE
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    useEffect(() => {
        setOrderedTabs(ALL_AVAILABLE_TABS.filter(tab => tab.roles.includes(effectiveRole)));
    }, [effectiveRole]);

    const handleDragStart = (e: React.DragEvent, tabId: string) => {
        setDraggedTabId(tabId); e.dataTransfer.effectAllowed = 'move';
    };
    const handleDrop = (e: React.DragEvent, targetTabId: string) => {
        e.preventDefault();
        if (!draggedTabId || draggedTabId === targetTabId) return;
        const newTabs = [...orderedTabs];
        const draggedIndex = newTabs.findIndex(t => t.id === draggedTabId);
        const targetIndex = newTabs.findIndex(t => t.id === targetTabId);
        const [removedTab] = newTabs.splice(draggedIndex, 1);
        newTabs.splice(targetIndex, 0, removedTab);
        setOrderedTabs(newTabs); setDraggedTabId(null);
    };

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
    const [brandStatusFilter, setBrandStatusFilter] = useState<'all' | 'selisih' | 'match'>('all');
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

        // Listener Audit Logs Real-Time
        const unsubAudit = onSnapshot(collection(db, "audit_logs"), (snap) => {
            const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setAuditLogs(logs);
        });

        return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsubAudit(); };
    }, []);

    // FIX MAPPING DATA FIRESTORE & SYNC BAMBANG
    useEffect(() => {
        if (!activeProject) return;

        const qTasks = collection(db, "master_tasks");
        const unsubscribe = onSnapshot(qTasks, (snapshot) => {
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
                    currentRound: data.currentRound || 1,
                    expiredDateSystem: data.expiredDateSystem || '',
                    expiredDateActual: data.expDateActual || data.expiredDateActual || '',
                    Qty: parseInt(data.Qty || data.QTY_SYSTEM) || 0,
                    countedQty: isCounted ? totalActualCalculated : undefined,
                    qtyGood: isCounted ? calcGood : undefined,
                    qtyBad: isCounted ? calcBad : undefined,
                    Remarks: data.badRemarks || data.Remarks || '',
                    isCounted: !!isCounted,
                    unitPrice: parseInt(data.unitPrice) || 0
                };
            });

            if (taskList.length > 0) {
                setMasterDataList(taskList);
            }
        });

        // FIX SYNC KEY LOCK DENGAN DOKUMEN SESI AKTIF
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

        return () => { unsubscribe(); lockUnsubscribe(); };
    }, [activeProject]);

    // HANDLER DEPLOY RONDE 2 PER-COUNTER PIC
    const handleDeployRound2ForCounter = async (targetCounter: string) => {
        if (!activeProject) return;
        const cleanCounter = targetCounter.toLowerCase().trim();
        if (!window.confirm(`AKSI OWNER: Deploy Ronde 2 KHUSUS untuk Counter "${cleanCounter}"? SKU selisih milik counter ini akan di-reset untuk dihitung ulang.`)) return;

        try {
            const disputeTasks = masterDataList.filter(item => {
                const act = item.countedQty ?? item.Qty;
                return item.counter === cleanCounter && item.isCounted && act !== item.Qty;
            });

            if (disputeTasks.length === 0) {
                triggerNotification(`Tidak ada SKU selisih ditemukan untuk counter ${cleanCounter}.`);
                return;
            }

            const batch = writeBatch(db);
            masterDataList.filter(item => item.counter === cleanCounter).forEach((item) => {
                if (!item.id) return;
                const ref = doc(db, "master_tasks", item.id);
                const act = item.countedQty ?? item.Qty;

                if (item.isCounted && act !== item.Qty) {
                    batch.update(ref, {
                        currentRound: 2,
                        QTY_ACTUAL: null,
                        QTY_GOOD: null,
                        QTY_BAD: null,
                        isCounted: false,
                        round1Actual: act,
                        updatedAt: new Date().toISOString()
                    });
                } else if (item.isCounted && act === item.Qty) {
                    batch.update(ref, {
                        isLocked: true,
                        updatedAt: new Date().toISOString()
                    });
                }
            });

            await batch.commit();
            triggerNotification(`🚀 Ronde 2 Berhasil Dideploy Khusus untuk Counter "${cleanCounter}"! (${disputeTasks.length} SKU Selisih)`);
        } catch (err: any) {
            console.error("Deploy Round 2 Per Counter Error:", err);
            triggerNotification(`Gagal Deploy Ronde 2: ${err.message || String(err)}`);
        }
    };

    // EXPORT RECON EXCEL
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
                'HARGA SATUAN (RP)': unitPrice,
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

    // DOWNLOAD AUDIT TRAIL EXCEL
    const handleExportAuditTrailXLSX = () => {
        if (auditLogs.length === 0) {
            triggerNotification("Belum ada data Audit Trail untuk di-download!");
            return;
        }

        const exportLogs = auditLogs.map((log, idx) => ({
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
        }));

        const ws = XLSX.utils.json_to_sheet(exportLogs);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Audit_Trail_Log");
        XLSX.writeFile(wb, `Audit_Trail_Snapshot_${activeProject?.sessionCode || '360'}_${new Date().toISOString().split('T')[0]}.xlsx`);
        triggerNotification("Audit Trail Log (.xlsx) berhasil diunduh!");
    };

    // HANDLERS PENGUNCIAN GLOBAL & PER-COUNTER (DENGAN KEY CLEANUP LOWERCASE)
    const handleToggleGlobalLock = async () => {
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

    // BULK TRANSFER TASK COUNTER ABSEN
    const handleExecuteBulkTransfer = async () => {
        if (!transferSourceCounter || !transferTargetCounter) return;
        const cleanTarget = transferTargetCounter.toLowerCase().trim();
        const cleanSource = transferSourceCounter.toLowerCase().trim();

        const tasksToMove = masterDataList.filter(m => m.counter === cleanSource);
        if (tasksToMove.length === 0) {
            triggerNotification(`Tidak ada task ditemukan pada counter ${cleanSource}`);
            return;
        }

        const batch = writeBatch(db);
        tasksToMove.forEach(task => {
            if (task.id) {
                const ref = doc(db, "master_tasks", task.id);
                batch.update(ref, { counter: cleanTarget, updatedAt: new Date().toISOString() });
            }
        });

        await batch.commit();
        triggerNotification(`Sukses! ${tasksToMove.length} task milik ${cleanSource} dipindahkan ke ${cleanTarget}.`);
        setTransferSourceCounter(null);
        setTransferTargetCounter('');
    };

    // 2. PARSING & UPLOAD MASSAL AKUN KTP CLOUD DARI EXCEL/CSV
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

                const batch = writeBatch(db);
                let count = 0;

                json.forEach((row: any) => {
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

    // 3. BLAST EMAIL & COPY TEXT KREDENSIAL
    const handleGenerateCredentialsText = () => {
        if (globalAccounts.length === 0) {
            triggerNotification("Belum ada KTP terdaftar.");
            return;
        }

        let text = "📋 *DAFTAR KREDENSIAL LOGIN STOCK OPNAME 360*\n\n";
        globalAccounts.forEach((acc, i) => {
            text += `${i + 1}. *${acc.name}*\n   Username: \`${acc.username}\`\n   PIN: \`${acc.pin}\`\n\n`;
        });

        setCredentialsModalText(text);
    };

    const combinedLocationOptions = [
        ...warehouseList.map(w => ({ value: w.id, label: `[Gudang WMS] ${w.name}` })),
        ...consignmentStoreList.map(s => ({ value: s.id, label: `[Store Offline] ${s.name}` }))
    ];

    const handleUpdateOwnerAccount = async () => {
        if (ownerNewEmail.trim()) {
            const ownerKey = currentUserEmail?.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_') || 'owner_default';
            await setDoc(doc(db, "owner_profile", ownerKey), {
                name: ownerNewName,
                email: ownerNewEmail.trim(),
                pin: ownerNewPin || '1234',
                updatedAt: new Date().toLocaleString()
            });
            triggerNotification('Profil & Akun Owner Berhasil Diperbarui!');
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

    const triggerMailto = (url: string) => {
        try {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Error triggering mailto:", e);
            window.location.href = url;
        }
    };

    const handleBlastEmailCredentials = () => {
        if (globalAccounts.length === 0) {
            triggerNotification('Belum ada akun KTP Cloud terdaftar.');
            return;
        }
        const validAccounts = globalAccounts.filter(a => a.email && a.email.trim());
        if (validAccounts.length === 0) {
            triggerNotification('Tidak ada email terdaftar pada akun KTP Cloud.');
            return;
        }

        const emailList = validAccounts.map(a => a.email.trim()).join(',');
        const subject = encodeURIComponent("Kredensial Login Stock Opname 360");
        const bodyContent = `Halo Tim,\n\nBerikut daftar kredensial login akun Stock Opname 360:\n\n` +
            validAccounts.map(a => `• Username: ${a.username} | PIN: ${a.pin} | Nama: ${a.name} (${a.email})`).join('\n') +
            `\n\nSilakan gunakan Username & PIN masing-masing untuk login.\nTerima kasih.`;

        // Mailto format using BCC for blast
        const mailtoUrl = `mailto:?bcc=${encodeURIComponent(emailList)}&subject=${subject}&body=${encodeURIComponent(bodyContent)}`;

        try {
            navigator.clipboard.writeText(bodyContent);
            triggerNotification(`Kredensial disalin ke clipboard! Membuka aplikasi email blast ke ${validAccounts.length} akun...`);
        } catch (e) {
            triggerNotification(`Membuka aplikasi email blast ke ${validAccounts.length} akun...`);
        }

        triggerMailto(mailtoUrl);
    };

    const handleSendIndividualEmail = (acc: GlobalAccount) => {
        if (!acc.email || !acc.email.trim()) {
            triggerNotification(`Akun ${acc.username} tidak memiliki alamat email!`);
            return;
        }
        const subject = encodeURIComponent(`Kredensial Akses Stock Opname 360 - ${acc.name}`);
        const bodyText = `Halo ${acc.name},\n\nBerikut kredensial akun kamu untuk masuk ke aplikasi Stock Opname 360:\n\nUsername: ${acc.username}\nPIN: ${acc.pin}\n\nSalam,\nTim Operations WMS`;
        const mailtoUrl = `mailto:${acc.email.trim()}?subject=${subject}&body=${encodeURIComponent(bodyText)}`;

        try {
            navigator.clipboard.writeText(`Username: ${acc.username}\nPIN: ${acc.pin}`);
            triggerNotification(`Kredensial ${acc.username} disalin ke clipboard! Membuka email ke ${acc.email}...`);
        } catch (e) {
            triggerNotification(`Mengirim email kredensial ke ${acc.email}...`);
        }

        triggerMailto(mailtoUrl);
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

    const parseXLSXFile = (file: File, currentProjId?: string): Promise<MasterSKUItem[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const json = XLSX.utils.sheet_to_json(worksheet) as any[];

                    triggerNotification("Reset data lama & mengunggah data baru ke Cloud...");

                    const oldDocsSnap = await getDocs(collection(db, "master_tasks"));
                    const cleanBatch = writeBatch(db);
                    oldDocsSnap.docs.forEach(oldDoc => cleanBatch.delete(oldDoc.ref));
                    await cleanBatch.commit();

                    const batch = writeBatch(db);
                    const newMasterList: MasterSKUItem[] = [];
                    const pId = currentProjId || activeProject?.id;

                    for (let idx = 0; idx < json.length; idx++) {
                        const row = json[idx];
                        const rawCounter = (row['counter'] || row['Counter'] || row['COUNTER'] || 'Unassigned').toString().toLowerCase().trim();
                        const locStr = (row['Location'] || row['LOCATION'] || `LOC-${idx + 1}`).toString().trim();
                        const skuStr = (row['SKU'] || `SKU-${idx + 1}`).toString().trim();

                        const rawTaskId = `${locStr}_${skuStr}_${idx + 1}`;
                        const taskId = rawTaskId.replace(/\//g, '-');

                        if (rawCounter !== 'unassigned') {
                            const accRef = doc(db, "global_accounts", rawCounter);
                            batch.set(accRef, {
                                username: rawCounter,
                                name: rawCounter.toUpperCase(),
                                pin: '1234',
                                email: `${rawCounter}@anymindgroup.com`
                            }, { merge: true });

                            if (pId) {
                                const teamRef = doc(db, "project_teams", `${pId}_${rawCounter}`);
                                batch.set(teamRef, {
                                    projectId: pId,
                                    username: rawCounter,
                                    role: 'counter'
                                }, { merge: true });
                            }
                        }

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
                            counter: rawCounter,
                            Status: row['Status'] || 'Active',
                            currentRound: parseInt(row['current round']) || 1,
                            expiredDateSystem: row['expired date by system'] || '',
                            expiredDateActual: row['expired date by actual'] || '',
                            Qty: parseInt(row['Qty System'] || row['QTY SYSTEM']) || 0,
                            unitPrice: parseInt(row['Unit Price'] || '0'),
                            isCounted,
                            QTY_ACTUAL: isCounted ? numActQty : null,
                            updatedAt: new Date().toISOString()
                        };

                        const taskRef = doc(db, "master_tasks", taskId);
                        batch.set(taskRef, taskDoc, { merge: true });

                        newMasterList.push({
                            id: taskId,
                            ...taskDoc,
                            countedQty: isCounted ? numActQty : undefined,
                            Remarks: row['REMARKS'] || ''
                        });
                    }

                    await batch.commit();
                    setMasterDataList(newMasterList);
                    triggerNotification(`Upload Berhasil! ${newMasterList.length} SKU tersimpan di Firestore Cloud.`);
                    resolve(newMasterList);
                } catch (err: any) {
                    console.error("Batch commit error:", err);
                    const errorMsg = err?.message || String(err);
                    triggerNotification(`Gagal upload ke Firestore: ${errorMsg}`);
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsArrayBuffer(file);
        });
    };

    const handleReassignCounter = async (taskIndex: number, newCounter: string) => {
        const targetItem = masterDataList[taskIndex];
        const cleanCounter = newCounter.toLowerCase().trim();
        const rawTaskId = targetItem.id || `${targetItem.Location}_${targetItem.SKU}_${taskIndex + 1}`;
        const taskId = rawTaskId.replace(/\//g, '-');

        await setDoc(doc(db, "master_tasks", taskId), {
            counter: cleanCounter,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        const updatedList = [...masterDataList];
        updatedList[taskIndex].counter = cleanCounter;
        setMasterDataList(updatedList);

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
            'satuan hitung': item.satuanHitung || 'PCS'
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
        if (projectToDelete) {
            await deleteDoc(doc(db, "projects", projectToDelete.id));
            triggerNotification(`Project "${projectToDelete.sessionCode}" dihapus.`);
            setProjectToDelete(null);
        }
    };

    const handleStartNewProjectSession = async () => {
        const allLocs = [...warehouseList, ...consignmentStoreList];
        const matched = allLocs.find(l => l.id === wizLocationId);
        const locName = matched ? matched.name : (wizLocationId || 'Gudang Utama');
        const projId = `PROJ-${Date.now().toString().slice(-4)}`;
        const newSession: ProjectSession = {
            id: projId,
            sessionCode: wizSessionCode.trim() || `SO-${wizLocationId}-${wizOpnameDate}`,
            locationId: wizLocationId || 'WH-01', locationName: locName, opnameDate: wizOpnameDate,
            method: wizMethod, status: 'LIVE_ACTIVE', createdAt: new Date().toLocaleString()
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
        await setDoc(doc(db, "project_teams", `${activeProject.id}_${assignUsername}`), {
            projectId: activeProject.id,
            username: assignUsername,
            role: assignRole
        });
        setAssignUsername('');
        triggerNotification(`${assignUsername} ditugaskan sebagai ${assignRole}!`);
    };

    const handleRemoveTeamMember = async (username: string) => {
        if (!activeProject) return;
        await deleteDoc(doc(db, "project_teams", `${activeProject.id}_${username}`));
        triggerNotification(`Akses ${username} dicabut.`);
    };

    const activeTeamMembers = activeProject ? allProjectTeams.filter(t => t.projectId === activeProject.id) : [];

    // AGGREGASI MONITORING PIC COUNTER REALTIME
    const counterGroups = masterDataList.reduce((acc: any, item) => {
        const cName = item.counter || 'Unassigned';
        if (!acc[cName]) acc[cName] = { total: 0, counted: 0, errorCount: 0 };
        acc[cName].total++;
        if (item.isCounted) {
            acc[cName].counted++;
            if ((item.countedQty ?? item.Qty) !== item.Qty) acc[cName].errorCount++;
        }
        return acc;
    }, {});

    const filteredCounterNames = Object.keys(counterGroups).filter(cName =>
        cName.toLowerCase().includes(counterSearch.toLowerCase())
    );

    const counterDiscrepancies = selectedCounterForDetail
        ? masterDataList.filter(m => m.counter === selectedCounterForDetail && m.isCounted && (m.countedQty ?? m.Qty) !== m.Qty)
        : [];

    const totalSKUs = masterDataList.length;
    const totalCounted = masterDataList.filter(i => i.isCounted).length;
    const overallPercentage = totalSKUs > 0 ? Math.round((totalCounted / totalSKUs) * 100) : 0;
    const liveIssues = masterDataList.filter(item => item.isCounted && (item.countedQty ?? item.Qty) !== item.Qty);

    const levelProgress = Object.keys(masterDataList.reduce((acc: any, item) => {
        const l = item.level || 'Unassigned'; if (!acc[l]) acc[l] = { total: 0, counted: 0 };
        acc[l].total++; if (item.isCounted) acc[l].counted++; return acc;
    }, {})).map(name => {
        const group = masterDataList.reduce((acc: any, item) => {
            const l = item.level || 'Unassigned'; if (!acc[l]) acc[l] = { total: 0, counted: 0 };
            acc[l].total++; if (item.isCounted) acc[l].counted++; return acc;
        }, {})[name];
        return { name, total: group.total, counted: group.counted, percentage: Math.round((group.counted / group.total) * 100) };
    });

    const brandAccuracyList = Array.from(new Set(masterDataList.map(m => m.SKUBrand))).map(brandName => {
        const brandSKUs = masterDataList.filter(m => m.SKUBrand === brandName);
        const diffCount = brandSKUs.filter(m => m.isCounted && (m.countedQty ?? m.Qty) !== m.Qty).length;
        return { brand: brandName || 'No Brand', totalSKUs: brandSKUs.length, diffSKUs: diffCount, accuracyPct: Math.max(0, Math.round(((brandSKUs.length) - diffCount) / (brandSKUs.length) * 100)), skuList: brandSKUs };
    }).filter(b => b.brand.toLowerCase().includes(brandSearch.toLowerCase()) && (brandStatusFilter === 'all' || (brandStatusFilter === 'selisih' ? b.diffSKUs > 0 : b.diffSKUs === 0)));

    const matchRecoveryCount = masterDataList.filter(m => m.isCounted && (m.countedQty ?? m.Qty) === m.Qty).length;
    const varianceRecoveryCount = masterDataList.filter(m => m.isCounted && (m.countedQty ?? m.Qty) !== m.Qty).length;
    const totalFinancialVarianceValue = masterDataList.reduce((acc, m) => acc + (m.isCounted ? (((m.countedQty ?? m.Qty) - m.Qty) * (m.unitPrice || 0)) : 0), 0);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 lg:p-8 max-w-7xl mx-auto font-sans relative">
            {showToast && (
                <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in slide-in-from-top-4 duration-300">
                    <Check className="w-5 h-5 text-emerald-400" /><span className="text-sm font-semibold">{showToast}</span>
                </div>
            )}

            {/* MODAL POPUP TEKS KREDENSIAL / COPY PASTE TEXT */}
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

            {/* MODAL POPUP BULK REASSIGN COUNTER ABSEN */}
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

            {/* MODAL EDIT KTP CLOUD */}
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

            {/* MODAL POPUP DETAIL SELISIH COUNTER */}
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
                            <div className="p-3.5 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg"><Archive className="w-8 h-8" /></div>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900">AnyMind Global Control Center</h1>
                                <p className="text-sm text-slate-500 mt-0.5 font-medium">Enterprise Real-Time Firestore Database</p>
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

                    {/* ACCOUNTS (KTP) TAB DENGAN IMPORT MASSAL & MODAL TEKS KREDENSIAL */}
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
                                    <input type="password" maxLength={4} value={ownerNewPin} onChange={(e) => setOwnerNewPin(e.target.value)} placeholder="PIN Baru (4-Digit)" className="px-4 py-2.5 text-xs font-mono bg-slate-50 border rounded-xl outline-none" />
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleUpdateOwnerAccount} className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 flex items-center space-x-1.5">
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

            {/* SCREEN 3: DASHBOARD MAIN */}
            {viewState === 'DASHBOARD' && activeProject && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-white p-5 rounded-3xl shadow-xl border border-slate-100 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                        <div className="flex items-center space-x-4 shrink-0">
                            <button onClick={() => setViewState('LANDING')} className="p-3 bg-slate-50 rounded-2xl"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
                            <div>
                                <div className="flex items-center space-x-3">
                                    <h1 className="text-xl font-black text-slate-900">{activeProject.sessionCode}</h1>
                                    {effectiveRole === 'owner' ? (
                                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center space-x-1 border border-indigo-200">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>SUPER ADMIN</span>
                                        </span>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-200">SUPERVISOR</span>
                                    )}
                                    {/* TOMBOL PENGUNCIAN GLOBAL UNTUK OWNER */}
                                    {effectiveRole === 'owner' && (
                                        <button
                                            onClick={handleToggleGlobalLock}
                                            className={`ml-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm border transition-colors cursor-pointer ${isProjectLocked ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                                        >
                                            {isProjectLocked ? <><Unlock className="w-3.5 h-3.5" />Buka Sesi Global</> : <><Lock className="w-3.5 h-3.5" />Kunci Sesi Global</>}
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 font-medium flex items-center space-x-2 mt-1"><MapPin className="w-3.5 h-3.5" /><span>{activeProject.locationName}</span></p>
                            </div>
                        </div>

                        {/* TAB NAVIGASI UTAMA SCROLLABLE */}
                        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto max-w-full scrollbar-thin">
                            <div className="flex space-x-2 flex-nowrap whitespace-nowrap">
                                {orderedTabs.map(t => (
                                    <button key={t.id} draggable onDragStart={(e) => handleDragStart(e, t.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, t.id)} onClick={() => setActiveTab(t.id)} className={`px-5 py-2.5 text-sm font-bold rounded-xl flex items-center space-x-2 cursor-pointer transition-all ${activeTab === t.id ? 'bg-white shadow-md text-indigo-700' : 'text-slate-500 hover:text-slate-800'}`}>
                                        <GripHorizontal className="w-3.5 h-3.5 opacity-30 cursor-grab shrink-0" />
                                        <t.icon className="w-4 h-4 shrink-0" /><span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* TAB 1: PROGRESS & ANALYTICS */}
                    {activeTab === 'progress' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-2">
                                    <h3 className="text-sm font-extrabold text-slate-500 uppercase flex items-center"><PieChart className="w-4 h-4 mr-1.5 text-indigo-500" />Completion</h3>
                                    <div className="text-4xl font-black text-slate-900">{overallPercentage}%</div>
                                    <p className="text-xs font-bold text-slate-500">{totalCounted} / {totalSKUs} SKU Terhitung</p>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4">
                                    <h3 className="text-sm font-extrabold text-slate-500 uppercase flex items-center"><Filter className="w-4 h-4 mr-1.5 text-indigo-500" />Tampilan Ronde</h3>
                                    <select value={viewRoundFilter} onChange={(e) => setViewRoundFilter(e.target.value === 'overall' ? 'overall' : parseInt(e.target.value, 10) as 1 | 2 | 3 | 4)} className="w-full p-3.5 bg-slate-50 border rounded-2xl text-sm font-black text-indigo-700 outline-none">
                                        <option value="overall">📊 Overall Keseluruhan</option>
                                        <option value={1}>1️⃣ Ronde 1</option>
                                        <option value={2}>2️⃣ Ronde 2</option>
                                    </select>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-3">
                                    <h3 className="text-sm font-extrabold text-slate-500 uppercase flex items-center"><AlertTriangle className="w-4 h-4 mr-1.5 text-red-500" />Live Dispute</h3>
                                    <div className="text-4xl font-black text-red-600">{liveIssues.length}</div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 gap-3">
                                    <h3 className="text-base font-black text-slate-900 flex items-center"><UserCheck className="w-5 h-5 mr-2 text-indigo-600" />Real-Time Monitoring Progress Per Counter PIC</h3>

                                    <div className="relative w-full md:w-64">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Cari PIC Counter..."
                                            value={counterSearch}
                                            onChange={(e) => setCounterSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border rounded-xl text-xs font-bold outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredCounterNames.map((cName, idx) => {
                                        const cData = counterGroups[cName];
                                        const pct = cData.total > 0 ? Math.round((cData.counted / cData.total) * 100) : 0;

                                        // Key gembok dibaca selalu lowercase
                                        const cleanCounterKey = cName.toLowerCase().trim();
                                        const isLocked = !!lockedCounters[cleanCounterKey];

                                        return (
                                            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 hover:border-indigo-400">
                                                <div className="flex justify-between items-start">
                                                    <div className="text-sm font-black text-slate-900 capitalize">
                                                        <span>{cName}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1.5">
                                                        <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800">{pct}% Done</span>
                                                        {effectiveRole === 'owner' && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeployRound2ForCounter(cName); }}
                                                                    title="Deploy Ronde 2 Khusus Counter Ini"
                                                                    className="p-1.5 rounded-md cursor-pointer bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                                                >
                                                                    <Repeat className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setTransferSourceCounter(cName); }}
                                                                    title="Transfer Seluruh Tugas Counter Ini (Jika Absen)"
                                                                    className="p-1.5 rounded-md cursor-pointer bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleToggleCounterLock(cName, isLocked); }}
                                                                    title={isLocked ? "Buka Akses Input Counter" : "Kunci Akses Input Counter"}
                                                                    className={`p-1.5 rounded-md cursor-pointer transition-colors ${isLocked ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                                                                >
                                                                    {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                {cData.errorCount > 0 && <div className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md">⚠️ {cData.errorCount} SKU Selisih Ditemukan</div>}

                                                <button
                                                    onClick={() => setSelectedCounterForDetail(cName)}
                                                    className="w-full mt-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                    <span>Lihat Detail</span>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* LEVEL PROGRESS & BRAND ACCURACY */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-5">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-base font-black text-slate-900">Progress per Level Rak</h3>
                                        <button onClick={() => setShowLevelProgress(!showLevelProgress)} className="p-1.5 bg-slate-50 rounded-lg hover:bg-slate-100">
                                            <ChevronUp className={`w-4 h-4 text-slate-500 transition-transform ${showLevelProgress ? 'rotate-180' : ''}`} />
                                        </button>
                                    </div>
                                    {!showLevelProgress && (
                                        <div className="space-y-4">
                                            {levelProgress.map((lvl, idx) => (
                                                <div key={idx} className="space-y-2">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-slate-700">Level {lvl.name}</span>
                                                        <span className="text-indigo-600">{lvl.counted}/{lvl.total} ({lvl.percentage}%)</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                        <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${lvl.percentage}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-5">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
                                        <h3 className="text-base font-black text-slate-900 flex items-center">
                                            <TrendingDown className="w-5 h-5 mr-2 text-indigo-500" />
                                            Akurasi Hitung per Brand
                                        </h3>
                                        <div className="flex items-center space-x-2">
                                            <div className="relative">
                                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                                <input type="text" placeholder="Cari Brand..." value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border rounded-xl text-sm font-bold outline-none" />
                                            </div>
                                            <select value={brandStatusFilter} onChange={(e) => setBrandStatusFilter(e.target.value as any)} className="px-3 py-2 bg-slate-50 border rounded-xl text-sm font-bold outline-none">
                                                <option value="all">All</option>
                                                <option value="selisih">Selisih</option>
                                                <option value="match">Match</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                                        {brandAccuracyList.map((bAcc, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="text-sm font-black text-slate-900">{bAcc.brand}</span>
                                                        <div className="text-xs text-slate-500 font-medium mt-0.5">{bAcc.totalSKUs} SKU Total • <span className="text-red-500 font-bold">{bAcc.diffSKUs} Selisih</span></div>
                                                    </div>
                                                    <div className="flex flex-col items-end space-y-2">
                                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${bAcc.accuracyPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{bAcc.accuracyPct}% Akurat</span>
                                                        <button onClick={() => setExpandedBrandDetail(prev => ({ ...prev, [bAcc.brand]: !prev[bAcc.brand] }))} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100">
                                                            {expandedBrandDetail[bAcc.brand] ? 'Tutup Detail' : 'Lihat SKU'}
                                                        </button>
                                                    </div>
                                                </div>
                                                {expandedBrandDetail[bAcc.brand] && (
                                                    <div className="mt-3 bg-white border rounded-xl overflow-x-auto text-[10px]">
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: MASTER TASK */}
                    {activeTab === 'master' && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-5">
                            <div className="flex justify-between items-center border-b pb-4">
                                <h3 className="text-base font-black text-slate-900">Database Master Task & Lokasi Rak</h3>
                                <div className="flex items-center space-x-3">
                                    <button onClick={handleExportCurrentMasterXLSX} className="px-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold flex items-center space-x-2"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /><span>Export Data saat Ini (.xlsx)</span></button>
                                    <label className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold cursor-pointer flex items-center space-x-2"><Upload className="w-4 h-4" /><span>Upload Master</span><input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) parseXLSXFile(e.target.files[0]); }} /></label>
                                </div>
                            </div>
                            <div className="overflow-x-auto border rounded-2xl max-h-125">
                                <table className="w-full text-left text-[11px] min-w-max"><thead className="bg-slate-50 font-black text-slate-600 border-b"><tr><th className="p-3">OWNER SKU</th><th className="p-3">SKU</th><th className="p-3">DESKRIPSI</th><th className="p-3">UPC 1</th><th className="p-3">UPC 2</th><th className="p-3">LOKASI RAK</th><th className="p-3">COUNTER PIC</th><th className="p-3 text-center">WMS QTY</th><th className="p-3 text-center">ACTUAL QTY</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {masterDataList.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold text-slate-800">{row.Owner || 'DDI'}</td>
                                                <td className="p-3 font-mono font-black text-indigo-600">{row.SKU}</td>
                                                <td className="p-3 truncate max-w-xs">{row.Description}</td>
                                                <td className="p-3 font-mono">{row.UPC1 || '-'}</td>
                                                <td className="p-3 font-mono">{row.UPC2 || '-'}</td>
                                                <td className="p-3 font-mono font-bold">{row.Location}</td>
                                                <td className="p-2">
                                                    <SearchableSelect
                                                        options={globalAccounts.map(acc => ({ value: acc.username, label: acc.username }))}
                                                        value={row.counter === 'unassigned' ? '' : row.counter}
                                                        onChange={(val: string) => handleReassignCounter(idx, val)}
                                                        placeholder="Assign..."
                                                        className="w-32"
                                                    />
                                                </td>
                                                <td className="p-3 text-center font-bold text-slate-400">{row.Qty}</td>
                                                <td className="p-3 text-center font-black text-sm">{(row.isCounted && row.countedQty !== undefined && !isNaN(row.countedQty)) ? row.countedQty : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: RECON */}
                    {activeTab === 'recon' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xl flex items-center justify-between"><div><div className="text-xs font-black text-emerald-600 uppercase mb-1">Match Valid</div><div className="text-3xl font-black text-emerald-900">{matchRecoveryCount}</div></div><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
                                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-xl flex items-center justify-between"><div><div className="text-xs font-black text-red-600 uppercase mb-1">Variance Dispute</div><div className="text-3xl font-black text-red-900">{varianceRecoveryCount}</div></div><XCircle className="w-8 h-8 text-red-500" /></div>
                                <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-xl flex items-center justify-between"><div><div className="text-xs font-black text-amber-700 uppercase mb-1">Valuasi Selisih</div><div className="text-2xl font-black text-amber-900">Rp {totalFinancialVarianceValue.toLocaleString('id-ID')}</div></div><DollarSign className="w-6 h-6 text-amber-600" /></div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl space-y-4">
                                <div className="flex justify-between items-center border-b pb-3">
                                    <h3 className="text-base font-black text-slate-900 flex items-center"><Scale className="w-5 h-5 mr-2 text-indigo-600" />Laporan Selisih & Override Recovery</h3>

                                    <button onClick={handleExportReconXLSX} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer">
                                        <FileSpreadsheet className="w-4 h-4" />
                                        <span>Download Recon (.xlsx)</span>
                                    </button>
                                </div>
                                <div className="overflow-x-auto border rounded-2xl">
                                    <table className="w-full text-left text-sm"><thead className="bg-slate-50 font-black text-slate-600 border-b"><tr><th className="p-4">SKU BARANG</th><th className="p-4 text-center">WMS QTY</th><th className="p-4 text-center">QTY GOOD</th><th className="p-4 text-center text-red-600">QTY BAD</th><th className="p-4 text-center">ACTUAL QTY</th><th className="p-4 text-center">SELISIH</th><th className="p-4 text-right bg-amber-50">VALUASI (Rp)</th><th className="p-4 text-right bg-indigo-50">OVERRIDE RECOVERY</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {masterDataList.filter(i => i.isCounted && ((i.countedQty || 0) - i.Qty) !== 0).map((item, i) => {
                                                const diff = (item.countedQty || 0) - item.Qty;
                                                const val = diff * (item.unitPrice || 0);
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="p-4 font-mono font-bold text-indigo-600">{item.SKU}</td>
                                                        <td className="p-4 text-center text-slate-500">{item.Qty}</td>
                                                        <td className="p-4 text-center font-bold text-emerald-600">{item.qtyGood ?? item.countedQty}</td>
                                                        <td className="p-4 text-center font-bold text-red-600">{item.qtyBad ?? 0}</td>
                                                        <td className="p-4 text-center font-black">{item.countedQty}</td>
                                                        <td className="p-4 text-center text-red-600 font-black">{diff > 0 ? `+${diff}` : diff}</td>
                                                        <td className="p-4 text-right font-mono text-amber-700 font-bold bg-amber-50/20">Rp {val.toLocaleString('id-ID')}</td>
                                                        <td className="p-4 text-right bg-indigo-50/10">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <input type="number" placeholder="Qty Final" className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono outline-none" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRecoveryOverride(item.SKU, parseInt((e.target as HTMLInputElement).value, 10)); }} />
                                                                <button onClick={(e) => handleSaveRecoveryOverride(item.SKU, parseInt(((e.currentTarget.previousElementSibling as HTMLInputElement).value), 10))} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md"><Save className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
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
                                        Total {auditLogs.length} Entri Log
                                    </span>
                                    <button
                                        onClick={handleExportAuditTrailXLSX}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer"
                                    >
                                        <FileSpreadsheet className="w-4 h-4" />
                                        <span>Download Audit Log (.xlsx)</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto border rounded-2xl max-h-125">
                                <table className="w-full text-left text-[11px] min-w-max border-collapse">
                                    <thead className="bg-slate-50 font-black text-slate-600 border-b">
                                        <tr>
                                            <th className="p-3 border-r whitespace-nowrap">TIMESTAMP (JAM SUBMIT)</th>
                                            <th className="p-3 border-r">LOKASI RAK</th>
                                            <th className="p-3 border-r">OWNER SKU</th>
                                            <th className="p-3 border-r">SKU & DESKRIPSI</th>
                                            <th className="p-3 border-r">UPC 1</th>
                                            <th className="p-3 border-r">UPC 2</th>
                                            <th className="p-3 border-r">COUNTER PIC</th>
                                            <th className="p-3 border-r text-center">RONDE</th>
                                            <th className="p-3 border-r text-center text-emerald-700">QTY GOOD</th>
                                            <th className="p-3 border-r text-center text-red-700">QTY BAD</th>
                                            <th className="p-3 border-r text-center font-black">TOTAL FINAL SUBMITTED</th>
                                            <th className="p-3 border-r">ED ACTUAL</th>
                                            <th className="p-3">REMARKS</th>
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
                                                <td className="p-3 text-slate-500">{log.remarks || log.Remarks || '-'}</td>
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

                    {/* TAB 5: SETTINGS */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6">
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
            )}
        </div>
    );
}