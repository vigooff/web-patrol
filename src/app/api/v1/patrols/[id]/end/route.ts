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

// Kode alasan hasil patroli ditandai "perlu ditinjau" admin/PT:
// - no_checkpoint : lokasi belum punya checkpoint terdaftar (masalah konfigurasi)
// - no_scan       : ada checkpoint, tetapi tidak ada satu pun yang discan
// - incomplete    : ada checkpoint yang belum discan sama sekali
// - invalid_scan  : ada scan di luar jarak titik checkpoint yang belum diperbaiki
type ReviewReason = 'no_checkpoint' | 'no_scan' | 'incomplete' | 'invalid_scan';

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

    // Ringkasan: checkpoint di lokasi vs log scan pada sesi ini
    const checkpointRows = await db
      .select({ id: patrol_checkpoints.id })
      .from(patrol_checkpoints)
      .where(eq(patrol_checkpoints.location_id, patrol.location_id));

    const logRows = await db
      .select({
        checkpoint_id: patrol_logs.checkpoint_id,
        is_valid:      patrol_logs.is_valid,
      })
      .from(patrol_logs)
      .where(eq(patrol_logs.patrol_id, patrolId));

    const total         = checkpointRows.length;
    const checkpointIds = new Set(checkpointRows.map((c) => c.id));
    const scannedAny    = new Set<string>(); // checkpoint yang punya log (valid/invalid)
    const scannedValid  = new Set<string>(); // checkpoint yang punya log valid
    let   invalidCount  = 0;

    for (const log of logRows) {
      if (!checkpointIds.has(log.checkpoint_id)) continue;
      scannedAny.add(log.checkpoint_id);
      if (log.is_valid === false) invalidCount += 1;
      else scannedValid.add(log.checkpoint_id);
    }

    const reasons: ReviewReason[] = [];
    if (total === 0) {
      reasons.push('no_checkpoint');
    } else {
      if (scannedAny.size === 0)         reasons.push('no_scan');
      else if (scannedAny.size < total)  reasons.push('incomplete');
      if (invalidCount > 0)              reasons.push('invalid_scan');
    }
    const needsReview = reasons.length > 0;

    const [updated] = await db
      .update(patrols)
      .set({
        end_time:       new Date(),
        status:         'completed',
        notes:          parsed.data.notes,
        review_status:  needsReview ? 'pending' : 'none',
        review_reasons: needsReview ? reasons : null,
      })
      .where(
        and(
          eq(patrols.id, patrolId),
          eq(patrols.status, 'ongoing'),
        ),
      )
      .returning();

    // Dua permintaan "akhiri" bersamaan: yang kedua tidak menemukan sesi ongoing
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Sesi patroli sudah diakhiri sebelumnya' },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        patrol_id:             updated.id,
        end_time:              updated.end_time,
        total_distance_meters: updated.total_distance_meters,
        checkpoints_total:     total,
        checkpoints_scanned:   scannedValid.size, // hanya scan yang valid
        checkpoints_invalid:   invalidCount,
        completion_rate:       total > 0
          ? Math.round((scannedValid.size / total) * 100)
          : 0,
        needs_review:          needsReview,
        review_reasons:        reasons,
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