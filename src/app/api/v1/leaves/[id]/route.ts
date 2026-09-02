import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { leaves } from '@/db/schema';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET — detail satu pengajuan izin
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const [leave] = await db
      .select()
      .from(leaves)
      .where(eq(leaves.id, id))
      .limit(1);

    if (!leave) {
      return NextResponse.json(
        { success: false, error: 'Pengajuan tidak ditemukan' },
        { status: 404 },
      );
    }

    // Employee hanya boleh lihat pengajuan miliknya sendiri
    if (leave.user_id !== session!.user.id) {
      const { allowed } = await requireRole(session!.user.role_id, ['superadmin', 'hrd']);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak' },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ success: true, data: leave });

  } catch (err) {
    console.error('[leaves/:id] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
