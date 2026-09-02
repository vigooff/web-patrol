'use client';

import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import { useFetch } from '@/lib/hooks/useFetch';
import { User, Lock, Info, ChevronRight, LogOut, Briefcase, Hash } from 'lucide-react';

const APP_VERSION = 'v1.0.5-enterprise';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  employee_id: string | null;
  phone: string | null;
  join_date: string | null;
  is_active: boolean;
  position_id: string | null;
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: userDetail } = useFetch<UserDetail>('/api/v1/users/me');

  const name    = userDetail?.name    ?? session?.user?.name    ?? '-';
  const email   = userDetail?.email   ?? session?.user?.email   ?? '-';
  const initial = name.charAt(0).toUpperCase();

  async function handleLogout() {
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-6">Profil Pengguna</h1>

      {/* Gradient profile card */}
      <div
        className="rounded-3xl p-6 mb-6 flex flex-col items-center text-center"
        style={{ background: 'linear-gradient(135deg, var(--gradient-pink-start), var(--gradient-blue-end))' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3"
          style={{ background: 'var(--accent-black)' }}
        >
          {initial}
        </div>
        <p className="font-bold text-base">{name}</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{email}</p>

        {/* Info tambahan */}
        <div className="flex gap-4 mt-4">
          {userDetail?.employee_id && (
            <div className="flex items-center gap-1">
              <Hash size={12} color="var(--text-secondary)" />
              <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                {userDetail.employee_id}
              </span>
            </div>
          )}
          {userDetail?.join_date && (
            <div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Bergabung {new Date(userDetail.join_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menu settings */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        {[
          { icon: User, label: 'Informasi Profil',   desc: 'Ubah nama dan kontak' },
          { icon: Lock, label: 'Keamanan',            desc: 'Perbarui kata sandi' },
          { icon: Info, label: 'Tentang Aplikasi',    desc: APP_VERSION },
        ].map((item, idx, arr) => (
          <button
            key={item.label}
            className="w-full flex items-center justify-between p-4"
            style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--bg-card-soft)' }}
              >
                <item.icon size={16} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
              </div>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
        style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' }}
      >
        <LogOut size={16} />
        Keluar
      </button>
    </div>
  );
}
