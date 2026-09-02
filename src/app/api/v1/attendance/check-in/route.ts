import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances, locations } from '@/db/schema';
import { checkInSchema } from '@/lib/validations';
import { validateGeofence } from '@/lib/utils/geo';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // 1. Cek autentikasi
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // 2. Validasi body
    const body   = await req.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { location_id, latitude, longitude, photo_base64, device_info } = parsed.data;

    // 3. Ambil data lokasi (geofence target)
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

    // 4. Validasi geofence + deteksi fake GPS
    const geoCheck = validateGeofence({
      userLat:        latitude,
      userLng:        longitude,
      locationLat:    Number(location.latitude),
      locationLng:    Number(location.longitude),
      radiusMeters:   location.radius_meters ?? 100,
      accuracyMeters: device_info?.accuracy_meters,
      isMockLocation: device_info?.is_mock_location,
    });

    // 5. Tolak jika di luar radius
    if (!geoCheck.isWithinRadius) {
      return NextResponse.json(
        {
          success: false,
          error: `Anda berada ${geoCheck.distanceMeters}m dari lokasi. Radius maksimal ${location.radius_meters}m`,
          data: { distance_from_location: geoCheck.distanceMeters },
        },
        { status: 422 },
      );
    }

    // 6. Upload foto (TODO: ganti dengan storage provider seperti S3/Cloudinary)
    // const photoUrl = await uploadPhoto(photo_base64);
    const photoUrl = '/uploads/placeholder.jpg'; // placeholder sementara

    // 7. Simpan attendance — tetap simpan meski mencurigakan, tapi flag is_fake_gps
    const today = new Date().toISOString().split('T')[0];

    const [attendance] = await db
      .insert(attendances)
      .values({
        user_id:        session.user.id,
        location_id,
        date:           today,
        status:         'present',
        check_in_time:  new Date(),
        check_in_lat:   String(latitude),
        check_in_lng:   String(longitude),
        check_in_photo: photoUrl,
        is_fake_gps:    geoCheck.isSuspicious,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        attendance_id:           attendance.id,
        status:                  attendance.status,
        is_within_radius:        geoCheck.isWithinRadius,
        distance_from_location:  geoCheck.distanceMeters,
        check_in_time:           attendance.check_in_time,
        warning: geoCheck.isSuspicious
          ? `Terdeteksi kemungkinan kecurangan: ${geoCheck.suspicionReasons.join(', ')}`
          : null,
      },
    });

  } catch (error) {
    console.error('[check-in] error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
