// Mock data — dipakai untuk preview UI sebelum backend di-connect.
// Struktur sengaja dibuat mirip response API asli (lihat ARCHITECTURE.md)
// supaya nanti tinggal ganti import dari sini ke fetch() API tanpa ubah UI.

export const mockCurrentUser = {
  id: 'u-001',
  name: 'Ella Doer',
  email: 'ella@fieldcorp.com',
  role: 'superadmin',
  position: 'Founder',
  avatar_initial: 'E',
};

export const mockStats = {
  total_pegawai: 24,
  hadir_hari_ini: 18,
  izin: 3,
  sos_aktif: 1,
};

export const mockEmployees = [
  {
    id: 'e-001',
    name: 'John Green',
    employee_id: 'PRS0574L1901200CH',
    position: 'Security',
    location: 'Branch Office 2',
    status: 'in_transit',
    avatar_initial: 'J',
  },
  {
    id: 'e-002',
    name: 'Maria Santos',
    employee_id: 'VNE8365L1465901YT',
    position: 'Cleaning Service',
    location: 'PT Tech Solution Business',
    status: 'in_transit',
    avatar_initial: 'M',
  },
  {
    id: 'e-003',
    name: 'Ahmad Fauzi',
    employee_id: 'ARM9738L1475824MT',
    position: 'Sales',
    location: 'Warehouse 1',
    status: 'in_transit',
    avatar_initial: 'A',
  },
  {
    id: 'e-004',
    name: 'Siti Rahma',
    employee_id: 'WRS9476L8467724AR',
    position: 'Security',
    location: 'Branch Office 2',
    status: 'packed',
    avatar_initial: 'S',
  },
];

export const mockActivePatrol = {
  tracking_id: 'PTR3200L3123324GF',
  employee_name: 'John Green',
  status: 'in_transit',
  location_name: 'PT Tech Solution Business',
  start_time: '08:00 AM',
  expected_end: '16:00 PM',
  checkpoints_done: 4,
  checkpoints_total: 6,
  current_position: { lat: -7.13921, lng: 112.597016 },
};

export const mockRecentActivity = [
  { id: 1, title: 'Check-in', employee: 'John Green', time: '08:02 AM', type: 'attendance' },
  { id: 2, title: 'Scan Checkpoint A', employee: 'Maria Santos', time: '08:15 AM', type: 'patrol' },
  { id: 3, title: 'Izin Sakit', employee: 'Ahmad Fauzi', time: '07:50 AM', type: 'leave' },
  { id: 4, title: 'SOS - Fire Alert', employee: 'Siti Rahma', time: '23:25 PM', type: 'sos' },
];

export const mockLocations = [
  { id: 'l-001', name: 'Branch Office 2', code: 'BR02', address: 'Jl. Thamrin No. 67, Jakarta', lat: -6.1997, lng: 106.8272, radius: 100, employee_count: 8 },
  { id: 'l-002', name: 'PT Tech Solution Business', code: 'TSB-01', address: 'Jl. Poros Banjarsari No. 46 Suci Manyar Gresik', lat: -7.13921, lng: 112.597016, radius: 100, employee_count: 12 },
  { id: 'l-003', name: 'Warehouse 1', code: 'WH01', address: 'Jl. Industri Raya No. 12, Surabaya', lat: -7.2575, lng: 112.7521, radius: 150, employee_count: 4 },
];

export const mockPositions = [
  { id: 'p-001', name: 'Chief', pph21_rate: 5.0, base_salary: 8000000, allowances: [
    { name: 'Tunj. Makan', amount: 35000 },
    { name: 'Tunj. Jabatan', amount: 1200000 },
    { name: 'Tunj. Transport', amount: 500000 },
    { name: 'Insentif', amount: 600000 },
  ], deductions: [
    { name: 'BPJS TK', amount: 225000 },
    { name: 'BPJS Kes', amount: 180000 },
  ]},
  { id: 'p-002', name: 'Founder', pph21_rate: 5.0, base_salary: 15000000, allowances: [], deductions: [] },
  { id: 'p-003', name: 'HRD', pph21_rate: 5.0, base_salary: 6000000, allowances: [], deductions: [] },
  { id: 'p-004', name: 'Keamanan', pph21_rate: 2.0, base_salary: 3500000, allowances: [], deductions: [] },
];

export const mockAttendanceRecap = [
  { id: 'a-001', employee_name: 'John Green', date: '2026-06-19', check_in: '08:02', check_out: '17:05', status: 'present', location: 'PT Tech Solution Business' },
  { id: 'a-002', employee_name: 'Maria Santos', date: '2026-06-19', check_in: '07:58', check_out: '17:00', status: 'present', location: 'Branch Office 2' },
  { id: 'a-003', employee_name: 'Ahmad Fauzi', date: '2026-06-19', check_in: '-', check_out: '-', status: 'sick', location: '-' },
  { id: 'a-004', employee_name: 'Siti Rahma', date: '2026-06-19', check_in: '08:15', check_out: '-', status: 'present', location: 'Branch Office 2' },
];

export const mockPatrolSessions = [
  { id: 'pt-001', employee_name: 'John Green', location: 'PT Tech Solution Business', start_time: '08:00', status: 'ongoing', checkpoints_done: 4, checkpoints_total: 6 },
  { id: 'pt-002', employee_name: 'Siti Rahma', location: 'Branch Office 2', start_time: '07:45', end_time: '15:45', status: 'completed', checkpoints_done: 8, checkpoints_total: 8 },
];

export const mockLeaves = [
  { id: 'lv-001', employee_name: 'Ahmad Fauzi', type: 'sick', start_date: '2026-06-19', end_date: '2026-06-20', reason: 'Demam tinggi', status: 'pending' },
  { id: 'lv-002', employee_name: 'Maria Santos', type: 'leave', start_date: '2026-06-25', end_date: '2026-06-27', reason: 'Acara keluarga', status: 'approved' },
];

export const mockSosReports = [
  { id: 'sos-001', employee_name: 'Zaini Mahmud', category: 'FIRE', location: 'PT Tech Solution Business', time: '23:25', description: 'testing', status: 'open' },
];

export const mockProfile = {
  name: 'Ella Doer',
  email: 'ella@fieldcorp.com',
  role: 'Superadmin',
  app_version: 'v1.0.5-enterprise',
};

export const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  in_transit: { bg: 'var(--status-info-bg)', text: 'var(--status-info-text)', label: 'Hadir' },
  packed:     { bg: 'var(--status-warning-bg)', text: 'var(--status-warning-text)', label: 'Izin' },
  delivered:  { bg: 'var(--status-success-bg)', text: 'var(--status-success-text)', label: 'Selesai' },
  sos:        { bg: 'var(--status-danger-bg)', text: 'var(--status-danger-text)', label: 'Darurat' },
};
