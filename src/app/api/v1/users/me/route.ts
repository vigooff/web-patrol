import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

// GET — profil diri sendiri (dipakai mobile app karyawan setelah login)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session!.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Profil tidak ditemukan' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: user });

  } catch (err) {
    console.error('[users/me] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
