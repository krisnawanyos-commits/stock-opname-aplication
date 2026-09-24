import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import type { UserRole } from '../types';

export interface Step1LoginProps {
    onLogin?: (role: UserRole, email: string, username: string) => void;
    onSuccessLogin?: (username: string, role: UserRole, name?: string) => void;
    onBackToApp?: () => void;
    currentUserRole?: UserRole;
    currentUserEmail?: string;
    currentUsername?: string;
    [key: string]: any; // Mencegah error TS2322 'Property does not exist' di App.tsx
}

export default function Step1Login({
    onLogin,
    onSuccessLogin,
    currentUsername
}: Step1LoginProps) {
    const [username, setUsername] = useState(currentUsername || '');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const triggerLoginSuccess = (role: UserRole, email: string, userStr: string, nameStr?: string) => {
        if (onLogin) onLogin(role, email, userStr);
        if (onSuccessLogin) onSuccessLogin(userStr, role, nameStr || userStr);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !pin) {
            setError('Username dan PIN wajib diisi.');
            return;
        }

        setIsLoading(true);

        try {
            const cleanUsername = username.toLowerCase().trim();

            // 1. Fallback Kredensial Super Admin / Owner Bawaan
            if (cleanUsername === 'owner' && pin === '1234') {
                triggerLoginSuccess('owner', 'yos.krisnawan@anymindgroup.com', 'owner', 'Yos Krisnawan');
                return;
            }
            if (cleanUsername === 'spv.lead' && pin === '1234') {
                triggerLoginSuccess('spv', 'spv@anymindgroup.com', 'spv.lead', 'Supervisor Lead');
                return;
            }

            // 2. Cek ke Cloud Firestore (Koleksi global_accounts)
            const docRef = doc(db, "global_accounts", cleanUsername);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.pin === pin) {
                    triggerLoginSuccess('counter', userData.email || `${cleanUsername}@anymindgroup.com`, cleanUsername, userData.name || cleanUsername);
                } else {
                    setError('Username atau PIN salah! Silakan coba lagi.');
                }
            } else {
                setError('Akun tidak ditemukan di Cloud Database.');
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError('Gagal terhubung ke server. Periksa koneksi internet.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 space-y-8 border border-slate-100 relative overflow-hidden">

                {/* Header Logo */}
                <div className="flex flex-col items-center space-y-4 relative z-10">
                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner border border-amber-100">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Stock Opname 360</h1>
                        <p className="text-sm text-slate-500 font-medium">Masukkan Username & PIN Akun Kamu</p>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-start space-x-3 animate-in slide-in-from-top-2 relative z-10">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p className="text-sm font-bold leading-snug">{error}</p>
                    </div>
                )}

                {/* Form Login */}
                <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Username Akun</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">person</span>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="misal: bambang"
                                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 uppercase tracking-wider">PIN (4 Digit)</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">lock</span>
                            <input
                                type="password"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="••••"
                                className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black tracking-[0.25em] text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl text-sm font-black tracking-wide shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center disabled:opacity-70 cursor-pointer"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            "Masuk Sistem"
                        )}
                    </button>
                </form>

                {/* Info Testing */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl relative z-10">
                    <p className="text-xs font-black text-slate-700 mb-2">Kredensial Cloud Aktif:</p>
                    <ul className="text-[11px] text-slate-500 font-medium space-y-1.5 leading-relaxed">
                        <li>• <span className="font-bold text-slate-700">Project Owner:</span> owner (PIN: 1234)</li>
                        <li>• <span className="font-bold text-slate-700">Akun Counter:</span> (Gunakan KTP Cloud yang didaftarkan di Admin)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}