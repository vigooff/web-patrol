import { Geolocation, type PermissionStatus } from '@capacitor/geolocation';
import { isNativePlatform } from '../utils/platform';

/**
 * Geolocation bridge — "adapter" biar semua halaman yang butuh GPS
 * (check-in, patroli, SOS) nggak perlu tahu apakah lagi jalan di
 * native app atau browser biasa. Signature sengaja dibuat mirip
 * `navigator.geolocation` biar migrasi dari kode lama minim perubahan.
 *
 * ⚠️ CATATAN PENTING soal anti-fake-GPS:
 * Plugin resmi @capacitor/geolocation TIDAK menyediakan flag
 * "isFromMockProvider" dari Android. Jadi field `isMockLocation` di
 * bawah ini masih `undefined` di native app — sama seperti kondisi
 * sebelumnya di web (selalu dikirim `false` secara hardcoded di
 * attendance/page.tsx). Untuk deteksi mock-location yang REAL, perlu
 * custom native plugin kecil yang manggil Location.isFromMockProvider()
 * di sisi Android — ini masih jadi TODO terpisah, belum diselesaikan
 * di iterasi ini.
 */

export interface BridgePosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: number;
  isMockLocation?: boolean; // lihat catatan di atas — belum reliable
}

export interface BridgePositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

function toBridgePosition(pos: {
  coords: { latitude: number; longitude: number; accuracy: number };
  timestamp: number;
}): BridgePosition {
  return {
    coords: {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    },
    timestamp: pos.timestamp,
    isMockLocation: undefined,
  };
}

/** Minta izin lokasi secara eksplisit — dipanggil sebelum tampilkan rationale/permission dialog. */
export async function requestLocationPermission(): Promise<boolean> {
  if (!isNativePlatform()) return true; // browser urus izinnya sendiri lewat prompt native browser

  const current: PermissionStatus = await Geolocation.checkPermissions();
  if (current.location === 'granted' || current.coarseLocation === 'granted') return true;

  const requested = await Geolocation.requestPermissions();
  return requested.location === 'granted' || requested.coarseLocation === 'granted';
}

/** Setara `navigator.geolocation.getCurrentPosition` — dipakai di check-in & SOS. */
export async function getCurrentPosition(
  onSuccess: (pos: BridgePosition) => void,
  onError?: (err: unknown) => void,
  options?: BridgePositionOptions,
): Promise<void> {
  try {
    if (isNativePlatform()) {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge,
      });
      onSuccess(toBridgePosition(pos));
    } else {
      navigator.geolocation?.getCurrentPosition(
        (pos) => onSuccess(toBridgePosition(pos)),
        (err) => onError?.(err),
        options,
      );
    }
  } catch (err) {
    onError?.(err);
  }
}

/**
 * Setara `navigator.geolocation.watchPosition` — dipakai di halaman patroli.
 * Return watchId (string di native, number di web) — treat sebagai opaque
 * value, cukup dipassing balik ke `clearWatch`.
 */
export async function watchPosition(
  onSuccess: (pos: BridgePosition) => void,
  onError?: (err: unknown) => void,
  options?: BridgePositionOptions,
): Promise<string | number | null> {
  if (isNativePlatform()) {
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: options?.enableHighAccuracy ?? true,
          timeout: options?.timeout ?? 10000,
        },
        (pos, err) => {
          if (err || !pos) {
            onError?.(err);
            return;
          }
          onSuccess(toBridgePosition(pos));
        },
      );
      return watchId;
    } catch (err) {
      onError?.(err);
      return null;
    }
  }

  const id = navigator.geolocation?.watchPosition(
    (pos) => onSuccess(toBridgePosition(pos)),
    (err) => onError?.(err),
    options,
  );
  return id ?? null;
}

/** Setara `navigator.geolocation.clearWatch`. */
export async function clearWatch(watchId: string | number | null): Promise<void> {
  if (watchId === null) return;

  if (isNativePlatform()) {
    await Geolocation.clearWatch({ id: String(watchId) });
  } else if (typeof watchId === 'number') {
    navigator.geolocation?.clearWatch(watchId);
  }
}
