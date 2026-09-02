import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salary_records, users } from '@/db/schema';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq, and, inArray } from 'drizzle-orm';

// GET — list rekap gaji semua pegawai, dengan filter opsional ?month=&year=
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year  = searchParams.get('year');

    const companyUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.company_id, session!.user.company_id));

    const userIds = companyUsers.map((u) => u.id);

    const conditions = [inArray(salary_records.user_id, userIds)];
    if (month) conditions.push(eq(salary_records.period_month, Number(month)));
    if (year)  conditions.push(eq(salary_records.period_year, Number(year)));

    const records = await db
      .select()
      .from(salary_records)
      .where(and(...conditions));

    return NextResponse.json({ success: true, data: records });

  } catch (err) {
    console.error('[payroll] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
