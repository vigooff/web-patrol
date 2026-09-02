'use client';

import { useState, useEffect } from 'react';
import { Camera, MapPin, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useFetch } from '@/lib/hooks/useFetch';
import { PhotoCapture } from '@/components/ui/PhotoCapture';

interface TodayAttendance {
  id: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  work_hours: string | null;
  is_fake_gps: boolean;
}

interface AttendanceHistory {
  id: string;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  work_hours: string | null;
}

interface Location {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: number | null;
}

const statusLabel: Record<string, string> = {
  present: 'Hadir',
  sick:    'Sakit',
  leave:   'Izin',
  absent:  'Alpa',
};

const statusColor: Record<string, string> = {
  present: 'var(--status-success-text)',
  sick:    'var(--status-warning-text)',
  leave:   'var(--status-info-text)',
  absent:  'var(--status-danger-text)',
};

function formatTime(ts: string | null) {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function EmployeeAttendancePage() {
  const { data: today,   refetch: refetchToday } = useFetch<TodayAttendance | null>('/api/v1/attendance/today');
  const { data: history }                         = useFetch<AttendanceHistory[]>('/api/v1/attendance/history');
  const { data: locations }                       = useFetch<Location[]>('/api/v1/locations');

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPos, setCurrentPos]     = useState<GeolocationPosition | null>(null);
  const [photoBase64, setPhotoBase64]   = useState<string>('placeholder');
  const [photoUrl,    setPhotoUrl]      = useState<string>('');

  // Ambil posisi GPS saat halaman dibuka
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setCurrentPos(pos),
      () => setMessage({ type: 'error', text: 'Tidak bisa mendapatkan lokasi GPS. Pastikan izin lokasi diaktifkan.' }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const isCheckedIn  = !!today?.check_in_time;
  const isCheckedOut = !!today?.check_out_time;
  const defaultLoc   = locations?.[0];

  async function handleCheckIn() {
    if (!currentPos) {
      setMessage({ type: 'error', text: 'Lokasi GPS belum siap. Tunggu sebentar atau refresh halaman.' });
      return;
    }
    if (!defaultLoc) {
      setMessage({ type: 'error', text: 'Tidak ada lokasi terdaftar. Hubungi admin.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id:  defaultLoc.id,
          latitude:     currentPos.coords.latitude,
          longitude:    currentPos.coords.longitude,
          photo_base64: photoBase64,
          device_info: {
            is_mock_location: false,
            accuracy_meters:  currentPos.coords.accuracy,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error ?? 'Gagal check-in' });
        return;
      }

      setMessage({
        type: 'success',
        text: data.data.warning
          ? `Check-in berhasil. Peringatan: ${data.data.warning}`
          : `Check-in berhasil! Jarak dari lokasi: ${data.data.distance_from_location}m`,
      });
      refetchToday();

    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCheckOut() {
    if (!today?.id) return;
    if (!currentPos) {
      setMessage({ type: 'error', text: 'Lokasi GPS belum siap.' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: today.id,
          latitude:      currentPos.coords.latitude,
          longitude:     currentPos.coords.longitude,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error ?? 'Gagal check-out' });
        return;
      }

      setMessage({
        type: 'success',
        text: `Check-out berhasil! Total jam kerja: ${Number(data.data.work_hours).toFixed(1)} jam`,
      });
      refetchToday();

    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-1">Presensi</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        Riwayat dan status kehadiran Anda
      </p>

      {/* Status hari ini */}
      <div
        className="rounded-3xl p-6 mb-6"
        style={{ background: 'linear-gradient(135deg, var(--gradient-pink-start), var(--gradient-blue-end))' }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin size={14} color="var(--text-secondary)" />
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {defaultLoc?.name ?? 'Memuat lokasi...'}
          </p>
        </div>

        {isCheckedIn ? (
          <>
            <h2 className="text-lg font-bold mb-3">
              {isCheckedOut ? 'Selesai Bertugas' : 'Sedang Bertugas'}
            </h2>
            <div className="flex gap-6 mb-4">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Masuk</p>
                <p className="text-base font-bold">{formatTime(today?.check_in_time)}</p>
              </div>
              {isCheckedOut && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Keluar</p>
                  <p className="text-base font-bold">{formatTime(today?.check_out_time)}</p>
                </div>
              )}
              {today?.work_hours && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Jam Kerja</p>
                  <p className="text-base font-bold">{Number(today.work_hours).toFixed(1)}j</p>
                </div>
              )}
            </div>

            {!isCheckedOut && (
              <button
                onClick={handleCheckOut}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'var(--accent-black)' }}
              >
                <Camera size={17} />
                {isProcessing ? 'Memproses...' : 'Check-out Sekarang'}
              </button>
            )}
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-1">Belum Check-in</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              {currentPos
                ? `GPS aktif — Akurasi: ±${Math.round(currentPos.coords.accuracy)}m`
                : 'Mendapatkan lokasi GPS...'}
            </p>
            <div className="mb-4 w-full">
              <PhotoCapture
                label="Ambil Selfie untuk Check-in"
                onPhotoReady={(url) => setPhotoUrl(url)}
                onPhotoBase64={(b64) => setPhotoBase64(b64)}
              />
            </div>
            <button
              onClick={handleCheckIn}
              disabled={isProcessing || !currentPos}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'var(--accent-black)' }}
            >
              <Camera size={17} />
              {isProcessing ? 'Memproses...' : 'Check-in Sekarang'}
            </button>
          </>
        )}

        {/* Pesan sukses/error */}
        {message && (
          <div
            className="mt-3 flex items-start gap-2 px-4 py-3 rounded-2xl"
            style={{
              background: message.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
            }}
          >
            {message.type === 'success'
              ? <CheckCircle2 size={15} color="var(--status-success-text)" className="shrink-0 mt-0.5" />
              : <AlertCircle  size={15} color="var(--status-danger-text)"  className="shrink-0 mt-0.5" />
            }
            <p
              className="text-xs font-semibold"
              style={{ color: message.type === 'success' ? 'var(--status-success-text)' : 'var(--status-danger-text)' }}
            >
              {message.text}
            </p>
          </div>
        )}
      </div>

      {/* Riwayat */}
      <div
        className="rounded-3xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <h3 className="text-sm font-bold mb-4">Riwayat Presensi</h3>
        {history && history.length > 0 ? (
          <div className="flex flex-col gap-4">
            {history.slice(0, 10).map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <CheckCircle2 size={18} color={statusColor[h.status] ?? 'var(--text-muted)'} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{h.date}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {formatTime(h.check_in_time)} — {formatTime(h.check_out_time)}
                    {h.work_hours ? ` · ${Number(h.work_hours).toFixed(1)}j` : ''}
                  </p>
                </div>
                <span className="text-xs font-bold" style={{ color: statusColor[h.status] }}>
                  {statusLabel[h.status] ?? h.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Belum ada riwayat presensi
          </p>
        )}
      </div>
    </div>
  );
}
