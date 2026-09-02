import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user:         schema.users,
      session:      schema.sessions,
      account:      schema.accounts,
      verification: schema.verifications,
    },
  }),

  advanced: {
    database: {
      // Paksa BetterAuth generate ID dalam format UUID
      // supaya kompatibel dengan kolom uuid PostgreSQL kita
      generateId: 'uuid' as const,
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge:  5 * 60,
    },
  },

  user: {
    additionalFields: {
      company_id:  { type: 'string', required: true },
      role_id:     { type: 'string', required: true },
      employee_id: { type: 'string', required: false },
      is_active:   { type: 'boolean', required: false, defaultValue: true },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user;

// Type extension — karena BetterAuth tidak selalu expose additionalFields
// ke TypeScript types secara otomatis, kita buat tipe gabungan sendiri
export type AppUser = BetterAuthUser & {
  company_id: string;
  role_id: string;
  employee_id?: string | null;
  is_active?: boolean;
};
