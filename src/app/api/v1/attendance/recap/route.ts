import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances, users } from '@/db/schema';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const { searchParams } = req.nextUrl;
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1);
    const year  = Number(searchParams.get('year')  ?? new Date().getFullYear());

    // FIX KRITIS: Hitung tanggal terakhir secara dinamis (Anti-Error Kalender)
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // Ambil semua user di company ini
    const companyUsers = await db
      .select({ id: users.id, name: users.name, employee_id: users.employee_id })
      .from(users)
      .where(eq(users.company_id, session!.user.company_id));

    if (companyUsers.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const userIds = companyUsers.map((u) => u.id);

    // Ambil data records dari database
    const records = await db
      .select()
      .from(attendances)
      .where(
        and(
          inArray(attendances.user_id, userIds),
          gte(attendances.date, startDate),
          lte(attendances.date, endDate),
        ),
      )
      .orderBy(attendances.date);

    return NextResponse.json({ success: true, data: records });

  } catch (err) {
    console.error('[attendance/recap] error:', err);
    return NextResponse.json({ success: false, error: 'Gagal mengambil rekap presensi' }, { status: 500 });
  }
}