'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { useSession } from '@/lib/auth-client';
import { ArrowLeft, MapPin } from 'lucide-react';
import Link from 'next/link';

// Dynamic import wajib untuk Leaflet — tidak bisa SSR karena butuh window
const LocationPicker = dynamic(
  () => import('@/components/maps/LocationPicker'),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-2xl flex items-center justify-center"
        style={{ height: '400px', background: 'var(--bg-card-soft)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Memuat peta...</p>
      </div>
    ),
  }
);

export default function NewLocationPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? 'Admin';

  const [form, setForm] = useState({
    name:    '',
    code:    '',
    address: '',
  });
  const [coords, setCoords] = useState({
    lat:    -7.2575,
    lng:    112.7521,
    radius: 100,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    // Auto-generate kode dari nama (uppercase, spasi → strip)
    if (field === 'name' && !form.code) {
      const autoCode = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 10);
      setForm((f) => ({ ...f, name: value, code: autoCode }));
    }
  }

  function handleLocationChange(lat: number, lng: number, radius: number) {
    setCoords({ lat, lng, radius });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!form.name || !form.code) {
      setErrorMsg('Nama dan kode lokasi wajib diisi');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:          form.name,
          code:          form.code,
          address:       form.address,
          latitude:      coords.lat,
          longitude:     coords.lng,
          radius_meters: coords.radius,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Gagal menyimpan lokasi');
        return;
      }

      router.push('/dashboard/locations');
      router.refresh();

    } catch {
      setErrorMsg('Terjadi kesalahan jaringan');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <Topbar userName={userName} userInitial={userName.charAt(0).toUpperCase()} />

      <PageHeader
        title="Tambah Lokasi Baru"
        description="Klik di peta untuk menentukan titik lokasi dan radius geofencing"
        action={
          <Link
            href="/dashboard/locations"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <ArrowLeft size={16} />
            Kembali
          </Link>
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-[1fr_1.2fr] gap-6">
          {/* LEFT — Form input */}
          <div className="flex flex-col gap-4">
            <div
              className="rounded-3xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <h3 className="text-sm font-bold mb-4">Informasi Lokasi</h3>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Nama Lokasi *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="contoh: Gedung Pusat Surabaya"
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none placeholder:text-[var(--text-muted)]"
                    style={{ background: 'var(--bg-card-soft)' }}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Kode Lokasi *
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="contoh: GPS-SUB-01"
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none font-mono placeholder:text-[var(--text-muted)]"
                    style={{ background: 'var(--bg-card-soft)' }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Kode unik, otomatis terisi dari nama
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>
                    Alamat Lengkap
                  </label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    placeholder="Jl. Contoh No. 1, Kota..."
                    rows={3}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none resize-none placeholder:text-[var(--text-muted)]"
                    style={{ background: 'var(--bg-card-soft)' }}
                  />
                </div>
              </div>
            </div>

            {/* Koordinat hasil pilih di peta */}
            <div
              className="rounded-3xl p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <h3 className="text-sm font-bold mb-4">Koordinat Terpilih</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-card-soft)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Latitude</p>
                  <p className="text-sm font-bold font-mono">{coords.lat}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-card-soft)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Longitude</p>
                  <p className="text-sm font-bold font-mono">{coords.lng}</p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-card-soft)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Radius</p>
                  <p className="text-sm font-bold">{coords.radius}m</p>
                </div>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium px-1" style={{ color: 'var(--status-danger-text)' }}>
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
              style={{ background: 'var(--accent-black)' }}
            >
              <MapPin size={16} />
              {isLoading ? 'Menyimpan...' : 'Simpan Lokasi'}
            </button>
          </div>

          {/* RIGHT — Leaflet Map */}
          <div
            className="rounded-3xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <h3 className="text-sm font-bold mb-4">
              Pilih Titik Lokasi di Peta
            </h3>
            <LocationPicker
              initialLat={coords.lat}
              initialLng={coords.lng}
              initialRadius={coords.radius}
              onLocationChange={handleLocationChange}
              height="450px"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
