import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patrols, locations } from '@/db/schema';
import { startPatrolSchema } from '@/lib/validations';
import { requireAuth } from '@/lib/utils/auth-guard';
import { validateGeofence } from '@/lib/utils/geo';
import { eq, and } from 'drizzle-orm';

// POST — mulai sesi patroli baru
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const body   = await req.json();
    const parsed = startPatrolSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { location_id, latitude, longitude } = parsed.data;

    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, location_id))
      .limit(1);

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Lokasi tidak ditemukan' },
        { status: 404 },
      );
    }

    // Pastikan karyawan benar-benar berada di lokasi sebelum mulai patroli
    const geoCheck = validateGeofence({
      userLat:      latitude,
      userLng:      longitude,
      locationLat:  Number(location.latitude),
      locationLng:  Number(location.longitude),
      radiusMeters: location.radius_meters ?? 100,
    });

    if (!geoCheck.isWithinRadius) {
      return NextResponse.json(
        {
          success: false,
          error: `Anda berada ${geoCheck.distanceMeters}m dari lokasi. Tidak bisa memulai patroli dari luar area.`,
        },
        { status: 422 },
      );
    }

    // Cek apakah user masih punya sesi patroli yang belum selesai
    const [ongoing] = await db
      .select()
      .from(patrols)
      .where(
        and(
          eq(patrols.user_id, session!.user.id),
          eq(patrols.status, 'ongoing'),
        ),
      )
      .limit(1);

    if (ongoing) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anda masih memiliki sesi patroli yang belum selesai',
          data: { ongoing_patrol_id: ongoing.id },
        },
        { status: 409 },
      );
    }

    const [patrol] = await db
      .insert(patrols)
      .values({
        user_id:     session!.user.id,
        location_id,
        start_time:  new Date(),
        status:      'ongoing',
      })
      .returning();

    return NextResponse.json({ success: true, data: patrol }, { status: 201 });

  } catch (err) {
    console.error('[patrols/start] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
