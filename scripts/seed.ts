/**
 * Seed Script — Buat user pertama (superadmin)
 * Cara pakai: npx tsx scripts/seed.ts
 */

import { db } from '../src/db';
import { companies, roles, users } from '../src/db/schema';
import { auth } from '../src/lib/auth';
import { eq } from 'drizzle-orm';

const SEED_COMPANY = {
  name: 'Macrosoft',
  code: 'MCS-01',
};

const SEED_SUPERADMIN = {
  name: 'Vigo',
  email: 'vigo@mail.co',
  password: 'vigo12345',
};

async function seed() {
  console.log('🌱 Memulai seeding data awal...\n');

  // 1. Buat company (skip kalau sudah ada)
  let company = (
    await db.select().from(companies).where(eq(companies.code, SEED_COMPANY.code)).limit(1)
  )[0];

  if (!company) {
    [company] = await db
      .insert(companies)
      .values({ name: SEED_COMPANY.name, code: SEED_COMPANY.code })
      .returning();
    console.log(`✅ Company dibuat: ${company.name} (${company.code})`);
  } else {
    console.log(`ℹ️  Company sudah ada: ${company.name} (${company.code}), dilewati`);
  }

  // 2. Buat role superadmin (skip kalau sudah ada)
  let superadminRole = (
    await db
      .select()
      .from(roles)
      .where(eq(roles.company_id, company.id))
      .limit(1)
  ).find((r) => r.slug === 'superadmin');

  if (!superadminRole) {
    [superadminRole] = await db
      .insert(roles)
      .values({
        company_id: company.id,
        name: 'Superadmin',
        slug: 'superadmin',
        permissions: [
          'users.manage', 'locations.manage', 'positions.manage',
          'attendance.view', 'patrol.view', 'leaves.review',
          'sos.view', 'payroll.manage',
        ],
      })
      .returning();
    console.log(`✅ Role dibuat: ${superadminRole.name}`);
  } else {
    console.log(`ℹ️  Role superadmin sudah ada, dilewati`);
  }

  // 3. Cek apakah user sudah ada
  const existingUser = (
    await db.select().from(users).where(eq(users.email, SEED_SUPERADMIN.email)).limit(1)
  )[0];

  if (existingUser) {
    console.log(`ℹ️  User dengan email ${SEED_SUPERADMIN.email} sudah ada, dilewati`);
    console.log('\n✨ Seeding selesai (tidak ada perubahan baru).');
    return;
  }

  // 4. Daftarkan user via BetterAuth (supaya password ter-hash dengan benar)
  const signUpResult = await auth.api.signUpEmail({
    body: {
      name: SEED_SUPERADMIN.name,
      email: SEED_SUPERADMIN.email,
      password: SEED_SUPERADMIN.password,
      company_id: company.id,
      role_id: superadminRole.id,
    },
  });

  if (!signUpResult?.user) {
    throw new Error('Gagal membuat user superadmin via BetterAuth');
  }

  // 5. Lengkapi data tambahan (employee_id, dll)
  await db
    .update(users)
    .set({ employee_id: '001', is_active: true })
    .where(eq(users.id, signUpResult.user.id));

  console.log(`✅ User superadmin dibuat: ${SEED_SUPERADMIN.email}`);
  console.log('\n✨ Seeding selesai! Kamu sekarang bisa login dengan:');
  console.log(`   Email    : ${SEED_SUPERADMIN.email}`);
  console.log(`   Password : ${SEED_SUPERADMIN.password}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding gagal:', err);
    process.exit(1);
  });
