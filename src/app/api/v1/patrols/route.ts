import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patrols, users, locations } from '@/db/schema';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq, and, inArray } from 'drizzle-orm';

// GET — list semua patroli (Admin/HRD lihat semua, Employee lihat milik sendiri)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { allowed } = await requireRole(session!.user.role_id, ['superadmin', 'hrd']);

    // Filter berdasarkan company: ambil semua user di company ini dulu
    const companyUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.company_id, session!.user.company_id));

    const companyUserIds = companyUsers.map((u) => u.id);

    const data = allowed
      ? await db.select().from(patrols).where(inArray(patrols.user_id, companyUserIds))
      : await db.select().from(patrols).where(eq(patrols.user_id, session!.user.id));

    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error('[patrols] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
