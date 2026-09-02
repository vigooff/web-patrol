'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Users,
  MapPin,
  Briefcase,
  UserCheck,
  ScanLine,
  FileClock,
  ShieldAlert,
  FileBarChart,
  Settings,
  LogOut,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { signOut } from '@/lib/auth-client';

const navItems = [
  { href: '/dashboard',            icon: Home,         label: 'Beranda' },
  { href: '/dashboard/employees',  icon: Users,        label: 'Pegawai' },
  { href: '/dashboard/locations',  icon: MapPin,       label: 'Lokasi' },
  { href: '/dashboard/positions',  icon: Briefcase,    label: 'Jabatan' },
  { href: '/dashboard/attendance', icon: UserCheck,    label: 'Presensi' },
  { href: '/dashboard/patrol',     icon: ScanLine,     label: 'Patroli' },
  { href: '/dashboard/leaves',     icon: FileClock,    label: 'Izin' },
  { href: '/dashboard/sos',        icon: ShieldAlert,  label: 'SOS Darurat' },
  { href: '/dashboard/payroll',    icon: Wallet,       label: 'Penggajian' },
  { href: '/dashboard/reports',    icon: FileBarChart, label: 'Laporan' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-20 flex flex-col items-center py-6 z-40 overflow-y-auto"
      style={{ background: 'var(--bg-sidebar)' }}
    >
      {/* Logo mark */}
      <Link
        href="/dashboard"
        className="w-11 h-11 rounded-2xl flex items-center justify-center mb-8 shrink-0"
        style={{ background: 'var(--text-on-dark)' }}
        aria-label="Field ERP — Beranda"
      >
        <ShieldCheck size={22} color="var(--bg-sidebar)" strokeWidth={2.4} />
      </Link>

      {/* Nav icons */}
      <nav className="flex flex-col gap-2 flex-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/dashboard'
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              title={label}
              className="group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors shrink-0"
              style={{
                background: isActive ? 'var(--text-on-dark)' : 'transparent',
              }}
            >
              <Icon
                size={19}
                color={isActive ? 'var(--bg-sidebar)' : '#8C8C96'}
                strokeWidth={2}
              />

              {/* Flyout label on hover */}
              <span
                className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50"
                style={{ background: 'var(--text-on-dark)', color: 'var(--bg-sidebar)' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Settings + Logout */}
      <div className="flex flex-col gap-2 shrink-0">
        <Link
          href="/dashboard/settings"
          aria-label="Pengaturan"
          title="Pengaturan"
          className="group relative w-11 h-11 rounded-xl flex items-center justify-center"
          style={{
            background: pathname.startsWith('/dashboard/settings') ? 'var(--text-on-dark)' : 'transparent',
          }}
        >
          <Settings
            size={19}
            color={pathname.startsWith('/dashboard/settings') ? 'var(--bg-sidebar)' : '#8C8C96'}
            strokeWidth={2}
          />
          <span
            className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50"
            style={{ background: 'var(--text-on-dark)', color: 'var(--bg-sidebar)' }}
          >
            Pengaturan
          </span>
        </Link>

        <button
          onClick={handleLogout}
          aria-label="Keluar"
          title="Keluar"
          className="group relative w-11 h-11 rounded-xl flex items-center justify-center"
        >
          <LogOut size={19} color="#8C8C96" strokeWidth={2} />
          <span
            className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-50"
            style={{ background: 'var(--text-on-dark)', color: 'var(--bg-sidebar)' }}
          >
            Keluar
          </span>
        </button>
      </div>
    </aside>
  );
}
