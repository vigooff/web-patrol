import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { positions } from '@/db/schema';
import { createPositionSchema } from '@/lib/validations';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq } from 'drizzle-orm';

// GET — list semua jabatan
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  try {
    const allPositions = await db
      .select()
      .from(positions)
      .where(eq(positions.company_id, session!.user.company_id));

    return NextResponse.json({ success: true, data: allPositions });

  } catch (err) {
    console.error('[positions] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// POST — tambah jabatan baru
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin']);
  if (error) return error;

  try {
    const body   = await req.json();
    const parsed = createPositionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, base_salary, pph21_rate } = parsed.data;

    const [position] = await db
      .insert(positions)
      .values({
        company_id: session!.user.company_id,
        name,
        base_salary: String(base_salary),
        pph21_rate:  String(pph21_rate),
      })
      .returning();

    return NextResponse.json({ success: true, data: position }, { status: 201 });

  } catch (err) {
    console.error('[positions] POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
