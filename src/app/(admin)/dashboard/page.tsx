'use client';

import Link from 'next/link';
import { Topbar } from '@/components/layout/Topbar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFetch } from '@/lib/hooks/useFetch';
import { mockActivePatrol, statusStyles } from '@/lib/mock/data';
import {
  Users, UserCheck, FileClock, ShieldAlert,
  Phone, MessageSquare, MapPin,
} from 'lucide-react';

interface DashboardStats {
  total_pegawai: number;
  hadir_hari_ini: number;
  izin_pending: number;
  sos_aktif: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id: string | null;
  position_id: string | null;
  is_active: boolean;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useFetch<DashboardStats>('/api/v1/dashboard');
  const { data: employees, isLoading: empLoading } = useFetch<Employee[]>('/api/v1/users');

  const displayStats = {
    total_pegawai:  stats?.total_pegawai  ?? 0,
    hadir_hari_ini: stats?.hadir_hari_ini ?? 0,
    izin_pending:   stats?.izin_pending   ?? 0,
    sos_aktif:      stats?.sos_aktif      ?? 0,
  };

  return (
    <div>
      <Topbar
        userName="Admin"
        userInitial="A"
        notifCount={displayStats.sos_aktif}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link href="/dashboard/employees">
          <StatCard icon={Users} label="Pegawai" value={displayStats.total_pegawai} loading={statsLoading} />
        </Link>
        <Link href="/dashboard/attendance">
          <StatCard icon={UserCheck} label="Hadir" value={displayStats.hadir_hari_ini} accent="success" loading={statsLoading} />
        </Link>
        <Link href="/dashboard/leaves">
          <StatCard icon={FileClock} label="Izin Pending" value={displayStats.izin_pending} accent="warning" loading={statsLoading} />
        </Link>
        <Link href="/dashboard/sos">
          <StatCard icon={ShieldAlert} label="SOS Aktif" value={displayStats.sos_aktif} accent="danger" loading={statsLoading} />
        </Link>
      </div>

      <div className="grid grid-cols-[1fr_1.1fr] gap-6">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Hero gradient card */}
          <div
            className="rounded-3xl p-7 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, var(--gradient-pink-start), var(--gradient-blue-end))' }}
          >
            <h2 className="text-lg font-bold mb-1">Tambah Pegawai Baru</h2>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              Lengkapi form untuk mendaftarkan pegawai
            </p>
            <Link
              href="/dashboard/employees"
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'var(--accent-black)' }}
            >
              Kelola Pegawai →
            </Link>
          </div>

          {/* Active patrol card */}
          <div
            className="rounded-3xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>Tracking ID</p>
                <p className="text-sm font-bold">{mockActivePatrol.tracking_id}</p>
              </div>
              <StatusBadge
                label={statusStyles.in_transit.label}
                bg={statusStyles.in_transit.bg}
                text={statusStyles.in_transit.text}
              />
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1">
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Mulai</p>
                <p className="text-sm font-bold">{mockActivePatrol.start_time}</p>
              </div>
              <div className="flex-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-primary)' }} />
                <span className="flex-1 h-px border-t border-dashed" style={{ borderColor: 'var(--border-default)' }} />
                <MapPin size={14} color="var(--text-primary)" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Est. Selesai</p>
                <p className="text-sm font-bold">{mockActivePatrol.expected_end}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5 pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Lokasi</p>
                <p className="text-sm font-bold">{mockActivePatrol.location_name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Checkpoint</p>
                <p className="text-sm font-bold">{mockActivePatrol.checkpoints_done}/{mockActivePatrol.checkpoints_total}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'var(--accent-black)' }}
                >
                  J
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Petugas</p>
                  <p className="text-sm font-bold">{mockActivePatrol.employee_name}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button aria-label="Telepon petugas" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-black)' }}>
                  <Phone size={15} color="white" />
                </button>
                <button aria-label="Chat petugas" className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-card-soft)' }}>
                  <MessageSquare size={15} color="var(--text-primary)" />
                </button>
              </div>
            </div>
          </div>

          {/* Employee list — data asli dari API */}
          <div
            className="rounded-3xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Daftar Pegawai</h3>
              <Link href="/dashboard/employees" className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                Lihat Semua
              </Link>
            </div>

            {empLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bg-card-soft)' }} />
                ))}
              </div>
            ) : employees && employees.length > 0 ? (
              <div className="flex flex-col gap-1">
                {employees.slice(0, 5).map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--bg-card-soft)' }}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{emp.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {emp.employee_id ?? emp.email}
                        </p>
                      </div>
                    </div>
                    <StatusBadge
                      label={emp.is_active ? 'Aktif' : 'Nonaktif'}
                      bg={emp.is_active ? 'var(--status-success-bg)' : 'var(--status-danger-bg)'}
                      text={emp.is_active ? 'var(--status-success-text)' : 'var(--status-danger-text)'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                Belum ada pegawai terdaftar
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Map placeholder */}
        <div
          className="rounded-3xl relative overflow-hidden min-h-[600px]"
          style={{ background: 'var(--bg-card-soft)', border: '1px solid var(--border-subtle)' }}
        >
          <div
            className="absolute top-5 left-5 right-5 rounded-2xl p-4 z-10"
            style={{ background: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{mockActivePatrol.tracking_id}</p>
              <StatusBadge
                label={statusStyles.in_transit.label}
                bg={statusStyles.in_transit.bg}
                text={statusStyles.in_transit.text}
              />
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={32} color="var(--text-muted)" className="mx-auto mb-2" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Peta Live Tracking</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Leaflet map — coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, accent, loading,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent?: 'success' | 'warning' | 'danger';
  loading?: boolean;
}) {
  const colorMap = {
    success: 'var(--status-success-text)',
    warning: 'var(--status-warning-text)',
    danger:  'var(--status-danger-text)',
  };
  const iconColor = accent ? colorMap[accent] : 'var(--text-primary)';

  return (
    <div
      className="rounded-2xl p-5 transition-all hover:shadow-sm"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-card-soft)' }}>
          <Icon size={17} color={iconColor} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-16 rounded-lg animate-pulse mb-1" style={{ background: 'var(--bg-card-soft)' }} />
      ) : (
        <p className="text-2xl font-extrabold">{value}</p>
      )}
      <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}
