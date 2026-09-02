import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salary_records } from '@/db/schema';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ userId: string; year: string; month: string }> };

// GET — slip gaji satu karyawan untuk periode tertentu
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { userId, year, month } = await params;

  try {
    const isSelf = session!.user.id === userId;

    if (!isSelf) {
      const { allowed } = await requireRole(session!.user.role_id, ['superadmin', 'hrd']);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak' },
          { status: 403 },
        );
      }
    }

    const [record] = await db
      .select()
      .from(salary_records)
      .where(
        and(
          eq(salary_records.user_id, userId),
          eq(salary_records.period_month, Number(month)),
          eq(salary_records.period_year, Number(year)),
        ),
      )
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Slip gaji tidak ditemukan untuk periode ini' },
        { status: 404 },
      );
    }

    // Karyawan hanya boleh lihat slip yang sudah dipublish, bukan masih draft
    if (isSelf && record.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Slip gaji belum dipublish' },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, data: record });

  } catch (err) {
    console.error('[payroll/:userId/:year/:month] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
