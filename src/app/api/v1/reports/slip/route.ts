import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salary_records, users, positions, companies } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';

// GET /api/v1/reports/slip?userId=&month=&year=
// Generate slip gaji PDF untuk satu pegawai satu periode
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const userId = searchParams.get('userId') ?? session!.user.id;
  const month  = Number(searchParams.get('month') ?? new Date().getMonth() + 1);
  const year   = Number(searchParams.get('year')  ?? new Date().getFullYear());

  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  try {
    // Ambil data slip gaji
    const [record] = await db
      .select()
      .from(salary_records)
      .where(
        and(
          eq(salary_records.user_id, userId),
          eq(salary_records.period_month, month),
          eq(salary_records.period_year, year),
        ),
      )
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Data slip gaji tidak ditemukan untuk periode ini' },
        { status: 404 },
      );
    }

    // Ambil data user dan company
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const [company] = await db.select().from(companies).where(eq(companies.id, session!.user.company_id)).limit(1);
    const position  = user?.position_id
      ? (await db.select().from(positions).where(eq(positions.id, user.position_id)).limit(1))[0]
      : null;

    // Format Rupiah
    function formatRp(n: string | null) {
      if (!n || Number(n) === 0) return 'Rp 0';
      return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
      }).format(Number(n));
    }

    // Buat HTML untuk di-print ke PDF
    // Kita return HTML yang bisa langsung di-print oleh browser (window.print())
    // lebih reliable daripada server-side PDF generation dengan font issues
    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Slip Gaji - ${user?.name} - ${MONTHS[month - 1]} ${year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #131316; padding: 40px; background: white; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #131316; }
    .company-name { font-size: 18px; font-weight: bold; }
    .slip-title { font-size: 14px; font-weight: bold; text-align: right; }
    .slip-period { font-size: 11px; color: #6B6B76; margin-top: 2px; text-align: right; }
    .employee-section { background: #F7F7F9; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
    .employee-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field label { font-size: 10px; color: #6B6B76; display: block; margin-bottom: 2px; }
    .field span { font-weight: 600; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    .table th { background: #131316; color: white; padding: 8px 12px; text-align: left; font-size: 11px; }
    .table td { padding: 8px 12px; border-bottom: 1px solid #ECECF0; font-size: 11px; }
    .table .amount { text-align: right; }
    .table .negative { color: #C8302E; }
    .table .positive { color: #1B8A4B; }
    .total-row td { font-weight: bold; background: #F7F7F9; font-size: 13px; }
    .attendance { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 20px; }
    .att-item { background: #F7F7F9; padding: 10px; border-radius: 6px; text-align: center; }
    .att-item .num { font-size: 20px; font-weight: bold; }
    .att-item .lbl { font-size: 10px; color: #6B6B76; }
    .footer { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
    .signature { text-align: center; }
    .signature .line { width: 150px; border-bottom: 1px solid #131316; margin: 40px auto 4px; }
    .net-salary { text-align: right; }
    .net-salary .label { font-size: 11px; color: #6B6B76; }
    .net-salary .amount { font-size: 22px; font-weight: bold; }
    @media print {
      body { padding: 20px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <button onclick="window.print()" style="position:fixed;top:16px;right:16px;padding:8px 16px;background:#131316;color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:bold;">
    🖨️ Cetak / Simpan PDF
  </button>

  <div class="header">
    <div>
      <div class="company-name">${company?.name ?? 'Perusahaan'}</div>
      <div style="font-size:11px;color:#6B6B76;margin-top:2px;">${company?.address ?? ''}</div>
    </div>
    <div>
      <div class="slip-title">SLIP GAJI</div>
      <div class="slip-period">${MONTHS[month - 1]} ${year}</div>
    </div>
  </div>

  <div class="employee-section">
    <div class="employee-grid">
      <div class="field"><label>Nama Pegawai</label><span>${user?.name ?? '-'}</span></div>
      <div class="field"><label>ID Pegawai</label><span>${user?.employee_id ?? '-'}</span></div>
      <div class="field"><label>Jabatan</label><span>${position?.name ?? '-'}</span></div>
      <div class="field"><label>Email</label><span>${user?.email ?? '-'}</span></div>
    </div>
  </div>

  <div style="margin-bottom:8px;font-weight:bold;font-size:12px;">Rekap Kehadiran</div>
  <div class="attendance">
    <div class="att-item"><div class="num">${record.work_days}</div><div class="lbl">Hari Kerja</div></div>
    <div class="att-item"><div class="num" style="color:#1B8A4B">${record.present_days}</div><div class="lbl">Hadir</div></div>
    <div class="att-item"><div class="num" style="color:#B7791F">${record.sick_days}</div><div class="lbl">Sakit</div></div>
    <div class="att-item"><div class="num" style="color:#2563D4">${record.leave_days}</div><div class="lbl">Izin</div></div>
    <div class="att-item"><div class="num" style="color:#C8302E">${record.absent_days}</div><div class="lbl">Alpa</div></div>
  </div>

  <div style="margin-bottom:8px;font-weight:bold;font-size:12px;">Rincian Gaji</div>
  <table class="table">
    <tr><th>Komponen</th><th style="text-align:right">Jumlah</th></tr>
    <tr><td>Gaji Pokok</td><td class="amount">${formatRp(record.base_salary)}</td></tr>
    <tr><td class="positive">+ Tunjangan</td><td class="amount positive">${formatRp(record.total_allowance)}</td></tr>
    <tr><td class="positive">+ Uang Lembur</td><td class="amount positive">${formatRp(record.overtime_pay)}</td></tr>
    <tr><td class="negative">- Potongan</td><td class="amount negative">${formatRp(record.total_deduction)}</td></tr>
    <tr><td class="negative">- PPh21 (${position?.pph21_rate ?? 0}%)</td><td class="amount negative">${formatRp(record.pph21_amount)}</td></tr>
    <tr class="total-row"><td>GAJI BERSIH</td><td class="amount">${formatRp(record.net_salary)}</td></tr>
  </table>

  <div class="footer">
    <div class="signature">
      <div>Mengetahui,</div>
      <div class="line"></div>
      <div>HRD / Manager</div>
    </div>
    <div class="net-salary">
      <div class="label">Total Diterima</div>
      <div class="amount">${formatRp(record.net_salary)}</div>
      <div style="font-size:10px;color:#6B6B76;margin-top:2px;">Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });

  } catch (err) {
    console.error('[reports/slip] error:', err);
    return NextResponse.json({ success: false, error: 'Gagal membuat slip gaji' }, { status: 500 });
  }
}
