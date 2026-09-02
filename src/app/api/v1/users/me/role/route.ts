import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const [role] = await db
    .select({ id: roles.id, name: roles.name, slug: roles.slug })
    .from(roles)
    .where(eq(roles.id, session!.user.role_id))
    .limit(1);

  if (!role) {
    return NextResponse.json({ success: false, error: 'Role tidak ditemukan' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: role });
}