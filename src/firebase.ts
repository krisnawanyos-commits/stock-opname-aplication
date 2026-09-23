import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC51jZssAJh1rDU1tRDBIvr4ZTd0-FTJjE",
    authDomain: "stock-opname-360.firebaseapp.com",
    projectId: "stock-opname-360",
    storageBucket: "stock-opname-360.firebasestorage.app",
    messagingSenderId: "35293393856",
    appId: "1:35293393856:web:7492ead10a899b7433ce25"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);