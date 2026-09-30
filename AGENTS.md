# AGENTS.md — Laporan Tim TPFL

## Overview
Dokumen ini berisi instruksi, protokol keamanan, dan alur kerja wajib untuk AI agent pada proyek **Laporan Tim TPFL**. 
**Status Repo Saat Ini:** Proyek ini dimulai dari nol (greenfield). Hanya berisi file dokumentasi awal (`prd.md`, `design.md`, `AGENTS.md`). Belum ada implementasi kode.

## Prerequisites & Local Setup
Karena proyek ini dibangun dari nol, setup awal sangat krusial agar tidak error:
1. **Google Apps Script (CLASP)**
   - Wajib login secara lokal: `clasp login`
   - Inisialisasi awal jika belum ada: `clasp create --type webapp --title "Laporan Tim TPFL" --rootDir ./backend`
2. **Firebase CLI**
   - Wajib login: `firebase login`
   - Inisialisasi hosting: `firebase init hosting` (pilih direktori `public`)
   - **Local Preview:** Gunakan `firebase serve` atau `firebase emulators:start` untuk testing UI lokal tanpa harus deploy ke production.
3. **Peringatan Build Tools:**
   - Tidak ada perintah `npm run dev`, Vite, atau Node.js dev server khusus. Jalankan web secara statis atau gunakan ekosistem lokal Firebase.

## 1. Tech Stack
- **Frontend**: Single File HTML5 + Vue 3 CDN + Tailwind CSS CDN
- **Backend**: Google Apps Script (CLASP)
- **Database**: Google Sheets
- **FE Hosting**: Firebase Hosting
- **CI/CD**: GitHub Actions
- **DILARANG KERAS**: Menggunakan React, Angular, Node.js backend runner, Python, Vite, Webpack, PostCSS, atau memecah komponen ke Single File Components (.vue).

## 2. Frontend Rules (Strict Single File SPA)

### 2.1 Arsitektur Single Page Application (SPA)
- Aplikasi ini ADALAH 1 File SPA murni.
- Seluruh markup HTML, CSS tambahan, Vue components, routing logika, dan API calls wajib berada utuh di dalam **SATU file `public/index.html`**.
- DILARANG memecah komponen ke dalam file `.js` terpisah.
- Routing wajib menggunakan **hash router** murni (`#/path`) tanpa page reload.

### 2.2 Component & Logic Structure
- Seluruh komponen Vue ditulis langsung sebagai JavaScript Object di dalam tag `<script>` pada `index.html`.
- Gunakan `template: \`...\`` template literal untuk render tampilan.
- Dilarang membuat file berekstensi `.vue`.

### 2.3 Aturan Komunikasi API (Google Apps Script Fetch)
- Gunakan **Native `fetch()` API** bawaan browser (dilarang menggunakan Axios, jQuery, atau library HTTP pihak ketiga).
- Selalu gunakan `redirect: 'follow'` pada setiap pemanggilan `fetch` karena endpoint Web App Google Apps Script selalu melakukan 302 redirect.
- Request `POST` ke backend GAS wajib menggunakan header `Content-Type: 'text/plain;charset=utf-8'` dan payload `JSON.stringify(data)` untuk mencegah CORS preflight OPTIONS blocking dari browser.
- Seluruh request wajib dibungkus blok `try/catch` dan di-parse via `.json()`.

### 2.4 Mockup Data System
- Sediakan variabel global `USE_MOCK = true` di dalam script.
- Jika `USE_MOCK === true`, bypass panggilan fetch dan ambil data dari object mockup lokal yang sudah disediakan di script.
- Format respon data tiruan wajib 100% identik dengan respon aktual Backend.

## 3. Design System
- Desain UI wajib mematuhi aturan visual yang didefinisikan secara mendetail pada **`design.md`**.
- Konfigurasikan warna Tailwind melalui script tag di `index.html` berdasarkan design token (tema Dark Mode Fintech) yang ada pada dokumen tersebut.

## 4. Backend Rules (Google Apps Script via CLASP)

### 4.1 Setup & Inisialisasi
- File backend utama: `backend/Code.gs` dan utilitas pendukungnya.
- Dilarang melakukan modifikasi via Web Editor Google Apps Script; seluruh sinkronisasi wajib melalui terminal via `clasp push`.

### 4.2 Standar Output Respon Backend
- Setiap respon API dari `doGet(e)` atau `doPost(e)` wajib mengembalikan JSON valid:
  `return ContentService.createTextOutput(JSON.stringify(responsePayload)).setMimeType(ContentService.MimeType.JSON);`

### 4.3 Deployment Management (Dev + Prod)
- Gunakan 1 project GAS dengan 2 Deployment ID tetap (Dev dan Prod).
- JANGAN jalankan `clasp deploy` tanpa flag ID (menghindari spam deployment ID baru).
- **Alur Update:**
  1. Update kode backend di lokal.
  2. Push ke cloud: `clasp push`
  3. Update Dev: `clasp deploy --deploymentId {DEV_DEPLOYMENT_ID} --description "Dev Update"`
  4. Pengujian via endpoint Dev.
  5. Jika valid, update Prod: `clasp deploy --deploymentId {PROD_DEPLOYMENT_ID} --description "Release Prod"`

## 5. CI/CD Otomatis & Firebase Hosting
- Frontend di-deploy secara otomatis setiap kali ada `push` ke branch `main`.
- Autentikasi CI/CD wajib menggunakan **Google Cloud Service Account** via secret `FIREBASE_SERVICE_ACCOUNT`.
- Konfigurasi workflow `.github/workflows/deploy.yml` wajib terpasang dengan step aksi `FirebaseExtended/action-hosting-deploy@v0` yang mendengarkan trigger `push` ke branch `main`.

## 6. Struktur Folder Proyek Standar
Struktur folder wajib bersih, ringkas, dan memisahkan static hosting dengan backend CLASP:

```text
laporan-tim-tpfl/
├── public/
│   └── index.html          <-- 1 file SPA utuh (HTML, Vue 3, Tailwind, Script)
├── backend/
│   ├── Code.gs             <-- Logika utama GAS & Spreadsheet
│   ├── appsscript.json
│   └── .clasp.json
├── .github/
│   └── workflows/
│       └── deploy.yml      <-- Otomasi deploy Firebase saat git push
├── firebase.json           <-- Config public folder mengarah ke "public"
├── .firebaserc             <-- ID Project Firebase target
├── .gitignore
├── prd.md                  <-- Product Requirements
├── design.md               <-- Design System Tokens
└── AGENTS.md               <-- File ini
```

## 7. Protokol Modifikasi Kode & Keselamatan AI (Strict Rules)
1. **Strict Scope Execution**: AI HANYA mengeksekusi baris atau fungsi yang diminta secara eksplisit. Dilarang merombak, memformat ulang, atau mengubah file dan logika yang tidak berkaitan.
2. **Append-Only Preferred**: Prioritaskan penambahan fungsi baru tanpa menimpa atau menghapus fungsi lama yang sudah berjalan stabil.
3. **Single File Integrity**: Jangan pernah memecah `index.html` menjadi file-file kecil terpisah kecuali ada instruksi langsung dari user.
4. **Zero Unnecessary Packages**: Dilarang menginstal atau menyarankan dependensi npm tambahan di area frontend.
5. **Konfirmasi Perubahan**: Jika sebuah solusi mengharuskan perubahan struktur dasar, AI wajib meminta izin terlebih dahulu sebelum melakukan penulisan kode.

## 8. Commit Conventions
- Format pesan commit: `{type}: {description}`
- Pilihan tipe:
  - `feat`: Penambahan fitur baru
  - `fix`: Perbaikan bug atau galat
  - `chore`: Penyesuaian konfigurasi atau maintenance
  - `docs`: Penambahan atau pembaruan dokumentasi


