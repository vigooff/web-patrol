import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patrols, patrol_logs, patrol_checkpoints } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const endPatrolSchema = z.object({
  notes: z.string().max(1000).optional(),
});

type Params = { params: Promise<{ id: string }> }; // id = patrol_id

// POST — akhiri sesi patroli
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id: patrolId } = await params;

  try {
    const body   = await req.json().catch(() => ({}));
    const parsed = endPatrolSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const [patrol] = await db
      .select()
      .from(patrols)
      .where(
        and(
          eq(patrols.id, patrolId),
          eq(patrols.user_id, session!.user.id),
        ),
      )
      .limit(1);

    if (!patrol) {
      return NextResponse.json(
        { success: false, error: 'Sesi patroli tidak ditemukan' },
        { status: 404 },
      );
    }

    if (patrol.status !== 'ongoing') {
      return NextResponse.json(
        { success: false, error: 'Sesi patroli sudah diakhiri sebelumnya' },
        { status: 422 },
      );
    }

    // Hitung ringkasan: berapa checkpoint yang berhasil di-scan vs total checkpoint di lokasi
    const totalCheckpoints = await db
      .select()
      .from(patrol_checkpoints)
      .where(eq(patrol_checkpoints.location_id, patrol.location_id));

    const scannedLogs = await db
      .select()
      .from(patrol_logs)
      .where(eq(patrol_logs.patrol_id, patrolId));

    const [updated] = await db
      .update(patrols)
      .set({
        end_time: new Date(),
        status:   'completed',
        notes:    parsed.data.notes,
      })
      .where(eq(patrols.id, patrolId))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        patrol_id:            updated.id,
        end_time:             updated.end_time,
        total_distance_meters: updated.total_distance_meters,
        checkpoints_scanned:  scannedLogs.length,
        checkpoints_total:    totalCheckpoints.length,
        completion_rate: totalCheckpoints.length > 0
          ? Math.round((scannedLogs.length / totalCheckpoints.length) * 100)
          : null,
      },
    });

  } catch (err) {
    console.error('[patrols/:id/end] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
