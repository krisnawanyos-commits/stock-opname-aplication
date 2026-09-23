import { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
    collection, onSnapshot, doc, setDoc, deleteDoc
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import {
    Users, Database, Upload, Check,
    PieChart, ChevronDown, Plus,
    Trash2, UserPlus, Building2, Scale, PlayCircle,
    Archive, ArrowLeft, AlertTriangle, LogOut, Eye, FileSpreadsheet
} from 'lucide-react';
import type { UserRole } from '../types';

interface AdminDashboardProps {
    onBackToApp: () => void;
    currentUserRole?: UserRole;
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
    SKUBrand: string;
    satuanHitung: string;
    Location: string;
    level: string;
    ailee: string;
    Zone: string;
    LocationType: string;
    counter: string;
    Status: string;
    currentRound: number;
    expiredDateSystem: string;
    expiredDateActual: string;
    Qty: number;
    countedQty?: number;
    Remarks: string;
    thirdPartyQty?: number;
    unitPrice?: number;
    isCounted?: boolean;
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

const SearchableSelect = ({ options, value, onChange, placeholder, className = "" }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(search.toLowerCase()));
    const selectedLabel = options.find((o: any) => o.value === value)?.label || placeholder;

    return (
        <div className={`relative ${className}`}>
            <div className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg outline-none font-bold cursor-pointer flex justify-between items-center hover:bg-slate-50" onClick={() => setIsOpen(!isOpen)}>
                <span className={value ? "text-slate-800 truncate" : "text-slate-400 truncate"}>{selectedLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearch(''); }}></div>
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b border-slate-100 z-10"><input type="text" autoFocus className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded outline-none text-slate-700" placeholder="Ketik mencari..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                        <div className="py-1">
                            <div className="px-3 py-1.5 text-[10px] font-extrabold text-slate-400 bg-slate-50 cursor-pointer hover:bg-slate-100" onClick={() => { onChange(''); setIsOpen(false); setSearch(''); }}>-- Clear --</div>
                            {filteredOptions.length > 0 ? filteredOptions.map((opt: any) => (
                                <div key={opt.value} className="px-3 py-2 text-xs cursor-pointer hover:bg-blue-50 text-slate-700 font-medium" onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}>{opt.label}</div>
                            )) : (<div className="px-3 py-3 text-xs text-slate-400 text-center">Tidak ditemukan</div>)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default function AdminDashboard({ onBackToApp, currentUserRole = 'owner' }: AdminDashboardProps) {
    const effectiveRole: UserRole = currentUserRole === 'owner' ? 'owner' : 'spv';

    const [viewState, setViewState] = useState<'LANDING' | 'WIZARD_SETUP' | 'DASHBOARD'>('LANDING');
    const [landingTab, setLandingTab] = useState<'projects' | 'accounts'>('projects');
    const [activeTab, setActiveTab] = useState<string>('progress');

    const [projectHistory, setProjectHistory] = useState<ProjectSession[]>([]);
    const [activeProject, setActiveProject] = useState<ProjectSession | null>(null);

    const [wizOpnameDate, setWizOpnameDate] = useState('2026-09-22');
    const [wizSessionCode, setWizSessionCode] = useState('SO-WH01-2026-09');
    const wizLocationId = 'WH-01'; // Konstan karena disederhanakan

    const [showToast, setShowToast] = useState<string | null>(null);
    const triggerNotification = (msg: string) => { setShowToast(msg); setTimeout(() => setShowToast(null), 3000); };

    // ==========================================
    // FIRESTORE SYNC
    // ==========================================
    const [globalAccounts, setGlobalAccounts] = useState<GlobalAccount[]>([]);
    const [allProjectTeams, setAllProjectTeams] = useState<ProjectTeamMember[]>([]);

    useEffect(() => {
        const unsub1 = onSnapshot(collection(db, "global_accounts"), (snap) => setGlobalAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as GlobalAccount))));
        const unsub2 = onSnapshot(collection(db, "projects"), (snap) => setProjectHistory(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectSession))));
        const unsub3 = onSnapshot(collection(db, "project_teams"), (snap) => setAllProjectTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectTeamMember))));
        return () => { unsub1(); unsub2(); unsub3(); };
    }, []);

    // ==========================================
    // MASTER TASK & XLSX LOGIC
    // ==========================================
    const [masterDataList, setMasterDataList] = useState<MasterSKUItem[]>([]);
    const [initialFileToUpload, setInitialFileToUpload] = useState<File | null>(null);

    const parseXLSXFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(worksheet) as any[];

            const parsed = json.map(row => ({
                Owner: row['Owner'] || 'DDI',
                SKU: row['SKU']?.toString() || '',
                Description: row['Description'] || '',
                UPC1: row['UPC 1']?.toString() || '',
                UPC2: row['UPC 2']?.toString() || '',
                SKUBrand: row['SKU Brand'] || '',
                satuanHitung: row['satuan hitung'] || 'PCS',
                Location: row['Location']?.toString() || '',
                level: row['level']?.toString() || '1',
                ailee: row['ailee']?.toString() || '',
                Zone: row['Zone']?.toString() || '',
                LocationType: row['Location Type'] || 'RACK',
                counter: row['counter'] || 'Unassigned',
                Status: row['Status'] || 'ACTIVE',
                currentRound: parseInt(row['current round']) || 1,
                expiredDateSystem: row['expired date by system'] || '',
                expiredDateActual: row['expired date by actual'] || '',
                Qty: parseInt(row['Qty System'] || row['QTY SYSTEM']) || 0,
                countedQty: row['QTY ACTUAL'] ? parseInt(row['QTY ACTUAL']) : undefined,
                Remarks: row['REMARKS'] || '',
                isCounted: row['QTY ACTUAL'] !== undefined,
                unitPrice: parseInt(row['Unit Price'] || '0')
            }));
            setMasterDataList(parsed);
            triggerNotification(`Berhasil upload ${parsed.length} Task SKU (Excel)!`);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplateXLSX = () => {
        const templateData = [{
            Owner: 'DDI', SKU: 'ENFA-01', Description: 'Susu Kaleng 400g', 'UPC 1': '12345678', 'UPC 2': '',
            'SKU Brand': 'ENFAGROW', 'satuan hitung': 'PCS', Location: 'R-01', level: '1', ailee: 'A',
            Zone: 'FOOD', 'Location Type': 'RACK', counter: 'agus.lap', Status: 'ACTIVE',
            'current round': 1, 'Qty System': 100, 'expired date by system': '2026-12-31',
            'expired date by actual': '', 'QTY ACTUAL': '', REMARKS: '', 'Unit Price': 150000
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Master_Task");
        XLSX.writeFile(wb, "Template_Master_Task.xlsx");
        triggerNotification("Template .xlsx berhasil diunduh!");
    };

    // KTP Management
    const [newAccUser, setNewAccUser] = useState('');
    const [newAccName, setNewAccName] = useState('');
    const [newAccPin, setNewAccPin] = useState('');
    const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});

    const handleAddGlobalAccount = async () => {
        if (newAccUser && newAccPin) {
            const uName = newAccUser.trim().toLowerCase();
            await setDoc(doc(db, "global_accounts", uName), { username: uName, name: newAccName, pin: newAccPin, email: `${uName}@anymindgroup.com` });
            setNewAccUser(''); setNewAccName(''); setNewAccPin('');
            triggerNotification(`Akun ${uName} berhasil dibuat di Cloud!`);
        }
    };

    const handleDeleteGlobalAccount = async (username: string) => {
        if (window.confirm(`Yakin hapus permanen akun KTP: ${username}?`)) {
            await deleteDoc(doc(db, "global_accounts", username));
            triggerNotification(`Akun ${username} dihapus dari Cloud.`);
        }
    };

    // 4 TABS DEFINITION
    const PROJECT_TABS = [
        { id: 'progress', label: 'Progress & Live Issues', icon: PieChart, roles: ['owner', 'spv'] },
        { id: 'master', label: 'Master Task & Rak', icon: Database, roles: ['owner', 'spv'] },
        { id: 'recon', label: 'Recon & Final Recovery', icon: Scale, roles: ['owner'] },
        { id: 'settings', label: 'Tim & Pricing Rules', icon: Users, roles: ['owner'] }
    ].filter(t => t.roles.includes(effectiveRole));

    // Project Start
    const handleStartNewProjectSession = async () => {
        const projId = `PROJ-${Date.now().toString().slice(-4)}`;
        const newSession = {
            sessionCode: wizSessionCode.trim(), locationId: wizLocationId, locationName: 'WMS Warehouse',
            opnameDate: wizOpnameDate, method: 'LIST_TO_FLOOR', status: 'LIVE_ACTIVE', createdAt: new Date().toLocaleString()
        };
        await setDoc(doc(db, "projects", projId), newSession);
        if (initialFileToUpload) parseXLSXFile(initialFileToUpload);
        setActiveProject({ id: projId, ...newSession } as ProjectSession);
        setViewState('DASHBOARD'); setActiveTab('progress');
        triggerNotification(`Project ${newSession.sessionCode} dimulai!`);
    };

    // Computations
    const totalSKUs = masterDataList.length;
    const totalCounted = masterDataList.filter(i => i.isCounted).length;
    const overallPct = totalSKUs > 0 ? Math.round((totalCounted / totalSKUs) * 100) : 0;
    const liveIssues = masterDataList.filter(item => item.isCounted && item.countedQty !== item.Qty);

    const activeTeamMembers = activeProject ? allProjectTeams.filter(t => t.projectId === activeProject.id) : [];
    const assignOptions = globalAccounts.filter(acc => !activeTeamMembers.find(t => t.username === acc.username)).map(acc => ({ value: acc.username, label: `${acc.username} - ${acc.name}` }));

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 p-4 max-w-6xl mx-auto font-sans">

            {showToast && (
                <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-slate-700 animate-bounce">
                    <Check className="w-4 h-4 text-emerald-400" /><span className="text-xs font-semibold">{showToast}</span>
                </div>
            )}

            {/* ==================================================== */}
            {/* 1. LANDING PAGE */}
            {/* ==================================================== */}
            {viewState === 'LANDING' && (
                <div className="space-y-5">
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-purple-50 text-purple-700 rounded-xl"><Archive className="w-7 h-7" /></div>
                            <div><h1 className="text-lg font-black text-slate-900">Global Control Center</h1><p className="text-xs text-slate-500">Merekam project & KTP secara Cloud Firestore.</p></div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button onClick={() => setViewState('WIZARD_SETUP')} className="px-4 py-2.5 bg-purple-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2"><Plus className="w-4 h-4" /><span>Start New Project</span></button>
                            <button onClick={onBackToApp} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2"><LogOut className="w-4 h-4" /><span>Keluar</span></button>
                        </div>
                    </div>

                    <div className="flex space-x-2">
                        <button onClick={() => setLandingTab('projects')} className={`px-4 py-2 text-xs font-bold rounded-xl ${landingTab === 'projects' ? 'bg-slate-800 text-white' : 'bg-white border'}`}><Building2 className="w-4 h-4 inline mr-1" />Project List</button>
                        <button onClick={() => setLandingTab('accounts')} className={`px-4 py-2 text-xs font-bold rounded-xl ${landingTab === 'accounts' ? 'bg-slate-800 text-white' : 'bg-white border'}`}><Users className="w-4 h-4 inline mr-1" />KTP Global (Cloud)</button>
                    </div>

                    {landingTab === 'projects' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold text-slate-800">Daftar Histori Project Opname:</h3>
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-100 font-bold"><tr><th className="p-3">KODE PROJECT</th><th className="p-3">TANGGAL</th><th className="p-3 text-center">STATUS</th><th className="p-3 text-right">AKSI</th></tr></thead>
                                    <tbody className="divide-y font-medium">
                                        {projectHistory.map((proj) => (
                                            <tr key={proj.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold font-mono text-purple-700">{proj.sessionCode}</td><td className="p-3 font-mono">{proj.opnameDate}</td>
                                                <td className="p-3 text-center"><span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">{proj.status}</span></td>
                                                <td className="p-3 text-right">
                                                    <button onClick={() => { setActiveProject(proj); setViewState('DASHBOARD'); }} className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"><PlayCircle className="w-3.5 h-3.5 inline mr-1" />Buka</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {landingTab === 'accounts' && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-extrabold">Master KTP Global</h3>
                            </div>
                            <div className="flex gap-2 bg-slate-50 p-3 rounded-xl border">
                                <input type="text" placeholder="Username" value={newAccUser} onChange={(e) => setNewAccUser(e.target.value)} className="flex-1 px-3 py-2 text-xs border rounded-lg" />
                                <input type="text" placeholder="Nama" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} className="flex-1 px-3 py-2 text-xs border rounded-lg" />
                                <input type="password" placeholder="PIN" value={newAccPin} onChange={(e) => setNewAccPin(e.target.value)} className="w-24 px-3 py-2 text-xs border rounded-lg" />
                                <button onClick={handleAddGlobalAccount} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"><UserPlus className="w-4 h-4 inline mr-1" />Buat KTP</button>
                            </div>
                            <div className="overflow-x-auto border rounded-xl">
                                <table className="w-full text-left text-xs"><thead className="bg-slate-100 font-bold"><tr><th className="p-3">USERNAME</th><th className="p-3">NAMA</th><th className="p-3 text-center">PIN</th><th className="p-3 text-right">HAPUS KTP</th></tr></thead>
                                    <tbody className="divide-y font-medium">
                                        {globalAccounts.map((acc) => (
                                            <tr key={acc.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-bold font-mono text-blue-600">{acc.username}</td><td className="p-3 font-bold">{acc.name}</td>
                                                <td className="p-3 text-center font-mono font-bold flex justify-center space-x-2"><span>{visiblePins[acc.id] ? acc.pin : '••••'}</span><button onClick={() => setVisiblePins(prev => ({ ...prev, [acc.id]: !prev[acc.id] }))}><Eye className="w-3.5 h-3.5 text-slate-400" /></button></td>
                                                <td className="p-3 text-right"><button onClick={() => handleDeleteGlobalAccount(acc.username)} className="p-1.5 bg-red-50 text-red-600 rounded"><Trash2 className="w-4 h-4" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ==================================================== */}
            {/* 2. WIZARD SETUP */}
            {/* ==================================================== */}
            {viewState === 'WIZARD_SETUP' && (
                <div className="max-w-2xl mx-auto space-y-5">
                    <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center justify-between border"><h1 className="text-base font-black">Setup Project STO</h1><button onClick={() => setViewState('LANDING')} className="p-2 bg-slate-100 rounded-xl"><ArrowLeft className="w-5 h-5" /></button></div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="text-xs font-bold">Kode Project</label><input type="text" value={wizSessionCode} onChange={(e) => setWizSessionCode(e.target.value)} className="w-full p-2.5 mt-1 border rounded-xl text-xs font-bold" /></div>
                            <div><label className="text-xs font-bold">Tanggal</label><input type="date" value={wizOpnameDate} onChange={(e) => setWizOpnameDate(e.target.value)} className="w-full p-2.5 mt-1 border rounded-xl text-xs font-bold" /></div>
                        </div>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-2">
                            <Upload className="w-6 h-6 text-blue-600 mx-auto" />
                            <div className="text-xs font-bold text-blue-900">Upload Excel (.xlsx) Master Task Awal (Opsional)</div>
                            <input type="file" accept=".xlsx, .xls" onChange={(e) => setInitialFileToUpload(e.target.files?.[0] || null)} className="text-xs" />
                        </div>
                        <div className="flex justify-end pt-3"><button onClick={handleStartNewProjectSession} className="px-5 py-2.5 bg-purple-700 text-white rounded-xl text-xs font-extrabold"><PlayCircle className="w-4 h-4 inline mr-1" />Start Active Session</button></div>
                    </div>
                </div>
            )}

            {/* ==================================================== */}
            {/* 3. DASHBOARD (4 TAB RINGKAS) */}
            {/* ==================================================== */}
            {viewState === 'DASHBOARD' && activeProject && (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between md:items-center gap-3">
                        <div className="flex items-center space-x-3">
                            <button onClick={() => setViewState('LANDING')} className="p-2 bg-slate-100 rounded-xl"><ArrowLeft className="w-4 h-4" /></button>
                            <div>
                                <h1 className="text-base font-bold">Dashboard: {activeProject.sessionCode}</h1>
                                <p className="text-xs text-slate-500">Cloud Connected • Real-Time Database</p>
                            </div>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {PROJECT_TABS.map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all ${activeTab === t.id ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}><t.icon className="w-4 h-4" /><span>{t.label}</span></button>
                            ))}
                        </div>
                    </div>

                    {/* TAB 1: PROGRESS & ISSUES */}
                    {activeTab === 'progress' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                                <h3 className="text-sm font-bold flex items-center"><PieChart className="w-4 h-4 mr-2 text-blue-600" />Summary Progress Task</h3>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                                    <div><div className="text-3xl font-black text-slate-900">{overallPct}%</div><div className="text-[10px] font-bold text-slate-500">TERHITUNG ({totalCounted}/{totalSKUs} SKU)</div></div>
                                    <div className="w-24 h-24 rounded-full border-8 border-slate-200 relative"><div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent" style={{ transform: `rotate(${overallPct * 3.6}deg)` }}></div></div>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl border shadow-sm space-y-4">
                                <div className="flex justify-between items-center"><h3 className="text-sm font-bold flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-red-600" />Live Variance & Issues</h3><span className="px-2 py-1 bg-red-100 text-red-800 font-bold text-[10px] rounded">{liveIssues.length} Dispute</span></div>
                                <div className="overflow-auto max-h-40 border rounded-xl text-xs"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-2">LOKASI</th><th className="p-2">SKU</th><th className="p-2">SELISIH</th><th className="p-2">COUNTER</th></tr></thead><tbody>{liveIssues.map((item, i) => (<tr key={i} className="border-t"><td className="p-2 font-mono font-bold">{item.Location}</td><td className="p-2 font-mono text-blue-600">{item.SKU}</td><td className="p-2 text-red-600 font-bold">{item.countedQty! - item.Qty}</td><td className="p-2">{item.counter}</td></tr>))}</tbody></table></div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: MASTER TASK & RAK */}
                    {activeTab === 'master' && (
                        <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
                            <div className="flex justify-between items-center border-b pb-3">
                                <h3 className="text-sm font-bold">Database Master Task (.xlsx)</h3>
                                <div className="space-x-2">
                                    <button onClick={handleDownloadTemplateXLSX} className="px-3 py-1.5 bg-slate-100 border text-slate-700 rounded-lg text-xs font-bold"><FileSpreadsheet className="w-3.5 h-3.5 inline mr-1 text-emerald-600" />Download Template Excel</button>
                                    <label className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"><Upload className="w-3.5 h-3.5 inline mr-1" />Upload File Master<input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => { if (e.target.files?.[0]) parseXLSXFile(e.target.files[0]); }} /></label>
                                </div>
                            </div>

                            <div className="overflow-x-auto max-h-125 border rounded-xl shadow-inner scrollbar-thin">
                                <table className="w-full text-left text-[11px] min-w-max border-collapse">
                                    <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0 shadow-sm">
                                        <tr><th className="p-2 border-b">Owner</th><th className="p-2 border-b">SKU</th><th className="p-2 border-b max-w-37.5">Description</th><th className="p-2 border-b">Brand</th><th className="p-2 border-b bg-amber-50">Lokasi / Rak</th><th className="p-2 border-b bg-amber-50">Counter PIC</th><th className="p-2 border-b">ED System</th><th className="p-2 border-b">ED Actual</th><th className="p-2 border-b text-center">System Qty</th><th className="p-2 border-b text-center">ACTUAL Qty</th></tr>
                                    </thead>
                                    <tbody className="divide-y font-medium bg-white">
                                        {masterDataList.map((row, idx) => {
                                            const diff = row.isCounted ? (row.countedQty! - row.Qty) : 0;
                                            return (
                                                <tr key={idx} className={row.isCounted ? (diff === 0 ? 'bg-emerald-50/30' : 'bg-red-50/30') : ''}>
                                                    <td className="p-2">{row.Owner}</td><td className="p-2 font-mono font-bold text-blue-600">{row.SKU}</td><td className="p-2 truncate max-w-37.5">{row.Description}</td><td className="p-2">{row.SKUBrand}</td>
                                                    <td className="p-2 font-mono font-bold bg-amber-50/20">{row.Location} <span className="text-[9px] text-slate-400">({row.Zone})</span></td>
                                                    <td className="p-2 bg-amber-50/20"><SearchableSelect options={allProjectTeams.filter(t => t.projectId === activeProject.id).map(t => ({ value: t.username, label: t.username }))} value={row.counter === 'Unassigned' ? '' : row.counter} onChange={(val: string) => { const nw = [...masterDataList]; nw[idx].counter = val; setMasterDataList(nw); }} placeholder="Assign..." className="w-32" /></td>
                                                    <td className="p-2 font-mono">{row.expiredDateSystem || '-'}</td><td className="p-2 font-mono">{row.expiredDateActual || '-'}</td>
                                                    <td className="p-2 text-center font-bold text-slate-500">{row.Qty}</td><td className="p-2 text-center font-black">{row.isCounted ? row.countedQty : '-'}</td>
                                                </tr>
                                            );
                                        })}
                                        {masterDataList.length === 0 && (<tr><td colSpan={10} className="p-8 text-center text-slate-400">Belum ada task. Upload template Excel di atas.</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: RECON & RECOVERY */}
                    {activeTab === 'recon' && (
                        <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
                            <h3 className="text-sm font-bold flex items-center"><Scale className="w-4 h-4 mr-2 text-amber-600" />Final Recon & Valuasi Selisih</h3>
                            <div className="overflow-x-auto border rounded-xl">
                                <table className="w-full text-left text-xs"><thead className="bg-slate-50 font-bold"><tr><th className="p-3">SKU</th><th className="p-3 text-center">WMS</th><th className="p-3 text-center">ACTUAL</th><th className="p-3 text-center">SELISIH</th><th className="p-3 text-right">VALUASI (Rp)</th></tr></thead>
                                    <tbody className="divide-y font-medium">
                                        {masterDataList.filter(i => i.isCounted && (i.countedQty! - i.Qty) !== 0).map((item, i) => {
                                            const diff = item.countedQty! - item.Qty;
                                            const val = diff * (item.unitPrice || 0);
                                            return (<tr key={i}><td className="p-3 font-mono font-bold text-blue-600">{item.SKU}</td><td className="p-3 text-center">{item.Qty}</td><td className="p-3 text-center font-bold">{item.countedQty}</td><td className="p-3 text-center text-red-600 font-bold">{diff}</td><td className="p-3 text-right font-mono text-amber-700 font-bold">Rp {val.toLocaleString('id-ID')}</td></tr>);
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: PENGATURAN PROJECT (TIM & PRICING) */}
                    {activeTab === 'settings' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold border-b pb-2">Assign Tim Project</h3>
                                <div className="flex gap-2">
                                    <SearchableSelect options={assignOptions} value={newAccUser} onChange={setNewAccUser} placeholder="Cari KTP..." className="flex-1" />
                                    <button onClick={async () => { if (newAccUser) { await setDoc(doc(db, "project_teams", `${activeProject.id}_${newAccUser}`), { projectId: activeProject.id, username: newAccUser, role: 'counter' }); setNewAccUser(''); } }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold">Assign</button>
                                </div>
                                <div className="overflow-y-auto max-h-48 border rounded-xl text-xs"><table className="w-full text-left"><thead className="bg-slate-50"><tr><th className="p-2">USERNAME</th><th className="p-2">ROLE</th><th className="p-2 text-right">HAPUS</th></tr></thead><tbody>{activeTeamMembers.map(t => (<tr key={t.id} className="border-t"><td className="p-2 font-mono font-bold text-blue-600">{t.username}</td><td className="p-2">{t.role}</td><td className="p-2 text-right"><button onClick={() => deleteDoc(doc(db, "project_teams", t.id!))} className="text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>))}</tbody></table></div>
                            </div>
                            <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4">
                                <h3 className="text-sm font-bold border-b pb-2">Upload Master Pricing (.xlsx)</h3>
                                <div className="p-4 bg-slate-50 border rounded-xl text-center">
                                    <div className="text-xs text-slate-500 mb-2">Upload file Excel khusus pricing (SKU & Unit Price) tanpa mengganggu task rak operasional.</div>
                                    <label className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"><Upload className="w-3 h-3 inline mr-1" />Browse Pricing Excel<input type="file" accept=".xlsx" className="hidden" /></label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}