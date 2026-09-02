import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { activities, users } from '@/db/schema';
import { createActivitySchema } from '@/lib/validations';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq, inArray } from 'drizzle-orm';

// GET — list aktivitas (Admin/HRD lihat semua dalam company, Employee lihat milik sendiri)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const { allowed } = await requireRole(session!.user.role_id, ['superadmin', 'hrd']);

    if (allowed) {
      const companyUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.company_id, session!.user.company_id));

      const data = await db
        .select()
        .from(activities)
        .where(inArray(activities.user_id, companyUsers.map((u) => u.id)));

      return NextResponse.json({ success: true, data });
    }

    const data = await db
      .select()
      .from(activities)
      .where(eq(activities.user_id, session!.user.id));

    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error('[activities] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// POST — buat log aktivitas baru (dengan bukti foto)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body   = await req.json();
    const parsed = createActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { title, description, photo_url, location_id, latitude, longitude } = parsed.data;

    const [activity] = await db
      .insert(activities)
      .values({
        user_id: session!.user.id,
        location_id,
        title,
        description,
        photo_url,
        latitude:  latitude !== undefined ? String(latitude) : undefined,
        longitude: longitude !== undefined ? String(longitude) : undefined,
      })
      .returning();

    return NextResponse.json({ success: true, data: activity }, { status: 201 });

  } catch (err) {
    console.error('[activities] POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
