# DOKUMEN SERAH TERIMA (HANDOVER) — PINTARSAHAM AI (`PS_AI`)

Dokumen ini disusun sebagai panduan lengkap namun mudah dipahami untuk menjalankan, mengelola, memperbarui, dan men-*deploy* aplikasi **PintarSaham AI** baik di komputer pribadi, di **Hostinger / Hosting berbasis cPanel**, maupun di **Server VPS**.

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

Anda tidak perlu menghafal seluruh file kode. Cukup kenali bagian-bagian utama berikut di dalam folder `PS_AI`:

```text
PS_AI/
├── backend/            --> Mesin utama aplikasi (Python). Mengurus pengambilan data saham,
│                           perhitungan finansial, database pengguna, dan koneksi ke AI.
├── frontend/           --> Tampilan website (React).
│   ├── src/            --> Kode sumber tampilan (diubah jika ingin mengganti desain/tombol).
│   └── dist/           --> Hasil akhir tampilan yang SUDAH JADI dan siap ditayangkan.
├── data/               --> Tempat penyimpanan database utama (pintarsaham.db) dan
│                           data cadangan pasar saham (market_data.json, dll).
├── .env                --> File rahasia tempat menyimpan kunci akses (API Key).
├── requirements.txt    --> Daftar pustaka Python (dipakai otomatis oleh cPanel / pip).
├── passenger_wsgi.py   --> Penghubung khusus agar aplikasi langsung jalan di cPanel / Hostinger.
└── server.py           --> Tombol pemanggil utama untuk menyalakan aplikasi di Laptop / VPS.
```

---

## 3. Persiapan Awal: Mengatur Kunci Rahasia (`.env`)

Aplikasi membutuhkan 4 "kunci akses" (*API Key*) agar fitur AI, data saham, dan login Google bisa berjalan:

1. Di dalam folder utama `PS_AI`, salin file contoh `.env.example` menjadi file baru bernama **`.env`**:
   ```bash
   cp .env.example .env
   ```
2. Buka file **`.env`** menggunakan teks editor (seperti Notepad, File Manager cPanel, atau VS Code), lalu isi keempat baris berikut dengan kunci milik Anda:
   ```env
   GEMINI_API="isi_dengan_api_key_google_gemini"
   INVESGO_API="isi_dengan_api_key_invezgo"
   GOOGLE_CLIENT_ID="isi_dengan_client_id_google_oauth"
   GOOGLE_CLIENT_SECRET="isi_dengan_client_secret_google_oauth"
   ```
   *(Catatan: Jika Anda menggunakan cPanel, keempat kunci di atas juga bisa dimasukkan langsung di kolom **Environment Variables** pada menu Setup Python App).*

---

## 4. Cara Menjalankan di Komputer Lokal (Laptop / PC)

Jika Anda ingin menjalankan aplikasi ini di komputer sendiri untuk keperluan pengecekan:

1. **Pasang Pustaka Python (Cukup Sekali di Awal):**
   Buka terminal / Command Prompt di dalam folder `PS_AI`, lalu jalankan:
   ```bash
   pip install -r requirements.txt
   ```
2. **Nyalakan Aplikasi:**
   Dari folder utama `PS_AI`, jalankan perintah berikut:
   ```bash
   python server.py
   ```
   *(Atau pada Linux/Mac: `python3 server.py`)*.
3. **Buka di Browser:**
   Kunjungi alamat **`http://localhost:8080`**.

> **Catatan Jika Ingin Mengubah Desain Tampilan (`frontend`):**  
> Hasil jadi tampilan (`frontend/dist`) sebenarnya sudah disertakan di dalam proyek sehingga Anda tidak wajib menjalankan perintah tambahan. Namun jika suatu saat Anda mengubah kode desain di dalam `frontend/src/`, jalankan `cd frontend && npm install && npm run build` agar perubahannya tersimpan ke `frontend/dist`.

---

## 5. Cara Deploy ke Hostinger / Hosting yang Memiliki cPanel

Kami sudah menyiapkan file **`passenger_wsgi.py`**, **`requirements.txt`**, dan folder tampilan jadi **`frontend/dist`** di dalam repositori GitHub ini. Artinya, **Anda tidak perlu menginstal Node.js atau melakukan build tampilan lagi di dalam cPanel**.

Berikut adalah langkah demi langkah memasang aplikasi ini di **cPanel (maupun paket Hostinger cPanel / Cloud Hosting yang mendukung Python App)**:

### Langkah 1: Masukkan File Proyek ke Dalam cPanel
Anda bisa memilih **salah satu** dari dua cara paling mudah ini di beranda cPanel Anda:

- **Cara A — Lewat Menu "Git Version Control" di cPanel (Paling Disarankan):**
  1. Buka cPanel, cari dan klik menu **Git™ Version Control**.
  2. Klik tombol **Create** (Buat).
  3. Pastikan tombol *Clone a Repository* menyala.
  4. Pada kolom **Clone URL**, tempelkan alamat GitHub proyek ini:
     `https://github.com/BismaYoga/PS_AI.git`
  5. Pada kolom **Repository Path**, ketik nama foldernya, misalnya: `/home/username_cpanel/PS_AI`
  6. Klik tombol **Create**. Seluruh file akan otomatis terunduh ke cPanel Anda.

- **Cara B — Lewat Menu "File Manager" (Upload File ZIP):**
  1. Unduh proyek ini dari GitHub dalam bentuk **`.zip`** (*Download ZIP*).
  2. Buka menu **File Manager** di cPanel, buat folder baru bernama `PS_AI` di direktori utama (`/home/username_cpanel/PS_AI`).
  3. Unggah (*Upload*) file `.zip` tadi ke dalam folder `PS_AI`, lalu klik kanan dan pilih **Extract**.

### Langkah 2: Buat Aplikasi Python di Menu "Setup Python App"
1. Kembali ke halaman utama cPanel, gulir ke bagian **Software**, lalu klik menu **Setup Python App**.
2. Klik tombol **Create Application** (Buat Aplikasi).
3. Isi formulir yang muncul dengan pengaturan berikut:
   - **Python version:** Pilih versi **Python 3.10**, **3.11**, atau **3.12** (pilih versi 3 terbaru yang tersedia).
   - **Application mode:** Pilih **Production**.
   - **Application root:** Ketik lokasi folder tempat Anda menyimpan proyek tadi, yaitu: `PS_AI`
   - **Application URL:** Pilih nama domain atau subdomain tempat website akan diakses (kosongkan kolom di sebelahnya jika ingin langsung tampil di halaman utama domain).
   - **Application startup file:** Ketik: `passenger_wsgi.py`
   - **Application Entry point:** Ketik: `application`
4. Klik tombol **Create** di kanan atas, lalu tunggu beberapa detik hingga halaman selesai memuat.

### Langkah 3: Pasang Pustaka Python (Klik 1 Tombol)
Masih di halaman **Setup Python App** yang baru saja dibuat:
1. Gulir sedikit ke bawah ke bagian **Configuration files**.
2. Di kolom ketik yang tersedia, ketik **`requirements.txt`**, lalu klik tombol **Add**.
3. Sekarang klik tombol **Run Pip Install** yang muncul di sebelahnya. cPanel akan otomatis menginstal seluruh pustaka Python yang dibutuhkan hingga muncul tanda sukses warna hijau.

### Langkah 4: Masukkan Kunci Rahasia (`.env` / Environment Variables)
Masih di halaman **Setup Python App** yang sama:
1. Gulir ke bagian paling bawah bernama **Environment variables**, lalu klik **Add Variable** satu per satu untuk keempat kunci berikut:
   - Name: `GEMINI_API` $\rightarrow$ Value: *(isi kunci API Gemini Anda)*
   - Name: `INVESGO_API` $\rightarrow$ Value: *(isi kunci API Invezgo Anda)*
   - Name: `GOOGLE_CLIENT_ID` $\rightarrow$ Value: *(isi Google Client ID Anda)*
   - Name: `GOOGLE_CLIENT_SECRET` $\rightarrow$ Value: *(isi Google Client Secret Anda)*
   *(Atau alternatifnya: Anda juga bisa membuat file bernama `.env` langsung di dalam folder `PS_AI` lewat File Manager cPanel).*
2. Gulir kembali ke bagian atas halaman, klik tombol **Save**, lalu klik tombol **Restart**.
3. **Selesai!** Silakan buka domain Anda di browser; website **PintarSaham AI** sudah langsung aktif dan siap digunakan.

> **Catatan Tambahan untuk Pengguna Hostinger:**  
> - Jika Anda membeli paket **Hostinger cPanel Hosting**, tampilannya sama persis dengan langkah 1–4 di atas.  
> - Jika Anda membeli paket **Hostinger Shared/Web Hosting biasa (hPanel tanpa menu Setup Python App)**, perlu diketahui bahwa hPanel shared standar hanya mendukung PHP/Node statis dan mengunci proses Python di belakang layar. Untuk layanan Hostinger, pastikan Anda memilih paket **Hostinger cPanel Hosting** atau **Hostinger VPS (KVM 1 / KVM 2)**. Jika menggunakan **Hostinger VPS**, ikuti panduan **Bagian 6** di bawah ini.

---

## 6. Cara Deploy di Server VPS (Hostinger VPS / DigitalOcean / Lainnya)

Jika Anda menggunakan **VPS (Ubuntu/Debian Linux)** seperti **Hostinger VPS**, aplikasi dijalankan sebagai layanan mandiri 24 jam menggunakan langkah berikut:

### Langkah 1: Ambil Kode dari GitHub ke VPS
Buka terminal VPS (atau menu **Browser Terminal** di dashboard Hostinger VPS):
```bash
cd /root
git clone https://github.com/BismaYoga/PS_AI.git
cd /root/PS_AI
pip install -r requirements.txt
```
Jangan lupa buat dan isi file **`.env`** di `/root/PS_AI/.env` seperti pada panduan Bagian 3 di atas.

### Langkah 2: Buat Layanan Otomatis (`systemd`) agar Menyala 24 Jam
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
ExecStart=/usr/bin/python3 -u /root/PS_AI/server.py
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

### Langkah 3: Hubungkan dengan Domain melalui Nginx
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

---

## 7. Panduan Operasional Rutin (Sehari-hari)

### A. Cara Update Website Setelah Ada Perubahan di GitHub
- **Jika Menggunakan cPanel:**
  1. Buka menu **Git™ Version Control** di cPanel $\rightarrow$ klik **Manage** pada repositori `PS_AI` $\rightarrow$ tab **Pull or Deploy** $\rightarrow$ klik tombol **Update from Remote**.
  2. Buka menu **Setup Python App** $\rightarrow$ klik tombol **Restart** pada aplikasi `PS_AI`.
- **Jika Menggunakan VPS:**
  ```bash
  cd /root/PS_AI
  git pull origin main
  systemctl restart ps_ai.service
  ```

### B. Cara Backup Data Pengguna & Database
Seluruh data pengguna terdaftar, kuota token, riwayat percakapan AI, serta *cache* rasio laporan keuangan disimpan di dalam satu file:
- **Lokasi Database Utama:** `data/pintarsaham.db`

Untuk membuat cadangan (*backup*), Anda cukup mengunduh atau menyalin file **`data/pintarsaham.db`** tersebut ke komputer Anda secara berkala.

---

## 8. Tanya Jawab Kendala Umum (Troubleshooting)

1. **Di cPanel muncul pesan "500 Internal Server Error" atau halaman kosong saat pertama kali dipasang?**
   - **Solusi:** Buka menu **Setup Python App**, pastikan Anda sudah mengklik tombol **Run Pip Install** untuk `requirements.txt`, pastikan **Application startup file** diisi `passenger_wsgi.py` dan **Application Entry point** diisi `application`, lalu klik tombol **Restart**.
2. **Tampilan website sudah diubah di kode `frontend/src`, tapi kenapa di browser belum berubah?**
   - **Solusi:** Jika Anda mengubah kode sumber React di `frontend/src`, jalankan `cd frontend && npm run build` di komputer Anda sebelum melakukan `git push`, lalu tekan `Ctrl + Shift + R` (*Hard Refresh*) di browser agar *cache* lama terhapus.
3. **Fitur Chat AI / Analisis AI tidak merespons?**
   - **Solusi:** Periksa kunci `GEMINI_API` pada `.env` atau pada bagian *Environment Variables* di cPanel. Pastikan kunci aktif, lalu *Restart* aplikasi.
