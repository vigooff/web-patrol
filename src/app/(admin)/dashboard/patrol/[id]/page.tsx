'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Circle, MapPin, Clock, Ruler } from 'lucide-react';

const PatrolReplayMap = dynamic(() => import('@/components/maps/PatrolReplayMap'), { ssr: false });

interface PatrolDetail {
  id: string;
  user_id: string;
  location_id: string;
  status: string;
  start_time: string;
  end_time: string | null;
  total_distance_meters: number | null;
  logs: Array<{
    id: string;
    checkpoint_id: string;
    checkpoint_name: string;
    scanned_at: string;
    latitude: string | null;
    longitude: string | null;
    is_valid: boolean;
  }>;
  tracks: Array<{
    id: string;
    latitude: string;
    longitude: string;
    recorded_at: string;
  }>;
}

export default function PatrolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patrol,    setPatrol]    = useState<PatrolDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/patrols/${id}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setPatrol(res.data); })
      .finally(() => setIsLoading(false));
  }, [id]);

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }
  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const isOngoing = patrol?.status === 'ongoing';

  if (isLoading) {
    return (
      <div>
        <Topbar />
        <div className="h-96 rounded-3xl animate-pulse mt-6" style={{ background: 'var(--bg-card-soft)' }} />
      </div>
    );
  }

  if (!patrol) {
    return (
      <div>
        <Topbar />
        <p className="mt-10 text-center" style={{ color: 'var(--text-muted)' }}>Sesi patroli tidak ditemukan</p>
      </div>
    );
  }

  const doneCount  = patrol.logs.filter((l) => l.is_valid).length;
  const totalCount = patrol.logs.length;
  const completion = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div>
      <Topbar />
      <PageHeader
        title={`Patroli ${patrol.id.slice(0, 8).toUpperCase()}`}
        description={`${formatDate(patrol.start_time)} · ${formatTime(patrol.start_time)}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge
              label={isOngoing ? 'Berlangsung' : 'Selesai'}
              bg={isOngoing ? 'var(--status-info-bg)' : 'var(--status-success-bg)'}
              text={isOngoing ? 'var(--status-info-text)' : 'var(--status-success-text)'}
            />
            <Link
              href="/dashboard/patrol"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <ArrowLeft size={16} />
              Kembali
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-[1fr_1.3fr] gap-6">
        {/* LEFT — Info & checkpoint list */}
        <div className="flex flex-col gap-4">
          {/* Stats */}
          <div
            className="rounded-3xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <h3 className="text-sm font-bold mb-4">Ringkasan Patroli</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Clock, label: 'Mulai',   value: formatTime(patrol.start_time) },
                { icon: Clock, label: 'Selesai', value: patrol.end_time ? formatTime(patrol.end_time) : '-' },
                { icon: MapPin, label: 'Checkpoint', value: `${doneCount}/${totalCount} (${completion}%)` },
                { icon: Ruler,  label: 'Jarak',  value: patrol.total_distance_meters ? `${patrol.total_distance_meters}m` : '-' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--bg-card-soft)' }}>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="text-sm font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Checkpoint logs */}
          {patrol.logs.length > 0 && (
            <div
              className="rounded-3xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <h3 className="text-sm font-bold mb-4">Log Checkpoint</h3>
              <div className="flex flex-col gap-3">
                {patrol.logs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3">
                    {log.is_valid
                      ? <CheckCircle2 size={17} color="var(--status-success-text)" />
                      : <Circle       size={17} color="var(--status-warning-text)" />
                    }
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{log.checkpoint_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatTime(log.scanned_at)}
                        {!log.is_valid && ' · GPS di luar radius'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GPS tracks summary */}
          <div
            className="rounded-2xl px-5 py-3"
            style={{ background: 'var(--bg-card-soft)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Total titik GPS terekam: <span className="font-bold">{patrol.tracks.length}</span>
            </p>
          </div>
        </div>

        {/* RIGHT — Replay map */}
        <div
          className="rounded-3xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold mb-4">Replay Rute GPS</h3>
          {patrol.tracks.length > 0 ? (
            <PatrolReplayMap tracks={patrol.tracks} logs={patrol.logs} height="500px" />
          ) : (
            <div
              className="rounded-2xl flex items-center justify-center"
              style={{ height: '500px', background: 'var(--bg-card-soft)' }}
            >
              <div className="text-center">
                <MapPin size={28} color="var(--text-muted)" className="mx-auto mb-2" />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {isOngoing ? 'GPS track akan muncul saat patroli berlangsung' : 'Tidak ada data GPS untuk sesi ini'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
