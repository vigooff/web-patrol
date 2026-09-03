'use client';

import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { useFetch } from '@/lib/hooks/useFetch';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChevronLeft, ChevronRight, Play, Send, Download } from 'lucide-react';

interface SalaryRecord {
  id: string;
  user_id: string;
  period_month: number;
  period_year: number;
  base_salary: string;
  total_allowance: string;
  overtime_pay: string;
  total_deduction: string;
  pph21_amount: string;
  net_salary: string;
  present_days: number;
  absent_days: number;
  status: string;
}

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatRp(n: string | null) {
  if (!n) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(Number(n));
}

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data: records, isLoading, refetch } = useFetch<SalaryRecord[]>(
    `/api/v1/payroll?month=${month}&year=${year}`
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function processPayroll() {
    setIsProcessing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/payroll/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        refetch();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Gagal memproses payroll' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan jaringan' });
    } finally {
      setIsProcessing(false);
    }
  }

  async function publishRecord(id: string) {
    setIsPublishing(id);
    try {
      const res = await fetch(`/api/v1/payroll/records/${id}/publish`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Slip gaji berhasil dipublish' });
        refetch();
      }
    } finally {
      setIsPublishing(null);
    }
  }

  async function downloadExcel() {
    const url = `/api/v1/reports/payroll?month=${month}&year=${year}`;
    const res = await fetch(url);
    if (!res.ok) { alert('Data payroll belum tersedia untuk periode ini'); return; }
    const blob    = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = blobUrl;
    a.download    = `payroll-${year}-${String(month).padStart(2, '0')}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }

  const draftCount     = records?.filter((r) => r.status === 'draft').length     ?? 0;
  const publishedCount = records?.filter((r) => r.status === 'published').length ?? 0;

  return (
    <div>
      <Topbar />
      <PageHeader
        title="Penggajian (Payroll)"
        description="Proses dan kelola slip gaji karyawan"
        action={
          <div className="flex gap-2">
            <button
              onClick={downloadExcel}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <Download size={15} />
              Export Excel
            </button>
            <button
              onClick={processPayroll}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'var(--accent-black)' }}
            >
              <Play size={15} />
              {isProcessing ? 'Memproses...' : 'Proses Payroll'}
            </button>
          </div>
        }
      />

      {/* Month selector */}
      <div className="flex items-center gap-4 mb-6 py-3 rounded-2xl w-fit px-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <button onClick={prevMonth}><ChevronLeft size={18} /></button>
        <span className="text-sm font-bold min-w-[140px] text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth}><ChevronRight size={18} /></button>
      </div>

      {/* Message */}
      {message && (
        <div
          className="rounded-2xl px-5 py-3.5 mb-5 text-sm font-semibold"
          style={{
            background: message.type === 'success' ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
            color:      message.type === 'success' ? 'var(--status-success-text)' : 'var(--status-danger-text)',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Summary */}
      {records && records.length > 0 && (
        <div className="flex gap-3 mb-5 text-xs">
          <span className="px-3 py-1.5 rounded-full font-semibold" style={{ background: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' }}>
            {draftCount} Draft
          </span>
          <span className="px-3 py-1.5 rounded-full font-semibold" style={{ background: 'var(--status-success-bg)', color: 'var(--status-success-text)' }}>
            {publishedCount} Published
          </span>
        </div>
      )}

      {/* Records table */}
      <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['ID Pegawai', 'Gaji Pokok', 'Tunjangan', 'Potongan', 'PPh21', 'Gaji Bersih', 'Hadir', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="text-left font-semibold px-5 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-card-soft)', width: 70 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : records && records.length > 0 ? (
              records.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-5 py-4 font-mono text-xs">{r.user_id.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-xs">{formatRp(r.base_salary)}</td>
                  <td className="px-5 py-4 text-xs" style={{ color: 'var(--status-success-text)' }}>+{formatRp(r.total_allowance)}</td>
                  <td className="px-5 py-4 text-xs" style={{ color: 'var(--status-danger-text)' }}>-{formatRp(r.total_deduction)}</td>
                  <td className="px-5 py-4 text-xs" style={{ color: 'var(--status-danger-text)' }}>-{formatRp(r.pph21_amount)}</td>
                  <td className="px-5 py-4 text-xs font-bold">{formatRp(r.net_salary)}</td>
                  <td className="px-5 py-4 text-xs">{r.present_days}h</td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      label={r.status === 'published' ? 'Published' : 'Draft'}
                      bg={r.status === 'published' ? 'var(--status-success-bg)' : 'var(--status-warning-bg)'}
                      text={r.status === 'published' ? 'var(--status-success-text)' : 'var(--status-warning-text)'}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1.5">
                      {r.status === 'draft' && (
                        <button
                          onClick={() => publishRecord(r.id)}
                          disabled={isPublishing === r.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                          style={{ background: 'var(--accent-black)' }}
                        >
                          <Send size={11} />
                          {isPublishing === r.id ? '...' : 'Publish'}
                        </button>
                      )}
                      <button
                        onClick={() => window.open(`/api/v1/reports/slip?userId=${r.user_id}&month=${month}&year=${year}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: 'var(--bg-card-soft)' }}
                      >
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} className="px-5 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Belum ada data payroll untuk {MONTHS[month - 1]} {year}. Klik "Proses Payroll" untuk menghitung.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
