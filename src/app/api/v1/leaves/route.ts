import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaves, users } from '@/db/schema';
import { createLeaveSchema } from '@/lib/validations';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

// GET — list pengajuan izin (Admin/HRD lihat semua, Employee lihat milik sendiri)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { allowed } = await requireRole(session!.user.role_id, ['superadmin', 'hrd']);

    const data = allowed
      ? await db.select().from(leaves)
      : await db.select().from(leaves).where(eq(leaves.user_id, session!.user.id));

    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error('[leaves] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// POST — ajukan izin/cuti (Employee)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body   = await req.json();
    const parsed = createLeaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { type, start_date, end_date, reason, attachment } = parsed.data;

    const [leave] = await db
      .insert(leaves)
      .values({
        user_id: session!.user.id,
        type,
        start_date,
        end_date,
        reason,
        attachment,
        status: 'pending',
      })
      .returning();

    return NextResponse.json({ success: true, data: leave }, { status: 201 });

  } catch (err) {
    console.error('[leaves] POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
