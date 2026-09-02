import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { positions } from '@/db/schema';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const updatePositionSchema = z.object({
  name:        z.string().min(2).max(100).optional(),
  base_salary: z.number().min(0).optional(),
  pph21_rate:  z.number().min(0).max(100).optional(),
});

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  const [position] = await db
    .select()
    .from(positions)
    .where(and(eq(positions.id, id), eq(positions.company_id, session!.user.company_id)))
    .limit(1);

  if (!position) {
    return NextResponse.json({ success: false, error: 'Jabatan tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: position });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { allowed } = await requireRole(session!.user.role_id, ['superadmin']);
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body   = await req.json();
    const parsed = updatePositionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, base_salary, pph21_rate } = parsed.data;

    const [updated] = await db
      .update(positions)
      .set({
        ...(name        !== undefined && { name }),
        ...(base_salary !== undefined && { base_salary: String(base_salary) }),
        ...(pph21_rate  !== undefined && { pph21_rate: String(pph21_rate) }),
      })
      .where(and(eq(positions.id, id), eq(positions.company_id, session!.user.company_id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Jabatan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });

  } catch (err) {
    console.error('[positions/:id] PATCH error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { allowed } = await requireRole(session!.user.role_id, ['superadmin']);
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  }

  const { id } = await params;

  try {
    await db
      .delete(positions)
      .where(and(eq(positions.id, id), eq(positions.company_id, session!.user.company_id)));

    return NextResponse.json({ success: true, message: 'Jabatan berhasil dihapus' });

  } catch (err) {
    console.error('[positions/:id] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
