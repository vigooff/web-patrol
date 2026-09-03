'use client';

import { useState, useEffect } from 'react';
import { Flame, Car, ShieldAlert, HeartPulse, MapPin, CheckCircle2 } from 'lucide-react';
import { getCurrentPosition } from '@/lib/native/geolocation';

const categories = [
  { id: 'FIRE',     icon: Flame,       label: 'Kebakaran' },
  { id: 'ACCIDENT', icon: Car,         label: 'Kecelakaan' },
  { id: 'CRIME',    icon: ShieldAlert, label: 'Kriminal' },
  { id: 'MEDICAL',  icon: HeartPulse,  label: 'Medis' },
];

export default function EmployeeSosPage() {
  const [selected,    setSelected]    = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [coords,      setCoords]      = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setErrorMsg('Tidak bisa mendapatkan lokasi GPS. Laporan tetap bisa dikirim tanpa koordinat akurat.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  async function handleSubmit() {
    if (!selected) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category:    selected,
          description: description || undefined,
          latitude:    coords?.lat ?? -7.2575,
          longitude:   coords?.lng ?? 112.7521,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? 'Gagal mengirim laporan');
        return;
      }

      setSubmitted(true);

    } catch {
      setErrorMsg('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center py-20">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'var(--status-success-bg)' }}
        >
          <CheckCircle2 size={28} color="var(--status-success-text)" />
        </div>
        <p className="font-bold text-lg mb-2">Laporan Terkirim!</p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Tim admin telah menerima laporan darurat Anda dan akan segera merespon.
        </p>
        <button
          onClick={() => { setSubmitted(false); setSelected(null); setDescription(''); }}
          className="px-6 py-3 rounded-2xl text-sm font-bold"
          style={{ background: 'var(--bg-card-soft)' }}
        >
          Kirim Laporan Baru
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl p-4 mb-6 flex items-center gap-3" style={{ background: 'var(--status-danger-bg)' }}>
        <ShieldAlert size={20} color="var(--status-danger-text)" />
        <p className="text-sm font-bold" style={{ color: 'var(--status-danger-text)' }}>
          Gunakan hanya untuk keadaan darurat sesungguhnya
        </p>
      </div>

      <h1 className="text-xl font-extrabold mb-1">Lapor Darurat</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Pilih kategori kejadian</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {categories.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              className="flex flex-col items-center gap-2 py-6 rounded-2xl"
              style={{
                background: isSelected ? 'var(--status-danger-bg)' : 'var(--bg-card)',
                border: isSelected ? '1.5px solid var(--status-danger-text)' : '1px solid var(--border-subtle)',
              }}
            >
              <cat.icon size={22} color={isSelected ? 'var(--status-danger-text)' : 'var(--text-primary)'} />
              <span className="text-xs font-bold" style={{ color: isSelected ? 'var(--status-danger-text)' : 'var(--text-primary)' }}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
          Deskripsi Kejadian (opsional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Jelaskan kondisi darurat..."
          rows={4}
          className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none resize-none placeholder:text-[var(--text-muted)]"
          style={{ background: 'var(--bg-card-soft)' }}
        />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4" style={{ background: 'var(--bg-card-soft)' }}>
        <MapPin size={16} color={coords ? 'var(--status-success-text)' : 'var(--text-muted)'} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {coords ? `GPS aktif: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Mendapatkan lokasi GPS...'}
        </p>
      </div>

      {errorMsg && (
        <p className="text-xs font-medium mb-4" style={{ color: 'var(--status-danger-text)' }}>{errorMsg}</p>
      )}

      <button
        disabled={!selected || isLoading}
        onClick={handleSubmit}
        className="w-full py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-40"
        style={{ background: 'var(--status-danger-text)' }}
      >
        {isLoading ? 'Mengirim...' : 'Kirim Laporan Darurat'}
      </button>
    </div>
  );
}
