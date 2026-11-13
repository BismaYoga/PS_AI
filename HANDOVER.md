# DOKUMEN SERAH TERIMA (HANDOVER) — PINTARSAHAM AI (`PS_AI`)

Dokumen ini disusun sebagai panduan lengkap namun mudah dipahami untuk menjalankan, mengelola, memperbarui, dan men-*deploy* aplikasi **PintarSaham AI** baik di komputer pribadi maupun di server produksi (VPS).

---

## 1. Gambaran Umum Aplikasi

**PintarSaham AI** adalah platform web analisis saham Indonesia (Bursa Efek Indonesia / IDX) dan Indeks Harga Saham Gabungan (IHSG) yang menggabungkan data pasar saham dengan kecerdasan buatan (AI).

**Fitur Utama yang Tersedia:**
1. **Dashboard IHSG & Daftar Saham Pilihan:** Menampilkan pergerakan harga saham, grafik *candlestick*, indikator teknikal, serta arus dana asing (*Top Foreign Flow*).
2. **Analisis Fundamental & Harga Wajar (Margin of Safety):** Menghitung valuasi harga wajar saham beserta rasio keuangan penting (PER, PBV, ROE, ROA, DER, NPM, EPS, dan BVPS) secara otomatis.
3. **AI Investment Thesis & Chatbot Saham:** Asisten AI pintar yang merangkum kondisi kesehatan saham dan menjawab pertanyaan pengguna seputar saham secara langsung.
4. **Berita Pasar & Kalender Aksi Korporasi:** Menampilkan berita ekonomi/emiten terkini serta jadwal pembagian dividen dan laporan keuangan.
5. **Sistem Akun Pengguna & Panel Admin:** Mendukung pendaftaran/login pengguna (termasuk Login dengan Google), pembatasan kuota akses fitur AI, serta halaman khusus Admin untuk mengelola pengguna.

---

## 2. Mengenal Isi Folder Proyek (Peta Sederhana)

Anda tidak perlu menghafal seluruh file kode. Cukup kenali **4 bagian utama** berikut di dalam folder `PS_AI`:

```text
PS_AI/
├── backend/          --> Mesin utama aplikasi (Python). Mengurus pengambilan data saham,
│                         perhitungan finansial, database pengguna, dan koneksi ke AI.
├── frontend/         --> Tampilan website (React).
│   ├── src/          --> Kode sumber tampilan (diubah jika ingin mengganti desain/tombol).
│   └── dist/         --> Hasil akhir tampilan yang sudah siap ditayangkan oleh server.
├── data/             --> Tempat penyimpanan database utama (pintarsaham.db) dan
│                         data cadangan pasar saham (market_data.json, dll).
├── .env              --> File rahasia tempat menyimpan kunci akses (API Key).
└── server.py         --> Tombol pemanggil utama untuk menyalakan seluruh aplikasi.
```

---

## 3. Persiapan Awal (Sebelum Menjalankan Aplikasi)

### A. Aplikasi Pendukung yang Harus Terpasang
Pastikan di komputer atau server sudah terpasang dua program standar ini:
1. **Python (Versi 3.10 ke atas)** — untuk menjalankan mesin belakang (*backend*).
2. **Node.js & NPM (Versi 18 ke atas)** — untuk membangun tampilan website (*frontend*).

### B. Mengatur File Kunci Rahasia (`.env`)
Aplikasi membutuhkan beberapa "kunci akses" (*API Key*) agar fitur AI, data saham, dan login Google bisa berjalan.
1. Di dalam folder utama `PS_AI`, salin file contoh `.env.example` menjadi file baru bernama **`.env`**:
   ```bash
   cp .env.example .env
   ```
2. Buka file **`.env`** menggunakan teks editor (seperti Notepad, VS Code, atau `nano .env`), lalu isi keempat baris berikut dengan kunci milik Anda:
   ```env
   GEMINI_API="isi_dengan_api_key_google_gemini"
   INVESGO_API="isi_dengan_api_key_invezgo"
   GOOGLE_CLIENT_ID="isi_dengan_client_id_google_oauth"
   GOOGLE_CLIENT_SECRET="isi_dengan_client_secret_google_oauth"
   ```
   *(Catatan: File `.env` ini bersifat rahasia dan sengaja tidak pernah ikut ter-upload ke GitHub demi keamanan).*

---

## 4. Cara Menjalankan di Komputer Lokal (Laptop / PC)

Jika Anda ingin menjalankan aplikasi ini di komputer sendiri untuk keperluan pengecekan atau pengembangan:

### Langkah 1: Pasang Pustaka Python (Cukup Sekali di Awal)
Buka terminal / Command Prompt di dalam folder `PS_AI`, lalu jalankan:
```bash
pip install requests yfinance beautifulsoup4 pillow
```

### Langkah 2: Bangun Tampilan Website (Jika Folder `frontend/dist` Belum Ada)
Masuk ke folder `frontend`, pasang paket tampilan, lalu bangun hasil tampilannya:
```bash
cd frontend
npm install
npm run build
cd ..
```

### Langkah 3: Nyalakan Aplikasi
Dari folder utama `PS_AI`, jalankan perintah berikut:
```bash
python server.py
```
*(Atau pada Linux/Mac: `python3 server.py`)*.

Setelah muncul pesan bahwa server sudah berjalan di port **8080**, buka browser (Chrome/Edge/Safari) dan kunjungi alamat:
- **`http://localhost:8080`**

> **Tips Tambahan untuk Desainer/Programmer Tampilan:**  
> Jika Anda sedang mengutak-atik desain di dalam folder `frontend/src/` dan ingin melihat perubahannya secara instan tanpa bolak-balik menjalankan `npm run build`, Anda bisa membuka terminal baru, masuk ke `cd frontend`, lalu jalankan `npm run dev`.

---

## 5. Cara Deploy di Server / VPS (Panduan Tayang 24 Jam)

Agar website **PintarSaham AI** bisa diakses oleh publik secara online 24 jam nonstop menggunakan domain Anda, ikuti panduan langkah demi langkah berikut pada server VPS (Ubuntu/Debian Linux):

### Langkah 1: Ambil Kode dari GitHub ke Server
Masuk ke server VPS Anda, lalu unduh repositori ini:
```bash
cd /root
git clone https://github.com/BismaYoga/PS_AI.git
cd /root/PS_AI
```
Jangan lupa buat dan isi file **`.env`** di `/root/PS_AI/.env` seperti pada panduan Bagian 3B di atas.

### Langkah 2: Bangun Tampilan Website (Frontend Build)
```bash
cd /root/PS_AI/frontend
npm install
npm run build
cd /root/PS_AI
```
Perintah `npm run build` akan memperbarui isi folder `/root/PS_AI/frontend/dist` yang nantinya langsung disajikan oleh server Python di port `8080`.

### Langkah 3: Buat Layanan Otomatis (`systemd`) agar Menyala 24 Jam
Agar aplikasi tidak mati saat Anda menutup terminal dan otomatis menyala kembali jika server *restart*, buat file layanan di `/etc/systemd/system/ps_ai.service`:

```ini
[Unit]
Description=PintarSaham AI Dashboard Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/PS_AI
EnvironmentFile=-/root/PS_AI/.env
ExecStart=/usr/bin/python3 -u /root/PS_AI/backend/server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Aktifkan dan nyalakan layanan tersebut dengan perintah:
```bash
systemctl daemon-reload
systemctl enable ps_ai.service
systemctl start ps_ai.service
```

### Langkah 4: Hubungkan dengan Domain melalui Nginx
Buat konfigurasi domain pada Nginx (misalnya di `/etc/nginx/conf.d/pintarsaham.conf`) untuk meneruskan pengunjung dari domain Anda ke port `8080`:

```nginx
server {
    listen 80;
    server_name domain-anda.com www.domain-anda.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Simpan konfigurasi tersebut, lalu muat ulang Nginx:
```bash
nginx -t && systemctl reload nginx
```
*(Untuk mengaktifkan gembok keamanan HTTPS/SSL gratis pada domain baru, Anda cukup menjalankan `certbot --nginx -d domain-anda.com`)*.

---

## 6. Panduan Operasional Rutin (Sehari-hari)

Berikut adalah perintah-perintah praktis yang paling sering dibutuhkan saat mengelola server:

### A. Cara Update Website Setelah Ada Perubahan Kode di GitHub
Setiap kali ada pembaruan kode yang sudah di-*push* ke GitHub, jalankan perintah ini di server untuk menerapkan perubahannya:
```bash
cd /root/PS_AI
git pull origin main

# Jika ada perubahan pada tampilan (frontend), jalankan 3 baris ini:
cd frontend
npm run build
cd ..

# Restart mesin aplikasi agar perubahan langsung aktif:
systemctl restart ps_ai.service
```

### B. Cara Mengecek Apakah Aplikasi Sedang Berjalan Normal
```bash
systemctl status ps_ai.service
```
Jika tertulis **`active (running)`** berwarna hijau, berarti aplikasi berjalan dengan baik.

### C. Cara Melihat Catatan Aktivitas (Log) Jika Terjadi Kendala
Jika ada fitur yang terasa lambat atau muncul pesan gagal, Anda bisa melihat apa yang sedang terjadi di belakang layar dengan perintah:
```bash
journalctl -u ps_ai.service -n 50 --no-pager
```

### D. Cara Memperbarui Data Saham & Berita Secara Manual (Opsional)
Sistem sudah memiliki mekanisme penyimpanan otomatis (*cache* & *background update*). Namun jika sewaktu-waktu Anda ingin memicu pembaruan data dari terminal, Anda dapat menjalankan:
```bash
cd /root/PS_AI/backend
python3 fetch_market_data.py
python3 fetch_news.py
```

---

## 7. Cadangan Data (Backup Database) & Keamanan

Seluruh data pengguna terdaftar, riwayat percakapan AI, serta *cache* rasio laporan keuangan disimpan di dalam satu file database:
- **Lokasi Database Utama:** `/root/PS_AI/data/pintarsaham.db`

**Cara Backup (Sangat Mudah):**
Cukup salin file `data/pintarsaham.db` ke tempat penyimpanan aman secara berkala:
```bash
cp /root/PS_AI/data/pintarsaham.db /root/backup_pintarsaham_$(date +%F).db
```
Jika suatu saat Anda memindahkan aplikasi ke server baru, cukup salin kembali file `pintarsaham.db` dan file `.env` Anda ke server baru tersebut, maka seluruh akun pengguna dan data akan langsung pulih seperti semula.

---

## 8. Tanya Jawab Kendala Umum (Troubleshooting)

1. **Tampilan website saya sudah diubah di kode `frontend/src`, tapi kenapa di browser belum berubah?**
   - **Solusi:** Pastikan Anda sudah menjalankan `cd /root/PS_AI/frontend && npm run build`, lalu tekan `Ctrl + Shift + R` (*Hard Refresh*) di browser Anda agar *cache* lama browser terhapus.
2. **Fitur Chat AI / Analisis AI tidak merespons atau muncul pesan kuota habis?**
   - **Solusi:** Periksa kunci `GEMINI_API` di dalam file `/root/PS_AI/.env`. Pastikan kunci tersebut masih aktif, lalu jalankan `systemctl restart ps_ai.service`.
3. **Data harga saham tertentu belum bergerak atau rasio fundamental kosong?**
   - **Solusi:** Pastikan kunci `INVESGO_API` di dalam `.env` aktif. Untuk rasio fundamental (ROE, ROA, DER, NPM, PER, PBV), mesin otomatis menghitungnya dari laporan keuangan resmi BEI (`backend/idx_client.py`) dan menyimpannya ke database lokal agar pemuatan selanjutnya tetap instan.
