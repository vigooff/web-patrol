import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sos_reports } from '@/db/schema';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  const { id } = await params;

  const [updated] = await db
    .update(sos_reports)
    .set({ status: 'handled', handled_by: session!.user.id, handled_at: new Date() })
    .where(eq(sos_reports.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ success: false, error: 'Laporan tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: updated });
}
