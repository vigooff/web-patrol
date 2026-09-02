/**
 * Menghitung jarak antara 2 titik GPS menggunakan Haversine formula.
 * Ibarat karakter di RPG, ini "range calculator" untuk cek apakah
 * target masuk dalam area skill/spell atau tidak.
 *
 * @returns Jarak dalam meter
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R   = 6_371_000; // radius bumi (meter)
  const φ1  = (lat1 * Math.PI) / 180;
  const φ2  = (lat2 * Math.PI) / 180;
  const Δφ  = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ  = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Validasi apakah koordinat user masuk dalam radius geofence lokasi.
 * Juga deteksi kemungkinan GPS palsu dari data device.
 */
export function validateGeofence(params: {
  userLat:         number;
  userLng:         number;
  locationLat:     number;
  locationLng:     number;
  radiusMeters:    number;
  accuracyMeters?: number;   // dari device (GPS accuracy)
  isMockLocation?: boolean;  // dari device (mock location flag)
}): {
  isWithinRadius:   boolean;
  distanceMeters:   number;
  isSuspicious:     boolean;
  suspicionReasons: string[];
} {
  const {
    userLat, userLng,
    locationLat, locationLng,
    radiusMeters,
    accuracyMeters  = 0,
    isMockLocation  = false,
  } = params;

  const distance = haversineDistance(userLat, userLng, locationLat, locationLng);
  const suspicionReasons: string[] = [];

  // Cek mock location flag dari device
  if (isMockLocation) {
    suspicionReasons.push('Device melaporkan mock location aktif');
  }

  // GPS accuracy > 100m = sangat mencurigakan (sinyal jelek atau fake)
  if (accuracyMeters > 100) {
    suspicionReasons.push(`Akurasi GPS terlalu rendah: ${accuracyMeters}m`);
  }

  // Koordinat invalid (0,0 = null island)
  if (userLat === 0 && userLng === 0) {
    suspicionReasons.push('Koordinat tidak valid (0,0)');
  }

  // Validasi range koordinat wajar
  if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    suspicionReasons.push('Koordinat di luar range valid');
  }

  return {
    isWithinRadius:   distance <= radiusMeters,
    distanceMeters:   Math.round(distance),
    isSuspicious:     suspicionReasons.length > 0,
    suspicionReasons,
  };
}
