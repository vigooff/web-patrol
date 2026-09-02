'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useFetch } from '@/lib/hooks/useFetch';

interface Role {
  id: string;
  name: string;
  slug: string;
}

interface Position {
  id: string;
  name: string;
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const inputStyle = {
  background: 'var(--bg-card-soft)',
  border: '1px solid var(--border-subtle)',
};

const labelClass = 'text-xs font-semibold';

export function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
  // Data dropdown — cuma jalan sekali tiap modal fetch ulang (useFetch re-run tiap mount)
  const { data: roles } = useFetch<Role[]>('/api/v1/roles');
  const { data: positions } = useFetch<Position[]>('/api/v1/positions');

  const [form, setForm] = useState({
    name: '', email: '', password: '', role_id: '', position_id: '',
    employee_id: '', phone: '', address: '', join_date: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form tiap kali modal dibuka ulang
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: '', email: '', password: '', role_id: '', position_id: '',
        employee_id: '', phone: '', address: '', join_date: '',
      });
      setErrors({});
      setServerError(null);
    }
  }, [isOpen]);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);
    setIsSubmitting(true);

    try {
      // Field opsional cuma dikirim kalau memang diisi
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        password: form.password,
        role_id: form.role_id,
      };
      if (form.position_id) payload.position_id = form.position_id;
      if (form.employee_id) payload.employee_id = form.employee_id;
      if (form.phone) payload.phone = form.phone;
      if (form.address) payload.address = form.address;
      if (form.join_date) payload.join_date = form.join_date;

      const res  = await fetch('/api/v1/users', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.error?.fieldErrors) {
          const fieldErrors: Record<string, string> = {};
          for (const [key, val] of Object.entries(json.error.fieldErrors)) {
            if (Array.isArray(val) && val[0]) fieldErrors[key] = val[0] as string;
          }
          setErrors(fieldErrors);
        } else {
          setServerError(typeof json.error === 'string' ? json.error : 'Gagal menambahkan pegawai');
        }
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setServerError('Terjadi kesalahan, coba lagi');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tambah Pegawai">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {serverError && (
          <p
            className="text-sm px-4 py-3 rounded-xl"
            style={{ background: 'var(--status-danger-bg)', color: 'var(--status-danger-text)' }}
          >
            {serverError}
          </p>
        )}

        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Nama Lengkap</label>
          <input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
            style={inputStyle}
            required
          />
          {errors.name && <p className="text-xs mt-1" style={{ color: 'var(--status-danger-text)' }}>{errors.name}</p>}
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
            style={inputStyle}
            required
          />
          {errors.email && <p className="text-xs mt-1" style={{ color: 'var(--status-danger-text)' }}>{errors.email}</p>}
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Password Awal (min. 8 karakter)</label>
          <input
            type="text"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
            style={inputStyle}
            minLength={8}
            required
          />
          {errors.password && <p className="text-xs mt-1" style={{ color: 'var(--status-danger-text)' }}>{errors.password}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Role Akses</label>
            <select
              value={form.role_id}
              onChange={(e) => update('role_id', e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
              style={inputStyle}
              required
            >
              <option value="">Pilih role...</option>
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {errors.role_id && <p className="text-xs mt-1" style={{ color: 'var(--status-danger-text)' }}>{errors.role_id}</p>}
          </div>

          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Posisi</label>
            <select
              value={form.position_id}
              onChange={(e) => update('position_id', e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
              style={inputStyle}
            >
              <option value="">Pilih posisi...</option>
              {positions?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>ID Pegawai</label>
            <input
              value={form.employee_id}
              onChange={(e) => update('employee_id', e.target.value)}
              placeholder="cth: 007"
              className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>No. Telepon</label>
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Alamat</label>
          <input
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Tanggal Bergabung</label>
          <input
            type="date"
            value={form.join_date}
            onChange={(e) => update('join_date', e.target.value)}
            className="w-full mt-1 px-4 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--bg-card-soft)' }}
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: 'var(--accent-black)' }}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pegawai'}
          </button>
        </div>
      </form>
    </Modal>
  );
}