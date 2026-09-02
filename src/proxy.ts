import { NextRequest, NextResponse } from 'next/server';

// Route yang butuh login (admin)
const PROTECTED_ADMIN  = /^\/dashboard(\/.*)?$/;
// Route yang butuh login (employee)
const PROTECTED_EMPLOYEE = /^\/home(\/.*)?$/;
// Route yang hanya boleh diakses kalau BELUM login
const AUTH_ROUTES = /^\/(login|register)(\/.*)?$/;

/**
 * Di Next.js 16, nama fungsi utama diubah menjadi 'proxy'
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ambil session token dari cookie BetterAuth
  const sessionToken =
    req.cookies.get('better-auth.session_token')?.value ??
    req.cookies.get('__Secure-better-auth.session_token')?.value;

  const isLoggedIn = Boolean(sessionToken);

  // Kalau sudah login dan coba akses halaman auth (login/register)
  // → redirect ke dashboard
 // BENAR — redirect ke /auth-redirect yang akan cek role
if (isLoggedIn && AUTH_ROUTES.test(pathname)) {
  const from = req.nextUrl.searchParams.get('from');
  if (from) return NextResponse.redirect(new URL(from, req.url));
  return NextResponse.redirect(new URL('/auth-redirect', req.url));
}

  // Kalau belum login dan coba akses halaman protected
  // → redirect ke login
  if (!isLoggedIn && (PROTECTED_ADMIN.test(pathname) || PROTECTED_EMPLOYEE.test(pathname))) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan proxy di semua route kecuali static files dan API
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

// Wajib diexport default sebagai fallback kompilasi aman Next.js 16
export default proxy;