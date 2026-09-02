'use client';

import { useState } from 'react';
import { useFetch } from '@/lib/hooks/useFetch';
import { PhotoCapture } from '@/components/ui/PhotoCapture';
import { Plus, X, Clock } from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  recorded_at: string;
}

export default function EmployeeActivitiesPage() {
  const { data: activities, isLoading, refetch } = useFetch<Activity[]>('/api/v1/activities/me');

  const [showForm,     setShowForm]     = useState(false);
  const [title,        setTitle]        = useState('');
  const [description,  setDescription]  = useState('');
  const [photoUrl,     setPhotoUrl]     = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');

  async function handleSubmit() {
    if (!title.trim()) {
      setErrorMsg('Judul aktivitas wajib diisi');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || undefined, photo_url: photoUrl || undefined }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? 'Gagal menyimpan aktivitas');
        return;
      }

      setTitle(''); setDescription(''); setShowForm(false);
      refetch();

    } catch {
      setErrorMsg('Terjadi kesalahan jaringan');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold">Aktivitas</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Log kegiatan harian Anda</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white"
          style={{ background: 'var(--accent-black)' }}
        >
          {showForm ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-3xl p-6 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Judul Aktivitas *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="contoh: Cek Genset, Patroli Area B"
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none placeholder:text-[var(--text-muted)]"
                style={{ background: 'var(--bg-card-soft)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                Deskripsi
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail aktivitas yang dilakukan..."
                className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none resize-none placeholder:text-[var(--text-muted)]"
                style={{ background: 'var(--bg-card-soft)' }}
              />
            </div>

            <PhotoCapture
              label="Ambil Foto Bukti Aktivitas"
              onPhotoReady={(url) => setPhotoUrl(url)}
            />

            {errorMsg && (
              <p className="text-xs font-medium" style={{ color: 'var(--status-danger-text)' }}>{errorMsg}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'var(--accent-black)' }}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Aktivitas'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card-soft)' }} />
          ))
        ) : activities && activities.length > 0 ? (
          activities.map((ac) => (
            <div
              key={ac.id}
              className="rounded-2xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <p className="font-bold text-sm mb-1">{ac.title}</p>
              {ac.description && (
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{ac.description}</p>
              )}
              <div className="flex items-center gap-1.5">
                <Clock size={12} color="var(--text-muted)" />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(ac.recorded_at).toLocaleString('id-ID', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center rounded-2xl" style={{ background: 'var(--bg-card)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada aktivitas tercatat</p>
          </div>
        )}
      </div>
    </div>
  );
}
