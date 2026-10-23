import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyC51jZssAJh1rDU1tRDBIvr4ZTd0-FTJjE",
    authDomain: "stock-opname-360.firebaseapp.com",
    projectId: "stock-opname-360",
    storageBucket: "stock-opname-360.firebasestorage.app",
    messagingSenderId: "35293393856",
    appId: "1:35293393856:web:7492ead10a899b7433ce25"
};

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

// ANONYMOUS AUTH: setiap device otomatis dapat token Firebase,
// sehingga Security Rules bisa memakai `request.auth != null`.
// Sesi auth tersimpan di IndexedDB, jadi tetap berlaku saat offline.
export const auth = getAuth(app);

export const authReady: Promise<void> = new Promise((resolve) => {
    let settled = false;
    const finish = () => {
        if (!settled) {
            settled = true;
            resolve();
        }
    };

    // Jangan blokir aplikasi selamanya jika offline / jaringan lambat
    setTimeout(finish, 8000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            unsubscribe();
            finish();
            return;
        }
        signInAnonymously(auth).catch((err) => {
            console.error("Anonymous Auth gagal:", err);
            unsubscribe();
            finish();
        });
    });
});

// RETRY: jika device pertama kali dibuka saat offline / kena limit,
// coba login anonim lagi otomatis begitu internet kembali.
const retryAnonymousAuth = () => {
    if (!auth.currentUser) {
        signInAnonymously(auth).catch((err) => console.error("Retry Anonymous Auth gagal:", err));
    }
};
if (typeof window !== "undefined") {
    window.addEventListener("online", retryAnonymousAuth);
    setInterval(retryAnonymousAuth, 60000);
}