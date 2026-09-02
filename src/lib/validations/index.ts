import { z } from 'zod';

// ─────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────
export const uuidSchema = z.string().uuid('ID tidak valid');

export const coordinateSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────
export const signInSchema = z.object({
  email:    z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

// ─────────────────────────────────────────
// USERS
// ─────────────────────────────────────────
export const createUserSchema = z.object({
  name:        z.string().min(2).max(255),
  email:       z.string().email(),
  password:    z.string().min(8),
  role_id:     uuidSchema,
  position_id: uuidSchema.optional(),
  employee_id: z.string().max(50).optional(),
  phone:       z.string().max(20).optional(),
  address:     z.string().max(500).optional(),
  join_date:   z.string().date().optional(), // "2026-01-01"
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

// ─────────────────────────────────────────
// LOCATIONS
// ─────────────────────────────────────────
export const createLocationSchema = z.object({
  name:          z.string().min(2).max(255),
  code:          z.string().min(2).max(50),
  address:       z.string().max(500).optional(),
  latitude:      z.number().min(-90).max(90),
  longitude:     z.number().min(-180).max(180),
  radius_meters: z.number().int().min(10).max(5000).default(100),
});

export const updateLocationSchema = createLocationSchema.partial();

// ─────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────
export const checkInSchema = z.object({
  location_id:   uuidSchema,
  latitude:      z.number().min(-90).max(90),
  longitude:     z.number().min(-180).max(180),
  photo_base64:  z.string().min(1, 'Foto wajib diisi'),
  device_info: z.object({
    is_mock_location: z.boolean().default(false),
    accuracy_meters:  z.number().default(0),
  }).optional(),
});

export const checkOutSchema = z.object({
  attendance_id: uuidSchema,
  latitude:      z.number().min(-90).max(90),
  longitude:     z.number().min(-180).max(180),
  photo_base64:  z.string().optional(),
  notes:         z.string().max(500).optional(),
});

// ─────────────────────────────────────────
// PATROL
// ─────────────────────────────────────────
export const startPatrolSchema = z.object({
  location_id: uuidSchema,
  latitude:    z.number().min(-90).max(90),
  longitude:   z.number().min(-180).max(180),
});

export const scanCheckpointSchema = z.object({
  qr_code:   z.string().min(1),
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  photo_url: z.string().url().optional(),
});

export const trackBatchSchema = z.object({
  tracks: z.array(z.object({
    latitude:    z.number().min(-90).max(90),
    longitude:   z.number().min(-180).max(180),
    recorded_at: z.string().datetime(),
  })).min(1).max(100), // max 100 titik per batch
});

// ─────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────
export const createActivitySchema = z.object({
  title:       z.string().min(2).max(255),
  description: z.string().max(2000).optional(),
  photo_url:   z.string().url().optional(),
  location_id: uuidSchema.optional(),
  latitude:    z.number().min(-90).max(90).optional(),
  longitude:   z.number().min(-180).max(180).optional(),
});

// ─────────────────────────────────────────
// LEAVES
// ─────────────────────────────────────────
export const createLeaveSchema = z.object({
  type:       z.enum(['sick', 'leave', 'permission']),
  start_date: z.string().date(),
  end_date:   z.string().date(),
  reason:     z.string().max(1000).optional(),
  attachment: z.string().url().optional(),
}).refine(
  (data) => new Date(data.end_date) >= new Date(data.start_date),
  { message: 'Tanggal selesai harus setelah tanggal mulai', path: ['end_date'] }
);

export const approveLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes:  z.string().max(500).optional(),
});

// ─────────────────────────────────────────
// SOS
// ─────────────────────────────────────────
export const createSosSchema = z.object({
  category:    z.enum(['FIRE', 'ACCIDENT', 'CRIME', 'MEDICAL']),
  description: z.string().max(2000).optional(),
  latitude:    z.number().min(-90).max(90),
  longitude:   z.number().min(-180).max(180),
  photo_url:   z.string().url().optional(),
  location_id: uuidSchema.optional(),
});

export const handleSosSchema = z.object({
  resolution: z.string().max(2000).optional(),
});

// ─────────────────────────────────────────
// POSITIONS & COMPONENTS
// ─────────────────────────────────────────
export const createPositionSchema = z.object({
  name:        z.string().min(2).max(100),
  base_salary: z.number().min(0).default(0),
  pph21_rate:  z.number().min(0).max(100).default(0),
});

export const createComponentSchema = z.object({
  name:   z.string().min(2).max(100),
  type:   z.enum(['allowance', 'deduction']),
  amount: z.number().min(0),
});

// ─────────────────────────────────────────
// QUERY PARAMS (untuk filter & pagination)
// ─────────────────────────────────────────
export const paginationSchema = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const attendanceFilterSchema = z.object({
  user_id:     uuidSchema.optional(),
  location_id: uuidSchema.optional(),
  month:       z.coerce.number().int().min(1).max(12).optional(),
  year:        z.coerce.number().int().min(2020).max(2100).optional(),
  status:      z.enum(['present', 'sick', 'leave', 'absent']).optional(),
}).merge(paginationSchema);
