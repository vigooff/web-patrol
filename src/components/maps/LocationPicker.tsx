'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialRadius?: number;
  onLocationChange?: (lat: number, lng: number, radius: number) => void;
  readonly?: boolean;
  height?: string;
}

export default function LocationPicker({
  initialLat = -7.2575,
  initialLng = 112.7521,
  initialRadius = 100,
  onLocationChange,
  readonly = false,
  height = '400px',
}: LocationPickerProps) {
    const mapRef         = useRef<HTMLDivElement>(null);
  const leafletRef     = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef      = useRef<any>(null);
  const circleRef      = useRef<any>(null);

  const [lat, setLat]         = useState(initialLat);
  const [lng, setLng]         = useState(initialLng);
  const [radius, setRadius]   = useState(initialRadius);
  const [isReady, setIsReady] = useState(false);

  // Handler Leaflet dibuat sekali, jadi baca nilai terbaru lewat ref
  const radiusRef   = useRef(initialRadius);
  const onChangeRef = useRef(onLocationChange);
  useEffect(() => { radiusRef.current = radius; }, [radius]);
  useEffect(() => { onChangeRef.current = onLocationChange; });

  // Init Leaflet — harus dynamic import karena butuh window
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      // Dev (StrictMode) menjalankan effect 2x: effect yang sudah dibatalkan
      // tidak boleh membuat map kedua di container yang sama.
      if (cancelled || mapInstanceRef.current || !mapRef.current) return;
      leafletRef.current = L;

      // Fix default marker icon path (known issue dengan bundler)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        center: [initialLat, initialLng],
        zoom: 16,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([initialLat, initialLng], {
        draggable: !readonly,
      }).addTo(map);

      const circle = L.circle([initialLat, initialLng], {
        radius:      initialRadius,
        color:       '#131316',
        fillColor:   '#131316',
        fillOpacity: 0.08,
        weight:      2,
      }).addTo(map);

      if (!readonly) {
        map.on('click', (e: any) => {
          const { lat: newLat, lng: newLng } = e.latlng;
          marker.setLatLng([newLat, newLng]);
          circle.setLatLng([newLat, newLng]);
          setLat(parseFloat(newLat.toFixed(7)));
          setLng(parseFloat(newLng.toFixed(7)));
          onChangeRef.current?.(
            parseFloat(newLat.toFixed(7)),
            parseFloat(newLng.toFixed(7)),
            radiusRef.current,
          );
        });

        marker.on('dragend', (e: any) => {
          const { lat: newLat, lng: newLng } = e.target.getLatLng();
          circle.setLatLng([newLat, newLng]);
          setLat(parseFloat(newLat.toFixed(7)));
          setLng(parseFloat(newLng.toFixed(7)));
          onChangeRef.current?.(
            parseFloat(newLat.toFixed(7)),
            parseFloat(newLng.toFixed(7)),
            radiusRef.current,
          );
        });
      }

      mapInstanceRef.current = map;
      markerRef.current      = marker;
      circleRef.current      = circle;
      setIsReady(true);
    });

    return () => {
      cancelled = true;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update circle radius saat slider berubah
  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.setRadius(radius);
    onLocationChange?.(lat, lng, radius);
  }, [radius]);

  return (
    <div className="flex flex-col gap-3">
      {/* Map container */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height }}>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <div ref={mapRef} className="w-full h-full" />

        {!isReady && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'var(--bg-card-soft)' }}
          >
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Memuat peta...
            </p>
          </div>
        )}
      </div>

      {/* Koordinat + radius info */}
      <div
        className="grid grid-cols-3 gap-3 p-4 rounded-2xl"
        style={{ background: 'var(--bg-card-soft)' }}
      >
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            Latitude
          </p>
          <p className="text-sm font-bold font-mono">{lat}</p>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            Longitude
          </p>
          <p className="text-sm font-bold font-mono">{lng}</p>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            Radius Geofence
          </p>
          <p className="text-sm font-bold">{radius} meter</p>
        </div>
      </div>

      {/* Radius slider — hanya muncul kalau bukan readonly */}
      {!readonly && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Atur Radius Geofencing
            </label>
            <span className="text-xs font-bold">{radius}m</span>
          </div>
          <input
            type="range"
            min={30}
            max={1000}
            step={10}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full accent-black"
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>30m (ketat)</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>1000m (longgar)</span>
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            💡 Klik di peta atau drag marker untuk memindahkan titik lokasi
          </p>
        </div>
      )}
    </div>
  );
}
