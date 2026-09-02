import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { locations } from '@/db/schema';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { updateLocationSchema } from '@/lib/validations';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET — detail satu lokasi
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const [location] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, id),
          eq(locations.company_id, session!.user.company_id),
        ),
      )
      .limit(1);

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Lokasi tidak ditemukan' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: location });

  } catch (err) {
    console.error('[locations/:id] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// PATCH — update data lokasi
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { allowed } = await requireRole(session!.user.role_id, ['superadmin']);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Hanya Superadmin yang dapat mengubah lokasi' },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const body   = await req.json();
    const parsed = updateLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, code, address, latitude, longitude, radius_meters } = parsed.data;

    const [updated] = await db
      .update(locations)
      .set({
        ...(name          !== undefined && { name }),
        ...(code          !== undefined && { code }),
        ...(address       !== undefined && { address }),
        ...(latitude      !== undefined && { latitude: String(latitude) }),
        ...(longitude     !== undefined && { longitude: String(longitude) }),
        ...(radius_meters !== undefined && { radius_meters }),
        updated_at: new Date(),
      })
      .where(
        and(
          eq(locations.id, id),
          eq(locations.company_id, session!.user.company_id),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Lokasi tidak ditemukan' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated });

  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Kode lokasi sudah digunakan' },
        { status: 409 },
      );
    }
    console.error('[locations/:id] PATCH error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// DELETE — nonaktifkan lokasi (soft delete)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { allowed } = await requireRole(session!.user.role_id, ['superadmin']);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Hanya Superadmin yang dapat menghapus lokasi' },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const [updated] = await db
      .update(locations)
      .set({ is_active: false, updated_at: new Date() })
      .where(
        and(
          eq(locations.id, id),
          eq(locations.company_id, session!.user.company_id),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Lokasi tidak ditemukan' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lokasi berhasil dinonaktifkan',
    });

  } catch (err) {
    console.error('[locations/:id] DELETE error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
