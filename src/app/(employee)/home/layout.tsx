import { BottomNav } from '@/components/layout/BottomNav';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-app)' }}>
      <main className="max-w-md mx-auto px-5 pt-8 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
