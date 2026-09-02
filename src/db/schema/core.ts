import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
  date,
  json,
  numeric,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────
// COMPANIES
// ─────────────────────────────────────────
export const companies = pgTable('companies', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       varchar('name', { length: 255 }).notNull(),
  code:       varchar('code', { length: 50 }).unique().notNull(),
  address:    varchar('address', { length: 500 }),
  phone:      varchar('phone', { length: 20 }),
  logo_url:   varchar('logo_url', { length: 500 }),
  is_active:  boolean('is_active').default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────
export const roles = pgTable('roles', {
  id:          uuid('id').primaryKey().defaultRandom(),
  company_id:  uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name:        varchar('name', { length: 100 }).notNull(),
  slug:        varchar('slug', { length: 100 }).notNull(),
  // e.g. ["attendance.view", "patrol.create", "sos.create"]
  permissions: json('permissions').$type<string[]>().default([]),
  created_at:  timestamp('created_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// POSITIONS (Jabatan)
// ─────────────────────────────────────────
export const positions = pgTable('positions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  company_id:   uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name:         varchar('name', { length: 100 }).notNull(),
  base_salary:  numeric('base_salary', { precision: 15, scale: 2 }).default('0'),
  pph21_rate:   numeric('pph21_rate', { precision: 5, scale: 2 }).default('0'),
  created_at:   timestamp('created_at').defaultNow().notNull(),
});

// Komponen gaji per jabatan (tunjangan & potongan)
export const payroll_components = pgTable('payroll_components', {
  id:           uuid('id').primaryKey().defaultRandom(),
  position_id:  uuid('position_id')
    .references(() => positions.id, { onDelete: 'cascade' })
    .notNull(),
  name:         varchar('name', { length: 100 }).notNull(),
  // "allowance" = tunjangan | "deduction" = potongan
  type:         varchar('type', { length: 20 }).notNull(),
  amount:       numeric('amount', { precision: 15, scale: 2 }).notNull(),
  created_at:   timestamp('created_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// USERS  (extends BetterAuth user table)
// ─────────────────────────────────────────
export const users = pgTable('users', {
  // BetterAuth required fields
  id:             uuid('id').primaryKey().defaultRandom(),
  name:           varchar('name', { length: 255 }).notNull(),
  email:          varchar('email', { length: 255 }).unique().notNull(),
  emailVerified:  boolean('email_verified').default(false),
  image:          varchar('image', { length: 500 }),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),

  // App-specific fields
  company_id:     uuid('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  role_id:        uuid('role_id')
    .references(() => roles.id)
    .notNull(),
  position_id:    uuid('position_id')
    .references(() => positions.id),

  employee_id:    varchar('employee_id', { length: 50 }),   // "007"
  phone:          varchar('phone', { length: 20 }),
  address:        varchar('address', { length: 500 }),
  join_date:      date('join_date'),
  is_active:      boolean('is_active').default(true),
});

// ─────────────────────────────────────────
// BETTERAUTH REQUIRED TABLES
// ─────────────────────────────────────────
export const sessions = pgTable('sessions', {
  id:             uuid('id').primaryKey().defaultRandom(),
  expiresAt:      timestamp('expires_at').notNull(),
  token:          varchar('token', { length: 500 }).unique().notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
  updatedAt:      timestamp('updated_at').defaultNow().notNull(),
  ipAddress:      varchar('ip_address', { length: 100 }),
  userAgent:      text('user_agent'),
  userId:         uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
});

export const accounts = pgTable('accounts', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  accountId:             varchar('account_id', { length: 255 }).notNull(),
  providerId:            varchar('provider_id', { length: 100 }).notNull(),
  userId:                uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  accessToken:           text('access_token'),
  refreshToken:          text('refresh_token'),
  idToken:               text('id_token'),
  accessTokenExpiresAt:  timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope:                 varchar('scope', { length: 500 }),
  password:              text('password'),
  createdAt:             timestamp('created_at').defaultNow().notNull(),
  updatedAt:             timestamp('updated_at').defaultNow().notNull(),
});

export const verifications = pgTable('verifications', {
  id:         uuid('id').primaryKey().defaultRandom(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value:      varchar('value', { length: 500 }).notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
});

// ─────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────
export const companiesRelations = relations(companies, ({ many }) => ({
  roles:     many(roles),
  users:     many(users),
  positions: many(positions),
}));

export const rolesRelations = relations(roles, ({ one, many }) => ({
  company: one(companies, { fields: [roles.company_id], references: [companies.id] }),
  users:   many(users),
}));

export const positionsRelations = relations(positions, ({ one, many }) => ({
  company:    one(companies, { fields: [positions.company_id], references: [companies.id] }),
  // Perbaiki nama relasi atau definisikan dengan benar mengarah ke payroll_components
  payroll_components: many(payroll_components),
  users:      many(users),
}));

// Tambahkan juga relasi untuk payroll_components agar terhubung balik ke positions
export const payrollComponentsRelations = relations(payroll_components, ({ one }) => ({
  position: one(positions, { fields: [payroll_components.position_id], references: [positions.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  company:  one(companies,  { fields: [users.company_id],  references: [companies.id] }),
  role:     one(roles,      { fields: [users.role_id],     references: [roles.id] }),
  position: one(positions,  { fields: [users.position_id], references: [positions.id] }),
}));
