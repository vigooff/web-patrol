'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useFetch } from '@/lib/hooks/useFetch';
import {
  Play, Square, ScanLine, CheckCircle2,
  Circle, MapPin, AlertCircle, Navigation,
} from 'lucide-react';
import { watchPosition, clearWatch } from '@/lib/native/geolocation';

interface Location {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: number | null;
  is_active?: boolean;
}

interface Checkpoint {
  id: string;
  name: string;
  order_index: number;
  latitude: string | null;
  longitude: string | null;
}

interface PatrolSession {
  id: string;
  status: string;
  start_time: string;
  location_id: string;
  total_distance_meters: number | null;
}

interface PatrolLog {
  checkpoint_id: string;
  is_valid: boolean;
}

// Respons POST /patrols/[id]/end
interface PatrolResult {
  checkpoints_total: number;
  checkpoints_scanned: number;
  checkpoints_invalid: number;
  completion_rate: number;
  needs_review: boolean;
  review_reasons: string[];
}

interface Msg {
  type: 'success' | 'error' | 'warning';
  text: string;
}

type Phase = 'idle' | 'active' | 'scanning' | 'completed';

// Warna peringatan (oranye). Nilai cadangan dipakai kalau token CSS belum ada.
const WARN_BG   = 'var(--status-warning-bg, #FFF1E0)';
const WARN_TEXT = 'var(--status-warning-text, #B45309)';

const REASON_TEXT: Record<string, string> = {
  no_checkpoint: 'Lokasi ini belum memiliki checkpoint terdaftar.',
  no_scan:       'Tidak ada checkpoint yang discan.',
  incomplete:    'Ada checkpoint yang belum discan.',
  invalid_scan:  'Ada scan di luar jarak titik checkpoint.',
};

// Jarak dua titik GPS dalam meter (haversine)
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Waktu dari server disimpan sebagai UTC; kalau tanpa penanda zona, anggap UTC
function parseUtc(value: string) {
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasZone ? value : value.replace(' ', 'T') + 'Z');
}

function formatElapsed(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function messageColors(type: Msg['type']) {
  if (type === 'success') return { bg: 'var(--status-success-bg)', fg: 'var(--status-success-text)' };
  if (type === 'warning') return { bg: WARN_BG, fg: WARN_TEXT };
  return { bg: 'var(--status-danger-bg)', fg: 'var(--status-danger-text)' };
}

function MessageBox({ message }: { message: Msg }) {
  const c = messageColors(message.type);
  return (
    <div className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl mb-4" style={{ background: c.bg }}>
            {message.type === 'success'
        ? <CheckCircle2 size={15} color={c.fg} className="shrink-0" />
        : <AlertCircle  size={15} color={c.fg} className="shrink-0" />
      }
      <p className="text-xs font-semibold" style={{ color: c.fg }}>{message.text}</p>
    </div>
  );
}

export default function EmployeePatrolPage() {
  const { data: locations } = useFetch<Location[]>('/api/v1/locations');

  const [phase,       setPhase]       = useState<Phase>('idle');
  const [patrol,      setPatrol]      = useState<PatrolSession | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [logs,        setLogs]        = useState<PatrolLog[]>([]);
  const [currentPos,  setCurrentPos]  = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [message,     setMessage]     = useState<Msg | null>(null);
  const [qrInput,     setQrInput]     = useState('');
  const [elapsed,     setElapsed]     = useState(0);
  const [result,      setResult]      = useState<PatrolResult | null>(null);

  const trackBatchRef = useRef<Array<{ latitude: number; longitude: number; recorded_at: string }>>([]);
  const currentPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const startedAtRef  = useRef<number>(0); // epoch ms saat sesi dimulai

  // Lokasi aktif TERDEKAT dari posisi GPS (bukan locations[0])
  const nearestLoc = useMemo(() => {
    if (!locations || !currentPos) return undefined;
    let best: Location | undefined;
    let bestDist = Infinity;
    for (const l of locations) {
      if (l.is_active === false) continue;
      const d = distanceMeters(currentPos.lat, currentPos.lng, Number(l.latitude), Number(l.longitude));
      if (d < bestDist) { best = l; bestDist = d; }
    }
    return best;
  }, [locations, currentPos]);

  // Saat patroli berjalan, kunci ke lokasi sesi supaya tidak berpindah ikut GPS
  const defaultLoc = patrol
    ? locations?.find((l) => l.id === patrol.location_id) ?? nearestLoc
    : nearestLoc;

  const sortedCheckpoints = useMemo(
    () => [...checkpoints].sort((a, b) => a.order_index - b.order_index),
    [checkpoints],
  );

  const logByCheckpoint = useMemo(
    () => new Map<string, PatrolLog>(logs.map((l): [string, PatrolLog] => [l.checkpoint_id, l])),
    [logs],
  );

  // Progres hanya menghitung scan yang VALID
  const totalCount = checkpoints.length;
  const doneCount  = checkpoints.filter((cp) => logByCheckpoint.get(cp.id)?.is_valid === true).length;
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // GPS watcher - pakai bridge karena di native app watchId resolve-nya async
  useEffect(() => {
    let watchId: string | number | null = null;
    let cancelled = false;

    watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        currentPosRef.current = p;
        setCurrentPos(p);
      },
      () => {},
      { enableHighAccuracy: true },
    ).then((id) => {
      if (cancelled) {
        // effect sudah di-cleanup sebelum promise resolve - langsung clear
        clearWatch(id);
      } else {
        watchId = id;
      }
    });

    return () => {
      cancelled = true;
      clearWatch(watchId);
    };
  }, []);

  // Timer + GPS batch tracker selama sesi berjalan (fase active dan scanning).
  // Posisi dibaca dari ref supaya interval tidak di-reset tiap GPS berubah.
  useEffect(() => {
    if (!patrol || (phase !== 'active' && phase !== 'scanning')) return;

    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);

    // Kirim GPS batch tiap 30 detik (dikirim saat sudah 3 titik)
    const track = setInterval(async () => {
      const pos = currentPosRef.current;
      if (!pos) return;
      trackBatchRef.current.push({
        latitude:    pos.lat,
        longitude:   pos.lng,
        recorded_at: new Date().toISOString(),
      });

      if (trackBatchRef.current.length >= 3) {
        const batch = [...trackBatchRef.current];
        try {
          const res = await fetch(`/api/v1/patrols/${patrol.id}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracks: batch }),
          });
          if (res.ok) trackBatchRef.current = trackBatchRef.current.slice(batch.length);
        } catch {}
      }
    }, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(track);
    };
  }, [phase, patrol]);

  // Lanjutkan sesi yang masih berjalan di server (mis. aplikasi sempat tertutup)
  async function resumePatrol(patrolId: string) {
    const res  = await fetch(`/api/v1/patrols/${patrolId}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      setMessage({ type: 'error', text: data.error ?? 'Gagal melanjutkan sesi patroli' });
      return;
    }

    const p = data.data;
    const cpRes  = await fetch(`/api/v1/locations/${p.location_id}/checkpoints`);
    const cpData = await cpRes.json();

    setPatrol({
      id:                    p.id,
      status:                p.status,
      start_time:            String(p.start_time),
      location_id:           p.location_id,
      total_distance_meters: p.total_distance_meters ?? null,
    });
    setCheckpoints(cpData.success ? cpData.data : []);
    setLogs(
      (p.logs ?? []).map((l: { checkpoint_id: string; is_valid: boolean | null }) => ({
        checkpoint_id: l.checkpoint_id,
        is_valid:      l.is_valid !== false,
      })),
    );
    setResult(null);
    trackBatchRef.current = [];
    startedAtRef.current  = parseUtc(String(p.start_time)).getTime();
    setElapsed(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    setPhase('active');
    setMessage({ type: 'success', text: 'Sesi patroli sebelumnya dilanjutkan' });
  }

  async function startPatrol() {
    if (!defaultLoc || !currentPos) {
      setMessage({ type: 'error', text: !defaultLoc ? 'Tidak ada lokasi terdaftar' : 'GPS belum siap' });
      return;
    }
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/v1/patrols/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_id: defaultLoc.id,
          latitude:    currentPos.lat,
          longitude:   currentPos.lng,
        }),
      });
      const data = await res.json();

      // Masih ada sesi berjalan di server -> lanjutkan, jangan kunci petugas
      if (res.status === 409 && data.data?.ongoing_patrol_id) {
        await resumePatrol(data.data.ongoing_patrol_id);
        return;
      }

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error ?? 'Gagal memulai patroli' });
        return;
      }

      startedAtRef.current  = Date.now();
      trackBatchRef.current = [];
      setPatrol(data.data);
      setLogs([]);
      setResult(null);

      // Load checkpoints lokasi
      const cpRes  = await fetch(`/api/v1/locations/${defaultLoc.id}/checkpoints`);
      const cpData = await cpRes.json();
      setCheckpoints(cpData.success ? cpData.data : []);

      setPhase('active');
      setElapsed(0);

    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setIsLoading(false);
    }
  }

  async function scanCheckpoint() {
    if (!patrol || !qrInput.trim()) return;

    const pos = currentPosRef.current;
    if (!pos) {
      setMessage({ type: 'error', text: 'GPS belum siap, tunggu sebentar lalu coba lagi' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/patrols/${patrol.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code:   qrInput.trim(),
          latitude:  pos.lat,
          longitude: pos.lng,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error ?? 'QR Code tidak valid' });
        return;
      }

      // Simpan/ganti status checkpoint ini (scan ulang menggantikan scan invalid)
      const checkpointId: string | undefined =
        data.data.checkpoint_id
        ?? checkpoints.find((c) => c.name === data.data.checkpoint_name)?.id;

      if (checkpointId) {
        setLogs((prev) => [
          ...prev.filter((l) => l.checkpoint_id !== checkpointId),
          { checkpoint_id: checkpointId, is_valid: data.data.is_valid },
        ]);
      }

      setMessage(
        data.data.warning
          ? {
              type: 'warning',
              text: `Checkpoint "${data.data.checkpoint_name}" discan, tetapi ${String(data.data.warning).toLowerCase()}. Scan ulang dari dekat titik untuk memperbaiki.`,
            }
          : { type: 'success', text: `Checkpoint "${data.data.checkpoint_name}" berhasil discan` },
      );
      setQrInput('');
      setPhase('active');

    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setIsLoading(false);
    }
  }

  async function endPatrol() {
    if (!patrol) return;
    setIsLoading(true);
    setMessage(null);

    try {
      // Kirim sisa GPS batch (kalau gagal, akhiri patroli tetap dilanjutkan)
      if (trackBatchRef.current.length > 0) {
        try {
          await fetch(`/api/v1/patrols/${patrol.id}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracks: trackBatchRef.current }),
          });
          trackBatchRef.current = [];
        } catch {}
      }

      const res = await fetch(`/api/v1/patrols/${patrol.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error ?? 'Gagal mengakhiri patroli' });
        return;
      }

      setResult(data.data);
      setPhase('completed');

    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setIsLoading(false);
    }
  }

  function resetToIdle() {
    setPhase('idle');
    setPatrol(null);
    setLogs([]);
    setCheckpoints([]);
    setElapsed(0);
    setResult(null);
    setMessage(null);
  }

  // --- PHASE: COMPLETED ---
  if (phase === 'completed') {
    const needsReview = result?.needs_review ?? false;
    const iconBg = needsReview ? WARN_BG : 'var(--status-success-bg)';
    const iconFg = needsReview ? WARN_TEXT : 'var(--status-success-text)';
    const scanned = result?.checkpoints_scanned ?? doneCount;
    const total   = result?.checkpoints_total ?? totalCount;

    return (
      <div className="flex flex-col items-center text-center py-16">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: iconBg }}>
          {needsReview
            ? <AlertCircle  size={28} color={iconFg} />
            : <CheckCircle2 size={28} color={iconFg} />
          }
        </div>
        <h2 className="font-bold text-xl mb-2">Patroli Selesai!</h2>

        {needsReview && (
          <span
            className="text-xs font-bold px-3 py-1 rounded-full mb-3"
            style={{ background: WARN_BG, color: WARN_TEXT }}
          >
            Perlu ditinjau admin
          </span>
        )}

        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          {scanned} dari {total} checkpoint berhasil discan
        </p>

        {result && result.checkpoints_total > 0 && (
          <p className="text-xs mb-4" style={{ color: iconFg }}>
            Kelengkapan {result.completion_rate}%
          </p>
        )}

        {needsReview && result && result.review_reasons.length > 0 && (
          <div className="w-full max-w-sm rounded-2xl px-4 py-3 mb-6 text-left" style={{ background: WARN_BG }}>
            {result.review_reasons.map((r) => (
              <p key={r} className="text-xs font-semibold" style={{ color: WARN_TEXT }}>
                {REASON_TEXT[r] ?? r}
              </p>
            ))}
          </div>
        )}

        <button
          onClick={resetToIdle}
          className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
          style={{ background: 'var(--accent-black)' }}
        >
          Mulai Patroli Baru
        </button>
      </div>
    );
  }

  // --- PHASE: SCANNING ---
  if (phase === 'scanning') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-extrabold">Scan Checkpoint</h1>
          <button onClick={() => setPhase('active')} className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
            Batal
          </button>
        </div>

        <div
          className="rounded-3xl p-8 flex flex-col items-center mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-card-soft)' }}
          >
            <ScanLine size={36} color="var(--text-muted)" />
          </div>
          <p className="text-sm font-semibold mb-1">Masukkan kode QR checkpoint</p>
          <p className="text-xs mb-6 text-center" style={{ color: 'var(--text-muted)' }}>
            Scan menggunakan kamera atau ketik kode secara manual
          </p>

          <input
            type="text"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && scanCheckpoint()}
            placeholder="Kode QR checkpoint..."
            autoFocus
            className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none text-center font-mono placeholder:text-[var(--text-muted)] mb-4"
            style={{ background: 'var(--bg-card-soft)' }}
          />

          {message && <MessageBox message={message} />}

          <button
            onClick={scanCheckpoint}
            disabled={isLoading || !qrInput.trim()}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'var(--accent-black)' }}
          >
            {isLoading ? 'Memverifikasi...' : 'Konfirmasi Scan'}
          </button>
        </div>
      </div>
    );
  }

  // --- PHASE: ACTIVE ---
  if (phase === 'active') {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-extrabold">Patroli Aktif</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{defaultLoc?.name}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--status-success-bg)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--status-success-text)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--status-success-text)' }}>
              {formatElapsed(elapsed)}
            </span>
          </div>
        </div>

        {/* Progress card */}
        <div
          className="rounded-3xl p-6 mb-4"
          style={{ background: 'linear-gradient(135deg, var(--gradient-pink-start), var(--gradient-blue-end))' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold">Progress Checkpoint</p>
            <span className="text-sm font-extrabold">{progress}%</span>
          </div>
          <div className="h-2 rounded-full mb-2" style={{ background: 'rgba(255,255,255,0.5)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'var(--accent-black)' }}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {doneCount} dari {totalCount} checkpoint selesai
          </p>
        </div>

        {/* GPS status */}
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <Navigation size={14} color={currentPos ? 'var(--status-success-text)' : 'var(--text-muted)'} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {currentPos
              ? `GPS: ${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`
              : 'Menunggu GPS...'
            }
          </p>
        </div>

        {/* Scan button */}
        <button
          onClick={() => { setPhase('scanning'); setMessage(null); }}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white mb-4"
          style={{ background: 'var(--accent-black)' }}
        >
          <ScanLine size={18} />
          Scan QR Checkpoint
        </button>

        {/* Lokasi tanpa checkpoint */}
        {checkpoints.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4" style={{ background: WARN_BG }}>
            <AlertCircle size={15} color={WARN_TEXT} className="shrink-0" />
            <p className="text-xs font-semibold" style={{ color: WARN_TEXT }}>
              Lokasi ini belum memiliki checkpoint. Patroli tetap bisa diakhiri, tetapi akan ditandai perlu ditinjau admin.
            </p>
          </div>
        )}

        {/* Checkpoint list */}
        {sortedCheckpoints.length > 0 && (
          <div
            className="rounded-3xl p-5 mb-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <h3 className="text-sm font-bold mb-4">Daftar Checkpoint</h3>
            <div className="flex flex-col gap-3">
              {sortedCheckpoints.map((cp) => {
                const log   = logByCheckpoint.get(cp.id);
                const state = !log ? 'todo' : log.is_valid ? 'ok' : 'invalid';
                return (
                  <div key={cp.id} className="flex items-center gap-3">
                    {state === 'ok'      && <CheckCircle2 size={18} color="var(--status-success-text)" />}
                    {state === 'invalid' && <AlertCircle  size={18} color={WARN_TEXT} />}
                    {state === 'todo'    && <Circle       size={18} color="var(--text-muted)" />}
                    <div>
                      <span
                        className="text-sm"
                        style={{
                          color:      state === 'todo' ? 'var(--text-muted)' : 'var(--text-primary)',
                          fontWeight: state === 'todo' ? 400 : 600,
                        }}
                      >
                        {cp.name}
                      </span>
                      {state === 'invalid' && (
                        <p className="text-[11px]" style={{ color: WARN_TEXT }}>
                          Di luar jarak, scan ulang dari dekat titik
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {message && <MessageBox message={message} />}

        <button
          onClick={endPatrol}
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-50"
          style={{ background: 'var(--bg-card-soft)', color: 'var(--text-secondary)' }}
        >
          <Square size={14} className="inline mr-2" />
          {isLoading ? 'Memproses...' : 'Akhiri Sesi Patroli'}
        </button>
      </div>
    );
  }

  // --- PHASE: IDLE ---
  return (
    <div>
      <h1 className="text-xl font-extrabold mb-1">Patroli</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {defaultLoc?.name ?? 'Memuat lokasi...'}
      </p>

      <div
        className="rounded-3xl p-6 mb-6 flex flex-col items-center text-center"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-card-soft)' }}
        >
          <MapPin size={26} color="var(--text-muted)" />
        </div>
        <p className="font-bold mb-1">Belum Ada Sesi Patroli</p>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          Mulai patroli untuk lokasi Anda hari ini
        </p>
        <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
          {currentPos
            ? `GPS siap — ${currentPos.lat.toFixed(5)}, ${currentPos.lng.toFixed(5)}`
            : 'Mendapatkan lokasi GPS...'}
        </p>

        {message && <MessageBox message={message} />}

        <button
          onClick={startPatrol}
          disabled={isLoading || !currentPos || !defaultLoc}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: 'var(--accent-black)' }}
        >
          <Play size={16} />
          {isLoading ? 'Memulai...' : 'Mulai Patroli'}
        </button>
      </div>
    </div>
  );
}