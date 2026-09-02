import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { updateUserSchema } from '@/lib/validations';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET — detail satu pegawai (Admin/HRD bisa lihat siapa saja, employee hanya diri sendiri)
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const isSelf = session!.user.id === id;

    if (!isSelf) {
      const { allowed } = await requireRole(session!.user.role_id, ['superadmin', 'hrd']);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak' },
          { status: 403 },
        );
      }
    }

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, id),
          eq(users.company_id, session!.user.company_id),
        ),
      )
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Pegawai tidak ditemukan' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: user });

  } catch (err) {
    console.error('[users/:id] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// PATCH — update data pegawai (Admin/HRD only)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const { allowed } = await requireRole(session!.user.role_id, ['superadmin', 'hrd']);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak' },
        { status: 403 },
      );
    }

    const body   = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(
        and(
          eq(users.id, id),
          eq(users.company_id, session!.user.company_id),
        ),
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Pegawai tidak ditemukan' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated });

  } catch (err) {
    console.error('[users/:id] PATCH error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// DELETE — nonaktifkan pegawai (soft delete, bukan hapus permanen)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const { allowed } = await requireRole(session!.user.role_id, ['superadmin']);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Hanya Superadmin yang dapat menonaktifkan pegawai' },
        { status: 403 },
      );
    }

    const [deactivated] = await db
      .update(users)
      .set({ is_active: false, updatedAt: new Date() })
      .where(
        and(
          eq(users.id, id),
          eq(users.company_id, session!.user.company_id),
        ),
      )
      .returning();

    if (!deactivated) {
      return NextResponse.json(
        { success: false, error: 'Pegawai tidak ditemukan' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pegawai telah dinonaktifkan',
    });

  } catch (err) {
    console.error('[users/:id] DELETE error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
