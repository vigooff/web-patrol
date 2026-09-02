import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sos_reports, users } from '@/db/schema';
import { createSosSchema } from '@/lib/validations';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { auth } from '@/lib/auth';
import { eq, and, desc } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body   = await req.json();
    const parsed = createSosSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { category, description, latitude, longitude, photo_url, location_id } = parsed.data;

    const [report] = await db
      .insert(sos_reports)
      .values({
        user_id:     session.user.id,
        location_id,
        category,
        description,
        latitude:    String(latitude),
        longitude:   String(longitude),
        photo_url,
        status:      'open',
      })
      .returning();

    // Notifikasi ke admin sekarang ditangani via polling (SosProvider), bukan push/websocket

    return NextResponse.json({
      success: true,
      data: {
        sos_id:      report.id,
        category:    report.category,
        status:      report.status,
        reported_at: report.reported_at,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('[sos] error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// GET — list laporan SOS di company yang sama, bisa difilter ?status=open
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status'); // ex: "open"

    const conditions = [eq(users.company_id, session!.user.company_id)];
    if (statusParam) conditions.push(eq(sos_reports.status, statusParam));

    const reports = await db
      .select({
        id:            sos_reports.id,
        user_id:       sos_reports.user_id,
        reporter_name: users.name,
        category:      sos_reports.category,
        description:   sos_reports.description,
        latitude:      sos_reports.latitude,
        longitude:     sos_reports.longitude,
        photo_url:     sos_reports.photo_url,
        status:        sos_reports.status,
        reported_at:   sos_reports.reported_at,
      })
      .from(sos_reports)
      .innerJoin(users, eq(sos_reports.user_id, users.id))
      .where(and(...conditions))
      .orderBy(desc(sos_reports.reported_at));

    return NextResponse.json({ success: true, data: reports });

  } catch (error) {
    console.error('[sos] error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}