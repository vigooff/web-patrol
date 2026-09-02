import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patrol_checkpoints, locations } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

// GET — verifikasi QR code checkpoint sebelum scan
// Dipanggil mobile app saat kamera berhasil baca QR code
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const qrCode = req.nextUrl.searchParams.get('qr_code');
  if (!qrCode) {
    return NextResponse.json(
      { success: false, error: 'QR code wajib disertakan' },
      { status: 400 },
    );
  }

  try {
    const [checkpoint] = await db
      .select({
        id:          patrol_checkpoints.id,
        name:        patrol_checkpoints.name,
        order_index: patrol_checkpoints.order_index,
        latitude:    patrol_checkpoints.latitude,
        longitude:   patrol_checkpoints.longitude,
        location_id: patrol_checkpoints.location_id,
      })
      .from(patrol_checkpoints)
      .where(eq(patrol_checkpoints.qr_code, qrCode))
      .limit(1);

    if (!checkpoint) {
      return NextResponse.json(
        { success: false, error: 'QR Code tidak valid atau tidak terdaftar di sistem' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: checkpoint });

  } catch (err) {
    console.error('[patrols/checkpoints] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
