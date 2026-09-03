import type { CapacitorConfig } from '@capacitor/cli';

// ⚠️ PENTING: appId TIDAK BISA diganti setelah app pertama kali di-publish
// ke Play Store. Ganti ke domain/nama resmi client SEBELUM build production
// pertama. Format: reverse-domain, semua huruf kecil.
const config: CapacitorConfig = {
  appId: 'com.webpatrol.app', // TODO: ganti sebelum publish pertama (immutable!)
  appName: 'Field ERP',
  webDir: 'public', // tidak dipakai di mode server.url, tapi tetap wajib diisi

  // Mode "live server": WebView Capacitor memuat app dari URL production
  // yang sudah di-deploy, BUKAN dari static export lokal. Ini dipilih karena
  // Next.js App Router pakai API routes server-side yang tidak cocok
  // di-static-export penuh.
  server: {
    // TODO: ganti ke domain production sebelum build release.
    // Untuk development lokal, override lewat capacitor.config.local.ts
    // atau env var — lihat catatan di lib/native/platform.ts
    url: 'https://webpatrol.example.com',
    cleartext: false, // wajib HTTPS di production
    androidScheme: 'https',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f172a', // sesuaikan dengan warna brand dashboard (dark sidebar)
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  android: {
    allowMixedContent: false,
  },
};

export default config;
