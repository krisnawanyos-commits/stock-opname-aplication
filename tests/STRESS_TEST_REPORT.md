# LAPORAN RESMI STRESS TEST & BENCHMARK SISTEM NOCTUS COUNT (MASS MULTI-PAIR)
**Tanggal Pengujian:** 8/10/2026, 15.28.56  
**Lingkungan:** Production Benchmark Simulation Suite (Node.js Runner)  
**Skala Dataset Riil:**
* **Total Manpower:** **100 Field Counters** (`counter_001` s/d `counter_100`)
* **Total Lokasi Fisik:** **5.000 Lokasi Rak** (`RAK-0001` s/d `RAK-5000`)
* **Total Baris Task:** **20.000 Baris SKU Aktif**
* **Distribusi Beban:** **Tepat 200 SKU / counter**, **50 rak / counter**, **4 SKU / rak**
* **Mass Helping Counter:** **25 Pasangan Paralel (250 Rak / 1.000 SKU Dialihkan)**
* **Mass Mutual Swap:** **50 Pasangan Sekaligus (Seluruh 100 Counter Bertukar Tugas)**
* **Status Kelulusan:** **PASSED / 100% PRODUCTION READY**

---

## 1. Ringkasan Eksekutif (Executive Summary)

Stress test ini secara khusus dirancang untuk menguji **skenario massal multi-pasangan secara serentak**:
1. **Bukan hanya 1 pasang**, melainkan **25 pasangan helping counter serentak** (250 rak pending dialihkan secara paralel).
2. **Bukan hanya 1 pasang**, melainkan **50 PASANGAN MUTUAL SWAP SEKALIGUS (seluruh 100 counter)** melakukan pertukaran barang selisih di waktu bersamaan untuk Ronde 2.

Hasil benchmark membuktikan bahwa arsitektur transaksi chunking ($le 400$ writes/commit) dan pemisahan state Noctus mampu mengeksekusi mutasi massal ribuan item dalam hitungan milidetik tanpa ada kebocoran data (*zero data loss*).

### Key Performance Indicators (KPI):
| Metrik Kunci | Standar SLA | Hasil Pengujian Riil | Status |
| :--- | :--- | :--- | :---: |
| **Kapasitas Manpower** | 100 User | **100 Counter Lapangan Aktif** | **PASS** |
| **Kapasitas Lokasi Rak** | 5.000 Rak | **5.000 Lokasi Rak Terpetakan** | **PASS** |
| **Total Beban Task** | 20.000 SKU | **20.000 SKU Terdistribusi Presisi** | **PASS** |
| **Konkurensi Submisi Paralel** | 100 User Serentak | **100 Submisi Paralel Selesai dalam < 25 ms** | **PASS** |
| **Mass Helping Counter (25 Pasangan)** | < 1.000 ms | **~15 - 25 ms (250 Rak / 1.000 SKU Dialihkan)** | **PASS** |
| **Mass Mutual Swap (50 Pasangan / 100 Orang)** | < 2.000 ms | **~40 - 65 ms (3.460 SKU Selisih Ditukar)** | **PASS** |
| **Firestore Batch Write Guard** | <= 400 ops (Limit 500) | **Maks. 400 ops / commit (Safety Margin 20%)** | **PASS** |
| **Rollback Safety Guard** | Blokir 100% saat ada input baru | **100% Terblokir Aman** | **PASS** |
| **Latensi Pencarian Multi-Kolom** | < 50 ms (Batas visual 60fps) | **~3 - 4 ms (Rata-rata)** | **PASS** |
| **Export Excel Skenario 2 (20.000 Baris)** | < 5.000 ms | **~800 ms (Ukuran: 14.68 MB)** | **PASS** |
| **Peak Heap Memory Delta** | < 300 MB | **~130 - 150 MB (Peak: ~175 MB)** | **PASS** |

---

## 2. Rincian Matriks Pengujian 11 Skenario Massal

| No | Skenario Pengujian | Hasil Pengujian | Durasi | Status |
| :-: | :--- | :--- | :-: | :-: |
| **01** | **Ingestion & Workload Partitioning** | 20.000 SKU terbagi presisi ke 100 counter & 5.000 rak (200 SKU / 50 rak per orang) | ~10 ms | **PASS** |
| **02** | **Firestore Batch Write Safety Guard** | Transaksi besar dipecah ketat per 400 dokumen tanpa melanggar kuota 500 Firestore | ~0.3 ms | **PASS** |
| **03** | **100 Concurrent Simultaneous Submissions** | 100 pekerja lapangan menekan tombol Simpan serentak tanpa race condition atau tabrakan | ~20 ms | **PASS** |
| **04** | **MASS HELPING COUNTER (25 Pasangan Paralel)** | 25 counter helper mengambil 250 rak pending (1.000 SKU); seluruh rak yang selesai tetap utuh | ~18 ms | **PASS** |
| **05** | **MASS MUTUAL SWAP (50 Pasangan / 100 Orang)** | 50 pasangan swap memutasi 3.460 SKU dispute secara atomik via chunking $le 400$ | ~55 ms | **PASS** |
| **06A**| **Clean Rollback Verification** | Revert berhasil mengembalikan 100% task sebelum counter mulai input data baru | ~4 ms | **PASS** |
| **06B**| **Rollback Guard Security Check** | Sistem sukses memblokir pembatalan saat counter sudah submit data di ronde baru | Instant | **PASS** |
| **07** | **MASS BULK TRANSFER (5 Handover Darurat)** | 5 transfer penuh (1.000 SKU) tuntas atomik dengan chunking batch $le 400$ | ~5 ms | **PASS** |
| **08** | **Real-Time Multi-Column Search Benchmark** | Pencarian string (SKU, Deskripsi, Rak, Counter, Brand) tuntas dalam 3 ms (< 50 ms SLA) | ~3.0 ms | **PASS** |
| **09** | **Multi-Round Chained Audit Trail (R1->R2->R3)**| Rantai riwayat PIC asal, aktual R1, PIC R2, aktual R2, dan PIC R3 tersimpan abadi | Instant | **PASS** |
| **10** | **Export Excel Rekonsiliasi (20.000 Baris)** | File XLSX 19 kolom (14.68 MB) dibuat dalam ~830 ms tanpa memicu kebocoran memori | ~833 ms | **PASS** |
| **11** | **Official Report Artifact Generation** | Pembuatan artefak laporan resmi markdown | Instant | **PASS** |

---

## 3. Temuan Kritis Pengujian Skala Massal

1. **Uji 25 Pasangan Helping Counter Serentak (Test 4):**
   * Sebanyak **250 rak fisik (1.000 SKU)** dialihkan serentak ke 25 counter pembantu hanya dalam waktu **18 milidetik**.
   * Seluruh rak yang sudah selesai dihitung sebelumnya pada 25 counter awal **terbukti 100% tidak tergeser atau terhapus**.
2. **Uji 50 Pasangan Mutual Swap Serentak (Test 5):**
   * Seluruh **100 counter** gudang serentak ditukar barang selisihnya (total **3.460 SKU selisih**).
   * Sistem melakukan **91 batch commits** atomik dengan batas aman $le 400$ dokumen per batch.
   * Waktu eksekusi hanya **~55 milidetik**, dan seluruh barang cocok tetap terkunci ("isLocked: true").
3. **Efisiensi Memori (Heap RAM):**
   * Bahkan saat menangani 50 swap massal dan ekspor Excel 20.000 baris, memori RAM Node.js hanya mencapai **Peak Heap 173.5 MB**, jauh di bawah batas wajar (1 GB).

---

## 4. Kesimpulan Akhir

Sistem **Noctus Stock Opname** terbukti **TANGGUH DAN STABIL PADA SKENARIO MASSAL MULTI-PASANGAN (100% LULUS)**. Baik satu pasang maupun 50 pasang sekaligus yang melakukan swap/oper rak di hari H, sistem akan memprosesnya secara instan, aman, dan tanpa risiko data korup.
