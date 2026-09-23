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
  // State User Login
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

  // Step bisa angka 1 | 2 | 3 | 4 atau string 'admin'
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 'admin'>(() => {
    const savedStep = localStorage.getItem(STORAGE_KEYS.STEP);
    if (savedStep === 'admin') return 'admin';
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
      sessionName: 'Kosambi WH — SO Sesi Utama 2026',
      primaryCounter: 'putri.so',
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

  // Save to localStorage & trigger Cloud Storage Sync
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

    // Simulasi Async Cloud Sync
    const syncToCloud = async () => {
      try {
        const payload = {
          timestamp: new Date().toISOString(),
          step: currentStep,
          session: sessionData,
          rack: selectedRack,
          user: currentUser,
        };
        console.log('[Cloud Storage Sync]: Data persisted successfully.', payload);
      } catch (err) {
        console.error('[Cloud Storage Sync Error]:', err);
      }
    };
    syncToCloud();
  }, [currentStep, sessionData, selectedRack, currentUser]);

  // Handler Logout Aman
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.STEP);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.RACK);
    localStorage.removeItem(STORAGE_KEYS.USER);

    setCurrentUser(null);
    setSessionData({
      sessionId: 'SO-2026-KOSAMBI',
      sessionName: 'Kosambi WH — SO Sesi Utama 2026',
      primaryCounter: 'putri.so',
      partners: ['Budi Prasetyo'],
      mode: 'list-to-floor',
      role: 'counter',
    });
    setSelectedRack(null);
    setCurrentStep(1);
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Step 1: Login dengan pembacaan Operator vs Admin */}
      {currentStep === 1 && (
        <Step1Login
          onSuccessLogin={(username, role, name) => {
            setCurrentUser({ username, role, name });
            setSessionData(prev => ({
              ...prev,
              primaryCounter: username,
              role: role === 'owner' || role === 'spv' ? 'admin' : 'counter'
            }));

            if (role === 'owner' || role === 'spv') {
              setCurrentStep('admin');
            } else {
              setCurrentStep(2);
            }
          }}
        />
      )}

      {/* Mode Admin Dashboard Desktop */}
      {currentStep === 'admin' && (
        <AdminDashboard
          onBackToApp={handleLogout}
          currentUserRole={currentUser?.role || 'owner'}
        />
      )}

      {/* Step 2: Team Setup */}
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

      {/* Step 3: Countsheet List */}
      {currentStep === 3 && (
        <Step3CountsheetList
          sessionData={sessionData}
          onLogout={handleLogout}
          onSelectRack={(rack) => {
            setSelectedRack(rack);
            setCurrentStep(4);
          }}
        />
      )}

      {/* Step 4: Count Detail */}
      {currentStep === 4 && selectedRack && (
        <Step4CountDetail
          sessionData={sessionData}
          rack={selectedRack}
          onLogout={handleLogout}
          onBackToList={() => setCurrentStep(3)}
        />
      )}
    </div>
  );
}