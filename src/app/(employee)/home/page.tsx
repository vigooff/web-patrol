'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFetch } from '@/lib/hooks/useFetch';
import { useSession } from '@/lib/auth-client';
import {
  Bell, Camera, ScanLine, ShieldAlert,
  FileClock, Clock, MapPin, UserCheck,
} from 'lucide-react';

interface TodayAttendance {
  id: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
}

interface Activity {
  id: string;
  title: string;
  recorded_at: string;
}

export default function EmployeeHomePage() {
  const { data: session } = useSession();
  const userName    = session?.user?.name ?? 'Karyawan';
  const userInitial = userName.charAt(0).toUpperCase();

  const { data: todayAttendance } = useFetch<TodayAttendance>('/api/v1/attendance/today');
  const { data: activities }      = useFetch<Activity[]>('/api/v1/activities/me');

  const isCheckedIn  = !!todayAttendance?.check_in_time;
  const isCheckedOut = !!todayAttendance?.check_out_time;

  function formatTime(ts: string | null) {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'var(--accent-black)' }}
          >
            {userInitial}
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Selamat datang,</p>
            <p className="text-sm font-bold">{userName}</p>
          </div>
        </div>
        <button
          aria-label="Notifikasi"
          className="relative w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <Bell size={18} />
        </button>
      </div>

      {/* Hero check-in/out card */}
      <Link
        href="/home/attendance"
        className="block rounded-3xl p-6 mb-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--gradient-pink-start), var(--gradient-blue-end))' }}
      >
        {isCheckedIn ? (
          <>
            <div className="flex items-center gap-1.5 mb-2">
              <UserCheck size={14} color="var(--status-success-text)" />
              <p className="text-xs font-bold" style={{ color: 'var(--status-success-text)' }}>
                Sudah Check-in
              </p>
            </div>
            <h2 className="text-lg font-bold mb-1">
              {isCheckedOut ? 'Sudah Check-out' : 'Sedang Bertugas'}
            </h2>
            <div className="flex gap-4 mb-4">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Masuk</p>
                <p className="text-sm font-bold">{formatTime(todayAttendance?.check_in_time)}</p>
              </div>
              {isCheckedOut && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Keluar</p>
                  <p className="text-sm font-bold">{formatTime(todayAttendance?.check_out_time)}</p>
                </div>
              )}
            </div>
            {!isCheckedOut && (
              <span
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'var(--accent-black)' }}
              >
                <Camera size={17} />
                Check-out Sekarang
              </span>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-2">
              <MapPin size={14} color="var(--text-secondary)" />
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Belum absen hari ini
              </p>
            </div>
            <h2 className="text-lg font-bold mb-1">Check-in Sekarang</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
              Pastikan Anda berada di lokasi sebelum absen
            </p>
            <span
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'var(--accent-black)' }}
            >
              <Camera size={17} />
              Check-in Sekarang
            </span>
          </>
        )}
      </Link>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <QuickAction href="/home/patrol"     icon={ScanLine}    label="Patroli" />
        <QuickAction href="/home/leaves"     icon={FileClock}   label="Ajukan Izin" />
        <QuickAction href="/home/sos"        icon={ShieldAlert} label="SOS Darurat" danger />
      </div>

      {/* Aktivitas terbaru */}
      <div
        className="rounded-3xl p-5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">Aktivitas Terbaru</h3>
          <Link href="/home/activities" className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
            Lihat Semua
          </Link>
        </div>
        {activities && activities.length > 0 ? (
          <div className="flex flex-col gap-4">
            {activities.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-card-soft)' }}
                >
                  <Clock size={15} color="var(--text-secondary)" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.recorded_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Belum ada aktivitas hari ini
          </p>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href, icon: Icon, label, danger,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 py-5 rounded-2xl"
      style={{
        background: danger ? 'var(--status-danger-bg)' : 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <Icon size={20} color={danger ? 'var(--status-danger-text)' : 'var(--text-primary)'} />
      <span
        className="text-xs font-semibold text-center"
        style={{ color: danger ? 'var(--status-danger-text)' : 'var(--text-primary)' }}
      >
        {label}
      </span>
    </Link>
  );
}
