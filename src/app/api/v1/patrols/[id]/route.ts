import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { patrols, patrol_logs, patrol_tracks, patrol_checkpoints } from '@/db/schema';
import { requireAuth, requireRole } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET — detail satu sesi patroli, lengkap dengan log checkpoint + GPS track
// untuk keperluan "replay rute" di dashboard admin (peta Leaflet)
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuth(req);
  if (error) return error;

  const { id } = await params;

  try {
    const [patrol] = await db
      .select()
      .from(patrols)
      .where(eq(patrols.id, id))
      .limit(1);

    if (!patrol) {
      return NextResponse.json(
        { success: false, error: 'Sesi patroli tidak ditemukan' },
        { status: 404 },
      );
    }

    // Employee hanya boleh lihat patroli miliknya sendiri
    if (patrol.user_id !== session!.user.id) {
      const { allowed } = await requireRole(session!.user.role_id, ['superadmin', 'hrd']);
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: 'Akses ditolak' },
          { status: 403 },
        );
      }
    }

    const [logs, tracks] = await Promise.all([
      db
        .select({
          id:              patrol_logs.id,
          checkpoint_id:   patrol_logs.checkpoint_id,
          checkpoint_name: patrol_checkpoints.name,
          scanned_at:      patrol_logs.scanned_at,
          latitude:        patrol_logs.latitude,
          longitude:       patrol_logs.longitude,
          photo_url:       patrol_logs.photo_url,
          is_valid:        patrol_logs.is_valid,
        })
        .from(patrol_logs)
        .innerJoin(patrol_checkpoints, eq(patrol_logs.checkpoint_id, patrol_checkpoints.id))
        .where(eq(patrol_logs.patrol_id, id)),

      db
        .select()
        .from(patrol_tracks)
        .where(eq(patrol_tracks.patrol_id, id))
        .orderBy(patrol_tracks.recorded_at),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...patrol,
        logs,
        tracks, // array koordinat berurutan -> langsung bisa dipakai untuk polyline di Leaflet
      },
    });

  } catch (err) {
    console.error('[patrols/:id] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
