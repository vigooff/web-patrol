import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { payroll_components, positions } from '@/db/schema';
import { createComponentSchema } from '@/lib/validations';
import { requireAuthWithRole } from '@/lib/utils/auth-guard';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

// GET — list komponen gaji (tunjangan & potongan) untuk satu jabatan
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin', 'hrd']);
  if (error) return error;

  const { id } = await params;

  try {
    // Pastikan position milik company yang sama (anti cross-tenant leak)
    const [position] = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.id, id),
          eq(positions.company_id, session!.user.company_id),
        ),
      )
      .limit(1);

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Jabatan tidak ditemukan' },
        { status: 404 },
      );
    }

    const components = await db
      .select()
      .from(payroll_components)
      .where(eq(payroll_components.position_id, id));

    return NextResponse.json({ success: true, data: components });

  } catch (err) {
    console.error('[positions/:id/components] GET error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}

// POST — tambah komponen gaji baru (tunjangan/potongan) ke jabatan
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAuthWithRole(req, ['superadmin']);
  if (error) return error;

  const { id } = await params;

  try {
    const [position] = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.id, id),
          eq(positions.company_id, session!.user.company_id),
        ),
      )
      .limit(1);

    if (!position) {
      return NextResponse.json(
        { success: false, error: 'Jabatan tidak ditemukan' },
        { status: 404 },
      );
    }

    const body   = await req.json();
    const parsed = createComponentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { name, type, amount } = parsed.data;

    const [component] = await db
      .insert(payroll_components)
      .values({
        position_id: id,
        name,
        type,
        amount: String(amount),
      })
      .returning();

    return NextResponse.json({ success: true, data: component }, { status: 201 });

  } catch (err) {
    console.error('[positions/:id/components] POST error:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 },
    );
  }
}
