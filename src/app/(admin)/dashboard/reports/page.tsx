'use client';

import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { FileBarChart, Download, Users, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function ReportsPage() {
  const now   = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [downloading, setDownloading] = useState<string | null>(null);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  async function downloadReport(type: 'attendance' | 'payroll') {
    setDownloading(type);
    try {
      const url = `/api/v1/reports/${type}?month=${month}&year=${year}`;
      const res = await fetch(url);

      if (!res.ok) {
        alert('Gagal mengunduh laporan. Pastikan data tersedia untuk periode ini.');
        return;
      }

      // Trigger download di browser
      const blob     = await res.blob();
      const blobUrl  = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href         = blobUrl;
      a.download     = `${type}-${year}-${String(month).padStart(2, '0')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);

    } catch {
      alert('Terjadi kesalahan saat mengunduh laporan.');
    } finally {
      setDownloading(null);
    }
  }

  const reports = [
    {
      id:          'attendance',
      icon:        Users,
      title:       'Rekap Presensi Bulanan',
      description: 'Ringkasan kehadiran, jam masuk/keluar, lembur, dan deteksi GPS mencurigakan',
    },
    {
      id:          'payroll',
      icon:        Wallet,
      title:       'Rekap Payroll Bulanan',
      description: 'Slip gaji, komponen tunjangan/potongan, PPh21, dan gaji bersih per pegawai',
    },
  ] as const;

  return (
    <div>
      <Topbar notifCount={0} />
      <PageHeader title="Laporan" description="Unduh laporan dalam format Excel" />

      {/* Month/year selector */}
      <div
        className="flex items-center gap-4 mb-6 py-3 rounded-2xl w-fit px-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <button onClick={prevMonth} aria-label="Bulan sebelumnya"><ChevronLeft size={18} /></button>
        <span className="text-sm font-bold min-w-[140px] text-center">
          {MONTHS[month - 1]} {year}
        </span>
        <button onClick={nextMonth} aria-label="Bulan berikutnya"><ChevronRight size={18} /></button>
      </div>

      {/* Report cards */}
      <div className="flex flex-col gap-3 max-w-2xl">
        {reports.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--bg-card-soft)' }}
              >
                <r.icon size={18} />
              </div>
              <div>
                <p className="font-bold text-sm">{r.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{r.description}</p>
              </div>
            </div>

            <button
              onClick={() => downloadReport(r.id)}
              disabled={downloading === r.id}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 ml-4 disabled:opacity-50"
              style={{ background: 'var(--accent-black)', color: 'white' }}
            >
              <Download size={14} />
              {downloading === r.id ? 'Mengunduh...' : 'Unduh Excel'}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
        💡 Untuk laporan payroll, pastikan proses payroll sudah dijalankan untuk periode yang dipilih.
        Data attendance tersedia sejak karyawan pertama kali check-in.
      </p>
    </div>
  );
}
