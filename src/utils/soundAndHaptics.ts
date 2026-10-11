// Sound & Haptic Feedback Utility for Warehouse Stock Opname Operations

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * High-pitched pleasant retail BEEP for successful barcode scan or count save
 */
export const playScanSuccessBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime); // A6 note
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.debug('Audio playback not supported or user has not interacted yet', e);
  }
};

/**
 * Double low-pitch buzzer for scan error, duplicate, or locked session
 */
export const playErrorBuzzer = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime); // Low buzz
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.debug('Audio error playback suppressed', e);
  }
};

/**
 * Haptic feedback vibration on mobile devices
 */
export const triggerHapticFeedback = (type: 'success' | 'warning' | 'error' = 'success') => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'success') {
        navigator.vibrate(60); // Quick sharp tap
      } else if (type === 'warning') {
        navigator.vibrate([40, 60, 40]);
      } else {
        navigator.vibrate([100, 50, 100]); // Strong double alert
      }
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
};
