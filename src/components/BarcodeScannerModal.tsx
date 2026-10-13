import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Zap, ZapOff, Keyboard, AlertCircle } from 'lucide-react';
import { playScanSuccessBeep, playErrorBuzzer, triggerHapticFeedback } from '../utils/soundAndHaptics';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
  title?: string;
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onDetected,
  title = 'Scan Barcode Produk'
}: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-barcode-reader';
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [manualInputMode, setManualInputMode] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState<string>('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setManualInputMode(false);
      setManualBarcode('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (manualInputMode) {
      stopScanner();
      return;
    }

    let isMounted = true;
    setIsInitializing(true);
    setErrorMessage(null);

    const startScanner = async () => {
      try {
        // Small delay so modal DOM element is rendered
        await new Promise((r) => setTimeout(r, 200));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF
          ],
          verbose: false
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const edge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(edge * 0.85),
              height: Math.floor(edge * 0.55) // Wide barcode aspect ratio
            };
          },
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!isMounted) return;
            const cleaned = decodedText.trim();
            if (cleaned) {
              playScanSuccessBeep();
              triggerHapticFeedback('success');
              // Stop camera immediately
              stopScanner().finally(() => {
                onDetected(cleaned);
                onClose();
              });
            }
          },
          () => {
            // Ignore frame scan misses (happens continuously until barcode is found)
          }
        );

        if (isMounted) {
          setIsInitializing(false);
          // Check torch capability
          try {
            const videoTracks = (html5QrCode as any).localMediaStream?.getVideoTracks();
            if (videoTracks && videoTracks.length > 0) {
              const capabilities = videoTracks[0].getCapabilities?.() || {};
              if (capabilities.torch) {
                setHasTorch(true);
              }
            }
          } catch {
            // Torch check not supported
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsInitializing(false);
        playErrorBuzzer();
        triggerHapticFeedback('error');
        console.error('Camera init error:', err);
        setErrorMessage(
          err?.message?.includes('NotAllowedError') || err?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Mohon aktifkan izin kamera di pengaturan browser HP kamu.'
            : 'Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.'
        );
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, manualInputMode]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.debug('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !torchEnabled;
      await (scannerRef.current as any).applyVideoConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchEnabled(nextState);
    } catch (e) {
      console.warn('Failed to toggle torch', e);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualBarcode.trim();
    if (!clean) return;
    playScanSuccessBeep();
    triggerHapticFeedback('success');
    stopScanner().finally(() => {
      onDetected(clean);
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-3 sm:p-4 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900 text-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-100 truncate">{title}</h3>
              <p className="text-[11px] text-slate-400 truncate">
                {manualInputMode ? 'Ketik nomor barcode produk' : 'Arahkan kamera ke barcode kemasan'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopScanner().finally(onClose);
            }}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Tutup scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable if content overflows viewport) */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-950 flex flex-col">
          {!manualInputMode ? (
            <div className="relative w-full flex-1 min-h-70 sm:min-h-85 bg-black flex flex-col items-center justify-center overflow-hidden">
              <div id={containerId} className="w-full h-full min-h-70" />

              {/* Viewfinder Overlay Targeting Guide */}
              {!isInitializing && !errorMessage && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-[82%] h-[48%] border-2 border-cyan-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                    {/* Laser animated scan bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                    <span className="absolute -top-3 left-4 bg-slate-900/90 text-cyan-400 text-[9px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/40 uppercase tracking-widest">
                      Area Barcode
                    </span>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isInitializing && (
                <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center gap-3 text-slate-300">
                  <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold">Menyiapkan kamera HP...</p>
                </div>
              )}

              {/* Error State */}
              {errorMessage && (
                <div className="absolute inset-0 bg-slate-900 p-6 flex flex-col items-center justify-center text-center gap-3">
                  <AlertCircle className="w-10 h-10 text-rose-500 shrink-0" />
                  <p className="text-xs text-rose-300 font-medium leading-relaxed max-w-xs">
                    {errorMessage}
                  </p>
                  <button
                    type="button"
                    onClick={() => setManualInputMode(true)}
                    className="mt-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-bold border border-cyan-500/30 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Keyboard className="w-4 h-4" />
                    Ketik Barcode Manual Saja
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex-1 p-5 sm:p-6 flex flex-col justify-center items-center bg-slate-950">
              <form onSubmit={handleManualSubmit} className="w-full space-y-4 max-w-sm mx-auto">
                <div className="text-center space-y-1">
                  <h4 className="text-sm font-bold text-slate-100">Ketik Angka Barcode Manual</h4>
                  <p className="text-[11px] text-slate-400">Gunakan bila kemasan rusak atau barcode pudar</p>
                </div>
                <input
                  type="text"
                  autoFocus
                  inputMode="numeric"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Contoh: 8992775211018"
                  className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-4 text-center text-base font-mono font-bold text-cyan-400 outline-none focus:ring-2 focus:ring-cyan-400 shadow-inner"
                />
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setManualInputMode(false)}
                    className="flex-1 min-h-11 py-2.5 px-3 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    Kembali ke Kamera
                  </button>
                  <button
                    type="submit"
                    disabled={!manualBarcode.trim()}
                    className="flex-1 min-h-11 py-2.5 px-3 bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold rounded-xl hover:bg-cyan-300 cursor-pointer transition-colors shadow-md"
                  >
                    Gunakan Barcode
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Controls / Footer */}
        <div className="shrink-0 px-5 py-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs z-10">
          <div className="flex items-center gap-2">
            {hasTorch && !manualInputMode && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
                  torchEnabled
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
                title="Lampu senter kamera"
              >
                {torchEnabled ? <Zap className="w-4 h-4 text-amber-400 shrink-0" /> : <ZapOff className="w-4 h-4 shrink-0" />}
                <span className="text-[10px]">Flash</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setManualInputMode((prev) => !prev)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center gap-1.5 font-semibold text-[11px] cursor-pointer transition-colors"
            >
              {manualInputMode ? <Camera className="w-4 h-4 text-cyan-400 shrink-0" /> : <Keyboard className="w-4 h-4 text-cyan-400 shrink-0" />}
              <span>{manualInputMode ? 'Buka Kamera' : 'Ketik Manual'}</span>
            </button>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">Format: EAN / UPC / QR</span>
        </div>
      </div>
    </div>
  );
}
