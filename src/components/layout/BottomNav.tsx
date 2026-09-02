'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ScanLine, FileClock, ShieldAlert, User } from 'lucide-react';

const navItems = [
  { href: '/home',             icon: Home,        label: 'Beranda' },
  { href: '/home/patrol',      icon: ScanLine,    label: 'Patroli' },
  { href: '/home/sos',         icon: ShieldAlert, label: 'SOS' },
  { href: '/home/leaves',      icon: FileClock,   label: 'Izin' },
  { href: '/home/profile',     icon: User,        label: 'Profil' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-md mx-auto flex items-center justify-around px-2 py-3 z-40"
      style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)' }}
    >
      {navItems.map(({ href, icon: Icon, label }) => {
        const isActive = href === '/home' ? pathname === href : pathname.startsWith(href);
        const isSos = href === '/home/sos';

        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
          >
            <Icon
              size={20}
              color={
                isSos
                  ? 'var(--status-danger-text)'
                  : isActive
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)'
              }
              strokeWidth={isActive ? 2.4 : 2}
            />
            <span
              className="text-[10px] font-bold"
              style={{
                color: isSos
                  ? 'var(--status-danger-text)'
                  : isActive
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
