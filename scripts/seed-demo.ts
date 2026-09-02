/**
 * Demo Seed Script — 3 Company + 4 Pegawai per Company + Attendance 30 hari
 * Cara pakai: npm run seed:demo
 * AMAN dijalankan ulang — skip data yang sudah ada
 */

const dotenv = require('dotenv');
const path   = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

async function main() {
  const { db }   = await import('../src/db/index.js');
  const schema   = await import('../src/db/schema/index.js');
  const { auth } = await import('../src/lib/auth.js');
  const { eq, and } = await import('drizzle-orm');

  const {
    companies, roles, positions, payroll_components,
    locations, users, attendances,
  } = schema;

  const PASSWORD = 'vigo12345';

  // ─────────────────────────────────────────
  // DATA BLUEPRINT
  // ─────────────────────────────────────────
  const COMPANIES = [
    {
      name: 'PT Nusantara Aman Sejahtera',
      code: 'NAS-01',
      address: 'Jl. Gatot Subroto No. 12, Jakarta Selatan',
      phone: '021-5551234',
      industry: 'security',
      admin: { name: 'Budi Santoso', email: 'budi@nas-security.co.id' },
      employees: [
        { name: 'Ahmad Fauzi',    email: 'ahmad@nas-security.co.id',  position: 'Kepala Keamanan', employee_id: 'NAS-002' },
        { name: 'Siti Rahayu',    email: 'siti@nas-security.co.id',   position: 'Anggota Keamanan', employee_id: 'NAS-003' },
        { name: 'Dedi Kurniawan', email: 'dedi@nas-security.co.id',   position: 'Anggota Keamanan', employee_id: 'NAS-004' },
        { name: 'Rina Wulandari', email: 'rina@nas-security.co.id',   position: 'Resepsionis',      employee_id: 'NAS-005' },
      ],
      locations: [
        { name: 'Kantor Pusat Jakarta', code: 'NAS-JKT', address: 'Jl. Gatot Subroto No. 12, Jakarta Selatan', lat: '-6.2297', lng: '106.8272', radius: 150 },
        { name: 'Pos Keamanan Selatan', code: 'NAS-SEL', address: 'Jl. TB Simatupang No. 45, Jakarta Selatan',  lat: '-6.2897', lng: '106.8102', radius: 100 },
      ],
    },
    {
      name: 'CV Bersih Mandiri Indonesia',
      code: 'BMI-01',
      address: 'Jl. Raya Darmo No. 88, Surabaya',
      phone: '031-8881234',
      industry: 'cleaning',
      admin: { name: 'Dewi Kusuma', email: 'dewi@bersih-mandiri.co.id' },
      employees: [
        { name: 'Hendra Wijaya',  email: 'hendra@bersih-mandiri.co.id', position: 'Supervisor Cleaning', employee_id: 'BMI-002' },
        { name: 'Sri Mulyani',    email: 'sri@bersih-mandiri.co.id',     position: 'Petugas Cleaning',    employee_id: 'BMI-003' },
        { name: 'Agus Purnomo',   email: 'agus@bersih-mandiri.co.id',    position: 'Petugas Cleaning',    employee_id: 'BMI-004' },
        { name: 'Lina Marlina',   email: 'lina@bersih-mandiri.co.id',    position: 'Petugas Cleaning',    employee_id: 'BMI-005' },
      ],
      locations: [
        { name: 'Gedung Darmo Office Park', code: 'BMI-DOP', address: 'Jl. Raya Darmo No. 88, Surabaya', lat: '-7.2797', lng: '112.7272', radius: 120 },
        { name: 'Mall Surabaya Timur',      code: 'BMI-MST', address: 'Jl. Rungkut Industri No. 5, Surabaya', lat: '-7.3197', lng: '112.7672', radius: 200 },
      ],
    },
    {
      name: 'PT Sinar Niaga Perkasa',
      code: 'SNP-01',
      address: 'Jl. Pemuda No. 33, Semarang',
      phone: '024-3331234',
      industry: 'sales',
      admin: { name: 'Riko Prasetyo', email: 'riko@sinar-niaga.co.id' },
      employees: [
        { name: 'Fitri Handayani', email: 'fitri@sinar-niaga.co.id',  position: 'Sales Manager',      employee_id: 'SNP-002' },
        { name: 'Yusuf Rahman',    email: 'yusuf@sinar-niaga.co.id',  position: 'Sales Executive',    employee_id: 'SNP-003' },
        { name: 'Nanda Pratiwi',   email: 'nanda@sinar-niaga.co.id',  position: 'Sales Executive',    employee_id: 'SNP-004' },
        { name: 'Bayu Setiawan',   email: 'bayu@sinar-niaga.co.id',   position: 'Driver & Kurir',     employee_id: 'SNP-005' },
      ],
      locations: [
        { name: 'Kantor Semarang Pusat', code: 'SNP-SMG', address: 'Jl. Pemuda No. 33, Semarang', lat: '-6.9897', lng: '110.4272', radius: 100 },
        { name: 'Gudang Distribusi',     code: 'SNP-GDG', address: 'Jl. Kaligawe Raya No. 10, Semarang', lat: '-6.9697', lng: '110.4572', radius: 150 },
      ],
    },
  ];

  // Jabatan per industri
  const POSITIONS_BY_INDUSTRY: Record<string, Array<{name: string; base_salary: number; pph21: number}>> = {
    security: [
      { name: 'Kepala Keamanan',   base_salary: 5000000, pph21: 2.0 },
      { name: 'Anggota Keamanan',  base_salary: 3500000, pph21: 2.0 },
      { name: 'Resepsionis',       base_salary: 3000000, pph21: 2.0 },
      { name: 'Superadmin',        base_salary: 8000000, pph21: 5.0 },
    ],
    cleaning: [
      { name: 'Supervisor Cleaning', base_salary: 4500000, pph21: 2.0 },
      { name: 'Petugas Cleaning',    base_salary: 2800000, pph21: 0.0 },
      { name: 'Superadmin',          base_salary: 7000000, pph21: 5.0 },
    ],
    sales: [
      { name: 'Sales Manager',    base_salary: 7000000, pph21: 5.0 },
      { name: 'Sales Executive',  base_salary: 4000000, pph21: 2.0 },
      { name: 'Driver & Kurir',   base_salary: 3200000, pph21: 0.0 },
      { name: 'Superadmin',       base_salary: 9000000, pph21: 5.0 },
    ],
  };

  // ─────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────

  // Buat tanggal ISO dari N hari lalu
  function daysAgo(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split('T')[0];
  }

  // Random integer antara min dan max (inclusive)
  function rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Buat timestamp check-in/out yang realistis
  function makeCheckTime(dateStr: string, baseHour: number, baseMin: number, varianceMin: number): Date {
    const d = new Date(dateStr + 'T00:00:00.000Z');
    const totalMins = baseHour * 60 + baseMin + rand(-varianceMin, varianceMin);
    d.setUTCHours(Math.floor(totalMins / 60), totalMins % 60, rand(0, 59), 0);
    return d;
  }

  // Tentukan status kehadiran dengan distribusi realistis
  // 75% hadir, 10% sakit, 10% izin, 5% alpa
  function randomStatus(): string {
    const r = Math.random();
    if (r < 0.75) return 'present';
    if (r < 0.85) return 'sick';
    if (r < 0.95) return 'leave';
    return 'absent';
  }

  // ─────────────────────────────────────────
  // MULAI SEEDING
  // ─────────────────────────────────────────
  console.log('\n🌱 Memulai demo seeding...\n');

  for (const companyData of COMPANIES) {
    console.log(`\n📦 Memproses company: ${companyData.name}`);

    // 1. Buat atau skip company
    let company = (
      await db.select().from(companies).where(eq(companies.code, companyData.code)).limit(1)
    )[0];

    if (!company) {
      [company] = await db.insert(companies).values({
        name:    companyData.name,
        code:    companyData.code,
        address: companyData.address,
        phone:   companyData.phone,
      }).returning();
      console.log(`  ✅ Company dibuat: ${company.name}`);
    } else {
      console.log(`  ℹ️  Company sudah ada, dilewati`);
    }

    // 2. Buat positions untuk company ini
    const positionMap: Record<string, string> = {}; // name → id

    for (const pos of POSITIONS_BY_INDUSTRY[companyData.industry]) {
      let position = (
        await db.select().from(positions)
          .where(and(eq(positions.company_id, company.id), eq(positions.name, pos.name)))
          .limit(1)
      )[0];

      if (!position) {
        [position] = await db.insert(positions).values({
          company_id:  company.id,
          name:        pos.name,
          base_salary: String(pos.base_salary),
          pph21_rate:  String(pos.pph21),
        }).returning();

        // Tambah komponen gaji default
        await db.insert(payroll_components).values([
          { position_id: position.id, name: 'Tunjangan Makan',     type: 'allowance', amount: '30000' },
          { position_id: position.id, name: 'Tunjangan Transport',  type: 'allowance', amount: '200000' },
          { position_id: position.id, name: 'BPJS Kesehatan',      type: 'deduction', amount: '150000' },
          { position_id: position.id, name: 'BPJS Ketenagakerjaan', type: 'deduction', amount: '100000' },
        ]);
      }

      positionMap[pos.name] = position.id;
    }
    console.log(`  ✅ ${Object.keys(positionMap).length} jabatan siap`);

    // 3. Buat role superadmin untuk company ini
    let superadminRole = (
      await db.select().from(roles)
        .where(and(eq(roles.company_id, company.id), eq(roles.slug, 'superadmin')))
        .limit(1)
    )[0];

    if (!superadminRole) {
      [superadminRole] = await db.insert(roles).values({
        company_id:  company.id,
        name:        'Superadmin',
        slug:        'superadmin',
        permissions: ['users.manage','locations.manage','positions.manage','attendance.view','patrol.view','leaves.review','sos.view','payroll.manage'],
      }).returning();
    }

    // Buat role employee juga
    let employeeRole = (
      await db.select().from(roles)
        .where(and(eq(roles.company_id, company.id), eq(roles.slug, 'employee')))
        .limit(1)
    )[0];

    if (!employeeRole) {
      [employeeRole] = await db.insert(roles).values({
        company_id:  company.id,
        name:        'Pegawai',
        slug:        'employee',
        permissions: ['attendance.create','patrol.create','sos.create','activities.create','leaves.create'],
      }).returning();
    }

    // 4. Buat lokasi
    const locationList: any[] = [];
    for (const loc of companyData.locations) {
      let location = (
        await db.select().from(locations).where(eq(locations.code, loc.code)).limit(1)
      )[0];

      if (!location) {
        [location] = await db.insert(locations).values({
          company_id:    company.id,
          name:          loc.name,
          code:          loc.code,
          address:       loc.address,
          latitude:      loc.lat,
          longitude:     loc.lng,
          radius_meters: loc.radius,
        }).returning();
      }
      locationList.push(location);
    }
    console.log(`  ✅ ${locationList.length} lokasi siap`);

    // 5. Buat akun admin perusahaan
    let adminUser = (
      await db.select().from(users).where(eq(users.email, companyData.admin.email)).limit(1)
    )[0];

    if (!adminUser) {
      const result = await auth.api.signUpEmail({
        body: {
          name:       companyData.admin.name,
          email:      companyData.admin.email,
          password:   PASSWORD,
          company_id: company.id,
          role_id:    superadminRole.id,
        },
      });

      if (result?.user) {
        await db.update(users)
          .set({ employee_id: `${companyData.code}-001`, is_active: true, position_id: positionMap['Superadmin'] })
          .where(eq(users.id, result.user.id));
        adminUser = (await db.select().from(users).where(eq(users.id, result.user.id)).limit(1))[0];
        console.log(`  ✅ Admin dibuat: ${companyData.admin.email}`);
      }
    } else {
      console.log(`  ℹ️  Admin sudah ada: ${companyData.admin.email}`);
    }

    // 6. Buat pegawai
    const allUsers: any[] = adminUser ? [adminUser] : [];

    for (const emp of companyData.employees) {
      let empUser = (
        await db.select().from(users).where(eq(users.email, emp.email)).limit(1)
      )[0];

      if (!empUser) {
        const result = await auth.api.signUpEmail({
          body: {
            name:       emp.name,
            email:      emp.email,
            password:   PASSWORD,
            company_id: company.id,
            role_id:    employeeRole.id,
          },
        });

        if (result?.user) {
          await db.update(users)
            .set({
              employee_id: emp.employee_id,
              is_active:   true,
              position_id: positionMap[emp.position] ?? null,
            })
            .where(eq(users.id, result.user.id));
          empUser = (await db.select().from(users).where(eq(users.id, result.user.id)).limit(1))[0];
          console.log(`  ✅ Pegawai: ${emp.name} (${emp.email})`);
        }
      } else {
        console.log(`  ℹ️  Pegawai sudah ada: ${emp.email}`);
      }

      if (empUser) allUsers.push(empUser);
    }

    // 7. Buat data attendance 30 hari + 7 hari (total 30 hari ke belakang)
    console.log(`  📅 Membuat data attendance untuk ${allUsers.length} user...`);

    const defaultLocation = locationList[0];
    if (!defaultLocation) {
      console.log('  ⚠️  Tidak ada lokasi, skip attendance');
      continue;
    }

    let attendanceCreated = 0;
    let attendanceSkipped = 0;

    for (const user of allUsers) {
      for (let daysBack = 30; daysBack >= 0; daysBack--) {
        const dateStr = daysAgo(daysBack);
        const dayOfWeek = new Date(dateStr).getDay();

        // Skip Minggu (0)
        if (dayOfWeek === 0) continue;

        // Cek apakah sudah ada record untuk hari ini
        const existing = (
          await db.select({ id: attendances.id })
            .from(attendances)
            .where(and(
              eq(attendances.user_id, user.id),
              eq(attendances.date, dateStr),
            ))
            .limit(1)
        )[0];

        if (existing) {
          attendanceSkipped++;
          continue;
        }

        const status = randomStatus();

        if (status === 'present') {
          // Jam masuk: 07:45 - 08:30 (variasi ±30 menit dari 08:00)
          const checkIn  = makeCheckTime(dateStr, 8, 0, 30);
          // Jam keluar: 16:30 - 17:30 (variasi ±30 menit dari 17:00)
          const checkOut = makeCheckTime(dateStr, 17, 0, 30);

          const workMs    = checkOut.getTime() - checkIn.getTime();
          const workHours = workMs / (1000 * 60 * 60);
          const overtime  = Math.max(0, workHours - 8);

          // 5% chance fake GPS untuk bikin data menarik
          const isFakeGps = Math.random() < 0.05;

          // Gunakan koordinat lokasi dengan sedikit offset realistis
          const baseLat = parseFloat(defaultLocation.latitude);
          const baseLng = parseFloat(defaultLocation.longitude);
          const offsetLat = (Math.random() - 0.5) * 0.001; // ~50-100m offset
          const offsetLng = (Math.random() - 0.5) * 0.001;

          await db.insert(attendances).values({
            user_id:         user.id,
            location_id:     defaultLocation.id,
            date:            dateStr,
            status:          'present',
            check_in_time:   checkIn,
            check_in_lat:    String(baseLat + offsetLat),
            check_in_lng:    String(baseLng + offsetLng),
            check_in_photo:  '/uploads/placeholder.jpg',
            check_out_time:  checkOut,
            check_out_lat:   String(baseLat + offsetLat),
            check_out_lng:   String(baseLng + offsetLng),
            check_out_photo: '/uploads/placeholder.jpg',
            work_hours:      workHours.toFixed(2),
            overtime_hours:  overtime.toFixed(2),
            is_fake_gps:     isFakeGps,
          });
        } else {
          // Sakit/izin/alpa — tidak ada check-in
          await db.insert(attendances).values({
            user_id:     user.id,
            location_id: defaultLocation.id,
            date:        dateStr,
            status:      status,
          });
        }

        attendanceCreated++;
      }
    }

    console.log(`  ✅ Attendance: ${attendanceCreated} dibuat, ${attendanceSkipped} dilewati`);
  }

  console.log('\n✨ Demo seeding selesai!\n');
  console.log('📋 Akun yang tersedia (semua password: vigo12345):');
  console.log('');
  console.log('PT Nusantara Aman Sejahtera:');
  console.log('  Admin   : budi@nas-security.co.id');
  console.log('  Pegawai : ahmad@nas-security.co.id, siti@nas-security.co.id');
  console.log('            dedi@nas-security.co.id,  rina@nas-security.co.id');
  console.log('');
  console.log('CV Bersih Mandiri Indonesia:');
  console.log('  Admin   : dewi@bersih-mandiri.co.id');
  console.log('  Pegawai : hendra@bersih-mandiri.co.id, sri@bersih-mandiri.co.id');
  console.log('            agus@bersih-mandiri.co.id,   lina@bersih-mandiri.co.id');
  console.log('');
  console.log('PT Sinar Niaga Perkasa:');
  console.log('  Admin   : riko@sinar-niaga.co.id');
  console.log('  Pegawai : fitri@sinar-niaga.co.id, yusuf@sinar-niaga.co.id');
  console.log('            nanda@sinar-niaga.co.id,  bayu@sinar-niaga.co.id');
  console.log('');
  console.log('Macrosoft (sudah ada dari seed sebelumnya):');
  console.log('  Admin   : vigo@mail.co');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Demo seeding gagal:', err.message);
    console.error(err);
    process.exit(1);
  });
