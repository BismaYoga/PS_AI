# 📊 Katalog & Dokumentasi Lengkap Invezgo API (v1.2)

> **Penyedia**: Invezgo Teknologi Indonesia | **Base URL**: `https://api.invezgo.com`
> **Format Respons**: JSON (`application/json`) | **Auth**: `Authorization: Bearer <API_KEY>`

Dokumen ini merangkum seluruh kemampuan data dan endpoint yang dapat diperoleh dari **Invezgo API** untuk pengembangan platform analitik pasar modal Indonesia (IDX / BEI).

---

## 📌 Daftar Isi
1. [Ringkasan Eksekutif & Autentikasi](#1-ringkasan-eksekutif--autentikasi)
2. [Master Data & Profil Perusahaan](#2-master-data--profil-perusahaan)
3. [Data Harga, Realtime Trading & Charting Teknikal](#3-data-harga-realtime-trading--charting-teknikal)
4. [Bandarmology, Broker Summary & Aliran Dana (Flow)](#4-bandarmology-broker-summary--aliran-dana-flow)
5. [Struktur Kepemilikan Saham & Insider Trading](#5-struktur-kepemilikan-saham--insider-trading)
6. [Laporan Keuangan & Fundamental (Keystats)](#6-laporan-keuangan--fundamental-keystats)
7. [Aksi Korporasi, Berita Pasar & Keterbukaan Informasi](#7-aksi-korporasi-berita-pasar--keterbukaan-informasi)
8. [Stock Screener & Batch High-Performance Endpoints](#8-stock-screener--batch-high-performance-endpoints)
9. [Personal: Portofolio, Jurnal Trading, Alert & Komunitas](#9-personal-portofolio-jurnal-trading-alert--komunitas)
10. [Rekomendasi Integrasi ke PintarSaham AI](#10-rekomendasi-integrasi-ke-pintarsaham-ai)

---

## 1. Ringkasan Eksekutif & Autentikasi

Invezgo menyediakan **93 endpoint** yang mencakup data perdagangan saham BEI secara real-time, historis, fundamental mendalam, analisis broker/bandarmology, serta dokumen keterbukaan informasi.

### Header Wajib:
```http
Authorization: Bearer YOUR_INVEZGO_API_KEY
Accept: application/json
```

### Batasan & Kebijakan:
- **Histori Data**: Standar maksimal **2 tahun ke belakang** (akses >2 tahun membutuhkan paket Enterprise).
- **Monitoring Penggunaan**:
  - `GET /usage/api` : Cek sisa kuota, limit harian/bulanan, dan status langganan.
  - `GET /usage/logs` : Riwayat log pemanggilan API beserta status code.

---

## 2. Master Data & Profil Perusahaan

Kategori ini digunakan untuk membangun katalog emiten, indeks acuan, sekuritas, dan identitas perusahaan.

| Endpoint | Method | Deskripsi | Data yang Didapatkan |
|:---|:---:|:---|:---|
| `/analysis/list/stock` | `GET` | Daftar lengkap seluruh saham BEI | Kode saham (970+ ticker), nama perusahaan, status aktif, sektor, subsektor |
| `/analysis/list/broker` | `GET` | Daftar seluruh broker/sekuritas BEI | Kode broker 2 huruf (misal `YP`, `CC`, `PD`, `NI`), nama sekuritas |
| `/analysis/list/index` | `GET` | Daftar indeks saham BEI | Indeks headline (`COMPOSITE`/IHSG, `LQ45`, `IDX30`, `IDX80`), ESG, faktor, dan sektoral |
| `/analysis/notation` | `GET` | Daftar notasi khusus BEI | Kategori notasi khusus (`A`, `B`, `E`, `M`, `X`, dll) beserta penjelasan regulasi |
| `/analysis/information/{code}` | `GET` | Profil komprehensif emiten | Nama resmi PT, alamat kantor pusat, NPWP, tanggal IPO, harga & jumlah lembar IPO, papan pencatatan (Utama/Pengembangan/Akselerasi), kegiatan usaha, website, logo URL (CDN), daftar dewan direksi, dewan komisaris, anak perusahaan beserta persentase kepemilikan |

> **Contoh Aset Logo**: Invezgo menyediakan CDN logo berkualitas tinggi di `https://storage.invezgo.com/icon/{TICKER}.png`.

---

## 3. Data Harga, Realtime Trading & Charting Teknikal

Menyediakan data transaksi pasar secara granular mulai dari tick-by-tick hingga multi-timeframe candlestick.

| Endpoint | Method | Parameter Utama | Data yang Didapatkan |
|:---|:---:|:---|:---|
| `/analysis/chart/stock/{code}` | `GET` | `from`, `to` | Candlestick historis saham (Open, High, Low, Close, Volume, Date) |
| `/analysis/chart/index/{code}` | `GET` | `from`, `to` | Candlestick historis indeks (misal `COMPOSITE`, `LQ45`) |
| `/analysis/chart/multi-time/{code}` | `GET` | `from`, `to`, `timeframe` | Candlestick multi-timeframe (menit, jam, hari, minggu) |
| `/analysis/chart/stock/{indicator}/{code}` | `GET` | `indicator`, `params` | Nilai kalkulasi indikator teknikal langsung dari server (misal MA, RSI, MACD, BB) |
| `/analysis/intraday/{code}` | `GET` | `date` | Grafik pergerakan intraday tick/menit |
| `/analysis/intraday-data/{code}` | `GET` | `date`, `market` | Data tabular transaksi intraday saham |
| `/analysis/intraday-index/{code}` | `GET` | - | Data transaksi intraday untuk indeks gabungan |
| `/analysis/order-book/{code}` | `GET` | `market`, `date`, `time` | **Order Book Realtime Level 2**: Antrean Bid & Offer lengkap dengan harga dan volume lot |
| `/analysis/queue/{code}` | `GET` | - | **Order Queue Tracking**: Pelacakan antrean per lembar pada tiap level fraksi harga |
| `/analysis/running-trade/{code}` | `GET` | - | **Running Trade Realtime**: Aliran transaksi eksekusi (waktu, harga, volume, tipe buy/sell) |
| `/analysis/price-table/{code}` | `GET` | `date` | Rekapitulasi sebaran volume lot per level harga (Price vs Volume profile) |
| `/analysis/time-table/{code}` | `GET` | `date`, `range` | Rekapitulasi transaksi per interval waktu |
| `/analysis/momentum-chart/{code}` | `GET` | `date`, `range`, `scope` | Analisis momentum kecepatan harga saham |
| `/analysis/price-diary/{code}` | `GET` | - | Histori log performa harian harga saham dalam kalender visual |
| `/analysis/price-seasonality/{code}` | `GET` | `range` | Analisis musiman (Seasonality): Rata-rata probabilitas performa return bulanan (Januari s.d. Desember) |

---

## 4. Bandarmology, Broker Summary & Aliran Dana (Flow)

Fitur unggulan Invezgo untuk menganalisis pergerakan modal besar (Smart Money / Big Distribution & Maker / Bandar) dan investor asing.

| Endpoint | Method | Parameter Utama | Data yang Didapatkan |
|:---|:---:|:---|:---|
| `/analysis/top/change` | `GET` | `date` | Top Gainer & Top Loser (kenaikan/penurunan harga tertinggi harian) |
| `/analysis/top/foreign` | `GET` | `date` | Top Foreign Flow: Saham dengan net buy dan net sell investor asing tertinggi |
| `/analysis/top/accumulation` | `GET` | `date` | Top BDM Flow: Saham dalam status akumulasi masif oleh bandar/institusi |
| `/analysis/top/ritel` | `GET` | `date` | Top Ritel Flow: Saham yang didominasi oleh transaksi investor ritel |
| `/analysis/summary/stock/{code}` | `GET` | `from`, `to`, `investor`, `market` | **Broker Summary Saham**: Daftar sekuritas pembeli (Buyer) dan penjual (Seller), total volume, nominal transaksi (value), dan rata-rata harga beli/jual (avg price) |
| `/analysis/summary/broker/{code}` | `GET` | `from`, `to`, `investor`, `market` | **Broker Summary per Sekuritas**: Aktivitas suatu kode broker tertentu di seluruh saham BEI |
| `/analysis/summary-chart/stock/{code}` | `GET` | `from`, `to`, `scope` | Grafik tren akumulasi/distribusi broker summary saham dari waktu ke waktu |
| `/analysis/summary-chart/broker/{code}` | `GET` | `from`, `to`, `scope` | Grafik tren aktivitas transaksi sekuritas tertentu |
| `/analysis/stalker/broker/{broker}/{stock}` | `GET` | `from`, `to` | **Broker Stalker**: Pelacakan taktis gerak-gerik 1 broker tertentu pada 1 saham spesifik |
| `/analysis/stalker/list/{code}` | `GET` | `from`, `to` | Daftar broker paling dominan yang beroperasi pada emiten tersebut |
| `/analysis/inventory-chart/stock/{code}` | `GET` | `from`, `to`, `investor` | Estimasi grafik jumlah stok/inventori barang yang masih dipegang bandar |
| `/analysis/inventory-chart/broker/{code}` | `GET` | `from`, `to` | Estimasi inventori portofolio per broker |
| `/analysis/intraday-inventory-chart/{code}` | `GET` | `date`, `type` | Perubahan inventori barang broker secara intraday |
| `/analysis/sankey-chart/{code}` | `GET` | `date`, `type` | **Sankey Distribution Diagram**: Visualisasi alur perpindahan lot saham dari kelompok broker penjual ke broker pembeli |
| `/analysis/stalker/sector` | `GET` | `from`, `to`, `base` | Arus perputaran modal antar 11-12 sektor BEI |
| `/analysis/sector/rotation` | `GET` | `from`, `to`, `base`, `interval` | **Sector Rotation Chart (RRG)**: Kuadran Leading, Weakening, Lagging, Improving untuk rotasi sektor |

---

## 5. Struktur Kepemilikan Saham & Insider Trading

Menyajikan keterbukaan kepemilikan modal berdasarkan data resmi KSEI (Kustodian Sentral Efek Indonesia) dan laporan bursa.

| Endpoint | Method | Parameter Utama | Data yang Didapatkan |
|:---|:---:|:---|:---|
| `/analysis/shareholder-detail` | `GET` | `code`, `name` | Daftar lengkap pemegang saham dengan kepemilikan **di atas 5%** (KSEI) |
| `/analysis/shareholder-detail-one` | `GET` | `code`, `name` | Daftar pemegang saham dengan kepemilikan **di atas 1%** |
| `/analysis/shareholder/high` | `GET` | - | Skrining saham dengan konsentrasi kepemilikan sangat tinggi (free-float rendah) |
| `/analysis/shareholder/number/{code}` | `GET` | - | Tren historis penambahan/pengurangan total jumlah pemegang saham (DPS) per bulan |
| `/analysis/shareholder/{code}` | `GET` | - | Komposisi kepemilikan: Pengendali, Pemerintah, Manajemen/Insider, dan Publik |
| `/analysis/shareholder/ksei/{code}` | `GET` | `range` | Rekapitulasi data kepemilikan KSEI |
| `/analysis/shareholder/classification/{code}` | `GET` | `range` | Klasifikasi investor: Asing vs Domestik, Perbankan, Dana Pensiun, Asuransi, Reksa Dana, Yayasan, Perorangan, Perseroan Terbatas |
| `/analysis/shareholder/classify-table/{code}` | `GET` | - | Tabel perbandingan proporsi kepemilikan investor institusi vs ritel |
| `/analysis/shareholder/relation` | `GET` | `code`, `depth`, `min_percentage` | **Grafik Relasi Jaringan Kepemilikan (Network Graph)**: Peta konglomerasi dan afiliasi silang antar perusahaan |
| `/analysis/shareholder-above` & `.../shareholder-above-chart/{code}` | `GET` | `code`, `from`, `to` | Pelacakan transaksi jual/beli oleh pemegang saham >5% (KSEI Insider Flow) beserta chart tren kepemilikannya |
| `/analysis/shareholder-one` & `.../shareholder-one-chart/{code}` | `GET` | `code`, `from`, `to` | Pelacakan transaksi jual/beli pemegang saham >1% beserta chart tren |
| `/analysis/shareholder-insider` & `.../insider-chart/{code}` | `GET` | `code`, `from`, `to` | **Laporan Resmi Transaksi Insider BEI**: Pembelian/penjualan saham oleh Direksi, Komisaris, dan Pemegang Saham Pengendali |

---

## 6. Laporan Keuangan & Fundamental (Keystats)

Menyediakan data fundamental berstandar audit akuntansi hingga 8 periode historis.

### A. Key Statistics (Rasio Keuangan Utama)
- **Endpoint**: `GET /analysis/keystat/{code}?type=FY` (Tahunan) atau `?type=Q` (Kuartalan)
- **Visual Chart**: `GET /analysis/keystat-chart/{code}?type=FY&name=EPS`

**Metrik yang Tersedia**:
| Metrik | Penjelasan | Periode Tersedia |
|:---|:---|:---:|
| `EPS` | Earning Per Share (Laba Bersih per Lembar) | FY & Kuartal |
| `EPS (Annualised)` | EPS yang disetahunkan untuk kuartal berjalan | Kuartal |
| `BVPS` | Book Value Per Share (Nilai Buku Ekuitas per Lembar) | FY & Kuartal |
| `PER` | Price to Earnings Ratio (Rasio Harga terhadap Laba) | FY & Kuartal |
| `PBV` | Price to Book Value (Rasio Harga terhadap Nilai Buku) | FY & Kuartal |
| `ROE` | Return on Equity (Tingkat Pengembalian Ekuitas) | FY & Kuartal |
| `ROA` | Return on Assets (Tingkat Pengembalian Aset) | FY & Kuartal |
| `DER` | Debt to Equity Ratio (Rasio Hutang terhadap Ekuitas) | FY & Kuartal |
| `EBITDA` & `EV/EBITDA` | Laba Operasional Sebelum Bunga, Pajak, Depresiasi, & Amortisasi | FY & Kuartal |
| `Revenue` | Pendapatan Penjualan Total | FY & Kuartal |
| `Net Profit` | Laba Bersih Tahun/Kuartal Berjalan | FY & Kuartal |
| `Net Profit Growth YoY` | Pertumbuhan Laba Bersih dibanding periode tahun lalu | Kuartal |
| `Net Profit Growth QoQ` | Pertumbuhan Laba Bersih kuartal ke kuartal | Kuartal |
| `CFPS` & `CFO/Net Profit` | Cash Flow Per Share & Kualitas Laba terhadap Arus Kas Operasi | FY & Kuartal |
| `Kapitalisasi Pasar` | Nilai Total Kapitalisasi Pasar (Market Cap) | FY & Kuartal |
| `Saham` | Jumlah Lembar Saham Beredar (Shares Outstanding) | FY & Kuartal |

### B. Laporan Keuangan Lengkap (Financial Statements)
- **Endpoint**: `GET /analysis/financial-statement/{code}?statement={BS|IS|CF}&type={FY|Q|Q1..Q4}&limit=8`
- **Chart Akun**: `GET /analysis/financial-statement-chart/{code}?statement=IS&account=Pendapatan`

**Tiga Jenis Laporan**:
1. `statement=BS` (**Balance Sheet / Neraca**): Aset lancar, aset tidak lancar, liabilitas jangka pendek/panjang, ekuitas induk.
2. `statement=IS` (**Income Statement / Laba Rugi**): Pendapatan, beban pokok, laba kotor, beban operasional, laba usaha, beban pajak, laba bersih diatribusikan ke entitas induk.
3. `statement=CF` (**Cash Flow / Arus Kas**): Arus kas dari aktivitas operasi (CFO), investasi (CFI), dan pendanaan (CFF).

---

## 7. Aksi Korporasi, Berita Pasar & Keterbukaan Informasi

| Endpoint | Method | Parameter | Data yang Didapatkan |
|:---|:---:|:---|:---|
| `/analysis/calendar` | `GET` | `code`, `type`, `page`, `limit` | **Kalender Aksi Korporasi**: Jadwal Dividen tunai (Cum Date, Ex Date, Recording Date, Payment Date, DPS), RUPS (AGM/EGM beserta waktu & venue), Rights Issue, Stock Split, Reverse Split, Waran |
| `/analysis/news` | `GET` | `code`, `page`, `limit` | **Berita Pasar Modal**: Agregasi headline berita, waktu terbit, isi ringkasan berita seputar emiten dan makroekonomi |
| `/analysis/disclosure` | `GET` | `code`, `page`, `limit` | **Keterbukaan Informasi Resmi BEI**: Pengumuman resmi emiten di IDX lengkap dengan **link download file PDF asli** |

---

## 8. Stock Screener & Batch High-Performance Endpoints

### A. Advanced Stock Screener
- `POST /screener/screen`: Menjalankan query screening dengan parameter kustom (kombinasi rasio fundamental, teknikal, dan pergerakan harga).
- `GET /screener`, `POST /screener`, `PUT /screener/{id}`, `DELETE /screener/{id}`: Manajemen penyimpanan preset filter screener pengguna.

### B. Batch Endpoints (Optimasi Kecepatan)
Dirancang untuk sistem backend atau antarmuka yang membutuhkan data multipel instrumen sekaligus dengan latensi rendah:
- `GET /batch/order-book/{code}`: Batch snapshot order book.
- `GET /batch/intraday-data/{code}`: Batch data transaksi intraday saham.
- `GET /batch/intraday-index/{code}`: Batch transaksi intraday indeks.

### C. Search Engine
- `GET /search?query=...`: Pencarian cepat global (saham atau pengguna).
- `GET /search/stock?query=...`: Auto-complete pencarian kode atau nama saham.

---

## 9. Personal: Portofolio, Jurnal Trading, Alert & Komunitas

Invezgo menyediakan ekosistem terintegrasi untuk tools manajemen trading:

| Modul | Endpoint Utama | Deskripsi Fitur |
|:---|:---|:---|
| **Watchlist** | `GET/POST/PUT/DELETE /watchlists` & `/watchlists/group` | Membuat daftar pantau saham dengan pengelompokan grup kustom dan catatan pribadi |
| **Live Alerts** | `POST/GET/PUT/DELETE /alerts` & `POST /alerts/test` | Konfigurasi sistem alert harga, volume, atau indikator teknikal |
| **Trading Journal** | `GET/POST/DELETE /journals` & `GET /journals/summary` | Pencatatan jurnal trading (alasan beli/jual, target, cutloss, status eksekusi) |
| **Portofolio** | `GET /portfolios` & `GET /portfolios/summary` | Pelacakan aset, bobot saham dalam portofolio, dan evaluasi performa investasi |
| **Realisasi Trade** | `GET/DELETE /trades`, `/trades/summary`, `/trades/summary-chart` | Rekapitulasi keuntungan/kerugian (Realized PnL) beserta chart analisis performa |
| **Komunitas & Feeds** | `GET /posts`, `/posts/space/{code}`, `/posts/comment/{id}` | Forum diskusi publik per emiten saham (mirip Stream Stockbit) |

---

## 10. Rekomendasi Integrasi ke PintarSaham AI

Berdasarkan kapabilitas Invezgo API di atas, berikut adalah potensi peningkatan fitur pada PintarSaham AI:

1. **Otomatisasi Valuasi Fundamental & MOS (Margin of Safety)**:
   - Menggunakan `/analysis/keystat/{code}?type=FY` untuk mendapatkan EPS riil, BVPS, PER, PBV, ROE tanpa perlu scraping manual.
   - Menampilkan pertumbuhan laba kuartalan melalui `/analysis/keystat/{code}?type=Q` (`Net Profit Growth YoY & QoQ`).

2. **Integrasi Tab Bandarmology & Foreign Flow**:
   - Menambahkan visualisasi **Broker Summary** (`/analysis/summary/stock/{code}`) pada drawer saham untuk melihat siapa yang sedang akumulasi vs distribusi.
   - Menampilkan banner **Top Foreign Inflow** harian (`/analysis/top/foreign`).

3. **Katalog Lengkap Seluruh Emiten BEI (970+ Saham)**:
   - Memperluas database PintarSaham dari 69 emiten menjadi seluruh emiten terdaftar via `/analysis/list/stock`.
   - Memanfaatkan CDN logo resmi di `https://storage.invezgo.com/icon/{TICKER}.png`.

4. **Keterbukaan Informasi & Kalender Aksi Korporasi Live**:
   - Menggantikan kalender statis dengan live feeds dari `/analysis/calendar` (dividen tunai, RUPS, rights issue).
   - Menyediakan tab "Pengumuman BEI" dengan link PDF langsung dari `/analysis/disclosure`.

5. **Peta Konglomerasi & Relasi Kepemilikan (Network Graph)**:
   - Mengintegrasikan `/analysis/shareholder/relation` ke visualisasi interaktif untuk melihat konglomerasi grup bisnis (misal Grup Astra, Grup Salim, Grup Barito, Grup Djarum).

---
*Dokumentasi disusun secara otomatis berdasarkan OpenAPI Spec v1.2 Invezgo API.*
