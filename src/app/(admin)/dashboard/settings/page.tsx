'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { User, Lock, Info, ChevronRight, Building2 } from 'lucide-react';
import { useSession } from '@/lib/auth-client';

const APP_VERSION = 'v1.0.5-enterprise';

const settingsGroups = [
  {
    title: 'Pengaturan Akun',
    items: [
      { icon: User, label: 'Informasi Profil', description: 'Ubah nama dan alamat email' },
      { icon: Lock, label: 'Keamanan', description: 'Perbarui kata sandi Anda' },
    ],
  },
  {
    title: 'Perusahaan',
    items: [
      { icon: Building2, label: 'Profil Perusahaan', description: 'Nama, alamat, dan logo perusahaan' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { icon: Info, label: 'Tentang Aplikasi', description: APP_VERSION },
    ],
  },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div>
      <Topbar userName={user?.name ?? 'Admin'} userInitial={(user?.name ?? 'A').charAt(0).toUpperCase()} notifCount={0} />
      <PageHeader title="Pengaturan" />

      <div className="max-w-xl">
        {/* Profile card */}
        <div
          className="rounded-3xl p-6 mb-6 flex flex-col items-center text-center"
          style={{ background: 'linear-gradient(135deg, var(--gradient-pink-start), var(--gradient-blue-end))' }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3"
            style={{ background: 'var(--accent-black)' }}
          >
            {(user?.name ?? 'A').charAt(0).toUpperCase()}
          </div>
          <p className="font-bold">{user?.name ?? '-'}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.email ?? '-'}</p>
          <span
            className="mt-3 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: 'rgba(255,255,255,0.7)', color: 'var(--text-primary)' }}
          >
            SUPERADMIN
          </span>
        </div>

        {settingsGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <p className="text-xs font-bold uppercase mb-2 px-1" style={{ color: 'var(--text-muted)' }}>
              {group.title}
            </p>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              {group.items.map((item, idx) => (
                <button
                  key={item.label}
                  className="w-full flex items-center justify-between p-4"
                  style={{ borderBottom: idx < group.items.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-card-soft)' }}>
                      <item.icon size={16} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
