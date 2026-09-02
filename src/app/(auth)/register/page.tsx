'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Mail, Lock, User, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { signIn } from '@/lib/auth-client';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    companyName: '',
    companyCode: '',
    name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!form.companyName.trim() || !form.companyCode.trim()) {
      setErrorMsg('Nama dan kode perusahaan wajib diisi');
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name || !form.email || !form.password) {
      setErrorMsg('Semua field wajib diisi');
      return;
    }
    if (form.password.length < 8) {
      setErrorMsg('Password minimal 8 karakter');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Daftarkan company + superadmin pertama via API kita
      const res = await fetch('/api/v1/register-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Pendaftaran gagal, silakan coba lagi');
        setIsLoading(false);
        return;
      }

      // 2. Langsung login setelah berhasil daftar
      const { error } = await signIn.email({ email: form.email, password: form.password });

      if (error) {
        // Akun sudah dibuat tapi login gagal — arahkan ke halaman login manual
        router.push('/login?registered=1');
        return;
      }

      router.push('/dashboard');
      router.refresh();

    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan');
      setIsLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-app)' }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent-black)' }}
          >
            <ShieldCheck size={26} color="white" strokeWidth={2.4} />
          </div>
          <h1 className="text-2xl font-bold text-center">Daftarkan Perusahaan</h1>
          <p className="text-sm mt-1 text-center" style={{ color: 'var(--text-secondary)' }}>
            Langkah {step} dari 2 — {step === 1 ? 'Info Perusahaan' : 'Akun Superadmin'}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: s === step ? 28 : 14,
                background: s <= step ? 'var(--accent-black)' : 'var(--border-default)',
              }}
            />
          ))}
        </div>

        <div
          className="rounded-3xl p-8"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          {step === 1 ? (
            <form onSubmit={handleNext} className="flex flex-col gap-4">
              <div>
                <label htmlFor="companyName" className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Nama Perusahaan
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl" style={{ background: 'var(--bg-card-soft)' }}>
                  <Building2 size={18} color="var(--text-muted)" />
                  <input
                    id="companyName"
                    type="text"
                    value={form.companyName}
                    onChange={(e) => update('companyName', e.target.value)}
                    placeholder="PT Tech Solution Business"
                    className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="companyCode" className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Kode Perusahaan
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl" style={{ background: 'var(--bg-card-soft)' }}>
                  <input
                    id="companyCode"
                    type="text"
                    value={form.companyCode}
                    onChange={(e) => update('companyCode', e.target.value.toUpperCase())}
                    placeholder="TSB-01"
                    className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  Kode unik untuk identifikasi perusahaan
                </p>
              </div>

              {errorMsg && (
                <p role="alert" className="text-xs font-medium" style={{ color: 'var(--status-danger-text)' }}>
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="flex items-center justify-center gap-2 mt-2 py-3.5 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'var(--accent-black)' }}
              >
                Lanjutkan
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="name" className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Nama Lengkap
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl" style={{ background: 'var(--bg-card-soft)' }}>
                  <User size={18} color="var(--text-muted)" />
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Nama Anda"
                    className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="regEmail" className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl" style={{ background: 'var(--bg-card-soft)' }}>
                  <Mail size={18} color="var(--text-muted)" />
                  <input
                    id="regEmail"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="nama@perusahaan.com"
                    className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="regPassword" className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl" style={{ background: 'var(--bg-card-soft)' }}>
                  <Lock size={18} color="var(--text-muted)" />
                  <input
                    id="regPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => update('password', e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              {errorMsg && (
                <p role="alert" className="text-xs font-medium" style={{ color: 'var(--status-danger-text)' }}>
                  {errorMsg}
                </p>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center px-5 py-3.5 rounded-2xl text-sm font-bold"
                  style={{ background: 'var(--bg-card-soft)' }}
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: 'var(--accent-black)' }}
                >
                  {isLoading ? 'Memproses...' : 'Buat Akun Superadmin'}
                  {!isLoading && <ArrowRight size={16} />}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
