
import { Sidebar } from '@/components/layout/Sidebar';
import { SosProvider } from '@/components/providers/SosProvider';
import { Toaster } from 'sonner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SosProvider>
      <div
        className="min-h-screen"
        style={{ background: 'var(--bg-app)' }}
      >
        <Sidebar />

       
        <main className="ml-20 p-8">{children}</main>
      </div>

      <Toaster position="top-right" richColors closeButton />
    </SosProvider>
  );
}
 