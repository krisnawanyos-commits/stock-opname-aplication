import { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function NetworkStatusBadge({ className = '' }: { className?: string }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-colors ${
        isOnline
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
      } ${className}`}
      title={isOnline ? 'Terkoneksi ke server (Online)' : 'Mode offline aktif - data tersimpan aman di cache HP'}
    >
      {isOnline ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <Wifi className="w-3 h-3 text-emerald-600" />
          <span className="hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 text-amber-700" />
          <span>Offline (Lokal)</span>
        </>
      )}
    </div>
  );
}
