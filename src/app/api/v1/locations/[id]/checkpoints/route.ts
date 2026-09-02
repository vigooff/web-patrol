import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patrol_checkpoints, locations } from '@/db/schema';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import crypto from 'crypto';

const createCheckpointSchema = z.object({
  name:        z.string().min(2).max(255),
  latitude:    z.number().min(-90).max(90).optional(),
  longitude:   z.number().min(-180).max(180).optional(),
  order_index: z.number().int().min(0).default(0),
});

type Params = { params: Promise<{ id: string }> };

// GET — list checkpoint di satu lokasi (urut sesuai rute patroli)
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const [location] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, id),
          eq(locations.company_id, session!.user.company_id),
        ),
      )
      .limit(1);

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Lokasi tidak ditemukan' },
        { status: 404 },
      );
    }

    const checkpoints = await db
      .select()
      .from(patrol_checkpoints)
      .where(eq(patrol_checkpoints.location_id, id))
      .orderBy(patrol_checkpoints.order_index);

    return NextResponse.json({ success: true, data: checkpoints });

  } catch (err) {
    console.error('[locations/:id/checkpoints] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// POST — tambah checkpoint baru (auto-generate QR code unik)
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { allowed } = await requireRole(session!.user.role_id, ['superadmin']);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Hanya Superadmin yang dapat menambah checkpoint' },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const [location] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.id, id),
          eq(locations.company_id, session!.user.company_id),
        ),
      )
      .limit(1);

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Lokasi tidak ditemukan' },
        { status: 404 },
      );
    }

    const body   = await req.json();
    const parsed = createCheckpointSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, latitude, longitude, order_index } = parsed.data;

    // QR code unik: kombinasi location code + random token
    // Format ini sengaja dibuat tidak mudah ditebak (anti-tamper)
    const qrCode = `${location.code}-${crypto.randomBytes(8).toString('hex')}`;

    const [checkpoint] = await db
      .insert(patrol_checkpoints)
      .values({
        location_id: id,
        name,
        qr_code:     qrCode,
        latitude:    latitude !== undefined ? String(latitude) : undefined,
        longitude:   longitude !== undefined ? String(longitude) : undefined,
        order_index,
      })
      .returning();

    return NextResponse.json({ success: true, data: checkpoint }, { status: 201 });

  } catch (err) {
    console.error('[locations/:id/checkpoints] POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
