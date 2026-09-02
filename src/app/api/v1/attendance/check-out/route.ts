import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances } from '@/db/schema';
import { checkOutSchema } from '@/lib/validations';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body   = await req.json();
    const parsed = checkOutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { attendance_id, latitude, longitude, photo_base64, notes } = parsed.data;

    // Pastikan attendance milik user yang login (anti-tamper)
    const [existing] = await db
      .select()
      .from(attendances)
      .where(
        and(
          eq(attendances.id, attendance_id),
          eq(attendances.user_id, session.user.id),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data absensi tidak ditemukan' },
        { status: 404 },
      );
    }

    if (existing.check_out_time) {
      return NextResponse.json(
        { success: false, error: 'Anda sudah check-out hari ini' },
        { status: 422 },
      );
    }

    const photoUrl = photo_base64 ? '/uploads/placeholder.jpg' : undefined;

    // Hitung total jam kerja
    const checkOutTime = new Date();
    const checkInTime  = existing.check_in_time ? new Date(existing.check_in_time) : checkOutTime;
    const workHours     = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

    // Lembur dihitung jika > 8 jam kerja
    const overtimeHours = Math.max(0, workHours - 8);

    const [updated] = await db
      .update(attendances)
      .set({
        check_out_time:  checkOutTime,
        check_out_lat:   String(latitude),
        check_out_lng:   String(longitude),
        check_out_photo: photoUrl,
        work_hours:      workHours.toFixed(2),
        overtime_hours:  overtimeHours.toFixed(2),
        notes:           notes ?? existing.notes,
        updated_at:      new Date(),
      })
      .where(eq(attendances.id, attendance_id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        attendance_id:  updated.id,
        check_out_time: updated.check_out_time,
        work_hours:     updated.work_hours,
        overtime_hours: updated.overtime_hours,
      },
    });

  } catch (error) {
    console.error('[check-out] error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
