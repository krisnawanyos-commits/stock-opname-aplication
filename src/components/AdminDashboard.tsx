import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection, onSnapshot, doc, setDoc, deleteDoc
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import {
    Users, Database, Upload, ShieldCheck, Check, FileSpreadsheet,
    PieChart, ChevronDown, ChevronUp, Plus, Trash2, MapPin, Save,
    UserPlus, Filter, TrendingDown, Printer, SlidersHorizontal,
    CheckCircle2, XCircle, Search, Building2, DollarSign,
    Download, Scale, PlayCircle, Archive, ArrowLeft, AlertTriangle,
    LogOut, GripHorizontal, Contact, Eye, EyeOff, UserCheck, Clock, Store, Link2
} from 'lucide-react';
import type { UserRole } from '../types';

interface AdminDashboardProps {
    onBackToApp: () => void;
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
    { id: 'settings', label: 'Tim & Configurations', icon: SlidersHorizontal, roles: ['owner'] },
];

const SearchableSelect = ({ options, value, onChange, placeholder, className = "" }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
    const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

    return (
        <div className={`relative ${className}`}>
            <div className="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl outline-none font-bold cursor-pointer flex justify-between items-center hover:bg-slate-50 transition-colors shadow-xs" onClick={() => setIsOpen(!isOpen)}>
                <span className={value ? "text-slate-800 truncate" : "text-slate-400 truncate"}>{selectedLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
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

export default function AdminDashboard({ onBackToApp, currentUserRole = 'owner', currentUserEmail = 'yos.krisnawan@anymindgroup.com' }: AdminDashboardProps) {

    const OWNER_WHITELIST = ['yos.krisnawan@anymindgroup.com', 'krisnawanyos@gmail.com'];
    const isWhitelistedOwner = currentUserRole === 'owner' && OWNER_WHITELIST.includes(currentUserEmail.toLowerCase().trim());
    const effectiveRole: UserRole = isWhitelistedOwner ? 'owner' : (currentUserRole === 'owner' ? 'spv' : currentUserRole);

    const [viewState, setViewState] = useState<'LANDING' | 'WIZARD_SETUP' | 'DASHBOARD'>('LANDING');
    const [landingTab, setLandingTab] = useState<'projects' | 'accounts'>('projects');
    const [projectToDelete, setProjectToDelete] = useState<ProjectSession | null>(null);

    const [activeTab, setActiveTab] = useState<string>('progress');
    const [orderedTabs, setOrderedTabs] = useState<TabDefinition[]>([]);
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

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

    const [wizLocationId, setWizLocationId] = useState<string>('');
    const [wizOpnameDate, setWizOpnameDate] = useState<string>('2026-09-22');
    const [wizSessionCode, setWizSessionCode] = useState<string>('SO-WRG-2026-09');
    const [wizMethod, setWizMethod] = useState<'LIST_TO_FLOOR' | 'FLOOR_TO_LIST'>('LIST_TO_FLOOR');

    const [showToast, setShowToast] = useState<string | null>(null);
    const triggerNotification = (message: string) => { setShowToast(message); setTimeout(() => setShowToast(null), 3000); };

    // ANALYTICS STATES
    const [showLevelProgress, setShowLevelProgress] = useState<boolean>(false);
    const [viewRoundFilter, setViewRoundFilter] = useState<'overall' | 1 | 2 | 3 | 4>('overall');
    const [brandSearch, setBrandSearch] = useState<string>('');
    const [brandStatusFilter, setBrandStatusFilter] = useState<'all' | 'selisih' | 'match'>('all');
    const [expandedBrandDetail, setExpandedBrandDetail] = useState<{ [brand: string]: boolean }>({});
    const [recoveryAdjustments, setRecoveryAdjustments] = useState<{ [sku: string]: number }>({});
    const [initialFileToUpload, setInitialFileToUpload] = useState<File | null>(null);

    // FIRESTORE LISTENERS
    const [globalAccounts, setGlobalAccounts] = useState<GlobalAccount[]>([]);
    const [projectHistory, setProjectHistory] = useState<ProjectSession[]>([]);
    const [allProjectTeams, setAllProjectTeams] = useState<ProjectTeamMember[]>([]);
    const [warehouseList, setWarehouseList] = useState<LocationOption[]>([]);
    const [consignmentStoreList, setConsignmentStoreList] = useState<LocationOption[]>([]);
    const [activeProject, setActiveProject] = useState<ProjectSession | null>(null);

    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, "global_accounts"), (snap) => setGlobalAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as GlobalAccount))));
        const unsub2 = onSnapshot(collection(db, "projects"), (snap) => setProjectHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectSession))));
        const unsub3 = onSnapshot(collection(db, "project_teams"), (snap) => setAllProjectTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectTeamMember))));

        const unsub4 = onSnapshot(collection(db, "warehouses"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as LocationOption));
            setWarehouseList(list.length === 0 ? [
                { id: 'WH-01', name: 'Waringin-Kosambi', type: 'NON_CONSIGNMENT' },
                { id: 'WH-02', name: 'Biteship-Surabaya', type: 'NON_CONSIGNMENT' }
            ] : list);
        });

        const unsub5 = onSnapshot(collection(db, "consignment_stores"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as LocationOption));
            setConsignmentStoreList(list.length === 0 ? [
                { id: 'STORE-01', name: 'XY14-The FoodHall Grand Indonesia-(GI)', type: 'CONSIGNMENT' },
                { id: 'STORE-02', name: 'XY02-The FoodHall Gourmet Plaza Indonesia-(PI)', type: 'CONSIGNMENT' }
            ] : list);
        });

        return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
    }, []);

    const combinedLocationOptions = [
        ...warehouseList.map(w => ({ value: w.id, label: `[Gudang WMS] ${w.name}` })),
        ...consignmentStoreList.map(s => ({ value: s.id, label: `[Store Offline] ${s.name}` }))
    ];

    // KTP GLOBAL MANAGEMENT
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

    const handleBulkyKTPUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n');
            let count = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',');
                if (cols.length >= 2 && cols[0]?.trim()) {
                    const uName = cols[0].trim().toLowerCase();
                    await setDoc(doc(db, "global_accounts", uName), { username: uName, name: cols[1]?.trim() || uName, pin: cols[2]?.trim() || '1234', email: cols[3]?.trim() || `${uName}@anymindgroup.com` });
                    count++;
                }
            }
            if (count > 0) triggerNotification(`Import Sukses! ${count} KTP tersimpan.`);
        };
        reader.readAsText(file);
    };

    const togglePinVisibility = (id: string) => setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));

    const handleDownloadKTPTemplate = () => {
        const csvContent = "Username,Nama Lengkap,PIN,Email\nrudi.so,Rudi Tabuti,1234,rudi@anymindgroup.com";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Import_KTP_Global.csv'); link.click();
        triggerNotification('Template KTP (.csv) diunduh!');
    };

    // LOKASI HANDLERS
    const handleAddWarehouseCloud = async () => {
        if (newWhName.trim()) {
            const id = `WH-${(warehouseList.length + 1).toString().padStart(2, '0')}`;
            await setDoc(doc(db, "warehouses", id), { name: newWhName.trim(), type: 'NON_CONSIGNMENT' });
            setNewWhName(''); triggerNotification(`Gudang WMS "${newWhName.trim()}" tersimpan di Cloud!`);
        }
    };
    const handleDeleteWarehouseCloud = async (whId: string, whName: string) => {
        if (window.confirm(`Hapus gudang "${whName}" dari Cloud?`)) {
            await deleteDoc(doc(db, "warehouses", whId));
            triggerNotification(`Gudang "${whName}" dihapus.`);
        }
    };
    const handleBulkyWarehouseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
                let count = 0;
                const startIndex = lines[0]?.toLowerCase().includes('nama gudang') ? 1 : 0;
                for (let i = startIndex; i < lines.length; i++) {
                    const whName = lines[i];
                    if (whName) {
                        const id = `WH-${(warehouseList.length + i + 1).toString().padStart(2, '0')}`;
                        await setDoc(doc(db, "warehouses", id), { name: whName, type: 'NON_CONSIGNMENT' });
                        count++;
                    }
                }
                if (count > 0) triggerNotification(`Upload Bulky Sukses! ${count} Gudang WMS tersimpan.`);
            };
            reader.readAsText(file);
        }
    };
    const handleDownloadWarehouseTemplate = () => {
        const blob = new Blob(["Nama Gudang\nWaringin-Kosambi\nBiteship-Surabaya"], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Master_Gudang_WMS.csv'); link.click();
        triggerNotification('Template Gudang WMS (.csv) diunduh!');
    };

    const handleAddStoreCloud = async () => {
        if (newStoreName.trim()) {
            const id = `STORE-${(consignmentStoreList.length + 1).toString().padStart(2, '0')}`;
            await setDoc(doc(db, "consignment_stores", id), { name: newStoreName.trim(), type: 'CONSIGNMENT' });
            setNewStoreName(''); triggerNotification(`Toko Consignment "${newStoreName.trim()}" tersimpan di Cloud!`);
        }
    };
    const handleDeleteStoreCloud = async (stId: string, stName: string) => {
        if (window.confirm(`Hapus toko consignment "${stName}" dari Cloud?`)) {
            await deleteDoc(doc(db, "consignment_stores", stId));
            triggerNotification(`Toko "${stName}" dihapus.`);
        }
    };
    const handleBulkyStoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
                let count = 0;
                const startIndex = lines[0]?.toLowerCase().includes('nama store') ? 1 : 0;
                for (let i = startIndex; i < lines.length; i++) {
                    const stName = lines[i];
                    if (stName) {
                        const id = `STORE-${(consignmentStoreList.length + i + 1).toString().padStart(2, '0')}`;
                        await setDoc(doc(db, "consignment_stores", id), { name: stName, type: 'CONSIGNMENT' });
                        count++;
                    }
                }
                if (count > 0) triggerNotification(`Upload Bulky Sukses! ${count} Toko Offline tersimpan.`);
            };
            reader.readAsText(file);
        }
    };
    const handleDownloadStoreTemplate = () => {
        const blob = new Blob(["Nama Store\nXY14-The FoodHall Grand Indonesia-(GI)\nXY02-The FoodHall Gourmet Plaza Indonesia-(PI)"], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Master_Store_Consignment.csv'); link.click();
        triggerNotification('Template Store Consignment (.csv) diunduh!');
    };

    // PROJECT CONTROL
    const handleConfirmDeleteProject = async () => {
        if (projectToDelete) {
            await deleteDoc(doc(db, "projects", projectToDelete.id));
            triggerNotification(`Project "${projectToDelete.sessionCode}" berhasil dihapus.`);
            setProjectToDelete(null);
        }
    };

    const handleStartNewProjectSession = async () => {
        const allLocs = [...warehouseList, ...consignmentStoreList];
        const matched = allLocs.find(l => l.id === wizLocationId);
        const locName = matched ? matched.name : (wizLocationId || 'Gudang Utama');
        const projId = `PROJ-${Date.now().toString().slice(-4)}`;
        const newSession = {
            sessionCode: wizSessionCode.trim() || `SO-${wizLocationId}-${wizOpnameDate}`,
            locationId: wizLocationId || 'WH-01', locationName: locName, opnameDate: wizOpnameDate,
            method: wizMethod, status: 'LIVE_ACTIVE', createdAt: new Date().toLocaleString()
        };
        await setDoc(doc(db, "projects", projId), newSession);
        if (initialFileToUpload) parseXLSXFile(initialFileToUpload); else setMasterDataList([]);
        setRecoveryAdjustments({}); setActiveProject({ id: projId, ...newSession } as ProjectSession);
        setViewState('DASHBOARD'); setActiveTab('progress');
        triggerNotification(`Project Baru Diluncurkan: ${newSession.sessionCode}`);
    };

    const handleOpenHistoricalProject = (proj: ProjectSession) => {
        setActiveProject(proj); setViewState('DASHBOARD'); setActiveTab('progress');
        triggerNotification(`Membuka Dashboard Project "${proj.sessionCode}"`);
    };

    // TIM & ACCESS
    const activeTeamMembers = activeProject ? allProjectTeams.filter(t => t.projectId === activeProject.id) : [];
    const [assignUsername, setAssignUsername] = useState('');
    const [assignRole, setAssignRole] = useState<UserRole>('counter');
    const assignOptions = globalAccounts.filter(acc => !activeTeamMembers.find(t => t.username === acc.username)).map(acc => ({ value: acc.username, label: `${acc.username} - ${acc.name}` }));

    const handleAssignTeamManual = async () => {
        if (!activeProject || !assignUsername) return;
        await setDoc(doc(db, "project_teams", `${activeProject.id}_${assignUsername}`), { projectId: activeProject.id, username: assignUsername, role: assignRole });
        setAssignUsername(''); triggerNotification(`${assignUsername} ditugaskan sebagai ${assignRole}!`);
    };

    const handleRemoveTeamMember = async (username: string) => {
        if (!activeProject) return;
        await deleteDoc(doc(db, "project_teams", `${activeProject.id}_${username}`));
        triggerNotification(`Akses ${username} dicabut.`);
    };

    const handleBulkyAssignTeam = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeProject) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target?.result as string;
                const lines = text.split('\n');
                if (lines.length > 1) {
                    let count = 0;
                    for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(',');
                        if (cols.length >= 2) {
                            const uName = cols[0]?.trim().toLowerCase();
                            const rawRole = cols[1]?.trim().toLowerCase();
                            const uRole: UserRole = (rawRole === 'spv' || rawRole === 'owner') ? (rawRole as UserRole) : 'counter';
                            if (uName) {
                                if (!globalAccounts.find(a => a.username === uName)) {
                                    await setDoc(doc(db, "global_accounts", uName), { username: uName, name: uName, pin: '1234', email: `${uName}@anymindgroup.com` });
                                }
                                await setDoc(doc(db, "project_teams", `${activeProject.id}_${uName}`), { projectId: activeProject.id, username: uName, role: uRole });
                                count++;
                            }
                        }
                    }
                    triggerNotification(`Assign Sukses! ${count} staff didaftarkan.`);
                }
            };
            reader.readAsText(file);
        }
    };

    const handleDownloadTeamTemplate = () => {
        const csvContent = "Username,Role\nriski.so,spv\nputri.so,counter";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Assign_Tim_Project.csv'); link.click();
    };

    // EXCEL PARSER DENGAN HEADER PRESISI UNTUK MASTER TASK
    const [masterDataList, setMasterDataList] = useState<MasterSKUItem[]>([]);
    const parseXLSXFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];
            const parsed = json.map(row => ({
                Owner: row['Owner'] || 'DDI', SKU: row['SKU']?.toString() || '', Description: row['Description'] || '',
                UPC1: row['UPC 1']?.toString() || '', UPC2: row['UPC 2']?.toString() || '', SKUBrand: row['SKU Brand'] || '',
                satuanHitung: row['satuan hitung'] || 'PCS', Location: row['Location']?.toString() || '', level: row['level']?.toString() || '1',
                ailee: row['ailee']?.toString() || '', Zone: row['Zone']?.toString() || '', LocationType: row['Location Type'] || 'RACK',
                counter: row['counter'] || 'Unassigned', Status: row['Status'] || 'Active', currentRound: parseInt(row['current round']) || 1,
                expiredDateSystem: row['expired date by system'] || '', expiredDateActual: row['expired date by actual'] || '',
                Qty: parseInt(row['Qty System'] || row['QTY SYSTEM']) || 0, countedQty: row['QTY ACTUAL'] !== undefined ? parseInt(row['QTY ACTUAL']) : undefined,
                Remarks: row['REMARKS'] || '', isCounted: row['QTY ACTUAL'] !== undefined, unitPrice: parseInt(row['Unit Price'] || '0')
            }));
            setMasterDataList(parsed); triggerNotification(`Upload ${parsed.length} SKU Sukses!`);
        };
        reader.readAsArrayBuffer(file);
    };

    // TEMPLATE EXCEL PARALEL SESUAI HEADER COUNTSHEET COUNTER
    const handleDownloadTemplateXLSX = () => {
        const templateData = [{
            Owner: 'DDI',
            SKU: 'ENFA-01',
            Description: 'Susu Kaleng 400g',
            'UPC 1': '12345678',
            'UPC 2': '',
            Status: 'Active',
            Location: 'R-01',
            level: '1',
            ailee: 'A',
            Zone: 'FOOD',
            'Location Type': 'RACK',
            counter: 'agus.lap',
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

    const handleSaveRecoveryOverride = (sku: string, newQty: number) => {
        setRecoveryAdjustments(prev => ({ ...prev, [sku]: newQty }));
        setMasterDataList(prev => prev.map(m => m.SKU === sku ? { ...m, countedQty: newQty, currentRound: 4, isCounted: true } : m));
        triggerNotification(`Stok SKU ${sku} disesuaikan ke ${newQty}!`);
    };

    // COMPUTATIONS
    const filteredMasterDataList = masterDataList.filter(item => {
        if (viewRoundFilter === 'overall') return true;
        if (viewRoundFilter === 1) return item.currentRound === 1 || !item.isCounted;
        return item.currentRound === viewRoundFilter;
    });

    const totalSKUs = filteredMasterDataList.length;
    const totalCounted = filteredMasterDataList.filter(i => i.isCounted).length;
    const overallPercentage = totalSKUs > 0 ? Math.round((totalCounted / totalSKUs) * 100) : 0;
    const strokeDashoffset = (2 * Math.PI * 38) - (overallPercentage / 100) * (2 * Math.PI * 38);

    const liveIssues = masterDataList.filter(item => item.isCounted && (item.countedQty ?? item.Qty) !== item.Qty);

    const levelProgress = Object.keys(filteredMasterDataList.reduce((acc: any, item) => {
        const l = item.level || 'Unassigned'; if (!acc[l]) acc[l] = { total: 0, counted: 0 };
        acc[l].total++; if (item.isCounted) acc[l].counted++; return acc;
    }, {})).map(name => {
        const group = filteredMasterDataList.reduce((acc: any, item) => {
            const l = item.level || 'Unassigned'; if (!acc[l]) acc[l] = { total: 0, counted: 0 };
            acc[l].total++; if (item.isCounted) acc[l].counted++; return acc;
        }, {})[name];
        return { name, total: group.total, counted: group.counted, percentage: Math.round((group.counted / group.total) * 100) };
    });

    const counterGroups = filteredMasterDataList.reduce((acc: any, item) => {
        const cName = item.counter || 'Unassigned'; if (!acc[cName]) acc[cName] = { total: 0, counted: 0, errorCount: 0 };
        acc[cName].total++;
        if (item.isCounted) {
            acc[cName].counted++;
            if ((item.countedQty ?? item.Qty) !== item.Qty) acc[cName].errorCount++;
        }
        return acc;
    }, {});

    const brandAccuracyList = Array.from(new Set(masterDataList.map(m => m.SKUBrand))).map(brandName => {
        const brandSKUs = masterDataList.filter(m => m.SKUBrand === brandName);
        const diffCount = brandSKUs.filter(m => m.isCounted && (m.countedQty ?? m.Qty) !== m.Qty).length;
        return { brand: brandName || 'No Brand', totalSKUs: brandSKUs.length, diffSKUs: diffCount, accuracyPct: Math.max(0, Math.round(((brandSKUs.length) - diffCount) / (brandSKUs.length) * 100)), skuList: brandSKUs };
    }).filter(b => b.brand.toLowerCase().includes(brandSearch.toLowerCase()) && (brandStatusFilter === 'all' || (brandStatusFilter === 'selisih' ? b.diffSKUs > 0 : b.diffSKUs === 0)));

    const matchRecoveryCount = masterDataList.filter(m => (recoveryAdjustments[m.SKU] !== undefined ? recoveryAdjustments[m.SKU] : (m.countedQty ?? m.Qty)) === m.Qty).length;
    const varianceRecoveryCount = masterDataList.length - matchRecoveryCount;
    const totalFinancialVarianceValue = masterDataList.reduce((acc, m) => acc + (((recoveryAdjustments[m.SKU] !== undefined ? recoveryAdjustments[m.SKU] : (m.countedQty ?? m.Qty)) - m.Qty) * (m.unitPrice || 0)), 0);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 p-4 lg:p-8 max-w-7xl mx-auto font-sans relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-2xl hidden md:block"></div>

            {showToast && (
                <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-700 animate-in slide-in-from-top-4 duration-300">
                    <Check className="w-5 h-5 text-emerald-400" /><span className="text-sm font-semibold">{showToast}</span>
                </div>
            )}

            {projectToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
                        <div className="flex items-center space-x-3 text-red-600"><AlertTriangle className="w-8 h-8" /><h3 className="text-lg font-black text-slate-900">Hapus Project Cloud</h3></div>
                        <p className="text-sm text-slate-600 leading-relaxed">Yakin hapus project <b className="text-slate-900">{projectToDelete.sessionCode}</b>? Data dari Firestore akan musnah selamanya.</p>
                        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                            <button onClick={() => setProjectToDelete(null)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors">Batal</button>
                            <button onClick={handleConfirmDeleteProject} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-extrabold transition-colors shadow-lg shadow-red-600/30">Ya, Hapus Permanen</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCREEN 1: LANDING PAGE */}
            {viewState === 'LANDING' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative overflow-hidden">
                        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                        <div className="flex items-center space-x-4 relative z-10">
                            <div className="p-3.5 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30"><Archive className="w-8 h-8" /></div>
                            <div>
                                <h1 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-slate-900 to-slate-700">AnyMind Global Control Center</h1>
                                <p className="text-sm text-slate-500 mt-0.5 font-medium">Enterprise Real-Time Firestore Database</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 w-full md:w-auto relative z-10">
                            {effectiveRole === 'owner' && (
                                <button onClick={() => setViewState('WIZARD_SETUP')} className="flex-1 md:flex-none px-6 py-3 bg-linear-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center space-x-2 shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-0.5">
                                    <Plus className="w-5 h-5" /><span>New Project</span>
                                </button>
                            )}
                            <button onClick={onBackToApp} className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-extrabold flex items-center justify-center shadow-lg transition-all hover:-translate-y-0.5">
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {effectiveRole === 'owner' && (
                        <div className="flex space-x-3 p-1.5 bg-white border border-slate-200 rounded-2xl w-fit shadow-xs">
                            <button onClick={() => setLandingTab('projects')} className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center space-x-2 ${landingTab === 'projects' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                                <Building2 className="w-4 h-4" /><span>Lokasi & Project</span>
                            </button>
                            <button onClick={() => setLandingTab('accounts')} className={`px-5 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center space-x-2 ${landingTab === 'accounts' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                                <Contact className="w-4 h-4" /><span>KTP Cloud</span>
                            </button>
                        </div>
                    )}

                    {landingTab === 'projects' && (
                        <div className="space-y-6">
                            {/* MASTER KELOLA LOKASI GUDANG (WMS & CONSIGNMENT STORE) - HANYA OWNER */}
                            {effectiveRole === 'owner' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* CARD 1: GUDANG UTAMA (ONLINE / WMS) */}
                                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-4">
                                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                                                <Building2 className="w-5 h-5 text-indigo-600" />
                                                <span>Master Gudang WMS (Online)</span>
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={handleDownloadWarehouseTemplate} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />Template</button>
                                                <label className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100"><Upload className="w-3.5 h-3.5 inline mr-1" />Bulky<input type="file" accept=".csv" className="hidden" onChange={handleBulkyWarehouseUpload} /></label>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Nama Gudang Baru (misal: WH-03 Surabaya)" value={newWhName} onChange={(e) => setNewWhName(e.target.value)} className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                                            <button onClick={handleAddWarehouseCloud} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">+ Tambah</button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                            {warehouseList.map((wh) => (
                                                <div key={wh.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                                                    <div className="flex items-center space-x-2"><Store className="w-4 h-4 text-indigo-600" /><span className="font-mono text-xs font-black text-indigo-600">{wh.id}</span><span className="font-bold text-xs text-slate-800">{wh.name}</span></div>
                                                    <button onClick={() => handleDeleteWarehouseCloud(wh.id, wh.name)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CARD 2: TOKO CONSIGNMENT (OFFLINE STORE) */}
                                    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-4">
                                        <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                                                <Store className="w-5 h-5 text-purple-600" />
                                                <span>Master Toko Consignment (Offline)</span>
                                            </h3>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={handleDownloadStoreTemplate} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />Template</button>
                                                <label className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-purple-100"><Upload className="w-3.5 h-3.5 inline mr-1" />Bulky<input type="file" accept=".csv" className="hidden" onChange={handleBulkyStoreUpload} /></label>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Nama Toko Baru (misal: Store Senayan City)" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                                            <button onClick={handleAddStoreCloud} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold">+ Tambah</button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                                            {consignmentStoreList.map((st) => (
                                                <div key={st.id} className="p-3 bg-purple-50/40 border border-purple-200/60 rounded-xl flex justify-between items-center">
                                                    <div className="flex items-center space-x-2"><Store className="w-4 h-4 text-purple-600" /><span className="font-mono text-xs font-black text-purple-600">{st.id}</span><span className="font-bold text-xs text-slate-800">{st.name}</span></div>
                                                    <button onClick={() => handleDeleteStoreCloud(st.id, st.name)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TABEL LIVE FIRESTORE PROJECTS */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-5">
                                <h3 className="text-base font-black text-slate-800 flex items-center space-x-2"><Database className="w-5 h-5 text-indigo-600" /><span>Live Firestore Projects</span></h3>
                                <div className="overflow-x-auto border border-slate-200 rounded-2xl scrollbar-thin">
                                    <table className="w-full text-left text-sm min-w-full">
                                        <thead className="bg-slate-50/80 font-bold text-slate-500 border-b border-slate-200">
                                            <tr><th className="p-4">KODE PROJECT</th><th className="p-4">LOKASI WMS / STORE</th><th className="p-4">TANGGAL</th><th className="p-4 text-center">STATUS</th><th className="p-4 text-right">AKSI</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {projectHistory.map((proj) => (
                                                <tr key={proj.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="p-4 font-bold font-mono text-indigo-600">{proj.sessionCode}</td>
                                                    <td className="p-4 font-bold text-slate-800">{proj.locationName}</td>
                                                    <td className="p-4 font-mono text-slate-500">{proj.opnameDate}</td>
                                                    <td className="p-4 text-center"><span className="px-3 py-1 rounded-lg bg-emerald-100/80 text-emerald-700 font-black text-[11px] uppercase tracking-wider">{proj.status}</span></td>
                                                    <td className="p-4 text-right space-x-2">
                                                        <button onClick={() => handleOpenHistoricalProject(proj)} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-md transition-transform active:scale-95"><PlayCircle className="w-4 h-4" /><span>Buka Dashboard</span></button>
                                                        {effectiveRole === 'owner' && (<button onClick={() => setProjectToDelete(proj)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>)}
                                                    </td>
                                                </tr>
                                            ))}
                                            {projectHistory.length === 0 && (<tr><td colSpan={5} className="p-8 text-center text-slate-400 font-medium">Belum ada project di Cloud Firestore.</td></tr>)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {landingTab === 'accounts' && effectiveRole === 'owner' && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-6">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div><h3 className="text-base font-black text-slate-900">Master KTP & Otorisasi</h3><p className="text-sm text-slate-500 mt-1">Setup kredensial user untuk login counter/SPV lapangan.</p></div>
                                <button onClick={handleDownloadKTPTemplate} className="px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-slate-100 transition-colors"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /><span>Template KTP</span></button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                <div className="lg:col-span-2 p-5 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-4">
                                    <h4 className="text-sm font-bold text-slate-800">Daftar KTP Manual</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input type="text" placeholder="Username (misal: rudi.wms)" value={newAccUser} onChange={(e) => setNewAccUser(e.target.value)} className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                        <input type="text" placeholder="Nama Lengkap" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                        <input type="password" maxLength={4} placeholder="PIN 4-Digit" value={newAccPin} onChange={(e) => setNewAccPin(e.target.value)} className="px-4 py-2.5 text-sm font-mono bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                        <input type="email" placeholder="Email Karyawan" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20" />
                                    </div>
                                    <div className="flex justify-end pt-2"><button onClick={handleAddGlobalAccount} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center space-x-2 shadow-md"><UserPlus className="w-4 h-4" /><span>Buat Akun KTP</span></button></div>
                                </div>
                                <div className="p-5 bg-linear-to-b from-indigo-50 to-white border border-indigo-100 rounded-2xl text-center flex flex-col justify-center items-center space-y-3">
                                    <div className="p-3 bg-indigo-100/50 rounded-full"><Upload className="w-6 h-6 text-indigo-600" /></div>
                                    <div className="text-sm font-bold text-indigo-900">Bulky Import (.csv)</div>
                                    <p className="text-xs text-slate-500 px-2 leading-relaxed">Buat ratusan akun sekaligus.</p>
                                    <label className="px-5 py-2.5 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold cursor-pointer inline-flex items-center space-x-2 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5"><Upload className="w-4 h-4" /><span>Upload CSV KTP</span><input type="file" accept=".csv" className="hidden" onChange={handleBulkyKTPUpload} /></label>
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-2xl scrollbar-thin">
                                <table className="w-full text-left text-sm"><thead className="bg-slate-50 font-bold text-slate-500 border-b"><tr><th className="p-4">USERNAME</th><th className="p-4">NAMA PEGAWAI</th><th className="p-4">EMAIL</th><th className="p-4 text-center">PIN</th><th className="p-4 text-right">AKSI</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {globalAccounts.map((acc) => (
                                            <tr key={acc.id} className="hover:bg-slate-50/80 group">
                                                <td className="p-4 font-bold font-mono text-indigo-600">{acc.username}</td><td className="p-4 font-bold text-slate-800">{acc.name}</td><td className="p-4 text-slate-500 text-xs">{acc.email || '-'}</td>
                                                <td className="p-4 text-center font-mono font-bold text-slate-600 flex justify-center items-center space-x-2">
                                                    <span>{visiblePins[acc.id] ? acc.pin : '••••'}</span>
                                                    <button onClick={() => togglePinVisibility(acc.id)} className="text-slate-400 hover:text-indigo-600">
                                                        {visiblePins[acc.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </td>
                                                <td className="p-4 text-right space-x-2"><button onClick={() => handleDeleteGlobalAccount(acc.username)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SCREEN 2: WIZARD SETUP */}
            {viewState === 'WIZARD_SETUP' && (
                <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center space-x-4"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><SlidersHorizontal className="w-6 h-6" /></div><div><h1 className="text-xl font-black text-slate-900">Project Setup</h1><p className="text-sm text-slate-500">Inisialisasi sesi opname di WMS</p></div></div>
                        <button onClick={() => setViewState('LANDING')} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
                    </div>
                    <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/40 border border-slate-100 space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-extrabold text-slate-800">1. Tipe Lokasi Opname:</label>

                            {/* SEARCHABLE DROPDOWN UNTUK WIZARD LOKASI */}
                            <SearchableSelect
                                options={combinedLocationOptions}
                                value={wizLocationId}
                                onChange={setWizLocationId}
                                placeholder="-- Cari Nama Gudang atau Store Offline --"
                                className="w-full"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><label className="text-sm font-extrabold text-slate-800">2. Kode Sesi:</label><input type="text" value={wizSessionCode} onChange={(e) => setWizSessionCode(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold font-mono text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" /></div>
                            <div className="space-y-2"><label className="text-sm font-extrabold text-slate-800">3. Tanggal:</label><input type="date" value={wizOpnameDate} onChange={(e) => setWizOpnameDate(e.target.value)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all" /></div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <label className="text-sm font-extrabold text-slate-800">4. Metode Lock:</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div onClick={() => setWizMethod('LIST_TO_FLOOR')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${wizMethod === 'LIST_TO_FLOOR' ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-500/10' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}><div className="text-sm font-black text-center text-slate-900">LIST TO FLOOR</div></div>
                                <div onClick={() => setWizMethod('FLOOR_TO_LIST')} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${wizMethod === 'FLOOR_TO_LIST' ? 'border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-500/10' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}><div className="text-sm font-black text-center text-slate-900">FLOOR TO LIST</div></div>
                            </div>
                        </div>

                        {/* CARD PRE-LOAD MASTER TASK EXCEL DENGAN TOMBOL DOWNLOAD TEMPLATE */}
                        <div className="p-5 bg-linear-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl text-center space-y-3">
                            <div className="flex justify-center"><FileSpreadsheet className="w-8 h-8 text-indigo-600" /></div>
                            <div>
                                <div className="text-sm font-bold text-indigo-900">Pre-load Master Task Excel (.xlsx)</div>
                                <p className="text-xs text-indigo-600/70 mt-1">Upload sekarang untuk mempercepat sesi opname.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
                                <button
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
                                    className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4"><button onClick={handleStartNewProjectSession} className="w-full md:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-sm font-black flex items-center justify-center space-x-2 shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-0.5"><PlayCircle className="w-5 h-5" /><span>Launch Dashboard</span></button></div>
                    </div>
                </div>
            )}

            {/* SCREEN 3: DASHBOARD MAIN (4 TABS) */}
            {viewState === 'DASHBOARD' && activeProject && (
                <div className="space-y-6 animate-in fade-in duration-500">

                    <div className="bg-white p-5 rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setViewState('LANDING')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors"><ArrowLeft className="w-5 h-5 text-slate-700" /></button>
                            <div>
                                <div className="flex items-center space-x-3">
                                    <h1 className="text-xl font-black text-slate-900">{activeProject.sessionCode}</h1>
                                    {effectiveRole === 'owner' ? (<span className="bg-linear-to-r from-indigo-100 to-purple-100 text-indigo-800 text-[10px] font-black px-2.5 py-1 rounded-lg flex items-center space-x-1 border border-indigo-200"><ShieldCheck className="w-3.5 h-3.5" /><span>SUPER ADMIN</span></span>) : (<span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-lg border border-slate-200">SUPERVISOR</span>)}
                                </div>
                                <p className="text-sm text-slate-500 font-medium flex items-center space-x-2 mt-1"><MapPin className="w-3.5 h-3.5" /><span>{activeProject.locationName}</span><span>•</span><span>{activeProject.opnameDate}</span></p>
                            </div>
                        </div>

                        <div className="flex bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 w-full xl:w-auto overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-200">
                            <div className="flex space-x-1.5 w-max">
                                {orderedTabs.map(t => (
                                    <button key={t.id} draggable onDragStart={(e) => handleDragStart(e, t.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, t.id)} onClick={() => setActiveTab(t.id)} className={`px-5 py-2.5 text-sm font-bold rounded-xl flex items-center space-x-2 transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white shadow-md text-indigo-700 border border-slate-200/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                                        <GripHorizontal className="w-3.5 h-3.5 opacity-30 cursor-grab hover:opacity-100 hidden md:block" />
                                        <t.icon className={`w-4 h-4 ${activeTab === t.id ? 'text-indigo-600' : ''}`} /><span>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* TAB 1: PROGRESS & ANALYTICS */}
                    {activeTab === 'progress' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 flex items-center justify-between relative overflow-hidden">
                                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
                                    <div className="space-y-2 relative z-10">
                                        <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center"><PieChart className="w-4 h-4 mr-1.5 text-indigo-500" />Completion</h3>
                                        <div className="text-4xl font-black text-slate-900">{overallPercentage}%</div>
                                        <p className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg w-fit">{totalCounted} / {totalSKUs} SKU Terhitung</p>
                                    </div>
                                    <div className="relative w-28 h-28 flex items-center justify-center z-10">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r={38} className="text-slate-100" strokeWidth="12" stroke="currentColor" fill="transparent" /><circle cx="50" cy="50" r={38} className="text-indigo-600 transition-all duration-1000 ease-out" strokeWidth="12" strokeDasharray={2 * Math.PI * 38} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke="currentColor" fill="transparent" /></svg>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col justify-center space-y-4">
                                    <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center"><Filter className="w-4 h-4 mr-1.5 text-indigo-500" />Tampilan Ronde</h3>
                                    <select value={viewRoundFilter} onChange={(e) => setViewRoundFilter(e.target.value === 'overall' ? 'overall' : parseInt(e.target.value, 10) as 1 | 2 | 3 | 4)} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer">
                                        <option value="overall">📊 Overall Keseluruhan</option><option value={1}>1️⃣ Ronde 1 (Internal)</option><option value={2}>2️⃣ Ronde 2 (Re-Count)</option><option value={3}>3️⃣ Ronde 3 (3rd Party)</option><option value={4}>🔥 Ronde 4 (RECOVERY)</option>
                                    </select>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 flex flex-col justify-center space-y-3">
                                    <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center"><AlertTriangle className="w-4 h-4 mr-1.5 text-red-500" />Live Dispute (Selisih)</h3>
                                    <div className="flex items-end space-x-3">
                                        <div className="text-4xl font-black text-red-600">{liveIssues.length}</div>
                                        <div className="text-sm font-bold text-slate-500 mb-1">SKU bermasalah</div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <h3 className="text-base font-black text-slate-900 flex items-center"><UserCheck className="w-5 h-5 mr-2 text-indigo-600" />Real-Time Monitoring Progress Per Counter PIC</h3>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl flex items-center"><Clock className="w-3.5 h-3.5 mr-1" />Live Sync Firestore</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.keys(counterGroups).map((cName, idx) => {
                                        const cData = counterGroups[cName];
                                        const pct = cData.total > 0 ? Math.round((cData.counted / cData.total) * 100) : 0;
                                        return (
                                            <div key={idx} className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-3 hover:border-indigo-300 transition-all">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-sm font-black text-slate-900">{cName}</div>
                                                        <div className="text-xs text-slate-500 font-medium mt-0.5">{cData.counted} / {cData.total} SKU Terhitung</div>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${pct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>{pct}% Done</span>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                    <div className="bg-linear-to-r from-indigo-500 to-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                                                </div>
                                                {cData.errorCount > 0 && (
                                                    <div className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md w-fit">⚠️ {cData.errorCount} SKU Selisih Ditemukan</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {Object.keys(counterGroups).length === 0 && (
                                        <div className="col-span-full text-center text-sm text-slate-400 py-6">Belum ada penugasan counter PIC.</div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 space-y-5">
                                    <div className="flex justify-between items-center"><h3 className="text-base font-black text-slate-900">Progress per Level Rak</h3><button onClick={() => setShowLevelProgress(!showLevelProgress)} className="p-1.5 bg-slate-50 rounded-lg hover:bg-slate-100"><ChevronUp className={`w-4 h-4 text-slate-500 transition-transform ${showLevelProgress ? 'rotate-180' : ''}`} /></button></div>
                                    <div className={`space-y-4 transition-all ${showLevelProgress ? 'hidden' : 'block'}`}>
                                        {levelProgress.map((lvl, idx) => (
                                            <div key={idx} className="space-y-2"><div className="flex justify-between text-xs font-bold"><span className="text-slate-700">Level {lvl.name}</span><span className="text-indigo-600">{lvl.counted}/{lvl.total} ({lvl.percentage}%)</span></div><div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"><div className="bg-linear-to-r from-indigo-500 to-blue-500 h-2.5 rounded-full" style={{ width: `${lvl.percentage}%` }}></div></div></div>
                                        ))}
                                        {levelProgress.length === 0 && <div className="text-sm text-slate-400 font-medium">Data level kosong.</div>}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 space-y-5">
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                                        <h3 className="text-base font-black text-slate-900 flex items-center"><TrendingDown className="w-5 h-5 mr-2 text-indigo-500" />Akurasi Hitung per Brand</h3>
                                        <div className="flex items-center space-x-2">
                                            <div className="relative"><Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" /><input type="text" placeholder="Cari Brand..." value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" /></div>
                                            <select value={brandStatusFilter} onChange={(e) => setBrandStatusFilter(e.target.value as 'all' | 'selisih' | 'match')} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"><option value="all">All</option><option value="selisih">Selisih</option><option value="match">Match</option></select>
                                        </div>
                                    </div>
                                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                                        {brandAccuracyList.map((bAcc, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <div><span className="text-sm font-black text-slate-900">{bAcc.brand}</span><div className="text-xs text-slate-500 font-medium mt-0.5">{bAcc.totalSKUs} SKU Total • <span className="text-red-500 font-bold">{bAcc.diffSKUs} Selisih</span></div></div>
                                                    <div className="flex flex-col items-end space-y-2"><span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${bAcc.accuracyPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{bAcc.accuracyPct}% Akurat</span><button onClick={() => setExpandedBrandDetail(prev => ({ ...prev, [bAcc.brand]: !prev[bAcc.brand] }))} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100">{expandedBrandDetail[bAcc.brand] ? 'Tutup Detail' : 'Lihat SKU'}</button></div>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${bAcc.accuracyPct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${bAcc.accuracyPct}%` }}></div></div>
                                                {expandedBrandDetail[bAcc.brand] && (
                                                    <div className="mt-3 bg-white border border-slate-200 rounded-xl overflow-x-auto text-[10px]"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-2">SKU</th><th className="p-2 text-center">WMS</th><th className="p-2 text-center">ACT</th><th className="p-2 text-center">DIFF</th></tr></thead><tbody>{bAcc.skuList.map((s, i) => <tr key={i} className="border-t"><td className="p-2 font-mono font-bold text-indigo-600">{s.SKU}</td><td className="p-2 text-center">{s.Qty}</td><td className="p-2 text-center font-bold">{s.countedQty ?? '-'}</td><td className="p-2 text-center"><span className={((s.countedQty ?? s.Qty) - s.Qty) === 0 ? 'text-emerald-500' : 'text-red-500 font-bold'}>{s.isCounted ? ((s.countedQty ?? s.Qty) - s.Qty) : '-'}</span></td></tr>)}</tbody></table></div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: MASTER TASK & RAK */}
                    {activeTab === 'master' && (
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Database Master Task & Lokasi Rak</h3>
                                    <p className="text-sm text-slate-500">Edit, Assign PIC, dan lengkapi deskripsi barang.</p>
                                </div>

                                {effectiveRole === 'owner' ? (
                                    <div className="flex items-center space-x-3 w-full md:w-auto">
                                        <button onClick={handleDownloadTemplateXLSX} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-colors">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /><span>Template (.xlsx)</span>
                                        </button>
                                        <label className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold cursor-pointer inline-flex items-center justify-center space-x-2 shadow-md transition-transform active:scale-95">
                                            <Upload className="w-4 h-4" /><span>Upload Master</span>
                                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) parseXLSXFile(e.target.files[0]); }} />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="px-4 py-2 bg-slate-100 text-slate-500 border border-slate-200 rounded-xl text-xs font-bold flex items-center">
                                        🔒 Mode Supervisor (Read Only)
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-inner max-h-125 scrollbar-thin scrollbar-thumb-indigo-200">
                                <table className="w-full text-left text-[11px] min-w-max border-collapse">
                                    <thead className="bg-slate-50/90 backdrop-blur-xs font-black text-slate-600 sticky top-0 z-20 shadow-xs border-b border-slate-200">
                                        <tr><th className="p-3">OWNER</th><th className="p-3">SKU</th><th className="p-3 max-w-xs">DESKRIPSI</th><th className="p-3">BRAND</th><th className="p-3 bg-indigo-50/50">LOKASI RAK</th><th className="p-3 bg-indigo-50/50">COUNTER PIC</th><th className="p-3">ED SYSTEM</th><th className="p-3 text-center">WMS QTY</th><th className="p-3 text-center">ACTUAL QTY</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium bg-white">
                                        {masterDataList.map((row, idx) => {
                                            const diff = row.isCounted ? ((row.countedQty || 0) - row.Qty) : 0;
                                            return (
                                                <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.isCounted ? (diff === 0 ? 'bg-emerald-50/20' : 'bg-red-50/20') : ''}`}>
                                                    <td className="p-3">{row.Owner}</td><td className="p-3 font-mono font-black text-indigo-600">{row.SKU}</td><td className="p-3 truncate max-w-xs" title={row.Description}>{row.Description}</td><td className="p-3">{row.SKUBrand}</td>
                                                    <td className="p-3 font-mono font-bold bg-indigo-50/10 flex items-center"><MapPin className="w-3 h-3 text-indigo-400 mr-1" />{row.Location} <span className="text-[9px] text-slate-400 ml-1">({row.Zone})</span></td>
                                                    <td className="p-2 bg-indigo-50/10"><SearchableSelect options={allProjectTeams.filter(t => t.projectId === activeProject.id).map(t => ({ value: t.username, label: t.username }))} value={row.counter === 'Unassigned' ? '' : row.counter} onChange={(val: string) => { const nw = [...masterDataList]; nw[idx].counter = val; setMasterDataList(nw); }} placeholder="Assign..." className="w-32" /></td>
                                                    <td className="p-3 font-mono text-slate-500">{row.expiredDateSystem || '-'}</td>
                                                    <td className="p-3 text-center font-bold text-slate-400">{row.Qty}</td><td className="p-3 text-center font-black text-sm">{row.isCounted ? row.countedQty : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                        {masterDataList.length === 0 && (<tr><td colSpan={10} className="p-10 text-center text-slate-400 font-medium flex flex-col items-center"><Database className="w-8 h-8 mb-2 opacity-20" />Belum ada task. Upload file master Excel di atas.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: RECON & RECOVERY */}
                    {activeTab === 'recon' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-200/20 flex items-center justify-between">
                                    <div><div className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-1">Match Valid</div><div className="text-3xl font-black text-emerald-900">{matchRecoveryCount}</div><div className="text-xs font-bold text-emerald-600/70 mt-1">SKU Akurat</div></div>
                                    <div className="p-4 bg-emerald-50 rounded-2xl"><CheckCircle2 className="w-8 h-8 text-emerald-500" /></div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-xl shadow-red-200/20 flex items-center justify-between">
                                    <div><div className="text-xs font-black text-red-600 uppercase tracking-wider mb-1">Variance Dispute</div><div className="text-3xl font-black text-red-900">{varianceRecoveryCount}</div><div className="text-xs font-bold text-red-600/70 mt-1">SKU Selisih</div></div>
                                    <div className="p-4 bg-red-50 rounded-2xl"><XCircle className="w-8 h-8 text-red-500" /></div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-xl shadow-amber-200/20 flex items-center justify-between relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-100 rounded-full blur-2xl opacity-60"></div>
                                    <div className="relative z-10"><div className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">Total Valuasi Selisih</div><div className="text-2xl font-black text-amber-900">Rp {totalFinancialVarianceValue.toLocaleString('id-ID')}</div><div className="text-[10px] font-bold text-amber-700/70 mt-1 bg-amber-50 px-2 py-1 rounded w-fit">Berdasarkan Master Pricing</div></div>
                                    <div className="relative z-10 p-3 bg-amber-50 rounded-2xl"><DollarSign className="w-6 h-6 text-amber-600" /></div>
                                </div>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <h3 className="text-base font-black text-slate-900 flex items-center"><Scale className="w-5 h-5 mr-2 text-indigo-600" />Laporan Selisih & Override Recovery</h3>
                                    <button className="px-4 py-2 bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-xl text-sm font-bold flex items-center transition-colors"><Printer className="w-4 h-4 mr-2" />Cetak Laporan</button>
                                </div>
                                <div className="overflow-x-auto border border-slate-200 rounded-2xl scrollbar-thin">
                                    <table className="w-full text-left text-sm"><thead className="bg-slate-50/80 font-black text-slate-600 border-b"><tr><th className="p-4">SKU BARANG</th><th className="p-4 text-center">WMS QTY</th><th className="p-4 text-center">ACTUAL QTY</th><th className="p-4 text-center">SELISIH</th><th className="p-4 text-right bg-amber-50/50">VALUASI (Rp)</th><th className="p-4 text-right bg-indigo-50/50">OVERRIDE RECOVERY</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {masterDataList.filter(i => i.isCounted && ((i.countedQty || 0) - i.Qty) !== 0).map((item, i) => {
                                                const diff = (item.countedQty || 0) - item.Qty;
                                                const val = diff * (item.unitPrice || 0);
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-4 font-mono font-bold text-indigo-600">{item.SKU}</td>
                                                        <td className="p-4 text-center text-slate-500">{item.Qty}</td>
                                                        <td className="p-4 text-center font-black">{item.countedQty}</td>
                                                        <td className="p-4 text-center text-red-600 font-black">{diff > 0 ? `+${diff}` : diff}</td>
                                                        <td className="p-4 text-right font-mono text-amber-700 font-bold bg-amber-50/20">Rp {val.toLocaleString('id-ID')}</td>
                                                        <td className="p-4 text-right bg-indigo-50/10">
                                                            <div className="flex items-center justify-end space-x-2">
                                                                <input type="number" placeholder="Qty Final" className="w-24 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-indigo-500/20" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRecoveryOverride(item.SKU, parseInt((e.target as HTMLInputElement).value, 10)); }} />
                                                                <button onClick={(e) => handleSaveRecoveryOverride(item.SKU, parseInt(((e.currentTarget.previousElementSibling as HTMLInputElement).value), 10))} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-colors"><Save className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {masterDataList.filter(i => i.isCounted && ((i.countedQty || 0) - i.Qty) !== 0).length === 0 && (<tr><td colSpan={6} className="p-10 text-center text-slate-400 font-medium">Belum ada data variance/selisih.</td></tr>)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: PENGATURAN PROJECT (TIM, PRICING & GSHEET WEBHOOK) */}
                    {activeTab === 'settings' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                            {/* CARD GOOGLE SHEETS WEBHOOK BACKUP INTEGRATION */}
                            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-4">
                                <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                    <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                                        <Link2 className="w-5 h-5 text-purple-600" />
                                        <span>Google Sheets Webhook Sync (Auto-Backup)</span>
                                    </h3>
                                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl">Apps Script Webhook</span>
                                </div>
                                <p className="text-xs text-slate-500">Masukkan Webhook URL Apps Script milikmu di bawah. Setiap kali counter selesai menghitung di lapangan, log datanya otomatis terkirim langsung ke Spreadsheet secara real-time.</p>
                                <div className="flex gap-3">
                                    <input type="text" placeholder="https://script.google.com/macros/s/AKfycb.../exec" value={gsheetWebhookUrl} onChange={(e) => setGsheetWebhookUrl(e.target.value)} className="flex-1 px-4 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20" />
                                    <button onClick={() => triggerNotification('Webhook Google Sheets Berhasil Disimpan!')} className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors">Simpan Webhook</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-5">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                        <h3 className="text-base font-black text-slate-900 flex items-center"><Users className="w-5 h-5 mr-2 text-indigo-600" />Assign Tim Project</h3>
                                        <button onClick={handleDownloadTeamTemplate} className="text-xs text-indigo-600 font-bold hover:underline bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center"><Download className="w-3.5 h-3.5 mr-1" />Template CSV</button>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <SearchableSelect options={assignOptions} value={assignUsername} onChange={setAssignUsername} placeholder="Cari dari Master KTP..." className="flex-1" />
                                        <select value={assignRole} onChange={(e) => setAssignRole(e.target.value as UserRole)} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"><option value="counter">Counter (Hitung)</option><option value="spv">Supervisor</option></select>
                                        <button onClick={handleAssignTeamManual} className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition-colors whitespace-nowrap">Assign Tim</button>
                                    </div>
                                    <div className="overflow-y-auto max-h-56 border border-slate-200 rounded-2xl text-sm scrollbar-thin">
                                        <table className="w-full text-left"><thead className="bg-slate-50 font-bold text-slate-500 border-b"><tr><th className="p-3">USERNAME</th><th className="p-3 text-center">ROLE</th><th className="p-3 text-right">CABUT</th></tr></thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeTeamMembers.map(t => (<tr key={t.id} className="hover:bg-slate-50"><td className="p-3 font-mono font-bold text-indigo-600">{t.username}</td><td className="p-3 text-center"><span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${t.role === 'spv' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{t.role}</span></td><td className="p-3 text-right"><button onClick={() => handleRemoveTeamMember(t.username)} className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td></tr>))}
                                                {activeTeamMembers.length === 0 && (<tr><td colSpan={3} className="p-6 text-center text-slate-400 text-xs font-medium">Tim masih kosong.</td></tr>)}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="pt-2 border-t border-slate-100 text-center">
                                        <label className="text-xs text-indigo-600 font-bold cursor-pointer hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors inline-flex items-center"><Upload className="w-4 h-4 mr-1.5" />Bulky Assign via CSV Upload<input type="file" accept=".csv" className="hidden" onChange={handleBulkyAssignTeam} /></label>
                                    </div>
                                </div>

                                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xl shadow-slate-200/40 space-y-5">
                                    <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center"><DollarSign className="w-5 h-5 mr-2 text-indigo-600" />Upload Master Pricing (.xlsx)</h3>
                                    <div className="p-8 bg-linear-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl text-center flex flex-col items-center justify-center h-48 space-y-4">
                                        <div className="p-3 bg-white rounded-full shadow-sm"><FileSpreadsheet className="w-8 h-8 text-indigo-500" /></div>
                                        <div className="text-xs text-indigo-900 font-medium px-4">Upload file Excel khusus harga (SKU & Unit Price) untuk menghitung Nilai Valuasi tanpa mengganggu data operasional gudang.</div>
                                        <label className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold cursor-pointer inline-flex items-center shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5"><Upload className="w-4 h-4 mr-2" />Browse Pricing Excel<input type="file" accept=".xlsx" className="hidden" /></label>
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