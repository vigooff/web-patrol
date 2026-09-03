'use client';

import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFetch } from '@/lib/hooks/useFetch';
import { useSession } from '@/lib/auth-client';
import Link from 'next/link';
import { Plus, MapPin, Users, ChevronRight } from 'lucide-react';

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

export default function LocationsPage() {
  const { data: session } = useSession();
  const { data: locations, isLoading } = useFetch<Location[]>('/api/v1/locations');
  const userName = session?.user?.name ?? 'Admin';

  return (
    <div>
      <Topbar
        userName={userName}
        userInitial={userName.charAt(0).toUpperCase()}
      />

      <PageHeader
        title="Manajemen Lokasi"
        description="Kelola gedung dan area geofencing untuk absensi"
        action={
          <Link
            href="/dashboard/locations/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--accent-black)' }}
          >
            <Plus size={16} />
            Tambah Lokasi
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 rounded-3xl animate-pulse" style={{ background: 'var(--bg-card-soft)' }} />
          ))}
        </div>
      ) : locations && locations.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {locations.map((loc) => (
            <Link
              key={loc.id}
              href={`/dashboard/locations/${loc.id}`}
              className="rounded-3xl p-6 block transition-all hover:shadow-md"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--bg-card-soft)' }}
                  >
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{loc.name}</p>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      ID: {loc.code}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  label={loc.is_active ? 'Aktif' : 'Nonaktif'}
                  bg={loc.is_active ? 'var(--status-success-bg)' : 'var(--status-danger-bg)'}
                  text={loc.is_active ? 'var(--status-success-text)' : 'var(--status-danger-text)'}
                />
              </div>

              {loc.address && (
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  {loc.address}
                </p>
              )}

              <div
                className="grid grid-cols-3 gap-3 pt-4"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Lat</p>
                  <p className="text-xs font-bold font-mono">
                    {parseFloat(loc.latitude).toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Long</p>
                  <p className="text-xs font-bold font-mono">
                    {parseFloat(loc.longitude).toFixed(4)}
                  </p>
                </div>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>Radius</p>
                  <p className="text-xs font-bold">{loc.radius_meters ?? 100}m</p>
                </div>
              </div>

              <div
                className="flex items-center justify-between mt-3 pt-3"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Klik untuk lihat detail & edit
                </p>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="py-20 flex flex-col items-center justify-center rounded-3xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <MapPin size={36} color="var(--text-muted)" className="mb-3" />
          <p className="font-bold mb-1">Belum ada lokasi</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Tambahkan lokasi pertama untuk mulai absensi berbasis GPS
          </p>
          <Link
            href="/dashboard/locations/new"
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--accent-black)' }}
          >
            <Plus size={16} />
            Tambah Lokasi Pertama
          </Link>
        </div>
      )}
    </div>
  );
}
