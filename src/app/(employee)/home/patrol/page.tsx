'use client';

import { useState, useEffect, useRef } from 'react';
import { useFetch } from '@/lib/hooks/useFetch';
import {
  Play, Square, ScanLine, CheckCircle2,
  Circle, MapPin, Clock, AlertCircle, Navigation,
} from 'lucide-react';
import { watchPosition, clearWatch } from '@/lib/native/geolocation';

interface Location {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: number | null;
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

type Phase = 'idle' | 'active' | 'scanning' | 'completed';

export default function EmployeePatrolPage() {
  const { data: locations } = useFetch<Location[]>('/api/v1/locations');

  const [phase,       setPhase]       = useState<Phase>('idle');
  const [patrol,      setPatrol]      = useState<PatrolSession | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [logs,        setLogs]        = useState<PatrolLog[]>([]);
  const [currentPos,  setCurrentPos]  = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [message,     setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [qrInput,     setQrInput]     = useState('');
  const [elapsed,     setElapsed]     = useState(0);

  const trackIntervalRef  = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef  = useRef<NodeJS.Timeout | null>(null);
  const trackBatchRef     = useRef<Array<{ latitude: number; longitude: number; recorded_at: string }>>([]);

  const defaultLoc = locations?.[0];
  const doneCount  = logs.filter((l) => l.is_valid).length;
  const totalCount = checkpoints.length;
  const progress   = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // GPS watcher — pakai bridge karena di native app watchId resolve-nya async
  useEffect(() => {
    let watchId: string | number | null = null;
    let cancelled = false;

    watchPosition(
      (pos) => setCurrentPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    ).then((id) => {
      if (cancelled) {
        // effect sudah di-cleanup sebelum promise resolve — langsung clear
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

  // Timer & GPS batch tracker saat patroli aktif
  useEffect(() => {
    if (phase !== 'active' || !patrol) return;

    // Timer
    timerIntervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);

    // Kirim GPS batch tiap 30 detik
    trackIntervalRef.current = setInterval(async () => {
      if (!currentPos) return;
      trackBatchRef.current.push({
        latitude:    currentPos.lat,
        longitude:   currentPos.lng,
        recorded_at: new Date().toISOString(),
      });

      if (trackBatchRef.current.length >= 3) {
        try {
          await fetch(`/api/v1/patrols/${patrol.id}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tracks: trackBatchRef.current }),
          });
          trackBatchRef.current = [];
        } catch {}
      }
    }, 30000);

    return () => {
      clearInterval(timerIntervalRef.current!);
      clearInterval(trackIntervalRef.current!);
    };
  }, [phase, patrol, currentPos]);

  function formatElapsed(secs: number) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error ?? 'Gagal memulai patroli' });
        return;
      }

      setPatrol(data.data);

      // Load checkpoints lokasi
      const cpRes  = await fetch(`/api/v1/locations/${defaultLoc.id}/checkpoints`);
      const cpData = await cpRes.json();
      if (cpData.success) setCheckpoints(cpData.data);

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
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/v1/patrols/${patrol.id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qr_code:   qrInput.trim(),
          latitude:  currentPos?.lat ?? 0,
          longitude: currentPos?.lng ?? 0,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setMessage({ type: 'error', text: data.error ?? 'QR Code tidak valid' });
        return;
      }

      // Tandai checkpoint ini sebagai done
      const checkpoint = checkpoints.find((c) => c.name === data.data.checkpoint_name);
      if (checkpoint) {
        setLogs((prev) => [...prev, { checkpoint_id: checkpoint.id, is_valid: data.data.is_valid }]);
      }

      setMessage({
        type: 'success',
        text: data.data.warning
          ? `Checkpoint discan. Peringatan: ${data.data.warning}`
          : `✓ Checkpoint "${data.data.checkpoint_name}" berhasil discan`,
      });
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

    try {
      // Kirim sisa GPS batch
      if (trackBatchRef.current.length > 0) {
        await fetch(`/api/v1/patrols/${patrol.id}/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracks: trackBatchRef.current }),
        });
        trackBatchRef.current = [];
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

      clearInterval(timerIntervalRef.current!);
      clearInterval(trackIntervalRef.current!);
      setPhase('completed');
      setMessage({
        type: 'success',
        text: `Patroli selesai! ${data.data.checkpoints_scanned}/${data.data.checkpoints_total} checkpoint (${data.data.completion_rate}%)`,
      });

    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setIsLoading(false);
    }
  }

  // ── PHASE: COMPLETED ────────────────────────────────────────────────────────
  if (phase === 'completed') {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--status-success-bg)' }}>
          <CheckCircle2 size={28} color="var(--status-success-text)" />
        </div>
        <h2 className="font-bold text-xl mb-2">Patroli Selesai!</h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          {doneCount} dari {totalCount} checkpoint berhasil discan
        </p>
        {message?.type === 'success' && (
          <p className="text-xs mb-6" style={{ color: 'var(--status-success-text)' }}>{message.text}</p>
        )}
        <button
          onClick={() => { setPhase('idle'); setPatrol(null); setLogs([]); setCheckpoints([]); setElapsed(0); setMessage(null); }}
          className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
          style={{ background: 'var(--accent-black)' }}
        >
          Mulai Patroli Baru
        </button>
      </div>
    );
  }

  // ── PHASE: SCANNING ─────────────────────────────────────────────────────────
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

          {message && (
            <div
              className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
              style={{ background: message.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)' }}
            >
              {message.type === 'success'
                ? <CheckCircle2 size={15} color="var(--status-success-text)" />
                : <AlertCircle  size={15} color="var(--status-danger-text)" />
              }
              <p className="text-xs font-semibold" style={{ color: message.type === 'success' ? 'var(--status-success-text)' : 'var(--status-danger-text)' }}>
                {message.text}
              </p>
            </div>
          )}

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

  // ── PHASE: ACTIVE ───────────────────────────────────────────────────────────
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

        {/* Checkpoint list */}
        {checkpoints.length > 0 && (
          <div
            className="rounded-3xl p-5 mb-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <h3 className="text-sm font-bold mb-4">Daftar Checkpoint</h3>
            <div className="flex flex-col gap-3">
              {checkpoints
                .sort((a, b) => a.order_index - b.order_index)
                .map((cp) => {
                  const isDone = logs.some((l) => l.checkpoint_id === cp.id);
                  return (
                    <div key={cp.id} className="flex items-center gap-3">
                      {isDone
                        ? <CheckCircle2 size={18} color="var(--status-success-text)" />
                        : <Circle       size={18} color="var(--text-muted)" />
                      }
                      <span
                        className="text-sm"
                        style={{ color: isDone ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isDone ? 600 : 400 }}
                      >
                        {cp.name}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {message && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
            style={{ background: message.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)' }}
          >
            {message.type === 'success'
              ? <CheckCircle2 size={15} color="var(--status-success-text)" />
              : <AlertCircle  size={15} color="var(--status-danger-text)" />
            }
            <p className="text-xs font-semibold" style={{ color: message.type === 'success' ? 'var(--status-success-text)' : 'var(--status-danger-text)' }}>
              {message.text}
            </p>
          </div>
        )}

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

  // ── PHASE: IDLE ─────────────────────────────────────────────────────────────
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

        {message && (
          <div
            className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
            style={{ background: 'var(--status-danger-bg)' }}
          >
            <AlertCircle size={15} color="var(--status-danger-text)" />
            <p className="text-xs font-semibold" style={{ color: 'var(--status-danger-text)' }}>{message.text}</p>
          </div>
        )}

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
