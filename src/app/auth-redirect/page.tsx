'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';

const ADMIN_SLUGS = ['superadmin', 'hrd', 'admin'];

export default function AuthRedirectPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending) return;
    if (!session) { router.replace('/login'); return; }

    fetch('/api/v1/users/me/role')
      .then((r) => r.json())
      .then((data) => {
        const slug = data?.data?.slug ?? '';
        router.replace(ADMIN_SLUGS.includes(slug) ? '/dashboard' : '/home');
      })
      .catch(() => router.replace('/home'));
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-app)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memuat...</p>
    </div>
  );
}