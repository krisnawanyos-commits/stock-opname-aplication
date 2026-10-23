// SYNC TRACKER: memantau write Firestore yang belum dikonfirmasi server.
//
// Firestore (persistentLocalCache) langsung menyimpan write ke IndexedDB HP saat
// batch.commit() dipanggil, lalu mengirimnya ke server begitu ada sinyal.
// Promise commit() baru resolve setelah server konfirmasi — jadi saat offline,
// `await batch.commit()` akan menggantung. Tracker ini memungkinkan UI
// TIDAK menunggu server, sambil tetap tahu berapa data yang masih antre.

import type { WriteBatch } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export interface SyncState {
  pending: number;
  failed: number;
  lastError: string | null;
}

const FAILED_KEY = 'so_failed_sync_count';

let state: SyncState = {
  pending: 0,
  failed: (() => {
    try { return parseInt(localStorage.getItem(FAILED_KEY) || '0', 10) || 0; } catch { return 0; }
  })(),
  lastError: null,
};

const listeners = new Set<(s: SyncState) => void>();

const emit = () => {
  try { localStorage.setItem(FAILED_KEY, String(state.failed)); } catch { /* ignore */ }
  listeners.forEach((l) => l(state));
};

export const getSyncState = () => state;

export const subscribeSync = (fn: (s: SyncState) => void) => {
  listeners.add(fn);
  fn(state);
  return () => { listeners.delete(fn); };
};

export const clearSyncFailures = () => {
  state = { ...state, failed: 0, lastError: null };
  emit();
};

export interface TrackedCommitOptions {
  /** Dipanggil saat server sudah konfirmasi (data PASTI ada di cloud). */
  onSynced?: () => void;
  /** Dipanggil jika server menolak (mis. permission-denied). */
  onFailed?: (err: any) => void;
}

/**
 * Commit batch TANPA menunggu server.
 * Mengembalikan promise asli commit (opsional di-await bila perlu konfirmasi server).
 */
export const trackedCommit = (batch: WriteBatch, opts: TrackedCommitOptions = {}): Promise<void> => {
  state = { ...state, pending: state.pending + 1 };
  emit();

  const p = batch.commit();
  p.then(() => {
    state = { ...state, pending: Math.max(0, state.pending - 1) };
    emit();
    opts.onSynced?.();
  }).catch((err) => {
    console.error('Sync ke Cloud gagal:', err);
    state = {
      pending: Math.max(0, state.pending - 1),
      failed: state.failed + 1,
      lastError: err?.code || err?.message || 'unknown',
    };
    emit();
    opts.onFailed?.(err);
  });
  return p;
};

export const useSyncState = () => {
  const [s, setS] = useState<SyncState>(state);
  useEffect(() => subscribeSync(setS), []);
  return s;
};

// Peringatan jika menutup tab saat masih ada data antre.
// (Data tetap aman di HP & akan terkirim saat aplikasi dibuka lagi dengan sinyal.)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (state.pending > 0) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}
