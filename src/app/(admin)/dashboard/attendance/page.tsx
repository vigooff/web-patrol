'use client';

import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFetch } from '@/lib/hooks/useFetch';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  is_fake_gps: boolean;
  user_id: string;
}

const statusMap: Record<string, { label: string; bg: string; text: string }> = {
  present: { label: 'Hadir',  bg: 'var(--status-success-bg)', text: 'var(--status-success-text)' },
  sick:    { label: 'Sakit',  bg: 'var(--status-warning-bg)', text: 'var(--status-warning-text)' },
  leave:   { label: 'Izin',   bg: 'var(--status-info-bg)',    text: 'var(--status-info-text)' },
  absent:  { label: 'Alpa',   bg: 'var(--status-danger-bg)',  text: 'var(--status-danger-text)' },
};

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatTime(ts: string | null) {
  if (!ts) return '-';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default function AttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: records, isLoading } = useFetch<AttendanceRecord[]>(
    `/api/v1/attendance/recap?month=${month}&year=${year}`
  );

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div>
      <Topbar userName="Admin" userInitial="A" notifCount={0} />
      <PageHeader
        title="Rekapitulasi Presensi"
        description="Pantau kehadiran seluruh pegawai"
        action={
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <Download size={15} />Export
          </button>
        }
      />

      <div className="flex items-center gap-4 mb-6 py-3 rounded-2xl w-fit px-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <button onClick={prevMonth} aria-label="Bulan sebelumnya"><ChevronLeft size={18} /></button>
        <span className="text-sm font-bold min-w-[120px] text-center">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} aria-label="Bulan berikutnya"><ChevronRight size={18} /></button>
      </div>

      <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Tanggal', 'Masuk', 'Keluar', 'Status', 'GPS'].map((h) => (
                <th key={h} className="text-left font-semibold px-6 py-4" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-card-soft)', width: 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : records && records.length > 0 ? (
              records.map((row) => {
                const s = statusMap[row.status] ?? statusMap.present;
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-6 py-4 font-semibold">{row.date}</td>
                    <td className="px-6 py-4 font-mono text-xs">{formatTime(row.check_in_time)}</td>
                    <td className="px-6 py-4 font-mono text-xs">{formatTime(row.check_out_time)}</td>
                    <td className="px-6 py-4"><StatusBadge label={s.label} bg={s.bg} text={s.text} /></td>
                    <td className="px-6 py-4">
                      {row.is_fake_gps && (
                        <StatusBadge label="Curiga" bg="var(--status-danger-bg)" text="var(--status-danger-text)" />
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Tidak ada data presensi untuk {MONTHS[month - 1]} {year}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
