import { useState, useEffect } from 'react';
import Step1Login from './components/Step1Login';
import Step2TeamSetup from './components/Step2TeamSetup';
import Step3CountsheetList from './components/Step3CountsheetList';
import Step4CountDetail from './components/Step4CountDetail';
import AdminDashboard from './components/AdminDashboard';
import type { SessionData, RackItem, UserRole } from './types';

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
      }
    }
    return null;
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 'admin' | 'admin_demo'>(() => {
    const savedStep = localStorage.getItem(STORAGE_KEYS.STEP);
    if (savedStep === 'admin' || savedStep === 'admin_demo') return savedStep;
    return savedStep ? (parseInt(savedStep, 10) as 1 | 2 | 3 | 4) : 1;
  });

  const [sessionData, setSessionData] = useState<SessionData>(() => {
    const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (savedSession) {
      try {
        return JSON.parse(savedSession);
      } catch (e) {
        console.error('Failed to parse saved session data', e);
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
      }
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STEP, currentStep.toString());
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
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

  const handleLogout = () => {
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
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
              // Navigasi ke Step 2 untuk pengisian Keterangan Tim Pendamping
              setCurrentStep(2);
            }
          }}
        />
      )}

      {currentStep === 'admin' && (
        <AdminDashboard
          onBackToApp={handleLogout}
          onSwitchToCounterView={() => {
            setSessionData(prev => ({
              ...prev,
              primaryCounter: 'bambang'
            }));
            setCurrentStep('admin_demo');
          }}
          currentUserRole={currentUser?.role || 'owner'}
          currentUserEmail={currentUser?.username === 'owner' ? 'yos.krisnawan@anymindgroup.com' : ''}
        />
      )}

      {currentStep === 2 && (
        <Step2TeamSetup
          sessionData={sessionData}
          onLogout={handleLogout}
          onSaveTeam={(updatedData) => {
            setSessionData(updatedData);
            setCurrentStep(3);
          }}
        />
      )}

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
              onLogout={handleLogout}
              onEditTeam={() => setCurrentStep(2)}
              onSelectRack={(rack) => {
                setSelectedRack(rack);
                setCurrentStep(4);
              }}
            />
          </div>
        </div>
      )}

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
              onLogout={handleLogout}
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