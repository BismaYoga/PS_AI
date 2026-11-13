# PintarSaham AI (`PS_AI`)

**PintarSaham AI** adalah platform analisis saham Bursa Efek Indonesia (IDX) dan Indeks Harga Saham Gabungan (IHSG) yang memadukan data pasar saham, perhitungan rasio fundamental resmi, valuasi *Margin of Safety (MOS)*, serta asisten kecerdasan buatan (**AI Investment Analyst & Chatbot**).

> **Penting — Dokumen Serah Terima (Handover):**  
> Untuk panduan lengkap cara menjalankan aplikasi, mengatur kunci `.env`, cara *deploy* di server VPS, hingga perawatan sehari-hari dengan bahasa yang mudah dipahami, silakan baca file **[HANDOVER.md](./HANDOVER.md)**.

---

## Fitur Utama

- **Dashboard IHSG & Saham IDX Real-Time:** Grafik *Candlestick* & *Line Chart* interaktif, indikator teknikal, serta pantauan arus dana asing (*Top Foreign Flow*).
- **Valuasi Fundamental & Rasio Keuangan Otomatis:** Perhitungan Harga Wajar (*Fair Value*), *Margin of Safety (MOS)*, serta rasio keuangan lengkap (PER, PBV, ROE, ROA, DER, NPM, EPS, dan BVPS) yang terintegrasi dengan laporan keuangan BEI (`idx_client.py`) & Invezgo API (`invezgo_client.py`).
- **AI Investment Thesis & Chat Studio:** Analisis mendalam kondisi fundamental/teknikal emiten serta ruang diskusi interaktif berbasis Google Gemini AI.
- **Berita Pasar & Kalender Aksi Korporasi:** Rangkuman berita pasar terkini dan jadwal pembagian dividen tunai / laporan keuangan.
- **Manajemen Pengguna & Panel Admin:** Autentikasi pengguna (Email & Google OAuth), pengaturan kuota akses AI, serta dashboard Admin.

---

## Struktur Direktori Utama

- [`HANDOVER.md`](./HANDOVER.md) — **Panduan lengkap serah terima, cara menjalankan, dan cara deploy (Non-Teknikal).**
- `backend/` — Server utama Python (`server.py`), mesin analisis AI (`ai_analyst.py`, `chatbot_agent.py`), integrasi data BEI (`idx_client.py`) & Invezgo (`invezgo_client.py`), serta pengelola database (`db_manager.py`).
- `frontend/` — Aplikasi antarmuka pengguna berbasis React + TypeScript + Vite (`src/` untuk kode sumber dan `dist/` untuk hasil *build* produksi).
- `data/` — Penyimpanan database SQLite (`pintarsaham.db`) dan berkas *snapshot* data pasar (`market_data.json`, `top_foreign.json`, `corporate_events.json`).
- `.env.example` — Contoh template konfigurasi kunci akses (*API Key*).

---

## Cara Cepat Menjalankan

1. Salin `.env.example` menjadi `.env` dan isi kunci API yang diperlukan (`GEMINI_API`, `INVESGO_API`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
2. Bangun tampilan *frontend* (jika ada perubahan tampilan):
   ```bash
   cd frontend && npm install && npm run build && cd ..
   ```
3. Jalankan server utama:
   ```bash
   python3 server.py
   ```
4. Buka **`http://localhost:8080`** di browser Anda.

Untuk petunjuk lengkap mengenai *deployment* server 24 jam (Systemd & Nginx), backup data, dan *troubleshooting*, silakan buka **[HANDOVER.md](./HANDOVER.md)**.
