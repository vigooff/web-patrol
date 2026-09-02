'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, Users, MapPin, X } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import { useSos } from '@/components/providers/SosProvider';

interface SearchResult {
  users: Array<{ id: string; name: string; email: string; employee_id: string | null; is_active: boolean }>;
  locations: Array<{ id: string; name: string; code: string; address: string | null }>;
}

export function Topbar({
  userName: propUserName,
  userInitial: propUserInitial,
}: {
  userName?: string;
  userInitial?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { openCount } = useSos();

  const userName    = session?.user?.name    ?? propUserName    ?? 'Admin';
  const userInitial = (session?.user?.name   ?? propUserName    ?? 'A').charAt(0).toUpperCase();

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<SearchResult | null>(null);
  const [isOpen,   setIsOpen]   = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchRef   = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res  = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
          setIsOpen(true);
        }
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function handleSelectUser(id: string) {
    setQuery(''); setIsOpen(false);
    router.push(`/dashboard/employees`);
  }

  function handleSelectLocation(id: string) {
    setQuery(''); setIsOpen(false);
    router.push(`/dashboard/locations/${id}`);
  }

  const hasResults = results && (results.users.length > 0 || results.locations.length > 0);

  return (
    <header className="flex items-center justify-between gap-4 mb-8">
      <div ref={searchRef} className="relative flex-1 max-w-sm">
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <Search size={18} color={isSearching ? 'var(--text-primary)' : 'var(--text-muted)'}
            className={isSearching ? 'animate-pulse' : ''}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => hasResults && setIsOpen(true)}
            placeholder="Cari pegawai, lokasi..."
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-[var(--text-muted)]"
          />
          {query && (
            <button onClick={() => { setQuery(''); setIsOpen(false); }} aria-label="Hapus pencarian">
              <X size={16} color="var(--text-muted)" />
            </button>
          )}
        </div>

        {isOpen && (
          <div
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 shadow-lg"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            {hasResults ? (
              <>
                {results!.users.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                      Pegawai
                    </p>
                    {results!.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelectUser(u.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:opacity-80"
                        style={{ background: 'transparent' }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: 'var(--bg-card-soft)' }}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{u.name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {u.employee_id ? `#${u.employee_id} · ` : ''}{u.email}
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: u.is_active ? 'var(--status-success-bg)' : 'var(--status-danger-bg)',
                            color:      u.is_active ? 'var(--status-success-text)' : 'var(--status-danger-text)',
                          }}
                        >
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {results!.locations.length > 0 && (
                  <div className="mt-1">
                    <p className="px-4 pt-2 pb-1 text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                      Lokasi
                    </p>
                    {results!.locations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => handleSelectLocation(loc.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:opacity-80"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: 'var(--bg-card-soft)' }}
                        >
                          <MapPin size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{loc.name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {loc.code}{loc.address ? ` · ${loc.address}` : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Tidak ada hasil untuk "{query}"
                </p>
              </div>
            )}
            <div className="px-4 py-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Tekan Enter atau klik hasil untuk navigasi
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/dashboard/sos')}
          aria-label={`Notifikasi SOS${openCount > 0 ? `, ${openCount} belum ditangani` : ''}`}
          className="relative w-11 h-11 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <Bell size={18} color="var(--text-primary)" />
          {openCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
              style={{ background: 'var(--status-danger-text)' }}
            >
              {openCount}
            </span>
          )}
        </button>

        <button className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-2xl">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'var(--accent-black)' }}
          >
            {userInitial}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-semibold leading-tight">{userName}</p>
            {session?.user?.email && (
              <p className="text-xs leading-tight" style={{ color: 'var(--text-muted)' }}>
                {session.user.email}
              </p>
            )}
          </div>
          <ChevronDown size={16} color="var(--text-muted)" />
        </button>
      </div>
    </header>
  );
}