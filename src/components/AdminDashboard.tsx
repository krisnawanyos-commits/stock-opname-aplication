import React, { useState, useEffect } from 'react';
import {
    Users,
    Database,
    Upload,
    ShieldCheck,
    Check,
    FileSpreadsheet,
    GitMerge,
    PieChart,
    History,
    ChevronDown,
    ChevronUp,
    Plus,
    Trash2,
    MapPin,
    ClipboardCheck,
    Save,
    UserPlus,
    Send,
    Filter,
    TrendingDown,
    Printer,
    SlidersHorizontal,
    FileCheck,
    CheckCircle2,
    XCircle,
    Search,
    Building2,
    Store,
    DollarSign,
    Download,
    FileDiff,
    Scale,
    PlayCircle,
    Archive,
    ArrowLeft,
    AlertTriangle,
    Link2,
    LogOut,
    GripHorizontal,
    Contact,
    Eye,
    EyeOff
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
    username: string;
    role: UserRole;
}

interface MasterSKUItem {
    Owner: string;
    SKU: string;
    Description: string;
    Status: string;
    Location: string;
    level: string;
    ailee: string;
    Zone: string;
    LocationType: string;
    counter: string;
    counterUtama?: string;
    timWarehouse?: string;
    Qty: number;
    countedQty?: number;
    thirdPartyQty?: number;
    roundCounted?: number;
    satuanHitung: string;
    SKUBrand: string;
    isCounted?: boolean;
    unitPrice?: number;
}

interface BrandRule {
    brand: string;
    owner: string;
}

interface AuditLog {
    id: string;
    timestamp: string;
    counterId: string;
    location: string;
    sku: string;
    countedQty: number;
    unit: string;
    hasPhoto: boolean;
    actionType: 'NEW_COUNT' | 'RECOUNT' | 'UPDATE';
    round: number;
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
    { id: 'progress', label: 'Progress Counter & Overall', icon: PieChart, roles: ['owner', 'spv'] },
    { id: 'issues', label: 'Live Issue Tracker', icon: AlertTriangle, roles: ['owner', 'spv'] },
    { id: 'performance', label: 'Counter Performance', icon: TrendingDown, roles: ['owner', 'spv'] },
    { id: 'variance', label: 'Laporan Selisih (Variance)', icon: FileDiff, roles: ['owner', 'spv'] },
    { id: 'history', label: 'Audit Trail & History Log', icon: History, roles: ['owner', 'spv'] },
    { id: 'crosscheck', label: '3rd Party Recon Center (Owner)', icon: Scale, roles: ['owner'] },
    { id: 'team', label: 'Manajemen Tim Project', icon: Users, roles: ['owner'] },
    { id: 'monitoring', label: 'Plotting Lokasi Rak', icon: MapPin, roles: ['owner'] },
    { id: 'master', label: 'Master Data SKU', icon: Database, roles: ['owner'] },
    { id: 'rules', label: 'Mapping Brand', icon: GitMerge, roles: ['owner'] },
    { id: 'recovery', label: 'Final Count & Recovery', icon: FileCheck, roles: ['owner'] },
];

const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder,
    className = ""
}: {
    options: { value: string, label: string }[],
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    className?: string
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredOptions = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
    const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

    return (
        <div className={`relative ${className}`}>
            <div
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none font-bold cursor-pointer flex justify-between items-center hover:bg-slate-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? "text-slate-800 truncate" : "text-slate-400 truncate"}>{selectedLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
            </div>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearch(''); }}></div>
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b border-slate-100 z-10">
                            <input
                                type="text"
                                autoFocus
                                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none text-slate-700"
                                placeholder="Ketik untuk mencari..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="py-1">
                            {options.length > 0 && <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 bg-slate-50 cursor-pointer hover:bg-slate-100" onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}>-- Clear Pilihan --</div>}
                            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                                <div
                                    key={opt.value}
                                    className={`px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 ${value === opt.value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 font-medium'}`}
                                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}
                                >
                                    {opt.label}
                                </div>
                            )) : (
                                <div className="px-3 py-3 text-xs text-slate-400 text-center font-medium">Tidak ditemukan</div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default function AdminDashboard({
    onBackToApp,
    currentUserRole = 'owner',
    currentUserEmail = 'yos.krisnawan@anymindgroup.com'
}: AdminDashboardProps) {

    const OWNER_WHITELIST = ['yos.krisnawan@anymindgroup.com', 'krisnawanyos@gmail.com'];
    const isWhitelistedOwner = currentUserRole === 'owner' && OWNER_WHITELIST.includes(currentUserEmail.toLowerCase().trim());
    const effectiveRole: UserRole = isWhitelistedOwner ? 'owner' : (currentUserRole === 'owner' ? 'spv' : currentUserRole);

    const [viewState, setViewState] = useState<'LANDING' | 'WIZARD_SETUP' | 'DASHBOARD'>('LANDING');
    const [landingTab, setLandingTab] = useState<'projects' | 'accounts'>('projects');
    const [gsheetWebhookUrl, setGsheetWebhookUrl] = useState<string>('');
    const [projectToDelete, setProjectToDelete] = useState<ProjectSession | null>(null);

    const [activeTab, setActiveTab] = useState<string>('progress');
    const [orderedTabs, setOrderedTabs] = useState<TabDefinition[]>([]);
    const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

    useEffect(() => {
        setOrderedTabs(ALL_AVAILABLE_TABS.filter(tab => tab.roles.includes(effectiveRole)));
    }, [effectiveRole]);

    const handleDragStart = (e: React.DragEvent, tabId: string) => {
        setDraggedTabId(tabId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetTabId: string) => {
        e.preventDefault();
        if (!draggedTabId || draggedTabId === targetTabId) return;

        const newTabs = [...orderedTabs];
        const draggedIndex = newTabs.findIndex(t => t.id === draggedTabId);
        const targetIndex = newTabs.findIndex(t => t.id === targetTabId);

        const [removedTab] = newTabs.splice(draggedIndex, 1);
        newTabs.splice(targetIndex, 0, removedTab);

        setOrderedTabs(newTabs);
        setDraggedTabId(null);
    };

    const [warehouseList, setWarehouseList] = useState<LocationOption[]>([
        { id: 'WH-01', name: 'Gudang Utama Waringin (WMS)', type: 'NON_CONSIGNMENT' },
        { id: 'WH-02', name: 'Gudang Transit Jakarta (WMS)', type: 'NON_CONSIGNMENT' }
    ]);
    const [consignmentStoreList, setConsignmentStoreList] = useState<string[]>(['Store Central Park']);
    const [newStoreName, setNewStoreName] = useState<string>('');
    const [newWhName, setNewWhName] = useState<string>('');

    const [projectHistory, setProjectHistory] = useState<ProjectSession[]>([
        { id: 'PROJ-101', sessionCode: 'SO-WRG-2026-08', locationId: 'WH-01', locationName: 'Gudang Utama Waringin (WMS)', opnameDate: '2026-08-15', method: 'LIST_TO_FLOOR', status: 'ARCHIVED', createdAt: '2026-08-15 08:00' },
    ]);
    const [activeProject, setActiveProject] = useState<ProjectSession | null>(null);

    const [wizLocationId, setWizLocationId] = useState<string>('WH-01');
    const [wizOpnameDate, setWizOpnameDate] = useState<string>('2026-09-22');
    const [wizSessionCode, setWizSessionCode] = useState<string>('SO-WRG-2026-09');
    const [wizMethod, setWizMethod] = useState<'LIST_TO_FLOOR' | 'FLOOR_TO_LIST'>('LIST_TO_FLOOR');

    const [showToast, setShowToast] = useState<string | null>(null);
    const [showLevelProgress, setShowLevelProgress] = useState<boolean>(false);
    const [viewRoundFilter, setViewRoundFilter] = useState<'overall' | 1 | 2 | 3 | 4>('overall');
    const [globalRound] = useState<number>(1);
    const [brandSearch, setBrandSearch] = useState<string>('');
    const [brandStatusFilter, setBrandStatusFilter] = useState<'all' | 'selisih' | 'match'>('all');
    const [crosscheckCounterFilter, setCrosscheckCounterFilter] = useState<string>('all');
    const [crosscheckDisputeOnly, setCrosscheckDisputeOnly] = useState<boolean>(false);

    const [expandedBrandDetail, setExpandedBrandDetail] = useState<{ [brand: string]: boolean }>({});
    const [recoveryAdjustments, setRecoveryAdjustments] = useState<{ [sku: string]: number }>({});
    const [thirdPartyPasteText, setThirdPartyPasteText] = useState<string>('');
    const [showThirdPartyPaste, setShowThirdPartyPaste] = useState<boolean>(false);

    const [b2bPrefix, setB2bPrefix] = useState<string>('B2B-');
    const [savedPrefix, setSavedPrefix] = useState<string>('B2B-');

    const [globalAccounts, setGlobalAccounts] = useState<GlobalAccount[]>([
        { id: '1', username: 'riski.so', name: 'Riski Pratama', pin: '1234', email: 'riski@anymindgroup.com' },
        { id: '2', username: 'putri.so', name: 'Putri', pin: '1234', email: 'putri@anymindgroup.com' },
        { id: '3', username: 'budi.so', name: 'Budi Santoso', pin: '1234', email: 'budi@anymindgroup.com' }
    ]);
    const [newAccUser, setNewAccUser] = useState('');
    const [newAccName, setNewAccName] = useState('');
    const [newAccPin, setNewAccPin] = useState('');
    const [newAccEmail, setNewAccEmail] = useState('');

    const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

    const [projectTeams, setProjectTeams] = useState<Record<string, ProjectTeamMember[]>>({
        'PROJ-101': [
            { username: 'riski.so', role: 'spv' },
            { username: 'putri.so', role: 'counter' }
        ]
    });

    const [assignUsername, setAssignUsername] = useState('');
    const [assignRole, setAssignRole] = useState<UserRole>('counter');

    const [brandRules, setBrandRules] = useState<BrandRule[]>([
        { brand: 'ENFAGROW', owner: 'DDI' },
        { brand: 'FEMMY', owner: 'DDI' }
    ]);
    const [newBrand, setNewBrand] = useState('');
    const [newOwner, setNewOwner] = useState('');
    const [pasteText, setPasteText] = useState('');
    const [showPasteBox, setShowPasteBox] = useState(false);
    const [masterDataList, setMasterDataList] = useState<MasterSKUItem[]>([]);
    const [auditLogs] = useState<AuditLog[]>([]);

    const triggerNotification = (message: string) => {
        setShowToast(message);
        setTimeout(() => setShowToast(null), 3000);
    };

    const sendBackupToGoogleSheets = async (item: MasterSKUItem, logQty: number, counterName: string) => {
        if (!gsheetWebhookUrl.trim()) return;
        const payload = {
            sessionCode: activeProject?.sessionCode || 'UNKNOWN_PROJECT',
            timestamp: new Date().toLocaleString("id-ID"),
            round: item.roundCounted || globalRound,
            counter: counterName,
            owner: item.Owner,
            sku: item.SKU,
            description: item.Description,
            status: item.Status,
            location: item.Location,
            level: item.level,
            ailee: item.ailee,
            zone: item.Zone,
            locationType: item.LocationType,
            countedQty: logQty,
            satuanHitung: item.satuanHitung,
            skuBrand: item.SKUBrand
        };
        try {
            await fetch(gsheetWebhookUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        } catch (e) {
            console.error("GSheet backup error:", e);
        }
    };

    const resolveOwner = (sku: string, brand: string): string => {
        if (savedPrefix && sku.toUpperCase().startsWith(savedPrefix.toUpperCase())) return 'DDI-B2B';
        const match = brandRules.find(r => r.brand.toUpperCase() === brand.trim().toUpperCase());
        return match ? match.owner : 'DDI';
    };

    const handleAddConsignmentStore = () => {
        if (newStoreName.trim() && !consignmentStoreList.includes(newStoreName.trim())) {
            setConsignmentStoreList(prev => [...prev, newStoreName.trim()]);
            setNewStoreName('');
            triggerNotification('Store Consignment Baru Ditambahkan!');
        }
    };
    const handleDeleteConsignmentStore = (storeName: string) => {
        setConsignmentStoreList(prev => prev.filter(s => s !== storeName));
        triggerNotification(`Store "${storeName}" Dihapus.`);
    };
    const handleBulkyStoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
                if (lines.length > 0) {
                    const startIndex = lines[0].toLowerCase().includes('nama store') ? 1 : 0;
                    const newStores = lines.slice(startIndex).filter(store => !consignmentStoreList.includes(store));
                    if (newStores.length > 0) {
                        setConsignmentStoreList(prev => [...prev, ...newStores]);
                        triggerNotification(`Berhasil upload ${newStores.length} Store Consignment baru!`);
                    }
                }
            };
            reader.readAsText(file);
        }
    };
    const handleDownloadStoreTemplate = () => {
        const blob = new Blob(["Nama Store\nStore Central Park"], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Store.csv');
        link.click();
    };

    const handleAddWarehouse = () => {
        if (newWhName.trim()) {
            const newWh: LocationOption = { id: `WH-${(warehouseList.length + 1).toString().padStart(2, '0')}`, name: newWhName.trim(), type: 'NON_CONSIGNMENT' };
            setWarehouseList(prev => [...prev, newWh]);
            setNewWhName('');
            triggerNotification('Gudang Utama Baru Ditambahkan!');
        }
    };
    const handleDeleteWarehouse = (whId: string, whName: string) => {
        setWarehouseList(prev => prev.filter(w => w.id !== whId));
        triggerNotification(`Gudang "${whName}" Dihapus.`);
    };
    const handleBulkyWarehouseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
                if (lines.length > 0) {
                    const startIndex = lines[0].toLowerCase().includes('nama gudang') ? 1 : 0;
                    const newWarehouses: LocationOption[] = [];
                    let currentWhCount = warehouseList.length;
                    for (let i = startIndex; i < lines.length; i++) {
                        const whName = lines[i];
                        if (!warehouseList.some(w => w.name.toLowerCase() === whName.toLowerCase())) {
                            currentWhCount++;
                            newWarehouses.push({ id: `WH-${currentWhCount.toString().padStart(2, '0')}`, name: whName, type: 'NON_CONSIGNMENT' });
                        }
                    }
                    if (newWarehouses.length > 0) {
                        setWarehouseList(prev => [...prev, ...newWarehouses]);
                        triggerNotification(`Berhasil upload ${newWarehouses.length} Gudang Utama baru!`);
                    }
                }
            };
            reader.readAsText(file);
        }
    };
    const handleDownloadWarehouseTemplate = () => {
        const blob = new Blob(["Nama Gudang\nGudang Utama Waringin"], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Gudang.csv');
        link.click();
    };

    const handleConfirmDeleteProject = () => {
        if (projectToDelete) {
            setProjectHistory(prev => prev.filter(p => p.id !== projectToDelete.id));
            triggerNotification(`Project "${projectToDelete.sessionCode}" Berhasil Dihapus Permanen!`);
            setProjectToDelete(null);
        }
    };

    const handleStartNewProjectSession = () => {
        const isConsignment = wizLocationId === 'CONSIGNMENT_GENERIC';
        const locName = isConsignment ? 'Consignment Global Project' : (warehouseList.find(l => l.id === wizLocationId)?.name || 'Gudang Utama');
        const projId = `PROJ-${Date.now().toString().slice(-4)}`;

        const newSession: ProjectSession = {
            id: projId,
            sessionCode: wizSessionCode.trim() || `SO-${isConsignment ? 'CONSIGN' : wizLocationId}-${wizOpnameDate}`,
            locationId: wizLocationId,
            locationName: locName,
            opnameDate: wizOpnameDate,
            method: wizMethod,
            status: 'LIVE_ACTIVE',
            createdAt: new Date().toLocaleString()
        };

        setMasterDataList([]);
        setRecoveryAdjustments({});
        setProjectTeams(prev => ({ ...prev, [projId]: [] }));
        setProjectHistory(prev => [newSession, ...prev]);
        setActiveProject(newSession);
        setViewState('DASHBOARD');
        setActiveTab('progress');
        triggerNotification(`Project Sesi Baru "${newSession.sessionCode}" Berhasil Diluncurkan!`);
    };

    const handleOpenHistoricalProject = (proj: ProjectSession) => {
        setActiveProject(proj);
        setViewState('DASHBOARD');
        setActiveTab('progress');
        triggerNotification(`Membuka Histori Project "${proj.sessionCode}" (${proj.status})`);
    };

    const handleAddGlobalAccount = () => {
        if (newAccUser.trim() && newAccPin.trim() && newAccName.trim()) {
            const newUser: GlobalAccount = {
                id: Date.now().toString(),
                username: newAccUser.trim().toLowerCase(),
                name: newAccName.trim(),
                pin: newAccPin.trim(),
                email: newAccEmail.trim() || `${newAccUser.trim().toLowerCase()}@anymindgroup.com`
            };
            setGlobalAccounts(prev => [...prev, newUser]);
            setNewAccUser(''); setNewAccName(''); setNewAccPin(''); setNewAccEmail('');
            triggerNotification(`KTP Global ${newUser.username} berhasil dibuat!`);
        }
    };

    const handleBulkyKTPUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split('\n');
                if (lines.length > 1) {
                    const parsedUsers: GlobalAccount[] = [];
                    for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(',');
                        if (cols.length >= 2) {
                            const uName = cols[0]?.trim().toLowerCase();
                            if (uName && !globalAccounts.find(a => a.username === uName)) {
                                parsedUsers.push({
                                    id: (Date.now() + i).toString(),
                                    username: uName,
                                    name: cols[1]?.trim() || uName,
                                    pin: cols[2]?.trim() || '1234',
                                    email: cols[3]?.trim() || `${uName}@anymindgroup.com`
                                });
                            }
                        }
                    }
                    if (parsedUsers.length > 0) {
                        setGlobalAccounts(prev => [...prev, ...parsedUsers]);
                        triggerNotification(`Bulky Import Sukses! ${parsedUsers.length} KTP Global ditambahkan.`);
                    }
                }
            };
            reader.readAsText(file);
        }
    };

    const handleDownloadKTPTemplate = () => {
        const csvContent = "Username,Nama Lengkap,PIN,Email\nrudi.so,Rudi Tabuti,1234,rudi@anymindgroup.com";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Import_KTP_Global.csv');
        link.click();
        triggerNotification('Template KTP Global (.csv) diunduh!');
    };

    const handleBlastEmailKTP = () => {
        triggerNotification(`BLAST EMAIL SUKSES! Kredensial dikirim ke ${globalAccounts.length} pegawai.`);
    };

    const handleSendSingleKTP = (acc: GlobalAccount) => {
        triggerNotification(`Kredensial dikirim ke email ${acc.email}!`);
    };

    const togglePinVisibility = (id: string) => {
        setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const activeTeamMembers = activeProject ? (projectTeams[activeProject.id] || []) : [];

    const assignOptions = globalAccounts
        .filter(acc => !activeTeamMembers.find(t => t.username === acc.username))
        .map(acc => ({ value: acc.username, label: `${acc.username} - ${acc.name}` }));

    const reassignOptions = activeTeamMembers.map(tm => ({ value: tm.username, label: tm.username }));

    const handleAssignTeamManual = () => {
        if (!activeProject || !assignUsername) return;
        const exists = activeTeamMembers.find(t => t.username === assignUsername);
        if (exists) {
            triggerNotification(`Gagal: ${assignUsername} sudah ada di project ini!`);
            return;
        }

        const newMember: ProjectTeamMember = { username: assignUsername, role: assignRole };
        setProjectTeams(prev => ({
            ...prev,
            [activeProject.id]: [...(prev[activeProject.id] || []), newMember]
        }));
        setAssignUsername('');
        triggerNotification(`Berhasil assign ${assignUsername} sebagai ${assignRole.toUpperCase()}!`);
    };

    const handleRemoveTeamMember = (username: string) => {
        if (!activeProject) return;
        setProjectTeams(prev => ({
            ...prev,
            [activeProject.id]: prev[activeProject.id].filter(t => t.username !== username)
        }));
        triggerNotification(`Akses ${username} dicabut dari project ini.`);
    };

    const handleBulkyAssignTeam = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeProject) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split('\n');

                let newGlobalAccounts: GlobalAccount[] = [];
                let newTeamMembers: ProjectTeamMember[] = [];

                if (lines.length > 1) {
                    for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(',');
                        if (cols.length >= 2) {
                            const uName = cols[0]?.trim().toLowerCase();
                            const rawRole = cols[1]?.trim().toLowerCase();
                            const uRole: UserRole = (rawRole === 'spv' || rawRole === 'owner') ? (rawRole as UserRole) : 'counter';

                            if (uName) {
                                if (!globalAccounts.find(a => a.username === uName) && !newGlobalAccounts.find(a => a.username === uName)) {
                                    newGlobalAccounts.push({
                                        id: `AUTO-${Date.now()}-${i}`,
                                        username: uName,
                                        name: uName,
                                        pin: '1234',
                                        email: `${uName}@anymindgroup.com`
                                    });
                                }
                                if (!newTeamMembers.find(t => t.username === uName) && !activeTeamMembers.find(t => t.username === uName)) {
                                    newTeamMembers.push({ username: uName, role: uRole });
                                }
                            }
                        }
                    }
                    if (newGlobalAccounts.length > 0) setGlobalAccounts(prev => [...prev, ...newGlobalAccounts]);
                    if (newTeamMembers.length > 0) {
                        setProjectTeams(prev => ({
                            ...prev,
                            [activeProject.id]: [...(prev[activeProject.id] || []), ...newTeamMembers]
                        }));
                        triggerNotification(`Bulky Assign Sukses! ${newTeamMembers.length} staff dimasukkan ke project.`);
                    } else {
                        triggerNotification(`Semua user di file sudah ter-assign.`);
                    }
                }
            };
            reader.readAsText(file);
        }
    };

    const handleDownloadTeamTemplate = () => {
        const csvContent = "Username,Role\nriski.so,spv\nputri.so,counter";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'Template_Assign_Tim_Project.csv');
        link.click();
    };

    const handleSaveRecoveryOverride = (sku: string, newQty: number) => {
        setRecoveryAdjustments(prev => ({ ...prev, [sku]: newQty }));
        setMasterDataList(prev => prev.map(m => {
            if (m.SKU === sku) {
                const updated = { ...m, countedQty: newQty, roundCounted: 4 };
                sendBackupToGoogleSheets(updated, newQty, 'Project Owner (Recovery)');
                return updated;
            }
            return m;
        }));
        triggerNotification(`Stok SKU ${sku} disesuaikan!`);
    };

    const handleProcessThirdPartyPaste = () => {
        if (!thirdPartyPasteText.trim()) return;
        const lines = thirdPartyPasteText.split('\n');
        setMasterDataList(prev => prev.map(mItem => {
            let updatedQty = mItem.thirdPartyQty;
            lines.forEach(line => {
                const cols = line.split(/[\t,;]+/);
                if (cols.length >= 2 && mItem.SKU.toUpperCase() === cols[0].trim().toUpperCase()) {
                    updatedQty = parseInt(cols[1].trim(), 10);
                }
            });
            return { ...mItem, thirdPartyQty: updatedQty };
        }));
        setThirdPartyPasteText(''); setShowThirdPartyPaste(false);
        triggerNotification(`Data 3rd Party dipetakan!`);
    };

    const handleBackupHardfileDatabase = () => {
        const blob = new Blob([JSON.stringify({ activeProject, projectTeams, masterDataList, globalAccounts, auditLogs }, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `BACKUP_${activeProject?.sessionCode || 'SO'}.json`);
        link.click();
    };

    const handleExportPaperCountsheet = () => { triggerNotification('Lembar Countsheet Cetak diunduh! (Simulasi)'); };
    const handleSavePrefix = () => { setSavedPrefix(b2bPrefix); triggerNotification(`Prefix SKU diperbarui!`); };
    const handleReassignTask = (location: string, newCounterName: string) => {
        if (!newCounterName) return;
        setMasterDataList(prev => prev.map(item => {
            if (item.Location === location) return { ...item, counter: newCounterName };
            return item;
        }));
        triggerNotification(`Lokasi "${location}" di-reassign ke ${newCounterName}!`);
    };

    const handleExportFinalRecoveryExcel = () => { triggerNotification('Final Recovery (.xls) diunduh! (Simulasi)'); };
    const handleExportExcel = () => { triggerNotification('Rekap Selisih (.xls) diunduh! (Simulasi)'); };
    const handleExportAuditExcel = () => { triggerNotification('Audit Trail (.xls) diunduh! (Simulasi)'); };
    const handleDownloadTemplateXLS = () => { triggerNotification('Template Master diunduh! (Simulasi)'); };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split('\n');
                if (lines.length > 1) {
                    const parsedList: MasterSKUItem[] = [];
                    for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(',');
                        if (cols.length >= 13) {
                            const sku = cols[1]?.trim() || '';
                            const brand = cols[12]?.trim() || cols[13]?.trim() || '';
                            parsedList.push({
                                Owner: resolveOwner(sku, brand),
                                SKU: sku,
                                Description: cols[2]?.trim() || '',
                                Status: cols[3]?.trim() || 'Active',
                                Location: cols[4]?.trim() || '',
                                level: cols[5]?.trim() || '1',
                                ailee: cols[6]?.trim() || '',
                                Zone: cols[7]?.trim() || '',
                                LocationType: cols[8]?.trim() || 'RACK',
                                counter: cols[9]?.trim() || 'Unassigned',
                                Qty: parseInt(cols[11]?.trim() || '0', 10),
                                satuanHitung: cols[12]?.trim() || 'PCS',
                                SKUBrand: brand,
                                isCounted: false,
                                unitPrice: parseInt(cols[14]?.trim() || '0', 10)
                            });
                        }
                    }
                    if (parsedList.length > 0) setMasterDataList(parsedList);
                    triggerNotification(`Import Berhasil! ${parsedList.length} SKU dipetakan.`);
                }
            };
            reader.readAsText(file);
        }
    };

    const handleAddBrandRule = () => {
        if (newBrand.trim() && newOwner.trim()) {
            setBrandRules(prev => [...prev, { brand: newBrand.trim().toUpperCase(), owner: newOwner.trim().toUpperCase() }]);
            setNewBrand(''); setNewOwner('');
            triggerNotification('Aturan Baru Ditambahkan!');
        }
    };

    const handleProcessBulkPaste = () => {
        if (!pasteText.trim()) return;
        const lines = pasteText.split('\n');
        const newRules: BrandRule[] = [];
        lines.forEach(line => {
            const parts = line.split(/[\t,;]+/);
            if (parts.length >= 2) newRules.push({ brand: parts[0].trim().toUpperCase(), owner: parts[1].trim().toUpperCase() });
        });
        if (newRules.length > 0) {
            setBrandRules(prev => [...prev, ...newRules]);
            setPasteText(''); setShowPasteBox(false);
            triggerNotification(`${newRules.length} aturan brand ditambah!`);
        }
    };

    const handleDeleteBrandRule = (index: number) => {
        setBrandRules(prev => prev.filter((_, idx) => idx !== index));
    };

    const toggleBrandDetailExpand = (brandName: string) => {
        setExpandedBrandDetail(prev => ({ ...prev, [brandName]: !prev[brandName] }));
    };

    const filteredMasterDataList = masterDataList.filter(item => {
        if (viewRoundFilter === 'overall') return true;
        if (viewRoundFilter === 1) return item.roundCounted === 1 || !item.isCounted;
        if (viewRoundFilter === 2) return item.roundCounted === 2;
        if (viewRoundFilter === 3) return item.roundCounted === 3;
        return item.roundCounted === 4;
    });

    const totalSKUs = filteredMasterDataList.length;
    const totalCounted = filteredMasterDataList.filter(i => i.isCounted).length;
    const overallPercentage = totalSKUs > 0 ? Math.round((totalCounted / totalSKUs) * 100) : 0;

    const levelProgress = Object.keys(filteredMasterDataList.reduce((acc: any, item) => {
        const l = item.level || 'Unassigned';
        if (!acc[l]) acc[l] = { total: 0, counted: 0 };
        acc[l].total++;
        if (item.isCounted) acc[l].counted++;
        return acc;
    }, {})).map(name => {
        const group = filteredMasterDataList.reduce((acc: any, item) => {
            const l = item.level || 'Unassigned';
            if (!acc[l]) acc[l] = { total: 0, counted: 0 };
            acc[l].total++; if (item.isCounted) acc[l].counted++; return acc;
        }, {})[name];
        return { name, total: group.total, counted: group.counted, percentage: Math.round((group.counted / group.total) * 100) };
    });

    const brandAccuracyList = brandRules.map(bRule => {
        const brandSKUs = masterDataList.filter(m => m.SKUBrand.toUpperCase() === bRule.brand.toUpperCase());
        const diffCount = masterDataList.filter(m => m.SKUBrand.toUpperCase() === bRule.brand.toUpperCase() && m.isCounted && (m.countedQty ?? m.Qty) !== m.Qty).length;
        return { brand: bRule.brand, totalSKUs: brandSKUs.length || 1, diffSKUs: diffCount, accuracyPct: Math.max(0, Math.round(((brandSKUs.length || 1) - diffCount) / (brandSKUs.length || 1) * 100)), skuList: brandSKUs };
    }).filter(b => b.brand.toLowerCase().includes(brandSearch.toLowerCase()) && (brandStatusFilter === 'all' || (brandStatusFilter === 'selisih' ? b.diffSKUs > 0 : b.diffSKUs === 0)));

    const filteredCrosscheckList = masterDataList.filter(mItem => {
        if (crosscheckCounterFilter !== 'all' && mItem.counter !== crosscheckCounterFilter) return false;
        if (crosscheckDisputeOnly) return (mItem.countedQty ?? mItem.Qty) !== (mItem.thirdPartyQty ?? (mItem.countedQty ?? mItem.Qty)) || (mItem.countedQty ?? mItem.Qty) !== mItem.Qty;
        return true;
    });

    const counterGroups = filteredMasterDataList.reduce((acc: any, item) => {
        const cName = item.counter || 'Unassigned';
        if (!acc[cName]) acc[cName] = { total: 0, counted: 0, pendingItems: [], isComplete: false, errorCount: 0 };
        acc[cName].total++;
        if (item.isCounted) { acc[cName].counted++; if ((item.countedQty ?? item.Qty) !== item.Qty) acc[cName].errorCount++; }
        else { acc[cName].pendingItems.push(item); }
        return acc;
    }, {});
    Object.keys(counterGroups).forEach(cName => { counterGroups[cName].isComplete = counterGroups[cName].total > 0 && counterGroups[cName].counted === counterGroups[cName].total; });

    const liveIssues = masterDataList.filter(item => !item.isCounted || (item.countedQty ?? item.Qty) !== item.Qty);

    const groupedLocationsToAssign = Array.from(new Set(masterDataList.map(m => m.Location))).map(locName => {
        const itemsInLoc = masterDataList.filter(m => m.Location === locName);
        return { location: locName, zone: itemsInLoc[0]?.Zone || '-', counter: itemsInLoc[0]?.counter || 'Unassigned', skuCount: itemsInLoc.length };
    });

    const circleRadius = 38;
    const circumference = 2 * Math.PI * circleRadius;
    const strokeDashoffset = circumference - (overallPercentage / 100) * circumference;

    const totalRecoverySKUs = masterDataList.length;
    const matchRecoveryCount = masterDataList.filter(m => (recoveryAdjustments[m.SKU] !== undefined ? recoveryAdjustments[m.SKU] : (m.countedQty ?? m.Qty)) === m.Qty).length;
    const varianceRecoveryCount = totalRecoverySKUs - matchRecoveryCount;
    let totalFinancialVarianceValue = 0;
    masterDataList.forEach(m => {
        const diff = (recoveryAdjustments[m.SKU] !== undefined ? recoveryAdjustments[m.SKU] : (m.countedQty ?? m.Qty)) - m.Qty;
        if (diff !== 0) totalFinancialVarianceValue += (diff * (m.unitPrice || 0));
    });

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 p-4 max-w-6xl mx-auto font-sans relative">

            {showToast && (
                <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold">{showToast}</span>
                </div>
            )}

            {projectToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200">
                        <div className="flex items-center space-x-3 text-red-600">
                            <AlertTriangle className="w-8 h-8" />
                            <h3 className="text-base font-black text-slate-900">Konfirmasi Hapus Project</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">Apakah kamu yakin ingin menghapus project <b className="text-slate-900">{projectToDelete.sessionCode}</b>? Data terkait akan dihapus permanen.</p>
                        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                            <button onClick={() => setProjectToDelete(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
                            <button onClick={handleConfirmDeleteProject} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold">Ya, Hapus Permanen</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCREEN 1: LANDING PAGE */}
            {viewState === 'LANDING' && (
                <div className="space-y-5">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-purple-50 text-purple-700 rounded-xl"><Archive className="w-7 h-7" /></div>
                            <div>
                                <h1 className="text-lg font-black text-slate-900">Global Control Center (Kantor Pusat)</h1>
                                <p className="text-xs text-slate-500">Merekam seluruh riwayat project dan mengatur master KTP Pegawai.</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 mt-4 md:mt-0">
                            {effectiveRole === 'owner' && (
                                <button onClick={() => setViewState('WIZARD_SETUP')} className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md">
                                    <Plus className="w-4 h-4" /><span>+ Start New Stock Opname Project</span>
                                </button>
                            )}
                            <button onClick={onBackToApp} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-md">
                                <LogOut className="w-4 h-4" /><span>Log Out</span>
                            </button>
                        </div>
                    </div>

                    {effectiveRole === 'owner' && (
                        <div className="flex space-x-2">
                            <button onClick={() => setLandingTab('projects')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${landingTab === 'projects' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                <div className="flex items-center space-x-1.5"><Building2 className="w-4 h-4" /><span>Manajemen Project & Master Lokasi</span></div>
                            </button>
                            <button onClick={() => setLandingTab('accounts')} className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${landingTab === 'accounts' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                <div className="flex items-center space-x-1.5"><Contact className="w-4 h-4" /><span>Master Akun Global (KTP)</span></div>
                            </button>
                        </div>
                    )}

                    {landingTab === 'projects' && (
                        <>
                            {effectiveRole === 'owner' && (
                                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                    <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2"><Building2 className="w-4 h-4 text-purple-700" /><span>Master List Gudang & Store Consignment</span></h3>
                                    </div>
                                    <div className="p-3.5 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                                        <label className="text-xs font-extrabold text-purple-900 flex items-center space-x-1.5"><Link2 className="w-4 h-4 text-purple-700" /><span>Google Sheets Webhook URL:</span></label>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="https://script.google.com/macros/s/..." value={gsheetWebhookUrl} onChange={(e) => setGsheetWebhookUrl(e.target.value)} className="flex-1 px-3 py-1.5 text-xs font-mono bg-white border border-purple-300 rounded-lg outline-none" />
                                            <button onClick={() => triggerNotification('Webhook Disimpan!')} className="px-4 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold">Simpan</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                        <div className="p-4 bg-purple-50/30 rounded-xl space-y-3 border border-purple-200">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-extrabold text-purple-900 flex items-center space-x-1"><Store className="w-4 h-4" /><span>Daftar Toko Consignment</span></h4>
                                                <div className="flex items-center space-x-1">
                                                    <button onClick={handleDownloadStoreTemplate} className="px-2.5 py-1 bg-white border border-purple-200 text-purple-800 rounded text-[10px] font-bold"><FileSpreadsheet className="w-3 h-3 text-emerald-600 inline mr-1" />Template</button>
                                                    <label className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded text-[10px] font-bold cursor-pointer"><Upload className="w-3 h-3 inline mr-1" />Upload<input type="file" accept=".csv, .xls, .xlsx" className="hidden" onChange={handleBulkyStoreUpload} /></label>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Nama Store Baru" value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)} className="flex-1 px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-lg" />
                                                <button onClick={handleAddConsignmentStore} className="px-3.5 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold">+ Tambah</button>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto bg-white border border-purple-200 rounded-lg">
                                                {consignmentStoreList.map((st, idx) => (
                                                    <div key={idx} className="p-2.5 text-xs flex justify-between items-center border-b border-purple-100 hover:bg-purple-50/30"><span className="font-bold text-slate-800">{st}</span><button onClick={() => handleDeleteConsignmentStore(st)} className="p-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-blue-50/30 rounded-xl space-y-3 border border-blue-200">
                                            <div className="flex justify-between items-center">
                                                <h4 className="text-xs font-extrabold text-blue-900 flex items-center space-x-1"><Building2 className="w-4 h-4" /><span>Daftar Gudang Utama</span></h4>
                                                <div className="flex items-center space-x-1">
                                                    <button onClick={handleDownloadWarehouseTemplate} className="px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded text-[10px] font-bold"><FileSpreadsheet className="w-3 h-3 text-emerald-600 inline mr-1" />Template</button>
                                                    <label className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded text-[10px] font-bold cursor-pointer"><Upload className="w-3 h-3 inline mr-1" />Upload<input type="file" accept=".csv, .xls, .xlsx" className="hidden" onChange={handleBulkyWarehouseUpload} /></label>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <input type="text" placeholder="Nama Gudang Baru" value={newWhName} onChange={(e) => setNewWhName(e.target.value)} className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg" />
                                                <button onClick={handleAddWarehouse} className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">+ Tambah</button>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto bg-white border border-blue-200 rounded-lg">
                                                {warehouseList.map((wh) => (
                                                    <div key={wh.id} className="p-2.5 text-xs flex justify-between items-center border-b border-blue-100 hover:bg-blue-50/30"><div><span className="font-mono text-blue-600 font-bold mr-2">{wh.id}</span><span className="font-bold text-slate-800">{wh.name}</span></div><button onClick={() => handleDeleteWarehouse(wh.id, wh.name)} className="p-1 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold text-slate-800">Daftar Histori Project Opname:</h3>
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-left text-xs border-collapse min-w-full">
                                        <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                                            <tr><th className="p-3">KODE PROJECT</th><th className="p-3">LOKASI</th><th className="p-3">TANGGAL</th><th className="p-3">METODE TERKUNCI</th><th className="p-3 text-center">STATUS</th><th className="p-3 text-right">AKSI</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 font-medium">
                                            {projectHistory.map((proj) => (
                                                <tr key={proj.id} className="hover:bg-slate-50">
                                                    <td className="p-3 font-bold font-mono text-purple-700">{proj.sessionCode}</td>
                                                    <td className="p-3 font-bold text-slate-900">{proj.locationName}</td>
                                                    <td className="p-3 font-mono">{proj.opnameDate}</td>
                                                    <td className="p-3"><span className="px-2 py-0.5 bg-purple-50 text-purple-800 text-[10px] font-extrabold rounded font-mono">{proj.method}</span></td>
                                                    <td className="p-3 text-center"><span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">{proj.status === 'LIVE_ACTIVE' ? 'LIVE ACTIVE' : 'ARCHIVED'}</span></td>
                                                    <td className="p-3 text-right space-x-1">
                                                        <button onClick={() => handleOpenHistoricalProject(proj)} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1"><PlayCircle className="w-3.5 h-3.5" /><span>Buka Dashboard</span></button>
                                                        {effectiveRole === 'owner' && (<button onClick={() => setProjectToDelete(proj)} className="p-1.5 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {landingTab === 'accounts' && effectiveRole === 'owner' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2"><Contact className="w-4 h-4 text-purple-700" /><span>Master Pendaftaran Akun (KTP Global)</span></h3>
                                    <p className="text-xs text-slate-500 mt-1">Daftarkan KTP/Identitas seluruh pegawai di sini sebelum mereka di-assign ke project manapun.</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={handleBlastEmailKTP} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm hover:bg-slate-800">
                                        <Send className="w-4 h-4 text-amber-400" /><span>Blast Email Kredensial ke Semua</span>
                                    </button>
                                    <button onClick={handleDownloadKTPTemplate} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-200 hover:bg-slate-200">
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" /><span>Download Template</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                    <h4 className="text-xs font-bold text-slate-800">Daftar KTP Manual</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <input type="text" placeholder="Username (contoh: agus.lap)" value={newAccUser} onChange={(e) => setNewAccUser(e.target.value)} className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none" />
                                        <input type="text" placeholder="Nama Lengkap Karyawan" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none" />
                                        <input type="password" maxLength={4} placeholder="PIN 4-Digit" value={newAccPin} onChange={(e) => setNewAccPin(e.target.value)} className="px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg outline-none" />
                                        <input type="email" placeholder="Alamat Email Karyawan" value={newAccEmail} onChange={(e) => setNewAccEmail(e.target.value)} className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none" />
                                    </div>
                                    <div className="flex justify-end pt-1">
                                        <button onClick={handleAddGlobalAccount} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5">
                                            <UserPlus className="w-3.5 h-3.5" /><span>Buat KTP</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-xl text-center flex flex-col justify-center items-center space-y-2">
                                    <Upload className="w-8 h-8 text-purple-600 mb-1" />
                                    <div className="text-xs font-bold text-purple-900">Bulky Import KTP (.xls / .csv)</div>
                                    <p className="text-[10px] text-slate-500 px-2 leading-tight">Buat ratusan akun serentak cukup via Upload Excel.</p>
                                    <label className="px-4 py-2 mt-2 bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center space-x-1 hover:bg-purple-800 shadow-sm">
                                        <Upload className="w-3 h-3" /><span>Upload File Excel KTP</span>
                                        <input type="file" accept=".csv, .xls, .xlsx" className="hidden" onChange={handleBulkyKTPUpload} />
                                    </label>
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                                        <tr><th className="p-3 border-b">USERNAME</th><th className="p-3 border-b">NAMA LENGKAP PADA KTP</th><th className="p-3 border-b">EMAIL KONTAK</th><th className="p-3 border-b text-center">PIN AKSES</th><th className="p-3 border-b text-right">AKSI OWNER</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                        {globalAccounts.map((acc) => (
                                            <tr key={acc.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold font-mono text-blue-600">{acc.username}</td>
                                                <td className="p-3 font-bold">{acc.name}</td>
                                                <td className="p-3 text-slate-500 font-mono text-[11px]">{acc.email || '-'}</td>
                                                <td className="p-3 text-center font-mono font-bold text-slate-600">
                                                    <div className="flex items-center justify-center space-x-2">
                                                        <span>{visiblePins[acc.id] ? acc.pin : '••••'}</span>
                                                        <button onClick={() => togglePinVisibility(acc.id)} className="text-slate-400 hover:text-slate-700 transition-colors" title={visiblePins[acc.id] ? "Sembunyikan PIN" : "Lihat PIN"}>
                                                            {visiblePins[acc.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button onClick={() => handleSendSingleKTP(acc)} className="px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold inline-flex items-center space-x-1 hover:bg-slate-800">
                                                        <Send className="w-3 h-3" /><span>Email PIN</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SCREEN 2: WIZARD SETUP PROJECT */}
            {viewState === 'WIZARD_SETUP' && (
                <div className="max-w-2xl mx-auto space-y-5">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center space-x-3"><div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl"><SlidersHorizontal className="w-6 h-6" /></div><div><h1 className="text-base font-black text-slate-900">Setup Project STO Baru</h1></div></div>
                        <button onClick={() => setViewState('LANDING')} className="p-2 bg-slate-100 text-slate-600 rounded-xl"><ArrowLeft className="w-5 h-5" /></button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-extrabold text-slate-700">1. Tipe Lokasi Opname:</label>
                            <select value={wizLocationId} onChange={(e) => setWizLocationId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none">
                                <optgroup label="Gudang Utama WMS">{warehouseList.map(wh => (<option key={wh.id} value={wh.id}>{wh.name}</option>))}</optgroup>
                                <optgroup label="Sesi Consignment"><option value="CONSIGNMENT_GENERIC">[CONSIGNMENT STORE]</option></optgroup>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1"><label className="text-xs font-extrabold text-slate-700">2. Kode Sesi Project:</label><input type="text" value={wizSessionCode} onChange={(e) => setWizSessionCode(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-purple-700 outline-none" /></div>
                            <div className="space-y-1"><label className="text-xs font-extrabold text-slate-700">3. Tanggal Pelaksanaan:</label><input type="date" value={wizOpnameDate} onChange={(e) => setWizOpnameDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none" /></div>
                        </div>
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <label className="text-xs font-extrabold text-slate-700">4. Kunci Metode STO:</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div onClick={() => setWizMethod('LIST_TO_FLOOR')} className={`p-3.5 rounded-xl border-2 cursor-pointer ${wizMethod === 'LIST_TO_FLOOR' ? 'border-purple-600 bg-purple-50/50' : 'border-slate-200 bg-slate-50'}`}><div className="text-xs font-black text-slate-900">LIST TO FLOOR</div></div>
                                <div onClick={() => setWizMethod('FLOOR_TO_LIST')} className={`p-3.5 rounded-xl border-2 cursor-pointer ${wizMethod === 'FLOOR_TO_LIST' ? 'border-purple-600 bg-purple-50/50' : 'border-slate-200 bg-slate-50'}`}><div className="text-xs font-black text-slate-900">FLOOR TO LIST</div></div>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end space-x-2">
                            <button onClick={() => setViewState('LANDING')} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">Batal</button>
                            <button onClick={handleStartNewProjectSession} className="px-5 py-2.5 bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5"><PlayCircle className="w-4 h-4" /><span>Start Active Session</span></button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCREEN 3: DASHBOARD RECONCILIATION */}
            {viewState === 'DASHBOARD' && activeProject && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div className="flex items-center space-x-3">
                                <button onClick={() => setViewState('LANDING')} className="p-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"><ArrowLeft className="w-4 h-4" /></button>
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <h1 className="text-base font-bold text-slate-900">Dashboard: {activeProject.sessionCode}</h1>
                                        {effectiveRole === 'owner' ? (<span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center space-x-1"><ShieldCheck className="w-3 h-3" /><span>SUPER ADMIN</span></span>) : (<span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">SUPERVISOR</span>)}
                                    </div>
                                    <p className="text-xs text-slate-500">Lokasi: <span className="font-bold text-slate-800">{activeProject.locationName}</span> | Tanggal: <span className="font-bold text-slate-800">{activeProject.opnameDate}</span></p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                {effectiveRole === 'owner' && (<button onClick={handleBackupHardfileDatabase} className="px-3 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"><Download className="w-4 h-4 text-purple-200" /><span>Backup (.json)</span></button>)}
                                <button onClick={onBackToApp} className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"><LogOut className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-slate-200 flex justify-between items-center bg-slate-50 p-2.5 rounded-xl text-xs">
                            <div className="flex items-center space-x-3"><Store className="w-4 h-4 text-purple-600" /><span className="font-extrabold text-slate-700">Metode Terkunci:</span><span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-extrabold rounded font-mono">{activeProject.method}</span></div>
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full flex items-center space-x-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /><span>SESSION ACTIVE</span></span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div><div className="text-xs font-bold text-slate-800">EKSPOR REKAP SELISIH OPNAME</div><div className="text-[11px] text-slate-500">Format Native Excel (.xls)</div></div>
                            <button onClick={handleExportExcel} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5"><FileSpreadsheet className="w-4 h-4" /><span>Export Excel</span></button>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                            <div><div className="text-xs font-bold text-slate-800">CETAK LEMBAR COUNTSHEET 3RD PARTY</div><div className="text-[11px] text-slate-500">Cetak lembar kerja cetak kertas</div></div>
                            <button onClick={handleExportPaperCountsheet} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5"><Printer className="w-4 h-4 text-slate-200" /><span>Cetak Countsheet</span></button>
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto border-b-2 border-slate-300 pb-2 bg-white p-2.5 rounded-2xl shadow-sm scrollbar-thin">
                        <div className="flex space-x-2 w-max">
                            {orderedTabs.map((tab) => (
                                <div key={tab.id} draggable onDragStart={(e) => handleDragStart(e, tab.id)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, tab.id)}
                                    className={`flex items-center space-x-1.5 pb-2 px-3.5 text-xs border-b-2 whitespace-nowrap transition-all shrink-0 cursor-pointer ${activeTab === tab.id ? 'border-blue-600 text-blue-700 font-extrabold bg-blue-50/50 rounded-t-lg' : 'border-transparent text-slate-500 font-semibold hover:text-slate-800 hover:bg-slate-50'} ${draggedTabId === tab.id ? 'opacity-30 border-dashed border-slate-400' : ''}`}
                                >
                                    <div className="cursor-grab hover:text-blue-500 p-0.5" title="Geser urutan"><GripHorizontal className="w-3.5 h-3.5 text-slate-300" /></div>
                                    <div onClick={() => setActiveTab(tab.id)} className="flex items-center space-x-1.5"><tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-600' : ''}`} /><span>{tab.label}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* DASHBOARD TAB CONTENTS */}
                    {activeTab === 'progress' && (
                        <div className="space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center space-x-2">
                                            <h3 className="text-sm font-bold text-slate-900">SUMMARY PROGRESS ({activeProject.locationName})</h3>
                                            <div className="flex items-center space-x-1 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200"><Filter className="w-3.5 h-3.5 text-slate-500" />
                                                <select value={viewRoundFilter} onChange={(e) => setViewRoundFilter(e.target.value === 'overall' ? 'overall' : parseInt(e.target.value, 10) as 1 | 2 | 3 | 4)} className="bg-transparent text-xs font-extrabold text-blue-700 outline-none">
                                                    <option value="overall">Overall</option><option value={1}>Ronde 1</option><option value={2}>Ronde 2</option><option value={3}>Ronde 3</option><option value={4}>RECOVERY</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3.5 mt-2"><div className="bg-blue-600 h-3.5 rounded-full transition-all" style={{ width: `${overallPercentage}%` }}></div></div>
                                    </div>
                                    <div className="flex items-center space-x-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 shrink-0">
                                        <div className="relative w-24 h-24 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r={circleRadius} className="text-slate-200" strokeWidth="10" stroke="currentColor" fill="transparent" /><circle cx="50" cy="50" r={circleRadius} className="text-blue-600 transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke="currentColor" fill="transparent" /></svg>
                                            <div className="absolute flex flex-col items-center justify-center text-center"><span className="text-base font-extrabold text-slate-900">{overallPercentage}%</span><span className="text-[9px] font-bold text-slate-400">SELESAI</span></div>
                                        </div>
                                        <div className="text-xs space-y-1 font-semibold">
                                            <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div><span className="text-slate-700">Done: <b>{totalCounted} SKU</b></span></div>
                                            <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 bg-slate-300 rounded-full"></div><span className="text-slate-500">Pending: <b>{totalSKUs - totalCounted} SKU</b></span></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100">
                                    <button onClick={() => setShowLevelProgress(!showLevelProgress)} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"><span>{showLevelProgress ? 'Hide Detail Progress Level' : 'Show Detail Progress Level'}</span>{showLevelProgress ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" strokeWidth={3} />}</button>
                                    {showLevelProgress && (
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            {levelProgress.map((lvl, idx) => (
                                                <div key={idx} className="space-y-1"><div className="flex justify-between text-[11px] font-bold text-slate-700"><span>Level {lvl.name}</span><span className="text-slate-500">{lvl.counted}/{lvl.total} ({lvl.percentage}%)</span></div><div className="w-full bg-slate-200 rounded-full h-2"><div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${lvl.percentage}%` }}></div></div></div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                                    <div className="flex items-center space-x-2"><TrendingDown className="w-4 h-4 text-emerald-600" /><h3 className="text-sm font-bold text-slate-800">Persentase Akurasi Stok per BRAND (% Accuracy)</h3></div>
                                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                                        <div className="relative flex-1 sm:w-48"><Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" /><input type="text" placeholder="Cari Brand..." value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none" /></div>
                                        <select value={brandStatusFilter} onChange={(e) => setBrandStatusFilter(e.target.value as 'all' | 'selisih' | 'match')} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-extrabold text-slate-700 outline-none"><option value="all">Semua Status</option><option value="selisih">Hanya Selisih</option><option value="match">Hanya Match</option></select>
                                    </div>
                                </div>
                                <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                                    {brandAccuracyList.map((bAcc, idx) => {
                                        const isExpanded = !!expandedBrandDetail[bAcc.brand];
                                        return (
                                            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center space-x-2"><span className="text-xs font-extrabold text-slate-900">{bAcc.brand}</span><span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${bAcc.accuracyPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{bAcc.accuracyPct}% Akurat</span></div>
                                                    <div className="flex items-center space-x-3"><span className="text-xs text-slate-500 font-medium">Total: <b>{bAcc.totalSKUs} SKU</b> | Selisih: <b className="text-red-600">{bAcc.diffSKUs} SKU</b></span><button onClick={() => toggleBrandDetailExpand(bAcc.brand)} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"><span>{isExpanded ? 'Hide' : 'Show'}</span></button></div>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-2"><div className={`h-2 rounded-full transition-all duration-500 ${bAcc.accuracyPct === 100 ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${bAcc.accuracyPct}%` }}></div></div>
                                                {isExpanded && (
                                                    <div className="mt-2 p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-[11px] border-collapse min-w-full">
                                                                <thead className="bg-slate-100 font-bold text-slate-600"><tr><th className="p-1.5 border-b">SKU</th><th className="p-1.5 border-b">DESKRIPSI</th><th className="p-1.5 border-b">LOKASI</th><th className="p-1.5 border-b text-center">SYSTEM</th><th className="p-1.5 border-b text-center">COUNTED</th><th className="p-1.5 border-b text-center">STATUS</th></tr></thead>
                                                                <tbody className="divide-y divide-slate-100 font-medium">
                                                                    {bAcc.skuList.map((skuItem, sIdx) => {
                                                                        const cQty = skuItem.countedQty ?? skuItem.Qty;
                                                                        const diff = cQty - skuItem.Qty;
                                                                        return (
                                                                            <tr key={sIdx}>
                                                                                <td className="p-1.5 font-bold font-mono text-blue-600">{skuItem.SKU}</td><td className="p-1.5">{skuItem.Description}</td><td className="p-1.5 font-mono">{skuItem.Location}</td><td className="p-1.5 text-center">{skuItem.Qty}</td><td className="p-1.5 text-center font-bold">{cQty}</td><td className="p-1.5 text-center"><span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${diff === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-100 text-red-800'}`}>{diff === 0 ? 'MATCH' : `SELISIH (${diff})`}</span></td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'variance' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="border-b border-slate-100 pb-3"><h3 className="text-sm font-extrabold text-red-700 flex items-center space-x-2"><FileDiff className="w-4 h-4" /><span>Laporan Detail Selisih (Variance) & Lokasi</span></h3></div>
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs border-collapse min-w-full">
                                    <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200">
                                        <tr><th className="p-3">LOKASI</th><th className="p-3">SKU</th><th className="p-3">DESKRIPSI</th><th className="p-3 text-center">SYSTEM</th><th className="p-3 text-center">COUNTED</th><th className="p-3 text-center">SELISIH</th><th className="p-3">COUNTER PIC</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {masterDataList.filter(item => item.isCounted && (item.countedQty ?? item.Qty) !== item.Qty).map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold font-mono text-slate-900 flex items-center space-x-1"><MapPin className="w-3.5 h-3.5 text-red-500" /><span>{item.Location}</span></td>
                                                <td className="p-3 font-bold text-blue-600 font-mono">{item.SKU}</td><td className="p-3 max-w-xs truncate">{item.Description}</td><td className="p-3 text-center font-bold">{item.Qty}</td><td className="p-3 text-center font-extrabold">{item.countedQty ?? item.Qty}</td><td className="p-3 text-center font-extrabold"><span className="px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-800">{(item.countedQty ?? item.Qty) - item.Qty}</span></td><td className="p-3 text-slate-600">{item.counter}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'issues' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-sm font-extrabold text-red-700 flex items-center space-x-2"><AlertTriangle className="w-4 h-4" /><span>Live Issue Tracker</span></h3>
                                <div className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 font-bold rounded-lg text-xs">{liveIssues.length} Isu Terdeteksi</div>
                            </div>
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-[11px] border-collapse min-w-full">
                                    <thead className="bg-slate-50 font-bold text-slate-700 border-b border-slate-200"><tr><th className="p-3">LOKASI</th><th className="p-3">SKU</th><th className="p-3">COUNTER PIC</th><th className="p-3 text-center">SYSTEM</th><th className="p-3 text-center">COUNTED</th><th className="p-3 text-center">ISSUE</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {liveIssues.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold font-mono text-slate-800">{item.Location}</td><td className="p-3 font-bold text-blue-600">{item.SKU}</td><td className="p-3">{item.counter}</td><td className="p-3 text-center font-bold">{item.Qty}</td><td className="p-3 text-center font-extrabold">{item.isCounted ? (item.countedQty ?? item.Qty) : '-'}</td>
                                                <td className="p-3 text-center">{!item.isCounted ? (<span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">PENDING</span>) : (<span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">VARIANCE</span>)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'performance' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="border-b border-slate-100 pb-3"><h3 className="text-sm font-extrabold text-blue-800 flex items-center space-x-2"><TrendingDown className="w-4 h-4" /><span>Leaderboard Kinerja Counter</span></h3></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.keys(counterGroups).map((cName, idx) => {
                                    const group = counterGroups[cName];
                                    const progressPct = group.total > 0 ? Math.round((group.counted / group.total) * 100) : 0;
                                    return (
                                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                            <div className="flex justify-between items-start"><div className="font-bold text-slate-900 text-sm">{cName}</div></div>
                                            <div className="space-y-1"><div className="flex justify-between text-[11px] font-bold text-slate-600"><span>Progress ({progressPct}%)</span><span>{group.counted} / {group.total} SKU</span></div><div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progressPct}%` }}></div></div></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'team' && effectiveRole === 'owner' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2"><Users className="w-4 h-4 text-blue-700" /><span>Manajemen Tim & Role (Khusus Project Ini)</span></h3>
                                    <p className="text-xs text-slate-500 mt-1">Assign pegawai dari Master KTP ke project ini dan tentukan jabatannya (SPV / Counter).</p>
                                </div>
                                <button onClick={handleDownloadTeamTemplate} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-200"><FileSpreadsheet className="w-4 h-4 text-emerald-600" /><span>Template CSV</span></button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                <div className="lg:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                    <h4 className="text-xs font-bold text-slate-800">Assign Anggota (Manual)</h4>
                                    <div className="flex flex-col md:flex-row gap-3 items-center">
                                        <SearchableSelect
                                            options={assignOptions}
                                            value={assignUsername}
                                            onChange={setAssignUsername}
                                            placeholder="-- Cari Username dari KTP --"
                                            className="w-full md:w-64"
                                        />

                                        <span className="text-xs font-extrabold text-slate-400">SEBAGAI</span>

                                        <select value={assignRole} onChange={(e) => setAssignRole(e.target.value as UserRole)} className="w-full md:w-40 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none font-bold">
                                            <option value="counter">Counter (Hitung)</option><option value="spv">SPV (Leader)</option>
                                        </select>
                                        <button onClick={handleAssignTeamManual} className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shrink-0"><Plus className="w-3.5 h-3.5 inline mr-1" />Assign</button>
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl text-center flex flex-col justify-center items-center space-y-2">
                                    <Upload className="w-6 h-6 text-blue-600" />
                                    <div className="text-xs font-bold text-blue-900">Bulky Assign Tim (.xls / .csv)</div>
                                    <label className="px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-blue-800">
                                        <Upload className="w-3 h-3 inline mr-1" /><span>Upload CSV Assign</span>
                                        <input type="file" accept=".csv, .xls, .xlsx" className="hidden" onChange={handleBulkyAssignTeam} />
                                    </label>
                                </div>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                                        <tr><th className="p-3 border-b">USERNAME</th><th className="p-3 border-b">NAMA PEGAWAI</th><th className="p-3 border-b">ROLE / JABATAN PROJECT</th><th className="p-3 border-b text-right">AKSI</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                                        {activeTeamMembers.length > 0 ? activeTeamMembers.map((member, idx) => {
                                            const globalData = globalAccounts.find(g => g.username === member.username);
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="p-3 font-bold font-mono text-blue-600">{member.username}</td>
                                                    <td className="p-3 font-bold">{globalData ? globalData.name : 'Unknown (Auto)'}</td>
                                                    <td className="p-3 font-bold"><span className={`px-2.5 py-1 rounded-full text-[10px] ${member.role === 'spv' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{member.role === 'spv' ? 'SPV Leader' : 'Counter Field'}</span></td>
                                                    <td className="p-3 text-right"><button onClick={() => handleRemoveTeamMember(member.username)} className="px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold"><Trash2 className="w-3 h-3 inline mr-1" />Cabut Akses</button></td>
                                                </tr>
                                            );
                                        }) : (<tr><td colSpan={4} className="p-5 text-center text-slate-500 font-bold">Belum ada tim yang di-assign ke project ini.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'monitoring' && effectiveRole === 'owner' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Plotting Lokasi Rak</h3>
                                <p className="text-xs text-slate-500 mt-1">Re-assign tugas per rak ke operator atau SPV secara instan. Ketik username untuk mencari tim.</p>
                            </div>
                            <div className="overflow-x-auto border border-slate-200 rounded-xl min-h-64">
                                <table className="w-full text-left text-xs border-collapse min-w-full">
                                    <thead className="bg-slate-100 font-bold text-slate-700"><tr><th className="p-3 border-b">LOKASI RAK</th><th className="p-3 border-b text-center">TOTAL SKU</th><th className="p-3 border-b">OPERATOR</th><th className="p-3 border-b">RE-ASSIGN</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {groupedLocationsToAssign.map((locItem, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold font-mono"><MapPin className="w-3.5 h-3.5 text-blue-600 inline mr-1" />{locItem.location}</td>
                                                <td className="p-3 text-center">{locItem.skuCount} SKU</td>
                                                <td className="p-3 font-bold text-blue-600">{locItem.counter}</td>
                                                <td className="p-3">
                                                    <SearchableSelect
                                                        options={reassignOptions}
                                                        value={locItem.counter === 'Unassigned' ? '' : locItem.counter}
                                                        onChange={(val) => handleReassignTask(locItem.location, val)}
                                                        placeholder="-- Assign ke --"
                                                        className="w-48"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'crosscheck' && effectiveRole === 'owner' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                <h3 className="text-base font-extrabold text-amber-900">3rd Party Recon Center</h3>
                                <button onClick={() => setShowThirdPartyPaste(!showThirdPartyPaste)} className="px-3.5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold"><ClipboardCheck className="w-4 h-4 inline mr-1" /><span>Import 3rd Party</span></button>
                            </div>
                            {showThirdPartyPaste && (
                                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
                                    <textarea rows={4} value={thirdPartyPasteText} onChange={(e) => setThirdPartyPasteText(e.target.value)} placeholder={"SMB-14\t95"} className="w-full p-2.5 text-xs font-mono border border-slate-300 rounded-xl outline-none" />
                                    <button onClick={handleProcessThirdPartyPaste} className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold">Proses Mapping</button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-extrabold text-slate-700">Filter Counter:</span>
                                    <select value={crosscheckCounterFilter} onChange={(e) => setCrosscheckCounterFilter(e.target.value)} className="bg-white border border-slate-300 text-xs font-bold text-slate-800 px-3 py-1 rounded-lg outline-none cursor-pointer">
                                        <option value="all">Semua Counter Internal</option>
                                        {activeTeamMembers.map(tm => (
                                            <option key={tm.username} value={tm.username}>{tm.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700">
                                    <input type="checkbox" checked={crosscheckDisputeOnly} onChange={(e) => setCrosscheckDisputeOnly(e.target.checked)} className="w-4 h-4 text-amber-600 rounded" />
                                    <span>Tampilkan Hanya Dispute (Selisih)</span>
                                </label>
                            </div>

                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs border-collapse min-w-full">
                                    <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200"><tr><th className="p-3">LOKASI</th><th className="p-3">COUNTER</th><th className="p-3">SKU</th><th className="p-3 text-center">WMS QTY</th><th className="p-3 text-center">INTERNAL COUNT</th><th className="p-3 text-center">3RD PARTY COUNT</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {filteredCrosscheckList.map((mItem, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold font-mono">{mItem.Location}</td><td className="p-3 text-blue-600 font-bold">{mItem.counter}</td><td className="p-3 font-mono font-bold text-blue-600">{mItem.SKU}</td><td className="p-3 text-center">{mItem.Qty}</td><td className="p-3 text-center font-extrabold">{mItem.countedQty ?? mItem.Qty}</td><td className="p-3 text-center font-extrabold text-amber-800">{mItem.thirdPartyQty ?? (mItem.countedQty ?? mItem.Qty)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div><h3 className="text-sm font-bold text-slate-800">Audit Trail</h3></div>
                                <button onClick={handleExportAuditExcel} className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"><FileSpreadsheet className="w-4 h-4" /><span>Export Audit Trail</span></button>
                            </div>
                            <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-[11px] border-collapse min-w-full">
                                    <thead className="bg-slate-100 font-bold font-mono text-slate-700 sticky top-0"><tr><th className="p-2.5 border-b">Timestamp</th><th className="p-2.5 border-b">round</th><th className="p-2.5 border-b">counter</th><th className="p-2.5 border-b">SKU</th><th className="p-2.5 border-b text-center">Counted Qty</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {auditLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50"><td className="p-2.5 font-mono text-slate-500">{log.timestamp}</td><td className="p-2.5 font-bold">{log.round}</td><td className="p-2.5 font-bold">{log.counterId}</td><td className="p-2.5 font-mono font-bold text-blue-600">{log.sku}</td><td className="p-2.5 text-center font-bold">{log.countedQty}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'master' && effectiveRole === 'owner' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div><h3 className="text-sm font-bold text-slate-800">Bulky Import Master Data SKU</h3></div>
                                <button onClick={handleDownloadTemplateXLS} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border"><FileSpreadsheet className="w-4 h-4 text-emerald-600 inline mr-1" />Download Template</button>
                            </div>
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50">
                                <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                <label className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer inline-flex items-center space-x-1.5"><Upload className="w-3.5 h-3.5" /><span>Browse File Master</span><input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} /></label>
                            </div>
                            <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-[11px] border-collapse min-w-full">
                                    <thead className="bg-slate-100 font-bold sticky top-0"><tr><th className="p-2 border-b">Owner</th><th className="p-2 border-b">SKU</th><th className="p-2 border-b">Description</th><th className="p-2 border-b">Location</th><th className="p-2 border-b text-center">Qty System</th><th className="p-2 border-b text-right bg-amber-50">Unit Price</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {masterDataList.map((row, idx) => (
                                            <tr key={idx}><td className="p-2 font-bold text-amber-600">{row.Owner}</td><td className="p-2 font-bold font-mono text-blue-600">{row.SKU}</td><td className="p-2">{row.Description}</td><td className="p-2 font-mono">{row.Location}</td><td className="p-2 text-center font-bold">{row.Qty}</td><td className="p-2 text-right font-mono font-bold bg-amber-50/30">Rp {(row.unitPrice || 0).toLocaleString('id-ID')}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'rules' && effectiveRole === 'owner' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-800">Master Aturan Mapping Brand → Owner</h3>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
                                <div><div className="text-xs font-bold">Prefix SKU Khusus B2B</div></div>
                                <div className="flex gap-2"><input type="text" value={b2bPrefix} onChange={(e) => setB2bPrefix(e.target.value)} className="w-28 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono" /><button onClick={handleSavePrefix} className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">Simpan</button></div>
                            </div>
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                                <div className="flex justify-between items-center"><h4 className="text-xs font-bold">Tambah Aturan Mapping Brand</h4><button onClick={() => setShowPasteBox(!showPasteBox)} className="text-xs font-bold text-blue-600">{showPasteBox ? 'Tutup Copas' : 'Copas dari Excel'}</button></div>
                                {showPasteBox ? (
                                    <div className="space-y-2 bg-white p-3 rounded-xl border border-blue-200"><textarea rows={3} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder={"ENFAGROW\tDDI"} className="w-full p-2 text-xs font-mono border rounded-lg" /><button onClick={handleProcessBulkPaste} className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">Proses</button></div>
                                ) : (
                                    <div className="flex gap-2"><input type="text" placeholder="Nama Brand" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} className="flex-1 px-3 py-1.5 text-xs bg-white border rounded-lg" /><input type="text" placeholder="Owner WMS" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} className="w-40 px-3 py-1.5 text-xs bg-white border rounded-lg" /><button onClick={handleAddBrandRule} className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">+ Tambah</button></div>
                                )}
                            </div>
                            <div className="overflow-x-auto border rounded-xl max-w-xl">
                                <table className="w-full text-left text-xs"><thead className="bg-slate-100 font-bold"><tr><th className="p-2.5">BRAND</th><th className="p-2.5">OWNER</th><th className="p-2.5 text-right">AKSI</th></tr></thead>
                                    <tbody className="divide-y font-medium">{brandRules.map((rule, idx) => (<tr key={idx}><td className="p-2.5 font-bold">{rule.brand}</td><td className="p-2.5 font-bold text-blue-600 font-mono">{rule.owner}</td><td className="p-2.5 text-right"><button onClick={() => handleDeleteBrandRule(idx)} className="text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'recovery' && effectiveRole === 'owner' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
                            <div className="flex justify-between items-center border-b pb-4">
                                <h3 className="text-base font-extrabold text-purple-900">Final Count Sheet & Recovery Center</h3>
                                <button onClick={handleExportFinalRecoveryExcel} className="px-4 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold"><FileCheck className="w-4 h-4 inline mr-1" />Export Recovery</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex justify-between items-center"><div><div className="text-[11px] font-bold text-emerald-800">MATCH</div><div className="text-lg font-black text-emerald-700">{matchRecoveryCount} / {totalRecoverySKUs} SKU</div></div><CheckCircle2 className="w-8 h-8 text-emerald-600" /></div>
                                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex justify-between items-center"><div><div className="text-[11px] font-bold text-red-800">VARIANCE</div><div className="text-lg font-black text-red-600">{varianceRecoveryCount} SKU</div></div><XCircle className="w-8 h-8 text-red-500" /></div>
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex justify-between items-center col-span-2"><div><div className="text-[11px] font-bold text-amber-800">NILAI NOMINAL VARIANCE</div><div className="text-xl font-black text-amber-900 mt-0.5">Rp {totalFinancialVarianceValue.toLocaleString('id-ID')}</div></div><DollarSign className="w-8 h-8 text-amber-600" /></div>
                            </div>
                            <div className="overflow-x-auto border rounded-xl">
                                <table className="w-full text-left text-xs border-collapse min-w-full">
                                    <thead className="bg-slate-100 font-bold border-b"><tr><th className="p-3">LOKASI</th><th className="p-3">SKU</th><th className="p-3 text-center">SYSTEM</th><th className="p-3 text-center">FINAL VALID COUNT</th><th className="p-3 text-center">SELISIH</th><th className="p-3 text-right">OVERRIDE RECOVERY</th></tr></thead>
                                    <tbody className="divide-y font-medium">
                                        {masterDataList.map((item, idx) => {
                                            const finalCount = recoveryAdjustments[item.SKU] !== undefined ? recoveryAdjustments[item.SKU] : (item.countedQty ?? item.Qty);
                                            const diff = finalCount - item.Qty;
                                            return (
                                                <tr key={idx} className={diff === 0 ? 'hover:bg-slate-50' : 'bg-red-50/40'}>
                                                    <td className="p-3 font-bold font-mono">{item.Location}</td><td className="p-3 font-bold font-mono text-blue-600">{item.SKU}</td><td className="p-3 text-center font-bold">{item.Qty}</td><td className="p-3 text-center font-extrabold bg-white border rounded-lg">{finalCount}</td><td className="p-3 text-center font-extrabold"><span className={diff === 0 ? 'text-emerald-600' : 'text-red-600'}>{diff > 0 ? `+${diff}` : diff}</span></td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex items-center justify-end space-x-1.5">
                                                            <input type="number" placeholder="Qty" className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold font-mono outline-none" onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRecoveryOverride(item.SKU, parseInt((e.target as HTMLInputElement).value, 10)); }} />
                                                            <button onClick={(e) => handleSaveRecoveryOverride(item.SKU, parseInt(((e.currentTarget.previousElementSibling as HTMLInputElement).value), 10))} className="p-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold"><Save className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}