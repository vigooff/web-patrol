import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activities } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq, desc } from 'drizzle-orm';

// GET — aktivitas milik sendiri (untuk employee home page)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const data = await db
      .select()
      .from(activities)
      .where(eq(activities.user_id, session!.user.id))
      .orderBy(desc(activities.recorded_at))
      .limit(20);

    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error('[activities/me] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
