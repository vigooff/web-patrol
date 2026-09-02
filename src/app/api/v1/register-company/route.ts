import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { companies, roles, users } from '@/db/schema';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const registerCompanySchema = z.object({
  companyName: z.string().min(2).max(255),
  companyCode: z.string().min(2).max(50),
  name:        z.string().min(2).max(255),
  email:       z.string().email(),
  password:    z.string().min(8),
});

// POST — daftarkan perusahaan baru + akun superadmin pertamanya sekaligus.
// Ini SATU-SATUNYA cara membuat user tanpa sesi admin yang sudah ada
// (selain seed script), karena endpoint ini publik (tidak butuh auth).
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const parsed = registerCompanySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { companyName, companyCode, name, email, password } = parsed.data;

    // Cek kode perusahaan belum dipakai
    const [existingCompany] = await db
      .select()
      .from(companies)
      .where(eq(companies.code, companyCode))
      .limit(1);

    if (existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Kode perusahaan sudah digunakan' },
        { status: 409 },
      );
    }

    // 1. Buat company
    const [company] = await db
      .insert(companies)
      .values({ name: companyName, code: companyCode })
      .returning();

    // 2. Buat role superadmin untuk company ini
    const [superadminRole] = await db
      .insert(roles)
      .values({
        company_id: company.id,
        name: 'Superadmin',
        slug: 'superadmin',
        permissions: [
          'users.manage', 'locations.manage', 'positions.manage',
          'attendance.view', 'patrol.view', 'leaves.review',
          'sos.view', 'payroll.manage',
        ],
      })
      .returning();

    // 3. Daftarkan user via BetterAuth
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        company_id: company.id,
        role_id: superadminRole.id,
      },
    });

    if (!signUpResult?.user) {
      // Rollback manual: hapus company & role yang sudah terlanjur dibuat
      await db.delete(roles).where(eq(roles.id, superadminRole.id));
      await db.delete(companies).where(eq(companies.id, company.id));

      return NextResponse.json(
        { success: false, error: 'Gagal membuat akun superadmin' },
        { status: 500 },
      );
    }

    await db
      .update(users)
      .set({ employee_id: '001', is_active: true })
      .where(eq(users.id, signUpResult.user.id));

    return NextResponse.json({
      success: true,
      data: { company_id: company.id, user_id: signUpResult.user.id },
    }, { status: 201 });

  } catch (err: any) {
    if (err?.message?.includes('already exists') || err?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Email atau kode perusahaan sudah terdaftar' },
        { status: 409 },
      );
    }
    console.error('[register-company] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
