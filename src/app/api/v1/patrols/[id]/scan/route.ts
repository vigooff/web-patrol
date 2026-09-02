import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patrols, patrol_logs, patrol_checkpoints } from '@/db/schema';
import { scanCheckpointSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/utils/auth-guard';
import { haversineDistance } from '@/lib/utils/geo';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> }; // id = patrol_id

// POST — scan QR checkpoint selama sesi patroli berjalan
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id: patrolId } = await params;

  try {
    const body   = await req.json();
    const parsed = scanCheckpointSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { qr_code, latitude, longitude, photo_url } = parsed.data;

    // Pastikan sesi patroli milik user ini dan masih berjalan
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
        { success: false, error: 'Sesi patroli sudah selesai' },
        { status: 422 },
      );
    }

    // Cari checkpoint berdasarkan QR code
    const [checkpoint] = await db
      .select()
      .from(patrol_checkpoints)
      .where(eq(patrol_checkpoints.qr_code, qr_code))
      .limit(1);

    if (!checkpoint) {
      return NextResponse.json(
        { success: false, error: 'QR Code tidak valid atau tidak terdaftar' },
        { status: 404 },
      );
    }

    // Pastikan checkpoint ini milik lokasi yang sama dengan sesi patroli
    if (checkpoint.location_id !== patrol.location_id) {
      return NextResponse.json(
        { success: false, error: 'Checkpoint ini bukan bagian dari rute patroli Anda' },
        { status: 422 },
      );
    }

    // Cek apakah checkpoint ini sudah pernah di-scan di sesi yang sama (anti scan dobel)
    const [alreadyScanned] = await db
      .select()
      .from(patrol_logs)
      .where(
        and(
          eq(patrol_logs.patrol_id, patrolId),
          eq(patrol_logs.checkpoint_id, checkpoint.id),
        ),
      )
      .limit(1);

    if (alreadyScanned) {
      return NextResponse.json(
        { success: false, error: 'Checkpoint ini sudah di-scan sebelumnya di sesi ini' },
        { status: 409 },
      );
    }

    // Validasi jarak GPS user terhadap titik checkpoint (radius longgar 30m,
    // karena checkpoint biasanya titik kecil, bukan area luas seperti lokasi gedung)
    let isValid = true;
    if (checkpoint.latitude && checkpoint.longitude) {
      const distance = haversineDistance(
        latitude, longitude,
        Number(checkpoint.latitude), Number(checkpoint.longitude),
      );
      isValid = distance <= 30;
    }

    const [log] = await db
      .insert(patrol_logs)
      .values({
        patrol_id:     patrolId,
        checkpoint_id: checkpoint.id,
        latitude:      String(latitude),
        longitude:     String(longitude),
        photo_url,
        is_valid:      isValid,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        log_id:          log.id,
        checkpoint_name: checkpoint.name,
        is_valid:        isValid,
        warning: !isValid
          ? 'Lokasi scan cukup jauh dari titik checkpoint terdaftar'
          : null,
      },
    }, { status: 201 });

  } catch (err) {
    console.error('[patrols/:id/scan] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
