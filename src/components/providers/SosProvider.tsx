'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface SosReport {
  id: string;
  reporter_name: string;
  category: 'FIRE' | 'ACCIDENT' | 'CRIME' | 'MEDICAL';
  description: string | null;
  status: string;
  reported_at: string;
}

interface SosContextValue {
  openReports: SosReport[];
  openCount: number;
  refetch: () => void;
}

const SosContext = createContext<SosContextValue>({
  openReports: [],
  openCount: 0,
  refetch: () => {},
});

export function useSos() {
  return useContext(SosContext);
}

const POLL_INTERVAL_MS = 60_000; // 60 detik

const CATEGORY_LABEL: Record<string, string> = {
  FIRE:     'Kebakaran',
  ACCIDENT: 'Kecelakaan',
  CRIME:    'Kejahatan',
  MEDICAL:  'Medis',
};

export function SosProvider({ children }: { children: React.ReactNode }) {
  const [openReports, setOpenReports] = useState<SosReport[]>([]);

  // null = belum pernah fetch sama sekali (fetch pertama gak boleh trigger toast,
  // biar admin gak di-spam notif utk SOS lama pas baru buka aplikasi)
  const seenIdsRef = useRef<Set<string> | null>(null);

  const fetchSos = useCallback(async () => {
    try {
      const res  = await fetch('/api/v1/sos?status=open');
      const json = await res.json();
      if (!json.success) return;

      const reports: SosReport[] = json.data;

      if (seenIdsRef.current !== null) {
        const newOnes = reports.filter((r) => !seenIdsRef.current!.has(r.id));
        newOnes.forEach((r) => {
          toast.error(
            `SOS ${CATEGORY_LABEL[r.category] ?? r.category} — ${r.reporter_name}`,
            { description: r.description || 'Segera cek laporan di menu SOS' },
          );
        });
      }

      seenIdsRef.current = new Set(reports.map((r) => r.id));
      setOpenReports(reports);
    } catch (err) {
      console.error('[SosProvider] gagal polling SOS:', err);
    }
  }, []);

  useEffect(() => {
    fetchSos(); // fetch pertama saat provider mount
    const interval = setInterval(fetchSos, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSos]);

  return (
    <SosContext.Provider value={{ openReports, openCount: openReports.length, refetch: fetchSos }}>
      {children}
    </SosContext.Provider>
  );
}