'use client';

import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFetch } from '@/lib/hooks/useFetch';
import Link from 'next/link';
import { MapPin, CircleDot, Clock, ChevronRight, RefreshCw } from 'lucide-react';

interface PatrolSession {
  id: string;
  user_id: string;
  location_id: string;
  status: string;
  start_time: string;
  end_time: string | null;
  total_distance_meters: number | null;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PatrolPage() {
  const { data: patrols, isLoading, refetch } = useFetch<PatrolSession[]>('/api/v1/patrols');

  const ongoingCount  = patrols?.filter((p) => p.status === 'ongoing').length   ?? 0;
  const completedCount = patrols?.filter((p) => p.status === 'completed').length ?? 0;

  return (
    <div>
      <Topbar />
      <PageHeader
        title="Monitor Patroli"
        description="Pantau sesi patroli pegawai secara real-time"
        action={
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <RefreshCw size={14} />Refresh
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <div className="rounded-2xl p-4" style={{ background: 'var(--status-info-bg)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-2xl font-extrabold" style={{ color: 'var(--status-info-text)' }}>{ongoingCount}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--status-info-text)' }}>Sedang Berlangsung</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'var(--status-success-bg)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-2xl font-extrabold" style={{ color: 'var(--status-success-text)' }}>{completedCount}</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--status-success-text)' }}>Selesai Hari Ini</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card-soft)' }} />
          ))
        ) : patrols && patrols.length > 0 ? (
          patrols.map((p) => {
            const isOngoing = p.status === 'ongoing';
            return (
              <Link
                key={p.id}
                href={`/dashboard/patrol/${p.id}`}
                className="rounded-2xl p-5 flex items-center justify-between hover:opacity-90 transition-opacity"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: isOngoing ? 'var(--status-info-bg)' : 'var(--status-success-bg)' }}
                  >
                    <CircleDot
                      size={18}
                      color={isOngoing ? 'var(--status-info-text)' : 'var(--status-success-text)'}
                      className={isOngoing ? 'animate-pulse' : ''}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{p.id.slice(0, 8).toUpperCase()}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock size={11} color="var(--text-muted)" />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(p.start_time)} · {formatTime(p.start_time)}
                        {p.end_time ? ` — ${formatTime(p.end_time)}` : ' (berlangsung)'}
                      </p>
                    </div>
                    {p.total_distance_meters !== null && p.total_distance_meters > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Jarak: {p.total_distance_meters}m
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    label={isOngoing ? 'Berlangsung' : 'Selesai'}
                    bg={isOngoing ? 'var(--status-info-bg)' : 'var(--status-success-bg)'}
                    text={isOngoing ? 'var(--status-info-text)' : 'var(--status-success-text)'}
                  />
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              </Link>
            );
          })
        ) : (
          <div className="py-16 text-center rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <CircleDot size={32} color="var(--text-muted)" className="mx-auto mb-3" />
            <p className="font-bold mb-1">Belum ada sesi patroli</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sesi patroli akan muncul di sini saat pegawai memulai patroli
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
