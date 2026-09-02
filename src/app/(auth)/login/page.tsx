'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { signIn } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('from');

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Email dan password wajib diisi');
      return;
    }

    setIsLoading(true);

    const { error } = await signIn.email({ email, password });

    setIsLoading(false);

    if (error) {
      setErrorMsg(
        error.status === 401 || error.status === 400
          ? 'Email atau password salah'
          : (error.message ?? 'Gagal masuk, silakan coba lagi'),
      );
      return;
    }

    // ✅ KODE BARU YANG BENAR
    if (redirectTo && redirectTo !== '/' && redirectTo !== '/dashboard' && redirectTo !== '/home') {
      // Jika user sebelumnya mencoba akses halaman spesifik (misal /dashboard/reports), kembalikan ke sana
      router.push(redirectTo);
    } else {
      // Jika login biasa, wajib masuk ke ruang perantara untuk disortir berdasarkan role
      router.push('/auth-redirect');
    }
    
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-app)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-black)' }}
          >
            <ShieldCheck size={26} color="white" strokeWidth={2.4} />
          </div>
          <h1 className="text-2xl font-bold text-center">Selamat Datang</h1>
          <p className="text-sm mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
            Masuk ke akun Field ERP Anda
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Email
              </label>
              <div
                className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl"
                style={{ background: 'var(--bg-card-soft)' }}
              >
                <Mail size={18} color="var(--text-muted)" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@perusahaan.com"
                  className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--text-muted)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div
                className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl"
                style={{ background: 'var(--bg-card-soft)' }}
              >
                <Lock size={18} color="var(--text-muted)" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="var(--text-muted)" />
                  ) : (
                    <Eye size={18} color="var(--text-muted)" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p role="alert" className="text-xs font-medium" style={{ color: 'var(--status-danger-text)' }}>
                {errorMsg}
              </p>
            )}

            <div className="flex justify-end -mt-1">
              <Link href="/forgot-password" className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Lupa password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 mt-2 py-3.5 rounded-2xl text-sm font-bold text-white transition-opacity disabled:opacity-60"
              style={{ background: 'var(--accent-black)' }}
            >
              {isLoading ? 'Memproses...' : 'Masuk Sekarang'}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Daftar perusahaan baru
          </Link>
        </p>
      </div>
    </div>
  );
}
