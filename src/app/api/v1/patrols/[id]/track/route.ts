import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patrols, patrol_tracks } from '@/db/schema';
import { trackBatchSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/utils/auth-guard';
import { haversineDistance } from '@/lib/utils/geo';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> }; // id = patrol_id

// POST — kirim batch GPS breadcrumb (dipanggil tiap ~30 detik dari mobile)
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id: patrolId } = await params;

  try {
    const body   = await req.json();
    const parsed = trackBatchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { tracks } = parsed.data;

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
        { success: false, error: 'Sesi patroli sudah selesai, tidak bisa menambah track' },
        { status: 422 },
      );
    }

    // Insert semua titik dalam satu batch
    const inserted = await db
      .insert(patrol_tracks)
      .values(
        tracks.map((t) => ({
          patrol_id:   patrolId,
          latitude:    String(t.latitude),
          longitude:   String(t.longitude),
          recorded_at: new Date(t.recorded_at),
        })),
      )
      .returning();

    // Hitung tambahan jarak tempuh dari titik2 baru ini, akumulasi ke total_distance_meters
    let addedDistance = 0;
    for (let i = 1; i < tracks.length; i++) {
      addedDistance += haversineDistance(
        tracks[i - 1].latitude, tracks[i - 1].longitude,
        tracks[i].latitude,     tracks[i].longitude,
      );
    }

    if (addedDistance > 0) {
      await db
        .update(patrols)
        .set({
          total_distance_meters: (patrol.total_distance_meters ?? 0) + Math.round(addedDistance),
        })
        .where(eq(patrols.id, patrolId));
    }

    return NextResponse.json({
      success: true,
      data: { tracks_saved: inserted.length },
    }, { status: 201 });

  } catch (err) {
    console.error('[patrols/:id/track] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
