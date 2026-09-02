import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salary_records } from '@/db/schema';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ recordId: string }> };

// POST — publish slip gaji ke karyawan (status draft -> published)
// Setelah published, slip gaji ini tidak bisa diproses ulang otomatis
// (lihat guard di /payroll/process) — harus dikoreksi manual kalau ada kesalahan.
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  const { recordId } = await params;

  try {
    const [existing] = await db
      .select()
      .from(salary_records)
      .where(eq(salary_records.id, recordId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Slip gaji tidak ditemukan' },
        { status: 404 },
      );
    }

    if (existing.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Slip gaji sudah dipublish sebelumnya' },
        { status: 422 },
      );
    }

    const [updated] = await db
      .update(salary_records)
      .set({ status: 'published' })
      .where(eq(salary_records.id, recordId))
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Slip gaji berhasil dipublish dan dapat dilihat karyawan',
      data: updated,
    });

  } catch (err) {
    console.error('[payroll/:id/publish] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
