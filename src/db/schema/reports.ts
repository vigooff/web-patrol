import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  numeric,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './core';
import { locations } from './operations';

// ─────────────────────────────────────────
// SOS REPORTS (Laporan Darurat)
// ─────────────────────────────────────────
export const sos_reports = pgTable('sos_reports', {
  id:          uuid('id').primaryKey().defaultRandom(),
  user_id:     uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  location_id: uuid('location_id')
    .references(() => locations.id),

  // "FIRE" | "ACCIDENT" | "CRIME" | "MEDICAL"
  category:    varchar('category', { length: 50 }).notNull(),
  description: text('description'),

  latitude:    numeric('latitude',  { precision: 10, scale: 7 }).notNull(),
  longitude:   numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  photo_url:   varchar('photo_url', { length: 500 }),

  // "open" | "handled" | "resolved"
  status:      varchar('status', { length: 20 }).default('open'),
  handled_by:  uuid('handled_by').references(() => users.id),
  handled_at:  timestamp('handled_at'),
  resolution:  text('resolution'),

  reported_at: timestamp('reported_at').defaultNow().notNull(),
  created_at:  timestamp('created_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// SALARY RECORDS (Rekap Gaji Bulanan)
// ─────────────────────────────────────────
export const salary_records = pgTable(
  'salary_records',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    user_id:          uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    period_month:     integer('period_month').notNull(),  // 1-12
    period_year:      integer('period_year').notNull(),   // 2026

    // Snapshot komponen saat payroll diproses
    base_salary:      numeric('base_salary',      { precision: 15, scale: 2 }).default('0'),
    total_allowance:  numeric('total_allowance',  { precision: 15, scale: 2 }).default('0'),
    overtime_pay:     numeric('overtime_pay',     { precision: 15, scale: 2 }).default('0'),
    total_deduction:  numeric('total_deduction',  { precision: 15, scale: 2 }).default('0'),
    pph21_amount:     numeric('pph21_amount',     { precision: 15, scale: 2 }).default('0'),
    net_salary:       numeric('net_salary',       { precision: 15, scale: 2 }).notNull(),

    // Rekap absensi bulan ini
    work_days:        integer('work_days').default(0),
    present_days:     integer('present_days').default(0),
    sick_days:        integer('sick_days').default(0),
    leave_days:       integer('leave_days').default(0),
    absent_days:      integer('absent_days').default(0),

    // "draft" | "published"
    status:           varchar('status', { length: 20 }).default('draft'),
    processed_by:     uuid('processed_by').references(() => users.id),
    processed_at:     timestamp('processed_at'),

    created_at:       timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // 1 user hanya boleh 1 record per bulan per tahun
    uniq_salary_period: uniqueIndex('uniq_salary_period')
      .on(table.user_id, table.period_month, table.period_year),
  })
);

// ─────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────
export const sosReportsRelations = relations(sos_reports, ({ one }) => ({
  user:       one(users,     { fields: [sos_reports.user_id],     references: [users.id] }),
  location:   one(locations, { fields: [sos_reports.location_id], references: [locations.id] }),
  handler:    one(users,     { fields: [sos_reports.handled_by],  references: [users.id] }),
}));

export const salaryRecordsRelations = relations(salary_records, ({ one }) => ({
  user:        one(users, { fields: [salary_records.user_id],       references: [users.id] }),
  processedBy: one(users, { fields: [salary_records.processed_by],  references: [users.id] }),
}));
