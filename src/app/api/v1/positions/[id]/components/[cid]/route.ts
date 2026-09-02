import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payroll_components, positions } from '@/db/schema';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

type Params = { params: Promise<{ id: string; cid: string }> };

const updateComponentSchema = z.object({
  name:   z.string().min(2).max(100).optional(),
  type:   z.enum(['allowance', 'deduction']).optional(),
  amount: z.number().min(0).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { allowed } = await requireRole(session!.user.role_id, ['superadmin']);
  if (!allowed) {
    return NextResponse.json({ success: false, error: 'Akses ditolak' }, { status: 403 });
  }

  const { id: positionId, cid } = await params;

  try {
    const body   = await req.json();
    const parsed = updateComponentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, type, amount } = parsed.data;

    const [updated] = await db
      .update(payroll_components)
      .set({
        ...(name   !== undefined && { name }),
        ...(type   !== undefined && { type }),
        ...(amount !== undefined && { amount: String(amount) }),
      })
      .where(and(eq(payroll_components.id, cid), eq(payroll_components.position_id, positionId)))
      .returning();

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Komponen tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });

  } catch (err) {
    console.error('[positions/:id/components/:cid] PATCH error:', err);
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

  const { id: positionId, cid } = await params;

  try {
    await db
      .delete(payroll_components)
      .where(and(eq(payroll_components.id, cid), eq(payroll_components.position_id, positionId)));

    return NextResponse.json({ success: true, message: 'Komponen berhasil dihapus' });

  } catch (err) {
    console.error('[positions/:id/components/:cid] DELETE error:', err);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
