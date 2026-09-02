import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq, desc } from 'drizzle-orm';

// GET — riwayat presensi milik sendiri (30 hari terakhir)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const data = await db
      .select()
      .from(attendances)
      .where(eq(attendances.user_id, session!.user.id))
      .orderBy(desc(attendances.date))
      .limit(30);

    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error('[attendance/history] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
