'use client';

import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFetch } from '@/lib/hooks/useFetch';
import { Check, X, RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface Leave {
  id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
}

const typeLabel: Record<string, string> = {
  sick: 'Sakit', leave: 'Cuti', permission: 'Izin',
};
const statusStyle: Record<string, { label: string; bg: string; text: string }> = {
  pending:  { label: 'Menunggu',  bg: 'var(--status-warning-bg)', text: 'var(--status-warning-text)' },
  approved: { label: 'Disetujui', bg: 'var(--status-success-bg)', text: 'var(--status-success-text)' },
  rejected: { label: 'Ditolak',   bg: 'var(--status-danger-bg)',  text: 'var(--status-danger-text)' },
};

export default function LeavesPage() {
  const { data: leaves, isLoading, refetch } = useFetch<Leave[]>('/api/v1/leaves');
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    setProcessingId(id);
    try {
      await fetch(`/api/v1/leaves/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      refetch();
    } finally {
      setProcessingId(null);
    }
  }

  const pending = leaves?.filter((l) => l.status === 'pending').length ?? 0;

  return (
    <div>
      <Topbar userName="Admin" userInitial="A" notifCount={pending} />
      <PageHeader
        title="Pengajuan Izin & Cuti"
        description={`${pending} pengajuan menunggu persetujuan`}
        action={
          <button onClick={refetch} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <RefreshCw size={14} />Refresh
          </button>
        }
      />

      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card-soft)' }} />
          ))
        ) : leaves && leaves.length > 0 ? (
          leaves.map((lv) => {
            const s = statusStyle[lv.status] ?? statusStyle.pending;
            return (
              <div key={lv.id} className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{typeLabel[lv.type] ?? lv.type}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {lv.start_date} s/d {lv.end_date}
                    </p>
                  </div>
                  <StatusBadge label={s.label} bg={s.bg} text={s.text} />
                </div>
                {lv.reason && <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{lv.reason}</p>}
                {lv.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      disabled={processingId === lv.id}
                      onClick={() => handleReview(lv.id, 'approved')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: 'var(--status-success-text)' }}
                    >
                      <Check size={14} />Setujui
                    </button>
                    <button
                      disabled={processingId === lv.id}
                      onClick={() => handleReview(lv.id, 'rejected')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                      style={{ background: 'var(--bg-card-soft)', color: 'var(--status-danger-text)' }}
                    >
                      <X size={14} />Tolak
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center rounded-2xl" style={{ background: 'var(--bg-card)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tidak ada pengajuan izin</p>
          </div>
        )}
      </div>
    </div>
  );
}
