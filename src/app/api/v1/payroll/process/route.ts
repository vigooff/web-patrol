import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { salary_records, users } from '@/db/schema';
import { calculateMonthlyPayroll } from '@/lib/utils/payroll';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const processPayrollSchema = z.object({
  month: z.number().int().min(1).max(12),
  year:  z.number().int().min(2020).max(2100),
  // Opsional: proses untuk user tertentu saja. Kalau kosong, proses semua karyawan aktif.
  user_ids: z.array(z.string().uuid()).optional(),
});

// POST — proses payroll untuk satu periode (bulan + tahun)
// Hasil disimpan sebagai status "draft" dulu, butuh di-publish terpisah
// supaya admin bisa review dulu sebelum karyawan melihat slip gajinya.
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const body   = await req.json();
    const parsed = processPayrollSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { month, year, user_ids } = parsed.data;

    // Ambil daftar karyawan yang akan diproses
    const targetUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.company_id, session!.user.company_id),
          eq(users.is_active, true),
        ),
      );

    const filteredUsers = user_ids
      ? targetUsers.filter((u) => user_ids.includes(u.id))
      : targetUsers;

    if (filteredUsers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada karyawan yang bisa diproses' },
        { status: 422 },
      );
    }

    const results: Array<{ user_id: string; status: 'success' | 'failed'; error?: string }> = [];

    // Proses satu-satu, supaya kalau satu karyawan gagal (misal belum ada jabatan)
    // tidak menggagalkan proses payroll karyawan lain
    for (const user of filteredUsers) {
      try {
        const payrollData = await calculateMonthlyPayroll(user.id, month, year);

        // Upsert: kalau sudah ada record untuk periode ini, replace (re-process)
        const [existing] = await db
          .select()
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
          if (existing.status === 'published') {
            results.push({
              user_id: user.id,
              status: 'failed',
              error: 'Slip gaji sudah dipublish, tidak bisa diproses ulang',
            });
            continue;
          }

          await db
            .update(salary_records)
            .set({
              ...payrollData,
              processed_by: session!.user.id,
              processed_at: new Date(),
            })
            .where(eq(salary_records.id, existing.id));
        } else {
          await db.insert(salary_records).values({
            ...payrollData,
            status:       'draft',
            processed_by: session!.user.id,
            processed_at: new Date(),
          });
        }

        results.push({ user_id: user.id, status: 'success' });

      } catch (err: any) {
        results.push({
          user_id: user.id,
          status:  'failed',
          error:   err?.message ?? 'Gagal memproses payroll',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;

    return NextResponse.json({
      success: true,
      message: `${successCount}/${filteredUsers.length} karyawan berhasil diproses`,
      data: results,
    });

  } catch (err) {
    console.error('[payroll/process] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
