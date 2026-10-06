import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import Step1Login from './components/Step1Login';
import Step2TeamSetup from './components/Step2TeamSetup';
import Step3CountsheetList from './components/Step3CountsheetList';
import Step4CountDetail from './components/Step4CountDetail';
import AdminDashboard from './components/AdminDashboard';
import type { SessionData, RackItem, UserRole } from './types';
import { AlertTriangle, LogOut } from 'lucide-react';

const STORAGE_KEYS = {
  STEP: 'stock_opname_step',
  SESSION: 'stock_opname_session',
  RACK: 'stock_opname_rack',
  USER: 'stock_opname_user',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ username: string; role: UserRole; name?: string } | null>(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed to parse saved user data', e);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
    }
    return null;
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 'admin' | 'admin_demo'>(() => {
    const savedStep = localStorage.getItem(STORAGE_KEYS.STEP);
    if (savedStep === 'admin' || savedStep === 'admin_demo') return savedStep;
    const parsedStep = savedStep ? parseInt(savedStep, 10) : 1;
    return (parsedStep >= 1 && parsedStep <= 4) ? (parsedStep as 1 | 2 | 3 | 4) : 1;
  });

  const [sessionData, setSessionData] = useState<SessionData>(() => {
    const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (savedSession) {
      try {
        return JSON.parse(savedSession);
      } catch (e) {
        console.error('Failed to parse saved session data', e);
        localStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    }
    return {
      sessionId: 'SO-2026-KOSAMBI',
      sessionCode: 'SO-WRG-2026-09',
      sessionName: 'Kosambi WH — SO Sesi Utama 2026',
      primaryCounter: 'bambang',
      partners: ['Budi Prasetyo'],
      mode: 'list-to-floor',
      role: 'counter',
    };
  });

  const [selectedRack, setSelectedRack] = useState<RackItem | null>(() => {
    const savedRack = localStorage.getItem(STORAGE_KEYS.RACK);
    if (savedRack) {
      try {
        return JSON.parse(savedRack);
      } catch (e) {
        console.error('Failed to parse saved rack data', e);
        localStorage.removeItem(STORAGE_KEYS.RACK);
      }
    }
    return null;
  });

  // STATE UNTUK POP-UP MODAL LOGOUT APLIKASI
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);

  // LISTEN ROLE REAL-TIME DARI FIRESTORE UNTUK USER AKTIF
  useEffect(() => {
    if (!currentUser?.username) return;
    const cleanUser = currentUser.username.toLowerCase().trim();

    if (cleanUser === 'owner' || cleanUser === 'admin') return;

    let unsubGlobal: () => void = () => { };
    let unsubTeam: () => void = () => { };

    unsubGlobal = onSnapshot(doc(db, "global_accounts", cleanUser), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.role === 'spv' && currentUser.role !== 'spv') {
          setCurrentUser(prev => prev ? { ...prev, role: 'spv' } : null);
          setCurrentStep('admin');
        }
      }
    }, (err) => console.error("Global account sync error:", err));

    const qTeam = query(
      collection(db, "project_teams"),
      where("username", "==", cleanUser)
    );
    unsubTeam = onSnapshot(qTeam, (snap) => {
      if (!snap.empty) {
        const tData = snap.docs[0].data();
        if (tData.role === 'spv' && currentUser.role !== 'spv') {
          setCurrentUser(prev => prev ? { ...prev, role: 'spv' } : null);
          setCurrentStep('admin');
        }
      }
    }, (err) => console.error("Project team sync error:", err));

    return () => {
      unsubGlobal();
      unsubTeam();
    };
  }, [currentUser?.username, currentUser?.role]);

  // SINKRONISASI STATE KE LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STEP, currentStep.toString());
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));

    // Reset posisi scroll ke paling atas setiap ganti step/layar
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }

    if (selectedRack) {
      localStorage.setItem(STORAGE_KEYS.RACK, JSON.stringify(selectedRack));
    } else {
      localStorage.removeItem(STORAGE_KEYS.RACK);
    }
  }, [currentStep, sessionData, selectedRack, currentUser]);

  // FUNGSI TRIGGER LOGOUT MEMBUKA MODAL CUSTOM APLIKASI
  const handleRequestLogout = () => {
    setShowLogoutModal(true);
  };

  // EXECUTE LOGOUT BERSIH
  const confirmLogout = () => {
    setShowLogoutModal(false);
    localStorage.clear();
    setCurrentUser(null);
    setSessionData({
      sessionId: 'SO-2026-KOSAMBI',
      sessionCode: 'SO-WRG-2026-09',
      sessionName: 'Kosambi WH — SO Sesi Utama 2026',
      primaryCounter: 'bambang',
      partners: ['Budi Prasetyo'],
      mode: 'list-to-floor',
      role: 'counter',
    });
    setSelectedRack(null);
    setCurrentStep(1);
  };

  const isDemoMode = currentStep === 'admin_demo';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative">

      {/* CUSTOM IN-APP MODAL KONFIRMASI LOGOUT */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center space-x-3.5 border-b border-slate-100 pb-3.5">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-snug">Yakin Ingin Keluar?</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Konfirmasi Sesi Akses</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Pastikan kamu sudah menekan tombol <b className="text-slate-900">'Simpan'</b> pada rak yang sedang dihitung agar data ketikan kamu tidak hilang.
            </p>

            <div className="flex justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmLogout}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Ya, Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: LOGIN */}
      {currentStep === 1 && (
        <Step1Login
          onSuccessLogin={(username: string, role: UserRole, name?: string) => {
            const userObj = { username, role, name: name || username };
            setCurrentUser(userObj);

            setSessionData(prev => ({
              ...prev,
              primaryCounter: username,
              role: (role === 'owner' || role === 'spv' || username === 'owner') ? 'admin' : 'counter'
            }));

            if (role === 'owner' || role === 'spv' || username === 'owner') {
              setCurrentStep('admin');
            } else {
              setCurrentStep(2);
            }
          }}
        />
      )}

      {/* DASHBOARD ADMIN / SUPERVISOR / OWNER */}
      {currentStep === 'admin' && (
        <AdminDashboard
          onBackToApp={handleRequestLogout}
          onSwitchToCounterView={() => {
            setSessionData(prev => ({
              ...prev,
              primaryCounter: currentUser?.username || 'bambang'
            }));
            setCurrentStep('admin_demo');
          }}
          currentUserRole={currentUser?.role || 'owner'}
          currentUserEmail={currentUser?.username === 'owner' ? 'yos.krisnawan@anymindgroup.com' : ''}
        />
      )}

      {/* STEP 2: SETUP TIM PENDAMPING WAREHOUSE */}
      {currentStep === 2 && (
        <Step2TeamSetup
          sessionData={sessionData}
          onLogout={handleRequestLogout}
          onSaveTeam={(updatedData) => {
            setSessionData(updatedData);
            setCurrentStep(3);
          }}
        />
      )}

      {/* STEP 3: LIST COUNTSHEET RAK/BIN */}
      {(currentStep === 3 || currentStep === 'admin_demo') && (
        <div className="relative">
          {isDemoMode && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-black flex justify-between items-center shadow-md">
              <span>📱 DEMO MODE: Tampilan HP Counter ({sessionData.primaryCounter})</span>
              <button
                onClick={() => setCurrentStep('admin')}
                className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                🛡️ Kembali ke Admin
              </button>
            </div>
          )}
          <div className={isDemoMode ? "pt-8" : ""}>
            <Step3CountsheetList
              sessionData={sessionData}
              onLogout={handleRequestLogout}
              onEditTeam={() => setCurrentStep(2)}
              onSelectRack={(rack) => {
                setSelectedRack(rack);
                setCurrentStep(4);
              }}
            />
          </div>
        </div>
      )}

      {/* STEP 4: DETAIL PENGHITUNGAN RAK & BARANG */}
      {currentStep === 4 && selectedRack && (
        <div className="relative">
          {isDemoMode && (
            <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-black flex justify-between items-center shadow-md">
              <span>📱 DEMO MODE: Tampilan HP Counter ({sessionData.primaryCounter})</span>
              <button
                onClick={() => setCurrentStep('admin')}
                className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                🛡️ Kembali ke Admin
              </button>
            </div>
          )}
          <div className={isDemoMode ? "pt-8" : ""}>
            <Step4CountDetail
              sessionData={sessionData}
              rack={selectedRack}
              onLogout={handleRequestLogout}
              onBackToList={() => setCurrentStep(isDemoMode ? 'admin_demo' : 3)}
              onSelectNextRack={(nextRack) => {
                setSelectedRack(nextRack);
                setCurrentStep(4);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}