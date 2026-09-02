'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFetch } from '@/lib/hooks/useFetch';
import { Plus, X } from 'lucide-react';

interface Leave {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
}

const typeLabel: Record<string, string> = { sick: 'Sakit', leave: 'Cuti', permission: 'Izin' };

const statusStyle: Record<string, { label: string; bg: string; text: string }> = {
  pending:  { label: 'Menunggu',  bg: 'var(--status-warning-bg)', text: 'var(--status-warning-text)' },
  approved: { label: 'Disetujui', bg: 'var(--status-success-bg)', text: 'var(--status-success-text)' },
  rejected: { label: 'Ditolak',   bg: 'var(--status-danger-bg)',  text: 'var(--status-danger-text)' },
};

export default function EmployeeLeavesPage() {
  const { data: leaves, isLoading, refetch } = useFetch<Leave[]>('/api/v1/leaves');

  const [showForm,   setShowForm]   = useState(false);
  const [type,       setType]       = useState('sick');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [reason,     setReason]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');

  async function handleSubmit() {
    if (!startDate || !endDate) {
      setErrorMsg('Tanggal wajib diisi');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, start_date: startDate, end_date: endDate, reason }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? 'Gagal mengajukan izin');
        return;
      }

      setShowForm(false);
      setType('sick'); setStartDate(''); setEndDate(''); setReason('');
      refetch();

    } catch {
      setErrorMsg('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold">Izin & Cuti</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Riwayat pengajuan Anda</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white"
          style={{ background: 'var(--accent-black)' }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-3xl p-6 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Jenis</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                style={{ background: 'var(--bg-card-soft)' }}
              >
                <option value="sick">Sakit</option>
                <option value="leave">Cuti</option>
                <option value="permission">Izin</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Mulai</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                  style={{ background: 'var(--bg-card-soft)' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Selesai</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                  style={{ background: 'var(--bg-card-soft)' }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Alasan</label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Jelaskan alasan izin..."
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none resize-none placeholder:text-[var(--text-muted)]"
                style={{ background: 'var(--bg-card-soft)' }}
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-medium" style={{ color: 'var(--status-danger-text)' }}>{errorMsg}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'var(--accent-black)' }}
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card-soft)' }} />
          ))
        ) : leaves && leaves.length > 0 ? (
          leaves.map((lv) => {
            const s = statusStyle[lv.status] ?? statusStyle.pending;
            return (
              <div key={lv.id} className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-bold text-sm">{typeLabel[lv.type] ?? lv.type}</p>
                  <StatusBadge label={s.label} bg={s.bg} text={s.text} />
                </div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {lv.start_date} s/d {lv.end_date}
                </p>
                {lv.reason && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lv.reason}</p>}
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center rounded-2xl" style={{ background: 'var(--bg-card)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada pengajuan izin</p>
          </div>
        )}
      </div>
    </div>
  );
}
