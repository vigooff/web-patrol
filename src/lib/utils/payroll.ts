import { db } from '@/db';
import { attendances, payroll_components, users, positions } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Kalkulasi gaji bulanan untuk satu user.
 * Analogi RPG: ini "loot calculator" akhir dungeon —
 * jumlahkan semua reward (tunjangan), kurangi semua tax/potongan,
 * hasil akhir adalah net_salary yang didapat player.
 */
export async function calculateMonthlyPayroll(
  userId: string,
  month: number,
  year: number,
) {
  // 1. Ambil data user + jabatan
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error('User tidak ditemukan');
  if (!user.position_id) throw new Error('User belum memiliki jabatan');

  const [position] = await db
    .select()
    .from(positions)
    .where(eq(positions.id, user.position_id))
    .limit(1);

  if (!position) throw new Error('Jabatan tidak ditemukan');

  // 2. Ambil komponen gaji (tunjangan & potongan) dari jabatan
  const components = await db
    .select()
    .from(payroll_components)
    .where(eq(payroll_components.position_id, position.id));

  const totalAllowance = components
    .filter((c) => c.type === 'allowance')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const totalDeduction = components
    .filter((c) => c.type === 'deduction')
    .reduce((sum, c) => sum + Number(c.amount), 0);

  // 3. Hitung rekap absensi bulan ini
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate   = `${year}-${String(month).padStart(2, '0')}-31`;

  const monthAttendances = await db
    .select()
    .from(attendances)
    .where(
      and(
        eq(attendances.user_id, userId),
        gte(attendances.date, startDate),
        lte(attendances.date, endDate),
      ),
    );

  const presentDays = monthAttendances.filter((a) => a.status === 'present').length;
  const sickDays    = monthAttendances.filter((a) => a.status === 'sick').length;
  const leaveDays   = monthAttendances.filter((a) => a.status === 'leave').length;
  const absentDays  = monthAttendances.filter((a) => a.status === 'absent').length;

  const totalOvertimeHours = monthAttendances.reduce(
    (sum, a) => sum + Number(a.overtime_hours ?? 0),
    0,
  );

  // 4. Hitung lembur (rate per jam = base_salary / 173 jam kerja standar/bulan)
  const baseSalary   = Number(position.base_salary ?? 0);
  const overtimeRate = baseSalary / 173;
  const overtimePay  = totalOvertimeHours * overtimeRate * 1.5; // 1.5x rate lembur

  // 5. Hitung PPh21
  const grossIncome = baseSalary + totalAllowance + overtimePay;
  const pph21Amount = grossIncome * (Number(position.pph21_rate) / 100);

  // 6. Net salary
  const netSalary = grossIncome - totalDeduction - pph21Amount;

  return {
    user_id:          userId,
    period_month:     month,
    period_year:      year,
    base_salary:      baseSalary.toFixed(2),
    total_allowance:  totalAllowance.toFixed(2),
    overtime_pay:     overtimePay.toFixed(2),
    total_deduction:  totalDeduction.toFixed(2),
    pph21_amount:      pph21Amount.toFixed(2),
    net_salary:        netSalary.toFixed(2),
    work_days:         monthAttendances.length,
    present_days:      presentDays,
    sick_days:         sickDays,
    leave_days:        leaveDays,
    absent_days:       absentDays,
  };
}
