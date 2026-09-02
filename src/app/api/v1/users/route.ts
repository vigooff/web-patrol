import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { createUserSchema } from '@/lib/validations';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { auth } from '@/lib/auth';
import { eq } from 'drizzle-orm';

// GET — list semua pegawai di company yang sama
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const allUsers = await db
      .select({
        id:          users.id,
        name:        users.name,
        email:       users.email,
        employee_id: users.employee_id,
        phone:       users.phone,
        is_active:   users.is_active,
        role_id:     users.role_id,
        position_id: users.position_id,
        join_date:   users.join_date,
      })
      .from(users)
      .where(eq(users.company_id, session!.user.company_id));

    return NextResponse.json({ success: true, data: allUsers });

  } catch (err) {
    console.error('[users] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// POST — tambah pegawai baru (sekaligus daftarkan via BetterAuth)
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const body   = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, email, password, role_id, position_id, employee_id, phone, address, join_date } = parsed.data;

    // Daftarkan via BetterAuth dulu (supaya password ter-hash dengan benar)
    // company_id & role_id wajib diisi di sini karena didefinisikan sebagai
    // additionalFields required di lib/auth.ts
    const signUpResult = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
        company_id: session!.user.company_id,
        role_id,
      },
    });

    if (!signUpResult?.user) {
      return NextResponse.json(
        { success: false, error: 'Gagal membuat akun pegawai' },
        { status: 500 },
      );
    }

    // Lengkapi sisa data app-specific yang belum dikirim ke BetterAuth
    const [updatedUser] = await db
      .update(users)
      .set({
        position_id,
        employee_id,
        phone,
        address,
        join_date,
      })
      .where(eq(users.id, signUpResult.user.id))
      .returning();

    return NextResponse.json({ success: true, data: updatedUser }, { status: 201 });

  } catch (err: any) {
    if (err?.message?.includes('already exists') || err?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Email sudah terdaftar' },
        { status: 409 },
      );
    }
    console.error('[users] POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
