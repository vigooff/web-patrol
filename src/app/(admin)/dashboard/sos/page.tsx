'use client';

import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { useFetch } from '@/lib/hooks/useFetch';
import { Flame, Car, ShieldAlert, HeartPulse, MapPin, Clock, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface SosReport {
  id: string;
  user_id: string;
  category: string;
  description: string | null;
  latitude: string;
  longitude: string;
  status: string;
  resolution: string | null;
  reported_at: string;
}

const categoryConfig: Record<string, { icon: React.ElementType; label: string }> = {
  FIRE:     { icon: Flame,       label: 'Kebakaran' },
  ACCIDENT: { icon: Car,         label: 'Kecelakaan' },
  CRIME:    { icon: ShieldAlert, label: 'Kriminal' },
  MEDICAL:  { icon: HeartPulse,  label: 'Medis' },
};

export default function SosPage() {
  const { data: reports, isLoading, refetch } = useFetch<SosReport[]>('/api/v1/sos');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const openCount = reports?.filter((r) => r.status === 'open').length ?? 0;

  async function handleAction(id: string, endpoint: string) {
    setProcessingId(id);
    try {
      await fetch(`/api/v1/sos/${id}/${endpoint}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution: 'Diselesaikan oleh admin' }),
      });
      refetch();
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div>
      <Topbar userName="Admin" userInitial="A" notifCount={openCount} />
      <PageHeader
        title="Monitor SOS Darurat"
        description="Laporan darurat dari pegawai lapangan"
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

      {openCount > 0 && (
        <div className="rounded-2xl p-4 mb-5 flex items-center gap-3" style={{ background: 'var(--status-danger-bg)' }}>
          <ShieldAlert size={20} color="var(--status-danger-text)" />
          <p className="text-sm font-bold" style={{ color: 'var(--status-danger-text)' }}>
            {openCount} laporan darurat belum ditangani — segera respon!
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 rounded-3xl animate-pulse" style={{ background: 'var(--bg-card-soft)' }} />
          ))
        ) : reports && reports.length > 0 ? (
          reports.map((report) => {
            const cat  = categoryConfig[report.category] ?? categoryConfig.MEDICAL;
            const Icon = cat.icon;
            const isOpen     = report.status === 'open';
            const isHandled  = report.status === 'handled';
            const isResolved = report.status === 'resolved';
            const time = new Date(report.reported_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            const statusBadge = isOpen
              ? { label: 'Belum Ditangani',  bg: 'var(--status-danger-bg)',  text: 'var(--status-danger-text)' }
              : isHandled
              ? { label: 'Sedang Ditangani', bg: 'var(--status-warning-bg)', text: 'var(--status-warning-text)' }
              : { label: 'Selesai',          bg: 'var(--status-success-bg)', text: 'var(--status-success-text)' };

            return (
              <div
                key={report.id}
                className="rounded-3xl p-6"
                style={{
                  background: 'var(--bg-card)',
                  border: isOpen ? '1px solid var(--status-danger-text)' : '1px solid var(--border-subtle)',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--status-danger-bg)' }}>
                      <Icon size={19} color="var(--status-danger-text)" />
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--status-danger-text)' }}>
                        {cat.label.toUpperCase()}
                      </p>
                      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {report.latitude}, {report.longitude}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} color="var(--text-muted)" />
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{time}</p>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: statusBadge.bg, color: statusBadge.text }}
                    >
                      {statusBadge.label}
                    </span>
                  </div>
                </div>

                {/* Deskripsi */}
                {report.description && (
                  <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--bg-card-soft)' }}>
                    <p className="text-sm">{report.description}</p>
                  </div>
                )}

                {/* Koordinat */}
                <div className="flex items-center gap-1.5 mb-4">
                  <MapPin size={13} color="var(--text-muted)" />
                  <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    {report.latitude}, {report.longitude}
                  </p>
                </div>

                {/* Resolusi (kalau sudah selesai) */}
                {isResolved && report.resolution && (
                  <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--status-success-bg)' }}>
                    <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--status-success-text)' }}>Catatan Penyelesaian</p>
                    <p className="text-sm" style={{ color: 'var(--status-success-text)' }}>{report.resolution}</p>
                  </div>
                )}

                {/* Aksi */}
                {isOpen && (
                  <button
                    disabled={processingId === report.id}
                    onClick={() => handleAction(report.id, 'handle')}
                    className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: 'var(--status-danger-text)' }}
                  >
                    {processingId === report.id ? 'Memproses...' : 'Tandai Sedang Ditangani'}
                  </button>
                )}

                {isHandled && (
                  <button
                    disabled={processingId === report.id}
                    onClick={() => handleAction(report.id, 'resolve')}
                    className="w-full py-3 rounded-2xl text-sm font-bold disabled:opacity-50"
                    style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' }}
                  >
                    {processingId === report.id ? 'Memproses...' : '✓ Tandai Selesai Ditangani'}
                  </button>
                )}

                {isResolved && (
                  <div
                    className="w-full py-3 rounded-2xl text-sm font-semibold text-center"
                    style={{ background: 'var(--status-success-bg)', color: 'var(--status-success-text)' }}
                  >
                    ✓ Laporan Selesai Ditangani
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center rounded-2xl" style={{ background: 'var(--bg-card)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tidak ada laporan SOS</p>
          </div>
        )}
      </div>
    </div>
  );
}
