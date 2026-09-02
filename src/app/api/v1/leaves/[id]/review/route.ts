import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaves } from '@/db/schema';
import { approveLeaveSchema } from '@/lib/validations';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// PATCH — setujui atau tolak pengajuan izin (Admin/HRD only)
// Body: { "status": "approved" | "rejected", "notes"?: string }
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  const { id } = await params;

  try {
    const body   = await req.json();
    const parsed = approveLeaveSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, notes } = parsed.data;

    const [existing] = await db
      .select()
      .from(leaves)
      .where(eq(leaves.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Pengajuan tidak ditemukan' },
        { status: 404 },
      );
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Pengajuan sudah ${existing.status === 'approved' ? 'disetujui' : 'ditolak'} sebelumnya` },
        { status: 422 },
      );
    }

    const [updated] = await db
      .update(leaves)
      .set({
        status,
        reason:      notes ? `${existing.reason ?? ''}\n[Catatan reviewer]: ${notes}`.trim() : existing.reason,
        approved_by: session!.user.id,
        approved_at: new Date(),
      })
      .where(eq(leaves.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });

  } catch (err) {
    console.error('[leaves/:id/review] PATCH error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
