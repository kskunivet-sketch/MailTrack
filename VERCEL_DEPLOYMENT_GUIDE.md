# 🚀 MailTrack Pro — Panduan Deploy ke Vercel

## Ringkasan Audit Keamanan

Sebelum push, berikut yang sudah diperbaiki:

| Masalah | Status | Detail |
|---------|--------|--------|
| `bridge/config_cache*.json` berisi password DB & path jaringan | ✅ Fixed | Dihapus dari git tracking |
| `bridge/latest_data_*.json` data surat 600KB+ di git | ✅ Fixed | Dihapus dari git tracking |
| `/api/proxy-drive` Open Proxy (SSRF vulnerability) | ✅ Fixed | Whitelist hanya Google Drive domains |
| `.gitignore` tidak cover semua file sensitif | ✅ Fixed | Ditambah 20+ entry baru |
| `vercel.json` ada placeholder Postgres tidak terpakai | ✅ Fixed | Dibersihkan + security headers |
| `.env.local.example` kurang variabel backup URL | ✅ Fixed | Ditambah semua variabel |

> **PENTING**: File berikut **TIDAK** akan ter-push ke GitHub (sudah di `.gitignore`):
> - `.env.local`, `.env.secrets` — API keys
> - `bridge/serviceAccountKey.json` — Firebase admin private key
> - `bridge/credentials.json` — Google OAuth client secret
> - `bridge/token.json` — OAuth refresh token
> - `bridge/config_cache*.json` — DB path & password
> - `bridge/latest_data*.json` — Data surat
> - `bridge/.env` — Bridge environment
> - Semua `*.accdb`, `*.log`, `tmp*` files

---

## Langkah 1: Push ke GitHub

Buka terminal PowerShell di folder MailTrack kamu:

```powershell
# Cek status - pastikan tidak ada file sensitif
git status

# Add semua perubahan
git add .

# Verifikasi TIDAK ADA file rahasia yang masuk staging
git diff --cached --name-only | Select-String -Pattern "serviceAccount|credentials|token\.json|\.env\.local$|\.env\.secrets|config_cache"
# ↑ Perintah ini HARUS menghasilkan output KOSONG. Jika ada hasil, hentikan dan hapus file tersebut dari git cache!

# Commit
git commit -m "chore: secure for Vercel deployment - fix SSRF proxy, remove tracked secrets"

# Push ke GitHub (buat repository di GitHub terlebih dahulu jika belum)
# git remote add origin https://github.com/USERNAME/namarepo.git
git push -u origin master
```

---

## Langkah 2: Setup Vercel

### 2a. Import Project

1. Buka **[vercel.com](https://vercel.com)** → Login dengan GitHub
2. Klik **"Add New Project"**
3. Pilih repository **MailTrack** dari daftar
4. Framework Preset: **Next.js** (otomatis terdeteksi)
5. Root Directory: **`./`** (biarkan default)
6. **JANGAN klik Deploy dulu!** → Lanjut ke setting Environment Variables

### 2b. Set Environment Variables

Di halaman project → buka bagian **Environment Variables**, lalu tambahkan:

| Variable Name | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `AIzaSyDBcS3LvnNFNyIAI1KLstTOE2LlsV0slJY` | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `mailtrack-c841d.firebaseapp.com` | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `mailtrack-c841d` | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `mailtrack-c841d.firebasestorage.app` | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `352867388086` | Production, Preview, Development |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `1:352867388086:web:23fcc3426b53625bfc3417` | Production, Preview, Development |
| `NEXT_PUBLIC_BACKUP_JSON_URL` | `https://drive.google.com/file/d/1H9pr_wlK3O2MOQWmlvi3iWGcqAoc9Gc9` | Production, Preview, Development |
| `NEXT_PUBLIC_BACKUP_JSON_URL_KELUAR` | `https://drive.google.com/file/d/1j_wI0GDV6malXv7n80KUMjyFL5e80GQn` | Production, Preview, Development |

> **TIPS**: Kamu juga bisa menggunakan mode paste `.env` file jika tidak ingin memasukkan satu persatu.

### 2c. Deploy

1. Setelah semua Environment Variables ditambahkan
2. Klik **"Deploy"**
3. Tunggu build selesai (~1-2 menit)
4. Copas URL Vercel kamu (misal: `https://mailtrack-xxxxx.vercel.app`) untuk langkah 3

---

## Langkah 3: Konfigurasi Firebase (PENTING!)

### Tambahkan Domain Vercel ke Firebase Auth

1. Buka **[Firebase Console](https://console.firebase.google.com)** → Project `mailtrack-c841d`
2. Masuk ke menu **Authentication** → tab **Settings** → menu **Authorized domains**
3. Klik **"Add domain"**
4. Paste URL aplikasi Vercel kamu (contoh: `mailtrack-xxxxx.vercel.app`, **tanpa** `https://`)
5. Jika kamu nanti menambahkan custom domain dari Vercel (misal `agendasurat.com`), kamu juga wajib menambahkannya di sini.

> **AWAS**: Tanpa langkah ini, proses login/register akan **GAGAL** dengan pesan error `auth/unauthorized-domain` di Vercel!

---

## FAQ (Pertanyaan Umum)

**Q: Apakah API Key Firebase di atas aman (bukan rahasia)?**
**Ya**. API Key milik Firebase Web / Client-Side memang didesain secara publik. Yang menjamin keamanannya agar tidak disalahgunakan orang lain adalah **Firestore Security Rules** yang mewajibkan otentikasi.

**Q: Bridge di panel Vercel katanya log error / offline?**
Ini wajar. Karena script Bridge (Python) jalan di PC server kantormu, bukan di hosting Vercel. Di web Vercel, ia otomatis membaca status dari Firestore.

**Q: Saya mau merubah domainnya, bagaimana?**
Ubah di setting Vercel (Domains), lalu jangan lupa WAJIB tambahkan domain barunya ke Firebase Auth (lihat Langkah 3).
