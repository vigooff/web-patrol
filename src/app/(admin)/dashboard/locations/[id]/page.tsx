'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { useSession } from '@/lib/auth-client';
import { ArrowLeft, Pencil, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';

const LocationPicker = dynamic(() => import('@/components/maps/LocationPicker'), { ssr: false });

interface Location {
  id: string;
  name: string;
  code: string;
  address: string | null;
  latitude: string;
  longitude: string;
  radius_meters: number | null;
  is_active: boolean;
}

export default function LocationDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name ?? 'Admin';

  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving,  setIsSaving]  = useState(false);
  const [errorMsg,  setErrorMsg]  = useState('');

  const [form, setForm] = useState({ name: '', code: '', address: '' });
  const [coords, setCoords] = useState({ lat: 0, lng: 0, radius: 100 });

  useEffect(() => {
    fetch(`/api/v1/locations/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          const loc = res.data as Location;
          setLocation(loc);
          setForm({
            name:    loc.name,
            code:    loc.code,
            address: loc.address ?? '',
          });
          setCoords({
            lat:    parseFloat(loc.latitude),
            lng:    parseFloat(loc.longitude),
            radius: loc.radius_meters ?? 100,
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleSave() {
    setErrorMsg('');
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/locations/${id}`, {
        method: 'PATCH',
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
        setErrorMsg(data.error ?? 'Gagal menyimpan');
        return;
      }
      setLocation(data.data);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <Topbar userName={userName} userInitial={userName.charAt(0).toUpperCase()} />
        <div className="h-96 rounded-3xl animate-pulse mt-6" style={{ background: 'var(--bg-card-soft)' }} />
      </div>
    );
  }

  if (!location) {
    return (
      <div>
        <Topbar userName={userName} userInitial={userName.charAt(0).toUpperCase()} />
        <p className="mt-10 text-center" style={{ color: 'var(--text-muted)' }}>Lokasi tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div>
      <Topbar userName={userName} userInitial={userName.charAt(0).toUpperCase()} />

      <PageHeader
        title={isEditing ? 'Edit Lokasi' : location.name}
        description={`Kode: ${location.code}`}
        action={
          <div className="flex gap-2">
            <Link
              href="/dashboard/locations"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <ArrowLeft size={16} />
              Kembali
            </Link>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--accent-black)' }}
              >
                <Pencil size={15} />
                Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'var(--accent-black)' }}
              >
                <Save size={15} />
                {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-[1fr_1.2fr] gap-6">
        {/* LEFT — Info */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-3xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <h3 className="text-sm font-bold mb-4">Informasi Lokasi</h3>

            {isEditing ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Nama</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none"
                    style={{ background: 'var(--bg-card-soft)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Kode</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none font-mono"
                    style={{ background: 'var(--bg-card-soft)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Alamat</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-3.5 rounded-2xl text-sm outline-none resize-none"
                    style={{ background: 'var(--bg-card-soft)' }}
                  />
                </div>
                {errorMsg && (
                  <p className="text-xs font-medium" style={{ color: 'var(--status-danger-text)' }}>{errorMsg}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Nama</p>
                  <p className="font-bold">{location.name}</p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Kode</p>
                  <p className="font-mono text-sm">{location.code}</p>
                </div>
                {location.address && (
                  <div>
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Alamat</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{location.address}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Koordinat */}
          <div
            className="rounded-3xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <h3 className="text-sm font-bold mb-4">Koordinat GPS & Geofencing</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Latitude',  value: coords.lat.toString() },
                { label: 'Longitude', value: coords.lng.toString() },
                { label: 'Radius',    value: `${coords.radius}m` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--bg-card-soft)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="text-xs font-bold font-mono">{item.value}</p>
                </div>
              ))}
            </div>
            {isEditing && (
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                💡 Klik di peta atau drag marker untuk mengubah koordinat
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — Map */}
        <div
          className="rounded-3xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold mb-4">
            {isEditing ? 'Ubah Titik Lokasi' : 'Posisi di Peta'}
          </h3>
          <LocationPicker
            initialLat={parseFloat(location.latitude)}
            initialLng={parseFloat(location.longitude)}
            initialRadius={location.radius_meters ?? 100}
            onLocationChange={(lat, lng, radius) => setCoords({ lat, lng, radius })}
            readonly={!isEditing}
            height="450px"
          />
        </div>
      </div>
    </div>
  );
}
