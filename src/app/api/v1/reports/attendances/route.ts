import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attendances, users } from '@/db/schema';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const { searchParams } = req.nextUrl;
    const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1);
    const year  = Number(searchParams.get('year')  ?? new Date().getFullYear());

    // FIX 1: Cari tanggal terakhir di bulan ini (jangan di-hardcode 31)
    const lastDay = new Date(year, month, 0).getDate();
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

    // Ambil semua user company ini
    const companyUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, employee_id: users.employee_id })
      .from(users)
      .where(eq(users.company_id, session!.user.company_id));

    if (companyUsers.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada pegawai' }, { status: 404 });
    }

    const userIds = companyUsers.map((u) => u.id);

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

    // Build map user id → name
    const userMap = Object.fromEntries(companyUsers.map((u) => [u.id, u]));

    // FIX 2: Sediakan fallback Header jika array kosong
    const rows = records.length > 0 ? records.map((r) => {
      const user = userMap[r.user_id];
      return {
        'ID Pegawai':    user?.employee_id ?? '-',
        'Nama':          user?.name ?? '-',
        'Tanggal':       r.date,
        'Status':        r.status === 'present' ? 'Hadir' : r.status === 'sick' ? 'Sakit' : r.status === 'leave' ? 'Izin' : 'Alpa',
        'Jam Masuk':     r.check_in_time  ? new Date(r.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })  : '-',
        'Jam Keluar':    r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Jam Kerja':     r.work_hours     ? `${Number(r.work_hours).toFixed(1)} jam` : '-',
        'Lembur':        r.overtime_hours && Number(r.overtime_hours) > 0 ? `${Number(r.overtime_hours).toFixed(1)} jam` : '-',
        'GPS Mencurigakan': r.is_fake_gps ? 'Ya' : 'Tidak',
      };
    }) : [{
      'ID Pegawai': 'BELUM ADA DATA', 'Nama': '-', 'Tanggal': '-', 'Status': '-', 'Jam Masuk': '-', 'Jam Keluar': '-', 'Jam Kerja': '-', 'Lembur': '-', 'GPS Mencurigakan': '-'
    }];

    // Buat workbook Excel
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Lebar kolom otomatis
    ws['!cols'] = [
      { wch: 15 }, { wch: 24 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, `Presensi ${MONTHS[month - 1]} ${year}`);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="presensi-${year}-${String(month).padStart(2, '0')}.xlsx"`,
      },
    });

  } catch (err) {
    console.error('[reports/attendance] error:', err);
    return NextResponse.json({ success: false, error: 'Gagal membuat laporan' }, { status: 500 });
  }
}