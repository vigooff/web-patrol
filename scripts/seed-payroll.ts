import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function main() {
  const { db }  = await import('../src/db/index.js');
  const schema  = await import('../src/db/schema/index.js');
  const { eq, and, gte, lte, inArray, sql } = await import('drizzle-orm');

  const {
    companies, users, positions, payroll_components,
    attendances, salary_records,
  } = schema;

  // 3 company demo saja — skip Macrosoft
  const TARGET_CODES = ['NAS-01', 'BMI-01', 'SNP-01'];

  console.log('\n💰 Memulai seeding payroll...\n');

  // Ambil 3 company target
  const allCompanies = await db.select().from(companies);
  const targetCompanies = allCompanies.filter((c: any) => TARGET_CODES.includes(c.code));

  if (targetCompanies.length === 0) {
    console.log('❌ Tidak ada company target ditemukan. Jalankan seed:demo dulu.');
    return;
  }

  let totalCreated  = 0;
  let totalSkipped  = 0;

  for (const company of targetCompanies) {
    console.log(`\n📦 ${company.name}`);

    // Ambil semua user aktif company ini yang punya jabatan
    const companyUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.company_id, company.id), eq(users.is_active, true)));

    const usersWithPosition = companyUsers.filter((u: any) => u.position_id);

    if (usersWithPosition.length === 0) {
      console.log('  ⚠️  Tidak ada pegawai dengan jabatan, dilewati');
      continue;
    }

    const userIds = usersWithPosition.map((u: any) => u.id);

    // ✅ FIX 2: Hapus orderBy() dari query database dan urutkan menggunakan JavaScript
    // Mencegah error "ORDER BY expressions must appear in select list" dari PostgreSQL
    const rawAttendanceMonths = await db
      .selectDistinct({
        month: sql<number>`EXTRACT(MONTH FROM ${attendances.date}::date)::int`,
        year:  sql<number>`EXTRACT(YEAR  FROM ${attendances.date}::date)::int`,
      })
      .from(attendances)
      .where(inArray(attendances.user_id, userIds));

    // Urutkan (Sorting) array secara dinamis di level kode
    const attendanceMonths = rawAttendanceMonths.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    if (attendanceMonths.length === 0) {
      console.log('  ⚠️  Tidak ada data attendance, dilewati');
      continue;
    }

    console.log(`  📅 Ditemukan ${attendanceMonths.length} periode: ${attendanceMonths.map((m: any) => `${m.month}/${m.year}`).join(', ')}`);

    // Proses setiap bulan
    for (const { month, year } of attendanceMonths) {
      // Hitung tanggal terakhir dinamis sesuai kalender
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      let monthCreated = 0;
      let monthSkipped = 0;

      for (const user of usersWithPosition) {
        // Skip kalau sudah ada record untuk periode ini
        const [existing] = await db
          .select({ id: salary_records.id })
          .from(salary_records)
          .where(
            and(
              eq(salary_records.user_id, user.id),
              eq(salary_records.period_month, month),
              eq(salary_records.period_year, year),
            ),
          )
          .limit(1);

        if (existing) {
          monthSkipped++;
          continue;
        }

        // Ambil jabatan + gaji pokok
        const [position] = await db
          .select()
          .from(positions)
          .where(eq(positions.id, user.position_id!))
          .limit(1);

        if (!position) {
          monthSkipped++;
          continue;
        }

        const baseSalary = Number(position.base_salary ?? 0);
        const pph21Rate  = Number(position.pph21_rate ?? 0);

        // Ambil komponen gaji (tunjangan & potongan)
        const components = await db
          .select()
          .from(payroll_components)
          .where(eq(payroll_components.position_id, position.id));

        const totalAllowance = components
          .filter((c: any) => c.type === 'allowance')
          .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

        const totalDeduction = components
          .filter((c: any) => c.type === 'deduction')
          .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

        // Ambil rekap attendance bulan ini
        const monthAttendances = await db
          .select()
          .from(attendances)
          .where(
            and(
              eq(attendances.user_id, user.id),
              gte(attendances.date, startDate),
              lte(attendances.date, endDate),
            ),
          );

        const presentDays = monthAttendances.filter((a: any) => a.status === 'present').length;
        const sickDays    = monthAttendances.filter((a: any) => a.status === 'sick').length;
        const leaveDays   = monthAttendances.filter((a: any) => a.status === 'leave').length;
        const absentDays  = monthAttendances.filter((a: any) => a.status === 'absent').length;
        const workDays    = monthAttendances.length;

        const totalOvertimeHours = monthAttendances.reduce(
          (sum: number, a: any) => sum + Number(a.overtime_hours ?? 0), 0,
        );

        // Hitung lembur: (gaji pokok / 173 jam) × 1.5 × jam lembur
        const overtimeRate = baseSalary > 0 ? (baseSalary / 173) * 1.5 : 0;
        const overtimePay  = Math.round(totalOvertimeHours * overtimeRate);

        // Hitung PPh21 dari gross income
        const grossIncome = baseSalary + totalAllowance + overtimePay;
        const pph21Amount = Math.round(grossIncome * (pph21Rate / 100));

        // Gaji bersih
        const netSalary = grossIncome - totalDeduction - pph21Amount;

        await db.insert(salary_records).values({
          user_id:          user.id,
          period_month:     month,
          period_year:      year,
          base_salary:      String(baseSalary),
          total_allowance:  String(totalAllowance),
          overtime_pay:     String(overtimePay),
          total_deduction:  String(totalDeduction),
          pph21_amount:     String(pph21Amount),
          net_salary:       String(Math.max(0, netSalary)),
          work_days:        workDays,
          present_days:     presentDays,
          sick_days:        sickDays,
          leave_days:       leaveDays,
          absent_days:      absentDays,
          status:           'draft',
        });

        monthCreated++;
      }

      console.log(`    ${month}/${year} → ✅ ${monthCreated} dibuat, ${monthSkipped > 0 ? `ℹ️ ${monthSkipped} dilewati` : ''}`);
      totalCreated += monthCreated;
      totalSkipped += monthSkipped;
    }
  }

  console.log(`\n✨ Seeding payroll selesai!`);
  console.log(`   Total slip dibuat  : ${totalCreated}`);
  console.log(`   Total dilewati     : ${totalSkipped}`);
  console.log(`\n💡 Status: DRAFT — admin perlu review dan klik Publish sebelum karyawan bisa lihat.`);
  console.log(`   Buka /dashboard/payroll untuk review dan publish slip gaji.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Seeding payroll gagal:', err.message);
    console.error(err);
    process.exit(1);
  });