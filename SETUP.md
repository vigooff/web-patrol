# Field ERP — Backend & Frontend (Phase 1-3 + FE Auth/Dashboard)

Sistem manajemen karyawan lapangan. Stack: **Next.js 15 Route Handlers + DrizzleORM + PostgreSQL + BetterAuth** (BE), **Next.js App Router + Tailwind** (FE).

## 🎨 Status: FE — Navigasi Lengkap (Admin + Employee)

**Sidebar Admin** — diupdate dari 4 jadi 9 menu, dengan flyout label saat hover (icon-only tetap, label muncul di sisi kanan icon saat di-hover), active state pakai `startsWith` jadi sub-halaman tetap kebaca aktif.

**Halaman Admin baru** (semua di `/dashboard/...`):
- `/dashboard/employees` — tabel pegawai (avatar, ID, jabatan, lokasi, aksi telepon)
- `/dashboard/locations` — card geofencing per lokasi (lat/lng/radius, jumlah pegawai)
- `/dashboard/positions` — accordion jabatan dengan rincian gaji pokok + tunjangan + potongan (sesuai referensi screenshot "Data Jabatan")
- `/dashboard/attendance` — tabel rekap presensi dengan filter bulan
- `/dashboard/patrol` — monitor sesi patroli (progress checkpoint, status ongoing/completed)
- `/dashboard/leaves` — approval izin/cuti dengan tombol Setujui/Tolak
- `/dashboard/sos` — monitor laporan darurat dengan kategori (Fire/Accident/Crime/Medical), banner alert kalau ada yang masih open
- `/dashboard/reports` — daftar laporan yang bisa diunduh (placeholder export)
- `/dashboard/settings` — profil admin + pengaturan akun + tentang aplikasi (sesuai referensi screenshot "Profil Pengguna")

**Bottom Navigation Employee** — baru ditambahkan (`BottomNav.tsx`), 5 menu: Beranda, Patroli, SOS (warna merah permanen sebagai penanda darurat), Izin, Profil.

**Halaman Employee baru** (semua di `/home/...`):
- `/home/attendance` — detail check-in + riwayat 7 hari
- `/home/patrol` — alur lengkap: mulai sesi → progress bar → scan QR → list checkpoint → akhiri sesi
- `/home/leaves` — form ajukan izin (toggle show/hide) + riwayat pengajuan
- `/home/activities` — form log aktivitas + riwayat
- `/home/sos` — pilih kategori darurat → deskripsi → kirim → konfirmasi terkirim
- `/home/profile` — profil + menu pengaturan + tombol keluar

**Semua tombol/card di halaman utama sekarang benar-benar `Link` ke halaman terkait** (sebelumnya beberapa cuma `<button>` dekoratif tanpa navigasi).

### 🐛 Bug yang ditemukan & diperbaiki
Saat menambah data dummy baru ke `lib/mock/data.ts`, baris `export const statusStyles = {` sempat tertimpa secara tidak sengaja saat proses penyisipan teks, menyebabkan syntax error (`object body tanpa nama variabel`). Sudah diperbaiki dan diverifikasi lewat `tsc --noEmit` + full `npm run build` (41 route, exit code 0, tanpa error).

### 📊 Total halaman saat ini: 41 route
17 halaman UI (9 admin + 7 employee + login + register) + 24 API route + 1 root redirect.

- [x] Design tokens (`globals.css`) diadaptasi dari referensi: sidebar gelap icon-only, gradient pink→lavender, rounded besar, font Plus Jakarta Sans
- [x] **Login page** (`/login`) — form email/password, validasi dasar, siap di-wire ke BetterAuth client
- [x] **Register page** (`/register`) — 2-step flow: info perusahaan → akun superadmin (karena sistem multi-tenant)
- [x] **Sidebar** component (icon-only dark, reusable di semua halaman admin)
- [x] **Topbar** component (search + notifikasi + profil, sesuai referensi)
- [x] **StatusBadge** component (pill berwarna, dipakai untuk status presensi/SOS/dll)
- [x] **Dashboard Admin** (`/dashboard`) — layout 2-kolom: stat cards, hero quick-action card, detail patroli aktif, list aktivitas pegawai, placeholder peta live tracking
- [x] **Dashboard Employee** (`/home`) — mobile-first, hero check-in card, 3 quick action (Patroli/Izin/SOS), riwayat aktivitas
- [x] Mock data layer (`lib/mock/data.ts`) — struktur mirip response API asli, supaya gampang di-swap nanti ke fetch API
- [x] **Bug fix:** ditemukan & diperbaiki konflik Next.js routing — `payroll/[userId]/...` vs `payroll/[id]/publish` tidak boleh beda nama dynamic segment di path sama. Solusi: endpoint publish dipindah ke `/api/v1/payroll/records/[recordId]/publish`
- [x] Production build **lolos bersih**, 28 route ter-generate tanpa error (`npm run build`)

### ⚠️ Breaking change kecil dari dokumentasi sebelumnya
Endpoint publish payroll **berubah path**:
- ~~`POST /api/v1/payroll/:id/publish`~~ (lama, konflik dengan routing Next.js)
- **`POST /api/v1/payroll/records/:recordId/publish`** (baru, sudah benar & terverifikasi build)

## 🎮 Status: Phase 1 + Phase 2 Selesai

**Phase 1 — Foundation**
- [x] Setup Next.js + TypeScript + Tailwind
- [x] DrizzleORM + PostgreSQL connection
- [x] BetterAuth configuration (email/password) + route handler (`/api/auth/[...all]`)
- [x] Schema lengkap: companies, roles, users, positions, payroll_components
- [x] Schema operations: locations, attendances, leaves, patrols, patrol_logs, patrol_tracks, activities
- [x] Schema reports: sos_reports, salary_records
- [x] Zod validation untuk semua endpoint
- [x] Utility: Haversine distance + geofence validator (anti-fake GPS)
- [x] Utility: Payroll calculator
- [x] Utility: **Role Guard** (`requireAuth`, `requireRole`, `requireAuthWithRole`)
- [x] API: POST `/api/v1/attendance/check-in` (dengan geofence + fake GPS detection)
- [x] API: POST `/api/v1/attendance/check-out`
- [x] API: POST `/api/v1/sos` + GET (list)
- [x] API: GET/POST `/api/v1/locations`

**Phase 2 — Core Operations API**
- [x] API: GET/POST `/api/v1/users` (list + tambah pegawai, sekaligus sign-up via BetterAuth)
- [x] API: GET/PATCH/DELETE `/api/v1/users/:id` (detail, update, soft-delete/nonaktifkan)
- [x] API: GET `/api/v1/users/me` (profil sendiri)
- [x] API: GET/POST `/api/v1/positions` (manajemen jabatan)
- [x] API: GET/POST `/api/v1/positions/:id/components` (tunjangan & potongan per jabatan)
- [x] API: GET/POST `/api/v1/leaves` (ajukan izin/cuti)
- [x] API: GET `/api/v1/leaves/:id` (detail pengajuan)
- [x] API: PATCH `/api/v1/leaves/:id/review` (approve/reject oleh Admin/HRD)
**Phase 3 — Patrol System, Activities, Payroll Processing**
- [x] Schema update: `positions.base_salary` ditambahkan (model **flat per jabatan**)
- [x] API: GET/POST `/api/v1/locations/:id/checkpoints` (kelola titik QR patroli, auto-generate kode QR unik)
- [x] API: POST `/api/v1/patrols/start` (mulai sesi, wajib dalam radius lokasi)
- [x] API: POST `/api/v1/patrols/:id/scan` (scan QR checkpoint — validasi rute, anti-scan-dobel, validasi jarak GPS)
- [x] API: POST `/api/v1/patrols/:id/track` (batch GPS breadcrumb, auto-hitung total jarak tempuh)
- [x] API: POST `/api/v1/patrols/:id/end` (akhiri sesi, hitung completion rate checkpoint)
- [x] API: GET `/api/v1/patrols` (list, role-aware)
- [x] API: GET `/api/v1/patrols/:id` (detail + logs + tracks — siap dipakai untuk replay rute di peta)
- [x] API: GET/POST `/api/v1/activities` (log aktivitas + bukti foto, role-aware)
- [x] API: POST `/api/v1/payroll/process` (kalkulasi payroll massal, upsert per periode, skip yang sudah published)
- [x] API: GET `/api/v1/payroll` (list rekap, filter bulan/tahun)
- [x] API: GET `/api/v1/payroll/:userId/:year/:month` (slip gaji individual, karyawan hanya bisa lihat yang published)
- [x] API: POST `/api/v1/payroll/:id/publish` (publish slip ke karyawan)
- [x] Type-check lolos tanpa error ✅

## 🚀 Cara Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Setup Database
Kamu butuh PostgreSQL. Bisa pakai:
- **Lokal:** install PostgreSQL di komputer/server
- **Cloud gratis:** [Neon](https://neon.tech), [Supabase](https://supabase.com), atau [Railway](https://railway.app)

Setelah dapat connection string, edit `.env.local`:
```bash
DATABASE_URL="postgresql://user:password@host:5432/field_erp"
BETTER_AUTH_SECRET="generate-random-32-char-string-disini"
```

> Generate secret: jalankan `openssl rand -base64 32` di terminal.

### 3. Push schema ke database
```bash
npm run db:push
```
Ini akan langsung membuat semua tabel di database tanpa perlu migration file (cocok untuk development awal).

Kalau nanti sudah mau production-ready dan butuh migration history:
```bash
npm run db:generate   # generate file migration dari schema
npm run db:migrate    # jalankan migration ke database
```

### 4. Cek database dengan Drizzle Studio (opsional, tapi sangat membantu)
```bash
npm run db:studio
```
Ini akan buka GUI di browser untuk lihat & edit data langsung — seperti "inventory viewer" di game.

### 6. Buat user pertama (Superadmin) — WAJIB sebelum bisa login

Tabel `users` masih kosong setelah `db:push`. Untuk membuat akun pertama, jalankan:

```bash
npm run seed
```

Script ini akan otomatis membuat:
- 1 company (default: **Macrosoft**, kode `MCS-01`)
- 1 role **Superadmin** dengan semua permission
- 1 user superadmin dengan email & password yang sudah di-set di `scripts/seed.ts`

Setelah berhasil, kamu akan lihat output seperti:
```
✅ User superadmin dibuat: vigo@mail.co
✨ Seeding selesai! Kamu sekarang bisa login dengan:
   Email    : vigo@mail.co
   Password : vigo12345
```

> **Aman dijalankan berkali-kali** — kalau company/role/user sudah ada, otomatis di-skip (tidak akan duplikat). Mau ganti nama perusahaan/email/password? Edit langsung di `scripts/seed.ts` bagian `SEED_COMPANY` dan `SEED_SUPERADMIN` sebelum menjalankan `npm run seed`.

### 7. Jalankan development server
```bash
npm run dev
```
Buka `http://localhost:3000` → login dengan akun yang baru dibuat tadi.

## 📁 Struktur Folder Penting

```
src/
├── db/
│   ├── index.ts              # Koneksi database
│   └── schema/
│       ├── core.ts            # companies, roles, users, positions, BetterAuth tables
│       ├── operations.ts      # locations, attendances, patrols, activities
│       └── reports.ts         # sos_reports, salary_records
│
├── lib/
│   ├── auth.ts                 # Konfigurasi BetterAuth
│   ├── validations/index.ts    # Semua Zod schema validasi
│   └── utils/
│       ├── geo.ts               # Haversine + geofence validator
│       └── payroll.ts           # Kalkulasi gaji otomatis
│
└── app/api/
    ├── auth/[...all]/route.ts      # BetterAuth catch-all handler
    └── v1/
        ├── users/
        │   ├── route.ts              # GET (list), POST (tambah pegawai)
        │   ├── me/route.ts           # GET — profil sendiri
        │   └── [id]/route.ts         # GET/PATCH/DELETE — detail per pegawai
        ├── positions/
        │   ├── route.ts              # GET, POST — manajemen jabatan
        │   └── [id]/components/route.ts  # GET, POST — tunjangan & potongan
        ├── leaves/
        │   ├── route.ts              # GET, POST — pengajuan izin/cuti
        │   └── [id]/
        │       ├── route.ts          # GET — detail pengajuan
        │       └── review/route.ts   # PATCH — approve/reject (Admin/HRD)
        ├── attendance/
        │   ├── check-in/route.ts     # POST — absen masuk + validasi GPS
        │   └── check-out/route.ts    # POST — absen keluar + hitung jam kerja
        ├── locations/
        │   ├── route.ts               # GET, POST — manajemen gedung
        │   └── [id]/checkpoints/route.ts  # GET, POST — titik QR patroli
        ├── patrols/
        │   ├── route.ts               # GET — list sesi patroli
        │   ├── start/route.ts         # POST — mulai sesi
        │   └── [id]/
        │       ├── route.ts           # GET — detail + logs + tracks (untuk replay peta)
        │       ├── scan/route.ts      # POST — scan QR checkpoint
        │       ├── track/route.ts     # POST — batch GPS breadcrumb
        │       └── end/route.ts       # POST — akhiri sesi
        ├── activities/route.ts        # GET, POST — log aktivitas + foto
        ├── payroll/
        │   ├── route.ts                          # GET — list rekap gaji
        │   ├── process/route.ts                   # POST — proses payroll massal
        │   ├── [id]/publish/route.ts              # POST — publish slip ke karyawan
        │   └── [userId]/[year]/[month]/route.ts   # GET — slip gaji individual
        └── sos/route.ts               # GET, POST — laporan darurat
```

## ⚠️ Yang Masih Perlu Dikerjakan (TODO Phase 4+)

1. **Photo Upload** — saat ini placeholder di check-in/check-out, perlu integrasi storage (S3, Cloudinary, atau Vercel Blob). Endpoint `activities` & `patrols/scan` sudah terima `photo_url` langsung (asumsi upload dilakukan terpisah dulu di FE/mobile), tapi check-in/check-out masih kirim `photo_base64` mentah yang perlu diproses.
2. **Seed data** — data dummy untuk testing. Perlu seed script khusus untuk membuat superadmin pertama (karena `POST /users` butuh sesi admin yang sudah ada — ayam-telur problem untuk user pertama)
3. **Rate limiting** — endpoint `check-in`, `sos`, dan `patrols/:id/track` idealnya dibatasi supaya tidak disalahgunakan/spam
4. **QR Code image generation** — endpoint checkpoint baru generate *string* QR code (`location_code-randomtoken`), belum generate gambar QR-nya. Perlu library seperti `qrcode` npm package, kemungkinan di-generate di sisi FE saat render halaman checkpoint.
5. **Notifikasi real-time untuk SOS** — saat ini SOS hanya tersimpan ke DB, belum ada push notification/websocket ke admin
6. **Dashboard summary endpoint** — belum ada endpoint khusus untuk angka ringkasan dashboard (total pegawai, hadir hari ini, izin pending, dll — seperti yang terlihat di screenshot ARS)
7. **Export Excel/PDF** — untuk rekap presensi & payroll, belum ada endpoint export

## 🔑 Cara Test API (setelah auth route jadi)

Karena BetterAuth route handler belum dibuat di paket ini, test API butuh:
1. Buat route `/api/auth/[...all]/route.ts` (export dari `auth.handler`)
2. Sign-up user pertama via endpoint BetterAuth
3. Pakai cookie session untuk akses endpoint lain

## 💡 Catatan Desain (Kenapa begini)

- **Multi-tenant via `company_id`** — semua data terisolasi per perusahaan, supaya nanti bisa dijual sebagai SaaS ke banyak klien sekaligus, bukan cuma 1 perusahaan.
- **`is_fake_gps` bukan blocker keras** — data absen tetap tersimpan walau mencurigakan, supaya admin bisa review manual. Kalau langsung di-block, karyawan jujur yang sinyal GPS-nya lemah jadi tidak bisa absen sama sekali.
- **Unique index per (user, date, location)** — mencegah satu karyawan absen dobel di hari & lokasi yang sama.
- **`patrol_tracks` dikirim batch** — bukan per-detik, supaya hemat bandwidth & battery di HP karyawan lapangan.

---
*Generated for Field ERP System — Bjorka Project, Phase 1*
