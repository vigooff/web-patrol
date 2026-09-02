import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { locations } from '@/db/schema';
import { createLocationSchema } from '@/lib/validations';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const allLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.company_id, session.user.company_id));

    return NextResponse.json({ success: true, data: allLocations });

  } catch (error) {
    console.error('[locations] error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // TODO: tambahkan role guard — hanya Admin yang boleh tambah lokasi

    const body   = await req.json();
    const parsed = createLocationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, code, address, latitude, longitude, radius_meters } = parsed.data;

    const [location] = await db
      .insert(locations)
      .values({
        company_id: session.user.company_id,
        name,
        code,
        address,
        latitude:      String(latitude),
        longitude:     String(longitude),
        radius_meters,
      })
      .returning();

    return NextResponse.json({ success: true, data: location }, { status: 201 });

  } catch (error: any) {
    if (error?.code === '23505') { // unique constraint violation
      return NextResponse.json(
        { success: false, error: 'Kode lokasi sudah digunakan' },
        { status: 409 },
      );
    }
    console.error('[locations] error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
