import { NextRequest, NextResponse } from 'next/server';
import { auth, AppUser } from '@/lib/auth';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function requireAuth(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });

  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { success: false, error: 'Unauthorized — silakan login' },
        { status: 401 },
      ),
    };
  }

  // Cast ke AppUser supaya company_id, role_id, dll bisa diakses
  const user = session.user as AppUser;
  return { session: { ...session, user }, error: null };
}

export async function requireRole(
  userRoleId: string,
  allowedSlugs: string[],
): Promise<{ allowed: boolean; roleSlug?: string }> {
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, userRoleId))
    .limit(1);

  if (!role) return { allowed: false };

  return {
    allowed: allowedSlugs.includes(role.slug),
    roleSlug: role.slug,
  };
}

export async function requireAuthWithRole(
  req: NextRequest,
  allowedSlugs: string[],
) {
  const { session, error } = await requireAuth(req);
  if (error) return { session: null, error };

  const { allowed, roleSlug } = await requireRole(session!.user.role_id, allowedSlugs);

  if (!allowed) {
    return {
      session: null,
      error: NextResponse.json(
        {
          success: false,
          error: `Akses ditolak — role "${roleSlug ?? 'unknown'}" tidak memiliki izin ini`,
        },
        { status: 403 },
      ),
    };
  }

  return { session, error: null };
}
