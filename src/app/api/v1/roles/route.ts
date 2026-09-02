import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

// Role admin yang TIDAK boleh muncul di dropdown "tambah pegawai"
const ADMIN_ROLE_SLUGS = ['superadmin', 'hrd'];

// GET — list role yang bisa dipilih untuk pegawai lapangan (non-admin)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const companyRoles = await db
      .select({
        id:   roles.id,
        name: roles.name,
        slug: roles.slug,
      })
      .from(roles)
      .where(eq(roles.company_id, session!.user.company_id));

    // Filter role admin di JS — hindari kerumitan notInArray + tipe drizzle
    const employeeRoles = companyRoles.filter(
      (r) => !ADMIN_ROLE_SLUGS.includes(r.slug),
    );

    return NextResponse.json({ success: true, data: employeeRoles });

  } catch (err) {
    console.error('[roles] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}