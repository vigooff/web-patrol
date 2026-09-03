'use client';

import { useState, useMemo } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AddEmployeeModal } from '@/components/employees/AddEmployeesModal';
import { useFetch } from '@/lib/hooks/useFetch';
import { Phone, MoreVertical, Plus, Search } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  employee_id: string | null;
  phone: string | null;
  is_active: boolean;
  role_id: string;
  position_id: string | null;
  join_date: string | null;
}

interface Position {
  id: string;
  name: string;
}

const selectStyle = {
  background: 'var(--bg-card-soft)',
  border: '1px solid var(--border-subtle)',
};

export default function EmployeesPage() {
  const { data: employees, isLoading, refetch } = useFetch<Employee[]>('/api/v1/users');
  const { data: positions } = useFetch<Position[]>('/api/v1/positions');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');

  // Map cepat id -> nama posisi, dipakai di tabel & filter
  const positionMap = useMemo(() => {
    const map = new Map<string, string>();
    positions?.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [positions]);

  const filteredEmployees = useMemo(() => {
    if (!employees) return [];

    const query = search.trim().toLowerCase();

    return employees.filter((emp) => {
      const matchesSearch =
        query === '' ||
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        (emp.employee_id?.toLowerCase().includes(query) ?? false);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && emp.is_active) ||
        (statusFilter === 'inactive' && !emp.is_active);

      const matchesPosition =
        positionFilter === 'all' || emp.position_id === positionFilter;

      return matchesSearch && matchesStatus && matchesPosition;
    });
  }, [employees, search, statusFilter, positionFilter]);

  return (
    <div>
      <Topbar userName="Admin" userInitial="A" />

      <PageHeader
        title="Manajemen Pegawai"
        description={employees ? `${employees.length} pegawai terdaftar` : 'Memuat...'}
        action={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--accent-black)' }}
          >
            <Plus size={16} />
            Tambah Pegawai
          </button>
        }
      />

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--text-muted)' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email pegawai..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={selectStyle}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={selectStyle}
        >
          <option value="all">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>

        <select
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={selectStyle}
        >
          <option value="all">Semua Posisi</option>
          {positions?.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div
        className="rounded-3xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Pegawai', 'ID Pegawai', 'Email', 'Posisi', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="text-left font-semibold px-6 py-4" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-card-soft)', width: j === 0 ? 120 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredEmployees.length > 0 ? (
              filteredEmployees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                        style={{ background: 'var(--bg-card-soft)' }}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold">{emp.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {emp.employee_id ?? '-'}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{emp.email}</td>
                  <td className="px-6 py-4" style={{ color: 'var(--text-secondary)' }}>
                    {emp.position_id ? positionMap.get(emp.position_id) ?? '-' : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      label={emp.is_active ? 'Aktif' : 'Nonaktif'}
                      bg={emp.is_active ? 'var(--status-success-bg)' : 'var(--status-danger-bg)'}
                      text={emp.is_active ? 'var(--status-success-text)' : 'var(--status-danger-text)'}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button aria-label={`Hubungi ${emp.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card-soft)' }}>
                        <Phone size={14} />
                      </button>
                      <button aria-label={`Menu ${emp.name}`} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-card-soft)' }}>
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {employees && employees.length > 0
                    ? 'Tidak ada pegawai yang cocok dengan filter.'
                    : 'Belum ada pegawai terdaftar. Klik "Tambah Pegawai" untuk mulai.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
}