'use client';

import { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { PageHeader } from '@/components/ui/PageHeader';
import { useFetch } from '@/lib/hooks/useFetch';
import {
  Plus, ChevronDown, ChevronUp, Briefcase,
  Pencil, Trash2, Check, X, PlusCircle,
} from 'lucide-react';

interface PayrollComponent {
  id: string;
  name: string;
  type: 'allowance' | 'deduction';
  amount: string;
}

interface Position {
  id: string;
  name: string;
  base_salary: string | null;
  pph21_rate: string | null;
}

function formatRupiah(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n);
}

// ─── Sub-komponen: satu baris komponen gaji ───────────────────────────────────
function ComponentRow({
  component,
  positionId,
  onDeleted,
}: {
  component: PayrollComponent;
  positionId: string;
  onDeleted: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name,   setName]   = useState(component.name);
  const [amount, setAmount] = useState(component.amount);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    await fetch(`/api/v1/positions/${positionId}/components/${component.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount: Number(amount) }),
    });
    setIsSaving(false);
    setIsEditing(false);
  }

  async function del() {
    if (!confirm(`Hapus komponen "${component.name}"?`)) return;
    await fetch(`/api/v1/positions/${positionId}/components/${component.id}`, {
      method: 'DELETE',
    });
    onDeleted();
  }

  return (
    <div className="flex items-center justify-between py-2">
      {isEditing ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-xs flex-1 mr-2 px-2 py-1.5 rounded-lg outline-none"
            style={{ background: 'var(--bg-card)' }}
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="text-xs w-28 mr-2 px-2 py-1.5 rounded-lg outline-none font-mono"
            style={{ background: 'var(--bg-card)' }}
          />
          <button onClick={save} disabled={isSaving} className="p-1.5 rounded-lg mr-1" style={{ background: 'var(--status-success-bg)' }}>
            <Check size={12} color="var(--status-success-text)" />
          </button>
          <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-card)' }}>
            <X size={12} color="var(--text-muted)" />
          </button>
        </>
      ) : (
        <>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{component.name}</span>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold"
              style={{ color: component.type === 'deduction' ? 'var(--status-danger-text)' : 'var(--text-primary)' }}
            >
              {component.type === 'deduction' ? '- ' : ''}{formatRupiah(Number(component.amount))}
            </span>
            <button onClick={() => setIsEditing(true)} className="p-1 rounded-lg" style={{ background: 'var(--bg-card)' }}>
              <Pencil size={11} color="var(--text-muted)" />
            </button>
            <button onClick={del} className="p-1 rounded-lg" style={{ background: 'var(--bg-card)' }}>
              <Trash2 size={11} color="var(--status-danger-text)" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-komponen: form tambah komponen ──────────────────────────────────────
function AddComponentForm({ positionId, onAdded }: { positionId: string; onAdded: () => void }) {
  const [show,    setShow]   = useState(false);
  const [name,    setName]   = useState('');
  const [type,    setType]   = useState<'allowance' | 'deduction'>('allowance');
  const [amount,  setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name || !amount) return;
    setLoading(true);
    await fetch(`/api/v1/positions/${positionId}/components`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, amount: Number(amount) }),
    });
    setName(''); setAmount(''); setShow(false); setLoading(false);
    onAdded();
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1.5 text-xs font-semibold mt-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <PlusCircle size={13} />
        Tambah Komponen
      </button>
    );
  }

  return (
    <div className="flex gap-2 mt-2 items-center">
      <input
        placeholder="Nama komponen"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none placeholder:text-[var(--text-muted)]"
        style={{ background: 'var(--bg-card)' }}
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as any)}
        className="text-xs px-2 py-1.5 rounded-lg outline-none"
        style={{ background: 'var(--bg-card)' }}
      >
        <option value="allowance">Tunjangan</option>
        <option value="deduction">Potongan</option>
      </select>
      <input
        type="number"
        placeholder="Nominal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-24 text-xs px-2 py-1.5 rounded-lg outline-none font-mono placeholder:text-[var(--text-muted)]"
        style={{ background: 'var(--bg-card)' }}
      />
      <button onClick={submit} disabled={loading} className="p-1.5 rounded-lg" style={{ background: 'var(--status-success-bg)' }}>
        <Check size={12} color="var(--status-success-text)" />
      </button>
      <button onClick={() => setShow(false)} className="p-1.5 rounded-lg" style={{ background: 'var(--bg-card-soft)' }}>
        <X size={12} color="var(--text-muted)" />
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PositionsPage() {
  const { data: positions, isLoading, refetch } = useFetch<Position[]>('/api/v1/positions');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [components, setComponents] = useState<Record<string, PayrollComponent[]>>({});
  const [loadingComp, setLoadingComp] = useState<string | null>(null);

  // Form tambah jabatan baru
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName,    setNewName]    = useState('');
  const [newSalary,  setNewSalary]  = useState('');
  const [newPph,     setNewPph]     = useState('0');
  const [addingPos,  setAddingPos]  = useState(false);

  // Edit jabatan inline
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editName,    setEditName]    = useState('');
  const [editSalary,  setEditSalary]  = useState('');
  const [editPph,     setEditPph]     = useState('');

  async function loadComponents(posId: string) {
    if (components[posId]) return;
    setLoadingComp(posId);
    const res  = await fetch(`/api/v1/positions/${posId}/components`);
    const data = await res.json();
    if (data.success) setComponents((prev) => ({ ...prev, [posId]: data.data }));
    setLoadingComp(null);
  }

  function toggleExpand(posId: string) {
    if (expandedId === posId) {
      setExpandedId(null);
    } else {
      setExpandedId(posId);
      loadComponents(posId);
    }
  }

  function refreshComponents(posId: string) {
    setComponents((prev) => ({ ...prev, [posId]: [] }));
    loadComponents(posId);
  }

  async function addPosition() {
    if (!newName) return;
    setAddingPos(true);
    await fetch('/api/v1/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        newName,
        base_salary: Number(newSalary) || 0,
        pph21_rate:  Number(newPph) || 0,
      }),
    });
    setNewName(''); setNewSalary(''); setNewPph('0');
    setShowNewForm(false); setAddingPos(false);
    refetch();
  }

  async function savePosition(id: string) {
    await fetch(`/api/v1/positions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:        editName,
        base_salary: Number(editSalary),
        pph21_rate:  Number(editPph),
      }),
    });
    setEditingId(null);
    refetch();
  }

  async function deletePosition(id: string, name: string) {
    if (!confirm(`Hapus jabatan "${name}"? Semua komponen gajinya ikut terhapus.`)) return;
    await fetch(`/api/v1/positions/${id}`, { method: 'DELETE' });
    refetch();
  }

  return (
    <div>
      <Topbar />

      <PageHeader
        title="Data Jabatan"
        description="Kelola jabatan, gaji pokok, tunjangan, dan potongan"
        action={
          <button
            onClick={() => setShowNewForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: 'var(--accent-black)' }}
          >
            <Plus size={16} />
            Tambah Jabatan
          </button>
        }
      />

      {/* Form tambah jabatan baru */}
      {showNewForm && (
        <div
          className="rounded-3xl p-6 mb-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          <h3 className="text-sm font-bold mb-4">Jabatan Baru</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Nama Jabatan *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="contoh: Security Senior"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none placeholder:text-[var(--text-muted)]"
                style={{ background: 'var(--bg-card-soft)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Gaji Pokok (Rp)</label>
              <input
                type="number"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                placeholder="5000000"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none font-mono placeholder:text-[var(--text-muted)]"
                style={{ background: 'var(--bg-card-soft)' }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>PPh21 (%)</label>
              <input
                type="number"
                value={newPph}
                onChange={(e) => setNewPph(e.target.value)}
                placeholder="2.0"
                step="0.1"
                className="w-full px-4 py-3 rounded-2xl text-sm outline-none font-mono placeholder:text-[var(--text-muted)]"
                style={{ background: 'var(--bg-card-soft)' }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addPosition}
              disabled={addingPos || !newName}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: 'var(--accent-black)' }}
            >
              <Check size={15} />
              {addingPos ? 'Menyimpan...' : 'Simpan Jabatan'}
            </button>
            <button
              onClick={() => setShowNewForm(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'var(--bg-card-soft)' }}
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* List jabatan */}
      <div className="flex flex-col gap-3 max-w-2xl">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card-soft)' }} />
          ))
        ) : positions && positions.length > 0 ? (
          positions.map((pos) => {
            const isOpen    = expandedId === pos.id;
            const isEditing = editingId  === pos.id;
            const comps     = components[pos.id] ?? [];

            return (
              <div key={pos.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                {/* Header jabatan */}
                <div className="flex items-center justify-between p-5">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1 mr-3">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl text-sm outline-none font-bold"
                        style={{ background: 'var(--bg-card-soft)' }}
                      />
                      <input
                        type="number"
                        value={editSalary}
                        onChange={(e) => setEditSalary(e.target.value)}
                        placeholder="Gaji pokok"
                        className="w-28 px-3 py-2 rounded-xl text-sm outline-none font-mono"
                        style={{ background: 'var(--bg-card-soft)' }}
                      />
                      <input
                        type="number"
                        value={editPph}
                        onChange={(e) => setEditPph(e.target.value)}
                        placeholder="PPh%"
                        step="0.1"
                        className="w-16 px-3 py-2 rounded-xl text-sm outline-none font-mono"
                        style={{ background: 'var(--bg-card-soft)' }}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => toggleExpand(pos.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-card-soft)' }}>
                        <Briefcase size={17} />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{pos.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Gaji Pokok: {formatRupiah(Number(pos.base_salary ?? 0))} · PPh21: {pos.pph21_rate ?? 0}%
                        </p>
                      </div>
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => savePosition(pos.id)} className="p-2 rounded-xl" style={{ background: 'var(--status-success-bg)' }}>
                          <Check size={14} color="var(--status-success-text)" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 rounded-xl" style={{ background: 'var(--bg-card-soft)' }}>
                          <X size={14} color="var(--text-muted)" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(pos.id);
                            setEditName(pos.name);
                            setEditSalary(pos.base_salary ?? '0');
                            setEditPph(pos.pph21_rate ?? '0');
                          }}
                          className="p-2 rounded-xl"
                          style={{ background: 'var(--bg-card-soft)' }}
                        >
                          <Pencil size={14} color="var(--text-muted)" />
                        </button>
                        <button
                          onClick={() => deletePosition(pos.id, pos.name)}
                          className="p-2 rounded-xl"
                          style={{ background: 'var(--status-danger-bg)' }}
                        >
                          <Trash2 size={14} color="var(--status-danger-text)" />
                        </button>
                        <button onClick={() => toggleExpand(pos.id)} className="p-2 rounded-xl" style={{ background: 'var(--bg-card-soft)' }}>
                          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Komponen gaji (expanded) */}
                {isOpen && !isEditing && (
                  <div className="px-5 pb-5">
                    <div className="rounded-xl p-4" style={{ background: 'var(--bg-card-soft)' }}>
                      {loadingComp === pos.id ? (
                        <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Memuat komponen...</p>
                      ) : (
                        <>
                          {comps.filter((c) => c.type === 'allowance').length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--status-success-text)' }}>TUNJANGAN</p>
                              {comps.filter((c) => c.type === 'allowance').map((c) => (
                                <ComponentRow
                                  key={c.id}
                                  component={c}
                                  positionId={pos.id}
                                  onDeleted={() => refreshComponents(pos.id)}
                                />
                              ))}
                            </div>
                          )}
                          {comps.filter((c) => c.type === 'deduction').length > 0 && (
                            <div>
                              <p className="text-xs font-bold mb-1.5" style={{ color: 'var(--status-danger-text)' }}>POTONGAN</p>
                              {comps.filter((c) => c.type === 'deduction').map((c) => (
                                <ComponentRow
                                  key={c.id}
                                  component={c}
                                  positionId={pos.id}
                                  onDeleted={() => refreshComponents(pos.id)}
                                />
                              ))}
                            </div>
                          )}
                          {comps.length === 0 && (
                            <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>
                              Belum ada komponen gaji
                            </p>
                          )}
                          <div className="mt-2" style={{ borderTop: '1px solid var(--border-default)' }}>
                            <AddComponentForm
                              positionId={pos.id}
                              onAdded={() => refreshComponents(pos.id)}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center rounded-3xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <Briefcase size={32} color="var(--text-muted)" className="mx-auto mb-3" />
            <p className="font-bold mb-1">Belum ada jabatan</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Klik "Tambah Jabatan" untuk mulai
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
