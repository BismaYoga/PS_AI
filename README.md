# PS_AI

**PintarSaham AI** — Dashboard Interaktif Analisis Saham IDX & Indeks Harga Saham Gabungan (IHSG) berbasis data pasar riil Yahoo Finance (`yfinance`).

## 🚀 Fitur Utama
- **IHSG Real-Time & Multi-Instrument Charting**:
  - Live data IHSG (`^JKSE`) dan 69 emiten IDX pilihan.
  - Visualisasi Candlestick & Line Chart dengan indikator teknikal (MA20, MA50, RSI 14, Fibonacci Retracement, Support & Resistance).
- **Valuasi Fundamental & Margin of Safety (MOS)**:
  - Perhitungan Harga Wajar (*Fair Value*) berbasis formula EPS riil dan Target PER sektoral.
  - Margin of Safety (MOS) dengan klasifikasi otomatis (Sangat Menarik, Menarik, Fair Value, Overvalued).
  - Paginasi cerdas 10 emiten per halaman dengan navigasi interaktif.
- **Kalender Aksi Korporasi Riil**:
  - 153 agenda pasar terverifikasi langsung dari Yahoo Finance (jadwal rilis laporan keuangan / *earnings* & pembagian dividen tunai).
  - Terurut otomatis dari agenda terdekat dengan penghitung mundur (*countdown*) dan paginasi 10 agenda per halaman.
- **Identitas Visual Resmi**:
  - Logo perusahaan resmi untuk seluruh 69 emiten dengan sistem fallback monogram yang mulus.
  - 100% SVG murni tanpa ketergantungan emoji platform.

## 📁 Struktur Direktori
- `PintarSaham_Dashboard_Interaktif.html` — Antarmuka dashboard utama (Single-Page Application).
- `fetch_market_data.py` — Pipeline ekstraksi data fundamental 69 emiten & kalender aksi korporasi via `yfinance`.
- `fetch_ihsg.py` — Ekstraksi histori data harian IHSG (`^JKSE`).
- `server.py` — Local backend server dengan REST API endpoint untuk live refresh data pasar.
- `perhitungan_fundamental_mos.md` — Dokumentasi metodologi, rumus matematis, dan pembuktian formula MOS.
- `session.md` — Log lengkap kronologi pengembangan dan keputusan teknis (Sesi 1 s.d. Sesi 14).
- `corporate_events.json` — Dataset jadwal rilis laporan keuangan dan dividen tunai.
- `emitens.json` — Daftar 69 emiten IDX beserta profil dan klasifikasi sektor.
- `market_data.js` / `market_data.json` — Bundle data pasar terintegrasi.
- `jalankan_dashboard_ihsg.bat` — Launcher satu klik untuk menjalankan server dan membuka dashboard di browser.

## 💻 Cara Menjalankan
1. **Via Launcher (Disarankan)**:
   Double-click `jalankan_dashboard_ihsg.bat`.
2. **Via Browser Langsung (Offline)**:
   Buka file `PintarSaham_Dashboard_Interaktif.html` di browser modern (Chrome, Edge, Firefox).
