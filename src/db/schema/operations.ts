import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  date,
  numeric,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { companies, users } from './core';

// ─────────────────────────────────────────
// LOCATIONS (Gedung / Geofencing)
// ─────────────────────────────────────────
export const locations = pgTable('locations', {
  id:             uuid('id').primaryKey().defaultRandom(),
  company_id:     uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name:           varchar('name', { length: 255 }).notNull(),
  code:           varchar('code', { length: 50 }).unique().notNull(),
  address:        varchar('address', { length: 500 }),

  // Geofencing
  latitude:       numeric('latitude',  { precision: 10, scale: 7 }).notNull(),
  longitude:      numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  radius_meters:  integer('radius_meters').default(100),

  is_active:      boolean('is_active').default(true),
  created_at:     timestamp('created_at').defaultNow().notNull(),
  updated_at:     timestamp('updated_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// PATROL CHECKPOINTS (Titik QR Patroli)
// ─────────────────────────────────────────
export const patrol_checkpoints = pgTable('patrol_checkpoints', {
  id:          uuid('id').primaryKey().defaultRandom(),
  location_id: uuid('location_id')
    .references(() => locations.id, { onDelete: 'cascade' })
    .notNull(),
  name:        varchar('name', { length: 255 }).notNull(),       // "Pintu Utama"
  qr_code:     varchar('qr_code', { length: 500 }).unique().notNull(),
  latitude:    numeric('latitude',  { precision: 10, scale: 7 }),
  longitude:   numeric('longitude', { precision: 10, scale: 7 }),
  order_index: integer('order_index').default(0),
  created_at:  timestamp('created_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// ATTENDANCES (Presensi Harian)
// ─────────────────────────────────────────
export const attendances = pgTable(
  'attendances',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    user_id:         uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    location_id:     uuid('location_id')
      .references(() => locations.id)
      .notNull(),

    date:            date('date').notNull(),
    // "present" | "sick" | "leave" | "absent"
    status:          varchar('status', { length: 20 }).notNull(),

    // Clock In
    check_in_time:   timestamp('check_in_time'),
    check_in_lat:    numeric('check_in_lat',  { precision: 10, scale: 7 }),
    check_in_lng:    numeric('check_in_lng',  { precision: 10, scale: 7 }),
    check_in_photo:  varchar('check_in_photo', { length: 500 }),
    is_fake_gps:     boolean('is_fake_gps').default(false),

    // Clock Out
    check_out_time:  timestamp('check_out_time'),
    check_out_lat:   numeric('check_out_lat',  { precision: 10, scale: 7 }),
    check_out_lng:   numeric('check_out_lng',  { precision: 10, scale: 7 }),
    check_out_photo: varchar('check_out_photo', { length: 500 }),

    // Calculated
    work_hours:      numeric('work_hours',     { precision: 5, scale: 2 }),
    overtime_hours:  numeric('overtime_hours', { precision: 5, scale: 2 }).default('0'),
    notes:           text('notes'),

    created_at:      timestamp('created_at').defaultNow().notNull(),
    updated_at:      timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    // 1 user hanya boleh 1 absensi per hari per lokasi
    uniq_user_date_loc: uniqueIndex('uniq_user_date_loc')
      .on(table.user_id, table.date, table.location_id),
  })
);

// ─────────────────────────────────────────
// LEAVES (Izin & Cuti)
// ─────────────────────────────────────────
export const leaves = pgTable('leaves', {
  id:          uuid('id').primaryKey().defaultRandom(),
  user_id:     uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  // "sick" | "leave" | "permission"
  type:        varchar('type', { length: 30 }).notNull(),
  start_date:  date('start_date').notNull(),
  end_date:    date('end_date').notNull(),
  reason:      text('reason'),
  attachment:  varchar('attachment', { length: 500 }),
  // "pending" | "approved" | "rejected"
  status:      varchar('status', { length: 20 }).default('pending'),
  approved_by: uuid('approved_by').references(() => users.id),
  approved_at: timestamp('approved_at'),
  created_at:  timestamp('created_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// PATROLS (Sesi Patroli)
// ─────────────────────────────────────────
export const patrols = pgTable('patrols', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  user_id:               uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  location_id:           uuid('location_id')
    .references(() => locations.id)
    .notNull(),

  start_time:            timestamp('start_time').notNull(),
  end_time:              timestamp('end_time'),
  // "ongoing" | "completed"
  status:                varchar('status', { length: 20 }).default('ongoing'),
  total_distance_meters: integer('total_distance_meters').default(0),
  notes:                 text('notes'),

  created_at:            timestamp('created_at').defaultNow().notNull(),
});

// Log per scan QR checkpoint
export const patrol_logs = pgTable('patrol_logs', {
  id:            uuid('id').primaryKey().defaultRandom(),
  patrol_id:     uuid('patrol_id')
    .references(() => patrols.id, { onDelete: 'cascade' })
    .notNull(),
  checkpoint_id: uuid('checkpoint_id')
    .references(() => patrol_checkpoints.id)
    .notNull(),

  scanned_at:    timestamp('scanned_at').defaultNow().notNull(),
  latitude:      numeric('latitude',  { precision: 10, scale: 7 }),
  longitude:     numeric('longitude', { precision: 10, scale: 7 }),
  photo_url:     varchar('photo_url', { length: 500 }),
  is_valid:      boolean('is_valid').default(true),
});

// GPS breadcrumb real-time (dikirim batch tiap 30 detik)
export const patrol_tracks = pgTable('patrol_tracks', {
  id:          uuid('id').primaryKey().defaultRandom(),
  patrol_id:   uuid('patrol_id')
    .references(() => patrols.id, { onDelete: 'cascade' })
    .notNull(),
  latitude:    numeric('latitude',  { precision: 10, scale: 7 }).notNull(),
  longitude:   numeric('longitude', { precision: 10, scale: 7 }).notNull(),
  recorded_at: timestamp('recorded_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// ACTIVITIES (Log Aktivitas + Bukti Foto)
// ─────────────────────────────────────────
export const activities = pgTable('activities', {
  id:          uuid('id').primaryKey().defaultRandom(),
  user_id:     uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  location_id: uuid('location_id')
    .references(() => locations.id),

  title:       varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  photo_url:   varchar('photo_url', { length: 500 }),
  latitude:    numeric('latitude',  { precision: 10, scale: 7 }),
  longitude:   numeric('longitude', { precision: 10, scale: 7 }),

  recorded_at: timestamp('recorded_at').defaultNow().notNull(),
  created_at:  timestamp('created_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────
export const locationsRelations = relations(locations, ({ one, many }) => ({
  company:     one(companies, { fields: [locations.company_id], references: [companies.id] }),
  checkpoints: many(patrol_checkpoints),
  attendances: many(attendances),
  patrols:     many(patrols),
}));

export const attendancesRelations = relations(attendances, ({ one }) => ({
  user:     one(users,     { fields: [attendances.user_id],     references: [users.id] }),
  location: one(locations, { fields: [attendances.location_id], references: [locations.id] }),
}));

export const patrolsRelations = relations(patrols, ({ one, many }) => ({
  user:     one(users,     { fields: [patrols.user_id],     references: [users.id] }),
  location: one(locations, { fields: [patrols.location_id], references: [locations.id] }),
  logs:     many(patrol_logs),
  tracks:   many(patrol_tracks),
}));

export const patrolLogsRelations = relations(patrol_logs, ({ one }) => ({
  patrol:     one(patrols,            { fields: [patrol_logs.patrol_id],     references: [patrols.id] }),
  checkpoint: one(patrol_checkpoints, { fields: [patrol_logs.checkpoint_id], references: [patrol_checkpoints.id] }),
}));
