'use client';

import { useEffect, useRef } from 'react';

interface Track {
  latitude: string;
  longitude: string;
  recorded_at: string;
}

interface Log {
  checkpoint_name: string;
  latitude: string | null;
  longitude: string | null;
  is_valid: boolean;
  scanned_at: string;
}

interface PatrolReplayMapProps {
  tracks: Track[];
  logs: Log[];
  height?: string;
}

export default function PatrolReplayMap({ tracks, logs, height = '500px' }: PatrolReplayMapProps) {
  const mapRef      = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current || tracks.length === 0) return;

    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Koordinat pertama sebagai center
      const firstTrack = tracks[0];
      const map = L.map(mapRef.current!, {
        center: [parseFloat(firstTrack.latitude), parseFloat(firstTrack.longitude)],
        zoom:   17,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Polyline rute GPS
      const latlngs = tracks.map((t) => [parseFloat(t.latitude), parseFloat(t.longitude)] as [number, number]);

      L.polyline(latlngs, {
        color:  '#131316',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);

      // Marker start
      L.circleMarker(latlngs[0], {
        radius: 8, fillColor: '#1B8A4B', color: 'white',
        fillOpacity: 1, weight: 2,
      })
        .addTo(map)
        .bindPopup('<b>Mulai Patroli</b>');

      // Marker end (kalau ada lebih dari 1 titik)
      if (latlngs.length > 1) {
        L.circleMarker(latlngs[latlngs.length - 1], {
          radius: 8, fillColor: '#C8302E', color: 'white',
          fillOpacity: 1, weight: 2,
        })
          .addTo(map)
          .bindPopup('<b>Terakhir Terekam</b>');
      }

      // Marker checkpoint yang di-scan
      logs.forEach((log) => {
        if (!log.latitude || !log.longitude) return;
        const lat = parseFloat(log.latitude);
        const lng = parseFloat(log.longitude);

        L.circleMarker([lat, lng], {
          radius: 6,
          fillColor:  log.is_valid ? '#2563D4' : '#B7791F',
          color:      'white',
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(`
            <b>${log.checkpoint_name}</b><br/>
            ${new Date(log.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}<br/>
            ${log.is_valid ? '✓ GPS valid' : '⚠ GPS di luar radius'}
          `);
      });

      // Fit map ke semua titik
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [40, 40] });

      mapInstance.current = map;
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [tracks, logs]);

  return (
    <div className="flex flex-col gap-3">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full rounded-2xl overflow-hidden" style={{ height }} />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: '#1B8A4B', label: 'Titik Mulai' },
          { color: '#C8302E', label: 'Titik Terakhir' },
          { color: '#2563D4', label: 'Checkpoint (Valid)' },
          { color: '#B7791F', label: 'Checkpoint (GPS Jauh)' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-white" style={{ background: item.color, boxShadow: `0 0 0 1px ${item.color}` }} />
            <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
