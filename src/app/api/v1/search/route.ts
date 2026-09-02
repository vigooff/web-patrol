import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, locations } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq, and, ilike, or } from 'drizzle-orm';

// GET /api/v1/search?q=keyword
// Cari pegawai dan lokasi sekaligus, terbatas pada company yang login
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: { users: [], locations: [] } });
  }

  try {
    const companyId = session!.user.company_id;
    const keyword   = `%${q}%`;

    const [matchedUsers, matchedLocations] = await Promise.all([
      db
        .select({
          id:          users.id,
          name:        users.name,
          email:       users.email,
          employee_id: users.employee_id,
          is_active:   users.is_active,
        })
        .from(users)
        .where(
          and(
            eq(users.company_id, companyId),
            or(
              ilike(users.name,        keyword),
              ilike(users.email,       keyword),
              ilike(users.employee_id, keyword),
            ),
          ),
        )
        .limit(5),

      db
        .select({
          id:      locations.id,
          name:    locations.name,
          code:    locations.code,
          address: locations.address,
        })
        .from(locations)
        .where(
          and(
            eq(locations.company_id, companyId),
            or(
              ilike(locations.name,    keyword),
              ilike(locations.code,    keyword),
              ilike(locations.address, keyword),
            ),
          ),
        )
        .limit(5),
    ]);

    return NextResponse.json({
      success: true,
      data: { users: matchedUsers, locations: matchedLocations },
    });

  } catch (err) {
    console.error('[search] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
