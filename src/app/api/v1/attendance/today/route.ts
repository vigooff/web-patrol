import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances, locations } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';

// GET — status absensi hari ini untuk user yang sedang login
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const today = new Date().toISOString().split('T')[0];

    const [attendance] = await db
      .select({
        id:             attendances.id,
        date:           attendances.date,
        status:         attendances.status,
        check_in_time:  attendances.check_in_time,
        check_out_time: attendances.check_out_time,
        work_hours:     attendances.work_hours,
        location_id:    attendances.location_id,
        is_fake_gps:    attendances.is_fake_gps,
      })
      .from(attendances)
      .where(
        and(
          eq(attendances.user_id, session!.user.id),
          eq(attendances.date, today),
        ),
      )
      .limit(1);

    if (!attendance) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: attendance });

  } catch (err) {
    console.error('[attendance/today] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
