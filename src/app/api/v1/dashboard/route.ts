import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, attendances, leaves, sos_reports } from '@/db/schema';
import { requireAuth } from '@/lib/utils/auth-guard';
import { eq, and, sql } from 'drizzle-orm';

// GET — ringkasan data untuk dashboard admin
// Return semua angka stat cards dalam satu request
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  try {
    const companyId = session!.user.company_id;
    const today = new Date().toISOString().split('T')[0];

    // Jalankan semua query paralel supaya cepat
    const [
      totalEmployees,
      presentToday,
      pendingLeaves,
      openSos,
    ] = await Promise.all([
      // Total pegawai aktif
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(eq(users.company_id, companyId), eq(users.is_active, true)))
        .then((r) => r[0]?.count ?? 0),

      // Hadir hari ini
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(attendances)
        .innerJoin(users, eq(attendances.user_id, users.id))
        .where(
          and(
            eq(users.company_id, companyId),
            eq(attendances.date, today),
            eq(attendances.status, 'present'),
          ),
        )
        .then((r) => r[0]?.count ?? 0),

      // Izin pending (menunggu approval)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(leaves)
        .innerJoin(users, eq(leaves.user_id, users.id))
        .where(
          and(
            eq(users.company_id, companyId),
            eq(leaves.status, 'pending'),
          ),
        )
        .then((r) => r[0]?.count ?? 0),

      // SOS aktif (belum ditangani)
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(sos_reports)
        .innerJoin(users, eq(sos_reports.user_id, users.id))
        .where(
          and(
            eq(users.company_id, companyId),
            eq(sos_reports.status, 'open'),
          ),
        )
        .then((r) => r[0]?.count ?? 0),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total_pegawai:   totalEmployees,
        hadir_hari_ini:  presentToday,
        izin_pending:    pendingLeaves,
        sos_aktif:       openSos,
      },
    });

  } catch (err) {
    console.error('[dashboard] error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
