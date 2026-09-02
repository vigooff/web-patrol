import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salary_records, users } from '@/db/schema';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq, and, inArray } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const { searchParams } = req.nextUrl;
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1);
    const year  = Number(searchParams.get('year')  ?? new Date().getFullYear());

    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    const companyUsers = await db
      .select({ id: users.id, name: users.name, employee_id: users.employee_id })
      .from(users)
      .where(eq(users.company_id, session!.user.company_id));

    if (companyUsers.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada pegawai' }, { status: 404 });
    }

    const userIds  = companyUsers.map((u) => u.id);
    const userMap  = Object.fromEntries(companyUsers.map((u) => [u.id, u]));

    const records = await db
      .select()
      .from(salary_records)
      .where(
        and(
          inArray(salary_records.user_id, userIds),
          eq(salary_records.period_month, month),
          eq(salary_records.period_year,  year),
        ),
      );

    function formatRp(n: string | null) {
      if (!n) return 'Rp 0';
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(n));
    }

    // FIX: Sediakan fallback Header agar tabel tidak blank
    const rows = records.length > 0 ? records.map((r) => ({
      'ID Pegawai':      userMap[r.user_id]?.employee_id ?? '-',
      'Nama':            userMap[r.user_id]?.name ?? '-',
      'Gaji Pokok':      formatRp(r.base_salary),
      'Total Tunjangan': formatRp(r.total_allowance),
      'Lembur':          formatRp(r.overtime_pay),
      'Total Potongan':  formatRp(r.total_deduction),
      'PPh21':           formatRp(r.pph21_amount),
      'Gaji Bersih':     formatRp(r.net_salary),
      'Hari Kerja':      r.work_days,
      'Hadir':           r.present_days,
      'Sakit':           r.sick_days,
      'Izin':            r.leave_days,
      'Alpa':            r.absent_days,
      'Status':          r.status === 'published' ? 'Published' : 'Draft',
    })) : [{
      'ID Pegawai': 'BELUM ADA DATA', 'Nama': '-', 'Gaji Pokok': '-', 'Total Tunjangan': '-', 'Lembur': '-', 'Total Potongan': '-', 'PPh21': '-', 'Gaji Bersih': '-', 'Hari Kerja': '-', 'Hadir': '-', 'Sakit': '-', 'Izin': '-', 'Alpa': '-', 'Status': '-'
    }];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    ws['!cols'] = Array(14).fill({ wch: 16 });

    XLSX.utils.book_append_sheet(wb, ws, `Payroll ${MONTHS[month - 1]} ${year}`);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payroll-${year}-${String(month).padStart(2, '0')}.xlsx"`,
      },
    });

  } catch (err) {
    console.error('[reports/payroll] error:', err);
    return NextResponse.json({ success: false, error: 'Gagal membuat laporan' }, { status: 500 });
  }
}