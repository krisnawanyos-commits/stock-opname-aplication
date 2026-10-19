import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch, query, where, orderBy, limit } from "firebase/firestore";
import * as fs from 'fs';
import xlsxModule from 'xlsx';
const XLSX = xlsxModule.default || xlsxModule;

const firebaseConfig = {
    apiKey: "AIzaSyC51jZssAJh1rDU1tRDBIvr4ZTd0-FTJjE",
    authDomain: "stock-opname-360.firebaseapp.com",
    projectId: "stock-opname-360",
    storageBucket: "stock-opname-360.firebasestorage.app",
    messagingSenderId: "35293393856",
    appId: "1:35293393856:web:7492ead10a899b7433ce25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const isApply = process.argv.includes('--apply');
const targetProjId = process.argv.find(a => a.startsWith('--project='))?.split('=')[1] || 'PROJ-4080';

console.log("==================================================================");
console.log(`🔧 NOCTUS DATA RECOVERY & RECONCILIATION ENGINE`);
console.log(`Mode: ${isApply ? '🚀 APPLY (Menulis ke Cloud Firestore)' : '🔍 DRY-RUN (Hanya Simulasi / Preview)'}`);
console.log(`Target Project ID: ${targetProjId}`);
console.log("==================================================================\n");

async function runRecovery() {
    console.log("1. Mengambil master_tasks dari Cloud Firestore...");
    const taskSnap = await getDocs(collection(db, "master_tasks"));
    const allTasks = taskSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(t => !targetProjId || t.projectId === targetProjId || !t.projectId);

    console.log(`   Ditemukan ${allTasks.length} task untuk project ini.`);

    console.log("2. Mengambil audit_logs untuk cross-check...");
    const auditMap = {};
    const localAuditPath = 'C:/Users/ddi20/Downloads/Audit_Trail_Snapshot_SO-WARINGIN-17OKT2026_1792264654594.xlsx';
    if (fs.existsSync(localAuditPath)) {
        try {
            console.log("   Memuat audit_logs dari snapshot lokal lengkap (14.059 log)...");
            const wb = XLSX.readFile(localAuditPath);
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const logs = XLSX.utils.sheet_to_json(sheet);
            logs.forEach(l => {
                const k = (l['LOKASI RAK'] || l['rackLocation'] || '').trim() + '___' + (l['SKU'] || l['sku'] || '').trim();
                if (!auditMap[k]) auditMap[k] = [];
                auditMap[k].push({
                    totalFinalSubmitted: Number(l['TOTAL FINAL SUBMITTED'] ?? l['qtyActual'] ?? 0),
                    qtyGood: Number(l['QTY GOOD'] ?? 0),
                    qtyBad: Number(l['QTY BAD'] ?? 0),
                    round: l['RONDE'] || l['round']
                });
            });
            console.log(`   Berhasil memuat ${logs.length} log audit dari file lokal.`);
        } catch (e) {
            console.warn("   Gagal membaca audit log lokal:", e.message);
        }
    } else {
        try {
            const auditSnap = await getDocs(query(collection(db, "audit_logs"), limit(1000)));
            auditSnap.docs.forEach(d => {
                const data = d.data();
                const k = (data.rackLocation || data.Location || '').trim() + '___' + (data.sku || data.SKU || '').trim();
                if (!auditMap[k]) auditMap[k] = [];
                auditMap[k].push(data);
            });
            console.log(`   Berhasil memuat ${auditSnap.size} log audit.`);
        } catch (err) {
            console.warn("   ⚠️ Gagal memuat audit_logs dari cloud:", err.message);
        }
    }

    // A. Rebalance Multi-Doc Batch Tasks
    const grouped = {};
    allTasks.forEach(t => {
        const k = (t.Location || '').trim() + '___' + (t.SKU || '').trim();
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(t);
    });

    const updatesToCommit = [];
    let rebalancedTasksCount = 0;
    let auditRestoredCount = 0;
    let temuanMergedCount = 0;

    Object.entries(grouped).forEach(([key, list]) => {
        // Cek temuan duplikat
        const masterDocs = list.filter(t => !t.id.includes('_TEMUAN_'));
        const temuanDocs = list.filter(t => t.id.includes('_TEMUAN_'));

        if (masterDocs.length > 0 && temuanDocs.length > 0) {
            // Ada master dan ada temuan duplikat
            temuanDocs.forEach(td => {
                const temuanAct = td.QTY_ACTUAL ?? td.countedQty ?? 0;
                if (temuanAct > 0) {
                    const targetMaster = masterDocs.find(md => (md.QTY_ACTUAL === 0 || md.QTY_ACTUAL === null || !md.isCounted)) || masterDocs[0];
                    if (targetMaster) {
                        targetMaster.QTY_ACTUAL = (targetMaster.QTY_ACTUAL || 0) + temuanAct;
                        targetMaster.countedQty = targetMaster.QTY_ACTUAL;
                        targetMaster.isCounted = true;
                        updatesToCommit.push({
                            id: targetMaster.id,
                            data: {
                                QTY_ACTUAL: targetMaster.QTY_ACTUAL,
                                countedQty: targetMaster.QTY_ACTUAL,
                                isCounted: true,
                                updatedAt: new Date().toISOString()
                            }
                        });
                        temuanMergedCount++;
                    }
                }
            });
        }

        // Rebalance multi-doc
        if (masterDocs.length > 1) {
            const totalSys = masterDocs.reduce((acc, t) => acc + (Number(t.Qty || t.QTY_SYSTEM) || 0), 0);
            const totalAct = masterDocs.reduce((acc, t) => acc + (Number(t.QTY_ACTUAL ?? t.countedQty) || 0), 0);
            const anyCounted = masterDocs.some(t => t.isCounted || t.QTY_ACTUAL !== null);

            const hasZeroProblem = masterDocs.some(t => (t.QTY_ACTUAL === 0 || t.QTY_ACTUAL === null) && (Number(t.Qty || t.QTY_SYSTEM) || 0) > 0);

            if (anyCounted && totalAct > 0 && hasZeroProblem) {
                let rem = totalAct;
                masterDocs.forEach((t, i) => {
                    const sys = Number(t.Qty || t.QTY_SYSTEM) || 0;
                    let alloc = 0;
                    if (totalAct === totalSys) {
                        alloc = sys;
                    } else if (i === masterDocs.length - 1) {
                        alloc = Math.round(rem * 1000) / 1000;
                    } else {
                        alloc = Math.min(sys, rem);
                        rem -= alloc;
                    }

                    t.QTY_ACTUAL = alloc;
                    t.countedQty = alloc;
                    t.isCounted = true;

                    updatesToCommit.push({
                        id: t.id,
                        data: {
                            QTY_ACTUAL: alloc,
                            countedQty: alloc,
                            isCounted: true,
                            updatedAt: new Date().toISOString()
                        }
                    });
                    rebalancedTasksCount++;
                });
            }
        } else if (masterDocs.length === 1) {
            const t = masterDocs[0];
            const sys = Number(t.Qty || t.QTY_SYSTEM) || 0;
            const act = t.QTY_ACTUAL ?? t.countedQty;

            if ((act === 0 || act === null) && sys > 0 && t.isCounted) {
                const logs = auditMap[key];
                if (logs && logs.length > 0) {
                    const positive = logs.filter(l => Number(l.totalFinalSubmitted ?? l.qtyActual) > 0);
                    if (positive.length > 0) {
                        const latest = positive[0];
                        const restoredVal = Number(latest.totalFinalSubmitted ?? latest.qtyActual);
                        updatesToCommit.push({
                            id: t.id,
                            data: {
                                QTY_ACTUAL: restoredVal,
                                countedQty: restoredVal,
                                isCounted: true,
                                restoredFromAudit: true,
                                updatedAt: new Date().toISOString()
                            }
                        });
                        auditRestoredCount++;
                    }
                }
            }
        }
    });

    console.log("\n📊 HASIL ANALISIS RECOVERY:");
    console.log(`- Task Multi-Doc yang diseimbangkan (Rebalanced): ${rebalancedTasksCount}`);
    console.log(`- Task yang dipulihkan dari Audit Trail asli: ${auditRestoredCount}`);
    console.log(`- Temuan duplikat yang di-merge ke Master Task: ${temuanMergedCount}`);
    console.log(`- Total dokumen yang akan di-update ke Cloud: ${updatesToCommit.length}\n`);

    if (!isApply) {
        console.log("ℹ️ Ini adalah DRY-RUN. Tidak ada data yang diubah di Firestore.");
        console.log("👉 Untuk mengeksekusi pembaruan ke Cloud Firestore, jalankan:");
        console.log(`   node tests/recover_firestore_data.mjs --apply --project=${targetProjId}\n`);
        process.exit(0);
    }

    console.log(`🚀 Menulis ${updatesToCommit.length} pembaruan ke Cloud Firestore (Batch size: 400)...`);
    const CHUNK = 400;
    for (let i = 0; i < updatesToCommit.length; i += CHUNK) {
        const slice = updatesToCommit.slice(i, i + CHUNK);
        const batch = writeBatch(db);
        slice.forEach(u => {
            const r = doc(db, "master_tasks", u.id);
            batch.set(r, u.data, { merge: true });
        });
        await batch.commit();
        console.log(`   Progress: ${Math.min(i + CHUNK, updatesToCommit.length)} / ${updatesToCommit.length} dokumen tersimpan.`);
    }

    console.log("\n✅ PEMULIHAN SELESAI & SUKSES! Seluruh data di Cloud Firestore telah diperbarui.");
    process.exit(0);
}

runRecovery().catch(err => {
    console.error("❌ Recovery Error:", err);
    process.exit(1);
});
